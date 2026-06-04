from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.constraints import max_norm
import tempfile
import mne
from mne.preprocessing import ICA

app = Flask(__name__, static_folder='frontend/dist')
CORS(app)

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
MODEL_WEIGHTS_PATH = os.path.join(MODELS_DIR, 'eegnet_acc0.809_auc0.983_20260508_024947_weights.weights.h5')
NORM_PARAMS_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'normalization_params.npz')
model = None
norm_params = None

def load_norm_params():
    """Load normalization parameters (train_mean, train_std)"""
    global norm_params
    if norm_params is None:
        try:
            norm_params = np.load(NORM_PARAMS_PATH)
            print(f"✅ Normalization params loaded: mean={norm_params['train_mean'].shape}, std={norm_params['train_std'].shape}")
        except Exception as e:
            print(f"❌ Error loading normalization params: {e}")
            norm_params = None
    return norm_params

CHANNELS = ['Fp1','Fp2','F3','F4','C3','C4','P3','P4','O1','O2',
            'F7','F8','T3','T4','T5','T6','Fz','Cz','Pz']
L_FREQ = 0.5
H_FREQ = 45.0
EPOCH_DUR = 2.0
EPOCH_OVERLAP = 1.0

def build_eegnet():
    """Build EEGNet model EXACTLY as original training"""
    F1 = 8          # Temporal filters
    D = 2           # Depth multiplier
    F2 = 16         # Separable conv filters
    KERNEL_LENGTH = 64
    L2_REG = 0.01
    
    model = models.Sequential()
    model.add(layers.Input(shape=(19, 1000, 1)))
    model.add(layers.Conv2D(F1, (1, KERNEL_LENGTH), padding='same', use_bias=False,
                             kernel_regularizer=tf.keras.regularizers.l2(L2_REG)))
    model.add(layers.BatchNormalization())
    model.add(layers.DepthwiseConv2D((19, 1), depth_multiplier=D, use_bias=False,
                                      depthwise_constraint=max_norm(1.),
                                      depthwise_regularizer=tf.keras.regularizers.l2(L2_REG)))
    model.add(layers.BatchNormalization())
    model.add(layers.Activation('elu'))
    model.add(layers.AveragePooling2D((1, 4)))
    model.add(layers.Dropout(0.6))
    model.add(layers.SeparableConv2D(F2, (1, 16), padding='same', use_bias=False,
                                       depthwise_constraint=max_norm(1.),
                                       pointwise_regularizer=tf.keras.regularizers.l2(L2_REG)))
    model.add(layers.BatchNormalization())
    model.add(layers.Activation('elu'))
    model.add(layers.AveragePooling2D((1, 4)))
    model.add(layers.Dropout(0.6))
    model.add(layers.Flatten())
    model.add(layers.Dense(1, activation='sigmoid',
                            kernel_regularizer=tf.keras.regularizers.l2(L2_REG),
                            kernel_constraint=max_norm(0.25)))
    return model

def load_model():
    global model
    if model is None:
        try:
            model = build_eegnet()
            model.load_weights(MODEL_WEIGHTS_PATH)
            model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
            print(f"✅ Model loaded: {MODEL_WEIGHTS_PATH}")
            
            # Quick test
            test_input = np.random.randn(1, 19, 1000, 1).astype(np.float32)
            pred = model.predict(test_input, verbose=0)
            print(f"✅ Model test prediction: {pred[0][0]:.4f}")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            model = None
    return model

def preprocess_uploaded_file(file_path, file_ext):
    """Preprocess uploaded EEG file"""
    try:
        if file_ext == '.npy':
            # Already preprocessed - shape (epochs, 19, 1000)
            data = np.load(file_path)
            print(f"✅ Loaded .npy file: {data.shape}")
            return data
            
        elif file_ext == '.set':
            # Raw EEG - need preprocessing
            raw = mne.io.read_raw_eeglab(file_path, preload=True, verbose=False)
            
            # Pick 19 channels
            available = [ch for ch in CHANNELS if ch in raw.ch_names]
            if len(available) < 15:
                print(f"❌ Only {len(available)} channels available")
                return None
            raw.pick(available)
            
            # Filter
            raw.filter(L_FREQ, H_FREQ, fir_design='firwin', phase='zero', verbose=False)
            
            # CAR
            raw.set_eeg_reference('average', verbose=False)
            
            # ICA (EXACTLY as training notebook)
            try:
                ica = ICA(n_components=min(15, len(raw.ch_names)), random_state=42, max_iter=500)
                ica.fit(raw, verbose=False)
                
                # Try MNE EOG detection first, fallback to variance threshold (EXACTLY as training)
                try:
                    eog_indices, eog_scores = ica.find_bads_eog(raw, verbose=False)
                    ica.exclude = eog_indices
                    if len(eog_indices) > 0:
                        raw = ica.apply(raw, verbose=False)
                except (ValueError, RuntimeError):
                    # No EOG channels found, use variance threshold
                    exclude_indices = []
                    components = ica.get_components()
                    for idx in range(ica.n_components_):
                        if np.var(components[:, idx]) > 10:
                            exclude_indices.append(idx)
                    if exclude_indices:
                        ica.exclude = exclude_indices
                        raw = ica.apply(raw, verbose=False)
            except Exception as e:
                print(f"⚠️ ICA failed: {e}")
                pass
            
            # Epoching - EXACTLY as training notebook (use make_fixed_length_epochs)
            epochs = mne.make_fixed_length_epochs(raw, duration=EPOCH_DUR, overlap=EPOCH_OVERLAP, preload=True, verbose=False)
            data = epochs.get_data()  # (epochs, 19, 1000)
            
            print(f"✅ Preprocessed .set file: {data.shape}")
            return data
        else:
            return None
            
    except Exception as e:
        print(f"❌ Preprocessing error: {e}")
        return None

def predict_with_model(data):
    """Predict using the trained EEGNet model"""
    model = load_model()
    if model is None:
        return None, None, None
    
    # Ensure shape: (epochs, 19, 1000, 1)
    if len(data.shape) == 3:
        data = np.expand_dims(data, axis=-1)
    
    # Apply Z-score normalization using training statistics
    params = load_norm_params()
    if params is not None:
        train_mean = params['train_mean']
        train_std = params['train_std']
        # Avoid division by zero
        train_std[train_std == 0] = 1.0
        data = (data - train_mean) / train_std
        print(f"✅ Applied normalization: mean={train_mean.mean():.2e}, std={train_std.mean():.2e}")
    else:
        print(f"⚠️ No normalization params found - prediction may be inaccurate!")
    
    # Predict on all epochs
    predictions = model.predict(data, verbose=0)
    
    # Model uses sigmoid - predictions[:, 0] is probability of class 1 (AD)
    mean_prob = np.mean(predictions[:, 0])
    
    print(f"DEBUG: Mean probability: {mean_prob:.4f}")
    print(f"DEBUG: Min: {np.min(predictions[:, 0]):.4f}, Max: {np.max(predictions[:, 0]):.4f}")
    
    # 0.5 threshold
    is_ad = mean_prob >= 0.5
    diagnosis = "Alzheimer's Disease (AD)" if is_ad else "Healthy Control (CN)"
    
    # Return first epoch data for plotting
    eeg_sample = data[0, :, :, 0].tolist()
    
    return diagnosis, mean_prob * 100, eeg_sample

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        filename = file.filename
        file_ext = os.path.splitext(filename)[1].lower()
        
        patient_name = request.form.get('patient_name', 'Unknown')
        patient_age = request.form.get('patient_age', 'Unknown')
        
        # Save temporarily
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name
        
        # Preprocess
        print(f" Processing: {filename}")
        data = preprocess_uploaded_file(tmp_path, file_ext)
        
        # Clean up
        try:
            os.unlink(tmp_path)
        except:
            pass
            
        if data is None:
            return jsonify({'error': 'Failed to process file. Ensure it is a valid .set or .npy file with 19 channels.'}), 400
            
        print(f"✅ Preprocessed shape: {data.shape}")
        
        # Predict
        diagnosis, probability, eeg_sample = predict_with_model(data)
        
        if diagnosis is None:
            return jsonify({'error': 'Model not loaded'}), 500
            
        print(f"🎯 Result: {diagnosis} ({probability:.1f}%)")
        
        return jsonify({
            'diagnosis': diagnosis,
            'probability': float(round(probability, 1)),
            'model_auc': 98.3,
            'accuracy': 80.9,
            'epochs_used': int(data.shape[0]),
            'patient_name': patient_name,
            'patient_age': patient_age,
            'eeg_data': eeg_sample,
            'channels': CHANNELS,
            'sampling_rate': 500
        })
        
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("="*60)
    print("🧠 EEG Alzheimer Detector Server (FIXED)")
    print("="*60)
    print(f"Weights: {MODEL_WEIGHTS_PATH}")
    print(f"Frontend: {app.static_folder}")
    print(f"Backend: http://localhost:8000")
    print("="*60)
    
    load_model()
    
    app.run(host='0.0.0.0', port=8000, debug=True)

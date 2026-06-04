import { useState } from 'react';
import PatientForm from './components/PatientForm';
import UploadForm from './components/UploadForm';
import ResultsPanel from './components/ResultsPanel';
import LoadingState from './components/LoadingState';

interface PatientData {
  name: string;
  age: string;
}

interface ResultData {
  diagnosis: string;
  probability: number;
  patient_name: string;
  patient_age: string;
  eeg_data: number[][];
  channels: string[];
  sampling_rate: number;
}

function App() {
  const [step, setStep] = useState<'patient' | 'upload' | 'loading' | 'results'>('patient');
  const [patientData, setPatientData] = useState<PatientData>({ name: '', age: '' });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePatientSubmit = (name: string, age: string) => {
    setPatientData({ name, age });
    setStep('upload');
  };

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setStep('loading');
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('patient_name', patientData.name);
    formData.append('patient_age', patientData.age);

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `خطأ في السيرفر: ${response.status}`);
      }

      const data: ResultData = await response.json();
      setResult(data);
      setStep('results');
    } catch (err: any) {
      setError(err.message || 'فشل في الاتصال بالسيرفر');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('patient');
    setPatientData({ name: '', age: '' });
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-blue-400 neon-text-blue mb-2">
            EEG Alzheimer Detector
          </h1>
          <p className="text-slate-400">AI-Powered Early Detection System</p>
          <p className="text-blue-300 text-sm mt-2">نظام كشف مرض الزهايمر باستخدام تخطيط الدماغ 🧠</p>
        </header>

      <main className="w-full max-w-3xl space-y-8">
        {step === 'patient' && (
          <PatientForm onSubmit={handlePatientSubmit} />
        )}

        {step === 'upload' && (
          <UploadForm 
            onUpload={handleFileUpload} 
            error={error}
            patientName={patientData.name}
            patientAge={patientData.age}
          />
        )}

        {step === 'loading' && <LoadingState />}

        {step === 'results' && result && (
          <ResultsPanel 
            result={result} 
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

export default App;

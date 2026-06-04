import { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle } from 'lucide-react';

interface UploadFormProps {
  onUpload: (file: File) => void;
  error: string | null;
  patientName: string;
  patientAge: string;
}

export default function UploadForm({ onUpload, error, patientName, patientAge }: UploadFormProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="glass-card p-8 text-center">
      <div className="mb-6 p-4 bg-slate-700/30 rounded-lg text-right">
        <h3 className="text-lg font-bold text-blue-400 mb-2">بيانات المريض</h3>
        <p className="text-slate-300">الاسم: {patientName}</p>
        <p className="text-slate-300">العمر: {patientAge} سنة</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-10 transition-all ${
          dragging ? 'border-blue-400 bg-blue-500/10' : 'border-slate-600 hover:border-blue-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="w-16 h-16 mx-auto text-blue-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">رفع ملف التخطيط الدماغي</h3>
        <p className="text-slate-400 mb-4">اسحب وأفلت ملف .set هنا (مثل: sub-001_task-eyesclosed_eeg.set)</p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
          اختر الملف
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".set,.npy,.eeg,.edf,.cnt,.bdf,application/x-eeglab"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

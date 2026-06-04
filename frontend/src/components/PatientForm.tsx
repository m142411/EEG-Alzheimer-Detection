import { useState } from 'react';

interface PatientFormProps {
  onSubmit: (name: string, age: string) => void;
}

function PatientForm({ onSubmit }: PatientFormProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && age.trim()) {
      onSubmit(name.trim(), age.trim());
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700/50">
      <h2 className="text-2xl font-bold text-blue-400 mb-6 text-center">بيانات المريض</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-slate-300 mb-2 font-medium">اسم المريض</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسم المريض"
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-slate-300 mb-2 font-medium">العمر</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="أدخل العمر"
            min="1"
            max="120"
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={!name.trim() || !age.trim()}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-[1.02]"
        >
          التالي - رفع ملف التخطيط
        </button>
      </form>
    </div>
  );
}

export default PatientForm;
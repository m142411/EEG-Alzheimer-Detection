import { useState, useRef, useEffect } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw, Activity, User } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ResultData {
  diagnosis: string;
  probability: number;
  patient_name: string;
  patient_age: string;
  eeg_data: number[][];
  channels: string[];
  sampling_rate: number;
}

interface ResultsPanelProps {
  result: ResultData;
  onReset: () => void;
}

export default function ResultsPanel({ result, onReset }: ResultsPanelProps) {
  const [selectedChannel, setSelectedChannel] = useState(0);
  const isAD = result.diagnosis.includes('Alzheimer');
  const confidence = isAD ? result.probability : 100 - result.probability;

  // Prepare EEG data for chart
  const timePoints = Array.from({ length: result.eeg_data[0]?.length || 0 }, (_, i) => i / result.sampling_rate);

  const chartData = {
    labels: timePoints.slice(0, 500).map(t => t.toFixed(2)), // Show first 500 points
    datasets: [
      {
        label: result.channels[selectedChannel],
        data: result.eeg_data[selectedChannel]?.slice(0, 500) || [],
        borderColor: isAD ? 'rgb(248, 113, 113)' : 'rgb(74, 222, 128)',
        backgroundColor: isAD ? 'rgba(248, 113, 113, 0.1)' : 'rgba(74, 222, 128, 0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: 'rgb(148, 163, 184)' }
      },
      title: {
        display: true,
        text: `تخطيط الدماغ - القناة: ${result.channels[selectedChannel]}`,
        color: 'rgb(148, 163, 184)',
        font: { size: 14 }
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'الوقت (ثانية)',
          color: 'rgb(148, 163, 184)'
        },
        ticks: { color: 'rgb(148, 163, 184)' },
        grid: { color: 'rgba(148, 163, 184, 0.1)' }
      },
      y: {
        title: {
          display: true,
          text: 'السعة (µV)',
          color: 'rgb(148, 163, 184)'
        },
        ticks: { color: 'rgb(148, 163, 184)' },
        grid: { color: 'rgba(148, 163, 184, 0.1)' }
      },
    },
  };

  return (
    <div className="glass-card p-8 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">نتيجة التحليل</h2>
        
        <div className={`flex items-center justify-center gap-3 p-4 rounded-lg mb-6 ${
          isAD ? 'bg-red-900/30 border border-red-500/50' : 'bg-green-900/30 border border-green-500/50'
        }`}>
          {isAD ? (
            <AlertTriangle className="w-8 h-8 text-red-400" />
          ) : (
            <CheckCircle className="w-8 h-8 text-green-400" />
          )}
          <span className={`text-xl font-bold ${isAD ? 'text-red-400 neon-text-red' : 'text-green-400 neon-text-green'}`}>
            {result.diagnosis}
          </span>
        </div>
      </div>

      {/* Patient Info */}
      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-blue-400">بيانات المريض</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-400">الاسم</p>
            <p className="text-white font-medium">{result.patient_name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">العمر</p>
            <p className="text-white font-medium">{result.patient_age} سنة</p>
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-400">
          <span>دقة الذكاء الاصطناعي</span>
          <span>{confidence.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isAD ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${confidence}%` }}
          ></div>
        </div>
      </div>

      {/* EEG Chart */}
      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">اختر القناة:</label>
          <select 
            value={selectedChannel} 
            onChange={(e) => setSelectedChannel(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            {result.channels.map((ch, idx) => (
              <option key={idx} value={idx}>{ch}</option>
            ))}
          </select>
        </div>
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          عرض أول 500 نقطة زمنية (1 ثانية) من التخطيط الدماغي
        </p>
      </div>

      {/* Model Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <Activity className="w-5 h-5 text-blue-400 mb-2" />
          <div className="text-sm text-slate-400">دقة النموذج (AUC)</div>
          <div className="text-lg font-bold text-white">98.3%</div>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <Activity className="w-5 h-5 text-blue-400 mb-2" />
          <div className="text-sm text-slate-400">الدقة (Accuracy)</div>
          <div className="text-lg font-bold text-white">80.9%</div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors mt-4"
      >
        <RefreshCw className="w-4 h-4" />
        تحليل مريض آخر
      </button>
    </div>
  );
}

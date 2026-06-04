import { Brain, Activity } from 'lucide-react';

export default function LoadingState() {
  return (
    <div className="glass-card p-10 text-center flex flex-col items-center justify-center">
      <div className="relative">
        <Brain className="w-20 h-20 text-blue-400 animate-pulse-slow" />
        <Activity className="w-10 h-10 text-green-400 absolute -bottom-2 -right-2 animate-bounce" />
      </div>
      
      <h3 className="text-xl font-semibold mt-6 mb-2">Analyzing EEG Signals...</h3>
      <p className="text-slate-400 mb-6">Running Deep Learning Pipeline</p>
      
      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-blue-500 animate-[width_2s_ease-in-out_infinite]" style={{ width: '60%' }}></div>
      </div>
    </div>
  );
}

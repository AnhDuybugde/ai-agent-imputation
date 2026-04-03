import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Database, PlayCircle, DownloadCloud, Activity, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const AVAILABLE_MODELS = [
  'LGBM', 'LN', 'Ridge', 'Lasso', 'KNN', 'DT', 'SVR'
]

export default function CustomImputation({ workspaceId }) {
  const [model, setModel] = useState('LGBM')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const progressTimer = useRef(null)

  const handleRunPipeline = async () => {
    setLoading(true)
    setResult(null)
    setError('')
    setProgress(0)

    // SICE is mathematically intensive on large datasets. 
    // We simulate a robust progress bar to give feedback.
    progressTimer.current = setInterval(() => {
      setProgress(p => {
        if (p < 30) return p + 1; // Phase 1: Context loading
        if (p < 85) return p + 0.2; // Phase 2: LGBM Bidirectional Seed
        if (p < 95) return p + 0.5; // Phase 3: OvR Refinement
        return p; 
      })
    }, 100)

    try {
      const res = await axios.post(`${API}/api/imputation/run_full_sice?model_name=${model}&workspace_id=${workspaceId}`)
      
      clearInterval(progressTimer.current)
      setProgress(100)
      
      // Artificial delay so the 100% shows nicely
      setTimeout(() => {
        setResult(res.data)
        setLoading(false)
      }, 500)
      
    } catch (e) {
      clearInterval(progressTimer.current)
      setLoading(false)
      setError(e.response?.data?.detail || "Execution failed. Server might be out of memory or dataset is invalid.")
    }
  }

  const handleDownload = () => {
    if (result?.download_url) {
      window.open(`${API}${result.download_url}`, "_blank")
    }
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto py-8">
      
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-4 bg-orange-500/20 text-orange-400 rounded-full mb-4">
          <Database size={32} />
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2">Full Spatio-Temporal Imputation</h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Deploy the Agent to scan your entire Workspace dataset. It will extract features, generate bidirectional seeds, and refine missing gaps using One-vs-Rest Machine Learning.
        </p>
      </div>

      <div className="bg-slate-800/40 border border-white/5 shadow-2xl rounded-2xl p-6 md:p-8">
        
        <div className="mb-8">
          <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider block mb-3">
            Select Refinement Algorithm
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {AVAILABLE_MODELS.map(m => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`py-3 px-4 rounded-xl font-bold transition-all border ${
                  model === m 
                  ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl mb-8 flex items-start gap-3">
            <span className="mt-0.5">⚠️</span>
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        )}

        {!loading && !result && (
          <button 
            onClick={handleRunPipeline}
            className="w-full bg-slate-900 hover:bg-slate-950 border border-slate-700 hover:border-orange-500/50 py-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group"
          >
            <PlayCircle size={40} className="text-orange-400 group-hover:scale-110 transition-transform" />
            <span className="text-white font-bold text-lg">Initialize Agent Protocol</span>
            <span className="text-xs text-slate-500">Expected execution time: ~10 - 45s depending on gaps</span>
          </button>
        )}

        {loading && (
          <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <div className="flex justify-between items-end mb-2">
              <h3 className="font-bold flex items-center gap-2 text-white">
                <Loader2 className="animate-spin text-orange-400" /> Processing Spatio-Temporal Matrix
              </h3>
              <span className="text-orange-400 font-mono font-bold text-xl">{Math.floor(progress)}%</span>
            </div>
            
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-6">
              <div 
                className="bg-orange-500 h-full transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[slideToRight_1s_ease-in-out_infinite]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
               <div className={`p-4 rounded-lg flex items-center gap-3 ${progress > 5 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                 <CheckCircle size={18} /> Phase 1: Spatial Mapping
               </div>
               <div className={`p-4 rounded-lg flex items-center gap-3 ${progress > 30 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : progress > 5 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-slate-800 text-slate-500'}`}>
                 {progress > 30 ? <CheckCircle size={18} /> : <Activity size={18} className={progress > 5 ? "animate-pulse" : ""} />} 
                 Phase 2: Bidirectional Seed
               </div>
               <div className={`p-4 rounded-lg flex items-center gap-3 ${progress > 85 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                 <Activity size={18} /> Phase 3: OvR Refinement
               </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 rounded-2xl p-8 text-center animate-fade-in shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={40} className="text-emerald-400" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">Imputation Complete</h3>
            <p className="text-emerald-400/80 mb-6 font-medium">Successfully solved and filled {result.imputed_stats?.total_rows_filled || 'multi'} missing data points using {model}.</p>

            <button 
              onClick={handleDownload}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 transition-all mx-auto shadow-lg shadow-emerald-500/20"
            >
              <DownloadCloud />
              Download Dataset (.CSV)
            </button>

            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setResult(null)} 
                className="text-sm text-slate-400 hover:text-white transition"
              >
                Run Another Configuration
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

import { useState, useRef } from 'react'
import axios from 'axios'
import { Database, DownloadCloud, Activity, CheckCircle, Loader2, Sparkles, Brain, Trophy } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function CustomImputation({ workspaceId }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [progressStep, setProgressStep] = useState(0) // 0: Idle, 1: Scanning, 2: Auto-Selecting, 3: Bidirectional Seed, 4: OvR
  const progressTimer = useRef(null)

  const handleRunAutonomousProtocol = async () => {
    setLoading(true)
    setResult(null)
    setError('')
    setProgressStep(1) // Scanning Data

    // Cinematic progress simulation mapped to backend phases
    setTimeout(() => setProgressStep(2), 2000) // "Analyzing heuristics and RACING models"
    setTimeout(() => setProgressStep(3), 8000) // "Agent found best model -> creating Seed"
    setTimeout(() => setProgressStep(4), 16000) // "OvR Training on whole dataset"

    try {
      const res = await axios.post(`${API}/api/imputation/run_full_sice?workspace_id=${workspaceId}`)
      
      clearTimeout(progressTimer.current)
      setProgressStep(5) // Completed
      
      setResult(res.data)
      setLoading(false)
    } catch (e) {
      clearTimeout(progressTimer.current)
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
      
      <div className="text-center mb-10 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/10 blur-[100px] pointer-events-none" />
        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-orange-500/20 to-rose-500/20 text-orange-400 rounded-2xl mb-6 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
          <Brain size={40} className={loading && progressStep < 5 ? 'animate-pulse' : ''} />
        </div>
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 mb-4">
          Autonomous SICE Protocol
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          The AI will independently evaluate your Spatial-Temporal dataset, race multiple ML models in a secured sandbox, and self-select the most accurate algorithm before executing the full Bidirectional Imputation sequence.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl p-6 md:p-8 relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px]" />

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl mb-8 flex items-start gap-3">
            <span className="mt-0.5">⚠️</span>
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        )}

        {/* INITIAL BUTTON */}
        {!loading && !result && (
          <button 
            onClick={handleRunAutonomousProtocol}
            className="w-full relative group overflow-hidden rounded-2xl p-[1px]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-orange-600 via-rose-500 to-amber-500 rounded-2xl opacity-70 group-hover:opacity-100 animate-pulse transition-opacity"></span>
            <div className="relative bg-slate-950 px-8 py-10 rounded-[15px] flex flex-col items-center justify-center gap-4 transition-all group-hover:bg-slate-900/90 z-10">
              <Sparkles size={48} className="text-orange-400 group-hover:scale-110 transition-transform duration-500" />
              <span className="text-white font-extrabold text-2xl tracking-wide">Deploy Agent Imputation</span>
              <span className="text-sm text-slate-400 max-w-md text-center">
                Requires 0 human intervention. The Agent will pick the optimal Machine Learning model autonomously. (~20-45s)
              </span>
            </div>
          </button>
        )}

        {/* LOADING STATE - CINEMATIC PROGRESS */}
        {loading && (
          <div className="py-6 px-4 md:px-8">
            <h3 className="font-bold text-xl text-white flex items-center justify-center gap-3 mb-10">
              <Loader2 className="animate-spin text-orange-500" size={28} /> 
              Agent Framework Executing...
            </h3>
            
            <div className="space-y-6 max-w-2xl mx-auto relative">
              {/* Vertical line connecting steps */}
              <div className="absolute top-4 bottom-4 left-6 w-0.5 bg-slate-800 z-0"></div>

              {/* Step 1 */}
              <div className="flex gap-4 relative z-10">
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-colors duration-500 ${progressStep > 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  {progressStep > 1 ? <CheckCircle size={20} /> : <Database size={20} />}
                </div>
                <div className="pt-2">
                  <h4 className={`font-bold text-lg ${progressStep >= 1 ? 'text-white' : 'text-slate-600'}`}>1. Spatio-Temporal Extraction</h4>
                  {progressStep === 1 && <p className="text-sm text-orange-400 mt-1 animate-pulse">Scanning topological dataset...</p>}
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 relative z-10">
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-colors duration-500 ${progressStep > 2 ? 'bg-emerald-500 text-slate-950' : progressStep === 2 ? 'bg-orange-500 border-[3px] border-orange-500/30 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  {progressStep > 2 ? <CheckCircle size={20} /> : <Brain size={20} />}
                </div>
                <div className="pt-2">
                  <h4 className={`font-bold text-lg ${progressStep >= 2 ? 'text-white' : 'text-slate-600'}`}>2. Autonomous Auto-Selection</h4>
                  {progressStep === 2 && <p className="text-sm text-orange-400 mt-1 animate-pulse">Racing 6 models on a mocked data-gap sandbox...</p>}
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 relative z-10">
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-colors duration-500 ${progressStep > 3 ? 'bg-emerald-500 text-slate-950' : progressStep === 3 ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  {progressStep > 3 ? <CheckCircle size={20} /> : <Activity size={20} />}
                </div>
                <div className="pt-2">
                  <h4 className={`font-bold text-lg ${progressStep >= 3 ? 'text-white' : 'text-slate-600'}`}>3. Bidirectional Seed Injection</h4>
                  {progressStep === 3 && <p className="text-sm text-orange-400 mt-1 animate-pulse">Pre-imputing data using weighted LGBM patterns...</p>}
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 relative z-10">
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-colors duration-500 ${progressStep === 4 ? 'bg-orange-500 animate-bounce shadow-lg shadow-orange-500/50 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  <Sparkles size={20} />
                </div>
                <div className="pt-2">
                  <h4 className={`font-bold text-lg ${progressStep >= 4 ? 'text-white' : 'text-slate-600'}`}>4. One-vs-Rest Final Refinement</h4>
                  {progressStep === 4 && <p className="text-sm text-orange-400 mt-1">Applying winning formula to the entire Matrix...</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS STATE */}
        {result && (
          <div className="animate-fade-in fade-in-up">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 md:p-10 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-[50px] pointer-events-none" />
              
              <div className="inline-flex items-center justify-center p-4 bg-emerald-500/20 text-emerald-400 rounded-full mb-6 relative">
                 <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20"></div>
                 <CheckCircle size={48} />
              </div>
              
              <h3 className="text-3xl font-extrabold text-white mb-2">Protocol Successful</h3>
              
              <div className="bg-slate-900/80 inline-block px-6 py-4 rounded-xl border border-white/10 mt-4 mb-8">
                  <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-semibold">Agent Selected Model</p>
                  <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center gap-2">
                    <Trophy className="text-emerald-400" size={24} /> {result.agent_selected_model}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 border-t border-slate-700/50 pt-2 mt-2">Model achieved highest dynamic accuracy score</p>
              </div>

              <p className="text-slate-300 font-medium mb-8 text-lg">
                Recovered <span className="text-white font-bold">{result.imputed_stats?.total_rows_filled} missing points</span> successfully across the spatio-temporal matrix.
              </p>

              <button 
                onClick={handleDownload}
                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg rounded-xl flex items-center justify-center gap-3 transition-all mx-auto shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:-translate-y-1"
              >
                <DownloadCloud size={24} />
                Download Imputed Dataset
              </button>

              <div className="mt-8">
                <button 
                  onClick={() => setResult(null)} 
                  className="text-sm border-b border-slate-500 text-slate-400 hover:text-white hover:border-white transition pb-1"
                >
                  Restart Agent Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Play, Trophy, Crosshair, TrendingUp, Search, Activity, CheckCircle2, Loader2, Info, BrainCircuit } from 'lucide-react'
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const SICE_PIPELINE = [
  { name: 'Extract Features', icon: '🔍', color: 'text-indigo-400' },
  { name: 'Pre-impute Seed (LGBM)', icon: '🌱', color: 'text-emerald-400' },
  { name: 'OvR Training', icon: '🧠', color: 'text-purple-400' },
  { name: 'Inference', icon: '⚡', color: 'text-amber-400' },
]

export default function ModelArena({ workspaceId }) {
  const [stations, setStations] = useState([])
  const [stationId, setStationId] = useState("")
  const [gapType, setGapType] = useState("3")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [pipelineStep, setPipelineStep] = useState(-1)
  const timerRef = useRef(null)

  useEffect(() => {
    axios.get(`${API}/api/evaluation/eda`, { params: { workspace_id: workspaceId } })
      .then(res => {
        if (res.data && res.data.stations && res.data.stations.length > 0) {
          setStations(res.data.stations)
          // Default to the first station available
          setStationId(res.data.stations[0].id)
          setResults(null)
        }
      })
      .catch(console.error)
  }, [workspaceId])

  const handleSimulate = async () => {
    if (!stationId) return;
    
    setLoading(true)
    setResults(null)
    setPipelineStep(0)

    // Simulate pipeline progress 
    let step = 0
    timerRef.current = setInterval(() => {
      step++
      if (step < SICE_PIPELINE.length) {
        setPipelineStep(step)
      }
    }, 2000)

    try {
      const res = await axios.get(`${API}/api/evaluation/evaluate_gaps`, {
          params: { station_id: stationId, gap_type: gapType, workspace_id: workspaceId }
      })
      
      if (res.data.error) throw new Error(res.data.error)
      
      clearInterval(timerRef.current)
      setPipelineStep(SICE_PIPELINE.length) 
      
      setTimeout(() => {
        setResults(res.data)
        setLoading(false)
      }, 500)
    } catch (e) {
      console.error(e)
      clearInterval(timerRef.current)
      setPipelineStep(-1)
      setLoading(false)
      alert(e.response?.data?.error || "Error running simulation. Data may be too sparse.")
    }
  }

  const getMetricColor = (metric, value, isBest) => {
    if (isBest) return "text-emerald-400"
    if (metric === 'NSE' && value > 0.8) return "text-emerald-400"
    if (metric === 'NSE' && value < 0.5) return "text-rose-400"
    if (metric === 'RMSE' && value < 2) return "text-emerald-400"
    if (metric === 'RMSE' && value > 4) return "text-rose-400"
    return "text-slate-300"
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8 animate-fade-in fade-in-up">
      
      {/* LEFT PANEL */}
      <div className="w-full xl:w-1/3 xl:min-w-[400px] flex flex-col gap-6">
        
        {/* Controls */}
        <div className="p-6 rounded-2xl bg-slate-800/40 border border-white/5 shadow-inner">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Crosshair className="text-pink-500" /> SICE Setup
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                Target Column (Station API ID)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none appearance-none cursor-pointer"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                >
                  {stations.map(st => (
                    <option key={st.id} value={st.id}>{st.id} - {st.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                Simulated Gap Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['1', '3', '5', '7'].map(d => (
                  <button
                    key={d}
                    onClick={() => setGapType(d)}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      gapType === d 
                      ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleSimulate}
              disabled={loading || stations.length === 0}
              className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-[1px] mt-2 transition-all 
                         hover:shadow-[0_0_20px_rgba(219,39,119,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex h-full w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 transition-all group-hover:bg-opacity-0">
                {loading ? <Loader2 className="animate-spin text-white" size={18} /> : <Play className="text-white" size={18} />}
                <span className="font-bold text-white tracking-wide">
                  {loading ? 'Evaluating Pipeline...' : 'Run SICE Algorithm'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Pipeline Progress Status (Shows during loading) */}
        {loading && (
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-indigo-500/30">
            <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-indigo-400 animate-pulse" /> SICE Engine Progress
            </h3>
            <div className="space-y-4">
              {SICE_PIPELINE.map((step, idx) => {
                const isCompleted = pipelineStep > idx
                const isActive = pipelineStep === idx
                return (
                  <div key={idx} className={`flex items-center gap-3 transition-opacity duration-500 ${isCompleted || isActive ? 'opacity-100' : 'opacity-30'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-emerald-500/20' : isActive ? 'bg-indigo-500/20 border border-indigo-500/50' : 'bg-slate-800'}`}>
                      {isCompleted ? <CheckCircle2 size={16} className="text-emerald-400" /> : <span className="text-sm">{step.icon}</span>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>{step.name}</p>
                      {isActive && (
                        <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full w-1/2 animate-[slideToRight_1s_ease-in-out_infinite]" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="mt-4 p-3 bg-indigo-500/10 rounded-lg text-xs text-indigo-300 flex gap-2">
                <Info size={14} className="shrink-0" />
                <span>Bidirectional LGBM pre-imputing data based on recent Temporal patterns.</span>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT PANEL - RESULTS */}
      <div className="flex-1 flex flex-col gap-6">
        {results && results.evaluations ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2 md:col-span-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex justify-between items-center">
                <div>
                  <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                    <Trophy size={18} /> Best OvR Model
                  </h3>
                  <p className="text-2xl font-black mt-1 text-white">{results.best_model}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-emerald-400/80 uppercase font-semibold mb-1">Winning NSE Score</div>
                  <div className="text-3xl font-black text-emerald-400">
                    {results.evaluations.find(e => e.model === results.best_model)?.nse.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>

            {/* LEADERBOARD TABLE */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Model</th>
                    <th className="p-4 font-semibold w-24">NSE <span className="text-[10px]">&uarr;</span></th>
                    <th className="p-4 font-semibold w-24">R² <span className="text-[10px]">&uarr;</span></th>
                    <th className="p-4 font-semibold w-24">RMSE <span className="text-[10px]">&darr;</span></th>
                    <th className="p-4 font-semibold w-24">MAE <span className="text-[10px]">&darr;</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {results.evaluations.map((ev, i) => {
                    const isBest = i === 0
                    return (
                      <tr key={ev.model} className={`transition hover:bg-slate-800/30 ${isBest ? 'bg-emerald-500/5' : ''}`}>
                        <td className="p-4 font-medium flex items-center gap-2">
                          {isBest && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                          {ev.model}
                        </td>
                        <td className={`p-4 font-mono font-medium ${getMetricColor('NSE', ev.nse, isBest)}`}>{ev.nse.toFixed(4)}</td>
                        <td className={`p-4 font-mono ${getMetricColor('R2', ev.r2, isBest)}`}>{ev.r2.toFixed(4)}</td>
                        <td className={`p-4 font-mono ${getMetricColor('RMSE', ev.rmse, isBest)}`}>{ev.rmse.toFixed(4)}</td>
                        <td className={`p-4 font-mono ${getMetricColor('MAE', ev.mae, isBest)}`}>{ev.mae.toFixed(4)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* VISUALIZATION */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-white/5 shadow-inner flex flex-col gap-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <TrendingUp className="text-amber-400" /> SICE Imputation Trace ({results.best_model})
              </h3>
              <p className="text-xs text-slate-400">Showing true data vs. agent generated imputation for the first masked segment.</p>
              
              <div className="h-64 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={results.plot_data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      tickFormatter={(val) => val.split(' ')[0]} 
                      axisLine={false}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ fontWweight: 500 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                    
                    {/* The context (surrounding truth) */}
                    <Line 
                      type="monotone" 
                      dataKey="gap_val" 
                      name="Ground Truth" 
                      stroke="#475569" 
                      strokeWidth={3} 
                      dot={{ r: 0 }}
                      strokeDasharray="5 5"
                    />
                    {/* The specific gap truth for comparison */}
                    <Line 
                      type="monotone" 
                      dataKey="true_val" 
                      name="Original Hidden Target" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: '#3b82f6' }}
                      connectNulls={false}
                    />
                    {/* The AI imputation */}
                    <Line 
                      type="monotone" 
                      dataKey="imputed_val" 
                      name={`${results.best_model} Imputation`} 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      dot={{ r: 4, stroke: '#1e293b', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20 text-slate-500">
            <BrainCircuit size={48} className="opacity-20 mb-4" />
            <p className="text-lg">Waiting for SICE Simulation</p>
            <p className="text-sm">Select parameters and run to evaluate Machine Learning algorithms.</p>
          </div>
        )}
      </div>
    </div>
  )
}

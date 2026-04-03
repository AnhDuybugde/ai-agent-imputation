import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Play, Trophy, Crosshair, TrendingUp, Search, Activity, CheckCircle2, Loader2 } from 'lucide-react'
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const MODEL_PIPELINE = [
  { name: 'Linear Interpolation', icon: '📐', color: 'text-blue-400' },
  { name: 'KNN Spatial',         icon: '🌐', color: 'text-emerald-400' },
  { name: 'Random Forest',       icon: '🌲', color: 'text-green-400' },
  { name: 'LightGBM',            icon: '⚡', color: 'text-amber-400' },
]

export default function ModelArena() {
  const [stations, setStations] = useState([])
  const [stationId, setStationId] = useState("48805")
  const [gapType, setGapType] = useState("7")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [pipelineStep, setPipelineStep] = useState(-1)
  const timerRef = useRef(null)

  useEffect(() => {
    axios.get(`${API}/api/evaluation/eda`)
      .then(res => {
        if (res.data && res.data.stations) {
          setStations(res.data.stations)
        }
      })
      .catch(console.error)
  }, [])

  const handleSimulate = async () => {
    setLoading(true)
    setResults(null)
    setPipelineStep(0)

    // Simulate pipeline progress while waiting for backend
    let step = 0
    timerRef.current = setInterval(() => {
      step++
      if (step < MODEL_PIPELINE.length) {
        setPipelineStep(step)
      }
    }, 2500)

    try {
      const res = await axios.get(`${API}/api/evaluation/evaluate_gaps?station_id=${stationId}&gap_type=${gapType}`)
      clearInterval(timerRef.current)
      setPipelineStep(MODEL_PIPELINE.length) // all done
      // Small delay to show "all complete" state before showing results
      setTimeout(() => {
        setResults(res.data)
        setLoading(false)
      }, 800)
    } catch (e) {
      console.error(e)
      clearInterval(timerRef.current)
      setPipelineStep(-1)
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const progressPercent = pipelineStep < 0 ? 0 : Math.min(((pipelineStep + 1) / MODEL_PIPELINE.length) * 100, 100)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Controls */}
        <div className="glass-panel p-6 col-span-1 border-indigo-500/30">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Search className="text-indigo-400" />
            Agent Parameters
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Target Station</label>
              <select 
                value={stationId}
                onChange={e => setStationId(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all [&>option]:bg-slate-800"
              >
                {stations.map(st => (
                  <option key={st.wmo_code} value={st.wmo_code}>
                    {st.name} ({st.wmo_code})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Simulated Gap Duration</label>
              <select 
                value={gapType}
                onChange={e => setGapType(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all [&>option]:bg-slate-800"
              >
                <option value="1">1 Day continuous missing</option>
                <option value="3">3 Days continuous missing</option>
                <option value="5">5 Days continuous missing</option>
                <option value="7">7 Days continuous missing</option>
              </select>
            </div>

            <button 
              onClick={handleSimulate}
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Running Pipeline...</>
              ) : (
                <><Play size={18} fill="currentColor"/> Run Agent Evaluation</>
              )}
            </button>
          </div>

          {/* ===== PIPELINE PROGRESS ===== */}
          {loading && (
            <div className="mt-6 space-y-3">
              {/* Overall progress bar */}
              <div className="progress-bar-track">
                <div 
                  className="progress-bar-fill bg-gradient-to-r from-indigo-500 to-purple-500" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
              <p className="text-xs text-slate-400 text-center">{Math.round(progressPercent)}% — Evaluating models...</p>

              {/* Step-by-step */}
              <div className="space-y-2 mt-3">
                {MODEL_PIPELINE.map((model, i) => {
                  const isDone = pipelineStep > i
                  const isActive = pipelineStep === i
                  return (
                    <div 
                      key={model.name}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${
                        isActive ? 'bg-indigo-500/15 border border-indigo-500/30' :
                        isDone ? 'bg-emerald-500/10 border border-emerald-500/20' :
                        'bg-slate-800/30 border border-transparent'
                      }`}
                    >
                      <span className="text-lg">{model.icon}</span>
                      <span className={`text-sm font-medium flex-1 ${isActive ? 'text-indigo-300' : isDone ? 'text-emerald-300' : 'text-slate-500'}`}>
                        {model.name}
                      </span>
                      {isDone && <CheckCircle2 size={16} className="text-emerald-400" />}
                      {isActive && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Results Arena */}
        <div className="glass-panel p-6 col-span-1 lg:col-span-2 relative min-h-[400px]">
          {!results && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Trophy size={64} className="mb-4 opacity-20" />
              <p className="text-lg">Run evaluation to see Agent's model selection</p>
              <p className="text-sm text-slate-600 mt-1">Select a station and gap duration, then click Run</p>
            </div>
          )}

          {loading && !results && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <Crosshair size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" />
              </div>
              <p className="text-lg font-medium">Agent is analyzing {gapType}-day gap patterns...</p>
              <p className="text-sm text-slate-500">Training & evaluating {MODEL_PIPELINE.length} models on 10 synthetic gaps</p>
            </div>
          )}

          {results && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Trophy className="text-amber-400" />
                    Agent Decision: <span className="text-emerald-400">{results.best_model}</span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Based on multi-metric distribution preservation across 10 gap experiments</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-300 text-sm">
                      <th className="pb-3 px-4 font-medium">Model</th>
                      <th className="pb-3 px-4 font-medium"><div className="flex items-center gap-1"><Crosshair size={14}/> RMSE</div></th>
                      <th className="pb-3 px-4 font-medium"><div className="flex items-center gap-1"><TrendingUp size={14}/> R²</div></th>
                      <th className="pb-3 px-4 font-medium text-amber-300" title="-0.3 to 0.3 is optimal">FB (Bias)</th>
                      <th className="pb-3 px-4 font-medium text-blue-300" title="Close to 0 is optimal">FSD (Variance)</th>
                      <th className="pb-3 px-4 font-medium text-right text-emerald-400">Agent Score</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {results.evaluations.map((ev, i) => (
                      <tr key={ev.model} className={`border-b border-white/5 transition-all duration-500 ${i === 0 ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}
                          style={{ animationDelay: `${i * 100}ms` }}>
                        <td className="py-4 px-4 font-medium flex items-center gap-2">
                          {i === 0 && <Trophy size={14} className="text-amber-400"/>}
                          {ev.model}
                        </td>
                        <td className="py-4 px-4 font-mono">{ev.rmse.toFixed(3)}</td>
                        <td className="py-4 px-4 font-mono">{ev.r2.toFixed(3)}</td>
                        <td className={`py-4 px-4 font-mono ${Math.abs(ev.fb) <= 0.3 ? 'text-green-400' : 'text-red-400'}`}>{ev.fb.toFixed(3)}</td>
                        <td className="py-4 px-4 font-mono">{ev.fsd.toFixed(3)}</td>
                        <td className="py-4 px-4 text-right font-bold text-lg">{ev.score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {results.plot_data && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Activity className="text-emerald-500"/>
                    Imputation Visualization
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Comparison between true signals and what the {results.best_model} stitched into the synthetic gap.
                  </p>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer>
                      <ComposedChart data={results.plot_data} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="time" stroke="#94a3b8" tick={{fill: '#cbd5e1', fontSize: 10}} tickFormatter={(t) => t.substring(5, 16)} />
                        <YAxis stroke="#94a3b8" tick={{fill: '#cbd5e1', fontSize: 12}} domain={['auto', 'auto']} unit="°C"/>
                        <Tooltip 
                          contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', backdropFilter: 'blur(8px)'}}
                          itemStyle={{color: '#e2e8f0'}}
                          labelStyle={{color: '#94a3b8', fontSize: 12}}
                        />
                        <Legend wrapperStyle={{fontSize: "12px"}}/>
                        <Line type="monotone" dataKey="gap_val" name="Context Data" stroke="#94a3b8" strokeWidth={2} dot={false} connectNulls={false} />
                        <Line type="monotone" dataKey="true_val" name="True Hidden Gap" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" opacity={0.6} dot={false} />
                        <Line type="monotone" dataKey="imputed_val" name={`Imputed by ${results.best_model}`} stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{r: 6}} animationDuration={2000} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  )
}

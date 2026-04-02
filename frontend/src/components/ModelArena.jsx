import { useState } from 'react'
import axios from 'axios'
import { Play, Trophy, Crosshair, TrendingUp, Search, Activity } from 'lucide-react'
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ModelArena() {
  const [stationId, setStationId] = useState("48805")
  const [gapType, setGapType] = useState("continuous")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  const handleSimulate = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/evaluation/evaluate_gaps?station_id=${stationId}&gap_type=${gapType}`)
      setResults(res.data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Controls */}
        <div className="glass-panel p-6 col-span-1 border-indigo-500/30">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Search className="text-indigo-400" />
            Agent Parameters
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Target Station (WMO Code)</label>
              <input 
                type="text" 
                value={stationId}
                onChange={e => setStationId(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Simulated Gap Type</label>
              <select 
                value={gapType}
                onChange={e => setGapType(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all [&>option]:bg-slate-800"
              >
                <option value="short">Short Gaps (&lt; 5 hours)</option>
                <option value="continuous">Continuous / Long Gaps</option>
                <option value="spatial">Spatial Gaps (Missing Station)</option>
              </select>
            </div>

            <button 
              onClick={handleSimulate}
              disabled={loading}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-lg flex justify-center items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Play size={18} fill="currentColor"/> Run Agent Evaluation</>
              )}
            </button>
          </div>
        </div>

        {/* Results Arena */}
        <div className="glass-panel p-6 col-span-1 lg:col-span-2 relative min-h-[400px]">
          {!results && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Trophy size={64} className="mb-4 opacity-20" />
              <p>Run evaluation to see Agent's model selection</p>
            </div>
          )}

          {results && (
            <div className="animate-in fade-in duration-500 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Trophy className="text-amber-400" />
                    Agent Decision: <span className="text-emerald-400">{results.best_model}</span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Based on multi-metric distribution preservation</p>
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
                      <tr key={ev.model} className={`border-b border-white/5 transition-colors ${i === 0 ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}>
                        <td className="py-4 px-4 font-medium flex items-center gap-2">
                          {i === 0 && <Trophy size={14} className="text-amber-400"/>}
                          {ev.model}
                        </td>
                        <td className="py-4 px-4">{ev.rmse.toFixed(3)}</td>
                        <td className="py-4 px-4">{ev.r2.toFixed(3)}</td>
                        <td className={`py-4 px-4 ${Math.abs(ev.fb) <= 0.3 ? 'text-green-400' : 'text-red-400'}`}>{ev.fb.toFixed(3)}</td>
                        <td className="py-4 px-4">{ev.fsd.toFixed(3)}</td>
                        <td className="py-4 px-4 text-right font-bold">{ev.score.toFixed(2)}</td>
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
                          contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px'}}
                          itemStyle={{color: '#e2e8f0'}}
                          labelStyle={{color: '#94a3b8', fontSize: 12}}
                        />
                        <Legend wrapperStyle={{fontSize: "12px"}}/>
                        {/* The solid context line (gap_val has NaNs inside gap so it breaks naturally) */}
                        <Line type="monotone" dataKey="gap_val" name="Context Data" stroke="#94a3b8" strokeWidth={2} dot={false} connectNulls={false} />
                        {/* The true values inside the gap (true_val exists everywhere but we can plot it dashed to see actual data) */}
                        <Line type="monotone" dataKey="true_val" name="True Hidden Gap" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        {/* The imputed segment inside the gap */}
                        <Line type="monotone" dataKey="imputed_val" name={`Imputed by ${results.best_model}`} stroke="#10b981" strokeWidth={3} dot={false} activeDot={{r: 6}} />
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

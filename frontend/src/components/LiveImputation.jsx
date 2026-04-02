import { useState, useEffect } from 'react'
import axios from 'axios'
import { Map, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

export default function LiveImputation() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')

  const handleFetch = async () => {
    setLoading(true)
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/live/fetch_weather')
      setData(res.data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    handleFetch()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header / Stats */}
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            Live OpenWeather Sync
          </h2>
          <p className="text-slate-400">
            Monitoring 10 sample stations. AI Agent stands by to impute dropped signals.
          </p>
        </div>
        
        <button 
          onClick={handleFetch}
          disabled={loading}
          className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={16}/>
          {loading ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {/* Metrics Banner */}
      {data && (
        <div className="glass-panel p-4 flex justify-between items-center bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-l-4 border-l-indigo-500">
          <div>
            <h3 className="font-semibold text-lg text-indigo-300">Agent Performance Report</h3>
            <p className="text-sm text-slate-300">{data.agent_metrics.status}</p>
          </div>
          <div className="flex gap-6 mr-4">
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase">Mean Bias (FB)</p>
              <p className="font-mono text-xl text-green-400">{data.agent_metrics.FB.toFixed(4)}</p>
            </div>
            <div className="text-center border-l border-white/10 pl-6">
              <p className="text-xs text-slate-400 uppercase">Variance Shift (FSD)</p>
              <p className="font-mono text-xl text-blue-400">{data.agent_metrics.FSD.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="glass-panel p-6 border-emerald-500/30">
        <div className="overflow-x-auto relative">
          {loading && (
             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <Spinner />
             </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-300 text-sm">
                <th className="pb-3 px-4 font-medium">Station</th>
                <th className="pb-3 px-4 font-medium">Location</th>
                <th className="pb-3 px-4 font-medium">Raw API Data</th>
                <th className="pb-3 px-4 font-medium">Imputed/Final Data</th>
                <th className="pb-3 px-4 font-medium">Agent Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {data?.data?.map((d, i) => {
                const isImputed = d.temp === null
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-medium">
                      <div className="flex flex-col">
                        <span>{d.name}</span>
                        <span className="text-xs text-slate-500">{d.wmo_code}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-400">
                      {d.lat.toFixed(2)}, {d.lon.toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      {isImputed ? (
                        <span className="text-red-400 font-mono">NULL</span>
                      ) : (
                        <span className="text-white font-mono">{d.temp}°C</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {isImputed ? (
                        <span className="text-indigo-400 font-mono font-bold animate-pulse">{d.temp_imputed}°C</span>
                      ) : (
                        <span className="text-emerald-400 font-mono">{d.temp_imputed}°C</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {isImputed ? (
                        <div className="flex items-center gap-2 text-indigo-400">
                          <AlertTriangle size={14} />
                          <span className="text-xs">{d.status}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <CheckCircle size={14} className="text-emerald-500" />
                          <span className="text-xs">{d.status}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!data && !loading && (
             <div className="py-12 text-center text-slate-500">
               No data fetched yet.
             </div>
          )}
        </div>
        
        {lastUpdated && (
          <div className="text-right text-xs text-slate-500 mt-4 font-mono items-center flex justify-end gap-1">
            <RefreshCw size={10} /> Last updated: {lastUpdated}
          </div>
        )}
      </div>

    </div>
  )
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
  )
}

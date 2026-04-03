import { useState, useEffect } from 'react'
import axios from 'axios'
import { AlertTriangle, CheckCircle, RefreshCw, Search, Wifi, WifiOff, Cpu, Zap } from 'lucide-react'

export default function LiveImputation() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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

  const liveCount = data?.data?.filter(d => d.temp !== null).length || 0
  const imputedCount = data?.data?.filter(d => d.temp === null).length || 0

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            Live OpenWeather Sync
          </h2>
          <p className="text-slate-400">
            Monitoring all <strong className="text-white">{data?.count || 43}</strong> Vietnamese weather stations. 
            AI Agent automatically imputes dropped signals using Spatial KNN.
          </p>
        </div>
        
        <button 
          onClick={handleFetch}
          disabled={loading}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 font-medium"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={16}/>
          {loading ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-4 flex items-center gap-4 glass-hover">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <Wifi size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Live Stations</p>
              <p className="text-2xl font-bold text-emerald-400">{liveCount}</p>
            </div>
          </div>
          <div className="glass-panel p-4 flex items-center gap-4 glass-hover">
            <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
              <WifiOff size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Imputed by AI</p>
              <p className="text-2xl font-bold text-amber-400">{imputedCount}</p>
            </div>
          </div>
          <div className="glass-panel p-4 flex items-center gap-4 glass-hover">
            <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center">
              <Cpu size={20} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Agent Model</p>
              <p className="text-sm font-bold text-indigo-300">{data.agent_metrics.model || "Standby"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Banner */}
      {data && imputedCount > 0 && (
        <div className="glass-panel p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-l-4 border-l-indigo-500 ">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-amber-400" />
            <div>
              <h3 className="font-semibold text-indigo-300">Agent Performance Report</h3>
              <p className="text-sm text-slate-300">{data.agent_metrics.status}</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase">Mean Bias (FB)</p>
              <p className={`font-mono text-xl ${Math.abs(data.agent_metrics.FB) < 0.1 ? 'text-green-400' : 'text-amber-400'}`}>
                {data.agent_metrics.FB.toFixed(4)}
              </p>
            </div>
            <div className="text-center border-l border-white/10 pl-6">
              <p className="text-xs text-slate-400 uppercase">Variance Shift (FSD)</p>
              <p className={`font-mono text-xl ${data.agent_metrics.FSD < 0.5 ? 'text-blue-400' : 'text-amber-400'}`}>
                {data.agent_metrics.FSD.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="glass-panel p-6 border-emerald-500/20">
        
        <div className="mb-4 flex items-center bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2.5 w-full max-w-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
          <Search size={18} className="text-slate-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search station by name or WMO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-white w-full text-sm placeholder:text-slate-500"
          />
        </div>

        <div className="overflow-x-auto relative max-h-[500px] overflow-y-auto custom-scrollbar">
          {loading && (
             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <Spinner />
             </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm z-[5]">
              <tr className="border-b border-white/10 text-slate-300 text-sm">
                <th className="pb-3 pt-2 px-4 font-medium">Status</th>
                <th className="pb-3 pt-2 px-4 font-medium">Station</th>
                <th className="pb-3 pt-2 px-4 font-medium">Location</th>
                <th className="pb-3 pt-2 px-4 font-medium">Raw API</th>
                <th className="pb-3 pt-2 px-4 font-medium">Final (Imputed)</th>
                <th className="pb-3 pt-2 px-4 font-medium">Agent Log</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {data?.data?.filter(d => 
                d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                d.wmo_code.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((d, i) => {
                const isImputed = d.temp === null
                return (
                  <tr key={i} className={`border-b border-white/5 transition-colors ${isImputed ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-white/5'}`}>
                    <td className="py-3.5 px-4">
                      {isImputed ? (
                        <span className="status-dot-imputed" title="AI Imputed" />
                      ) : (
                        <span className="status-dot-live" title="Live Data" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex flex-col">
                        <span>{d.name}</span>
                        <span className="text-xs text-slate-500">{d.wmo_code}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {d.lat.toFixed(2)}°N, {d.lon.toFixed(2)}°E
                    </td>
                    <td className="py-3.5 px-4">
                      {isImputed ? (
                        <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 font-mono text-xs px-2 py-1 rounded-md">
                          <WifiOff size={12} /> NULL
                        </span>
                      ) : (
                        <span className="text-white font-mono">{d.temp}°C</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {isImputed ? (
                        <span className="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-300 font-mono font-bold px-2 py-1 rounded-md">
                          <Cpu size={12} /> {d.temp_imputed}°C
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-mono">{d.temp_imputed}°C</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {isImputed ? (
                        <div className="flex items-center gap-2 text-amber-400">
                          <AlertTriangle size={14} />
                          <span className="text-xs truncate max-w-[200px]">{d.status}</span>
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
               No data fetched yet. Click "Sync Now" to begin.
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

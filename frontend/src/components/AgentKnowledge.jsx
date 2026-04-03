import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import { Thermometer, AlertTriangle, Database, ActivitySquare, Activity, Map as MapIcon, Calendar, Link as LinkIcon } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// Helper to determine marker color based on mean temperature
const getTempColor = (temp) => {
  if (temp < 15) return '#3b82f6' // Blue (Cold)
  if (temp < 22) return '#10b981' // Green (Cool)
  if (temp < 28) return '#f59e0b' // Yellow/Orange (Warm)
  return '#ef4444' // Red (Hot)
}

export default function AgentKnowledge() {
  const [data, setData] = useState(null)
  const [correlation, setCorrelation] = useState(null)
  
  useEffect(() => {
    axios.get(`${API}/api/evaluation/eda`)
      .then(res => setData(res.data))
      .catch(console.error)
      
    axios.get(`${API}/api/evaluation/correlation`)
      .then(res => setCorrelation(res.data))
      .catch(console.error)
  }, [])

  if (!data) return <div className="animate-pulse h-64 bg-slate-800/50 rounded-xl" />

  // Only take top 10 stations for clean chart rendering
  const chartData = data.stations.slice(0, 10).map(s => ({
    name: s.name,
    mean: Number(s.mean.toFixed(1)),
    max: Number(s.max.toFixed(1)),
    std: Number(s.std.toFixed(1))
  }))

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-6 glass-hover transition-all group">
          <div className="flex items-center gap-4 text-blue-400 mb-2">
            <Database size={24} className="group-hover:scale-110 transition-transform"/>
            <h3 className="font-semibold text-lg">Total Records</h3>
          </div>
          <p className="text-4xl font-light text-slate-100">{data.overall.total_records.toLocaleString()}</p>
        </div>

        <div className="glass-panel p-6 glass-hover transition-all group">
          <div className="flex items-center gap-4 text-indigo-400 mb-2">
            <ActivitySquare size={24} className="group-hover:scale-110 transition-transform"/>
            <h3 className="font-semibold text-lg">Stations</h3>
          </div>
          <p className="text-4xl font-light text-slate-100">{data.stations.length}</p>
        </div>

        <div className="glass-panel p-6 glass-hover transition-all group">
          <div className="flex items-center gap-4 text-amber-400 mb-2">
            <AlertTriangle size={24} className="group-hover:scale-110 transition-transform"/>
            <h3 className="font-semibold text-lg">Missing Points</h3>
          </div>
          <p className="text-4xl font-light text-slate-100">{data.overall.total_missing.toLocaleString()}</p>
        </div>

        <div className="glass-panel p-6 glass-hover transition-all group">
          <div className="flex items-center gap-4 text-emerald-400 mb-2">
            <Thermometer size={24} className="group-hover:scale-110 transition-transform"/>
            <h3 className="font-semibold text-lg">Time Range</h3>
          </div>
          <p className="text-sm font-light text-slate-300 mt-2 truncate" title={data.overall.time_start}>From: {data.overall.time_start.split(' ')[0]}</p>
          <p className="text-sm font-light text-slate-300 mt-1 truncate" title={data.overall.time_end}>To: {data.overall.time_end.split(' ')[0]}</p>
        </div>
      </div>

      {/* 1.5 Map Section */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
          <MapIcon className="text-indigo-400"/>
          Vietnam Weather Stations Spatial Map
        </h2>
        <div className="h-[650px] w-full rounded-xl overflow-hidden border border-white/10 relative z-0 shadow-[0_0_40px_rgba(79,70,229,0.15)]">
          <MapContainer center={[16.0, 106.0]} zoom={5} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {data.stations.map((st) => (
              <CircleMarker
                key={st.wmo_code}
                center={[st.lat, st.lon]}
                radius={8}
                pathOptions={{
                  color: getTempColor(st.mean),
                  fillColor: getTempColor(st.mean),
                  fillOpacity: 0.7,
                  weight: 2
                }}
              >
                <Popup className="custom-popup">
                  <div className="text-slate-800 p-1">
                    <strong className="block text-indigo-600 mb-1">{st.name} ({st.wmo_code})</strong>
                    <div>Mean Temp: <b>{st.mean.toFixed(1)}°C</b></div>
                    <div>Max Temp: {st.max.toFixed(1)}°C</div>
                    <div>Missing Data: <span className={st.missing_count > 0 ? "text-red-500 font-bold" : "text-emerald-500"}>{st.missing_count} points</span></div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <Thermometer className="text-blue-500"/>
            Temperature Distributions
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{top: 20, right: 10, left: -20, bottom: 20}}>
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" angle={-30} textAnchor="end" height={60} tick={{fill: '#cbd5e1', fontSize: 12}} />
                <YAxis stroke="#94a3b8" tick={{fill: '#cbd5e1', fontSize: 12}} unit="°C"/>
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', backdropFilter: 'blur(8px)'}}
                  itemStyle={{color: '#e2e8f0'}}
                />
                <Bar dataKey="mean" name="Mean Temp" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="max" name="Max Temp" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} opacity={0.8}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <Activity className="text-emerald-500"/>
            Time-Series Fluctuation Sample
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer>
              <LineChart data={data.time_series} margin={{top: 20, right: 10, left: -20, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{fill: '#cbd5e1', fontSize: 10}} tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis stroke="#94a3b8" tick={{fill: '#cbd5e1', fontSize: 12}} domain={['auto', 'auto']} unit="°C"/>
                <Tooltip 
                  contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', backdropFilter: 'blur(8px)'}}
                  itemStyle={{color: '#e2e8f0'}}
                  labelStyle={{color: '#94a3b8', fontSize: 12}}
                />
                <Line type="monotone" dataKey="temp" name="Temperature" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Imputation Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
            <Calendar className="text-amber-400"/>
            Data Completeness Heatmap (Last 100 days)
          </h2>
          <p className="text-sm text-slate-400 mb-6">Red nodes represent days with high volume of missing sensor data across all stations.</p>
          <div className="flex flex-wrap gap-2 justify-start items-center">
            {data.missing_calendar && data.missing_calendar.map((day, idx) => {
              const count = day.count;
              let bg = "bg-slate-800";
              if (count > 0 && count < 10) bg = "bg-amber-500/20";
              if (count >= 10 && count < 50) bg = "bg-amber-500/60";
              if (count >= 50) bg = "bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
              
              return (
                <div 
                  key={idx} 
                  className={`w-4 h-4 rounded-sm ${bg} transition-all hover:scale-150 cursor-pointer`}
                  title={`${day.date}: ${count} missing points`}
                />
              )
            })}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
            <LinkIcon className="text-purple-400"/>
            Spatial Correlation Bridges
          </h2>
          <p className="text-sm text-slate-400 mb-6">Pearson & Spearman hybrid scoring. AI uses relationships &gt; 0.8 as priority borrowing channels.</p>
          <div className="max-h-[250px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {correlation ? (
               correlation.links.slice(0, 30).map((l, i) => {
                   const s = correlation.nodes.find(n => n.id === l.source)?.name || l.source
                   const t = correlation.nodes.find(n => n.id === l.target)?.name || l.target
                   return (
                     <div key={i} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-white/5 hover:border-purple-500/30 transition-colors">
                       <span className="text-slate-200 text-sm">{s}</span>
                       <div className="flex-1 px-4 flex items-center">
                         <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent flex-1"></div>
                         <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)] whitespace-nowrap">
                           {l.value.toFixed(2)}
                         </span>
                         <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent flex-1"></div>
                       </div>
                       <span className="text-slate-200 text-sm">{t}</span>
                     </div>
                   )
               })
            ) : (
               <div className="animate-pulse bg-slate-800/50 h-[200px] rounded-lg"></div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

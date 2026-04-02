import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import axios from 'axios'
import { Thermometer, AlertTriangle, Database, ActivitySquare, Activity } from 'lucide-react'

export default function AgentKnowledge() {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/evaluation/eda')
      .then(res => setData(res.data))
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" angle={-30} textAnchor="end" height={60} tick={{fill: '#cbd5e1', fontSize: 12}} />
                <YAxis stroke="#94a3b8" tick={{fill: '#cbd5e1', fontSize: 12}} unit="°C"/>
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px'}}
                  itemStyle={{color: '#e2e8f0'}}
                />
                <Bar dataKey="mean" name="Mean Temp" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="max" name="Max Temp" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
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
                  contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px'}}
                  itemStyle={{color: '#e2e8f0'}}
                  labelStyle={{color: '#94a3b8', fontSize: 12}}
                />
                <Line type="monotone" dataKey="temp" name="Temperature" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  )
}

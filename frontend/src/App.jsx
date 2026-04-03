import { useState, useEffect } from 'react'
import { Activity, BrainCircuit, Globe, Sparkles, Zap } from 'lucide-react'
import AgentKnowledge from './components/AgentKnowledge'
import ModelArena from './components/ModelArena'
import LiveImputation from './components/LiveImputation'

function App() {
  const [activeTab, setActiveTab] = useState('knowledge')

  const tabs = [
    { id: 'knowledge', label: 'Knowledge EDA', icon: Activity, gradient: 'from-blue-500 to-indigo-500', shadow: 'shadow-indigo-500/30' },
    { id: 'arena',     label: 'Model Arena',   icon: BrainCircuit, gradient: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/30' },
    { id: 'live',      label: 'Live Mode',     icon: Globe, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/30' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 relative overflow-hidden">

      {/* Background Floating Orbs */}
      <div className="orb-1 absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-blue-600/8 blur-[140px] pointer-events-none" />
      <div className="orb-2 absolute bottom-[-25%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-purple-600/8 blur-[140px] pointer-events-none" />
      <div className="orb-3 absolute top-[20%] left-[50%] w-[35vw] h-[35vw] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '30px 30px' }}
      />

      <div className="container mx-auto max-w-7xl relative z-10">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between md:items-end mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-3">
              <Sparkles size={12} className="text-indigo-400" />
              <span className="text-xs font-medium text-indigo-300 uppercase tracking-wider">Autonomous AI Agent</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold title-shimmer leading-tight">
              AI Agent Imputer
            </h1>
            <p className="text-slate-400 mt-3 text-lg flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              Spatio-Temporal Missing Data Recovery Engine
            </p>
          </div>
          
          <div className="flex bg-slate-900/50 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-medium ${isActive ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg ${tab.shadow}` : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-white/30 rounded-full blur-sm" />
                  )}
                </button>
              )
            })}
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="glass-panel panel-glow p-6 md:p-8 shadow-2xl min-h-[70vh]">
          {activeTab === 'knowledge' && <AgentKnowledge />}
          {activeTab === 'arena' && <ModelArena />}
          {activeTab === 'live' && <LiveImputation />}
        </main>

        {/* FOOTER */}
        <footer className="text-center py-6 text-slate-600 text-sm">
          Built with FastAPI • React • LightGBM • Spatial KNN — 2026 Research Project
        </footer>
      </div>
    </div>
  )
}

export default App

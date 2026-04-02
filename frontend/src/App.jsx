import { useState } from 'react'
import { Activity, BrainCircuit, Globe } from 'lucide-react'
import AgentKnowledge from './components/AgentKnowledge'
import ModelArena from './components/ModelArena'
import LiveImputation from './components/LiveImputation'

function App() {
  const [activeTab, setActiveTab] = useState('knowledge')

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              AI Agent Imputer
            </h1>
            <p className="text-slate-400 mt-2">Autonomous Spatio-Temporal Missing Data Recovery</p>
          </div>
          
          <div className="flex bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-xl">
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'knowledge' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Activity size={18} />
              Knowledge EDA
            </button>
            <button
              onClick={() => setActiveTab('arena')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'arena' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <BrainCircuit size={18} />
              Model Arena
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'live' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Globe size={18} />
              Live Mode
            </button>
          </div>
        </header>

        <main className="glass-panel p-6 shadow-2xl min-h-[70vh]">
          {activeTab === 'knowledge' && <AgentKnowledge />}
          {activeTab === 'arena' && <ModelArena />}
          {activeTab === 'live' && <LiveImputation />}
        </main>
      </div>
    </div>
  )
}

export default App

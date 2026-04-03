import { useState } from 'react'
import { Activity, BrainCircuit, Globe, Sparkles, Zap, HardDrive, Database, UploadCloud } from 'lucide-react'
import AgentKnowledge from './components/AgentKnowledge'
import ModelArena from './components/ModelArena'
import LiveImputation from './components/LiveImputation'
import CustomImputation from './components/CustomImputation'
import WorkspaceModal from './components/WorkspaceModal'

function App() {
  const [activeTab, setActiveTab] = useState('knowledge')
  const [workspaceId, setWorkspaceId] = useState('default')
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false)

  const tabs = [
    { id: 'knowledge', label: 'Data Knowledge', icon: Activity, gradient: 'from-blue-500 to-indigo-500', shadow: 'shadow-indigo-500/30' },
    { id: 'arena',     label: 'SICE Arena',   icon: BrainCircuit, gradient: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/30' },
    { id: 'custom',    label: 'Autonomous Imputation', icon: Database, gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/30' },
    { id: 'live',      label: 'Live Metrics',     icon: Globe, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/30' },
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

            <h1 className="text-5xl md:text-6xl font-extrabold title-shimmer leading-tight flex items-center gap-4">
              AI Agent Imputer
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
              <p className="text-slate-400 text-lg flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                Spatio-Temporal Data Recovery Engine
              </p>
              <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-700"></div>
              {/* Premium Floating Upload Button */}
              <button 
                onClick={() => setIsWorkspaceModalOpen(true)}
                className="group relative inline-flex items-center justify-center gap-2 px-5 py-2 overflow-hidden rounded-full font-medium transition-all hover:scale-105"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20"></span>
                <span className="absolute bottom-0 right-0 block w-64 h-64 mb-32 mr-4 transition duration-500 origin-bottom-left transform rotate-45 translate-x-24 bg-pink-500 opacity-30 group-hover:rotate-90 ease"></span>
                <div className="relative flex items-center gap-2 text-indigo-100">
                  <Database size={16} className="text-pink-400" />
                  <span className="text-sm">Data Context: <span className="font-bold text-white">{workspaceId === 'default' ? 'Default Sandbox' : 'Custom Workspace'}</span></span>
                  <UploadCloud size={16} className="ml-1 text-slate-300 transition-transform group-hover:-translate-y-0.5" />
                </div>
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap bg-slate-900/50 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl transition-all duration-300 font-medium ${isActive ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg ${tab.shadow}` : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Icon size={18} />
                  <span className="hidden md:inline">{tab.label}</span>
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
          {activeTab === 'knowledge' && <AgentKnowledge workspaceId={workspaceId} />}
          {activeTab === 'arena' && <ModelArena workspaceId={workspaceId} />}
          {activeTab === 'custom' && <CustomImputation workspaceId={workspaceId} />}
          {activeTab === 'live' && <LiveImputation workspaceId={workspaceId} />}
        </main>

      </div>

      {/* WORKSPACE MODAL */}
      {isWorkspaceModalOpen && (
        <WorkspaceModal 
          currentId={workspaceId}
          onClose={() => setIsWorkspaceModalOpen(false)}
          onWorkspaceChange={(id) => {
            setWorkspaceId(id);
            setIsWorkspaceModalOpen(false);
          }}
        />
      )}
    </div>
  )
}

export default App

import { useState } from 'react'
import RoomTab from './room/RoomTab.jsx'
import GraphTab from './graph/GraphTab.jsx'

export default function App() {
  const [tab, setTab] = useState(() => new URLSearchParams(location.search).get('tab') === 'graph' ? 'graph' : 'room')
  const tabs = [
    ['room', '🏠 Room'],
    ['graph', '🕸 Graph'],
  ]
  return (
    <div className="mx-auto max-w-[640px] lg:max-w-[1400px] px-4 py-4 flex flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight whitespace-nowrap">
          AirTag <span className="text-yellow-300">Brain</span>
        </h1>
        <nav className="flex gap-1 bg-slate-900 rounded-xl p-1">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 sm:px-4 h-10 rounded-lg text-base sm:text-lg font-bold whitespace-nowrap ${tab === id ? 'bg-yellow-400 text-black' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      {tab === 'room' && <RoomTab active />}
      {tab === 'graph' && <GraphTab active />}
    </div>
  )
}

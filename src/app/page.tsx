'use client';

import { useState } from 'react';
import Timeline from '../components/Timeline';
import DSALogger from '../components/DSALogger';
import SystemDesignLogger from '../components/SystemDesignLogger';
import WeeklyProgress from '../components/WeeklyProgress';
import ProblemTracker from '../components/ProblemTracker';
import CalendarHeatmap from '../components/CalendarHeatmap';
import StreakBadge from '../components/StreakBadge';

type Tab = 'today' | 'weekly' | 'problems' | 'heatmap';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [showDSA, setShowDSA] = useState(false);
  const [showSD, setShowSD] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-zinc-900">
      {/* Top bar with streak */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-sm font-semibold text-zinc-100">PrepTracker</span>
        <StreakBadge />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'today' && (
          <Timeline onOpenDSA={() => setShowDSA(true)} onOpenSD={() => setShowSD(true)} />
        )}
        {activeTab === 'weekly' && <WeeklyProgress />}
        {activeTab === 'problems' && <ProblemTracker />}
        {activeTab === 'heatmap' && <CalendarHeatmap />}
      </main>

      {/* Bottom tab navigation */}
      <nav className="flex border-t border-zinc-800 bg-zinc-900 safe-area-bottom">
        {([
          { id: 'today', label: 'Today', icon: '📋' },
          { id: 'weekly', label: 'Weekly', icon: '📊' },
          { id: 'problems', label: 'Problems', icon: '💻' },
          { id: 'heatmap', label: 'Activity', icon: '🗓️' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 transition-colors ${
              activeTab === tab.id ? 'text-blue-400' : 'text-zinc-500'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Fullscreen modals */}
      {showDSA && <DSALogger onClose={() => setShowDSA(false)} />}
      {showSD && <SystemDesignLogger onClose={() => setShowSD(false)} />}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { db, getSetting, setSetting } from '../lib/db';
import { getToday } from '../lib/utils';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [startDate, setStartDate] = useState(getToday());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSetting('startDate').then(val => {
      if (val) setStartDate(val);
    });
  }, []);

  async function handleSave() {
    await setSetting('startDate', startDate);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleReset() {
    if (confirm('This will delete ALL your logged data. Are you sure?')) {
      await db.dsaProblemLogs.clear();
      await db.systemDesignLogs.clear();
      await db.streakData.clear();
      await db.dayLogs.clear();
      alert('All data cleared.');
    }
  }

  return (
    <div className="fixed inset-0 bg-zinc-900 z-50 overflow-y-auto">
      <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
        <button onClick={onClose} className="text-zinc-400 text-sm px-3 py-1 rounded bg-zinc-800">Done</button>
      </div>

      <div className="p-4 space-y-6">
        {/* Start Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200">Plan Start Date</label>
          <p className="text-xs text-zinc-400">
            The 12-week plan calculates your current week from this date. If you go beyond 12 weeks, it cycles through review patterns.
          </p>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
          />
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {saved ? '✓ Saved!' : 'Save Start Date'}
          </button>
        </div>

        {/* Info */}
        <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-medium text-zinc-200">How weeks work</h3>
          <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
            <li>Weeks 1-8: New topics each week per the roadmap</li>
            <li>Weeks 9-12: Review & mock interview phase</li>
            <li>Weeks 13+: Cycles back through weeks 9-12 (review patterns)</li>
            <li>Your progress is never lost — all solved problems stay tracked regardless of week</li>
          </ul>
        </div>

        {/* Danger zone */}
        <div className="border border-red-500/30 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-medium text-red-400">Danger Zone</h3>
          <p className="text-xs text-zinc-400">Reset all progress data. This cannot be undone.</p>
          <button
            onClick={handleReset}
            className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-medium py-2 rounded-lg text-xs transition-colors"
          >
            Reset All Data
          </button>
        </div>
      </div>
    </div>
  );
}

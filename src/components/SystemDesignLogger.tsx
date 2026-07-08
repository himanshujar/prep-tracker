'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { SD_TOPICS, PROJECT_MILESTONES } from '../lib/seedData';
import { getToday } from '../lib/utils';

interface SystemDesignLoggerProps {
  onClose: () => void;
}

export default function SystemDesignLogger({ onClose }: SystemDesignLoggerProps) {
  const today = getToday();
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [milestone, setMilestone] = useState('');
  const [notes, setNotes] = useState('');

  const todayLogs = useLiveQuery(() => db.systemDesignLogs.where('date').equals(today).toArray());
  const incompleteLogs = useLiveQuery(() => db.systemDesignLogs.filter(l => l.incomplete).toArray());

  async function logEntry() {
    const finalTopic = topic === '__custom__' ? customTopic : topic;
    if (!finalTopic && !milestone && !notes) return;

    await db.systemDesignLogs.add({
      date: today,
      topic: finalTopic,
      milestone,
      notes,
      incomplete: false,
    });

    // Update streak
    const streakEntry = await db.streakData.where('date').equals(today).first();
    if (streakEntry) {
      await db.streakData.update(streakEntry.id!, { sdLogged: true });
    } else {
      await db.streakData.add({ date: today, gymDone: false, dsaLogged: false, sdLogged: true, isRestDay: false });
    }

    setTopic('');
    setCustomTopic('');
    setMilestone('');
    setNotes('');
  }

  async function markIncomplete(logId: number) {
    await db.systemDesignLogs.update(logId, { incomplete: true });
  }

  async function retryIncomplete(logId: number) {
    const log = await db.systemDesignLogs.get(logId);
    if (log) {
      setTopic(log.topic);
      setNotes(log.notes);
      await db.systemDesignLogs.delete(logId);
    }
  }

  return (
    <div className="fixed inset-0 bg-zinc-900 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-purple-400">System Design / GenAI</h2>
          <p className="text-xs text-zinc-400">{todayLogs?.length || 0} entries today</p>
        </div>
        <button onClick={onClose} className="text-zinc-400 text-sm px-3 py-1 rounded bg-zinc-800">Done</button>
      </div>

      <div className="p-4 space-y-4">
        {/* Incomplete carry-overs */}
        {incompleteLogs && incompleteLogs.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-300 font-medium mb-1">Carried over (incomplete):</p>
            {incompleteLogs.map(log => (
              <div key={log.id} className="text-xs text-amber-200 flex justify-between items-center py-0.5">
                <span>{log.topic || log.milestone}</span>
                <button onClick={() => retryIncomplete(log.id!)}
                  className="text-amber-400 text-[10px] underline">Resume</button>
              </div>
            ))}
          </div>
        )}

        {/* Topic selection */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium">Topic / Case Study</label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
          >
            <option value="">Select topic...</option>
            <optgroup label="HLD Fundamentals">
              {SD_TOPICS.slice(0, 7).map(t => <option key={t} value={t}>{t}</option>)}
            </optgroup>
            <optgroup label="LLD Fundamentals">
              {SD_TOPICS.slice(7, 14).map(t => <option key={t} value={t}>{t}</option>)}
            </optgroup>
            <optgroup label="HLD Case Studies">
              {SD_TOPICS.slice(14, 20).map(t => <option key={t} value={t}>{t}</option>)}
            </optgroup>
            <optgroup label="LLD Case Studies">
              {SD_TOPICS.slice(20, 26).map(t => <option key={t} value={t}>{t}</option>)}
            </optgroup>
            <optgroup label="GenAI System Design">
              {SD_TOPICS.slice(26).map(t => <option key={t} value={t}>{t}</option>)}
            </optgroup>
            <option value="__custom__">Custom topic...</option>
          </select>
          {topic === '__custom__' && (
            <input
              type="text"
              placeholder="Enter custom topic..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500"
            />
          )}
        </div>

        {/* Project milestone */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium">Project Milestone</label>
          <select
            value={milestone}
            onChange={(e) => setMilestone(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
          >
            <option value="">Select milestone...</option>
            {PROJECT_MILESTONES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium">Notes</label>
          <textarea
            placeholder="What did you cover? Key insights, tradeoffs, questions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 resize-none h-24"
          />
        </div>

        {/* Submit */}
        <button
          onClick={logEntry}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 rounded-lg text-sm transition-colors"
        >
          Log Entry
        </button>

        {/* Today's logs */}
        {todayLogs && todayLogs.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-zinc-400 font-medium">Logged today:</p>
            {todayLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between bg-zinc-800 rounded px-3 py-2">
                <div className="flex-1 min-w-0">
                  {log.topic && <p className="text-sm text-zinc-200 truncate">{log.topic}</p>}
                  {log.milestone && <p className="text-[10px] text-purple-300">📌 {log.milestone}</p>}
                  {log.notes && <p className="text-[10px] text-zinc-400 truncate">{log.notes}</p>}
                </div>
                <button onClick={() => markIncomplete(log.id!)} className="text-[10px] text-amber-400 underline ml-2">
                  Incomplete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

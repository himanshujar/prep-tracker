'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { SD_TOPICS, PROJECT_MILESTONES } from '../lib/seedData';
import { getToday } from '../lib/utils';

export default function SDChecklist() {
  const today = getToday();
  const [activeSection, setActiveSection] = useState<'topics' | 'milestones'>('topics');
  const [loggingTopic, setLoggingTopic] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const allSDLogs = useLiveQuery(() => db.systemDesignLogs.toArray());

  const coveredTopics = useMemo(() => {
    if (!allSDLogs) return new Set<string>();
    return new Set(allSDLogs.map(l => l.topic).filter(Boolean));
  }, [allSDLogs]);

  const completedMilestones = useMemo(() => {
    if (!allSDLogs) return new Set<string>();
    return new Set(allSDLogs.map(l => l.milestone).filter(Boolean));
  }, [allSDLogs]);

  async function logTopic(topic: string) {
    await db.systemDesignLogs.add({
      date: today,
      topic,
      milestone: '',
      notes,
      incomplete: false,
    });
    const streakEntry = await db.streakData.where('date').equals(today).first();
    if (streakEntry) {
      await db.streakData.update(streakEntry.id!, { sdLogged: true });
    } else {
      await db.streakData.add({ date: today, gymDone: false, dsaLogged: false, sdLogged: true, isRestDay: false });
    }
    setLoggingTopic(null);
    setNotes('');
  }

  async function logMilestone(milestone: string) {
    await db.systemDesignLogs.add({
      date: today,
      topic: '',
      milestone,
      notes: '',
      incomplete: false,
    });
    const streakEntry = await db.streakData.where('date').equals(today).first();
    if (streakEntry) {
      await db.streakData.update(streakEntry.id!, { sdLogged: true });
    } else {
      await db.streakData.add({ date: today, gymDone: false, dsaLogged: false, sdLogged: true, isRestDay: false });
    }
  }

  async function uncheckTopic(topic: string) {
    const logs = await db.systemDesignLogs.where('topic').equals(topic).toArray();
    await db.systemDesignLogs.bulkDelete(logs.map(l => l.id!));
    setLoggingTopic(null);
  }

  async function uncheckMilestone(milestone: string) {
    const logs = await db.systemDesignLogs.where('milestone').equals(milestone).toArray();
    await db.systemDesignLogs.bulkDelete(logs.map(l => l.id!));
  }

  const topicGroups = [
    { label: 'HLD Fundamentals', items: SD_TOPICS.slice(0, 7) },
    { label: 'LLD Fundamentals', items: SD_TOPICS.slice(7, 14) },
    { label: 'HLD Case Studies', items: SD_TOPICS.slice(14, 20) },
    { label: 'LLD Case Studies', items: SD_TOPICS.slice(20, 26) },
    { label: 'GenAI System Design', items: SD_TOPICS.slice(26) },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">System Design & GenAI</h2>

      {/* Section toggle */}
      <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
        <button
          onClick={() => setActiveSection('topics')}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
            activeSection === 'topics' ? 'bg-purple-600 text-white' : 'text-zinc-400'
          }`}
        >
          Topics ({coveredTopics.size}/{SD_TOPICS.length})
        </button>
        <button
          onClick={() => setActiveSection('milestones')}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
            activeSection === 'milestones' ? 'bg-green-600 text-white' : 'text-zinc-400'
          }`}
        >
          Milestones ({completedMilestones.size}/{PROJECT_MILESTONES.length})
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-800 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${activeSection === 'topics' ? 'bg-purple-500' : 'bg-green-500'}`}
          style={{ width: `${activeSection === 'topics' ? (coveredTopics.size / SD_TOPICS.length) * 100 : (completedMilestones.size / PROJECT_MILESTONES.length) * 100}%` }}
        />
      </div>

      {activeSection === 'topics' && (
        <div className="space-y-4">
          <p className="text-[10px] text-zinc-500">Tap to mark as covered. Tap again to add notes.</p>
          {topicGroups.map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-medium text-zinc-400 mb-1.5">{group.label}</h3>
              <div className="space-y-0.5">
                {group.items.map(topic => {
                  const covered = coveredTopics.has(topic);
                  return (
                    <div key={topic}>
                      <button
                        onClick={() => {
                          if (!covered) {
                            setLoggingTopic(loggingTopic === topic ? null : topic);
                          } else {
                            setLoggingTopic(loggingTopic === topic ? null : topic);
                          }
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors active:scale-[0.98] ${
                          loggingTopic === topic ? 'bg-purple-500/10 border border-purple-500/30' :
                          covered ? 'bg-green-500/5' : 'hover:bg-zinc-800'
                        }`}
                      >
                        <span className={`text-xs ${covered ? 'text-green-400' : 'text-zinc-600'}`}>
                          {covered ? '✓' : '○'}
                        </span>
                        <span className={`text-sm flex-1 ${covered ? 'text-zinc-400' : 'text-zinc-200'}`}>
                          {topic}
                        </span>
                      </button>

                      {loggingTopic === topic && (
                        <div className="ml-6 mt-1 mb-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700 space-y-2">
                          {covered && (
                            <button
                              onClick={() => uncheckTopic(topic)}
                              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-medium py-1.5 rounded transition-colors"
                            >
                              ✗ Uncheck
                            </button>
                          )}
                          <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-xs text-zinc-200"
                            placeholder="Key takeaways / notes..."
                          />
                          <button
                            onClick={() => logTopic(topic)}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium py-1.5 rounded transition-colors"
                          >
                            {covered ? 'Log Again' : 'Mark Covered'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'milestones' && (
        <div className="space-y-1">
          <p className="text-[10px] text-zinc-500">Tap to toggle milestone done/undone</p>
          {PROJECT_MILESTONES.map(milestone => {
            const done = completedMilestones.has(milestone);
            return (
              <button
                key={milestone}
                onClick={() => done ? uncheckMilestone(milestone) : logMilestone(milestone)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors active:scale-[0.98] ${
                  done ? 'bg-green-500/5' : 'hover:bg-zinc-800'
                }`}
              >
                <span className={`text-xs ${done ? 'text-green-400' : 'text-zinc-600'}`}>
                  {done ? '✓' : '○'}
                </span>
                <span className={`text-sm ${done ? 'text-zinc-400' : 'text-zinc-200'}`}>
                  {milestone}
                </span>
                {done && <span className="text-[10px] text-red-400 ml-auto">tap to undo</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

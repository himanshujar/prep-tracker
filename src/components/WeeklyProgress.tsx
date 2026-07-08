'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { NEETCODE_150, SD_TOPICS, PROJECT_MILESTONES, getWeekPatterns } from '../lib/seedData';
import { getWeekStart, getDaysInRange, getWeekNumber } from '../lib/utils';
import { useStartDate } from '../lib/hooks';

export default function WeeklyProgress() {
  const { startDate } = useStartDate();
  const currentWeek = getWeekNumber(startDate);
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekDays = getDaysInRange(weekStart, weekEnd);

  const dsaLogs = useLiveQuery(() =>
    db.dsaProblemLogs.where('date').anyOf(weekDays).toArray()
  );
  const sdLogs = useLiveQuery(() =>
    db.systemDesignLogs.where('date').anyOf(weekDays).toArray()
  );
  const allDsaLogs = useLiveQuery(() => db.dsaProblemLogs.toArray());

  const stats = useMemo(() => {
    if (!dsaLogs || !sdLogs || !allDsaLogs) return null;

    // DSA: problems solved this week vs expected
    const weekPatterns = getWeekPatterns(currentWeek);
    const weekProblems = NEETCODE_150.filter(p => weekPatterns.includes(p.pattern));
    const solvedThisWeek = new Set(dsaLogs.filter(l => l.status === 'solved' || l.status === 'solved-with-help').map(l => l.problemId));
    
    // Total solved overall
    const totalSolved = new Set(allDsaLogs.filter(l => l.status === 'solved' || l.status === 'solved-with-help').map(l => l.problemId)).size;
    
    // Avg time
    const solvedLogs = allDsaLogs.filter(l => l.status === 'solved' || l.status === 'solved-with-help');
    const avgTime = solvedLogs.length > 0 ? Math.round(solvedLogs.reduce((sum, l) => sum + l.timeTaken, 0) / solvedLogs.length) : 0;

    // SD topics covered this week
    const topicsCovered = new Set(sdLogs.map(l => l.topic).filter(Boolean));
    const milestonesDone = new Set(sdLogs.map(l => l.milestone).filter(Boolean));

    // Most skipped block
    const blockSkips: Record<string, number> = { 'Gym': 0, 'DSA': 0, 'System Design': 0 };
    // This would require dayLogs analysis, simplified for now

    return {
      dsaSolvedThisWeek: solvedThisWeek.size,
      dsaExpectedThisWeek: weekProblems.length,
      totalSolved,
      avgTime,
      topicsCovered: topicsCovered.size,
      totalTopics: SD_TOPICS.length,
      milestonesDone: milestonesDone.size,
      totalMilestones: PROJECT_MILESTONES.length,
      weekPatterns,
      blockSkips,
    };
  }, [dsaLogs, sdLogs, allDsaLogs, currentWeek]);

  if (!stats) return <div className="p-4 text-zinc-400">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Weekly Progress</h2>
      <p className="text-xs text-zinc-400">Week {currentWeek}{currentWeek <= 12 ? ' of 12' : ' (extended)'} • {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>

      {/* DSA */}
      <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-blue-400">DSA Problems</h3>
          <span className="text-xs text-zinc-400">{stats.dsaSolvedThisWeek} / {stats.dsaExpectedThisWeek} this week</span>
        </div>
        <div className="w-full bg-zinc-700 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${stats.dsaExpectedThisWeek > 0 ? (stats.dsaSolvedThisWeek / stats.dsaExpectedThisWeek) * 100 : 0}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-500">
          <span>Focus: {stats.weekPatterns.join(', ')}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-zinc-700/50 rounded p-2 text-center">
            <p className="text-lg font-bold text-zinc-100">{stats.totalSolved}</p>
            <p className="text-[10px] text-zinc-400">Total Solved</p>
          </div>
          <div className="bg-zinc-700/50 rounded p-2 text-center">
            <p className="text-lg font-bold text-zinc-100">{stats.avgTime}m</p>
            <p className="text-[10px] text-zinc-400">Avg Time</p>
          </div>
        </div>
      </div>

      {/* System Design */}
      <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-purple-400">System Design / GenAI</h3>
          <span className="text-xs text-zinc-400">{stats.topicsCovered} topics this week</span>
        </div>
        <div className="w-full bg-zinc-700 rounded-full h-2">
          <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${(stats.topicsCovered / stats.totalTopics) * 100}%` }} />
        </div>
        <p className="text-[10px] text-zinc-500">{stats.topicsCovered} / {stats.totalTopics} topics covered overall</p>
      </div>

      {/* Project Milestones */}
      <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-green-400">Project Milestones</h3>
          <span className="text-xs text-zinc-400">{stats.milestonesDone} / {stats.totalMilestones}</span>
        </div>
        <div className="w-full bg-zinc-700 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(stats.milestonesDone / stats.totalMilestones) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {PROJECT_MILESTONES.map(m => (
            <span key={m} className={`text-[10px] px-1.5 py-0.5 rounded ${stats.milestonesDone > 0 ? 'bg-green-500/20 text-green-300' : 'bg-zinc-700 text-zinc-400'}`}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

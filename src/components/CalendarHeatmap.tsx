'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { getLast90Days } from '../lib/utils';

export default function CalendarHeatmap() {
  const days = getLast90Days();
  
  const dsaLogs = useLiveQuery(() => db.dsaProblemLogs.where('date').anyOf(days).toArray());
  const sdLogs = useLiveQuery(() => db.systemDesignLogs.where('date').anyOf(days).toArray());
  const dayLogs = useLiveQuery(() => db.dayLogs.where('date').anyOf(days).toArray());

  const heatmapData = useMemo(() => {
    if (!dsaLogs || !sdLogs || !dayLogs) return new Map<string, number>();
    
    const map = new Map<string, number>();
    days.forEach(day => {
      let score = 0;
      // DSA problems logged
      const dsaCount = dsaLogs.filter(l => l.date === day).length;
      score += Math.min(dsaCount * 2, 4); // max 4 points from DSA
      
      // SD entries
      const sdCount = sdLogs.filter(l => l.date === day).length;
      score += Math.min(sdCount * 2, 4); // max 4 points from SD
      
      // Routine blocks done
      const dayLog = dayLogs.find(l => l.date === day);
      if (dayLog) {
        const doneCount = Object.values(dayLog.blockStatuses).filter(s => s === 'done').length;
        score += Math.min(Math.floor(doneCount / 3), 2); // max 2 points from routine
      }

      map.set(day, score);
    });
    return map;
  }, [dsaLogs, sdLogs, dayLogs, days]);

  function getColor(score: number) {
    if (score === 0) return 'bg-zinc-800';
    if (score <= 2) return 'bg-green-900';
    if (score <= 4) return 'bg-green-700';
    if (score <= 6) return 'bg-green-500';
    return 'bg-green-400';
  }

  // Group by weeks (columns)
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  const firstDay = new Date(days[0]).getDay();
  
  // Pad the first week
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push('');
  }
  
  days.forEach(day => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const validDay = week.find(d => d !== '');
      if (validDay) {
        const month = new Date(validDay).getMonth();
        if (month !== lastMonth) {
          labels.push({ label: new Date(validDay).toLocaleDateString('en-US', { month: 'short' }), weekIndex: i });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Activity</h2>
      <p className="text-xs text-zinc-400">Last 90 days</p>

      {/* Month labels */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex gap-[3px] mb-1 ml-8">
            {monthLabels.map((m, i) => (
              <span key={i} className="text-[10px] text-zinc-500" style={{ marginLeft: `${m.weekIndex * 15}px`, position: i === 0 ? 'relative' : 'absolute' }}>
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                <span key={i} className="text-[9px] text-zinc-500 h-[12px] leading-[12px]">{label}</span>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, di) => {
                  const day = week[di] || '';
                  const score = day ? (heatmapData.get(day) || 0) : -1;
                  return (
                    <div
                      key={di}
                      className={`w-[12px] h-[12px] rounded-sm ${score < 0 ? 'bg-transparent' : getColor(score)}`}
                      title={day ? `${day}: ${score} points` : ''}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-3 justify-end">
            <span className="text-[10px] text-zinc-500">Less</span>
            <div className="w-[12px] h-[12px] rounded-sm bg-zinc-800" />
            <div className="w-[12px] h-[12px] rounded-sm bg-green-900" />
            <div className="w-[12px] h-[12px] rounded-sm bg-green-700" />
            <div className="w-[12px] h-[12px] rounded-sm bg-green-500" />
            <div className="w-[12px] h-[12px] rounded-sm bg-green-400" />
            <span className="text-[10px] text-zinc-500">More</span>
          </div>
        </div>
      </div>

      {/* Simple Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-zinc-100">{days.filter(d => (heatmapData.get(d) || 0) > 0).length}</p>
          <p className="text-[10px] text-zinc-400">Active Days</p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-zinc-100">{Math.max(...Array.from(heatmapData.values()), 0)}</p>
          <p className="text-[10px] text-zinc-400">Peak Score</p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-zinc-100">
            {days.length > 0 ? Math.round((days.filter(d => (heatmapData.get(d) || 0) > 0).length / days.length) * 100) : 0}%
          </p>
          <p className="text-[10px] text-zinc-400">Consistency</p>
        </div>
      </div>
    </div>
  );
}

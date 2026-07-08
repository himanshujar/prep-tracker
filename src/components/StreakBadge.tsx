'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { getToday } from '../lib/utils';

export default function StreakBadge() {
  const streakData = useLiveQuery(() => db.streakData.orderBy('date').toArray());
  const dayLogs = useLiveQuery(() => db.dayLogs.toArray());

  const streak = useMemo(() => {
    if (!streakData || streakData.length === 0) return 0;

    const today = getToday();
    let count = 0;
    const d = new Date(today);

    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      const entry = streakData.find(s => s.date === dateStr);
      const dayLog = dayLogs?.find(dl => dl.date === dateStr);

      if (!entry && !dayLog) {
        // No data for this day — if it's today, that's ok (streak hasn't broken yet)
        if (dateStr === today) {
          d.setDate(d.getDate() - 1);
          continue;
        }
        break;
      }

      const isRest = entry?.isRestDay || dayLog?.isRestDay;
      if (isRest) {
        count++;
        d.setDate(d.getDate() - 1);
        continue;
      }

      // Check if gym + dsa + sd are all logged
      const gymDone = entry?.gymDone || (dayLog?.blockStatuses && Object.entries(dayLog.blockStatuses).some(([, v]) => v === 'done'));
      const dsaLogged = entry?.dsaLogged || false;
      const sdLogged = entry?.sdLogged || false;

      if (gymDone && dsaLogged && sdLogged) {
        count++;
        d.setDate(d.getDate() - 1);
      } else if (dateStr === today) {
        // Today is in progress, don't break streak
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return count;
  }, [streakData, dayLogs]);

  return (
    <div className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-3 py-1.5">
      <span className="text-orange-400 text-sm">🔥</span>
      <span className="text-sm font-semibold text-zinc-200">{streak}</span>
      <span className="text-[10px] text-zinc-400">day streak</span>
    </div>
  );
}

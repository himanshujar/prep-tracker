'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { NEETCODE_150, PATTERNS } from '../lib/seedData';
import { getToday } from '../lib/utils';

export default function ProblemTracker() {
  const today = getToday();
  const [filterPattern, setFilterPattern] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [loggingId, setLoggingId] = useState<number | null>(null);
  const [logStatus, setLogStatus] = useState<'attempted' | 'solved' | 'solved-with-help'>('solved');
  const [logTime, setLogTime] = useState('25');
  const [logNotes, setLogNotes] = useState('');

  const allLogs = useLiveQuery(() => db.dsaProblemLogs.toArray());

  const problemStatuses = useMemo(() => {
    if (!allLogs) return new Map<number, { status: string; timeTaken: number; notes: string }>();
    const map = new Map<number, { status: string; timeTaken: number; notes: string }>();
    allLogs.forEach(log => {
      if (!map.has(log.problemId) || log.status === 'solved' || log.status === 'solved-with-help') {
        map.set(log.problemId, { status: log.status, timeTaken: log.timeTaken, notes: log.notes });
      }
    });
    return map;
  }, [allLogs]);

  const filtered = useMemo(() => {
    let problems = NEETCODE_150;
    if (filterPattern) {
      problems = problems.filter(p => p.pattern === filterPattern);
    }
    if (filterStatus === 'solved') {
      problems = problems.filter(p => {
        const s = problemStatuses.get(p.id);
        return s && (s.status === 'solved' || s.status === 'solved-with-help');
      });
    } else if (filterStatus === 'attempted') {
      problems = problems.filter(p => {
        const s = problemStatuses.get(p.id);
        return s && s.status === 'attempted';
      });
    } else if (filterStatus === 'unsolved') {
      problems = problems.filter(p => !problemStatuses.has(p.id));
    }
    return problems;
  }, [filterPattern, filterStatus, problemStatuses]);

  const solvedCount = useMemo(() => {
    let count = 0;
    problemStatuses.forEach(v => {
      if (v.status === 'solved' || v.status === 'solved-with-help') count++;
    });
    return count;
  }, [problemStatuses]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(p => {
      if (!groups[p.pattern]) groups[p.pattern] = [];
      groups[p.pattern].push(p);
    });
    return groups;
  }, [filtered]);

  async function quickLog(problemId: number) {
    await db.dsaProblemLogs.add({
      date: today,
      problemId,
      status: logStatus,
      timeTaken: parseInt(logTime) || 0,
      notes: logNotes,
      incomplete: false,
    });
    const streakEntry = await db.streakData.where('date').equals(today).first();
    if (streakEntry) {
      await db.streakData.update(streakEntry.id!, { dsaLogged: true });
    } else {
      await db.streakData.add({ date: today, gymDone: false, dsaLogged: true, sdLogged: false, isRestDay: false });
    }
    setLoggingId(null);
    setLogNotes('');
    setLogTime('25');
    setLogStatus('solved');
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Problem Tracker</h2>
        <span className="text-sm text-blue-400 font-medium">{solvedCount}/150</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-800 rounded-full h-2.5">
        <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${(solvedCount / 150) * 100}%` }} />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filterPattern}
          onChange={(e) => setFilterPattern(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200"
        >
          <option value="">All Patterns</option>
          {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200"
        >
          <option value="">All Status</option>
          <option value="solved">Solved</option>
          <option value="attempted">Attempted</option>
          <option value="unsolved">Unsolved</option>
        </select>
      </div>

      <p className="text-[10px] text-zinc-500">Tap a problem to log it</p>

      {/* Problem list grouped by pattern */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([pattern, problems]) => (
          <div key={pattern}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-medium text-zinc-400">{pattern}</h3>
              <span className="text-[10px] text-zinc-500">
                {problems.filter(p => {
                  const s = problemStatuses.get(p.id);
                  return s && (s.status === 'solved' || s.status === 'solved-with-help');
                }).length}/{problems.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {problems.map(problem => {
                const log = problemStatuses.get(problem.id);
                const isSolved = log && (log.status === 'solved' || log.status === 'solved-with-help');
                const isAttempted = log && log.status === 'attempted';
                return (
                  <div key={problem.id}>
                    <button
                      onClick={() => setLoggingId(loggingId === problem.id ? null : problem.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors active:scale-[0.98] ${
                        loggingId === problem.id ? 'bg-blue-500/10 border border-blue-500/30' :
                        isSolved ? 'bg-green-500/5' : isAttempted ? 'bg-yellow-500/5' : 'hover:bg-zinc-800'
                      }`}
                    >
                      <span className={`text-xs ${isSolved ? 'text-green-400' : isAttempted ? 'text-yellow-400' : 'text-zinc-600'}`}>
                        {isSolved ? '✓' : isAttempted ? '◐' : '○'}
                      </span>
                      <span className={`text-sm flex-1 truncate ${isSolved ? 'text-zinc-400 line-through' : 'text-zinc-200'}`}>{problem.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        problem.difficulty === 'Easy' ? 'text-green-400' :
                        problem.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                      }`}>{problem.difficulty[0]}</span>
                      {log && <span className="text-[10px] text-zinc-500">{log.timeTaken}m</span>}
                    </button>

                    {/* Inline log form */}
                    {loggingId === problem.id && (
                      <div className="ml-6 mt-1 mb-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700 space-y-2">
                        <div className="flex gap-1.5">
                          {(['attempted', 'solved', 'solved-with-help'] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => setLogStatus(s)}
                              className={`text-[11px] px-2 py-1 rounded ${logStatus === s ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                            >
                              {s === 'solved-with-help' ? 'w/ Help' : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            value={logTime}
                            onChange={(e) => setLogTime(e.target.value)}
                            className="w-14 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-200"
                            min="1"
                            placeholder="min"
                          />
                          <span className="text-[10px] text-zinc-400">min</span>
                          <input
                            type="text"
                            value={logNotes}
                            onChange={(e) => setLogNotes(e.target.value)}
                            className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-200"
                            placeholder="Notes..."
                          />
                        </div>
                        <button
                          onClick={() => quickLog(problem.id)}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-1.5 rounded transition-colors"
                        >
                          Log
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
    </div>
  );
}

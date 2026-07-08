'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { NEETCODE_150, PATTERNS } from '../lib/seedData';

export default function ProblemTracker() {
  const [filterPattern, setFilterPattern] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const allLogs = useLiveQuery(() => db.dsaProblemLogs.toArray());

  const problemStatuses = useMemo(() => {
    if (!allLogs) return new Map<number, { status: string; timeTaken: number; notes: string }>();
    const map = new Map<number, { status: string; timeTaken: number; notes: string }>();
    // Use the latest log for each problem
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

  // Group by pattern
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(p => {
      if (!groups[p.pattern]) groups[p.pattern] = [];
      groups[p.pattern].push(p);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Problem Tracker</h2>
        <span className="text-sm text-blue-400 font-medium">{solvedCount}/150</span>
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
                  <div key={problem.id} className={`flex items-center gap-2 px-3 py-1.5 rounded ${isSolved ? 'bg-green-500/5' : isAttempted ? 'bg-yellow-500/5' : ''}`}>
                    <span className={`text-xs ${isSolved ? 'text-green-400' : isAttempted ? 'text-yellow-400' : 'text-zinc-600'}`}>
                      {isSolved ? '✓' : isAttempted ? '◐' : '○'}
                    </span>
                    <span className={`text-sm flex-1 ${isSolved ? 'text-zinc-300' : 'text-zinc-200'}`}>{problem.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      problem.difficulty === 'Easy' ? 'text-green-400' :
                      problem.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                    }`}>{problem.difficulty[0]}</span>
                    {log && <span className="text-[10px] text-zinc-500">{log.timeTaken}m</span>}
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

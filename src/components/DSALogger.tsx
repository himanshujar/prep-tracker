'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { NEETCODE_150, PATTERNS, getWeekPatterns } from '../lib/seedData';
import { getToday, getWeekNumber } from '../lib/utils';
import { useStartDate } from '../lib/hooks';

interface DSALoggerProps {
  onClose: () => void;
}

export default function DSALogger({ onClose }: DSALoggerProps) {
  const today = getToday();
  const { startDate } = useStartDate();
  const currentWeek = getWeekNumber(startDate);
  const [selectedPattern, setSelectedPattern] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<number | null>(null);
  const [status, setStatus] = useState<'attempted' | 'solved' | 'solved-with-help'>('solved');
  const [timeTaken, setTimeTaken] = useState('25');
  const [notes, setNotes] = useState('');

  const allLogs = useLiveQuery(() => db.dsaProblemLogs.toArray());
  const todayLogs = useLiveQuery(() => db.dsaProblemLogs.where('date').equals(today).toArray());
  const incompleteLogs = useLiveQuery(() => db.dsaProblemLogs.filter(l => l.incomplete).toArray());

  const solvedIds = useMemo(() => {
    if (!allLogs) return new Set<number>();
    const solved = new Set<number>();
    allLogs.forEach(log => {
      if (log.status === 'solved' || log.status === 'solved-with-help') {
        solved.add(log.problemId);
      }
    });
    return solved;
  }, [allLogs]);

  const solvedCount = solvedIds.size;

  const suggestedPatterns = getWeekPatterns(currentWeek);

  const filteredProblems = useMemo(() => {
    let problems = NEETCODE_150;
    if (selectedPattern) {
      problems = problems.filter(p => p.pattern === selectedPattern);
    }
    if (search) {
      const q = search.toLowerCase();
      problems = problems.filter(p => p.name.toLowerCase().includes(q));
    }
    return problems;
  }, [selectedPattern, search]);

  async function logProblem() {
    if (!selectedProblem) return;
    await db.dsaProblemLogs.add({
      date: today,
      problemId: selectedProblem,
      status,
      timeTaken: parseInt(timeTaken) || 0,
      notes,
      incomplete: false,
    });
    // Update streak data
    const streakEntry = await db.streakData.where('date').equals(today).first();
    if (streakEntry) {
      await db.streakData.update(streakEntry.id!, { dsaLogged: true });
    } else {
      await db.streakData.add({ date: today, gymDone: false, dsaLogged: true, sdLogged: false, isRestDay: false });
    }
    setSelectedProblem(null);
    setNotes('');
    setTimeTaken('25');
    setStatus('solved');
  }

  async function markIncomplete(logId: number) {
    await db.dsaProblemLogs.update(logId, { incomplete: true });
  }

  return (
    <div className="fixed inset-0 bg-zinc-900 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-blue-400">DSA Log</h2>
          <p className="text-xs text-zinc-400">Week {currentWeek} • {solvedCount} / 150 solved</p>
        </div>
        <button onClick={onClose} className="text-zinc-400 text-sm px-3 py-1 rounded bg-zinc-800">Done</button>
      </div>

      <div className="p-4 space-y-4">
        {/* Progress bar */}
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${(solvedCount / 150) * 100}%` }} />
        </div>

        {/* Suggested for this week */}
        {suggestedPatterns.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-300 font-medium mb-1">Suggested this week (Week {currentWeek}):</p>
            <div className="flex flex-wrap gap-1">
              {suggestedPatterns.map(p => (
                <button key={p} onClick={() => setSelectedPattern(p)} className="text-[11px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Incomplete carry-overs */}
        {incompleteLogs && incompleteLogs.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-300 font-medium mb-1">Carried over (incomplete):</p>
            {incompleteLogs.map(log => {
              const problem = NEETCODE_150.find(p => p.id === log.problemId);
              return (
                <div key={log.id} className="text-xs text-amber-200 flex justify-between items-center py-0.5">
                  <span>{problem?.name}</span>
                  <button onClick={() => { setSelectedProblem(log.problemId); db.dsaProblemLogs.delete(log.id!); }}
                    className="text-amber-400 text-[10px] underline">Retry</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter & Search */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500"
          />
          <select
            value={selectedPattern}
            onChange={(e) => setSelectedPattern(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
          >
            <option value="">All Patterns</option>
            {PATTERNS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Problem list */}
        <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-700 divide-y divide-zinc-800">
          {filteredProblems.map(problem => (
            <button
              key={problem.id}
              onClick={() => setSelectedProblem(problem.id)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                selectedProblem === problem.id ? 'bg-blue-500/20' : 'hover:bg-zinc-800'
              }`}
            >
              <span className={`text-[10px] w-4 text-center ${solvedIds.has(problem.id) ? 'text-green-400' : 'text-zinc-600'}`}>
                {solvedIds.has(problem.id) ? '✓' : '○'}
              </span>
              <span className="text-sm text-zinc-200 flex-1 truncate">{problem.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                problem.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                problem.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>{problem.difficulty}</span>
            </button>
          ))}
        </div>

        {/* Log form */}
        {selectedProblem && (
          <div className="bg-zinc-800 rounded-lg p-4 space-y-3 border border-zinc-700">
            <p className="text-sm font-medium text-zinc-200">
              {NEETCODE_150.find(p => p.id === selectedProblem)?.name}
            </p>
            
            <div className="flex gap-2">
              {(['attempted', 'solved', 'solved-with-help'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`text-xs px-2 py-1 rounded ${status === s ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                >
                  {s === 'solved-with-help' ? 'w/ Help' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-xs text-zinc-400">Time:</label>
              <input
                type="number"
                value={timeTaken}
                onChange={(e) => setTimeTaken(e.target.value)}
                className="w-16 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-200"
                min="1"
              />
              <span className="text-xs text-zinc-400">min</span>
            </div>

            <textarea
              placeholder="Mistakes / notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 resize-none h-16"
            />

            <button
              onClick={logProblem}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              Log Problem
            </button>
          </div>
        )}

        {/* Today's logs */}
        {todayLogs && todayLogs.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-zinc-400 font-medium">Logged today:</p>
            {todayLogs.map(log => {
              const problem = NEETCODE_150.find(p => p.id === log.problemId);
              return (
                <div key={log.id} className="flex items-center justify-between bg-zinc-800 rounded px-3 py-2">
                  <div>
                    <p className="text-sm text-zinc-200">{problem?.name}</p>
                    <p className="text-[10px] text-zinc-400">{log.status} • {log.timeTaken}min</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => markIncomplete(log.id!)} className="text-[10px] text-amber-400 underline">
                      Incomplete
                    </button>
                    <button onClick={() => db.dsaProblemLogs.delete(log.id!)} className="text-[10px] text-red-400 underline">
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

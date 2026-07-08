'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDefaultBlocks, type RoutineBlock, type DayLog } from '../lib/db';
import { getToday, formatTime } from '../lib/utils';

interface TimelineProps {
  onOpenDSA: () => void;
  onOpenSD: () => void;
}

export default function Timeline({ onOpenDSA, onOpenSD }: TimelineProps) {
  const today = getToday();
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  useEffect(() => {
    initDefaultBlocks();
  }, []);

  const blocks = useLiveQuery(() => db.routineBlocks.orderBy('order').toArray());
  const dayLog = useLiveQuery(() => db.dayLogs.where('date').equals(today).first());

  const isRestDay = dayLog?.isRestDay ?? false;
  const statuses = dayLog?.blockStatuses ?? {};

  async function toggleRestDay() {
    const existing = await db.dayLogs.where('date').equals(today).first();
    if (existing) {
      await db.dayLogs.update(existing.id!, { isRestDay: !existing.isRestDay });
    } else {
      await db.dayLogs.add({ date: today, isRestDay: true, blockStatuses: {} });
    }
  }

  async function toggleBlock(block: RoutineBlock) {
    if (!block.id) return;
    
    if (block.category === 'deep-work-dsa') {
      onOpenDSA();
      return;
    }
    if (block.category === 'deep-work-sd') {
      onOpenSD();
      return;
    }

    const existing = await db.dayLogs.where('date').equals(today).first();
    const current = existing?.blockStatuses ?? {};
    const currentStatus = current[block.id] || 'pending';
    
    let newStatus: 'done' | 'skipped' | 'pending';
    if (currentStatus === 'pending') newStatus = 'done';
    else if (currentStatus === 'done') newStatus = 'skipped';
    else newStatus = 'pending';

    const updated = { ...current, [block.id]: newStatus };

    if (existing) {
      await db.dayLogs.update(existing.id!, { blockStatuses: updated });
    } else {
      await db.dayLogs.add({ date: today, isRestDay: false, blockStatuses: updated });
    }
  }

  async function saveTimeEdit(blockId: number) {
    await db.routineBlocks.update(blockId, { startTime: editStart, endTime: editEnd });
    setEditingBlock(null);
  }

  function startEditing(block: RoutineBlock) {
    if (!block.id) return;
    setEditingBlock(block.id);
    setEditStart(block.startTime);
    setEditEnd(block.endTime);
  }

  function getStatusIcon(block: RoutineBlock) {
    if (!block.id) return '';
    if (isRestDay && (block.category === 'deep-work-dsa' || block.category === 'deep-work-sd' || block.label === 'Gym')) {
      return '😴';
    }
    const status = statuses[block.id] || 'pending';
    if (status === 'done') return '✓';
    if (status === 'skipped') return '✗';
    return '';
  }

  function getStatusClass(block: RoutineBlock) {
    if (!block.id) return '';
    if (isRestDay && (block.category === 'deep-work-dsa' || block.category === 'deep-work-sd' || block.label === 'Gym')) {
      return 'opacity-40';
    }
    const status = statuses[block.id] || 'pending';
    if (status === 'done') return 'border-l-green-500 bg-green-500/10';
    if (status === 'skipped') return 'border-l-red-500 bg-red-500/10';
    return 'border-l-zinc-600';
  }

  function getCategoryColor(cat: string) {
    switch (cat) {
      case 'deep-work-dsa': return 'text-blue-400';
      case 'deep-work-sd': return 'text-purple-400';
      case 'office': return 'text-yellow-400';
      case 'commute': return 'text-zinc-400';
      default: return 'text-zinc-300';
    }
  }

  if (!blocks) return <div className="p-4 text-zinc-400">Loading...</div>;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-zinc-900 z-10">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Today</h1>
          <p className="text-xs text-zinc-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        <button
          onClick={toggleRestDay}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isRestDay ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}
        >
          {isRestDay ? '😴 Rest Day' : 'Rest Day'}
        </button>
      </div>

      {/* Timeline */}
      <div className="px-4 space-y-1">
        {blocks.map((block) => (
          <div key={block.id} className="relative">
            {editingBlock === block.id ? (
              <div className="flex items-center gap-2 py-2 px-3 bg-zinc-800 rounded-lg border border-zinc-600">
                <input
                  type="time"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="bg-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded"
                />
                <span className="text-zinc-500">–</span>
                <input
                  type="time"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="bg-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded"
                />
                <button onClick={() => saveTimeEdit(block.id!)} className="text-green-400 text-xs font-medium ml-auto">Save</button>
                <button onClick={() => setEditingBlock(null)} className="text-zinc-500 text-xs">Cancel</button>
              </div>
            ) : (
              <div
                className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border-l-4 cursor-pointer transition-all active:scale-[0.98] ${getStatusClass(block)}`}
                onClick={() => toggleBlock(block)}
                onDoubleClick={() => startEditing(block)}
              >
                <div className="flex-shrink-0 w-14 text-right">
                  <span className="text-[11px] text-zinc-500">{formatTime(block.startTime)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${getCategoryColor(block.category)}`}>
                    {block.label}
                  </p>
                  <p className="text-[10px] text-zinc-500">{formatTime(block.startTime)} – {formatTime(block.endTime)}</p>
                </div>
                <div className="flex-shrink-0 w-6 text-center">
                  {block.category === 'deep-work-dsa' || block.category === 'deep-work-sd' ? (
                    <span className="text-xs text-zinc-500">→</span>
                  ) : (
                    <span className={`text-sm ${statuses[block.id!] === 'done' ? 'text-green-400' : statuses[block.id!] === 'skipped' ? 'text-red-400' : 'text-zinc-600'}`}>
                      {getStatusIcon(block)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-[10px] text-zinc-600 mt-4">Double-tap a block to edit times</p>
    </div>
  );
}

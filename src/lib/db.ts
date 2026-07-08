import Dexie, { type EntityTable } from 'dexie';

export interface RoutineBlock {
  id?: number;
  label: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  category: 'routine' | 'deep-work-dsa' | 'deep-work-sd' | 'commute' | 'office';
  order: number;
}

export interface DayLog {
  id?: number;
  date: string; // YYYY-MM-DD
  isRestDay: boolean;
  blockStatuses: Record<number, 'done' | 'skipped' | 'pending'>;
}

export interface DSAProblemLog {
  id?: number;
  date: string;
  problemId: number;
  status: 'attempted' | 'solved' | 'solved-with-help';
  timeTaken: number; // minutes
  notes: string;
  incomplete: boolean;
}

export interface SystemDesignLog {
  id?: number;
  date: string;
  topic: string;
  milestone: string;
  notes: string;
  incomplete: boolean;
}

export interface StreakData {
  id?: number;
  date: string;
  gymDone: boolean;
  dsaLogged: boolean;
  sdLogged: boolean;
  isRestDay: boolean;
}

const db = new Dexie('PrepTrackerDB') as Dexie & {
  routineBlocks: EntityTable<RoutineBlock, 'id'>;
  dayLogs: EntityTable<DayLog, 'id'>;
  dsaProblemLogs: EntityTable<DSAProblemLog, 'id'>;
  systemDesignLogs: EntityTable<SystemDesignLog, 'id'>;
  streakData: EntityTable<StreakData, 'id'>;
};

db.version(1).stores({
  routineBlocks: '++id, order',
  dayLogs: '++id, &date',
  dsaProblemLogs: '++id, date, problemId, incomplete',
  systemDesignLogs: '++id, date, incomplete',
  streakData: '++id, &date',
});

export { db };

// Initialize default routine blocks
export async function initDefaultBlocks() {
  const count = await db.routineBlocks.count();
  if (count > 0) return;

  const defaults: Omit<RoutineBlock, 'id'>[] = [
    { label: 'Wake up + freshen up', startTime: '07:00', endTime: '07:15', category: 'routine', order: 0 },
    { label: 'Prep meals', startTime: '07:15', endTime: '07:45', category: 'routine', order: 1 },
    { label: 'Gym', startTime: '07:45', endTime: '08:45', category: 'routine', order: 2 },
    { label: 'Shower + breakfast', startTime: '08:45', endTime: '09:15', category: 'routine', order: 3 },
    { label: 'Deep work: DSA', startTime: '09:15', endTime: '10:45', category: 'deep-work-dsa', order: 4 },
    { label: 'Get ready + commute', startTime: '10:45', endTime: '11:00', category: 'commute', order: 5 },
    { label: 'Office', startTime: '11:00', endTime: '19:00', category: 'office', order: 6 },
    { label: 'Commute home', startTime: '19:00', endTime: '19:30', category: 'commute', order: 7 },
    { label: 'Freshen up / decompress', startTime: '19:30', endTime: '20:00', category: 'routine', order: 8 },
    { label: 'Dinner', startTime: '20:00', endTime: '20:45', category: 'routine', order: 9 },
    { label: 'Deep work: System Design / GenAI', startTime: '20:45', endTime: '22:00', category: 'deep-work-sd', order: 10 },
    { label: 'Wind down', startTime: '22:00', endTime: '22:30', category: 'routine', order: 11 },
    { label: 'Sleep', startTime: '22:30', endTime: '07:00', category: 'routine', order: 12 },
  ];

  await db.routineBlocks.bulkAdd(defaults);
}

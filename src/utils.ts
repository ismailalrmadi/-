import { Visit, JobScope } from './types';

export interface WorkItemDurations {
  room1: number;
  room2: number;
  room3: number;
  room4: number;
  room5: number;
  room6: number;
  room7: number;
  room8: number;
  room9: number;
  room10: number;
  villa: number;
  tvLibrary: number;
  dressingTable: number;
  wardrobe: number;
  underStairs: number;
  coffeeCorner: number;
  dressingRoom: number;
  defaultFallback: number;
}

export const DEFAULT_WORK_DURATIONS: WorkItemDurations = {
  room1: 45,
  room2: 90,
  room3: 120,
  room4: 150,
  room5: 180,
  room6: 210,
  room7: 240,
  room8: 270,
  room9: 300,
  room10: 330,
  villa: 360,
  tvLibrary: 30,
  dressingTable: 20,
  wardrobe: 30,
  underStairs: 20,
  coffeeCorner: 20,
  dressingRoom: 45,
  defaultFallback: 60,
};

export const WORK_ITEM_LABELS: Record<keyof WorkItemDurations, string> = {
  room1: 'غرفة واحدة',
  room2: 'غرفتين',
  room3: '3 غرف',
  room4: '4 غرف',
  room5: '5 غرف',
  room6: '6 غرف',
  room7: '7 غرف',
  room8: '8 غرف',
  room9: '9 غرف',
  room10: '10 غرف',
  villa: 'فيلا',
  tvLibrary: 'مكتبة شاشة',
  dressingTable: 'تسريحة',
  wardrobe: 'دواليب / دولاب',
  underStairs: 'أسفل الدرج',
  coffeeCorner: 'ركن قهوة',
  dressingRoom: 'غرفة ملابس',
  defaultFallback: 'غير محدد (افتراضي)'
};

export function parseWorksToDuration(works: string | undefined, settings: WorkItemDurations): number {
  if (!works) return settings.defaultFallback;
  const text = works.toLowerCase().trim();
  
  let duration = 0;
  let hasRooms = false;

  // Extract rooms
  const numMatch = text.match(/(\d+)\s*غرف/);
  let roomCount = 0;
  if (numMatch) {
    roomCount = parseInt(numMatch[1], 10);
  } else if (text.includes('غرفتين')) {
    roomCount = 2;
  } else if (text.includes('غرفة') && !text.includes('غرفتين') && !text.includes('غرف') && !text.includes('ملابس')) {
    roomCount = 1;
  } else if (text.includes('فيلا')) {
    duration += settings.villa;
    hasRooms = true;
  }

  if (roomCount > 0) {
    hasRooms = true;
    if (roomCount === 1) duration += settings.room1;
    else if (roomCount === 2) duration += settings.room2;
    else if (roomCount === 3) duration += settings.room3;
    else if (roomCount === 4) duration += settings.room4;
    else if (roomCount === 5) duration += settings.room5;
    else if (roomCount === 6) duration += settings.room6;
    else if (roomCount === 7) duration += settings.room7;
    else if (roomCount === 8) duration += settings.room8;
    else if (roomCount === 9) duration += settings.room9;
    else if (roomCount >= 10) duration += settings.room10;
  }

  // Extract extras
  if (text.includes('مكتبة شاش') || text.includes('مكتبه شاش') || text.includes('مكتبة tv') || text.includes('مكتبه tv')) duration += settings.tvLibrary;
  if (text.includes('تسريح')) duration += settings.dressingTable;
  if (text.includes('دولاب') || text.includes('دواليب')) duration += settings.wardrobe;
  if (text.includes('اسفل الدرج') || text.includes('أسفل الدرج')) duration += settings.underStairs;
  if (text.includes('قهوة') || text.includes('قهوه')) duration += settings.coffeeCorner;
  if (text.includes('غرفة ملابس') || text.includes('غرفه ملابس')) duration += settings.dressingRoom;

  if (duration === 0) duration = settings.defaultFallback;

  return duration;
}

export function parseTimeToMins(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// Deprecated old functions we keep for backwards compatibility with any remaining code if needed, but simplified
export const DEFAULT_SCOPE_DURATIONS: Record<JobScope, number> = {
  'غرفة': 60,
  'غرفتين': 90,
  'ثلاث غرف': 150,
  'فيلا': 240,
  'غير محدد': 60
};

export function getLearnedDurations(visits: Visit[]): Record<JobScope, { duration: number; samples: number }> {
  // Simplified version
  return {
    'غرفة': { duration: 60, samples: 0 },
    'غرفتين': { duration: 90, samples: 0 },
    'ثلاث غرف': { duration: 150, samples: 0 },
    'فيلا': { duration: 240, samples: 0 },
    'غير محدد': { duration: 60, samples: 0 }
  }
}

export function parseJobScopeFromWorks(works: string, dynamicDurations?: Record<JobScope, number>): { jobScope: JobScope, estimatedDuration: number } {
  const scope: JobScope = 'غير محدد';
  const duration = parseWorksToDuration(works, DEFAULT_WORK_DURATIONS);
  return { jobScope: scope, estimatedDuration: duration };
}

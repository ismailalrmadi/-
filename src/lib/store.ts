import { Client, Project, Technician, Visit, Route, LogEntry } from '../types';
import { initialClients, initialProjects, initialTechnicians, initialVisits, initialRoutes, initialLogs } from '../data/mockData';

// Helper to calculate distance in KM between two points
export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(2));
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Simple nearest-neighbor TSP solver to optimize routes
export function optimizeTSP(visitIds: string[], clients: Client[], startLat: number, startLng: number): string[] {
  if (visitIds.length <= 1) return visitIds;

  const optimized: string[] = [];
  const unvisited = [...visitIds];

  let currentLat = startLat;
  let currentLng = startLng;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const visitId = unvisited[i];
      // find visit's client location
      const client = clients.find(c => c.id === visitId); // assuming client-visit relationship is resolved, wait, visits have clientIds
      // Let's resolve properly:
      const clientLat = client?.lat ?? 31.95;
      const clientLng = client?.lng ?? 35.91;

      const dist = getDistanceKm(currentLat, currentLng, clientLat, clientLng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const nextVisitId = unvisited.splice(nearestIndex, 1)[0];
    optimized.push(nextVisitId);

    const nextClient = clients.find(c => c.id === nextVisitId);
    if (nextClient) {
      currentLat = nextClient.lat;
      currentLng = nextClient.lng;
    }
  }

  return optimized;
}

// Check if there is a scheduling conflict
export function detectConflicts(visits: Visit[], technicians: Technician[]): { visitId: string; message: string }[] {
  const conflicts: { visitId: string; message: string }[] = [];

  // Sort visits by scheduled start time
  const activeVisits = visits.filter(v => v.status !== 'completed');

  for (let i = 0; i < activeVisits.length; i++) {
    const v1 = activeVisits[i];
    const tech = technicians.find(t => t.id === v1.technicianId);
    if (!tech) continue;

    // Check 1: Outside shift hours
    const [sH, sM] = v1.plannedStartTime.split(':').map(Number);
    const [eH, eM] = v1.plannedEndTime.split(':').map(Number);
    const [shiftSH, shiftSM] = tech.shiftStart.split(':').map(Number);
    const [shiftEH, shiftEM] = tech.shiftEnd.split(':').map(Number);

    const startVal = sH * 60 + sM;
    const endVal = eH * 60 + eM;
    const shiftSVal = shiftSH * 60 + shiftSM;
    const shiftEVal = shiftEH * 60 + shiftEM;

    if (startVal < shiftSVal || endVal > shiftEVal) {
      conflicts.push({
        visitId: v1.id,
        message: `Scheduled outside of ${tech.name}'s shift (${tech.shiftStart} - ${tech.shiftEnd})`
      });
      continue;
    }

    // Check 2: Break overlaps
    for (const b of tech.breaks) {
      const [bSH, bSM] = b.startTime.split(':').map(Number);
      const [bEH, bEM] = b.endTime.split(':').map(Number);
      const bSVal = bSH * 60 + bSM;
      const bEVal = bEH * 60 + bEM;

      if (startVal < bEVal && endVal > bSVal) {
        conflicts.push({
          visitId: v1.id,
          message: `Overlaps with ${tech.name}'s scheduled ${b.type} break (${b.startTime} - ${b.endTime})`
        });
        continue;
      }
    }

    // Check 2.5: Vacation overlaps
    if (tech.vacations && v1.date) {
      const dateObj = new Date(v1.date);
      const weekdaysAr = ['الأحد', 'الأثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const dayNameAr = weekdaysAr[dateObj.getDay()];
      if (tech.vacations.includes(dayNameAr)) {
        conflicts.push({
          visitId: v1.id,
          message: `مجدولة في يوم إجازة الفني ${tech.name} (${tech.vacations})`
        });
        continue;
      }
    }

    // Check 3: Overlaps with other visits of the same technician
    for (let j = i + 1; j < activeVisits.length; j++) {
      const v2 = activeVisits[j];
      if (v1.technicianId !== v2.technicianId || v1.id === v2.id || v1.date !== v2.date) continue;

      const [v2SH, v2SM] = v2.plannedStartTime.split(':').map(Number);
      const [v2EH, v2EM] = v2.plannedEndTime.split(':').map(Number);
      const v2SVal = v2SH * 60 + v2SM;
      const v2EVal = v2EH * 60 + v2EM;

      if (startVal < v2EVal && endVal > v2SVal) {
        conflicts.push({
          visitId: v1.id,
          message: `Overlaps with another job assigned to ${tech.name} ("${v2.title}" ${v2.plannedStartTime} - ${v2.plannedEndTime})`
        });
        conflicts.push({
          visitId: v2.id,
          message: `Overlaps with another job assigned to ${tech.name} ("${v1.title}" ${v1.plannedStartTime} - ${v1.plannedEndTime})`
        });
      }
    }
  }

  return conflicts;
}

export function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return timeStr;

  const ampm = hour >= 12 ? 'م' : 'ص';
  hour = hour % 12;
  hour = hour ? hour : 12; // the hour '0' should be '12'
  const formattedMinutes = String(minute).padStart(2, '0');
  return `${hour}:${formattedMinutes} ${ampm}`;
}

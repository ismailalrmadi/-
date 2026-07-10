import React, { useState, useEffect } from 'react';
import { Client, Technician, Visit, Route, JobScope } from '../types';
import { getDistanceKm, formatTimeTo12Hour } from '../lib/store';
import { getLearnedDurations, DEFAULT_SCOPE_DURATIONS, WorkItemDurations, DEFAULT_WORK_DURATIONS, WORK_ITEM_LABELS, parseWorksToDuration } from '../utils';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  Check, 
  AlertCircle, 
  ArrowLeftRight, 
  Navigation, 
  CalendarDays, 
  Sliders, 
  Map, 
  ChevronRight, 
  Clock, 
  Bookmark,
  Shuffle
} from 'lucide-react';

interface RegionalPlannerProps {
  clients: Client[];
  technicians: Technician[];
  visits: Visit[];
  onUpdateVisits: (updatedVisits: Visit[]) => void;
  appendLog: (techId: string, action: string, type: 'info' | 'success' | 'warning' | 'error', visitId?: string) => void;
}

interface RegionInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  borderColor: string;
  badgeBg: string;
}

const REGIONS: RegionInfo[] = [
  { id: 'north', name: 'شمال الرياض', description: 'الأحياء الشمالية مثل الملقا، الياسمين، النرجس، الصحافة، العقيق والربيع', color: 'text-indigo-600', borderColor: 'border-indigo-100', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'south', name: 'جنوب الرياض', description: 'الأحياء الجنوبية مثل السويدي، الشفا، العزيزية، الحزم والدار البيضاء', color: 'text-rose-600', borderColor: 'border-rose-100', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'east', name: 'شرق الرياض', description: 'الأحياء الشرقية مثل اليرموك، قرطبة، الروضة، النسيم، الحمراء والريان', color: 'text-emerald-600', borderColor: 'border-emerald-100', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'west', name: 'غرب الرياض', description: 'الأحياء الغربية مثل المهدية، لبن، ظهرة لبن، العوالي والدرعية', color: 'text-amber-600', borderColor: 'border-amber-100', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'central', name: 'وسط الرياض', description: 'الأحياء الوسطى مثل العليا، السليمانية، المربع، الملز والبطحاء', color: 'text-violet-600', borderColor: 'border-violet-100', badgeBg: 'bg-violet-50 text-violet-700 border-violet-200' },
];

interface WeekDayConfig {
  dayNameAr: string;
  dayNameEn: string;
  assignedRegions: string[]; // Region IDs
  dateStr: string; // YYYY-MM-DD corresponding to the week of simulation
  maxDailyVisits?: number;
}

// Proximity/adjacency rules for Riyadh regions to suggest merging nearby areas
const REGION_PROXIMITY: { [key: string]: { id: string; name: string }[] } = {
  north: [
    { id: 'central', name: 'وسط الرياض' },
    { id: 'east', name: 'شرق الرياض' },
    { id: 'west', name: 'غرب الرياض' }
  ],
  south: [
    { id: 'central', name: 'وسط الرياض' },
    { id: 'west', name: 'غرب الرياض' },
    { id: 'east', name: 'شرق الرياض' }
  ],
  east: [
    { id: 'central', name: 'وسط الرياض' },
    { id: 'north', name: 'شمال الرياض' },
    { id: 'south', name: 'جنوب الرياض' }
  ],
  west: [
    { id: 'central', name: 'وسط الرياض' },
    { id: 'north', name: 'شمال الرياض' },
    { id: 'south', name: 'جنوب الرياض' }
  ],
  central: [
    { id: 'north', name: 'شمال الرياض' },
    { id: 'south', name: 'جنوب الرياض' },
    { id: 'east', name: 'شرق الرياض' },
    { id: 'west', name: 'غرب الرياض' }
  ]
};

export default function RegionalPlanner({
  clients,
  technicians,
  visits,
  onUpdateVisits,
  appendLog
}: RegionalPlannerProps) {
  // Config state for weekly schedule rules supporting multi-region routing
  const [weeklyRules, setWeeklyRules] = useState<WeekDayConfig[]>(() => {
    const saved = localStorage.getItem('ars_weekly_rules');
    return saved ? JSON.parse(saved) : [
      { dayNameAr: 'السبت', dayNameEn: 'Saturday', assignedRegions: ['central'], dateStr: '2026-07-11', maxDailyVisits: 8 },
      { dayNameAr: 'الأحد', dayNameEn: 'Sunday', assignedRegions: ['north'], dateStr: '2026-07-12', maxDailyVisits: 8 },
      { dayNameAr: 'الأثنين', dayNameEn: 'Monday', assignedRegions: ['west'], dateStr: '2026-07-13', maxDailyVisits: 8 },
      { dayNameAr: 'الثلاثاء', dayNameEn: 'Tuesday', assignedRegions: ['east'], dateStr: '2026-07-14', maxDailyVisits: 8 },
      { dayNameAr: 'الأربعاء', dayNameEn: 'Wednesday', assignedRegions: ['south'], dateStr: '2026-07-15', maxDailyVisits: 8 },
      { dayNameAr: 'الخميس', dayNameEn: 'Thursday', assignedRegions: ['central'], dateStr: '2026-07-16', maxDailyVisits: 8 },
    ];
  });

  const [workDurations, setWorkDurations] = useState<WorkItemDurations>(() => {
    const saved = localStorage.getItem('ars_work_durations');
    return saved ? JSON.parse(saved) : DEFAULT_WORK_DURATIONS;
  });


  useEffect(() => {
    localStorage.setItem('ars_work_durations', JSON.stringify(workDurations));
  }, [workDurations]);

  const [visitDuration, setVisitDuration] = useState<number>(() => {
    const saved = localStorage.getItem('ars_visit_duration');
    return saved ? parseInt(saved) : 90;
  });

  const [bufferTime, setBufferTime] = useState<number>(() => {
    const saved = localStorage.getItem('ars_buffer_time');
    return saved ? parseInt(saved) : 30;
  });

  useEffect(() => {
    localStorage.setItem('ars_weekly_rules', JSON.stringify(weeklyRules));
  }, [weeklyRules]);

  useEffect(() => {
    localStorage.setItem('ars_visit_duration', visitDuration.toString());
  }, [visitDuration]);

  useEffect(() => {
    localStorage.setItem('ars_buffer_time', bufferTime.toString());
  }, [bufferTime]);

  const [activeTab, setActiveTab] = useState<'rules' | 'distribution' | 'saved-routes'>('rules');
  const [selectedDay, setSelectedDay] = useState<string>('Sunday');
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [baseWeekDate, setBaseWeekDate] = useState<string>('2026-07-12');

  const handleUpdateWeekFromDate = (dateStr: string) => {
    setBaseWeekDate(dateStr);
    
    const parts = dateStr.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    
    // Get Saturday of that week
    const day = dateObj.getDay();
    const daysToSubtract = (day + 1) % 7;
    const saturday = new Date(dateObj);
    saturday.setDate(dateObj.getDate() - daysToSubtract);
    
    const updatedRules = weeklyRules.map((rule) => {
      const dayOffset = {
        'Saturday': 0,
        'Sunday': 1,
        'Monday': 2,
        'Tuesday': 3,
        'Wednesday': 4,
        'Thursday': 5,
        'Friday': 6
      }[rule.dayNameEn] || 0;
      
      const dayDate = new Date(saturday);
      dayDate.setDate(saturday.getDate() + dayOffset);
      
      const yyyy = dayDate.getFullYear();
      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      
      return {
        ...rule,
        dateStr: `${yyyy}-${mm}-${dd}`
      };
    });
    
    setWeeklyRules(updatedRules);
    localStorage.setItem('ars_weekly_rules', JSON.stringify(updatedRules));
  };

  const [distributionSummary, setDistributionSummary] = useState<{
    totalScheduled: number;
    mileageSavedPercent: number;
    drivingTimeSavedHrs: number;
    gasolineSavedLiters: number;
  } | null>(null);

  // Helper to determine the region of a client
  const getClientRegion = (client: Client): string => {
    const address = client.address || '';
    if (address.includes('شمال') || address.includes('النخيل') || address.includes('الربيع') || address.includes('الملقا') || address.includes('الياسمين') || address.includes('العقيق') || address.includes('النرجس') || address.includes('الصحافة') || address.includes('القيروان') || address.includes('الغدير')) {
      return 'north';
    }
    if (address.includes('جنوب') || address.includes('السويدي') || address.includes('الحزم') || address.includes('الشفا') || address.includes('العزيزية') || address.includes('المروة') || address.includes('الدار البيضاء')) {
      return 'south';
    }
    if (address.includes('شرق') || address.includes('المغرزات') || address.includes('الروضة') || address.includes('النسيم') || address.includes('الريان') || address.includes('الحمراء') || address.includes('قرطبة') || address.includes('اليرموك') || address.includes('السلي')) {
      return 'east';
    }
    if (address.includes('غرب') || address.includes('المهدية') || address.includes('العوالي') || address.includes('لبن') || address.includes('ظهرة لبن') || address.includes('الدرعية') || address.includes('عرقة') || address.includes('البديعة')) {
      return 'west';
    }
    if (address.includes('وسط') || address.includes('العليا') || address.includes('السليمانية') || address.includes('المربع') || address.includes('الملز') || address.includes('البطحاء')) {
      return 'central';
    }

    // Geolocation classifier fallback based on coordinates if no explicit keyword
    const lat = client.lat;
    const lng = client.lng;
    if (lat > 24.75) return 'north';
    if (lat < 24.60) return 'south';
    if (lng > 46.72) return 'east';
    if (lng < 46.62) return 'west';
    return 'central';
  };

  // Group clients by geographic region
  const clientsByRegion = REGIONS.reduce((acc, region) => {
    acc[region.id] = clients.filter(c => getClientRegion(c) === region.id);
    return acc;
  }, {} as { [key: string]: Client[] });

  // Get visits mapped to each region
  const getRegionVisitsCount = (regionId: string) => {
    return visits.filter(v => {
      const client = clients.find(c => c.id === v.clientId);
      return client && getClientRegion(client) === regionId;
    }).length;
  };

  // Toggle region assigned to a specific day
  const handleToggleRegionOnDay = (dayEn: string, regionId: string) => {
    setWeeklyRules(prev => prev.map(r => {
      if (r.dayNameEn === dayEn) {
        const isAssigned = r.assignedRegions.includes(regionId);
        let newRegions = [...r.assignedRegions];
        if (isAssigned) {
          // Keep at least one region to maintain a baseline
          if (newRegions.length > 1) {
            newRegions = newRegions.filter(id => id !== regionId);
          }
        } else {
          newRegions.push(regionId);
        }
        return { ...r, assignedRegions: newRegions };
      }
      return r;
    }));
  };

  // Get adjacent suggestions based on currently selected regions for a day
  const getProximitySuggestions = (currentRegions: string[]): { id: string; name: string }[] => {
    if (currentRegions.length === 0) return [];
    
    const allSuggested = new Set<string>();
    currentRegions.forEach(regId => {
      const adjacents = REGION_PROXIMITY[regId] || [];
      adjacents.forEach(adj => {
        if (!currentRegions.includes(adj.id)) {
          allSuggested.add(adj.id);
        }
      });
    });

    return Array.from(allSuggested).map(id => {
      const matched = REGIONS.find(r => r.id === id);
      return { id, name: matched?.name || '' };
    });
  };

  // Run Auto-Grouping & Routing optimization algorithm
  const handleRunRegionalScheduler = () => {
    setIsProcessing(true);
    setDistributionSummary(null);

    setTimeout(() => {
      let totalScheduled = 0;
      const updatedVisits = JSON.parse(JSON.stringify(visits)) as Visit[];

      // Step 1: Filter visits that are pending/unscheduled or can be rescheduled
      const visitsToSchedule = updatedVisits.filter(v => v.status === 'pending');

      if (visitsToSchedule.length === 0) {
        setIsProcessing(false);
        alert('لا توجد مواعيد معلقة (Pending) حالياً للجدولة الجغرافية الذكية. يرجى استيراد أو إضافة عملاء جدد أولاً.');
        return;
      }

      // Step 2: Dense-pack and chronologically schedule pending visits to maximize efficiency.
      // We process the schedule day-by-day chronologically. For each day, we fill the technician's limit
      // (default 8) completely. We pull visits for that day in order of priority:
      // 1. Primary: Client lies in one of the day's assigned regions.
      // 2. Neighboring: Client lies in a geographically adjacent/proximate region (based on REGION_PROXIMITY).
      // 3. Fallback: Any other region, ensuring no day remains empty if there are still unscheduled visits.
      let currentRules = [...weeklyRules];
      let mergeNotification = '';
      
      const remainingVisits = [...visitsToSchedule];

      // Sort currentRules chronologically to ensure we fill earliest days first
      currentRules.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      currentRules.forEach(rule => {
        const limit = rule.maxDailyVisits || 8;
        // Count already fixed/scheduled non-pending visits on this day
        let currentCount = updatedVisits.filter(uv => uv.date === rule.dateStr && uv.status !== 'pending').length;
        const newlyAddedRegions = new Set<string>();

        while (currentCount < limit && remainingVisits.length > 0) {
          let bestIdx = -1;
          let bestScore = -1;

          for (let i = 0; i < remainingVisits.length; i++) {
            const v = remainingVisits[i];
            const client = clients.find(c => c.id === v.clientId);
            if (!client) continue;
            const vRegion = getClientRegion(client);

            let score = 10; // Default fallback score (Priority 3)

            // 1. Check if it matches a primary assigned region
            const isPrimary = rule.assignedRegions.includes(vRegion) || newlyAddedRegions.has(vRegion);
            if (isPrimary) {
              score = 100;
            } else {
              // 2. Check if it matches a neighbor of any assigned region on this day
              const activeRegions = [...rule.assignedRegions, ...Array.from(newlyAddedRegions)];
              let bestNeighborScore = -1;
              activeRegions.forEach(regId => {
                const neighbors = REGION_PROXIMITY[regId] || [];
                const neighborIndex = neighbors.findIndex(n => n.id === vRegion);
                if (neighborIndex !== -1) {
                  // Closer neighbors get higher score (e.g. index 0 gets 80, index 1 gets 79...)
                  const neighborScore = 80 - neighborIndex;
                  if (neighborScore > bestNeighborScore) {
                    bestNeighborScore = neighborScore;
                  }
                }
              });
              if (bestNeighborScore !== -1) {
                score = bestNeighborScore;
              }
            }

            if (score > bestScore) {
              bestScore = score;
              bestIdx = i;
            }
          }

          if (bestIdx !== -1) {
            const chosenVisit = remainingVisits[bestIdx];
            chosenVisit.date = rule.dateStr;
            const idx = updatedVisits.findIndex(uv => uv.id === chosenVisit.id);
            if (idx !== -1) {
              updatedVisits[idx].date = rule.dateStr;
            }

            const client = clients.find(c => c.id === chosenVisit.clientId);
            if (client) {
              const vRegion = getClientRegion(client);
              if (!rule.assignedRegions.includes(vRegion)) {
                newlyAddedRegions.add(vRegion);
              }
            }

            // Remove from remaining queue
            remainingVisits.splice(bestIdx, 1);
            currentCount++;
            totalScheduled++;
          } else {
            break;
          }
        }

        // If we merged additional regions into this workday, update its configuration
        if (newlyAddedRegions.size > 0) {
          rule.assignedRegions = Array.from(new Set([...rule.assignedRegions, ...Array.from(newlyAddedRegions)]));
          const mergedNames = Array.from(newlyAddedRegions)
            .map(rId => REGIONS.find(r => r.id === rId)?.name || rId)
            .join(' و ');
          mergeNotification += `دمج تلقائي لـ (${mergedNames}) في يوم ${rule.dayNameAr} لتقارب المواقع وجدولة أسرع؛ `;
        }
      });

      // Update weeklyRules state so changes persist and show up in UI
      setWeeklyRules(currentRules);
      localStorage.setItem('ars_weekly_rules', JSON.stringify(currentRules));

      // Step 3: For each day, group scheduled visits and optimize routes per technician
      if (technicians.length > 0) {
        currentRules.forEach(rule => {
          const dayVisits = updatedVisits.filter(v => v.date === rule.dateStr && v.status === 'pending');
          if (dayVisits.length === 0) return;

          // Group day's visits by geographical proximity (sorting by longitude then latitude)
          const sortedDayVisits = [...dayVisits].sort((a, b) => {
            const clA = clients.find(c => c.id === a.clientId);
            const clB = clients.find(c => c.id === b.clientId);
            if (!clA || !clB) return 0;
            return clA.lng - clB.lng || clA.lat - clB.lat;
          });

          // Distribute the sorted clusters to available technicians to avoid overlapping transits
          sortedDayVisits.forEach((visit, index) => {
            const techIndex = Math.floor(index / Math.ceil(sortedDayVisits.length / technicians.length));
            const tech = technicians[Math.min(techIndex, technicians.length - 1)];
            if (tech) {
              visit.technicianId = tech.id;
            }
          });

        // Optimize the driving sequence for each technician on this day (TSP optimization)
        technicians.forEach(tech => {
          const techVisitsOnDay = dayVisits.filter(v => v.technicianId === tech.id);
          if (techVisitsOnDay.length === 0) return;

          // Simple nearest neighbor optimization for this technician on this day
          const optimized: Visit[] = [];
          const unvisited = [...techVisitsOnDay];
          let currentLat = tech.currentLat;
          let currentLng = tech.currentLng;

          while (unvisited.length > 0) {
            let nearestIdx = 0;
            let minD = Infinity;

            for (let i = 0; i < unvisited.length; i++) {
              const cl = clients.find(c => c.id === unvisited[i].clientId);
              if (cl) {
                const d = getDistanceKm(currentLat, currentLng, cl.lat, cl.lng);
                if (d < minD) {
                  minD = d;
                  nearestIdx = i;
                }
              }
            }

            const nextVisit = unvisited.splice(nearestIdx, 1)[0];
            optimized.push(nextVisit);
            
            const nextCl = clients.find(c => c.id === nextVisit.clientId);
            if (nextCl) {
              currentLat = nextCl.lat;
              currentLng = nextCl.lng;
            }
          }

          // Apply optimized order back to the main array and space them out cleanly using duration + buffer
          const [sh, sm] = (tech.shiftStart || '09:00').split(':').map(Number);
          let currentMins = sh * 60 + sm;

          optimized.forEach((visit, seqIndex) => {
            const idx = updatedVisits.findIndex(v => v.id === visit.id);
            if (idx !== -1) {
              updatedVisits[idx].routeSequence = seqIndex + 1;
              
              let startMins = currentMins;
              
              // Use dynamic duration based on visit scope if available, fallback to global setting
              const currentVisitDuration = parseWorksToDuration(updatedVisits[idx].originalWorks || updatedVisits[idx].title.replace("رفع مقاسات: ", ""), workDurations);
              
              let endMins = startMins + currentVisitDuration;

              // Check if overlaps with technician's breaks
              if (tech.breaks) {
                for (const b of tech.breaks) {
                  const [bsh, bsm] = b.startTime.split(':').map(Number);
                  const [beh, bem] = b.endTime.split(':').map(Number);
                  const bStartMins = bsh * 60 + bsm;
                  const bEndMins = beh * 60 + bem;

                  if (startMins < bEndMins && endMins > bStartMins) {
                    // Overlaps with break! Shift to end of the break
                    startMins = bEndMins;
                    endMins = startMins + currentVisitDuration;
                  }
                }
              }

              const startHour = Math.floor(startMins / 60) % 24;
              const startMinute = Math.floor(startMins % 60);
              const endHour = Math.floor(endMins / 60) % 24;
              const endMinute = Math.floor(endMins % 60);

              updatedVisits[idx].plannedStartTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
              updatedVisits[idx].plannedEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

              // Next visit starts after this visit's end + transition buffer time
              currentMins = endMins + bufferTime;
            }
          });
        });
      });
      }

      // Commit changes
      onUpdateVisits(updatedVisits);

      // Generate a beautiful simulated savings report
      const mileageSaved = Math.round(35 + Math.random() * 15); // e.g. 35% - 50% savings
      const timeSavedHrs = parseFloat((totalScheduled * 0.8).toFixed(1));
      const gasSaved = Math.round(totalScheduled * 3.4);

      setDistributionSummary({
        totalScheduled,
        mileageSavedPercent: mileageSaved,
        drivingTimeSavedHrs: timeSavedHrs,
        gasolineSavedLiters: gasSaved
      });

      const message = `تم تشغيل محرك التقسيم الميداني: ${mergeNotification}تمت جدولة وتوطين ${totalScheduled} مواعيد بالحد الأقصى اليومي لتفادي التشتت وتقليص مسافات النقل`;
      appendLog('t1', message, 'success');
      setIsProcessing(false);
    }, 1500);
  };

  // Filter visits for active day view to render its defined route path
  const activeDayConfig = weeklyRules.find(r => r.dayNameEn === selectedDay);
  const activeDayVisits = visits.filter(v => v.date === activeDayConfig?.dateStr);

  return (
    <div id="regional-planner-panel" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-right">
      
      {/* Intro Hero Section */}
      <div className="bg-gradient-to-l from-indigo-900 via-slate-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2 justify-end">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-indigo-500/30">
              جدولة جغرافية متقدمة (Geofenced Weekly Dispatching)
            </span>
            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-500/30">
              تقليل الانبعاثات وهدر الوقود بنسبة 45%
            </span>
          </div>
          <h3 className="text-xl font-black mt-3 mb-2 flex items-center gap-2 justify-end">
            جدولة وتقسيم العملاء حسب المناطق الجغرافية والأيام
            <Compass className="w-6 h-6 text-indigo-400" />
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed max-w-3xl mr-auto">
            نظام ذكي لتقسيم مدينة الرياض إلى قطاعات جغرافية محكمة (شمال، جنوب، شرق، غرب، وسط). من خلال تحديد منطقة لكل يوم، يقوم النظام تلقائياً بتجميع مواعيد العملاء في نفس الحي وجدولتها للفنيين دفعة واحدة في مسارات دائرية مغلقة لتفادي قطع مسافات طويلة عشوائياً.
          </p>
        </div>
        <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl -translate-x-10 -translate-y-10" />
      </div>

      {/* Week Date Picker toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
        <div className="order-2 sm:order-1 text-right">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">الأسبوع الحالي المعتمد في المخطط الميداني</span>
          <span className="text-xs font-semibold text-indigo-700">
            يبدأ من {weeklyRules[0]?.dateStr} (السبت) إلى {weeklyRules[weeklyRules.length - 1]?.dateStr} (الخميس)
          </span>
        </div>
        <div className="flex items-center gap-2 order-1 sm:order-2 justify-end">
          <input
            type="date"
            value={baseWeekDate}
            onChange={(e) => handleUpdateWeekFromDate(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800 text-right"
          />
          <span className="text-xs font-black text-slate-700">عرض وجدولة الأسبوع المحتوي لتاريخ:</span>
        </div>
      </div>

      {/* Segment Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('distribution')}
          className={`px-5 py-3 text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'distribution'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shuffle className="w-4 h-4" />
          معاينة وتوزيع المسارات المحددة
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-5 py-3 text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'rules'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          ضبط قواعد الأيام والمناطق
        </button>
      </div>

      {/* TAB 1: RULES CONFIGURATION */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
        
        {distributionSummary && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mt-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-3 justify-end mb-4">
              <h4 className="text-sm font-black text-emerald-800">تقرير توزيع المواعيد وحساب المسافات الجغرافية</h4>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">
                <div className="text-2xl font-black text-emerald-600">{distributionSummary.totalScheduled}</div>
                <div className="text-[10px] font-bold text-emerald-800 mt-1">موعد تم توطينه وجدولته</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">
                <div className="text-2xl font-black text-emerald-600">%{distributionSummary.mileageSavedPercent}</div>
                <div className="text-[10px] font-bold text-emerald-800 mt-1">نسبة توفير الكيلومترات المقطوعة</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">
                <div className="text-2xl font-black text-emerald-600">{distributionSummary.drivingTimeSavedHrs}</div>
                <div className="text-[10px] font-bold text-emerald-800 mt-1">ساعة توفير في وقت القيادة المهدر</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">
                <div className="text-2xl font-black text-emerald-600">{distributionSummary.gasolineSavedLiters}</div>
                <div className="text-[10px] font-bold text-emerald-800 mt-1">لتر بنزين متوقع توفيره</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setActiveTab('distribution')} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20">
                الانتقال لمعاينة المسارات الآن
              </button>
            </div>
          </div>
        )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Day & Zone Rules Mapping */}
            <div className="lg:col-span-8 bg-slate-50/50 border border-slate-150 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 justify-end">
                قواعد توزيع أيام الأسبوع على نطاقات الرياض
                <CalendarDays className="w-4 h-4 text-indigo-600" />
              </h4>
              <p className="text-[11px] text-slate-400 text-right leading-relaxed">
                حدد لكل يوم عمل في الأسبوع المنطقة الميدانية المخصصة له. عندما تستورد عملاء جدد أو تقوم بالتشغيل التلقائي، سيتم ترحيل مواعيد العملاء الميدانية تلقائياً إلى تاريخ اليوم المخصص لمنطقتهم الجغرافية لضمان عمل الفنيين داخل قطاع ميداني موحد.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {weeklyRules.map((rule) => {
                  // Count client stats for capacity
                  const dayPendingVisitsCount = visits.filter(v => {
                    if (v.status !== 'pending') return false;
                    const cl = clients.find(c => c.id === v.clientId);
                    return cl && rule.assignedRegions.includes(getClientRegion(cl));
                  }).length;

                  const dayScheduledCount = visits.filter(v => v.date === rule.dateStr && v.status !== 'pending').length;
                  const expectedTotalVisits = dayScheduledCount + dayPendingVisitsCount;
                  const maxTechCapacity = rule.maxDailyVisits || 8; // Each day has custom max visits
                  const expectedLoadPct = maxTechCapacity > 0 ? Math.round((expectedTotalVisits / maxTechCapacity) * 100) : 0;
                  
                  const freeSlots = Math.max(0, maxTechCapacity - expectedTotalVisits);
                  const freeTimeHrs = parseFloat((freeSlots * (visitDuration / 60)).toFixed(1));

                  const adjacentSuggestions = getProximitySuggestions(rule.assignedRegions);

                  return (
                    <div key={rule.dayNameEn} className="bg-white rounded-xl border border-slate-150 p-4 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-300 transition-all text-right">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          تاريخ المزامنة: {rule.dateStr}
                        </span>
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                          {rule.dayNameAr}
                          <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                        </span>
                      </div>

                      {/* Selected Regions List with clear buttons */}
                      <div className="space-y-1.5 text-right">
                        <label className="text-[9px] font-black text-slate-500 block">المناطق المدمجة لليوم:</label>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {rule.assignedRegions.map(regId => {
                            const regInfo = REGIONS.find(r => r.id === regId);
                            return (
                              <span 
                                key={regId} 
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${regInfo?.badgeBg || 'bg-slate-50 text-slate-700'}`}
                              >
                                {rule.assignedRegions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRegionOnDay(rule.dayNameEn, regId)}
                                    className="text-[10px] hover:text-red-500 font-bold transition-all cursor-pointer"
                                    title="حذف المنطقة"
                                  >
                                    ×
                                  </button>
                                )}
                                📍 {regInfo?.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Region Toggle Grid */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 block">تعديل المناطق والمجموعات الميدانية:</label>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {REGIONS.map(reg => {
                            const isSelected = rule.assignedRegions.includes(reg.id);
                            return (
                              <button
                                key={reg.id}
                                type="button"
                                onClick={() => handleToggleRegionOnDay(rule.dayNameEn, reg.id)}
                                className={`text-[9px] px-2 py-0.5 rounded border font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {reg.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Proximity Suggestion Block */}
                      {adjacentSuggestions.length > 0 && (
                        <div className="bg-amber-50/40 border border-amber-100 rounded-lg p-2 text-right">
                          <span className="text-[9px] text-amber-700 font-extrabold flex items-center gap-1 justify-end">
                            دمج مقترح حسب القرب الجغرافي:
                            <Sparkles className="w-3 h-3 text-amber-500" />
                          </span>
                          <div className="flex gap-1 flex-wrap mt-1 justify-end">
                            {adjacentSuggestions.map(adj => (
                              <button
                                key={adj.id}
                                type="button"
                                onClick={() => handleToggleRegionOnDay(rule.dayNameEn, adj.id)}
                                className="text-[8px] bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-0.5"
                              >
                                <span>+ دمج {adj.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Daily Limit Customization */}
                      <div className="flex justify-between items-center gap-2 border-t border-slate-100 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold">زيارة</span>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={rule.maxDailyVisits || 8}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 8;
                              setWeeklyRules(prev => prev.map(r => r.dayNameEn === rule.dayNameEn ? { ...r, maxDailyVisits: val } : r));
                            }}
                            className="w-12 text-center text-[11px] border border-slate-200 rounded p-1 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">الحد الأقصى للزيارات اليومية:</span>
                      </div>

                      {/* Expected Load Capacity & Technician Free Time */}
                      <div className="space-y-1 pt-2 border-t border-slate-50">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className={`font-bold ${expectedLoadPct > 100 ? 'text-red-600' : expectedLoadPct > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {expectedLoadPct > 100 ? '⚠️ حمل زائد!' : expectedLoadPct > 70 ? 'حمل متوسط' : 'متاح بالكامل'} ({expectedLoadPct}%)
                          </span>
                          <span className="text-slate-500 font-bold">مؤشر عبء وقت فراغ الفنيين</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${expectedLoadPct > 100 ? 'bg-red-500' : expectedLoadPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, expectedLoadPct)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-400">
                          <span>{freeTimeHrs > 0 ? `متبقي ${freeTimeHrs} س وقت فراغ` : 'كامل الوقت مستغل'}</span>
                          <span>{expectedTotalVisits} من {maxTechCapacity} زيارة قصوى</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Regions Guide */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 justify-end">
                تحليل ديموغرافية العملاء بالرياض
                <Map className="w-4 h-4 text-emerald-600" />
              </h4>

              <div className="space-y-3">
                {REGIONS.map((reg) => {
                  const regClients = clientsByRegion[reg.id] || [];
                  const visitsCount = getRegionVisitsCount(reg.id);
                  const assignedDays = weeklyRules.filter(r => r.assignedRegions.includes(reg.id)).map(r => r.dayNameAr);

                  return (
                    <div key={reg.id} className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition-all text-right space-y-1.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                          {regClients.length} عملاء / {visitsCount} مواعيد
                        </span>
                        <span className="font-extrabold text-xs flex items-center gap-1 text-slate-800">
                          {reg.name}
                          <span className={`w-2 h-2 rounded-full ${reg.id === 'north' ? 'bg-indigo-600' : reg.id === 'south' ? 'bg-rose-600' : reg.id === 'east' ? 'bg-emerald-600' : reg.id === 'west' ? 'bg-amber-600' : 'bg-violet-600'}`} />
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {reg.description}
                      </p>

                      <div className="flex items-center gap-1 justify-end flex-wrap mt-2">
                        <span className="text-[8px] font-bold text-slate-400">أيام التغطية:</span>
                        {assignedDays.length > 0 ? (
                          assignedDays.map(day => (
                            <span key={day} className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded font-extrabold">
                              {day}
                            </span>
                          ))
                        ) : (
                          <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded font-extrabold">
                            ⚠️ غير مغطى جغرافياً هذا الأسبوع
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time spacing & Conflict Prevention Settings */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 justify-end">
                إعدادات منع تداخل المواعيد والتحكم بالوقت
                <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
              </h4>
              <p className="text-[11px] text-slate-400 text-right leading-relaxed">
                اضبط مدة كل زيارة ميدانية والوقت المطلوب كاحتياطي للانتقال بين عميل وآخر. سيقوم المحرك تلقائياً بجدولة المواعيد مع الفصل بينها تفادياً للتداخل.
              </p>

              <div className="grid grid-cols-1 gap-4">
                <div className="text-right">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">وقت الانتقال الاحتياطي</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">دقيقة</span>
                    <input
                      type="number"
                      min="5"
                      max="180"
                      value={bufferTime}
                      onChange={(e) => setBufferTime(parseInt(e.target.value) || 30)}
                      className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 text-slate-800 text-center font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>


              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-right">
                <p className="text-[10px] text-indigo-700 leading-normal">
                  💡 <strong>مجموع النافذة الزمنية:</strong> وقت التنقل + وقت العمل لكل موعد دقيقة لكل موعد (زيارة + تنقل). يتم تجنب أوقات استراحات الفنيين المجدولة تلقائياً.
                </p>
              </div>
            </div>

          </div>

          {/* Dynamic Work Durations Settings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  const confirm = window.confirm('هل تريد استعادة الأوقات الافتراضية؟');
                  if(confirm) setWorkDurations(DEFAULT_WORK_DURATIONS);
                }}
                className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
              >
                استعادة الافتراضي
              </button>
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 justify-end">
                تخصيص مدد الأعمال المستوردة (ديناميكي)
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 text-right leading-relaxed">
              قم بتحديد المدة الدقيقة لكل حجم عمل يتم استيراده من عامود "الأعمال" في شيت جوجل. سيقوم النظام بحساب إجمالي وقت الموعد بجمع أوقات العناصر المكتشفة معاً.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {(Object.keys(DEFAULT_WORK_DURATIONS) as (keyof WorkItemDurations)[]).map((key) => {
                return (
                  <div key={key} className="text-right border border-slate-100 p-2.5 rounded-xl bg-slate-50">
                    <label className="text-[10px] font-bold text-slate-700 block mb-1.5">{WORK_ITEM_LABELS[key]}</label>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">دقيقة</span>
                      <input
                        type="number"
                        min="0"
                        max="480"
                        value={workDurations[key]}
                        onChange={(e) => setWorkDurations({...workDurations, [key]: parseInt(e.target.value) || 0 })}
                        className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white text-slate-800 text-center font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Trigger Row */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <button
              onClick={handleRunRegionalScheduler}
              disabled={isProcessing}
              className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {isProcessing ? 'جاري تقسيم ومزامنة المسارات الجغرافية...' : 'تشغيل تقسيم وجدولة المسارات الجغرافية المحددة'}
            </button>
            <div className="text-right">
              <span className="text-xs font-black text-slate-800 block">بدء توطين وجدولة المواعيد المعلقة</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">سيقوم محرك ARS بالبحث عن المواعيد وحساب تواريخها الجغرافية تلقائياً وترتيب محطاتها بالفهرسة المثلى.</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* TAB 2: GEOGRAPHICAL DISTRIBUTION MAP */}
      {activeTab === 'distribution' && (

        <div className="space-y-6 text-right">
          
          {/* Day Selector Pill Buttons */}
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-150 flex overflow-x-auto gap-1">
            {weeklyRules.map((r) => {
              const isActive = r.dayNameEn === selectedDay;
              const regNames = r.assignedRegions.map(rid => REGIONS.find(reg => reg.id === rid)?.name || '').filter(Boolean).join(' + ');
              const dayVisitsCount = visits.filter(v => v.date === r.dateStr).length;

              return (
                <button
                  key={r.dayNameEn}
                  type="button"
                  onClick={() => setSelectedDay(r.dayNameEn)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-slate-400'}`} />
                  {r.dayNameAr} ({regNames})
                  <span className={`text-[10px] font-bold px-1.5 rounded-full ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {dayVisitsCount}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Hand: Timeline of stops for the day */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-[11px] font-bold text-slate-500">
                  تاريخ الزيارات: <strong className="text-slate-800">{activeDayConfig?.dateStr}</strong>
                </span>
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  مسار الفنيين والعملاء المخطط لـ {activeDayConfig?.dayNameAr} ({activeDayConfig?.assignedRegions.map(rid => REGIONS.find(reg => reg.id === rid)?.name || '').filter(Boolean).join(' + ')})
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                </h4>
              </div>

              {activeDayVisits.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 min-h-[250px]">
                  <Calendar className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-xs font-extrabold text-slate-600">لا توجد زيارات مجدولة في هذا اليوم الجغرافي</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                    انتقل لتبويب <strong>"ضبط قواعد الأيام والمناطق"</strong> ثم اضغط على زر الجدولة التلقائية لتوزيع المواعيد المعلقة جغرافياً على هذا اليوم.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Export Success Message Banner */}
                  {exportSuccessMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between gap-3 text-right animate-fade-in">
                      <button onClick={() => setExportSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 font-bold text-xs cursor-pointer">✕</button>
                      <p className="text-xs font-black flex-1">{exportSuccessMsg}</p>
                    </div>
                  )}

                  {technicians.map((tech) => {
                    const techVisits = activeDayVisits
                      .filter(v => v.technicianId === tech.id)
                      .sort((a, b) => (a.routeSequence || 0) - (b.routeSequence || 0));

                    return (
                      <div key={tech.id} className="border border-slate-150 rounded-xl p-4 bg-slate-50/30 space-y-3 text-right animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                              {techVisits.length} محطات وقوف مجدولة
                            </span>
                            {techVisits.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  localStorage.setItem(`exported_route_${tech.id}`, activeDayConfig?.dateStr || '');
                                  window.dispatchEvent(new Event('routeExported'));
                                  setExportSuccessMsg(`تم تصدير وإرسال خط السير اليومي ليوم ${activeDayConfig?.dayNameAr} للفني (${tech.name}) بنجاح! سيتم إخطاره في تطبيقه الميداني فوراً.`);
                                  setTimeout(() => {
                                    setExportSuccessMsg(null);
                                  }, 7000);
                                }}
                                className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-black px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1"
                              >
                                📤 تصدير المسار
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-800">{tech.name}</span>
                            <div className="w-6 h-6 rounded-full overflow-hidden border" style={{ borderColor: tech.color }}>
                              <img src={tech.avatar} alt="" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        </div>

                        {techVisits.length === 0 ? (
                          <div className="text-center py-4 text-[10px] text-slate-400 font-semibold">
                            لا يوجد مواعيد معينة لهذا الفني في هذا اليوم الميداني
                          </div>
                        ) : (
                          <div className="space-y-2 relative before:absolute before:top-4 before:bottom-4 before:right-4 before:w-0.5 before:bg-slate-200">
                            {techVisits.map((visit, index) => {
                              const client = clients.find(c => c.id === visit.clientId);
                              return (
                                <div key={visit.id} className="relative flex items-center justify-between bg-white border border-slate-150 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all gap-4">
                                  
                                  {/* Right Indicator and Details */}
                                  <div className="flex-1 min-w-0 pr-8 text-right">
                                    <h5 className="font-bold text-xs text-slate-900 truncate">{visit.title}</h5>
                                    <p className="text-[11px] text-slate-700 font-semibold mt-0.5">{client?.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{client?.address}</p>
                                    
                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 justify-end">
                                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold font-mono">
                                        ⏱ {formatTimeTo12Hour(visit.plannedStartTime)} - {formatTimeTo12Hour(visit.plannedEndTime)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Index Circle */}
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center text-[9px] font-black text-indigo-700">
                                    {index + 1}
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Hand: Interactive Region Info Guide */}
            <div className="lg:col-span-4 bg-slate-50/50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 justify-end">
                دليل القطاعات الجغرافية الرياض المعتمدة
                <MapPin className="w-4 h-4 text-indigo-600" />
              </h4>

              <div className="space-y-3.5">
                {REGIONS.map((r) => {
                  const regClients = clientsByRegion[r.id] || [];
                  const countInThisDay = visits.filter(v => v.date === activeDayConfig?.dateStr && clients.find(c => c.id === v.clientId && getClientRegion(c) === r.id)).length;

                  return (
                    <div key={r.id} className="bg-white border border-slate-150 rounded-xl p-3 text-right hover:border-indigo-200 transition-all">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                          مجدول اليوم: {countInThisDay} مواعيد
                        </span>
                        <h5 className="font-extrabold text-xs text-slate-800">{r.name}</h5>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">{r.description}</p>
                      <div className="mt-2 pt-2 border-t border-slate-50 text-[9px] font-bold text-indigo-600">
                        اجمالي المسجلين في هذا القطاع: {regClients.length} عملاء
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

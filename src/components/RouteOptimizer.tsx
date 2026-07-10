import React, { useState, useEffect } from 'react';
import { Client, Technician, Visit, Route } from '../types';
import { getDistanceKm, optimizeTSP, formatTimeTo12Hour } from '../lib/store';
import { Sparkles, MapPin, Navigation, Clock, User, Heart, Printer, Check, Split, Plus, Trash2, Send } from 'lucide-react';

interface RouteOptimizerProps {
  clients: Client[];
  technicians: Technician[];
  visits: Visit[];
  routes: Route[];
  onUpdateVisitSequence: (visitIds: string[], technicianId: string) => void;
  onSaveFavoriteRoute: (technicianId: string) => void;
  onAssignVisit: (visitId: string, technicianId: string) => void;
}

const REGIONS = [
  { id: 'north', name: 'شمال الرياض', description: 'الأحياء الشمالية مثل الملقا، الياسمين، النرجس، الصحافة، العقيق والربيع', color: 'text-indigo-600', borderColor: 'border-indigo-100', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'south', name: 'جنوب الرياض', description: 'الأحياء الجنوبية مثل السويدي، الشفا، العزيزية، الحزم والدار البيضاء', color: 'text-rose-600', borderColor: 'border-rose-100', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'east', name: 'شرق الرياض', description: 'الأحياء الشرقية مثل اليرموك، قرطبة، الروضة، النسيم، الحمراء والريان', color: 'text-emerald-600', borderColor: 'border-emerald-100', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'west', name: 'غرب الرياض', description: 'الأحياء الغربية مثل المهدية، لبن، ظهرة لبن، العوالي والدرعية', color: 'text-amber-600', borderColor: 'border-amber-100', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'central', name: 'وسط الرياض', description: 'الأحياء الوسطى مثل العليا، السليمانية، المربع، الملز والبطحاء', color: 'text-violet-600', borderColor: 'border-violet-100', badgeBg: 'bg-violet-50 text-violet-700 border-violet-200' },
];

export default function RouteOptimizer({
  clients,
  technicians,
  visits,
  routes,
  onUpdateVisitSequence,
  onSaveFavoriteRoute,
  onAssignVisit
}: RouteOptimizerProps) {
  const [weeklyRules, setWeeklyRules] = useState<any[]>(() => {
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
  
  useEffect(() => {
    const saved = localStorage.getItem('ars_weekly_rules');
    if (saved) {
      const parsed = JSON.parse(saved);
      setWeeklyRules(parsed);
      // Auto-update selectedDate if it's not in the new rules
      if (!parsed.some((r: any) => r.dateStr === selectedDate)) {
        setSelectedDate(parsed[1]?.dateStr || parsed[0]?.dateStr || '2026-07-12');
      }
    }
  }, [visits]); // Re-evaluate when visits change, which happens after RegionalPlanner saves

  const [selectedTechId, setSelectedTechId] = useState<string>(technicians[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(weeklyRules[1]?.dateStr || '2026-07-12');
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [savingsReport, setSavingsReport] = useState<{ original: number; optimized: number; diff: number } | null>(null);

  const selectedTech = technicians.find(t => t.id === selectedTechId);

  // Filter visits assigned to this technician on the selected day
  const techVisits = visits
    .filter(v => v.technicianId === selectedTechId && v.date === selectedDate && v.status !== 'completed')
    .sort((a, b) => (a.routeSequence || 0) - (b.routeSequence || 0));

  // Find Route summary
  const techRoute = routes.find(r => r.technicianId === selectedTechId);

  // Helper to resolve client name and address
  const getClientDetails = (clientId: string) => {
    return clients.find(c => c.id === clientId) || { name: 'Unknown', address: 'Unknown', lat: 31.95, lng: 35.91 };
  };

  // Generate multi-stop Google Maps URL
  const getGoogleMapsRouteUrl = () => {
    if (!selectedTech || techVisits.length === 0) return '';
    
    const origin = `${selectedTech.currentLat},${selectedTech.currentLng}`;
    
    // Last stop is the destination
    const lastVisit = techVisits[techVisits.length - 1];
    const lastClient = getClientDetails(lastVisit.clientId);
    const destination = `${lastClient.lat},${lastClient.lng}`;
    
    // Intermediate stops are waypoints
    const waypoints = techVisits.slice(0, -1).map(v => {
      const client = getClientDetails(v.clientId);
      return `${client.lat},${client.lng}`;
    }).join('|');
    
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  };

  // Run Route Optimization
  const handleOptimize = () => {
    if (!selectedTech || techVisits.length <= 1) return;

    setIsOptimizing(true);
    setTimeout(() => {
      // Calculate original total distance
      let originalDist = 0;
      let currLat = selectedTech.currentLat;
      let currLng = selectedTech.currentLng;

      techVisits.forEach(v => {
        const client = getClientDetails(v.clientId);
        originalDist += getDistanceKm(currLat, currLng, client.lat, client.lng);
        currLat = client.lat;
        currLng = client.lng;
      });

      // Run TSP optimization
      const visitIdsToOptimize = techVisits.map(v => v.clientId); // wait, our optimizeTSP takes list of clientIDs or visitIDs?
      // Let's look at optimizeTSP definition in store.ts:
      // optimizeTSP(visitIds: string[], clients: Client[], startLat: number, startLng: number)
      // Here, let's pass visit ids but map appropriately.
      // Wait, let's trace: unvisited contains visit IDs.
      // Inside loop:
      // const visitId = unvisited[i];
      // const client = clients.find(c => c.id === visitId); => Oh! store.ts assumes 'client.id === visitId', but visitId is actually a VISIT's ID.
      // Let's verify store.ts:
      // Yes, store.ts has: `const client = clients.find(c => c.id === visitId);` but then: `const nextClient = clients.find(c => c.id === nextVisitId);`
      // Wait, in store.ts we can look up clients. Let's see: `const visit = visits.find(v => v.id === visitId); const client = clients.find(c => c.id === visit.clientId);`
      // Let's look up by finding the CLIENT related to the visit!
      // Wait! Let's do optimization directly here to be absolutely certain it resolves correctly without crashing, and then trigger updates.
      // Let's implement Nearest Neighbor TSP on techVisits directly!

      const optimizedVisits = [];
      const unvisited = [...techVisits];
      let currentLat = selectedTech.currentLat;
      let currentLng = selectedTech.currentLng;

      while (unvisited.length > 0) {
        let nearestIdx = 0;
        let minD = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
          const client = getClientDetails(unvisited[i].clientId);
          const d = getDistanceKm(currentLat, currentLng, client.lat, client.lng);
          if (d < minD) {
            minD = d;
            nearestIdx = i;
          }
        }

        const nextVisit = unvisited.splice(nearestIdx, 1)[0];
        optimizedVisits.push(nextVisit);
        const nextClient = getClientDetails(nextVisit.clientId);
        currentLat = nextClient.lat;
        currentLng = nextClient.lng;
      }

      // Calculate optimized total distance
      let optimizedDist = 0;
      currLat = selectedTech.currentLat;
      currLng = selectedTech.currentLng;

      optimizedVisits.forEach(v => {
        const client = getClientDetails(v.clientId);
        optimizedDist += getDistanceKm(currLat, currLng, client.lat, client.lng);
        currLat = client.lat;
        currLng = client.lng;
      });

      // Update visit sequences
      const orderedVisitIds = optimizedVisits.map(v => v.id);
      onUpdateVisitSequence(orderedVisitIds, selectedTechId);

      setSavingsReport({
        original: parseFloat(originalDist.toFixed(1)),
        optimized: parseFloat(optimizedDist.toFixed(1)),
        diff: parseFloat((originalDist - optimizedDist).toFixed(1))
      });

      setIsOptimizing(false);
    }, 800);
  };

  // Print Dispatch Report / Export PDF
  const handlePrint = () => {
    window.print();
  };

  // Re-assign a visit to another technician (Split/distribute routes)
  const handleReassign = (visitId: string, targetTechId: string) => {
    onAssignVisit(visitId, targetTechId);
  };

  // Export Route to Technician App
  const handleExportRoute = () => {
    if (!selectedTech) return;
    localStorage.setItem(`exported_route_${selectedTechId}`, selectedDate);
    window.dispatchEvent(new Event('routeExported'));
    
    const dayConfig = weeklyRules.find(r => r.dateStr === selectedDate);
    const dayNameAr = dayConfig?.dayNameAr || '';
    const regionsStr = dayConfig?.assignedRegions.map(rid => REGIONS.find(reg => reg.id === rid)?.name || '').filter(Boolean).join(' + ');

    setExportSuccess(`تم تصدير خط السير اليومي للفني (${selectedTech.name}) بنجاح ليوم ${dayNameAr} (${regionsStr})! سيظهر المسار المعتمد فوراً في تطبيق الفني الميداني.`);
    setTimeout(() => {
      setExportSuccess(null);
    }, 6000);
  };

  return (
    <div id="route-optimizer-panel" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-right">
      {/* Panel Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        {/* Day & Technician Selectors */}
        <div className="flex flex-wrap items-center gap-3 order-2 lg:order-1 justify-end">
          {/* Day & Region Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <select
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSavingsReport(null);
              }}
              className="text-xs bg-transparent border-none rounded-lg focus:outline-none font-bold text-slate-800 text-right cursor-pointer"
            >
              {weeklyRules.map((r) => {
                const regNames = r.assignedRegions.map(rid => REGIONS.find(reg => reg.id === rid)?.name || '').filter(Boolean).join(' + ');
                const visitsCount = visits.filter(v => v.date === r.dateStr && v.technicianId === selectedTechId).length;
                return (
                  <option key={r.dateStr} value={r.dateStr}>
                    {r.dayNameAr} ({regNames}) - {visitsCount} زيارات
                  </option>
                );
              })}
            </select>
            <label className="text-xs font-black text-indigo-600 whitespace-nowrap">اليوم والمنطقة المخططة:</label>
          </div>

          {/* Technician Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <select
              value={selectedTechId}
              onChange={(e) => {
                setSelectedTechId(e.target.value);
                setSavingsReport(null);
              }}
              className="text-xs bg-transparent border-none rounded-lg focus:outline-none font-bold text-slate-800 text-right cursor-pointer"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.vehicle})
                </option>
              ))}
            </select>
            <label className="text-xs font-black text-indigo-600 whitespace-nowrap">الفني الميداني:</label>
          </div>
        </div>

        <div className="order-1 lg:order-2 text-right">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 justify-end">
            تخطيط المسارات وتحسين مسار الرحلة الميدانية
            <Navigation className="w-5 h-5 text-indigo-600" />
          </h3>
          <p className="text-xs text-slate-500">حساب المسافات، تحسين ترتيب محطات الوقوف والمهمات، وتقليل هدر الوقود.</p>
        </div>
      </div>

      {/* Export Route Success Alert */}
      {exportSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-3 justify-end text-right animate-fade-in">
          <div className="flex-1">
            <p className="text-xs font-extrabold">{exportSuccess}</p>
          </div>
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
        </div>
      )}

      {/* Main Grid: Statistics & Route Stops */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Hand: Stats & Optimization Tools */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ملخص المسار اليومي المستهدف</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-medium text-slate-400 block uppercase">المسافة بالمركبة</span>
                <span className="text-xl font-extrabold text-slate-800 block mt-0.5">
                  {techRoute?.totalDistanceKm || (techVisits.length * 3.4).toFixed(1)} كم
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-medium text-slate-400 block uppercase">محطات الوقوف المتبقية</span>
                <span className="text-xl font-extrabold text-slate-800 block mt-0.5">{techVisits.length}</span>
              </div>
            </div>

            {/* Smart Optimization Actions */}
            <div className="pt-2">
              <button
                disabled={techVisits.length <= 1 || isOptimizing}
                onClick={handleOptimize}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {isOptimizing ? 'جاري تحسين المسار (خوارزمية TSP)...' : 'تحسين ترتيب محطات المسار اليومي'}
              </button>
            </div>

            {/* Export and Dispatch Actions */}
            {techVisits.length > 0 && (
              <div className="space-y-1.5 pt-1.5">
                {/* Google Maps Route Export */}
                <a
                  href={getGoogleMapsRouteUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer decoration-none"
                >
                  <Navigation className="w-4 h-4" />
                  تصدير خط السير المتكامل لخرائط جوجل
                </a>

                {/* Direct Dispatch to Field App */}
                <button
                  onClick={handleExportRoute}
                  className="w-full bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-indigo-400" />
                  تصدير وإرسال خط السير اليومي إلى الفني فقط 📤
                </button>
              </div>
            )}
          </div>

          {/* Savings Success Report */}
          {savingsReport && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs justify-end">
                <span>تم تحسين مسار الرحلة بنجاح!</span>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                تم تقليص المسافة الإجمالية من <span className="font-semibold">{savingsReport.original} كم</span> إلى{' '}
                <span className="font-bold">{savingsReport.optimized} كم</span>.
              </p>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-600">-{savingsReport.diff} كم (-{Math.round((savingsReport.diff / savingsReport.original) * 100)}%)</span>
                <span className="text-slate-500">المسافة الموفرة:</span>
              </div>
            </div>
          )}

          {/* Favorite & PDF Actions */}
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              تصدير التقرير
            </button>
            <button
              onClick={() => onSaveFavoriteRoute(selectedTechId)}
              className="flex-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Heart className="w-4 h-4 fill-rose-50" />
              حفظ كمسار مفضل
            </button>
          </div>
        </div>

        {/* Right Hand: Stops sequence and drag-less ordering/routing */}
        <div className="md:col-span-7 space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
            <span className="text-indigo-600">نقطة الانطلاق: موقع {selectedTech?.name} الحالي</span>
            <span>ترتيب محطات الوقوف المخطط</span>
          </div>

          {techVisits.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
              لا توجد مهام معلقة مجدولة لهذا المهندس اليوم.
            </div>
          ) : (
            <div className="space-y-2 relative before:absolute before:top-4 before:bottom-4 before:right-5 before:w-0.5 before:bg-slate-100">
              {techVisits.map((visit, index) => {
                const client = getClientDetails(visit.clientId);
                return (
                  <div
                    key={visit.id}
                    className="relative flex items-start gap-3 bg-white hover:bg-slate-50/50 p-3 rounded-xl border border-slate-100 transition-colors group justify-between"
                  >
                    {/* Quick Re-assign / Route Splitting dropdown */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 self-center">
                      <select
                        value={visit.technicianId}
                        onChange={(e) => handleReassign(visit.id, e.target.value)}
                        className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5 font-medium text-slate-600 focus:outline-none"
                      >
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name.split(' ')[0]}
                          </option>
                        ))}
                      </select>
                      <span className="text-[9px] text-slate-400">إعادة تعيين:</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-right pr-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex gap-1 flex-wrap justify-end"><span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {visit.type === 'Maintenance' ? 'مطابخ وخزائن' :
                           visit.type === 'Installation' ? 'أبواب ونوافذ' :
                           visit.type === 'Repair' ? 'رخام وسيراميك' : 'ستائر وديكور'}
                        </span>{visit.jobScope && visit.jobScope !== "غير محدد" && (<span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{visit.jobScope} ({visit.estimatedDuration}د)</span>)}</div>
                        <h4 className="font-semibold text-xs text-slate-900 truncate">{visit.title}</h4>
                      </div>
                      <p className="text-xs text-slate-700 truncate mt-0.5 font-medium">{client.name}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{client.address}</p>

                      {/* Time Slot & Drive Time Approximation */}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 border-t border-slate-50 pt-1.5 justify-end">
                        <span className="text-indigo-600 font-bold">
                          🚗 مسافة تقديرية: {(index * 2.1 + 1.8).toFixed(1)} كم
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="flex items-center gap-1">
                          المخطط: {formatTimeTo12Hour(visit.plannedStartTime)} - {formatTimeTo12Hour(visit.plannedEndTime)}
                          <Clock className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                    {/* Index Badge */}
                    <div className="relative z-10 w-5 h-5 rounded-full bg-indigo-50 border-2 border-indigo-500 flex items-center justify-center text-[10px] font-bold text-indigo-700 mt-1 shrink-0">
                      {index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Client, Technician, Visit } from '../types';
import { formatTimeTo12Hour } from '../lib/store';
import { Smartphone, MapPin, Navigation, Clock, Check, Upload, PenTool, Star, AlertTriangle, Play, Phone, MessageCircle, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MapContainer from './MapContainer';

interface TechnicianViewProps {
  clients: Client[];
  technicians: Technician[];
  visits: Visit[];
  onUpdateVisitStatus: (
    visitId: string,
    status: Visit['status'],
    details?: Partial<Visit>
  ) => void;
  onSimulateMovement: (
    techId: string,
    targetLat: number,
    targetLng: number,
    onArrive: () => void
  ) => void;
  activeTechId: string;
  onChangeActiveTech: (id: string) => void;
}

export default function TechnicianView({
  clients,
  technicians,
  visits,
  onUpdateVisitStatus,
  onSimulateMovement,
  activeTechId,
  onChangeActiveTech
}: TechnicianViewProps) {
  const [mediaFiles, setMediaFiles] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [travelProgress, setTravelProgress] = useState<number | null>(null);
  const [delayReason, setDelayReason] = useState<string>('');
  const [activeMobileTab, setActiveMobileTab] = useState<'tasks' | 'map'>('tasks');
  const [mapViewMode, setMapViewMode] = useState<'daily' | 'weekly'>('daily');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const [weeklyRules] = useState<any[]>(() => {
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

  const activeTech = technicians.find(t => t.id === activeTechId);

  // Find all work dates that have scheduled visits for this technician
  const availableWorkDates = Array.from(new Set(
    visits
      .filter(v => v.technicianId === activeTechId && v.date)
      .map(v => v.date!)
  )).sort();

  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const checkExportedRoute = () => {
      const exported = localStorage.getItem(`exported_route_${activeTechId}`);
      if (exported && availableWorkDates.includes(exported)) {
        setSelectedDate(exported);
      } else if (availableWorkDates.length > 0) {
        setSelectedDate(availableWorkDates[0]);
      } else {
        setSelectedDate('2026-07-12'); // default Sunday
      }
    };

    checkExportedRoute();

    window.addEventListener('routeExported', checkExportedRoute);
    return () => {
      window.removeEventListener('routeExported', checkExportedRoute);
    };
  }, [activeTechId, visits, availableWorkDates.join(',')]);

  // Active visit (first visit that is not completed today)
  const allTechVisits = visits.filter(v => v.technicianId === activeTechId);
  const techVisits = allTechVisits
    .filter(v => v.date === selectedDate)
    .sort((a, b) => (a.routeSequence || 0) - (b.routeSequence || 0));

  const activeVisit = techVisits.find(v => v.status !== 'completed');
  const targetClient = activeVisit ? clients.find(c => c.id === activeVisit.clientId) : null;

  // Clear states when active visit shifts
  useEffect(() => {
    setMediaFiles([]);
    setSignatureData(null);
    setFeedbackComments('');
    setNotes('');
    setDelayReason('');
    setTravelProgress(null);
  }, [activeVisit?.id]);

  // Handle drawing signatures natively on canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1e293b';
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData(null);
      }
    }
  };

  // Travel ticker simulation
  const handleStartDriving = () => {
    if (!activeVisit || !targetClient || !activeTech) return;

    onUpdateVisitStatus(activeVisit.id, 'en_route', {
      actualStartTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    setTravelProgress(0);

    // Increment progress toward the target client coordinates
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setTravelProgress(progress);

      // Simulate coordinate shifting towards client
      const ratio = progress / 100;
      const nextLat = activeTech.currentLat + (targetClient.lat - activeTech.currentLat) * ratio;
      const nextLng = activeTech.currentLng + (targetClient.lng - activeTech.currentLng) * ratio;

      if (progress >= 100) {
        clearInterval(interval);
        setTravelProgress(null);
        // Automatically arrive
        onUpdateVisitStatus(activeVisit.id, 'checked_in');
      }

      onSimulateMovement(activeTechId, nextLat, nextLng, () => {});
    }, 1200);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    
    files.forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFiles(prev => [...prev, { url: reader.result as string, type: isVideo ? 'video' : 'image' }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Complete Visit (Submit reports, signature, notes, rating)
  const handleCompleteVisit = () => {
    if (!activeVisit) return;

    onUpdateVisitStatus(activeVisit.id, 'completed', {
      actualEndTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes,
      photoUrl: mediaFiles.length > 0 ? mediaFiles[0].url : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300',
      signatureUrl: signatureData || '',
      feedbackRating,
      feedbackComments
    });
  };

  const handleDelayReport = () => {
    if (!activeVisit || !delayReason.trim()) return;
    onUpdateVisitStatus(activeVisit.id, 'delayed', { delayReason });
  };

  return (
    <div id="technician-simulator" className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
      {/* Selector & Controller Tab Left */}
      <div className="md:col-span-4 space-y-4 text-right">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 justify-end">
            محاكاة الفني الميداني
            <Smartphone className="w-5 h-5 text-indigo-600" />
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            اختبر واجهة التطبيق الميداني المخصصة للفنيين. حدد أحد الفنيين المتاحين لتحميل قائمة مهامه المباشرة ومحاكي التتبع الجغرافي.
          </p>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">الفني الميداني النشط</label>
            <div className="space-y-1.5">
              {technicians.map((tech) => (
                <button
                  key={tech.id}
                  onClick={() => onChangeActiveTech(tech.id)}
                  className={`w-full text-right p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    activeTechId === tech.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-102'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <img src={tech.avatar} alt={tech.name} className="w-8 h-8 rounded-full object-cover border" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs leading-tight">{tech.name}</div>
                    <div className="text-[10px] opacity-75 truncate mt-0.5">{tech.vehicle}</div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    activeTechId === tech.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tech.status === 'idle' ? 'متاح' :
                     tech.status === 'traveling' ? 'في الطريق' :
                     tech.status === 'working' ? 'قيد العمل' : 'استراحة'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* iPhone Mockup Right */}
      <div className="md:col-span-8 flex justify-center">
        <div className="relative w-full max-w-[340px] h-[640px] bg-slate-950 rounded-[40px] p-3 shadow-2xl border-[6px] border-slate-800 flex flex-col overflow-hidden">
          {/* Dynamic Island Speaker Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full z-30 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-slate-900 rounded-full absolute right-4" />
          </div>

          {/* Screen Content Wrapper */}
          <div className="flex-1 bg-slate-900 rounded-[30px] flex flex-col overflow-hidden text-slate-100 font-sans select-none relative pt-6">
           {/* App Header */}
            <div className="bg-slate-950 p-4 pt-5 pb-3 border-b border-slate-800 flex items-center justify-between text-right">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs tracking-tight font-sans">تطبيق ARS الميداني</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full uppercase">
                مركز الرياض
              </div>
            </div>
            
            {/* Mobile App Tabs */}
            <div className="flex items-center p-2 bg-slate-950 border-b border-slate-800 gap-2 shrink-0">
              <button
                onClick={() => setActiveMobileTab('tasks')}
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${activeMobileTab === 'tasks' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Check className="w-3.5 h-3.5" />
                المهام المباشرة
              </button>
              <button
                onClick={() => setActiveMobileTab('map')}
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${activeMobileTab === 'map' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                خريطة المسار
              </button>
            </div>

            {/* Scrollable Mobile Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-none">
              
              {activeMobileTab === 'map' && activeTech && (
                <div className="flex-1 flex flex-col h-full absolute inset-0 top-[110px] bg-slate-900 z-10 p-4 space-y-4">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex flex-col gap-3">
                     <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-300">
                         {mapViewMode === 'daily' ? `مسار يوم ${selectedDate}` : 'المسار الأسبوعي الشامل'}
                       </span>
                       <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold">
                         {mapViewMode === 'daily' ? techVisits.length : allTechVisits.length} مهام
                       </span>
                     </div>
                     <div className="flex items-center border border-slate-700 p-1 rounded-lg bg-slate-900">
                       <button onClick={() => setMapViewMode('weekly')} className={`flex-1 text-[10px] py-1.5 rounded transition-colors ${mapViewMode === 'weekly' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}>مسار الأسبوع كامل</button>
                       <button onClick={() => setMapViewMode('daily')} className={`flex-1 text-[10px] py-1.5 rounded transition-colors ${mapViewMode === 'daily' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}>مسار اليوم فقط</button>
                     </div>
                  </div>
                  <div className="flex-1 rounded-2xl overflow-hidden border border-slate-700 relative">
                    <MapContainer 
                      clients={clients.filter(c => (mapViewMode === 'daily' ? techVisits : allTechVisits).some(v => v.clientId === c.id))} 
                      technicians={[activeTech]} 
                      visits={mapViewMode === 'daily' ? techVisits : allTechVisits}
                      selectedClientId={null}
                      onSelectClient={() => {}}
                      onSelectTechnician={() => {}}
                    />
                  </div>
                </div>
              )}

              {/* Technician Identity Header */}
              {activeTech && (
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center gap-2.5">
                  <div className="relative group cursor-pointer w-8 h-8 rounded-full overflow-hidden border border-slate-700">
                    <img src={activeTech.avatar} alt={activeTech.name} className="w-full h-full object-cover" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            if (e.target?.result && activeTech) {
                              activeTech.avatar = e.target.result as string; // Quick mutation for mock purpose
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      title="تغيير صورة الفني"
                    />
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center pointer-events-none">
                      <Upload className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="text-right flex-1">
                    <div className="font-bold text-slate-200 text-xs flex justify-between items-center">
                      <span>{activeTech.name}</span>
                      <span className="text-[9px] text-slate-500 font-normal">اضغط على الصورة لتغييرها</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{activeTech.vehicle}</div>
                  </div>
                </div>
              )}

              {/* Day Selection Pill for Technicians */}
              {availableWorkDates.length > 0 && (
                <div className="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800/80 space-y-2 text-right">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                    <span className="text-emerald-400">📅 خط السير المعتمد</span>
                    <span>اختر يوم العمل:</span>
                  </div>
                  
                  <div className="flex overflow-x-auto gap-1.5 pb-1 scrollbar-none">
                    {availableWorkDates.map((dateStr) => {
                      const rule = weeklyRules.find(r => r.dateStr === dateStr);
                      const isExported = localStorage.getItem(`exported_route_${activeTechId}`) === dateStr;
                      const isActive = selectedDate === dateStr;
                      const visitsCount = visits.filter(v => v.technicianId === activeTechId && v.date === dateStr).length;
                      
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {isExported && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />}
                          <span>{rule?.dayNameAr || dateStr} ({visitsCount})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Driving travel simulation progression */}
              {travelProgress !== null && (
                <div className="bg-indigo-950/80 border border-indigo-800 p-3.5 rounded-2xl text-center space-y-2 animate-pulse text-right">
                  <div className="flex items-center justify-center gap-1.5 text-indigo-400 font-bold">
                    <span>جاري التوجه إلى العميل...</span>
                    <Navigation className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${travelProgress}%` }} />
                  </div>
                  <p className="text-[9px] text-indigo-300 italic">جاري محاكاة مسار القيادة والإحداثيات في شوارع الرياض</p>
                </div>
              )}

              {/* Main active job logic */}
              {!activeVisit ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-3xl border border-slate-850 py-16 space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h5 className="font-bold text-slate-200">اكتملت جميع المهام!</h5>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    تم إنجاز كافة الزيارات والمهام الميدانية الموكلة بنجاح اليوم. نتمنى لك استراحة هنيئة!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-right">
                  {/* Target Client Details */}
                  <div className="bg-slate-950 p-4 rounded-3xl border border-slate-850 space-y-3 shadow-md">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold text-slate-400 block">المهمة النشطة الحالية</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        activeVisit.status === 'pending' ? 'bg-slate-800 text-slate-400' :
                        activeVisit.status === 'en_route' ? 'bg-orange-600 text-white' :
                        activeVisit.status === 'checked_in' ? 'bg-blue-600 text-white' :
                        'bg-red-600 text-white animate-pulse'
                      }`}>
                        {activeVisit.status === 'checked_in' ? 'قيد العمل' :
                         activeVisit.status === 'en_route' ? 'في الطريق' :
                         activeVisit.status === 'pending' ? 'انتظار' : 'متأخر'}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1 justify-start">
                        <h4 className="font-extrabold text-sm text-slate-100 leading-snug">{activeVisit.title}</h4>
                        {activeVisit.jobScope && (
                          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold">
                            {activeVisit.jobScope}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{targetClient?.name}</p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5 flex items-center gap-1 justify-start">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        {targetClient?.address}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <a href={`tel:${targetClient?.phone}`} className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 py-1.5 rounded-lg border border-indigo-500/20 transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                          <span className="font-bold text-[10px]">اتصال</span>
                        </a>
                        <a href={`https://wa.me/${targetClient?.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-1.5 rounded-lg border border-emerald-500/20 transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="font-bold text-[10px]">واتساب</span>
                        </a>
                      </div>
                    </div>

                    <div className="border-t border-slate-850 pt-2.5 space-y-1 text-[10px] text-slate-400">
                      <div>📋 <strong>التعليمات الميدانية:</strong> {activeVisit.notes}</div>
                      <div className="flex items-center gap-1 text-emerald-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        الفترة: {formatTimeTo12Hour(activeVisit.plannedStartTime)} - {formatTimeTo12Hour(activeVisit.plannedEndTime)}
                      </div>
                    </div>

                    {targetClient && (
                      <div className="pt-2 border-t border-slate-850">
                        <div className="h-[200px] w-full rounded-xl overflow-hidden border border-slate-800">
                          <MapContainer 
                            clients={[targetClient]} 
                            technicians={technicians.filter(t => t.id === activeTechId)} 
                            visits={visits}
                            selectedClientId={targetClient.id}
                            onSelectClient={() => {}}
                            onSelectTechnician={() => {}}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Flow Action Controls */}
                  <AnimatePresence mode="wait">
                    {activeVisit.status === 'pending' && (
                      <motion.button
                        key="pending-btn"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={handleStartDriving}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer shadow-lg shadow-orange-950/40"
                      >
                        <Navigation className="w-4 h-4 fill-white" />
                        بدء التحرك بالمركبة (في الطريق)
                      </motion.button>
                    )}

                    {activeVisit.status === 'en_route' && (
                      <motion.button
                        key="enroute-btn"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => onUpdateVisitStatus(activeVisit.id, 'checked_in')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        تسجيل الدخول والوصول
                      </motion.button>
                    )}

                    {/* Working Check-In State: Show Document Upload, Signature, Feedback */}
                    {(activeVisit.status === 'checked_in' || activeVisit.status === 'delayed') && (
                      <motion.div
                        key="checkedin-panel"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-4 bg-slate-950/40 p-3 rounded-2xl border border-slate-850"
                      >
                        {/* Photo Upload Widget */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">رفع صور / فيديو الإنجاز الميداني</label>
                        <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 text-center transition-colors">
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            id="media-file"
                            onChange={handleMediaSelect}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          {mediaFiles.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 relative z-20">
                              {mediaFiles.map((media, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800">
                                  {media.type === 'video' ? (
                                    <video src={media.url} className="w-full h-full object-cover" />
                                  ) : (
                                    <img src={media.url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setMediaFiles(prev => prev.filter((_, i) => i !== idx)) }}
                                    className="absolute top-1 right-1 bg-black/60 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <div className="flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-lg aspect-square">
                                <Upload className="w-4 h-4" />
                                <span className="text-[8px] mt-1">أضف المزيد</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 text-slate-500 flex flex-col items-center">
                              <Upload className="w-5 h-5" />
                              <span className="text-[10px]">اختر صور أو فيديو لتأكيد إتمام العمل</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes input */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">تقرير رفع المقاسات / ملاحظات الفني الميداني</label>
                        <textarea
                          placeholder="مثال: تم أخذ مقاسات المطبخ وجدار الصالة بالليزر، والأبعاد مطابقة للمخطط..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full text-[10px] border border-slate-800 rounded-xl p-2 bg-slate-950 text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          rows={2}
                        />
                      </div>

                      {/* Customer Signature Pad */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">توقيع العميل للاستلام</label>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                          <canvas
                             ref={canvasRef}
                             width={280}
                             height={90}
                             className="bg-slate-950 w-full cursor-crosshair touch-none"
                             onMouseDown={startDrawing}
                             onMouseMove={draw}
                             onMouseUp={stopDrawing}
                             onMouseLeave={stopDrawing}
                             onTouchStart={startDrawing}
                             onTouchMove={draw}
                             onTouchEnd={stopDrawing}
                          />
                          <div className="bg-slate-900 px-2 py-1 flex justify-between border-t border-slate-850 text-[10px]">
                            <button
                              type="button"
                              onClick={clearSignature}
                              className="text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                              مسح التوقيع
                            </button>
                            <span className="text-slate-500 italic text-[9px]">وقع داخل المساحة السوداء أعلاه</span>
                          </div>
                        </div>
                      </div>

                      {/* Client Feedback Rating */}
                      <div className="space-y-1.5 border-t border-slate-850 pt-3">
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">تقييم العميل لجودة الخدمة</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              className="focus:outline-none cursor-pointer"
                            >
                              <Star className={`w-4 h-4 ${star <= feedbackRating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="تعليقات أو ملاحظات العميل الإضافية (اختياري)"
                          value={feedbackComments}
                          onChange={(e) => setFeedbackComments(e.target.value)}
                          className="w-full text-[10px] border border-slate-800 rounded-xl p-2 bg-slate-950 text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none mt-1"
                        />
                      </div>

                      {/* Submit Completion Button */}
                      <button
                        onClick={handleCompleteVisit}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer shadow-md shadow-emerald-950/45 animate-fade-in"
                      >
                        <Check className="w-4 h-4" />
                        إتمام المهمة وإرسال تقرير رفع المقاسات المعتمد
                      </button>

                      {/* Delay Alarms Reporting */}
                      {activeVisit.status !== 'delayed' && (
                        <div className="border-t border-slate-850 pt-3 space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">الإبلاغ عن تأخير مروري</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="مثال: أزمة سير خانقة أو إغلاق جسر المدينة"
                              value={delayReason}
                              onChange={(e) => setDelayReason(e.target.value)}
                              className="flex-1 text-[10px] border border-slate-800 rounded-lg p-1.5 bg-slate-950 text-slate-200 focus:ring-1 focus:ring-red-500 focus:outline-none"
                            />
                            <button
                              onClick={handleDelayReport}
                              disabled={!delayReason.trim()}
                              className="bg-red-950 border border-red-800 hover:bg-red-900 disabled:opacity-50 text-red-400 px-2.5 rounded-lg text-[10px] font-bold cursor-pointer whitespace-nowrap"
                            >
                              إبلاغ المشرف
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
              )}

              {/* Scheduled Queue Checklist */}
              <div className="space-y-2 border-t border-slate-800 pt-3 text-right">
                <div className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">أجندة جدول الأعمال اليومية</div>
                {techVisits.map((v, index) => {
                  const cl = clients.find(c => c.id === v.clientId);
                  return (
                    <div
                      key={v.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 bg-slate-950/40 ${
                        v.status === 'completed'
                          ? 'border-emerald-900 text-slate-500'
                          : 'border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="text-[9px] text-slate-400 font-bold shrink-0">
                        {formatTimeTo12Hour(v.plannedStartTime)}
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <div className="font-semibold text-[11px] flex items-center gap-1 justify-end">
                          {v.status === 'completed' && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          <span>{index + 1}. {v.title}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5 truncate flex justify-between items-center">
                          <span>{cl?.name}</span>
                          {cl && v.status !== 'completed' && (
                            <div className="flex gap-1.5 shrink-0 ml-2">
                              <a href={`tel:${cl.phone}`} className="p-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors">
                                <Phone className="w-3 h-3" />
                              </a>
                              <a href={`https://wa.me/${cl.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

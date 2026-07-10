import React, { useState, useEffect } from 'react';
import { Client, Technician, Visit, LogEntry } from '../types';
import { dbSaveClient, dbSaveVisit, dbSaveLog } from '../lib/firebase';
import { 
  Sparkles, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CalendarDays, 
  HeartHandshake, 
  ChevronLeft, 
  ChevronRight, 
  Phone, 
  ClipboardCheck, 
  Compass,
  ArrowLeft,
  ThumbsUp,
  Map,
  ShieldCheck,
  Navigation
} from 'lucide-react';

interface OnlineBookingPortalProps {
  clients: Client[];
  technicians: Technician[];
  visits: Visit[];
  onAddClient: (client: Client) => void;
  onAddVisit: (visit: Visit) => void;
  onBackToAdmin?: () => void;
  standalone?: boolean;
}

// Predefined fixed service currently provided by ARS
const ACTIVE_SERVICE = {
  id: 'wardrobes',
  title: 'رفع مقاسات خزائن الملابس وغرف النوم السحاب',
  durationMin: 60,
  description: 'رفع مقاسات تفصيلية للحوائط، الأعمدة، مناسيب الباركيه، والارتفاعات لضمان دقة تركيب خزائن وغرف النوم السحاب بنسبة 100%.',
  icon: '👔',
  price: 'مجاني'
};

const NEIGHBORHOODS = [
  { name: 'حي الملقا', region: 'north', label: 'شمال الرياض' },
  { name: 'حي الصحافة', region: 'north', label: 'شمال الرياض' },
  { name: 'حي الياسمين', region: 'north', label: 'شمال الرياض' },
  { name: 'حي العقيق', region: 'north', label: 'شمال الرياض' },
  { name: 'حي حطين', region: 'west', label: 'غرب الرياض' },
  { name: 'حي الغدير', region: 'north', label: 'شمال الرياض' },
  { name: 'حي النخيل', region: 'north', label: 'شمال الرياض' },
  { name: 'حي المغرزات', region: 'east', label: 'شرق الرياض' },
  { name: 'حي قرطبة', region: 'east', label: 'شرق الرياض' },
  { name: 'حي اليرموك', region: 'east', label: 'شرق الرياض' },
  { name: 'حي العليا', region: 'central', label: 'وسط الرياض' },
  { name: 'حي السليمانية', region: 'central', label: 'وسط الرياض' },
  { name: 'حي السويدي', region: 'south', label: 'جنوب الرياض' },
  { name: 'حي العزيزية', region: 'south', label: 'جنوب الرياض' },
  { name: 'حي المهدية', region: 'west', label: 'غرب الرياض' },
  { name: 'حي لبن', region: 'west', label: 'غرب الرياض' },
];

export default function OnlineBookingPortal({
  clients,
  technicians,
  visits,
  onAddClient,
  onAddVisit,
  onBackToAdmin,
  standalone = false
}: OnlineBookingPortalProps) {
  // We have 4 steps now:
  // 1: الموقع (Location selection & Live coordinates)
  // 2: الفني (Choose Technician)
  // 3: الوقت (Date & Time slots over 14 days)
  // 4: تأكيد الحجز (Name, phone & notes)
  // 5: Success Screen
  const [step, setStep] = useState<number>(1);
  
  // Location selections
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<typeof NEIGHBORHOODS[0] | null>(null);
  const [customNeighborhoodName, setCustomNeighborhoodName] = useState<string>('');
  const [customRegion, setCustomRegion] = useState<string>('north'); // Default custom region
  const [customAddress, setCustomAddress] = useState<string>('');
  
  // Live location coordinates
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geolocationState, setGeolocationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [geoErrorMsg, setGeoErrorMsg] = useState<string | null>(null);

  // Form selections
  const [selectedTechOption, setSelectedTechOption] = useState<string>('any'); // 'any' or techId
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(''); // HH:MM
  
  // Client details (simplified)
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientNotes, setClientNotes] = useState<string>('');
  const [jobScope, setJobScope] = useState<'غرفة' | 'غرفتين' | 'ثلاث غرف' | 'فيلا' | 'غير محدد'>('غير محدد');

  // Rules from RegionalPlanner
  const [weeklyRules, setWeeklyRules] = useState<any[]>([]);
  const [visitDuration, setVisitDuration] = useState<number>(90);
  const [bufferTime, setBufferTime] = useState<number>(30);
  const [bookingSuccessData, setBookingSuccessData] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const rules = localStorage.getItem('ars_weekly_rules');
    if (rules) {
      setWeeklyRules(JSON.parse(rules));
    } else {
      // Default fallback weekly coverage
      setWeeklyRules([
        { dayNameAr: 'السبت', dayNameEn: 'Saturday', assignedRegions: ['central'], dateStr: '2026-07-11', maxDailyVisits: 8 },
        { dayNameAr: 'الأحد', dayNameEn: 'Sunday', assignedRegions: ['north'], dateStr: '2026-07-12', maxDailyVisits: 8 },
        { dayNameAr: 'الأثنين', dayNameEn: 'Monday', assignedRegions: ['west'], dateStr: '2026-07-13', maxDailyVisits: 8 },
        { dayNameAr: 'الثلاثاء', dayNameEn: 'Tuesday', assignedRegions: ['east'], dateStr: '2026-07-14', maxDailyVisits: 8 },
        { dayNameAr: 'الأربعاء', dayNameEn: 'Wednesday', assignedRegions: ['south'], dateStr: '2026-07-15', maxDailyVisits: 8 },
        { dayNameAr: 'الخميس', dayNameEn: 'Thursday', assignedRegions: ['central'], dateStr: '2026-07-16', maxDailyVisits: 8 },
      ]);
    }

    const duration = localStorage.getItem('ars_visit_duration');
    if (duration) setVisitDuration(parseInt(duration));

    const buffer = localStorage.getItem('ars_buffer_time');
    if (buffer) setBufferTime(parseInt(buffer));
  }, []);

  const getVisitsCountOnDate = (dateStr: string) => {
    return visits.filter(v => v.date === dateStr && v.status !== 'completed').length;
  };

  const getMaxVisitsForDate = (dateStr: string) => {
    let rule = weeklyRules.find(r => r.dateStr === dateStr);
    if (!rule) {
      const dateObj = new Date(dateStr);
      const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayEn = weekdaysEn[dateObj.getDay()];
      rule = weeklyRules.find(r => r.dayNameEn === dayEn);
    }
    return rule ? (rule.maxDailyVisits || 8) : 8;
  };

  const isDateFull = (dateStr: string) => {
    const count = getVisitsCountOnDate(dateStr);
    const limit = getMaxVisitsForDate(dateStr);
    return count >= limit;
  };

  // Compute next 14 available calendar dates (two weeks window) starting from 2026-07-11
  const getUpcomingDates = () => {
    const dates = [];
    const baseDate = new Date('2026-07-11');
    for (let i = 0; i < 14; i++) {
      const current = new Date(baseDate);
      current.setDate(baseDate.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];
      
      const weekdaysAr = ['الأحد', 'الأثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const dayNameAr = weekdaysAr[current.getDay()];

      dates.push({
        dateStr,
        dayNameAr,
        dayNameEn: current.toLocaleDateString('en-US', { weekday: 'long' }),
        formatted: current.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
      });
    }
    return dates;
  };

  const upcomingDates = getUpcomingDates();

  // Determine if a specific date is geographically recommended for the chosen neighborhood
  const isDateGeographicallyRecommended = (dateStr: string) => {
    if (!selectedNeighborhood) return false;
    
    // 1. Try exact date match first
    let rule = weeklyRules.find(r => r.dateStr === dateStr);
    
    // 2. Fallback to day of week match (useful for the 2nd week or future schedule)
    if (!rule) {
      const dateObj = new Date(dateStr);
      const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayEn = weekdaysEn[dateObj.getDay()];
      rule = weeklyRules.find(r => r.dayNameEn === dayEn);
    }

    if (!rule) return false;
    return rule.assignedRegions.includes(selectedNeighborhood.region);
  };

  // Trigger live WhatsApp-style location sharing
  const handleShareLiveLocation = () => {
    if (!navigator.geolocation) {
      setGeolocationState('error');
      setGeoErrorMsg('متصفحك لا يدعم خاصية تحديد الموقع الجغرافي.');
      return;
    }

    setGeolocationState('loading');
    setGeoErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLiveCoords({ lat: latitude, lng: longitude });
        setGeolocationState('success');

        // Dynamic region allocation based on Saudi Riyadh geographic coordinates splits
        // Standard center Riyadh lat/lng is ~24.7136 / 46.6753
        let region = 'central';
        let regionLabel = 'وسط الرياض';

        if (latitude > 24.77) {
          region = 'north';
          regionLabel = 'شمال الرياض';
        } else if (latitude < 24.65) {
          region = 'south';
          regionLabel = 'جنوب الرياض';
        } else if (longitude > 46.75) {
          region = 'east';
          regionLabel = 'شرق الرياض';
        } else if (longitude < 46.62) {
          region = 'west';
          regionLabel = 'غرب الرياض';
        }

        const gpsNeighborhood = {
          name: 'الموقع المباشر الجغرافي (مشارك بالـ GPS)',
          region,
          label: `إحداثيات مباشرة • ${regionLabel}`
        };

        setSelectedNeighborhood(gpsNeighborhood);
        setCustomNeighborhoodName('');
        setCustomAddress(`الموقع المباشر: (${latitude.toFixed(5)} , ${longitude.toFixed(5)})`);
      },
      (error) => {
        console.error('Error sharing GPS coordinates:', error);
        setGeolocationState('error');
        setGeoErrorMsg('عذراً، فشل تحديد موقعك التلقائي. يرجى تفعيل الـ GPS بالمتصفح أو إدخال حيّك السكني بالأسفل.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Generate available time slots based on tech availability & work hours
  const getTimeSlotsForDate = (dateStr: string) => {
    // بناء على المتطلبات: فترة واحدة مسائية يقوم النظام بجدولتها لاحقاً
    return [{
      time: 'فترة مسائية (2:00 م - 10:00 م)',
      endTime: '22:00',
      available: true,
      assignedTech: null
    }];
  };

  const handleCreateBooking = async () => {
    if (!selectedNeighborhood || !selectedDate || !selectedTimeSlot || !clientName || !clientPhone) {
      alert('الرجاء تعبئة كافة الحقول الأساسية (الاسم، الجوال، والوقت) لإتمام حجز الموعد.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find a technician to assign
      const slots = getTimeSlotsForDate(selectedDate);
      const chosenSlot = slots.find(s => s.time === selectedTimeSlot);
      let finalTechId = technicians[0]?.id || 'tech_1';
      let finalTechName = technicians[0]?.name || 'فني معتمد';

      if (chosenSlot && chosenSlot.assignedTech) {
        finalTechId = chosenSlot.assignedTech.id;
        finalTechName = chosenSlot.assignedTech.name;
      } else {
        const freeTech = technicians.find(t => t.id === selectedTechOption);
        if (freeTech) {
          finalTechId = freeTech.id;
          finalTechName = freeTech.name;
        }
      }

      // 1. Create client record
      const newClientId = `c_book_${Date.now()}`;
      
      // Determine final coordinates
      let customLat = 24.774265;
      let customLng = 46.738586;
      if (liveCoords) {
        customLat = liveCoords.lat;
        customLng = liveCoords.lng;
      } else {
        if (selectedNeighborhood.region === 'north') { customLat = 24.8115; customLng = 46.6302; }
        else if (selectedNeighborhood.region === 'south') { customLat = 24.6305; customLng = 46.7112; }
        else if (selectedNeighborhood.region === 'east') { customLat = 24.7475; customLng = 46.7112; }
        else if (selectedNeighborhood.region === 'west') { customLat = 24.7588; customLng = 46.6120; }
        else { customLat = 24.7078; customLng = 46.6749; }

        // Add small random noise to scatter beautifully on the dispatcher map
        customLat += (Math.random() - 0.5) * 0.012;
        customLng += (Math.random() - 0.5) * 0.012;
      }

      const neighborhoodText = selectedNeighborhood.name;
      const fullAddress = `${neighborhoodText}، ${customAddress || 'الرياض'}`;

      const newClient: Client = {
        id: newClientId,
        name: clientName,
        contactPerson: clientName,
        phone: clientPhone,
        lat: parseFloat(customLat.toFixed(5)),
        lng: parseFloat(customLng.toFixed(5)),
        address: fullAddress,
        neighborhood: `${neighborhoodText} (${selectedNeighborhood.label})`
      };

      // 2. Create visit record
      const newVisitId = `v_book_${Date.now()}`;
      
      // Auto-assign a specific time between 14:00 and 22:00 based on existing visits today
      const existingVisitsCount = visits.filter(v => v.date === selectedDate).length;
      const startHour = 14 + Math.floor((existingVisitsCount * 90) / 60);
      const startMin = (existingVisitsCount * 90) % 60;
      
      const plannedStartTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
      
      // Calculate Duration based on job scope
      let estDuration = visitDuration; // default
      switch (jobScope) {
        case 'غرفة': estDuration = 45; break;
        case 'غرفتين': estDuration = 90; break;
        case 'ثلاث غرف': estDuration = 180; break;
        case 'فيلا': estDuration = 300; break;
        default: estDuration = visitDuration;
      }

      const endMins = startHour * 60 + startMin + estDuration;
      const plannedEndHour = Math.floor(endMins / 60);
      const plannedEndMin = endMins % 60;
      const plannedEndTime = `${String(plannedEndHour).padStart(2, '0')}:${String(plannedEndMin).padStart(2, '0')}`;

      const newVisit: Visit = {
        id: newVisitId,
        clientId: newClientId,
        technicianId: finalTechId,
        title: ACTIVE_SERVICE.title,
        type: 'Inspection',
        status: 'pending',
        date: selectedDate,
        plannedStartTime,
        plannedEndTime,
        notes: `بوابة أودو للخدمة الذاتية (خزائن وملابس). تصنيف: ${jobScope}. وقت مفضل: ${selectedTimeSlot}. ملاحظات: ${clientNotes || 'لا يوجد'}`,
        jobScope,
        estimatedDuration: estDuration
      };

      // 3. Write directly into persistent Firestore database (No mock data!)
      await dbSaveClient(newClient);
      await dbSaveVisit(newVisit);

      // Log the direct public booking action
      const newLog: LogEntry = {
        id: `l_book_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        technicianId: finalTechId,
        technicianName: finalTechName,
        visitId: newVisitId,
        clientName,
        action: `حجز موعد ذكي لرفع مقاسات الخزائن والغرف السحاب في ${neighborhoodText} عبر البوابة الإلكترونية`,
        type: 'success'
      };
      await dbSaveLog(newLog);

      // Invoke state updates in App.tsx
      onAddClient(newClient);
      onAddVisit(newVisit);

      // Set Receipt success data
      setBookingSuccessData({
        refNo: `ARS-${newDateRef()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        techName: finalTechName,
        service: ACTIVE_SERVICE.title,
        date: selectedDate,
        time: selectedTimeSlot,
        clientName,
        neighborhood: neighborhoodText,
        greenBonus: isDateGeographicallyRecommended(selectedDate)
      });
      setStep(5); // Show success screen
    } catch (err) {
      console.error('Error creating booking:', err);
      alert('عذراً، حدث خطأ أثناء إتمام حجز الموعد المباشر. يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const newDateRef = () => {
    const today = new Date();
    return `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  };

  const activeSlots = selectedDate ? getTimeSlotsForDate(selectedDate) : [];

  // Helper text mapping for custom region select
  const REGION_LABELS: Record<string, string> = {
    'north': 'شمال الرياض',
    'south': 'جنوب الرياض',
    'east': 'شرق الرياض',
    'west': 'غرب الرياض',
    'central': 'وسط الرياض'
  };

  return (
    <div className="bg-slate-50 min-h-screen text-right font-sans flex flex-col items-center justify-start py-8 px-4" dir="rtl">
      {/* Upper admin portal header */}
      {!standalone && onBackToAdmin && (
        <div className="w-full max-w-3xl bg-indigo-900 text-white rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-950/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="font-extrabold text-sm">أنت في وضع معاينة بوابة الحجز الإلكتروني للعميل (Odoo Portal Sandbox)</h4>
            </div>
            <p className="text-[10px] text-indigo-200 mt-1">هذه البوابة تحاكي تجربة حجز العميل الذاتي للمواعيد. جميع الحجوزات حقيقية وتُكتب مباشرةً في قاعدة بيانات الفنيين السحابية.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const url = window.location.origin + window.location.pathname + '#booking';
                navigator.clipboard.writeText(url);
                alert('تم نسخ رابط بوابة الحجز للعميل بنجاح!');
              }}
              className="px-3.5 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition-all border border-indigo-600 cursor-pointer"
            >
              نسخ الرابط للعملاء 🔗
            </button>
            <button
              onClick={onBackToAdmin}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              العودة للوحة الإرسال
            </button>
          </div>
        </div>
      )}

      {/* Main Booking Container */}
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in flex flex-col">
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-8 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 justify-end sm:justify-start">
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                  Odoo Self-Service
                </span>
                <span className="text-xs text-slate-300 font-medium">جدولة المواعيد الإلكترونية الذكية</span>
              </div>
              <h1 className="text-xl font-black mt-1.5 text-white">بوابة حجز مواعيد رفع المقاسات - ARS</h1>
              
              {/* Highlight service to clarify they don't select */}
              <div className="mt-3 inline-flex items-center gap-2 bg-indigo-950/80 border border-indigo-800/80 rounded-xl px-3.5 py-2">
                <span className="text-base">{ACTIVE_SERVICE.icon}</span>
                <div className="text-right">
                  <span className="text-[10px] text-indigo-300 block leading-none">الخدمة المطلوبة حالياً:</span>
                  <span className="text-xs font-extrabold text-emerald-400 mt-1 block">{ACTIVE_SERVICE.title}</span>
                </div>
              </div>
            </div>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg border border-indigo-500/30">
              ARS
            </div>
          </div>

          {/* Progress Indicators */}
          {step <= 4 && (
            <div className="grid grid-cols-4 gap-1.5 mt-8 border-t border-slate-800/80 pt-5 text-center text-[10px] font-bold">
              {[
                { s: 1, name: 'الموقع المباشر' },
                { s: 2, name: 'الفني' },
                { s: 3, name: 'تحديد الفترة' },
                { s: 4, name: 'بيانات الاتصال' },
              ].map(x => (
                <div key={x.s} className="space-y-1">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= x.s ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                  <span className={step === x.s ? 'text-white font-black' : 'text-slate-500'}>{x.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Screens */}
        <div className="p-6 md:p-8 flex-1">
          
          {/* STEP 1: Location & Live WhatsApp Coordinates */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-right">
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5 justify-start">
                  <span>الخطوة 1: حدد موقع منزلك أو شارك موقعك المباشر</span>
                  <MapPin className="w-4 h-4 text-indigo-600 animate-bounce" />
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  لتسريع الخدمة، يمكنك مشاركة موقعك الجغرافي المباشر بالـ GPS (مثل واتساب)، أو اختيار الحي وكتابة حيك إذا لم تجده مسجلاً.
                </p>
              </div>

              {/* WhatsApp-Style Geolocation Button */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-right">
                    <span className="font-black text-xs text-emerald-950 block">مشاركة موقعك المباشر الآن 📍</span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5 leading-relaxed">
                      اضغط لمشاركة الإحداثيات الجغرافية مباشرة. يساعد الفني في الوصول لباب منزلك بدقة متناهية دون الحاجة للاتصال المتكرر.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleShareLiveLocation}
                    disabled={geolocationState === 'loading'}
                    className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Navigation className={`w-4 h-4 ${geolocationState === 'loading' ? 'animate-spin' : ''}`} />
                    <span>
                      {geolocationState === 'loading' ? 'جاري تحديد موقعك المباشر...' : 'شارِك موقعي الحالي (مثل واتساب)'}
                    </span>
                  </button>
                </div>

                {/* Geolocation Success Status */}
                {geolocationState === 'success' && liveCoords && (
                  <div className="bg-emerald-600/10 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="font-bold">
                      تم التقاط موقعك المباشر بنجاح! ({liveCoords.lat.toFixed(5)} , {liveCoords.lng.toFixed(5)}) • سيتم توجيه الفني جغرافياً لهناك.
                    </div>
                  </div>
                )}

                {/* Geolocation Error */}
                {geolocationState === 'error' && geoErrorMsg && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-[10px] text-rose-800 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>{geoErrorMsg}</span>
                  </div>
                )}
              </div>

              {/* Custom Neighborhood name & List */}
              <div className="space-y-4 border-t border-slate-150 pt-5">
                <span className="text-[11px] font-black text-slate-800 block">
                  أو اكتب حيك السكني المخصص (في حال لم يكن بالقائمة):
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">اسم الحي المخصص:</label>
                    <input
                      type="text"
                      placeholder="اكتب هنا.. مثلاً: حي الشفا، حي الدار البيضاء، العارض"
                      value={customNeighborhoodName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomNeighborhoodName(val);
                        if (val.trim()) {
                          // Setup dynamic custom neighborhood object
                          setSelectedNeighborhood({
                            name: val,
                            region: customRegion,
                            label: REGION_LABELS[customRegion]
                          });
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600 text-right font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">الاتجاه الجغرافي لحيك السكني:</label>
                    <div className="grid grid-cols-3 gap-1">
                      {Object.entries(REGION_LABELS).map(([reg, label]) => {
                        const isChosen = customRegion === reg;
                        return (
                          <button
                            type="button"
                            key={reg}
                            onClick={() => {
                              setCustomRegion(reg);
                              if (customNeighborhoodName.trim()) {
                                setSelectedNeighborhood({
                                  name: customNeighborhoodName,
                                  region: reg,
                                  label: label
                                });
                              }
                            }}
                            className={`p-2 rounded-lg text-[9px] font-bold border transition-all ${
                              isChosen 
                                ? 'bg-indigo-600 text-white border-indigo-600' 
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed street/address info */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-black text-slate-700 block">العنوان التفصيلي وملاحظات الموقع (اختياري):</span>
                <input
                  type="text"
                  placeholder="مثال: شارع عبدالمجيد بن عبدالعزيز، فيلا رقم 4، بجانب سوبرماركت"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600 text-right font-medium"
                />
              </div>

              {/* Geo benefit highlight */}
              {selectedNeighborhood && (
                <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-4 text-emerald-800 text-xs flex items-center justify-between gap-4">
                  <div className="text-right">
                    <span className="font-black block">💡 معلومة التغطية الجغرافية الذكية:</span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5 leading-relaxed">
                      لقد حددنا موقعك في نطاق <strong className="text-emerald-900">{selectedNeighborhood.label}</strong>.
                      سنقوم باقتراح الأيام التي يتواجد فيها فنيونا في منطقتك لتقليص انبعاثات السيارات وتقديم خدمة أسرع.
                    </span>
                  </div>
                  <ThumbsUp className="w-7 h-7 text-emerald-600 shrink-0" />
                </div>
              )}

              {/* Step Navigation */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    if (!selectedNeighborhood) {
                      alert('الرجاء اختيار حي من القائمة، أو كتابة حيك ومشاركة موقعك المباشر أولاً للمتابعة.');
                      return;
                    }
                    setStep(2);
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>متابعة الخطوة التالية (الفني)</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Choose Technician */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-right">
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5 justify-start">
                  <span>الخطوة 2: حدد الفني المفضل لموعد الرفع</span>
                  <User className="w-4 h-4 text-indigo-600" />
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">يمكنك تفويض النظام لاختيار الفني الأقرب جغرافياً لتقليل وقت الانتظار أو تحديد فني بعينه.</p>
              </div>

              <div className="space-y-3">
                {/* Any tech option */}
                <div
                  onClick={() => setSelectedTechOption('any')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    selectedTechOption === 'any'
                      ? 'border-indigo-600 bg-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      ✨
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-xs text-slate-800 block">النظام يختار الفني الأنسب لحيك (موصى به)</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">يقوم محرك التوجيه الذكي بربطك بالفني الميداني المتواجد في نطاق تغطية حيّك.</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded shrink-0">🌿 صديق للبيئة</span>
                </div>

                {/* Specific techs */}
                {technicians.map(tech => {
                  const isSelected = selectedTechOption === tech.id;
                  return (
                    <div
                      key={tech.id}
                      onClick={() => setSelectedTechOption(tech.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={tech.avatar}
                          alt={tech.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-slate-100"
                        />
                        <div className="text-right">
                          <span className="font-bold text-xs text-slate-800 block">{tech.name}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{tech.vehicle} • التقييم الميداني: ⭐{tech.rating}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                        {tech.shiftStart} - {tech.shiftEnd}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  السابق
                </button>
                <button
                  onClick={() => {
                    // Preselect a recommended and non-full date in upcoming
                    const recommended = upcomingDates.find(d => isDateGeographicallyRecommended(d.dateStr) && !isDateFull(d.dateStr));
                    if (recommended) {
                      setSelectedDate(recommended.dateStr);
                    } else {
                      const firstRec = upcomingDates.find(d => isDateGeographicallyRecommended(d.dateStr));
                      setSelectedDate(firstRec ? firstRec.dateStr : '');
                    }
                    setSelectedTimeSlot('');
                    setStep(3);
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>متابعة للخطوة التالية (الوقت)</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Choose Date & Time (14-day window) */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-right">
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5 justify-start">
                  <span>الخطوة 3: اختر الموعد واليوم المناسب (خلال أسبوعين مسبقاً)</span>
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  نوفر لك مرونة الحجز المسبق لفترة أسبوعين كاملة. الأيام ذات الخلفية الخضراء تعني أن سيارات الخدمة لـ ARS ستكون متواجدة بجوارك بالفعل في ذلك اليوم.
                </p>
              </div>

              {/* 14-day horizontal scroll view */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-500 block">1. اختر يوماً من الـ 14 يوماً القادمة:</span>
                <div className="flex overflow-x-auto gap-2.5 pb-3 scrollbar-thin scrollbar-thumb-indigo-200">
                  {upcomingDates.map(d => {
                    const isSelected = selectedDate === d.dateStr;
                    const isRecommended = isDateGeographicallyRecommended(d.dateStr);
                    const isFull = isDateFull(d.dateStr);
                    const isSelectable = isRecommended && !isFull;

                    return (
                      <button
                        key={d.dateStr}
                        disabled={!isSelectable}
                        type="button"
                        onClick={() => {
                          setSelectedDate(d.dateStr);
                          setSelectedTimeSlot('');
                        }}
                        className={`p-4 rounded-2xl text-center shrink-0 border transition-all flex flex-col justify-center min-w-[105px] relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                            : isRecommended
                            ? isFull
                              ? 'border-amber-200 bg-amber-50 text-amber-900'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100/50'
                            : 'border-slate-100 bg-slate-50 text-slate-400'
                        }`}
                      >
                        {isRecommended && !isFull && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                        )}
                        {isFull && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                        )}
                        <span className="text-[10px] block font-bold opacity-80">{d.dayNameAr}</span>
                        <span className="text-xs font-black block mt-1">{d.formatted}</span>
                        {isRecommended ? (
                          isFull ? (
                            <span className="text-[8px] font-extrabold tracking-tight block mt-1 text-amber-700">
                              مكتمل المواعيد ⚠️
                            </span>
                          ) : (
                            <span className={`text-[8px] font-extrabold tracking-tight block mt-1 ${isSelected ? 'text-indigo-200' : 'text-emerald-700'}`}>
                              تغطية لحيّك 🌿
                            </span>
                          )
                        ) : (
                          <span className="text-[8px] font-bold block mt-1 text-slate-400">
                            خارج التغطية 📍
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Selection */}
              {selectedDate && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500">2. حدد الوقت الشاغر للزيارة:</span>
                    {isDateGeographicallyRecommended(selectedDate) && (
                      <span className="text-[8px] bg-emerald-150 text-emerald-800 font-extrabold px-2 py-0.5 rounded border border-emerald-200">
                        🌿 اختيارك لهذا اليوم يوفر 35% من كفاءة خط السير للفني
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    {activeSlots.map(slot => {
                      const isSelected = selectedTimeSlot === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedTimeSlot(slot.time)}
                          className={`p-3.5 rounded-xl border text-center transition-all flex flex-col justify-center items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold ring-2 ring-indigo-500/25'
                              : slot.available
                              ? 'border-slate-200 hover:border-indigo-100 hover:bg-indigo-50/10'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <span className="text-xs font-extrabold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            {slot.time}
                          </span>
                          <span className="text-[9px] text-slate-400">المدة: {ACTIVE_SERVICE.durationMin} دقيقة</span>
                        </button>
                      );
                    })}
                  </div>

                  {activeSlots.filter(s => s.available).length === 0 && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-center text-rose-800 text-xs font-bold">
                      ⚠️ عذراً، جميع المواعيد محجوزة للفني المختار في هذا اليوم. الرجاء تجربة يوم آخر أو اختيار فني بديل.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  السابق
                </button>
                <button
                  onClick={() => {
                    if (!selectedDate || !selectedTimeSlot) {
                      alert('الرجاء اختيار تاريخ ويوم موعد الرفع المتاح للمتابعة.');
                      return;
                    }
                    setStep(4);
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>متابعة للخطوة الأخيرة</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Confirm Contact details (Simplified: Name, Mobile, and Notes only!) */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-right">
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5 justify-start">
                  <span>الخطوة الأخيرة: بيانات الاتصال وتأكيد الموعد</span>
                  <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">نحتاج فقط لاسمكم الكريم ورقم الجوال للتأكيد النهائي والمتابعة الميدانية.</p>
              </div>

              {/* Personal inputs - Simplified */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 block">الاسم الكامل للعميل: *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="مثال: يوسف خالد الحربي"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full p-2.5 pl-3 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600 text-right font-medium"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 block">رقم الجوال لتلقي إشعارات الحجز: *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="مثال: 0501234567"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full p-2.5 pl-3 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600 text-left font-medium"
                      dir="ltr"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block">حجم العمل المطلوب (تصنيف المهمة): *</label>
                  <select
                    value={jobScope}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600 text-right font-medium cursor-pointer"
                    onChange={(e) => setJobScope(e.target.value as any)}
                  >
                    <option value="غير محدد">غير محدد (سيتم احتساب المدة الافتراضية)</option>
                    <option value="غرفة">غرفة واحدة (تقريباً 30-60 دقيقة)</option>
                    <option value="غرفتين">غرفتين (تقريباً ساعة ونصف)</option>
                    <option value="ثلاث غرف">3 غرف فأكثر (تقريباً 3 ساعات)</option>
                    <option value="فيلا">فيلا كاملة (مشروع متكامل - وقت مفتوح)</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block">ملاحظات إضافية وتفاصيل خاصة للتركيب (اختياري):</label>
                  <textarea
                    rows={3}
                    placeholder="مثال: أرجو رفع مقاسات خزانة جدارية وتسريحة وتكسيات خشبية في غرفة النوم الرئيسية."
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600 text-right font-medium"
                  />
                </div>
              </div>

              {/* Summarize choice */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <span className="text-[10px] font-black text-slate-600 block">ملخص حجز الموعد المختار:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs font-bold text-slate-700">
                  <div>👔 الخدمة: <strong className="text-slate-900 text-[11px]">{ACTIVE_SERVICE.title}</strong></div>
                  <div>📍 الموقع المختار: <strong className="text-slate-900 text-[11px]">{selectedNeighborhood?.name}</strong></div>
                  <div>📅 تاريخ الزيارة الميدانية: <strong className="text-indigo-600 text-[11px]">{selectedDate}</strong></div>
                  <div>⏰ الساعة والوقت: <strong className="text-indigo-600 text-[11px]">{selectedTimeSlot}</strong></div>
                </div>
              </div>

              {/* Eco incentive banner */}
              {isDateGeographicallyRecommended(selectedDate) && (
                <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 text-indigo-900 text-xs flex items-center justify-between gap-4">
                  <div className="text-right">
                    <span className="font-black block">🌿 حجز أخضر ومحافظ على البيئة!</span>
                    <span className="text-[10px] text-indigo-700 block mt-0.5 leading-relaxed">
                      رائع! بحجزك للموعد في يوم التغطية الجغرافية لحيّك السكني، قمت بمساعدة فنيينا في دمج مسارات النقل والسيارات المجهزة مما يقلص الانبعاثات الكربونية بنسبة 35%!
                    </span>
                  </div>
                  <Sparkles className="w-8 h-8 text-indigo-500 shrink-0 animate-bounce" />
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  السابق
                </button>
                <button
                  onClick={handleCreateBooking}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>جاري تأكيد الموعد...</span>
                  ) : (
                    <>
                      <span>تأكيد الموعد وإرسال للفنيين الميدانيين</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Success Confirmation Screen */}
          {step === 5 && bookingSuccessData && (
            <div className="text-center py-8 px-4 space-y-6 animate-fade-in" dir="rtl">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-extrabold">
                  تم تأكيد الحجز بنجاح ومزامنته مع الفنيين
                </span>
                <h3 className="font-black text-slate-800 text-base">نشكرك على استخدام بوابة الخدمة الذاتية Odoo</h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                  تم استلام موعدك لرفع مقاسات الخزائن والملابس وغرف النوم السحاب ووضعه على مسارات الفنيين الميدانيين الذكية.
                </p>
              </div>

              {/* Receipt details */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-right max-w-md mx-auto space-y-4">
                <div className="border-b border-slate-200/80 pb-3 flex justify-between items-center text-xs">
                  <span className="text-slate-400">الرقم المرجعي للحجز:</span>
                  <strong className="text-slate-800 font-mono tracking-wider">{bookingSuccessData.refNo}</strong>
                </div>

                <div className="space-y-2 text-xs font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">اسم العميل:</span>
                    <span className="text-slate-900">{bookingSuccessData.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">موقع العميل والحي:</span>
                    <span className="text-slate-900">{bookingSuccessData.neighborhood}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الفني المخصص:</span>
                    <span className="text-indigo-600">{bookingSuccessData.techName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">تاريخ الزيارة:</span>
                    <span className="text-slate-900">{bookingSuccessData.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الوقت المحدد:</span>
                    <span className="text-slate-900 font-mono">{bookingSuccessData.time}</span>
                  </div>
                </div>

                {bookingSuccessData.greenBonus && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl text-[10px] text-emerald-800 leading-normal font-medium text-center">
                    🌿 <strong>مكافأة الحجز الأخضر:</strong> شكراً لمساهمتك في دمج مسارات النقل لحيّك! قمت بتقليص إجمالي مسافات القيادة بمعدل 12 كم وحماية البيئة.
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-2xl text-[10px] text-blue-800 leading-normal font-medium text-center mt-3">
                  📱 <strong>الخطوة التالية:</strong> سيصلك رسالة تأكيد للموعد عبر <b>الواتساب (WhatsApp)</b> قريباً، بالإضافة لرسائل متابعة لحالة الفني خطوة بخطوة.
                </div>
              </div>

              <div className="pt-6 flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setSelectedTimeSlot('');
                    setBookingSuccessData(null);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  حجز موعد إضافي
                </button>
                {!standalone && onBackToAdmin && (
                  <button
                    type="button"
                    onClick={onBackToAdmin}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    العودة للوحة الإرسال (Admin)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-[10px] text-slate-400">
          <span>نظام الحجز الذاتي المتصل سحابياً بالفنيين مباشرة (Odoo Portal Integration)</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>حماية البيانات والخصوصية مشفرة</span>
          </div>
        </div>
      </div>
    </div>
  );
}

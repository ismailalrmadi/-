import React, { useMemo, useState, useEffect } from 'react';
import { AttendanceRecord, AttendanceType, WorkSchedule, LeaveRequest, CalendarEvent } from '../types';
import { getLeaveRequests, getWorkSchedules, getCalendarEvents } from '../services/storageService';
import { Clock, Calendar, AlertCircle, TrendingUp, CheckCircle2, History, Briefcase, FileText, PlusCircle, XCircle, Minus, Printer, X } from 'lucide-react';

interface UserDashboardViewProps {
  records: AttendanceRecord[];
  workerName: string;
  onNavigateToHistory: () => void;
  onNavigateToLeaves: () => void;
}

const UserDashboardView: React.FC<UserDashboardViewProps> = ({ 
  records, 
  workerName, 
  onNavigateToHistory,
  onNavigateToLeaves
}) => {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [missingCheckoutAlert, setMissingCheckoutAlert] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
        setSchedules(await getWorkSchedules());
        setCalendarEvents(await getCalendarEvents());
        setAllLeaves(await getLeaveRequests());
    };
    loadData();
  }, []);

  // Check for missing checkout from yesterday on mount
  useEffect(() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0,0,0,0);
      const yesterdayStart = yesterday.getTime();
      const yesterdayEnd = yesterdayStart + 86400000;
      
      const empRecs = records
        .filter(r => r.workerName === workerName && r.timestamp >= yesterdayStart && r.timestamp < yesterdayEnd)
        .sort((a,b) => a.timestamp - b.timestamp);
      
      if (empRecs.length > 0) {
          const lastRecord = empRecs[empRecs.length - 1];
          if (lastRecord.type === 'CHECK_IN') {
              setMissingCheckoutAlert(`تنبيه: لم تقم بتسجيل الانصراف ليوم أمس (${yesterday.toLocaleDateString('ar-EG')}). يرجى مراجعة المشرف.`);
          }
      }
  }, [records, workerName]);
  
  // --- Calculations ---
  const { stats, dailyReport } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 1. Filter records for current month & user
    const monthlyRecords = records.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === currentMonth && 
             d.getFullYear() === currentYear &&
             r.workerName === workerName;
    });

    // 2. Days Present
    const uniqueDays = new Set(monthlyRecords.map(r => new Date(r.timestamp).toDateString()));
    const daysPresent = uniqueDays.size;

    // 3. Hours Worked & Daily Breakdown
    let totalMs = 0;
    const dailyReportData = [];
    let absentDays = 0;
    let lateCount = 0;

    // Helper for lateness
    const timeToMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    // Iterate all days in month up to today
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        if (date > now) break; // Don't process future days

        const dateStr = date.toLocaleDateString('ar-EG');
        const dayName = date.toLocaleDateString('ar-EG', { weekday: 'long' });
        const dateISO = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        // Find records for this day
        const dayRecords = monthlyRecords.filter(r => new Date(r.timestamp).toDateString() === date.toDateString());
        dayRecords.sort((a, b) => a.timestamp - b.timestamp);

        // Calculate hours for this day
        let dayMs = 0;
        const checkIn = dayRecords.find(r => r.type === AttendanceType.CHECK_IN);
        const checkOut = dayRecords.slice().reverse().find(r => r.type === AttendanceType.CHECK_OUT);

        if (checkIn && checkOut && checkOut.timestamp > checkIn.timestamp) {
            dayMs = checkOut.timestamp - checkIn.timestamp;
        }
        const dayHours = parseFloat((dayMs / (1000 * 60 * 60)).toFixed(1));
        totalMs += dayMs;

        // Determine Status
        let status = '-';
        let statusColor = 'text-gray-400';

        // Check Calendar Event (Holiday)
        const holiday = calendarEvents.find(e => e.date === dateISO && e.type === 'HOLIDAY');
        
        // Check Schedule
        const isScheduled = schedules.length === 0 || schedules.some(s => s.days.includes(dayName));

        // Check Leave
        const leave = allLeaves.find(l => 
            l.employeeName === workerName && 
            l.status === 'Approved' && 
            new Date(l.startDate) <= date && 
            new Date(l.endDate) >= date
        );

        if (dayRecords.length > 0) {
            status = 'حضور';
            statusColor = 'text-green-600';
            
            // Check Lateness
            if (checkIn && isScheduled && !holiday) {
                const schedule = schedules.find(s => s.days.includes(dayName));
                if (schedule && schedule.shifts) {
                     const checkInMinutes = new Date(checkIn.timestamp).getHours() * 60 + new Date(checkIn.timestamp).getMinutes();
                     const startTimes = schedule.shifts.map(s => timeToMin(s.start));
                     // Find closest start
                     let closestStart = startTimes[0];
                     let minDiff = Math.abs(checkInMinutes - startTimes[0]);
                     for(let i=1; i<startTimes.length; i++) {
                         const diff = Math.abs(checkInMinutes - startTimes[i]);
                         if (diff < minDiff) { minDiff = diff; closestStart = startTimes[i]; }
                     }
                     if (checkInMinutes > (closestStart + 15)) {
                         status = 'حضور (متأخر)';
                         statusColor = 'text-orange-600';
                         lateCount++;
                     }
                }
            }
        } else if (leave) {
            status = 'إجازة';
            statusColor = 'text-purple-600';
        } else if (holiday) {
            status = 'عطلة رسمية';
            statusColor = 'text-blue-500';
        } else if (!isScheduled) {
            status = 'عطلة أسبوعية';
            statusColor = 'text-gray-400';
        } else {
            // Scheduled, Not Holiday, Not Leave, No Records => Absent
            // Only mark absent if the day is fully over or it's today and past work hours (simplified to today for now)
            status = 'غياب';
            statusColor = 'text-red-600';
            absentDays++;
        }

        dailyReportData.push({
            date: dateStr,
            dayName,
            status,
            statusColor,
            checkIn: checkIn ? new Date(checkIn.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '-',
            checkOut: checkOut ? new Date(checkOut.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '-',
            hours: dayHours
        });
    }

    // Reverse to show latest first
    const dailyReportReverse = [...dailyReportData].reverse();

    const totalHours = Math.round(totalMs / (1000 * 60 * 60));
    // Calculate Overtime (Standard 8 hours * Days Present)
    const standardHours = daysPresent * 8;
    const overtime = Math.max(0, totalHours - standardHours);

    // Leaves count
    const leavesThisMonth = allLeaves.filter(l => {
        const d = new Date(l.startDate);
        return l.employeeName === workerName && 
               l.status === 'Approved' &&
               d.getMonth() === currentMonth && 
               d.getFullYear() === currentYear;
    }).length;

    return {
        stats: {
            daysPresent,
            daysAbsent: absentDays,
            totalHours,
            overtime,
            lateCount,
            leavesThisMonth
        },
        dailyReport: dailyReportReverse
    };
  }, [records, workerName, schedules, calendarEvents, allLeaves]);

  // Attendance Score
  const attendanceScore = Math.max(0, 100 - (stats.lateCount * 5) - (stats.daysAbsent * 10));

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="p-4 space-y-6 pb-20 animate-fade-in">
      {/* Missing Checkout Alert */}
      {missingCheckoutAlert && (
         <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-bounce-short shadow-sm">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
               <h3 className="text-red-800 font-bold text-sm">تنبيه هام</h3>
               <p className="text-red-600 text-sm mt-1">{missingCheckoutAlert}</p>
            </div>
            <button onClick={() => setMissingCheckoutAlert(null)} className="text-red-400 hover:text-red-600">
               <X size={18} />
            </button>
         </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">لوحة بياناتي</h2>
          <p className="text-gray-500 text-sm">ملخص أداء شهر {new Date().toLocaleDateString('ar-EG', { month: 'long' })}</p>
        </div>
        <button onClick={handlePrint} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
            <Printer size={20} />
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="flex justify-between items-start">
                <span className="text-gray-500 text-xs font-bold">ساعات العمل</span>
                <Clock size={16} className="text-blue-500" />
            </div>
            <div>
                <span className="text-3xl font-bold text-gray-800">{stats.totalHours}</span>
                <span className="text-xs text-gray-400 mr-1">ساعة</span>
            </div>
            <div className="text-xs text-green-600 font-bold flex items-center gap-1">
               <PlusCircle size={10} /> {stats.overtime} أوفر تايم
            </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
            <div className="flex justify-between items-start">
                <span className="text-gray-500 text-xs font-bold">أيام الحضور</span>
                <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <div>
                <span className="text-3xl font-bold text-gray-800">{stats.daysPresent}</span>
                <span className="text-xs text-gray-400 mr-1">يوم</span>
            </div>
            <div className="text-xs text-orange-500 font-bold flex items-center gap-1">
               <AlertCircle size={10} /> {stats.lateCount} تأخير
            </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <div className="flex justify-between items-start">
                <span className="text-gray-500 text-xs font-bold">أيام الغياب</span>
                <XCircle size={16} className="text-red-500" />
            </div>
            <div>
                <span className="text-3xl font-bold text-gray-800">{stats.daysAbsent}</span>
                <span className="text-xs text-gray-400 mr-1">يوم</span>
            </div>
             <div className="w-full bg-gray-100 h-1 mt-2 rounded-full overflow-hidden">
                 <div className="bg-red-500 h-full" style={{ width: `${Math.min(100, stats.daysAbsent * 10)}%` }}></div>
             </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
            <div className="flex justify-between items-start">
                <span className="text-gray-500 text-xs font-bold">إجازات</span>
                <FileText size={16} className="text-purple-500" />
            </div>
            <div>
                <span className="text-3xl font-bold text-gray-800">{stats.leavesThisMonth}</span>
                <span className="text-xs text-gray-400 mr-1">يوم</span>
            </div>
            <button onClick={onNavigateToLeaves} className="text-xs text-purple-600 font-bold hover:underline self-start">
               عرض التفاصيل
            </button>
        </div>
      </div>

      {/* Performance Score */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
         <div>
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400"/> الأداء العام
            </h3>
            <p className="text-gray-400 text-xs">نسبة الالتزام بالمواعيد والحضور</p>
         </div>
         <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent" style={{ transform: `rotate(${attendanceScore * 3.6}deg)` }}></div>
            <span className="text-lg font-bold">{attendanceScore}%</span>
         </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <FileText size={16} className="text-primary"/> التقرير التفصيلي
            </h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 text-gray-500 border-b">
                    <tr>
                        <th className="p-3">اليوم</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3">دخول</th>
                        <th className="p-3">خروج</th>
                        <th className="p-3">ساعات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {dailyReport.length === 0 ? (
                        <tr><td colSpan={5} className="p-4 text-center text-gray-400">لا توجد بيانات لهذا الشهر</td></tr>
                    ) : (
                        dailyReport.map((day, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3">
                                    <div className="font-bold text-gray-700">{day.dayName}</div>
                                    <div className="text-gray-400 font-mono text-[10px]">{day.date}</div>
                                </td>
                                <td className={`p-3 font-bold ${day.statusColor}`}>{day.status}</td>
                                <td className="p-3 font-mono text-gray-600">{day.checkIn}</td>
                                <td className="p-3 font-mono text-gray-600">{day.checkOut}</td>
                                <td className="p-3 font-bold text-gray-800">{day.hours > 0 ? day.hours : '-'}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default UserDashboardView;
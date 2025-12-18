import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, Map as MapIcon, CalendarRange, Bell, FileText, 
  Activity, LayoutDashboard, Clock, Search, 
  MapPin, CheckCircle, XCircle, ShieldAlert,
  Plus, Edit, Trash2, X, UserX, BarChart3, Printer, Lock,
  ChevronRight, LogOut, Filter, Shield, User, UserCog, Key, RefreshCw,
  Check, Ban
} from 'lucide-react';
import { 
  getEmployees, getRecords, getGeofences, getLeaveRequests, 
  getNotifications, getWorkSchedules, getAuditLogs,
  saveEmployee, deleteEmployee, saveGeofence, deleteGeofence,
  saveWorkSchedule, deleteWorkSchedule, updateLeaveStatus,
  checkAndGenerateAbsenceAlerts, getRoleConfigs, saveRoleConfigs, getCalendarEvents,
  subscribeToRecords, subscribeToEmployees, subscribeToNotifications
} from '../services/storageService';
import { AttendanceRecord, AttendanceType, Employee, Geofence, WorkSchedule, LeaveRequest, Notification, AuditLog, RoleConfig, Permission, CalendarEvent } from '../types';

type Tab = 'OVERVIEW' | 'EMPLOYEES' | 'ATTENDANCE' | 'GEOFENCES' | 'LEAVES' | 'SCHEDULES' | 'LOGS' | 'REPORTS' | 'ROLES';

// Helper to safely render text that might be an object
const safeRender = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    try {
      // If it's a Firestore timestamp or specific object we know
      if (val.seconds) return new Date(val.seconds * 1000).toLocaleString();
      return JSON.stringify(val);
    } catch (e) {
      return 'بيانات غير نصية';
    }
  }
  return String(val);
};

const DashboardView: React.FC<{ onBack: () => void; userRole: string }> = ({ onBack, userRole }) => {
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Report Dates
  const [reportStartDate, setReportStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); 
    return date.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'EMPLOYEE' | 'GEOFENCE' | 'SCHEDULE' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Initial Load - Optimized to pull only necessary data
  useEffect(() => {
    let isMounted = true;
    const loadEssentialData = async () => {
      setLoading(true);
      try {
        const [emps, geos, roles] = await Promise.all([
          getEmployees(), 
          getGeofences(),
          getRoleConfigs()
        ]);
        
        if (!isMounted) return;
        setEmployees(emps);
        setGeofences(geos);
        setRoleConfigs(roles);
        
        if (userRole === 'ADMIN') {
          setUserPermissions(['VIEW_OVERVIEW', 'MANAGE_EMPLOYEES', 'VIEW_ATTENDANCE', 'MANAGE_GEOFENCES', 'MANAGE_LEAVES', 'MANAGE_SCHEDULES', 'VIEW_REPORTS', 'VIEW_LOGS', 'MANAGE_ROLES']);
        } else {
          const config = roles.find(c => c.role === userRole);
          setUserPermissions(config ? config.permissions : []);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadEssentialData();
    return () => { isMounted = false; };
  }, [userRole]);

  // Lazy load tab-specific data
  useEffect(() => {
    if (activeTab === 'LEAVES') getLeaveRequests().then(setLeaves);
    if (activeTab === 'SCHEDULES') getWorkSchedules().then(setSchedules);
    if (activeTab === 'LOGS') getAuditLogs().then(setLogs);
    if (activeTab === 'OVERVIEW' || activeTab === 'REPORTS') getCalendarEvents().then(setCalendarEvents);
  }, [activeTab]);

  // Optimized Real-time Subscriptions (Lower limit for better performance)
  useEffect(() => {
    const unsubRecords = subscribeToRecords((data) => setRecords(data), 30); // أحدث 30 سجل فقط للتنفيذ السريع
    const unsubEmployees = subscribeToEmployees((data) => setEmployees(data));
    const unsubNotifications = subscribeToNotifications((data) => setNotifications(data));
    return () => { unsubRecords(); unsubEmployees(); unsubNotifications(); };
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    const [geos, lvs, schs, lgs] = await Promise.all([getGeofences(), getLeaveRequests(), getWorkSchedules(), getAuditLogs()]);
    setGeofences(geos); setLeaves(lvs); setSchedules(schs); setLogs(lgs);
    setLoading(false);
  }, []);

  const can = (permission: Permission): boolean => userRole === 'ADMIN' || userPermissions.includes(permission);

  const navItems = useMemo(() => [
    { id: 'OVERVIEW', label: 'نظرة عامة', icon: Activity, permission: 'VIEW_OVERVIEW' },
    { id: 'EMPLOYEES', label: 'الموظفين', icon: Users, permission: 'MANAGE_EMPLOYEES' },
    { id: 'ATTENDANCE', label: 'السجلات', icon: Clock, permission: 'VIEW_ATTENDANCE' },
    { id: 'GEOFENCES', label: 'المواقع', icon: MapIcon, permission: 'MANAGE_GEOFENCES' },
    { id: 'LEAVES', label: 'الإجازات', icon: FileText, permission: 'MANAGE_LEAVES' },
    { id: 'SCHEDULES', label: 'الجداول', icon: CalendarRange, permission: 'MANAGE_SCHEDULES' },
    { id: 'REPORTS', label: 'التقارير', icon: BarChart3, permission: 'VIEW_REPORTS' },
    { id: 'LOGS', label: 'التدقيق', icon: ShieldAlert, permission: 'VIEW_LOGS' },
    { id: 'ROLES', label: 'الصلاحيات', icon: Lock, permission: 'MANAGE_ROLES' },
  ].filter(item => can(item.permission as Permission)), [userPermissions, userRole]);

  // Report logic optimized
  const calculatedReportData = useMemo(() => {
    if (activeTab !== 'REPORTS' || records.length === 0) return [];
    
    const start = new Date(reportStartDate).getTime();
    const end = new Date(reportEndDate).setHours(23, 59, 59, 999);

    const recordsMap = new Map<string, AttendanceRecord[]>();
    for (const r of records) {
      if (r.timestamp >= start && r.timestamp <= end) {
        const group = recordsMap.get(r.workerName) || [];
        group.push(r);
        recordsMap.set(r.workerName, group);
      }
    }

    return employees.map(emp => {
      const empRecs = recordsMap.get(emp.name) || [];
      empRecs.sort((a, b) => a.timestamp - b.timestamp);
      
      const uniqueDays = new Set(empRecs.map(r => new Date(r.timestamp).toDateString()));
      let totalMs = 0;
      
      const dayGroups = new Map<string, AttendanceRecord[]>();
      for (const r of empRecs) {
        const dStr = new Date(r.timestamp).toDateString();
        const dGroup = dayGroups.get(dStr) || [];
        dGroup.push(r);
        dayGroups.set(dStr, dGroup);
      }

      dayGroups.forEach(dayRecs => {
        const cin = dayRecs.find(r => r.type === AttendanceType.CHECK_IN);
        const cout = [...dayRecs].reverse().find(r => r.type === AttendanceType.CHECK_OUT);
        if (cin && cout && cout.timestamp > cin.timestamp) {
          totalMs += (cout.timestamp - cin.timestamp);
        }
      });

      return {
        id: emp.id, 
        name: emp.name, 
        daysPresent: uniqueDays.size, 
        totalHours: (totalMs / 3600000).toFixed(1), 
        status: emp.status
      };
    });
  }, [activeTab, employees, records, reportStartDate, reportEndDate]);

  const handleOpenModal = (type: 'EMPLOYEE' | 'GEOFENCE' | 'SCHEDULE', item: any = null) => {
    setModalType(type);
    let newItem = item ? JSON.parse(JSON.stringify(item)) : {};
    if (type === 'GEOFENCE' && newItem.center) {
        newItem.latitude = newItem.center.latitude;
        newItem.longitude = newItem.center.longitude;
    }
    setEditingItem(newItem); setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const id = editingItem.id || Date.now().toString();
      if (modalType === 'EMPLOYEE') {
        await saveEmployee({ ...editingItem, id, role: editingItem.role || 'USER', status: editingItem.status || 'Active' });
      } else if (modalType === 'GEOFENCE') {
        await saveGeofence({ 
          id, name: editingItem.name, 
          center: { latitude: parseFloat(editingItem.latitude), longitude: parseFloat(editingItem.longitude) },
          radiusMeters: parseInt(editingItem.radiusMeters), active: editingItem.active !== false 
        });
      }
      setIsModalOpen(false); 
      handleRefresh();
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="الموظفين" value={employees.length.toString()} icon={Users} color="bg-blue-500" />
        <StatCard title="حضور اليوم" value={records.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString() && r.type === AttendanceType.CHECK_IN).length.toString()} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="طلبات الإجازة" value={leaves.length.toString()} icon={FileText} color="bg-orange-500" />
        <StatCard title="إشعارات" value={notifications.filter(n => !n.read).length.toString()} icon={Bell} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Bell size={18} /> آخر التنبيهات</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {notifications.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">لا توجد إشعارات</p> : 
             notifications.slice(0, 10).map(note => (
              <div key={note.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border-r-4 border-primary/30">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-gray-800 truncate">{safeRender(note.title)}</h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{safeRender(note.message)}</p>
                </div>
                <span className="text-[10px] text-gray-400">{safeRender(note.date)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Activity size={18} /> النشاط المباشر</h3>
          <div className="space-y-3">
            {records.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">لا توجد سجلات اليوم</p> :
             records.slice(0, 6).map(rec => (
              <div key={rec.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${rec.type === AttendanceType.CHECK_IN ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {rec.type === AttendanceType.CHECK_IN ? <Check size={14}/> : <LogOut size={14}/>}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">{safeRender(rec.workerName)}</div>
                    <div className="text-[10px] text-gray-400">{new Date(rec.timestamp).toLocaleTimeString('ar-EG')}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rec.locationVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {rec.locationVerified ? 'داخل الموقع' : 'خارج الموقع'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
       <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex items-center gap-2"><ShieldAlert size={18} /> سجل التدقيق والنظام</div>
       <div className="overflow-x-auto">
         <table className="w-full text-right text-sm">
           <thead className="bg-gray-100 text-gray-500 border-b">
             <tr><th className="p-3">الوقت</th><th className="p-3">المستخدم</th><th className="p-3">الإجراء</th><th className="p-3">التفاصيل</th></tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {logs.slice(0, 50).map(log => (
               <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                 <td className="p-3 font-mono text-[10px] text-gray-500">{new Date(log.timestamp).toLocaleString('ar-EG')}</td>
                 <td className="p-3 font-bold">{safeRender(log.user)}</td>
                 <td className="p-3 text-primary font-medium">{safeRender(log.action)}</td>
                 <td className="p-3 text-gray-600 max-w-xs truncate">{safeRender(log.details)}</td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 font-sans" dir="rtl">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l shadow-sm shrink-0">
        <div className="p-6 border-b"><h1 className="text-xl font-bold text-primary flex items-center gap-2"><LayoutDashboard /> لوحة التحكم</h1></div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === item.id ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
              <item.icon size={20} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t"><button onClick={onBack} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><LogOut size={18} /> خروج</button></div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b p-4 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
             <button onClick={onBack} className="md:hidden text-gray-500"><ChevronRight size={24} className="rotate-180" /></button>
             <h2 className="text-xl font-bold text-gray-800">{navItems.find(i => i.id === activeTab)?.label}</h2>
          </div>
          <div className="relative w-48 md:w-64">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
            <input type="text" placeholder="بحث سريع..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pr-9 pl-4 py-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth bg-[#f8fafc]">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center text-primary gap-3">
               <RefreshCw className="animate-spin" size={32} />
               <p className="font-bold text-sm">جاري مزامنة البيانات...</p>
             </div>
           ) : (
             <>
               {activeTab === 'OVERVIEW' && renderOverview()}
               {activeTab === 'LOGS' && renderLogs()}
               {activeTab === 'REPORTS' && (
                 <div className="space-y-4 animate-fade-in">
                   <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap gap-4 items-end no-print">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">من تاريخ</label>
                        <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="border rounded-lg p-2 text-sm bg-gray-50" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">إلى تاريخ</label>
                        <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="border rounded-lg p-2 text-sm bg-gray-50" />
                      </div>
                      <button onClick={() => window.print()} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-800 transition-colors mr-auto"><Printer size={18} /> طباعة التقرير</button>
                   </div>
                   <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-gray-100 border-b">
                          <tr><th className="p-4">الموظف</th><th className="p-4 text-center">أيام الحضور</th><th className="p-4 text-center">ساعات العمل</th><th className="p-4 text-center">الحالة</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {calculatedReportData.map(row => (
                            <tr key={row.id} className="hover:bg-gray-50">
                              <td className="p-4 font-bold text-gray-800">{safeRender(row.name)}</td>
                              <td className="p-4 text-center text-green-600 font-bold">{row.daysPresent}</td>
                              <td className="p-4 text-center font-mono">{row.totalHours} ساعة</td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.status === 'Active' ? 'نشط' : 'متوقف'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                 </div>
               )}
               {activeTab === 'EMPLOYEES' && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold flex items-center gap-2"><Users size={18} className="text-primary"/> الموظفين</h3>
                      <button onClick={() => handleOpenModal('EMPLOYEE')} className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 shadow-sm"><Plus size={16}/> إضافة موظف</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-500"><tr><th className="p-4">الاسم</th><th className="p-4">الدور</th><th className="p-4">رقم الهاتف</th><th className="p-4">الحالة</th><th className="p-4 text-left">إجراء</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">{employees.map(e => (
                          <tr key={e.id} className="hover:bg-gray-50">
                            <td className="p-4 font-bold">{safeRender(e.name)}</td>
                            <td className="p-4 text-xs font-mono">{safeRender(e.role)}</td>
                            <td className="p-4 text-gray-500 font-mono">{safeRender(e.phone)}</td>
                            <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{e.status}</span></td>
                            <td className="p-4 text-left"><button onClick={() => handleOpenModal('EMPLOYEE', e)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Edit size={16}/></button></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
               )}
               {/* Other tabs placeholders */}
               {!['OVERVIEW', 'LOGS', 'REPORTS', 'EMPLOYEES'].includes(activeTab) && (
                 <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2">
                   <Clock size={48} className="opacity-20" />
                   <p>هذا القسم قيد التجهيز وسيتم تفعيله قريباً</p>
                 </div>
               )}
             </>
           )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b flex justify-between items-center bg-primary text-white"><h3 className="font-bold">تحديث البيانات</h3><button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button></div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {modalType === 'EMPLOYEE' && (
                <>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">اسم الموظف الكامل</label><input required type="text" value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white outline-none transition-all" /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">كلمة المرور الافتراضية</label><input type="text" value={editingItem.password || ''} onChange={e => setEditingItem({...editingItem, password: e.target.value})} className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white outline-none transition-all" /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">الدور الوظيفي</label><select value={editingItem.role || 'USER'} onChange={e => setEditingItem({...editingItem, role: e.target.value})} className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white outline-none transition-all"><option value="USER">موظف عادي</option><option value="ADMIN">مسئول نظام</option><option value="SUPERVISOR">مشرف موقع</option></select></div>
                </>
              )}
              <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-800 transition-all flex justify-center items-center gap-2">
                {loading ? <RefreshCw className="animate-spin" size={18} /> : 'حفظ التعديلات'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition-transform hover:scale-[1.02]">
    <div className="min-w-0">
      <p className="text-gray-400 text-[10px] font-bold mb-1 truncate uppercase">{title}</p>
      <h3 className="text-xl font-bold text-gray-800">{safeRender(value)}</h3>
    </div>
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 ${color} shadow-sm`}><Icon size={18} /></div>
  </div>
);

export default DashboardView;
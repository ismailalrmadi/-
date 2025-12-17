import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Map as MapIcon, CalendarRange, Bell, FileText, 
  Activity, LayoutDashboard, Clock, Search, 
  MapPin, CheckCircle, XCircle, ShieldAlert,
  Plus, Edit, Trash2, X, UserX, BarChart3, Printer, Lock,
  ChevronRight, LogOut, Filter, Phone, Shield, User, UserCog, Key, RefreshCw,
  Check, Ban
} from 'lucide-react';
import { 
  getEmployees, getRecords, getGeofences, getLeaveRequests, 
  getNotifications, getWorkSchedules, getAuditLogs,
  saveEmployee, deleteEmployee, saveGeofence, deleteGeofence,
  saveWorkSchedule, deleteWorkSchedule, updateLeaveStatus,
  checkAndGenerateAbsenceAlerts, getRoleConfigs, saveRoleConfigs, hasPermission, getCalendarEvents,
  subscribeToRecords, subscribeToEmployees, subscribeToNotifications
} from '../services/storageService';
import { AttendanceRecord, AttendanceType, Employee, Geofence, WorkSchedule, LeaveRequest, Notification, AuditLog, RoleConfig, Permission, CalendarEvent } from '../types';

type Tab = 'OVERVIEW' | 'EMPLOYEES' | 'ATTENDANCE' | 'GEOFENCES' | 'LEAVES' | 'SCHEDULES' | 'LOGS' | 'REPORTS' | 'ROLES';

const DashboardView: React.FC<{ onBack: () => void; userRole: string }> = ({ onBack, userRole }) => {
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters State for Employees
  const [employeeFilterRole, setEmployeeFilterRole] = useState<string>('ALL');
  const [employeeFilterStatus, setEmployeeFilterStatus] = useState<string>('ALL');

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

  // Report State
  const [reportStartDate, setReportStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); 
    return date.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; 
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'EMPLOYEE' | 'GEOFENCE' | 'SCHEDULE' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Load Data Async with Real-time listeners for critical data
  useEffect(() => {
    setLoading(true);

    // Static Data fetch
    const loadStaticData = async () => {
        try {
          await getEmployees(); // Trigger seeding
          setGeofences(await getGeofences());
          setLeaves(await getLeaveRequests());
          setSchedules(await getWorkSchedules());
          setLogs(await getAuditLogs());
          setRoleConfigs(await getRoleConfigs());
          setCalendarEvents(await getCalendarEvents());
          
          if (userRole === 'ADMIN') {
              setUserPermissions(['VIEW_OVERVIEW', 'MANAGE_EMPLOYEES', 'VIEW_ATTENDANCE', 'MANAGE_GEOFENCES', 'MANAGE_LEAVES', 'MANAGE_SCHEDULES', 'VIEW_REPORTS', 'VIEW_LOGS', 'MANAGE_ROLES']);
          } else {
              const configs = await getRoleConfigs();
              const config = configs.find(c => c.role === userRole);
              setUserPermissions(config ? config.permissions : []);
          }
        } catch (error) {
          console.error("Error loading static data:", error);
        } finally {
          setLoading(false);
        }
    };
    loadStaticData();

    // Real-time Listeners
    // Optimized: Only fetch 100 recent records for the live view
    // For reports, we might need more, but we'll rely on what's loaded or fetch specifically for reports if needed later.
    const unsubRecords = subscribeToRecords((data) => setRecords(data), 500); 
    const unsubEmployees = subscribeToEmployees((data) => setEmployees(data));
    const unsubNotifications = subscribeToNotifications((data) => setNotifications(data));

    return () => {
      unsubRecords();
      unsubEmployees();
      unsubNotifications();
    };
  }, [userRole]);

  const handleRefresh = async () => {
    setLoading(true);
    setGeofences(await getGeofences());
    setLeaves(await getLeaveRequests());
    setSchedules(await getWorkSchedules());
    setLogs(await getAuditLogs());
    setLoading(false);
  };

  const can = (permission: Permission): boolean => {
    return userRole === 'ADMIN' || userPermissions.includes(permission);
  };

  const navItems = [
    { id: 'OVERVIEW', label: 'نظرة عامة', icon: Activity, permission: 'VIEW_OVERVIEW' },
    { id: 'EMPLOYEES', label: 'الموظفين', icon: Users, permission: 'MANAGE_EMPLOYEES' },
    { id: 'ATTENDANCE', label: 'السجلات', icon: Clock, permission: 'VIEW_ATTENDANCE' },
    { id: 'GEOFENCES', label: 'المواقع', icon: MapIcon, permission: 'MANAGE_GEOFENCES' },
    { id: 'LEAVES', label: 'الإجازات', icon: FileText, permission: 'MANAGE_LEAVES' },
    { id: 'SCHEDULES', label: 'الجداول', icon: CalendarRange, permission: 'MANAGE_SCHEDULES' },
    { id: 'REPORTS', label: 'التقارير', icon: BarChart3, permission: 'VIEW_REPORTS' },
    { id: 'LOGS', label: 'التدقيق', icon: ShieldAlert, permission: 'VIEW_LOGS' },
    { id: 'ROLES', label: 'الصلاحيات', icon: Lock, permission: 'MANAGE_ROLES' },
  ].filter(item => can(item.permission as Permission));

  // --- Handlers ---
  const handleCheckAbsence = async () => {
    const count = await checkAndGenerateAbsenceAlerts();
    if (count > 0) alert(`تم رصد ${count} حالات غياب جديدة وإرسال تنبيهات.`);
    else alert("لم يتم رصد حالات غياب جديدة.");
  };

  const setReportMonth = (offset: number) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    const offsetDate = (d: Date) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    setReportStartDate(offsetDate(date));
    setReportEndDate(offsetDate(lastDay));
  };

  const handleOpenModal = (type: 'EMPLOYEE' | 'GEOFENCE' | 'SCHEDULE', item: any = null) => {
    setModalType(type);
    let newItem = item ? JSON.parse(JSON.stringify(item)) : {}; 
    
    // Initializing nested properties for controlled inputs
    if (type === 'SCHEDULE' && !item) {
        newItem = { 
            shiftName: '', 
            shifts: [{ name: 'صباحي', start: '08:00', end: '12:00' }, { name: 'مسائي', start: '13:00', end: '17:00' }], 
            days: [] 
        };
    } else if (type === 'SCHEDULE' && item && !item.shifts) {
        newItem.shifts = [{ name: 'دوام كامل', start: item.startTime || '08:00', end: item.endTime || '16:00' }];
    } else if (type === 'GEOFENCE') {
        if (!item) {
             newItem = { name: '', radiusMeters: 500, center: { latitude: 24.7136, longitude: 46.6753 } };
        }
        if (newItem.center) {
            newItem.latitude = newItem.center.latitude;
            newItem.longitude = newItem.center.longitude;
        }
    }

    setEditingItem(newItem); 
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setModalType(null);
  };

  const handleDelete = async (type: 'EMPLOYEE' | 'GEOFENCE' | 'SCHEDULE', id: string) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;
    if (type === 'EMPLOYEE') await deleteEmployee(id);
    if (type === 'GEOFENCE') await deleteGeofence(id);
    if (type === 'SCHEDULE') await deleteWorkSchedule(id);
    handleRefresh();
  };

  const toggleEmployeeStatus = async (emp: Employee) => {
    const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    await saveEmployee({ ...emp, status: newStatus });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingItem.id || Date.now().toString();
    
    if (modalType === 'EMPLOYEE') {
      const newEmp: Employee = {
        id,
        name: editingItem.name,
        role: editingItem.role || 'USER',
        phone: editingItem.phone || '',
        status: editingItem.status || 'Active',
        password: editingItem.password || '123456'
      };
      await saveEmployee(newEmp);
    } else if (modalType === 'GEOFENCE') {
      const newGeo: Geofence = {
        id,
        name: editingItem.name,
        center: { 
          latitude: parseFloat(editingItem.latitude || editingItem.center?.latitude || 24.7136), 
          longitude: parseFloat(editingItem.longitude || editingItem.center?.longitude || 46.6753) 
        },
        radiusMeters: parseInt(editingItem.radiusMeters || 500),
        active: editingItem.active !== false
      };
      await saveGeofence(newGeo);
    } else if (modalType === 'SCHEDULE') {
      const newSch: WorkSchedule = {
        id,
        shiftName: editingItem.shiftName,
        shifts: editingItem.shifts,
        days: typeof editingItem.days === 'string' ? editingItem.days.split(',').map((d: string) => d.trim()) : (editingItem.days || [])
      };
      await saveWorkSchedule(newSch);
    }
    handleCloseModal();
    handleRefresh();
  };

  const handleLeaveAction = async (id: string, action: 'Approved' | 'Rejected') => {
    await updateLeaveStatus(id, action);
    handleRefresh();
  };

  const handlePrint = () => window.print();

  const handleRolePermissionChange = async (roleName: string, permission: Permission) => {
    const updatedConfigs = roleConfigs.map(config => {
      if (config.role === roleName) {
        const hasPerm = config.permissions.includes(permission);
        const newPerms = hasPerm 
          ? config.permissions.filter(p => p !== permission)
          : [...config.permissions, permission];
        return { ...config, permissions: newPerms };
      }
      return config;
    });
    await saveRoleConfigs(updatedConfigs);
    setRoleConfigs(updatedConfigs);
  };

  const filteredData = (data: any[]) => {
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter(item => Object.values(item).some(val => 
      typeof val === 'string' || typeof val === 'number' ? String(val).toLowerCase().includes(lowerQuery) : false
    ));
  };

  // --- Optimized Report Calculation ---
  // Using Maps to reduce complexity from O(N^2) to O(N)
  const reportData = useMemo(() => {
    const start = new Date(reportStartDate);
    start.setHours(0,0,0,0);
    const end = new Date(reportEndDate);
    end.setHours(23,59,59,999);
    const startTime = start.getTime();
    const endTime = end.getTime();

    // 1. Group records by employee (Pre-processing)
    // Map<EmployeeName, Record[]>
    const recordsMap = new Map<string, AttendanceRecord[]>();
    
    // Filter by date range first, then group
    for (const r of records) {
        if (r.timestamp >= startTime && r.timestamp <= endTime) {
            if (!recordsMap.has(r.workerName)) {
                recordsMap.set(r.workerName, []);
            }
            recordsMap.get(r.workerName)?.push(r);
        }
    }

    // Sort records for each employee once
    recordsMap.forEach((recs) => recs.sort((a, b) => a.timestamp - b.timestamp));

    const today = new Date();

    return employees.map(emp => {
      const empRecords = recordsMap.get(emp.name) || [];
      
      const uniqueDaysPresentSet = new Set<string>();
      let totalMilliseconds = 0;
      
      // Calculate presence and hours
      const dayGroups = new Map<string, AttendanceRecord[]>();
      
      for (const r of empRecords) {
          const day = new Date(r.timestamp).toDateString();
          uniqueDaysPresentSet.add(day);
          if (!dayGroups.has(day)) dayGroups.set(day, []);
          dayGroups.get(day)?.push(r);
      }

      dayGroups.forEach((dayRecs) => {
         // Assuming grouped records are already sorted
         const checkIn = dayRecs.find(r => r.type === AttendanceType.CHECK_IN);
         const checkOut = dayRecs.slice().reverse().find(r => r.type === AttendanceType.CHECK_OUT);
         if (checkIn && checkOut && checkOut.timestamp > checkIn.timestamp) {
             totalMilliseconds += (checkOut.timestamp - checkIn.timestamp);
         }
      });

      const daysPresent = uniqueDaysPresentSet.size;

      // Calculate Absence (Only loop days once per employee)
      let absentDays = 0;
      let loopDate = new Date(start);
      
      while (loopDate <= end && loopDate <= today) {
        const dayStr = loopDate.toDateString();
        
        if (!uniqueDaysPresentSet.has(dayStr)) {
            const dateISO = new Date(loopDate.getTime() - (loopDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const dayName = loopDate.toLocaleDateString('ar-EG', { weekday: 'long' });
            
            const isHoliday = calendarEvents.some(e => e.date === dateISO && e.type === 'HOLIDAY');
            const isScheduledDay = schedules.length === 0 || schedules.some(s => s.days.includes(dayName));

            if (isScheduledDay && !isHoliday) {
                const onLeave = leaves.some(l => 
                    l.employeeName === emp.name && l.status === 'Approved' &&
                    new Date(l.startDate) <= loopDate && new Date(l.endDate) >= loopDate
                );
                if (!onLeave) absentDays++;
            }
        }
        loopDate.setDate(loopDate.getDate() + 1);
      }

      const totalHours = parseFloat((totalMilliseconds / (1000 * 60 * 60)).toFixed(1));
      const standardHours = daysPresent * 8;
      const overtimeHours = totalHours > standardHours ? (totalHours - standardHours).toFixed(1) : "0";
      
      const lastRecord = empRecords.length > 0 ? empRecords[empRecords.length - 1] : null;
      const lastStatus = lastRecord ? (lastRecord.type === AttendanceType.CHECK_IN ? 'داخل العمل' : 'انصرف') : '-';

      return {
        id: emp.id, name: emp.name, role: emp.role, daysPresent, absentDays,
        totalHours: totalHours.toFixed(1), overtimeHours, lastStatus, status: emp.status
      };
    });
  }, [employees, records, reportStartDate, reportEndDate, calendarEvents, schedules, leaves]);

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الموظفين" value={employees.length.toString()} icon={Users} color="bg-blue-500" />
        <StatCard title="حضور اليوم" value={records.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString() && r.type === AttendanceType.CHECK_IN).length.toString()} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="طلبات معلقة" value={leaves.filter(l => l.status === 'Pending').length.toString()} icon={FileText} color="bg-orange-500" />
        <StatCard title="إشعارات جديدة" value={notifications.filter(n => !n.read).length.toString()} icon={Bell} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-gray-700 flex items-center gap-2">
               <Bell size={18} /> آخر الإشعارات
             </h3>
             <button onClick={handleCheckAbsence} className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-100 transition flex items-center gap-1">
                <UserX size={14} /> فحص الغياب
             </button>
          </div>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {notifications.length === 0 ? <p className="text-gray-400 text-sm">لا توجد إشعارات</p> : 
             notifications.slice(0, 20).map(note => (
              <div key={note.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${typeof note.title === 'string' && note.title.includes('غياب') ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <div>
                  <h4 className="font-bold text-sm text-gray-800">{String(note.title)}</h4>
                  <p className="text-sm text-gray-600">{String(note.message)}</p>
                  <span className="text-xs text-gray-400">{String(note.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Activity size={18} /> النشاط الأخير (Live)
          </h3>
          <div className="space-y-3">
            {records.slice(0, 5).map(rec => (
              <div key={rec.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rec.type === AttendanceType.CHECK_IN ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {rec.type === AttendanceType.CHECK_IN ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                  </div>
                  <div>
                    <div className="font-bold">{rec.workerName}</div>
                    <div className="text-xs text-gray-500">{new Date(rec.timestamp).toLocaleTimeString('ar-EG')}</div>
                  </div>
                </div>
                {rec.locationVerified ? 
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">داخل الموقع</span> : 
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">خارج الموقع</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoles = () => {
    const permissionsList: { key: Permission, label: string }[] = [
      { key: 'VIEW_OVERVIEW', label: 'مشاهدة النظرة العامة' },
      { key: 'MANAGE_EMPLOYEES', label: 'إدارة الموظفين' },
      { key: 'VIEW_ATTENDANCE', label: 'مشاهدة السجلات' },
      { key: 'MANAGE_GEOFENCES', label: 'إدارة المواقع' },
      { key: 'MANAGE_LEAVES', label: 'إدارة الإجازات' },
      { key: 'MANAGE_SCHEDULES', label: 'إدارة الجداول' },
      { key: 'VIEW_REPORTS', label: 'التقارير' },
      { key: 'VIEW_LOGS', label: 'السجلات' },
      { key: 'MANAGE_ROLES', label: 'الصلاحيات' },
    ];
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-800">إدارة الأدوار والصلاحيات</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr><th className="p-4 border-b w-1/3">الصلاحية</th>{roleConfigs.map(config => (<th key={String(config.role)} className="p-4 border-b text-center">{String(config.role)}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permissionsList.map((perm) => (
                <tr key={perm.key} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{perm.label}</td>
                  {roleConfigs.map(config => (
                    <td key={String(config.role)} className="p-4 text-center">
                       <input type="checkbox" disabled={config.role === 'ADMIN' && perm.key === 'MANAGE_ROLES'} checked={config.permissions.includes(perm.key)} onChange={() => handleRolePermissionChange(String(config.role), perm.key)} className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEmployees = () => {
    let filteredEmployees = employees;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filteredEmployees = filteredEmployees.filter(item => Object.values(item).some(val => typeof val === 'string' && val.toLowerCase().includes(lowerQuery)));
    }
    if (employeeFilterRole !== 'ALL') filteredEmployees = filteredEmployees.filter(e => e.role === employeeFilterRole);
    if (employeeFilterStatus !== 'ALL') filteredEmployees = filteredEmployees.filter(e => e.status === employeeFilterStatus);

    const RoleBadge = ({ role }: { role: string }) => {
      let colors = "bg-gray-100 text-gray-700"; let Icon = User;
      const r = String(role);
      if (r === 'ADMIN') { colors = "bg-purple-100 text-purple-700"; Icon = Shield; }
      if (r === 'SUPERVISOR') { colors = "bg-amber-100 text-amber-700"; Icon = UserCog; }
      return (<span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${colors}`}><Icon size={12} />{r === 'ADMIN' ? 'مسئول' : r === 'SUPERVISOR' ? 'مشرف' : 'موظف'}</span>);
    };

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h3 className="font-bold text-gray-800 flex items-center gap-2"><Users className="text-primary" size={20} /> قائمة الموظفين <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{filteredEmployees.length}</span></h3></div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative"><select value={employeeFilterRole} onChange={(e) => setEmployeeFilterRole(e.target.value)} className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg pl-8 pr-4 py-2 focus:ring-primary focus:border-primary outline-none cursor-pointer hover:bg-gray-100 transition"><option value="ALL">جميع الأدوار</option><option value="ADMIN">مسئولين</option><option value="SUPERVISOR">مشرفين</option><option value="USER">موظفين</option></select><Filter className="absolute left-2.5 top-2.5 text-gray-400" size={14} /></div>
            <select value={employeeFilterStatus} onChange={(e) => setEmployeeFilterStatus(e.target.value)} className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-4 py-2 focus:ring-primary focus:border-primary outline-none cursor-pointer hover:bg-gray-100 transition"><option value="ALL">كل الحالات</option><option value="Active">نشط فقط</option><option value="Inactive">متوقف</option></select>
            <button onClick={() => handleOpenModal('EMPLOYEE')} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-800 transition shadow-sm ml-auto md:ml-0"><Plus size={18} /> <span className="hidden sm:inline">إضافة موظف</span></button>
          </div>
        </div>

        <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-600 text-sm border-b">
                <tr><th className="p-4 font-medium">الموظف</th><th className="p-4 font-medium">كلمة المرور</th><th className="p-4 font-medium">الدور الوظيفي</th><th className="p-4 font-medium">رقم الهاتف</th><th className="p-4 font-medium">الحالة</th><th className="p-4 font-medium text-left">إجراءات</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredEmployees.slice(0, 50).map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold shadow-sm">{String(emp.name).charAt(0)}</div><div><div className="font-bold text-gray-800">{emp.name}</div><div className="text-xs text-gray-400">ID: {emp.id.substring(0,6)}</div></div></div></td>
                    <td className="p-4 font-mono text-sm text-gray-500"><div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit"><Key size={12} className="text-gray-400" />{emp.password || '---'}</div></td>
                    <td className="p-4"><RoleBadge role={String(emp.role)} /></td>
                    <td className="p-4 text-gray-600 font-mono">{emp.phone || '-'}</td>
                    <td className="p-4"><button onClick={() => toggleEmployeeStatus(emp)} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${emp.status === 'Active' ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'}`}>{emp.status === 'Active' ? <Check size={12} /> : <Ban size={12} />}{emp.status === 'Active' ? 'نشط' : 'متوقف'}</button></td>
                    <td className="p-4"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenModal('EMPLOYEE', emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="تعديل"><Edit size={16} /></button><button onClick={() => handleDelete('EMPLOYEE', emp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف"><Trash2 size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEmployees.length === 0 && (<div className="p-8 text-center text-gray-400">لا توجد نتائج مطابقة للبحث</div>)}
        </div>

        {/* Mobile Cards View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredEmployees.slice(0, 20).map(emp => (
            <div key={emp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
               <div className={`absolute top-0 right-0 w-1 h-full ${emp.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
               <div className="flex justify-between items-start pl-2">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 font-bold text-lg">{String(emp.name).charAt(0)}</div>
                    <div><h4 className="font-bold text-gray-800 text-lg">{emp.name}</h4><div className="flex items-center gap-2 mt-1"><RoleBadge role={String(emp.role)} /><span className="text-gray-300">|</span><div className="flex items-center gap-1 text-xs text-gray-500"><Key size={10} /> {emp.password}</div></div></div>
                 </div>
                 <div className="flex flex-col gap-2"><button onClick={() => handleOpenModal('EMPLOYEE', emp)} className="p-2 bg-gray-50 text-gray-600 rounded-lg"><Edit size={16} /></button></div>
               </div>
               <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="text-xs text-gray-400">الحالة:</span><button onClick={() => toggleEmployeeStatus(emp)} className={`text-xs font-bold px-2 py-1 rounded ${emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{emp.status === 'Active' ? 'نشط (اضغط للإيقاف)' : 'متوقف (اضغط للتفعيل)'}</button></div>
                  <button onClick={() => handleDelete('EMPLOYEE', emp.id)} className="text-red-500 text-xs flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"><Trash2 size={12} /> حذف</button>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAttendance = () => {
    const list = filteredData(records);
    return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
         <h3 className="font-bold text-gray-800">سجل الحضور والانصراف</h3>
         <div className="text-sm text-gray-500">عدد السجلات: {list.length}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr><th className="p-4">الموظف</th><th className="p-4">التاريخ والوقت</th><th className="p-4">النوع</th><th className="p-4">طريقة التحقق</th><th className="p-4">الموقع</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.slice(0, 100).map(rec => (
              <tr key={rec.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold">{rec.workerName}</td>
                <td className="p-4 font-mono text-gray-600">{new Date(rec.timestamp).toLocaleDateString('ar-EG')} {new Date(rec.timestamp).toLocaleTimeString('ar-EG')}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${rec.type === AttendanceType.CHECK_IN ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{rec.type === AttendanceType.CHECK_IN ? 'حضور' : 'انصراف'}</span></td>
                <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{rec.verificationMethod === 'QR' ? 'باركود' : 'GPS'}</span></td>
                <td className="p-4">{rec.locationVerified ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14} /> صحيح</span> : <span className="text-red-500 flex items-center gap-1"><XCircle size={14} /> خارج النطاق</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length > 100 && <div className="p-4 text-center text-xs text-gray-400">يتم عرض آخر 100 سجل فقط لتحسين الأداء.</div>}
      </div>
    </div>
  )};

  const renderGeofences = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => handleOpenModal('GEOFENCE')} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-800 transition shadow-sm"><Plus size={18} /> إضافة موقع جديد</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {geofences.map(geo => (
          <div key={geo.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
             <div className="flex justify-between items-start mb-3">
               <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center"><MapPin size={20} /></div>
               <div className="flex gap-2">
                 <button onClick={() => handleOpenModal('GEOFENCE', geo)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Edit size={16} /></button>
                 <button onClick={() => handleDelete('GEOFENCE', geo.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
               </div>
             </div>
             <h4 className="font-bold text-gray-800 text-lg mb-1">{geo.name}</h4>
             <div className="space-y-1 text-sm text-gray-600">
               <div className="flex items-center gap-2"><MapIcon size={14} /> {geo.center.latitude.toFixed(4)}, {geo.center.longitude.toFixed(4)}</div>
               <div className="flex items-center gap-2"><CheckCircle size={14} /> نصف القطر: {geo.radiusMeters} متر</div>
               <div className={`flex items-center gap-2 font-bold ${geo.active ? 'text-green-600' : 'text-red-500'}`}><Activity size={14} /> {geo.active ? 'نشط' : 'غير نشط'}</div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSchedules = () => (
    <div className="space-y-4 animate-fade-in">
       <div className="flex justify-end">
        <button onClick={() => handleOpenModal('SCHEDULE')} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-800 transition shadow-sm"><Plus size={18} /> إضافة جدول عمل</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedules.map(sch => (
          <div key={sch.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-1 h-full bg-purple-500"></div>
             <div className="flex justify-between items-start mb-4 pl-2">
                <div>
                   <h4 className="font-bold text-gray-800 text-lg">{sch.shiftName}</h4>
                   <p className="text-xs text-gray-400">أيام العمل: {sch.days.join('، ')}</p>
                </div>
                <div className="flex gap-2">
                 <button onClick={() => handleOpenModal('SCHEDULE', sch)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Edit size={16} /></button>
                 <button onClick={() => handleDelete('SCHEDULE', sch.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
               </div>
             </div>
             <div className="space-y-2">
                {sch.shifts.map((shift, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                    <span className="font-bold text-gray-700">{shift.name || `وردية ${idx + 1}`}</span>
                    <span className="font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">{shift.start} - {shift.end}</span>
                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLeaves = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
         <h3 className="font-bold text-gray-800">طلبات الإجازات</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="p-4">الموظف</th><th className="p-4">الفترة</th><th className="p-4">السبب</th><th className="p-4">الحالة</th><th className="p-4">إجراءات</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {leaves.sort((a,b) => b.id.localeCompare(a.id)).map(leave => (
              <tr key={leave.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold">{leave.employeeName}</td>
                <td className="p-4 font-mono text-gray-600">{leave.startDate} <span className="text-gray-400 mx-1">إلى</span> {leave.endDate}</td>
                <td className="p-4 text-gray-600 max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold flex w-fit items-center gap-1 ${leave.status === 'Approved' ? 'bg-green-100 text-green-700' : leave.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {leave.status === 'Approved' ? <CheckCircle size={12}/> : leave.status === 'Rejected' ? <XCircle size={12}/> : <Clock size={12}/>}
                    {leave.status === 'Approved' ? 'مقبول' : leave.status === 'Rejected' ? 'مرفوض' : 'قيد الانتظار'}
                  </span>
                </td>
                <td className="p-4">
                  {leave.status === 'Pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleLeaveAction(leave.id, 'Approved')} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100" title="قبول"><Check size={16} /></button>
                      <button onClick={() => handleLeaveAction(leave.id, 'Rejected')} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="رفض"><X size={16} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {leaves.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">لا توجد طلبات إجازة حالياً</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-end md:items-center gap-4 no-print">
         <div className="flex gap-2 items-center">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">من تاريخ</label>
              <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="border rounded-lg p-2 text-sm bg-gray-50" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">إلى تاريخ</label>
              <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="border rounded-lg p-2 text-sm bg-gray-50" />
            </div>
            <div className="flex gap-1 mt-auto">
               <button onClick={() => setReportMonth(0)} className="px-3 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded hover:bg-gray-200">الشهر الحالي</button>
               <button onClick={() => setReportMonth(-1)} className="px-3 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded hover:bg-gray-200">الشهر السابق</button>
            </div>
         </div>
         <button onClick={handlePrint} className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-900 transition shadow-lg"><Printer size={18} /> طباعة التقرير</button>
       </div>

       <div className="bg-white rounded-xl shadow-sm overflow-hidden print-section">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
             <div>
               <h2 className="text-xl font-bold text-gray-800">تقرير الحضور والانصراف</h2>
               <p className="text-sm text-gray-500 mt-1">الفترة من {reportStartDate} إلى {reportEndDate}</p>
             </div>
             <div className="text-left hidden print:block">
                <h3 className="font-bold text-lg">اسم الشركة / المؤسسة</h3>
                <p className="text-xs text-gray-500">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b-2 border-gray-200">
                <tr>
                   <th className="p-4">الموظف</th>
                   <th className="p-4 text-center">أيام الحضور</th>
                   <th className="p-4 text-center">أيام الغياب</th>
                   <th className="p-4 text-center">ساعات العمل</th>
                   <th className="p-4 text-center">ساعات إضافية</th>
                   <th className="p-4 text-center">آخر حالة</th>
                   <th className="p-4 text-center">حالة الموظف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{row.name}</div>
                      <div className="text-xs text-gray-400">{row.role}</div>
                    </td>
                    <td className="p-4 text-center font-bold text-green-600 bg-green-50/50">{row.daysPresent}</td>
                    <td className="p-4 text-center font-bold text-red-600 bg-red-50/50">{row.absentDays}</td>
                    <td className="p-4 text-center font-mono">{row.totalHours}</td>
                    <td className="p-4 text-center font-mono text-blue-600">{row.overtimeHours}</td>
                    <td className="p-4 text-center text-xs">{row.lastStatus}</td>
                    <td className="p-4 text-center">
                       <span className={`px-2 py-1 rounded text-[10px] font-bold ${row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.status === 'Active' ? 'نشط' : 'متوقف'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
       </div>
    </div>
  );

  const renderLogs = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
       <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex items-center gap-2"><ShieldAlert size={18} /> سجلات التدقيق (Audit Logs)</div>
       <div className="overflow-x-auto max-h-[500px]">
         <table className="w-full text-right text-sm">
           <thead className="text-gray-500 border-b sticky top-0 bg-white"><tr><th className="p-3">الوقت</th><th className="p-3">المستخدم</th><th className="p-3">الإجراء</th><th className="p-3">التفاصيل</th></tr></thead>
           <tbody className="divide-y divide-gray-50">{logs.slice(0, 100).map(log => (<tr key={log.id} className="hover:bg-gray-50"><td className="p-3 font-mono text-gray-500 text-xs">{new Date(log.timestamp).toLocaleString('ar-EG')}</td><td className="p-3 font-bold">{log.user}</td><td className="p-3 text-blue-600">{log.action}</td><td className="p-3 text-gray-600">{log.details}</td></tr>))}</tbody>
         </table>
       </div>
    </div>
  );

  const renderContent = () => {
    if (loading && activeTab === 'OVERVIEW') {
        return <div className="h-64 flex items-center justify-center text-primary"><RefreshCw className="animate-spin" size={32} /></div>;
    }
    switch (activeTab) {
      case 'OVERVIEW': return renderOverview();
      case 'EMPLOYEES': return renderEmployees();
      case 'ATTENDANCE': return renderAttendance();
      case 'GEOFENCES': return renderGeofences();
      case 'LEAVES': return renderLeaves();
      case 'SCHEDULES': return renderSchedules();
      case 'REPORTS': return renderReports();
      case 'LOGS': return renderLogs();
      case 'ROLES': return renderRoles();
      default: return renderOverview();
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 font-sans" dir="rtl">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-gray-200 shadow-sm shrink-0">
        <div className="p-6 border-b border-gray-100"><h1 className="text-2xl font-bold text-primary flex items-center gap-2"><LayoutDashboard className="text-secondary" /> لوحة التحكم</h1><p className="text-xs text-gray-400 mt-1">نظام إدارة الحضور الذكي</p></div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">{navItems.map(item => (<button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} /><span className="font-medium">{item.label}</span>{activeTab === item.id && <ChevronRight size={16} className="mr-auto opacity-50" />}</button>))}</nav>
        <div className="p-4 border-t border-gray-100"><button onClick={onBack} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition"><LogOut size={18} /> الخروج من اللوحة</button></div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white shadow-sm shrink-0">
          <div className="p-4 flex justify-between items-center border-b border-gray-100"><h1 className="font-bold text-lg text-primary">لوحة التحكم</h1><button onClick={onBack} className="text-gray-500"><LogOut size={20} /></button></div>
          <div className="overflow-x-auto flex items-center px-2 no-scrollbar">{navItems.map(item => (<button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === item.id ? 'border-primary text-primary font-bold' : 'border-transparent text-gray-500'}`}><item.icon size={18} /><span className="text-sm">{item.label}</span></button>))}</div>
        </div>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-gray-200 p-4 items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold text-gray-800">{navItems.find(i => i.id === activeTab)?.label}</h2>
             {loading && <RefreshCw size={16} className="text-gray-400 animate-spin" />}
           </div>
           <div className="relative w-96"><Search className="absolute right-3 top-2.5 text-gray-400" size={18} /><input type="text" placeholder="بحث سريع..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition outline-none" /></div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">{renderContent()}</main>
      </div>

      {/* Shared Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b flex justify-between items-center bg-primary text-white"><h3 className="font-bold">{modalType === 'EMPLOYEE' ? 'بيانات الموظف' : modalType === 'GEOFENCE' ? 'بيانات الموقع' : 'بيانات الجدول'}</h3><button onClick={handleCloseModal} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button></div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {modalType === 'EMPLOYEE' && (
                <>
                <div><label className="block text-sm font-medium mb-1">اسم الموظف</label><input required type="text" value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full border rounded p-2" /></div>
                <div><label className="block text-sm font-medium mb-1">كلمة المرور</label><div className="relative"><Key className="absolute left-2 top-2.5 text-gray-400" size={16} /><input type="text" value={editingItem.password || ''} onChange={e => setEditingItem({...editingItem, password: e.target.value})} className="w-full border rounded p-2 pl-8" placeholder="كلمة مرور جديدة" /></div></div>
                <div><label className="block text-sm font-medium mb-1">الدور</label><select value={editingItem.role || 'USER'} onChange={e => setEditingItem({...editingItem, role: e.target.value})} className="w-full border rounded p-2 bg-white"><option value="USER">موظف</option><option value="ADMIN">مسئول</option><option value="SUPERVISOR">مشرف</option></select></div>
                <div><label className="block text-sm font-medium mb-1">الهاتف</label><input type="text" value={editingItem.phone || ''} onChange={e => setEditingItem({...editingItem, phone: e.target.value})} className="w-full border rounded p-2" /></div>
                </>
              )}
              {modalType === 'GEOFENCE' && (
                <>
                <div><label className="block text-sm font-medium mb-1">اسم الموقع</label><input required type="text" value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full border rounded p-2" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Lat</label><input type="number" step="any" value={editingItem.latitude || ''} onChange={e => setEditingItem({...editingItem, latitude: e.target.value})} className="w-full border rounded p-2" /></div><div><label className="block text-sm font-medium mb-1">Lng</label><input type="number" step="any" value={editingItem.longitude || ''} onChange={e => setEditingItem({...editingItem, longitude: e.target.value})} className="w-full border rounded p-2" /></div></div>
                <div><label className="block text-sm font-medium mb-1">نصف القطر (متر)</label><input required type="number" value={editingItem.radiusMeters || ''} onChange={e => setEditingItem({...editingItem, radiusMeters: e.target.value})} className="w-full border rounded p-2" /></div>
                </>
              )}
              {modalType === 'SCHEDULE' && (
                <>
                <div><label className="block text-sm font-medium mb-1">اسم الوردية</label><input required type="text" value={editingItem.shiftName || ''} onChange={e => setEditingItem({...editingItem, shiftName: e.target.value})} className="w-full border rounded p-2" /></div>
                <div><label className="block text-sm font-medium mb-1">الأيام</label><input type="text" value={Array.isArray(editingItem.days) ? editingItem.days.join(', ') : editingItem.days || ''} onChange={e => setEditingItem({...editingItem, days: e.target.value})} className="w-full border rounded p-2" placeholder="الأحد, الاثنين..." /></div>
                </>
              )}
              <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-800 transition mt-4">حفظ البيانات</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
const StatCard: React.FC<{ title: string; value: string; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => (<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:scale-[1.02] transition-transform"><div><p className="text-gray-500 text-sm mb-1">{title}</p><h3 className="text-2xl font-bold text-gray-800">{String(value)}</h3></div><div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${color}`}><Icon size={24} /></div></div>);
export default DashboardView;
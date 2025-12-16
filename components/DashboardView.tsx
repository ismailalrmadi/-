import React, { useState, useEffect } from 'react';
import { 
  Users, Map as MapIcon, CalendarRange, Bell, FileText, 
  Activity, LayoutDashboard, Clock, Search, 
  MapPin, CheckCircle, XCircle, ShieldAlert,
  Plus, Edit, Trash2, X, UserX, BarChart3, Printer, Lock,
  ChevronRight, LogOut, Filter, Phone, Shield, User, UserCog, MoreVertical, Ban, Check, Key, TrendingUp, Calendar
} from 'lucide-react';
import { 
  getEmployees, getRecords, getGeofences, getLeaveRequests, 
  getNotifications, getWorkSchedules, getAuditLogs,
  saveEmployee, deleteEmployee, saveGeofence, deleteGeofence,
  saveWorkSchedule, deleteWorkSchedule, updateLeaveStatus,
  checkAndGenerateAbsenceAlerts, getRoleConfigs, saveRoleConfigs, hasPermission, getCalendarEvents
} from '../services/storageService';
import { AttendanceRecord, AttendanceType, Employee, Geofence, WorkSchedule, LeaveRequest, Notification, AuditLog, RoleConfig, Permission, CalendarEvent } from '../types';

type Tab = 'OVERVIEW' | 'EMPLOYEES' | 'ATTENDANCE' | 'GEOFENCES' | 'LEAVES' | 'SCHEDULES' | 'LOGS' | 'REPORTS' | 'ROLES';

const DashboardView: React.FC<{ onBack: () => void; userRole: string }> = ({ onBack, userRole }) => {
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

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
  
  // Permissions State
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Report State
  const [reportStartDate, setReportStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Today
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'EMPLOYEE' | 'GEOFENCE' | 'SCHEDULE' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Load Data Async
  useEffect(() => {
    const loadAllData = async () => {
        setEmployees(await getEmployees());
        setRecords(await getRecords());
        setGeofences(await getGeofences());
        setLeaves(await getLeaveRequests());
        setNotifications(await getNotifications());
        setSchedules(await getWorkSchedules());
        setLogs(await getAuditLogs());
        setRoleConfigs(await getRoleConfigs());
        setCalendarEvents(await getCalendarEvents());
        
        // Load Permissions
        if (userRole === 'ADMIN') {
            // All perms
            setUserPermissions(['VIEW_OVERVIEW', 'MANAGE_EMPLOYEES', 'VIEW_ATTENDANCE', 'MANAGE_GEOFENCES', 'MANAGE_LEAVES', 'MANAGE_SCHEDULES', 'VIEW_REPORTS', 'VIEW_LOGS', 'MANAGE_ROLES']);
        } else {
            const configs = await getRoleConfigs();
            const config = configs.find(c => c.role === userRole);
            setUserPermissions(config ? config.permissions : []);
        }
    };
    loadAllData();
  }, [refreshKey, userRole]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  // --- Helper: Check Permission ---
  const can = (permission: Permission): boolean => {
    return userRole === 'ADMIN' || userPermissions.includes(permission);
  };

  // --- Navigation Items Configuration ---
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
    if (count > 0) {
      alert(`تم رصد ${count} حالات غياب جديدة وإرسال تنبيهات.`);
    } else {
      alert("لم يتم رصد حالات غياب جديدة.");
    }
    handleRefresh();
  };

  const setReportMonth = (offset: number) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    
    // YYYY-MM-DD adjustment for timezone
    const offsetDate = (d: Date) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    setReportStartDate(offsetDate(date));
    setReportEndDate(offsetDate(lastDay));
  };

  const handleOpenModal = (type: 'EMPLOYEE' | 'GEOFENCE' | 'SCHEDULE', item: any = null) => {
    setModalType(type);
    
    if (type === 'SCHEDULE' && !item) {
        // Initialize new schedule with split shift structure
        item = { 
            shiftName: '', 
            shifts: [
                { name: 'صباحي', start: '08:00', end: '12:00' },
                { name: 'مسائي', start: '13:00', end: '17:00' }
            ], 
            days: [] 
        };
    } else if (type === 'SCHEDULE' && item && !item.shifts) {
        // Migration for edit mode if old structure
        item.shifts = [
             { name: 'دوام كامل', start: item.startTime || '08:00', end: item.endTime || '16:00' }
        ];
    }
    
    setEditingItem(item || {}); 
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
    handleRefresh();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingItem.id || Date.now().toString();
    
    if (modalType === 'EMPLOYEE') {
      const newEmp: Employee = {
        id,
        name: editingItem.name,
        role: editingItem.role,
        phone: editingItem.phone,
        status: editingItem.status || 'Active',
        password: editingItem.password || '123456' // Default if not provided
      };
      await saveEmployee(newEmp);
    }
    else if (modalType === 'GEOFENCE') {
      const newGeo: Geofence = {
        id,
        name: editingItem.name,
        center: { 
          latitude: parseFloat(editingItem.latitude || editingItem.center?.latitude || 24.7136), 
          longitude: parseFloat(editingItem.longitude || editingItem.center?.longitude || 46.6753) 
        },
        radiusMeters: parseInt(editingItem.radiusMeters),
        active: editingItem.active !== false
      };
      await saveGeofence(newGeo);
    }
    else if (modalType === 'SCHEDULE') {
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

  const handlePrint = () => {
    window.print();
  };

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

  // --- Filtering ---
  const filteredData = (data: any[]) => {
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(lowerQuery)
      )
    );
  };

  // --- Calculations for Reports ---
  const generateReportData = () => {
    const start = new Date(reportStartDate);
    start.setHours(0,0,0,0);
    const end = new Date(reportEndDate);
    end.setHours(23,59,59,999);

    return employees.map(emp => {
      // 1. Filter Records
      const empRecords = records.filter(r => 
        r.workerName === emp.name && 
        r.timestamp >= start.getTime() && 
        r.timestamp <= end.getTime()
      ).sort((a, b) => a.timestamp - b.timestamp);

      // 2. Calculate Unique Days Present
      const uniqueDaysPresentSet = new Set(
        empRecords.map(r => new Date(r.timestamp).toDateString())
      );
      const daysPresent = uniqueDaysPresentSet.size;

      // 3. Calculate Absent Days
      let absentDays = 0;
      let loopDate = new Date(start);

      // Iterate through each day in the range
      while (loopDate <= end) {
        const dateISO = new Date(loopDate.getTime() - (loopDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const dayName = loopDate.toLocaleDateString('ar-EG', { weekday: 'long' });

        // Check if holiday
        const isHoliday = calendarEvents.some(e => e.date === dateISO && e.type === 'HOLIDAY');
        
        // Check if scheduled workday (if any schedule matches this day)
        // If no schedules exist at all, assume all days are workdays (or none, depending on policy. Here assuming work if schedules array empty is unsafe, so we check if matches)
        const isScheduledDay = schedules.length === 0 || schedules.some(s => s.days.includes(dayName));

        // If it's a working day and not a holiday
        if (isScheduledDay && !isHoliday && loopDate <= new Date()) {
            // Check if present
            const isPresent = uniqueDaysPresentSet.has(loopDate.toDateString());
            
            if (!isPresent) {
                // Check if on Approved Leave
                const onLeave = leaves.some(l => 
                    l.employeeName === emp.name && 
                    l.status === 'Approved' &&
                    new Date(l.startDate) <= loopDate &&
                    new Date(l.endDate) >= loopDate
                );

                if (!onLeave) {
                    absentDays++;
                }
            }
        }
        
        loopDate.setDate(loopDate.getDate() + 1);
      }

      // 4. Calculate Total Hours
      let totalMilliseconds = 0;
      const dayGroups: { [key: string]: AttendanceRecord[] } = {};

      empRecords.forEach(r => {
        const day = new Date(r.timestamp).toDateString();
        if (!dayGroups[day]) dayGroups[day] = [];
        dayGroups[day].push(r);
      });

      Object.values(dayGroups).forEach(dayRecs => {
        const checkIn = dayRecs.find(r => r.type === AttendanceType.CHECK_IN);
        const checkOut = dayRecs.slice().reverse().find(r => r.type === AttendanceType.CHECK_OUT);

        if (checkIn && checkOut && checkOut.timestamp > checkIn.timestamp) {
            totalMilliseconds += (checkOut.timestamp - checkIn.timestamp);
        }
      });

      const totalHours = parseFloat((totalMilliseconds / (1000 * 60 * 60)).toFixed(1));
      
      // Calculate Overtime: Assume standard is 8 hours * daysPresent
      const standardHours = daysPresent * 8;
      const overtimeHours = totalHours > standardHours ? (totalHours - standardHours).toFixed(1) : "0";

      const lastRecord = empRecords[empRecords.length - 1];
      const lastStatus = lastRecord ? (lastRecord.type === AttendanceType.CHECK_IN ? 'داخل العمل' : 'انصرف') : '-';

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        daysPresent,
        absentDays,
        totalHours: totalHours.toFixed(1),
        overtimeHours,
        lastStatus,
        status: emp.status
      };
    });
  };

  // --- Render Functions ---

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
             <button 
                onClick={handleCheckAbsence}
                className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-100 transition flex items-center gap-1"
             >
                <UserX size={14} /> فحص الغياب
             </button>
          </div>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {notifications.length === 0 ? <p className="text-gray-400 text-sm">لا توجد إشعارات</p> : 
             notifications.map(note => (
              <div key={note.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${note.title.includes('غياب') ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <div>
                  <h4 className="font-bold text-sm text-gray-800">{note.title}</h4>
                  <p className="text-sm text-gray-600">{note.message}</p>
                  <span className="text-xs text-gray-400">{note.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Activity size={18} /> النشاط الأخير
          </h3>
          <div className="space-y-3">
            {records.slice(0, 5).map(rec => (
              <div key={rec.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
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
      { key: 'MANAGE_EMPLOYEES', label: 'إدارة الموظفين (إضافة/تعديل/حذف)' },
      { key: 'VIEW_ATTENDANCE', label: 'مشاهدة سجلات الحضور' },
      { key: 'MANAGE_GEOFENCES', label: 'إدارة النطاقات الجغرافية' },
      { key: 'MANAGE_LEAVES', label: 'إدارة وقبول الإجازات' },
      { key: 'MANAGE_SCHEDULES', label: 'إدارة جداول العمل' },
      { key: 'VIEW_REPORTS', label: 'مشاهدة وطباعة التقارير' },
      { key: 'VIEW_LOGS', label: 'مشاهدة سجلات النظام' },
      { key: 'MANAGE_ROLES', label: 'تعديل الصلاحيات' },
    ];

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800">إدارة الأدوار والصلاحيات</h3>
          <p className="text-sm text-gray-500 mt-1">قم بتحديد الصلاحيات المتاحة لكل دور وظيفي في النظام.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="p-4 border-b w-1/3">الصلاحية</th>
                {roleConfigs.map(config => (
                  <th key={config.role} className="p-4 border-b text-center">{config.role}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permissionsList.map((perm) => (
                <tr key={perm.key} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{perm.label}</td>
                  {roleConfigs.map(config => (
                    <td key={config.role} className="p-4 text-center">
                       <input 
                         type="checkbox" 
                         disabled={config.role === 'ADMIN' && perm.key === 'MANAGE_ROLES'} // Prevent Admin from locking themselves out
                         checked={config.permissions.includes(perm.key)}
                         onChange={() => handleRolePermissionChange(config.role, perm.key)}
                         className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                       />
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
    // Custom Filter Logic for Employees
    let filteredEmployees = employees;
    
    // 1. Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filteredEmployees = filteredEmployees.filter(item => 
        Object.values(item).some(val => String(val).toLowerCase().includes(lowerQuery))
      );
    }
    
    // 2. Role Filter
    if (employeeFilterRole !== 'ALL') {
      filteredEmployees = filteredEmployees.filter(e => e.role === employeeFilterRole);
    }

    // 3. Status Filter
    if (employeeFilterStatus !== 'ALL') {
      filteredEmployees = filteredEmployees.filter(e => e.status === employeeFilterStatus);
    }

    const RoleBadge = ({ role }: { role: string }) => {
      let colors = "bg-gray-100 text-gray-700";
      let Icon = User;
      if (role === 'ADMIN') { colors = "bg-purple-100 text-purple-700"; Icon = Shield; }
      if (role === 'SUPERVISOR') { colors = "bg-amber-100 text-amber-700"; Icon = UserCog; }
      
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${colors}`}>
          <Icon size={12} />
          {role === 'ADMIN' ? 'مسئول' : role === 'SUPERVISOR' ? 'مشرف' : 'موظف'}
        </span>
      );
    };

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Actions & Filters Header */}
        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-primary" size={20} />
              قائمة الموظفين
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{filteredEmployees.length}</span>
            </h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Role Filter */}
            <div className="relative">
              <select 
                value={employeeFilterRole}
                onChange={(e) => setEmployeeFilterRole(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg pl-8 pr-4 py-2 focus:ring-primary focus:border-primary outline-none cursor-pointer hover:bg-gray-100 transition"
              >
                <option value="ALL">جميع الأدوار</option>
                <option value="ADMIN">مسئولين</option>
                <option value="SUPERVISOR">مشرفين</option>
                <option value="USER">موظفين</option>
              </select>
              <Filter className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
            </div>

            {/* Status Filter */}
            <select 
              value={employeeFilterStatus}
              onChange={(e) => setEmployeeFilterStatus(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-4 py-2 focus:ring-primary focus:border-primary outline-none cursor-pointer hover:bg-gray-100 transition"
            >
              <option value="ALL">كل الحالات</option>
              <option value="Active">نشط فقط</option>
              <option value="Inactive">متوقف</option>
            </select>

            <button 
              onClick={() => handleOpenModal('EMPLOYEE')}
              className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-800 transition shadow-sm ml-auto md:ml-0"
            >
              <Plus size={18} /> <span className="hidden sm:inline">إضافة موظف</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-600 text-sm border-b">
                <tr>
                  <th className="p-4 font-medium">الموظف</th>
                  <th className="p-4 font-medium">كلمة المرور</th>
                  <th className="p-4 font-medium">الدور الوظيفي</th>
                  <th className="p-4 font-medium">رقم الهاتف</th>
                  <th className="p-4 font-medium">الحالة</th>
                  <th className="p-4 font-medium text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold shadow-sm">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{emp.name}</div>
                          <div className="text-xs text-gray-400">ID: {emp.id.substring(0,6)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm text-gray-500">
                      <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">
                        <Key size={12} className="text-gray-400" />
                        {emp.password || '---'}
                      </div>
                    </td>
                    <td className="p-4">
                      <RoleBadge role={emp.role} />
                    </td>
                    <td className="p-4 text-gray-600 font-mono">
                      {emp.phone || '-'}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => toggleEmployeeStatus(emp)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          emp.status === 'Active' 
                          ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' 
                          : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        }`}
                      >
                        {emp.status === 'Active' ? <Check size={12} /> : <Ban size={12} />}
                        {emp.status === 'Active' ? 'نشط' : 'متوقف'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal('EMPLOYEE', emp)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="تعديل"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete('EMPLOYEE', emp.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEmployees.length === 0 && (
            <div className="p-8 text-center text-gray-400">
               لا توجد نتائج مطابقة للبحث
            </div>
          )}
        </div>

        {/* Mobile Cards View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredEmployees.map(emp => (
            <div key={emp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
               <div className={`absolute top-0 right-0 w-1 h-full ${emp.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
               <div className="flex justify-between items-start pl-2">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 font-bold text-lg">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg">{emp.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <RoleBadge role={emp.role} />
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                           <Key size={10} /> {emp.password}
                        </div>
                      </div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col gap-2">
                   <button 
                      onClick={() => handleOpenModal('EMPLOYEE', emp)} 
                      className="p-2 bg-gray-50 text-gray-600 rounded-lg"
                   >
                     <Edit size={16} />
                   </button>
                 </div>
               </div>

               <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <span className="text-xs text-gray-400">الحالة:</span>
                     <button 
                      onClick={() => toggleEmployeeStatus(emp)}
                      className={`text-xs font-bold px-2 py-1 rounded ${emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                     >
                       {emp.status === 'Active' ? 'نشط (اضغط للإيقاف)' : 'متوقف (اضغط للتفعيل)'}
                     </button>
                  </div>
                  <button 
                    onClick={() => handleDelete('EMPLOYEE', emp.id)} 
                    className="text-red-500 text-xs flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"
                  >
                    <Trash2 size={12} /> حذف
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAttendance = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
         <h3 className="font-bold text-gray-800">سجل الحضور والانصراف</h3>
         <div className="text-sm text-gray-500">
            عدد السجلات: {filteredData(records).length}
         </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-4">الموظف</th>
              <th className="p-4">التاريخ والوقت</th>
              <th className="p-4">النوع</th>
              <th className="p-4">طريقة التحقق</th>
              <th className="p-4">الموقع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredData(records).map(rec => (
              <tr key={rec.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold">{rec.workerName}</td>
                <td className="p-4 font-mono text-gray-600">
                  {new Date(rec.timestamp).toLocaleDateString('ar-EG')} {new Date(rec.timestamp).toLocaleTimeString('ar-EG')}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${rec.type === AttendanceType.CHECK_IN ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {rec.type === AttendanceType.CHECK_IN ? 'حضور' : 'انصراف'}
                  </span>
                </td>
                <td className="p-4">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {rec.verificationMethod === 'QR' ? 'باركود' : 'GPS'}
                  </span>
                </td>
                <td className="p-4">
                  {rec.locationVerified ? 
                    <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14} /> صحيح</span> : 
                    <span className="text-red-500 flex items-center gap-1"><XCircle size={14} /> خارج النطاق</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGeofences = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h3 className="font-bold text-gray-700">المواقع الجغرافية</h3>
        <button 
          onClick={() => handleOpenModal('GEOFENCE')}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-800"
        >
          <Plus size={18} /> إضافة موقع
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {geofences.map(geo => (
          <div key={geo.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <MapPin size={18} className="text-primary" /> {geo.name}
              </h4>
              <span className={`w-3 h-3 rounded-full ${geo.active ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            </div>
            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p>نصف القطر: {geo.radiusMeters} متر</p>
              <p className="font-mono text-xs text-gray-400">
                 {geo.center?.latitude.toFixed(5)}, {geo.center?.longitude.toFixed(5)}
              </p>
            </div>
            <div className="flex gap-2 border-t pt-3">
              <button onClick={() => handleOpenModal('GEOFENCE', geo)} className="flex-1 bg-gray-50 text-gray-700 py-1.5 rounded hover:bg-gray-100 flex justify-center"><Edit size={16} /></button>
              <button onClick={() => handleDelete('GEOFENCE', geo.id)} className="flex-1 bg-red-50 text-red-600 py-1.5 rounded hover:bg-red-100 flex justify-center"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSchedules = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h3 className="font-bold text-gray-700">جداول العمل</h3>
        <button 
          onClick={() => handleOpenModal('SCHEDULE')}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-800"
        >
          <Plus size={18} /> إضافة جدول
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedules.map(sch => (
          <div key={sch.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <h4 className="font-bold text-gray-800 mb-2">{sch.shiftName}</h4>
            <div className="space-y-1 mb-4">
                {sch.shifts.map((shift, idx) => (
                    <div key={idx} className="flex items-center justify-between text-gray-600 text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">{shift.name}</span>
                        <div className="flex items-center gap-1 font-mono">
                            <Clock size={14} />
                            {shift.start} - {shift.end}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-1 mb-4">
              {sch.days.map((day, idx) => (
                <span key={idx} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">{day}</span>
              ))}
            </div>
            <div className="flex gap-2 border-t pt-3">
              <button onClick={() => handleOpenModal('SCHEDULE', sch)} className="flex-1 bg-gray-50 text-gray-700 py-1.5 rounded hover:bg-gray-100 flex justify-center"><Edit size={16} /></button>
              <button onClick={() => handleDelete('SCHEDULE', sch.id)} className="flex-1 bg-red-50 text-red-600 py-1.5 rounded hover:bg-red-100 flex justify-center"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLeaves = () => (
    <div className="space-y-4 animate-fade-in">
      <h3 className="font-bold text-gray-700 px-2">طلبات الإجازة</h3>
      {leaves.length === 0 ? (
         <div className="bg-white p-8 rounded-xl text-center text-gray-400 shadow-sm">لا توجد طلبات إجازة</div>
      ) : (
        leaves.map(leave => (
          <div key={leave.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-gray-800">{leave.employeeName}</h4>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  leave.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                  leave.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {leave.status === 'Approved' ? 'مقبول' : leave.status === 'Rejected' ? 'مرفوض' : 'قيد المراجعة'}
                </span>
              </div>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <CalendarRange size={14} />
                {leave.startDate} إلى {leave.endDate}
              </div>
              <p className="text-sm text-gray-500 mt-1 italic">"{leave.reason}"</p>
            </div>
            
            {leave.status === 'Pending' && (
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => handleLeaveAction(leave.id, 'Approved')}
                  className="flex-1 md:flex-none bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-bold"
                >
                  قبول
                </button>
                <button 
                  onClick={() => handleLeaveAction(leave.id, 'Rejected')}
                  className="flex-1 md:flex-none bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-bold"
                >
                  رفض
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderReports = () => {
    const data = generateReportData();
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[150px] w-full">
            <label className="block text-sm text-gray-600 mb-1">من تاريخ</label>
            <input 
              type="date" 
              value={reportStartDate} 
              onChange={(e) => setReportStartDate(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[150px] w-full">
            <label className="block text-sm text-gray-600 mb-1">إلى تاريخ</label>
            <input 
              type="date" 
              value={reportEndDate} 
              onChange={(e) => setReportEndDate(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => setReportMonth(0)}
                className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200"
            >
                الشهر الحالي
            </button>
            <button 
                onClick={() => setReportMonth(-1)}
                className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200"
            >
                الشهر الماضي
            </button>
          </div>
          <button 
            onClick={handlePrint}
            className="w-full md:w-auto bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-900"
          >
            <Printer size={18} /> طباعة
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
           <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">ملخص أداء الموظفين</div>
           <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="text-gray-500 border-b">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">أيام الحضور</th>
                  <th className="p-3 text-red-600">أيام الغياب</th>
                  <th className="p-3">ساعات العمل</th>
                  <th className="p-3 text-emerald-600">أوفر تايم</th>
                  <th className="p-3">آخر حالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-800">
                        <div>{row.name}</div>
                        <div className="text-xs text-gray-400 font-normal">{row.role}</div>
                    </td>
                    <td className="p-3 text-blue-600 font-bold">{row.daysPresent}</td>
                    <td className="p-3 text-red-600 font-bold">{row.absentDays}</td>
                    <td className="p-3">{row.totalHours}</td>
                    <td className="p-3 text-emerald-600 font-bold">
                        {parseFloat(row.overtimeHours) > 0 ? `+${row.overtimeHours}` : '-'}
                    </td>
                    <td className="p-3 text-xs">
                      <span className={`px-2 py-1 rounded ${row.lastStatus === 'داخل العمل' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {row.lastStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
        </div>
      </div>
    );
  };

  const renderLogs = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
       <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex items-center gap-2">
         <ShieldAlert size={18} /> سجلات التدقيق (Audit Logs)
       </div>
       <div className="overflow-x-auto max-h-[500px]">
         <table className="w-full text-right text-sm">
           <thead className="text-gray-500 border-b sticky top-0 bg-white">
             <tr>
               <th className="p-3">الوقت</th>
               <th className="p-3">المستخدم</th>
               <th className="p-3">الإجراء</th>
               <th className="p-3">التفاصيل</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-50">
             {logs.map(log => (
               <tr key={log.id} className="hover:bg-gray-50">
                 <td className="p-3 font-mono text-gray-500 text-xs">
                   {new Date(log.timestamp).toLocaleString('ar-EG')}
                 </td>
                 <td className="p-3 font-bold">{log.user}</td>
                 <td className="p-3 text-blue-600">{log.action}</td>
                 <td className="p-3 text-gray-600">{log.details}</td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
    </div>
  );

  const renderContent = () => {
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
        <div className="p-6 border-b border-gray-100">
           <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
             <LayoutDashboard className="text-secondary" /> لوحة التحكم
           </h1>
           <p className="text-xs text-gray-400 mt-1">نظام إدارة الحضور الذكي</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                ? 'bg-primary text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="font-medium">{item.label}</span>
              {activeTab === item.id && <ChevronRight size={16} className="mr-auto opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition"
          >
            <LogOut size={18} /> الخروج من اللوحة
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header & Tabs */}
        <div className="md:hidden bg-white shadow-sm shrink-0">
          <div className="p-4 flex justify-between items-center border-b border-gray-100">
            <h1 className="font-bold text-lg text-primary">لوحة التحكم</h1>
            <button onClick={onBack} className="text-gray-500"><LogOut size={20} /></button>
          </div>
          <div className="overflow-x-auto flex items-center px-2 no-scrollbar">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === item.id 
                  ? 'border-primary text-primary font-bold' 
                  : 'border-transparent text-gray-500'
                }`}
              >
                <item.icon size={18} />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Header (Search only) */}
        <header className="hidden md:flex bg-white border-b border-gray-200 p-4 items-center justify-between shrink-0">
           <h2 className="text-xl font-bold text-gray-800">
             {navItems.find(i => i.id === activeTab)?.label}
           </h2>
           <div className="relative w-96">
             <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
             <input 
                type="text" 
                placeholder="بحث سريع..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition outline-none"
             />
           </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {renderContent()}
        </main>
      </div>

      {/* Shared Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b flex justify-between items-center bg-primary text-white">
              <h3 className="font-bold">
                {modalType === 'EMPLOYEE' ? 'بيانات الموظف' : 
                 modalType === 'GEOFENCE' ? 'بيانات الموقع' : 'بيانات الجدول'}
              </h3>
              <button onClick={handleCloseModal} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {modalType === 'EMPLOYEE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">اسم الموظف (اسم المستخدم للدخول)</label>
                    <input required type="text" defaultValue={editingItem.name} onChange={e => editingItem.name = e.target.value} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">كلمة المرور</label>
                    <div className="relative">
                      <Key className="absolute left-2 top-2.5 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        defaultValue={editingItem.password} 
                        onChange={e => editingItem.password = e.target.value} 
                        className="w-full border rounded p-2 pl-8" 
                        placeholder={editingItem.id ? "اتركه فارغاً للإبقاء على القديمة" : "كلمة مرور جديدة"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">الدور</label>
                    <select defaultValue={editingItem.role || 'USER'} onChange={e => editingItem.role = e.target.value} className="w-full border rounded p-2 bg-white">
                      <option value="USER">موظف</option>
                      <option value="ADMIN">مسئول</option>
                      <option value="SUPERVISOR">مشرف</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">الهاتف</label>
                    <input type="text" defaultValue={editingItem.phone} onChange={e => editingItem.phone = e.target.value} className="w-full border rounded p-2" />
                  </div>
                </>
              )}

              {modalType === 'GEOFENCE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">اسم الموقع</label>
                    <input required type="text" defaultValue={editingItem.name} onChange={e => editingItem.name = e.target.value} className="w-full border rounded p-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Latitude</label>
                      <input type="number" step="any" defaultValue={editingItem.center?.latitude} onChange={e => editingItem.latitude = e.target.value} className="w-full border rounded p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Longitude</label>
                      <input type="number" step="any" defaultValue={editingItem.center?.longitude} onChange={e => editingItem.longitude = e.target.value} className="w-full border rounded p-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">نصف القطر (متر)</label>
                    <input required type="number" defaultValue={editingItem.radiusMeters} onChange={e => editingItem.radiusMeters = e.target.value} className="w-full border rounded p-2" />
                  </div>
                </>
              )}

              {modalType === 'SCHEDULE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">اسم الوردية</label>
                    <input required type="text" defaultValue={editingItem.shiftName} onChange={e => editingItem.shiftName = e.target.value} className="w-full border rounded p-2" />
                  </div>
                  
                  {/* Shift Period 1 */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-bold text-gray-500 mb-2">الفترة الأولى (الصباحية)</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-xs font-medium mb-1">من</label>
                        <input required type="time" defaultValue={editingItem.shifts?.[0]?.start} onChange={e => editingItem.shifts[0].start = e.target.value} className="w-full border rounded p-2 text-sm" />
                        </div>
                        <div>
                        <label className="block text-xs font-medium mb-1">إلى</label>
                        <input required type="time" defaultValue={editingItem.shifts?.[0]?.end} onChange={e => editingItem.shifts[0].end = e.target.value} className="w-full border rounded p-2 text-sm" />
                        </div>
                    </div>
                  </div>

                  {/* Shift Period 2 */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-bold text-gray-500 mb-2">الفترة الثانية (المسائية)</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-xs font-medium mb-1">من</label>
                        <input required type="time" defaultValue={editingItem.shifts?.[1]?.start} onChange={e => editingItem.shifts[1].start = e.target.value} className="w-full border rounded p-2 text-sm" />
                        </div>
                        <div>
                        <label className="block text-xs font-medium mb-1">إلى</label>
                        <input required type="time" defaultValue={editingItem.shifts?.[1]?.end} onChange={e => editingItem.shifts[1].end = e.target.value} className="w-full border rounded p-2 text-sm" />
                        </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">الأيام (مفصولة بفاصلة)</label>
                    <input type="text" defaultValue={editingItem.days?.join(', ')} onChange={e => editingItem.days = e.target.value} className="w-full border rounded p-2" placeholder="الأحد, الاثنين..." />
                  </div>
                </>
              )}

              <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-800 transition mt-4">
                حفظ البيانات
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:scale-[1.02] transition-transform">
    <div>
      <p className="text-gray-500 text-sm mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${color}`}>
      <Icon size={24} />
    </div>
  </div>
);

export default DashboardView;
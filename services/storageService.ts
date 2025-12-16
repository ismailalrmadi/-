import { 
  AttendanceRecord, 
  WorkshopConfig, 
  Coordinates, 
  Employee, 
  Geofence, 
  LeaveRequest, 
  WorkSchedule, 
  AuditLog, 
  Notification,
  UserRole,
  RoleConfig,
  Permission,
  CalendarEvent
} from '../types';

const STORAGE_KEY_RECORDS = 'attendance_records_v1';
const STORAGE_KEY_GEOFENCES = 'geofences_v1';
const STORAGE_KEY_CONFIG = 'workshop_config_v1';
const STORAGE_KEY_EMPLOYEES = 'employees_v1';
const STORAGE_KEY_SCHEDULES = 'schedules_v1';
const STORAGE_KEY_LEAVES = 'leaves_v1';
const STORAGE_KEY_LOGS = 'audit_logs_v1';
const STORAGE_KEY_NOTIFICATIONS = 'notifications_v1';
const STORAGE_KEY_SESSION = 'user_session_v1';
const STORAGE_KEY_ROLES = 'role_configs_v1';
const STORAGE_KEY_CALENDAR_EVENTS = 'calendar_events_v1';

// --- Helpers ---
const getFromStorage = <T>(key: string, defaultData: T): T => {
  const data = localStorage.getItem(key);
  try {
    return data ? JSON.parse(data) : defaultData;
  } catch (e) {
    console.error(`Error parsing data for key ${key}`, e);
    return defaultData;
  }
};

const saveToStorage = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- Session (Login/Remember Me) ---
export const saveSession = (user: string, role: UserRole): void => {
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ user, role, timestamp: Date.now() }));
};

export const getSession = (): { user: string, role: UserRole } | null => {
  const session = localStorage.getItem(STORAGE_KEY_SESSION);
  if (!session) return null;
  try {
    const parsed = JSON.parse(session);
    // Ensure backwards compatibility or default to USER if role missing
    if (!parsed.role) parsed.role = 'USER';
    return parsed;
  } catch {
    return null;
  }
};

export const clearSession = (): void => {
  localStorage.removeItem(STORAGE_KEY_SESSION);
};

// --- Roles & Permissions ---
export const getRoleConfigs = (): RoleConfig[] => {
  const defaultRoles: RoleConfig[] = [
    { 
      role: 'ADMIN', 
      permissions: [
        'VIEW_OVERVIEW', 'MANAGE_EMPLOYEES', 'VIEW_ATTENDANCE', 
        'MANAGE_GEOFENCES', 'MANAGE_LEAVES', 'MANAGE_SCHEDULES', 
        'VIEW_REPORTS', 'VIEW_LOGS', 'MANAGE_ROLES'
      ] 
    },
    { 
      role: 'SUPERVISOR', 
      permissions: [
        'VIEW_OVERVIEW', 'VIEW_ATTENDANCE', 'VIEW_REPORTS', 
        'MANAGE_LEAVES', 'VIEW_LOGS'
      ] 
    },
    { 
      role: 'USER', 
      permissions: [] // Users typically don't access dashboard, but if they did, it would be empty
    }
  ];
  return getFromStorage<RoleConfig[]>(STORAGE_KEY_ROLES, defaultRoles);
};

export const saveRoleConfigs = (configs: RoleConfig[]): void => {
  saveToStorage(STORAGE_KEY_ROLES, configs);
  saveAuditLog({
    id: Date.now().toString(),
    action: "تحديث الصلاحيات",
    user: getSession()?.user || "System",
    timestamp: Date.now(),
    details: "تم تحديث صلاحيات الأدوار"
  });
};

export const hasPermission = (userRole: UserRole, permission: Permission): boolean => {
  if (userRole === 'ADMIN') return true; // Hardcoded fallback for safety
  const configs = getRoleConfigs();
  const config = configs.find(c => c.role === userRole);
  return config ? config.permissions.includes(permission) : false;
};

// --- Config ---
export const getWorkshopConfig = (): WorkshopConfig => {
  return getFromStorage<WorkshopConfig>(STORAGE_KEY_CONFIG, {
    name: "ورشة العمل الرئيسية",
    center: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh default
    radiusMeters: 500,
    qrCodeValue: "WORKSHOP-SECRET-1"
  });
};

export const saveWorkshopConfig = (config: WorkshopConfig): void => {
  saveToStorage(STORAGE_KEY_CONFIG, config);
  saveAuditLog({
    id: Date.now().toString(),
    action: "تحديث الإعدادات",
    user: "Admin",
    timestamp: Date.now(),
    details: "تم تحديث إعدادات الورشة والموقع"
  });
};

export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371e3; // metres
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// --- Records ---
export const getRecords = (): AttendanceRecord[] => {
  return getFromStorage<AttendanceRecord[]>(STORAGE_KEY_RECORDS, []);
};

export const saveRecord = (record: AttendanceRecord): void => {
  const current = getRecords();
  const updated = [record, ...current];
  saveToStorage(STORAGE_KEY_RECORDS, updated);
  
  saveAuditLog({
    id: Date.now().toString(),
    action: record.type,
    user: record.workerName,
    timestamp: Date.now(),
    details: `الطريقة: ${record.verificationMethod} | موثق: ${record.locationVerified}`
  });
};

// --- Employees ---
export const getEmployees = (): Employee[] => {
  // TEST DATA INCLUDED HERE
  const defaults: Employee[] = [
    { id: '1', name: 'مدير النظام', role: 'ADMIN', phone: '0500000000', status: 'Active', password: 'admin' },
    { id: '2', name: 'موظف تجربة', role: 'USER', phone: '0555555555', status: 'Active', password: '123' },
    { id: '3', name: 'خالد المشرف', role: 'SUPERVISOR', phone: '0501112233', status: 'Active', password: '123' },
    { id: '4', name: 'سالم العلي', role: 'USER', phone: '0509876543', status: 'Inactive', password: '123' },
  ];
  const data = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
  if (!data) {
    saveToStorage(STORAGE_KEY_EMPLOYEES, defaults);
    return defaults;
  }
  return JSON.parse(data);
};

export const saveEmployee = (employee: Employee): void => {
  const employees = getEmployees();
  const index = employees.findIndex(e => e.id === employee.id);
  if (index >= 0) {
    employees[index] = employee;
  } else {
    employees.push(employee);
  }
  saveToStorage(STORAGE_KEY_EMPLOYEES, employees);
};

export const deleteEmployee = (id: string): void => {
  const employees = getEmployees().filter(e => e.id !== id);
  saveToStorage(STORAGE_KEY_EMPLOYEES, employees);
};

// --- Geofences ---
export const getGeofences = (): Geofence[] => {
  const defaults: Geofence[] = [{
    id: '1',
    name: "الورشة الرئيسية",
    center: { latitude: 24.7136, longitude: 46.6753 },
    radiusMeters: 500,
    active: true
  }];
  return getFromStorage<Geofence[]>(STORAGE_KEY_GEOFENCES, defaults);
};

export const saveGeofence = (geofence: Geofence): void => {
  const list = getGeofences();
  const index = list.findIndex(g => g.id === geofence.id);
  if (index >= 0) list[index] = geofence;
  else list.push(geofence);
  saveToStorage(STORAGE_KEY_GEOFENCES, list);
};

export const deleteGeofence = (id: string): void => {
  const list = getGeofences().filter(g => g.id !== id);
  saveToStorage(STORAGE_KEY_GEOFENCES, list);
};

// --- Schedules ---
export const getWorkSchedules = (): WorkSchedule[] => {
  const defaults: WorkSchedule[] = [
    { 
      id: '1', 
      shiftName: 'الوردية القياسية', 
      shifts: [
        { name: "صباحي", start: '08:00', end: '12:00' },
        { name: "مسائي", start: '13:00', end: '17:00' }
      ],
      days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] 
    }
  ];
  const data = localStorage.getItem(STORAGE_KEY_SCHEDULES);
  if (!data) {
    saveToStorage(STORAGE_KEY_SCHEDULES, defaults);
    return defaults;
  }
  
  try {
    const parsed = JSON.parse(data);
    // Migration check: Ensure structure matches WorkSchedule
    if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].shifts && parsed[0].startTime) {
       // Convert old data format if detected
       return defaults;
    }
    return parsed;
  } catch {
    return defaults;
  }
};

export const saveWorkSchedule = (schedule: WorkSchedule): void => {
  const list = getWorkSchedules();
  const index = list.findIndex(s => s.id === schedule.id);
  if (index >= 0) list[index] = schedule;
  else list.push(schedule);
  saveToStorage(STORAGE_KEY_SCHEDULES, list);
};

export const deleteWorkSchedule = (id: string): void => {
  const list = getWorkSchedules().filter(s => s.id !== id);
  saveToStorage(STORAGE_KEY_SCHEDULES, list);
};

// --- Calendar Events (Holidays/Custom Days) ---
export const getCalendarEvents = (): CalendarEvent[] => {
  return getFromStorage<CalendarEvent[]>(STORAGE_KEY_CALENDAR_EVENTS, []);
};

export const saveCalendarEvent = (event: CalendarEvent): void => {
  const list = getCalendarEvents();
  const index = list.findIndex(e => e.id === event.id);
  if (index >= 0) list[index] = event;
  else list.push(event);
  saveToStorage(STORAGE_KEY_CALENDAR_EVENTS, list);
};

export const deleteCalendarEvent = (id: string): void => {
  const list = getCalendarEvents().filter(e => e.id !== id);
  saveToStorage(STORAGE_KEY_CALENDAR_EVENTS, list);
};

// --- Leaves ---
export const getLeaveRequests = (): LeaveRequest[] => {
  const defaults: LeaveRequest[] = [
    { id: '101', employeeId: '2', employeeName: 'موظف تجربة', startDate: '2023-11-20', endDate: '2023-11-22', reason: 'ظروف عائلية', status: 'Pending' }
  ];
  return getFromStorage<LeaveRequest[]>(STORAGE_KEY_LEAVES, defaults);
};

export const saveNewLeaveRequest = (request: LeaveRequest): void => {
  const list = getLeaveRequests();
  const updated = [request, ...list];
  saveToStorage(STORAGE_KEY_LEAVES, updated);
  
  saveNotification({
    id: Date.now().toString(),
    title: 'طلب إجازة جديد',
    message: `قام الموظف ${request.employeeName} بتقديم طلب إجازة.`,
    date: new Date().toLocaleDateString('ar-EG'),
    read: false
  });
};

export const updateLeaveStatus = (id: string, status: 'Approved' | 'Rejected'): void => {
  const list = getLeaveRequests();
  const item = list.find(l => l.id === id);
  if (item) {
    item.status = status;
    saveToStorage(STORAGE_KEY_LEAVES, list);
    
    saveNotification({
      id: Date.now().toString(),
      title: status === 'Approved' ? 'تمت الموافقة على الإجازة' : 'تم رفض الإجازة',
      message: `تم ${status === 'Approved' ? 'قبول' : 'رفض'} طلب الإجازة للموظف ${item.employeeName}`,
      date: new Date().toLocaleDateString('ar-EG'),
      read: false
    });
  }
};

// --- Logs & Notifications ---
export const getAuditLogs = (): AuditLog[] => getFromStorage<AuditLog[]>(STORAGE_KEY_LOGS, []);

export const saveAuditLog = (log: AuditLog): void => {
  const logs = getAuditLogs();
  saveToStorage(STORAGE_KEY_LOGS, [log, ...logs].slice(0, 100)); // Keep last 100
};

export const getNotifications = (): Notification[] => getFromStorage<Notification[]>(STORAGE_KEY_NOTIFICATIONS, []);

export const saveNotification = (note: Notification): void => {
  const notes = getNotifications();
  saveToStorage(STORAGE_KEY_NOTIFICATIONS, [note, ...notes]);
};

// --- NEW: Absence Check ---
export const checkAndGenerateAbsenceAlerts = (): number => {
  const today = new Date();
  
  // Helper to get local date string YYYY-MM-DD
  const offset = today.getTimezoneOffset() * 60000;
  const todayStr = (new Date(today.getTime() - offset)).toISOString().slice(0, 10);
  
  const startOfDay = new Date(today.setHours(0,0,0,0)).getTime();
  const dayName = new Date().toLocaleDateString('ar-EG', { weekday: 'long' });

  // 1. Check Calendar Events (Exceptions)
  const calendarEvents = getCalendarEvents();
  const todayEvent = calendarEvents.find(e => e.date === todayStr);

  if (todayEvent?.type === 'HOLIDAY') {
    return 0; // Holiday, no checks needed
  }

  // 2. Get Schedules
  const allSchedules = getWorkSchedules();
  // Filter schedules that are active today
  const todaySchedules = allSchedules.filter(s => s.days.includes(dayName));

  const isRegularWorkDay = allSchedules.length === 0 || todaySchedules.length > 0;
  const isExtraWorkDay = todayEvent?.type === 'EXTRA_WORKDAY';

  // Determine if it's a workday
  if (!isRegularWorkDay && !isExtraWorkDay) return 0;

  let alertsGenerated = 0;
  const employees = getEmployees().filter(e => e.status === 'Active');
  const records = getRecords();
  const leaves = getLeaveRequests();
  const notifications = getNotifications();
  const dateStrDisplay = new Date().toLocaleDateString('ar-EG');

  // --- CHECK 1: ABSENCE (Missing Check-In Today) ---
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Find all start times for today
  let activeShiftStartTimes: number[] = [];
  if (todaySchedules.length > 0) {
    todaySchedules.forEach(s => {
      s.shifts.forEach(shift => {
        const [h, m] = shift.start.split(':').map(Number);
        activeShiftStartTimes.push(h * 60 + m);
      });
    });
  } else {
    activeShiftStartTimes.push(8 * 60); // 08:00 default
  }

  // Check if we are past any start time + 30 mins grace
  const pastShifts = activeShiftStartTimes.filter(start => currentMinutes > (start + 30));
  
  if (pastShifts.length > 0) {
    const presentEmployeeNames = new Set(
      records
        .filter(r => r.timestamp >= startOfDay && r.type === 'CHECK_IN')
        .map(r => r.workerName)
    );

    employees.forEach(emp => {
      // If present, skip
      if (presentEmployeeNames.has(emp.name)) return;

      // Check if on approved leave
      const isOnLeave = leaves.some(l => 
        l.employeeName === emp.name && 
        l.status === 'Approved' &&
        new Date(l.startDate) <= new Date() &&
        new Date(l.endDate) >= new Date()
      );

      if (isOnLeave) return;

      // Check if notification already exists for today to avoid spam
      const alreadyNotified = notifications.some(n => 
        n.title === 'تنبيه غياب' && 
        n.message.includes(emp.name) && 
        n.date === dateStrDisplay
      );

      if (!alreadyNotified) {
        saveNotification({
          id: Date.now().toString() + Math.random().toString().substr(2, 5),
          title: 'تنبيه غياب',
          message: `الموظف ${emp.name} لم يسجل الحضور اليوم (${isExtraWorkDay ? 'دوام إضافي' : dayName}) حتى الآن.`,
          date: dateStrDisplay,
          read: false
        });
        alertsGenerated++;
      }
    });
  }

  // --- CHECK 2: MISSING CHECKOUT (Yesterday) ---
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0,0,0,0);
  const yesterdayStart = yesterday.getTime();
  const yesterdayEnd = yesterdayStart + 86400000;
  const yesterdayDateStr = yesterday.toLocaleDateString('ar-EG');
  
  // Filter yesterday's records
  const yesterdayRecords = records.filter(r => r.timestamp >= yesterdayStart && r.timestamp < yesterdayEnd);

  employees.forEach(emp => {
     // Get this employee's records for yesterday
     const empRecs = yesterdayRecords.filter(r => r.workerName === emp.name).sort((a,b) => a.timestamp - b.timestamp);
     
     if (empRecs.length > 0) {
        // Check if last record is CHECK_IN (means they forgot to checkout)
        const lastRecord = empRecs[empRecs.length - 1];
        if (lastRecord.type === 'CHECK_IN') {
           
           // Avoid duplicate notifications (we use Today's date for notification entry date to make it visible)
           const alreadyNotifiedMissingOut = notifications.some(n => 
             n.title === 'تنبيه عدم انصراف' && 
             n.message.includes(emp.name) && 
             n.message.includes(yesterdayDateStr) &&
             n.date === dateStrDisplay // Notification created "today"
           );

           if (!alreadyNotifiedMissingOut) {
             saveNotification({
               id: Date.now().toString() + Math.random().toString().substr(2, 5),
               title: 'تنبيه عدم انصراف',
               message: `الموظف ${emp.name} لم يقم بتسجيل الانصراف ليوم أمس (${yesterdayDateStr}).`,
               date: dateStrDisplay,
               read: false
             });
             alertsGenerated++;
           }
        }
     }
  });

  return alertsGenerated;
};
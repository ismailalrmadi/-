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
import { db, isFirebaseEnabled } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

// Keys
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
const getFromStorage = async <T>(key: string, defaultData: T): Promise<T> => {
  if (isFirebaseEnabled() && db) {
    try {
      if (key === STORAGE_KEY_CONFIG) {
         const snapshot = await getDocs(collection(db, key));
         if (!snapshot.empty) return snapshot.docs[0].data() as T;
         return defaultData;
      }
      const snapshot = await getDocs(collection(db, key));
      if (snapshot.empty) return defaultData;
      return snapshot.docs.map(d => d.data()) as unknown as T;
    } catch (e) {
      console.error("Firebase Read Error:", e);
      return defaultData;
    }
  } else {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : defaultData;
    } catch (e) {
      return defaultData;
    }
  }
};

const saveToStorage = async <T>(key: string, data: T): Promise<void> => {
  if (isFirebaseEnabled() && db) {
      // Legacy wrapper fallback
  } else {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// Helper to save single document to collection
const saveDocument = async (collectionName: string, docId: string, data: any) => {
  if (isFirebaseEnabled() && db) {
    await setDoc(doc(db, collectionName, docId), data);
  } else {
    const list = await getFromStorage<any[]>(collectionName, []);
    const index = list.findIndex((i: any) => i.id === docId);
    if (index >= 0) list[index] = data;
    else list.push(data);
    localStorage.setItem(collectionName, JSON.stringify(list));
  }
}

const deleteDocument = async (collectionName: string, docId: string) => {
  if (isFirebaseEnabled() && db) {
    await deleteDoc(doc(db, collectionName, docId));
  } else {
     const list = await getFromStorage<any[]>(collectionName, []);
     const newList = list.filter((i: any) => i.id !== docId);
     localStorage.setItem(collectionName, JSON.stringify(newList));
  }
}

// --- REAL-TIME SUBSCRIPTIONS (OPTIMIZED) ---
export const subscribeToRecords = (callback: (data: AttendanceRecord[]) => void, limitCount = 500) => {
  if (isFirebaseEnabled() && db) {
    // Limit to recent records to prevent massive downloads
    const q = query(
      collection(db, STORAGE_KEY_RECORDS), 
      orderBy('timestamp', 'desc'), 
      limit(limitCount)
    );
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as AttendanceRecord);
      callback(data);
    }, (error) => {
      console.error("Subscription Error (Records):", error);
      // Fallback if index is missing (will fetch unsorted but that's better than crashing)
      getRecords(limitCount).then(callback); 
    });
  } else {
    getRecords().then(callback);
    return () => {}; // no-op unsub
  }
};

export const subscribeToEmployees = (callback: (data: Employee[]) => void) => {
  if (isFirebaseEnabled() && db) {
    return onSnapshot(collection(db, STORAGE_KEY_EMPLOYEES), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as Employee);
      callback(data);
    });
  } else {
    getEmployees().then(callback);
    return () => {};
  }
};

export const subscribeToNotifications = (callback: (data: Notification[]) => void) => {
  if (isFirebaseEnabled() && db) {
    // Limit notifications
    const q = query(collection(db, STORAGE_KEY_NOTIFICATIONS), limit(50));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as Notification);
      callback(data.sort((a, b) => parseInt(b.id) - parseInt(a.id)));
    });
  } else {
    getNotifications().then(callback);
    return () => {};
  }
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
    if (!parsed.role) parsed.role = 'USER';
    return parsed;
  } catch {
    return null;
  }
};

export const clearSession = (): void => {
  localStorage.removeItem(STORAGE_KEY_SESSION);
};

// --- Login Optimization ---
export const loginUser = async (username: string): Promise<Employee | null> => {
  if (isFirebaseEnabled() && db) {
    // Query specific user instead of fetching all
    const q = query(collection(db, STORAGE_KEY_EMPLOYEES), where("name", "==", username));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as Employee;
    }
    return null;
  } else {
    const employees = await getEmployees();
    return employees.find(e => e.name === username) || null;
  }
};

// --- Roles & Permissions ---
export const getRoleConfigs = async (): Promise<RoleConfig[]> => {
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
      permissions: [] 
    }
  ];
  return await getFromStorage<RoleConfig[]>(STORAGE_KEY_ROLES, defaultRoles);
};

export const saveRoleConfigs = async (configs: RoleConfig[]): Promise<void> => {
  for (const config of configs) {
    await saveDocument(STORAGE_KEY_ROLES, config.role, config);
  }
  await saveAuditLog({
    id: Date.now().toString(),
    action: "تحديث الصلاحيات",
    user: getSession()?.user || "System",
    timestamp: Date.now(),
    details: "تم تحديث صلاحيات الأدوار"
  });
};

export const hasPermission = async (userRole: UserRole, permission: Permission): Promise<boolean> => {
  if (userRole === 'ADMIN') return true; 
  const configs = await getRoleConfigs();
  const config = configs.find(c => c.role === userRole);
  return config ? config.permissions.includes(permission) : false;
};

// --- Config ---
export const getWorkshopConfig = async (): Promise<WorkshopConfig> => {
  const defaults = {
    name: "ورشة العمل الرئيسية",
    center: { latitude: 24.7136, longitude: 46.6753 }, 
    radiusMeters: 500,
    qrCodeValue: "WORKSHOP-SECRET-1"
  };
  if (isFirebaseEnabled() && db) {
     const snapshot = await getDocs(collection(db, STORAGE_KEY_CONFIG));
     if (!snapshot.empty) return snapshot.docs[0].data() as WorkshopConfig;
     return defaults;
  }
  return await getFromStorage<WorkshopConfig>(STORAGE_KEY_CONFIG, defaults);
};

export const saveWorkshopConfig = async (config: WorkshopConfig): Promise<void> => {
  if (isFirebaseEnabled() && db) {
     await setDoc(doc(db, STORAGE_KEY_CONFIG, 'main_config'), config);
  } else {
     saveToStorage(STORAGE_KEY_CONFIG, config);
  }
  await saveAuditLog({
    id: Date.now().toString(),
    action: "تحديث الإعدادات",
    user: "Admin",
    timestamp: Date.now(),
    details: "تم تحديث إعدادات الورشة والموقع"
  });
};

export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371e3; 
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// --- Records (OPTIMIZED) ---
export const getRecords = async (limitCount = 500): Promise<AttendanceRecord[]> => {
  if (isFirebaseEnabled() && db) {
    try {
      const q = query(collection(db, STORAGE_KEY_RECORDS), orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as AttendanceRecord);
    } catch (e) {
      console.warn("Falling back to basic query (Missing Index?):", e);
      // Fallback if index is missing: Fetch recent 500 without sort then sort client side
      // NOTE: limit() without orderBy works without index
      const q = query(collection(db, STORAGE_KEY_RECORDS), limit(limitCount)); 
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => d.data() as AttendanceRecord);
      return data.sort((a,b) => b.timestamp - a.timestamp);
    }
  }
  const records = await getFromStorage<AttendanceRecord[]>(STORAGE_KEY_RECORDS, []);
  return records.sort((a, b) => b.timestamp - a.timestamp);
};

// New function to fetch only specific user records (Great for performance)
export const getUserRecords = async (username: string, limitCount = 100): Promise<AttendanceRecord[]> => {
  if (isFirebaseEnabled() && db) {
    try {
      const q = query(
        collection(db, STORAGE_KEY_RECORDS), 
        where('workerName', '==', username),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as AttendanceRecord);
    } catch (e) {
      console.warn("Complex query failed (needs index), falling back to filtering:", e);
      // Fallback: Get recent records and filter in JS
      const all = await getRecords(1000); 
      return all.filter(r => r.workerName === username);
    }
  }
  const all = await getRecords();
  return all.filter(r => r.workerName === username);
};

export const saveRecord = async (record: AttendanceRecord): Promise<void> => {
  await saveDocument(STORAGE_KEY_RECORDS, record.id, record);
};

// --- Employees ---
export const getEmployees = async (): Promise<Employee[]> => {
  const defaults: Employee[] = [
    { id: '1', name: 'مدير النظام', role: 'ADMIN', phone: '0500000000', status: 'Active', password: 'admin' },
  ];
  if (isFirebaseEnabled() && db) {
    const snapshot = await getDocs(collection(db, STORAGE_KEY_EMPLOYEES));
    if (snapshot.empty) {
      await saveEmployee(defaults[0]);
      return defaults;
    }
    return snapshot.docs.map(d => d.data()) as Employee[];
  }
  const data = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
  if (!data) {
    localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

export const saveEmployee = async (employee: Employee): Promise<void> => {
  await saveDocument(STORAGE_KEY_EMPLOYEES, employee.id, employee);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await deleteDocument(STORAGE_KEY_EMPLOYEES, id);
};

// --- Geofences ---
export const getGeofences = async (): Promise<Geofence[]> => {
  const defaults: Geofence[] = [{
    id: '1',
    name: "الورشة الرئيسية",
    center: { latitude: 24.7136, longitude: 46.6753 },
    radiusMeters: 500,
    active: true
  }];
  return await getFromStorage<Geofence[]>(STORAGE_KEY_GEOFENCES, defaults);
};

export const saveGeofence = async (geofence: Geofence): Promise<void> => {
  await saveDocument(STORAGE_KEY_GEOFENCES, geofence.id, geofence);
};

export const deleteGeofence = async (id: string): Promise<void> => {
  await deleteDocument(STORAGE_KEY_GEOFENCES, id);
};

// --- Schedules ---
export const getWorkSchedules = async (): Promise<WorkSchedule[]> => {
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
  return await getFromStorage<WorkSchedule[]>(STORAGE_KEY_SCHEDULES, defaults);
};

export const saveWorkSchedule = async (schedule: WorkSchedule): Promise<void> => {
  await saveDocument(STORAGE_KEY_SCHEDULES, schedule.id, schedule);
};

export const deleteWorkSchedule = async (id: string): Promise<void> => {
  await deleteDocument(STORAGE_KEY_SCHEDULES, id);
};

// --- Calendar Events ---
export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  return await getFromStorage<CalendarEvent[]>(STORAGE_KEY_CALENDAR_EVENTS, []);
};

export const saveCalendarEvent = async (event: CalendarEvent): Promise<void> => {
  await saveDocument(STORAGE_KEY_CALENDAR_EVENTS, event.id, event);
};

export const deleteCalendarEvent = async (id: string): Promise<void> => {
  await deleteDocument(STORAGE_KEY_CALENDAR_EVENTS, id);
};

// --- Leaves ---
export const getLeaveRequests = async (): Promise<LeaveRequest[]> => {
  return await getFromStorage<LeaveRequest[]>(STORAGE_KEY_LEAVES, []);
};

export const saveNewLeaveRequest = async (request: LeaveRequest): Promise<void> => {
  await saveDocument(STORAGE_KEY_LEAVES, request.id, request);
  await saveNotification({
    id: Date.now().toString(),
    title: 'طلب إجازة جديد',
    message: `قام الموظف ${request.employeeName} بتقديم طلب إجازة.`,
    date: new Date().toLocaleDateString('ar-EG'),
    read: false
  });
};

export const updateLeaveStatus = async (id: string, status: 'Approved' | 'Rejected'): Promise<void> => {
  let item: LeaveRequest | undefined;
  if (isFirebaseEnabled() && db) {
     const d = await getDocs(query(collection(db, STORAGE_KEY_LEAVES), where('id', '==', id)));
     if (!d.empty) item = d.docs[0].data() as LeaveRequest;
  } else {
     const list = await getLeaveRequests();
     item = list.find(l => l.id === id);
  }

  if (item) {
    item.status = status;
    await saveDocument(STORAGE_KEY_LEAVES, id, item);
    await saveNotification({
      id: Date.now().toString(),
      title: status === 'Approved' ? 'تمت الموافقة على الإجازة' : 'تم رفض الإجازة',
      message: `تم ${status === 'Approved' ? 'قبول' : 'رفض'} طلب الإجازة للموظف ${item.employeeName}`,
      date: new Date().toLocaleDateString('ar-EG'),
      read: false
    });
  }
};

// --- Logs & Notifications (OPTIMIZED) ---
export const getAuditLogs = async (): Promise<AuditLog[]> => {
  if (isFirebaseEnabled() && db) {
      const q = query(collection(db, STORAGE_KEY_LOGS), orderBy('timestamp', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as AuditLog);
  }
  const logs = await getFromStorage<AuditLog[]>(STORAGE_KEY_LOGS, []);
  return logs.sort((a,b) => b.timestamp - a.timestamp);
};

export const saveAuditLog = async (log: AuditLog): Promise<void> => {
  await saveDocument(STORAGE_KEY_LOGS, log.id, log);
};

export const getNotifications = async (): Promise<Notification[]> => {
  if (isFirebaseEnabled() && db) {
      const q = query(collection(db, STORAGE_KEY_NOTIFICATIONS), limit(50));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as Notification).sort((a,b) => parseInt(b.id) - parseInt(a.id));
  }
  const notes = await getFromStorage<Notification[]>(STORAGE_KEY_NOTIFICATIONS, []);
  return notes.sort((a,b) => parseInt(b.id) - parseInt(a.id));
};

export const saveNotification = async (note: Notification): Promise<void> => {
  await saveDocument(STORAGE_KEY_NOTIFICATIONS, note.id, note);
};

// --- CHECK: Absence ---
export const checkAndGenerateAbsenceAlerts = async (): Promise<number> => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const todayStr = (new Date(today.getTime() - offset)).toISOString().slice(0, 10);
  const startOfDay = new Date(today.setHours(0,0,0,0)).getTime();
  const dayName = new Date().toLocaleDateString('ar-EG', { weekday: 'long' });

  const calendarEvents = await getCalendarEvents();
  const todayEvent = calendarEvents.find(e => e.date === todayStr);

  if (todayEvent?.type === 'HOLIDAY') return 0;

  const allSchedules = await getWorkSchedules();
  const todaySchedules = allSchedules.filter(s => s.days.includes(dayName));

  const isRegularWorkDay = allSchedules.length === 0 || todaySchedules.length > 0;
  const isExtraWorkDay = todayEvent?.type === 'EXTRA_WORKDAY';

  if (!isRegularWorkDay && !isExtraWorkDay) return 0;

  let alertsGenerated = 0;
  const allEmployees = await getEmployees();
  const employees = allEmployees.filter(e => e.status === 'Active');
  
  // Use recent records only for checking today's absence (Optimization)
  const records = await getRecords(500); 
  
  const leaves = await getLeaveRequests();
  const notifications = await getNotifications();
  const dateStrDisplay = new Date().toLocaleDateString('ar-EG');
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  let activeShiftStartTimes: number[] = [];
  if (todaySchedules.length > 0) {
    todaySchedules.forEach(s => {
      s.shifts.forEach(shift => {
        const [h, m] = shift.start.split(':').map(Number);
        activeShiftStartTimes.push(h * 60 + m);
      });
    });
  } else {
    activeShiftStartTimes.push(8 * 60); 
  }

  const pastShifts = activeShiftStartTimes.filter(start => currentMinutes > (start + 30));
  
  if (pastShifts.length > 0) {
    const presentEmployeeNames = new Set(
      records
        .filter(r => r.timestamp >= startOfDay && r.type === 'CHECK_IN')
        .map(r => r.workerName)
    );

    for (const emp of employees) {
      if (presentEmployeeNames.has(emp.name)) continue;
      const isOnLeave = leaves.some(l => 
        l.employeeName === emp.name && 
        l.status === 'Approved' &&
        new Date(l.startDate) <= new Date() &&
        new Date(l.endDate) >= new Date()
      );
      if (isOnLeave) continue;
      const alreadyNotified = notifications.some(n => 
        n.title === 'تنبيه غياب' && 
        n.message.includes(emp.name) && 
        n.date === dateStrDisplay
      );
      if (!alreadyNotified) {
        await saveNotification({
          id: Date.now().toString() + Math.random().toString().substr(2, 5),
          title: 'تنبيه غياب',
          message: `الموظف ${emp.name} لم يسجل الحضور اليوم (${isExtraWorkDay ? 'دوام إضافي' : dayName}) حتى الآن.`,
          date: dateStrDisplay,
          read: false
        });
        alertsGenerated++;
      }
    }
  }

  return alertsGenerated;
};
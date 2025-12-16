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
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';

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
      // For config (single document)
      if (key === STORAGE_KEY_CONFIG) {
         const snapshot = await getDocs(collection(db, key));
         if (!snapshot.empty) return snapshot.docs[0].data() as T;
         return defaultData;
      }
      
      // For collections (arrays)
      const snapshot = await getDocs(collection(db, key));
      if (snapshot.empty) return defaultData;
      return snapshot.docs.map(d => d.data()) as unknown as T;
    } catch (e) {
      console.error("Firebase Read Error:", e);
      return defaultData;
    }
  } else {
    // Fallback to LocalStorage (Simulated Async)
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : defaultData;
    } catch (e) {
      return defaultData;
    }
  }
};

const saveToStorage = async <T>(key: string, data: T, id?: string): Promise<void> => {
  if (isFirebaseEnabled() && db) {
    try {
      if (Array.isArray(data)) {
         // This is tricky with Firestore as it's collection-based, not array-blob based.
         // For this migration, we will save individual items if ID is provided, 
         // OR we assume the caller is passing the WHOLE array and we might have to overwrite.
         // BUT, to keep it simple and compatible with previous code structure:
         // We will NOT save the whole array at once in Firestore usually.
         // However, the previous code passed the whole array 'updated'.
         // To make this work with Firestore properly, we should save ONE item at a time.
         // *Hotfix*: The calling functions below are updated to handle single item saves/deletes where possible,
         // or we accept that for now we might rely on specific collection logic below.
      } else {
         // Single config object
         await setDoc(doc(db, key, 'main_config'), data as any);
      }
    } catch (e) {
      console.error("Firebase Save Error:", e);
    }
  } else {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// Helper to save single document to collection
const saveDocument = async (collectionName: string, docId: string, data: any) => {
  if (isFirebaseEnabled() && db) {
    await setDoc(doc(db, collectionName, docId), data);
  } else {
    // LocalStorage emulation for array
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

// --- Session (Login/Remember Me) - Keep LocalStorage for Session ---
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
  // In Firestore, we store these as individual docs in 'role_configs_v1'
  // But since it's a small fixed list, retrieving all is fine
  return await getFromStorage<RoleConfig[]>(STORAGE_KEY_ROLES, defaultRoles);
};

export const saveRoleConfigs = async (configs: RoleConfig[]): Promise<void> => {
  // Save each role config individually
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
  // Special handler for single config doc
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

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// --- Records ---
export const getRecords = async (): Promise<AttendanceRecord[]> => {
  const records = await getFromStorage<AttendanceRecord[]>(STORAGE_KEY_RECORDS, []);
  // Sort by timestamp desc
  return records.sort((a, b) => b.timestamp - a.timestamp);
};

export const saveRecord = async (record: AttendanceRecord): Promise<void> => {
  await saveDocument(STORAGE_KEY_RECORDS, record.id, record);
  
  await saveAuditLog({
    id: Date.now().toString(),
    action: record.type,
    user: record.workerName,
    timestamp: Date.now(),
    details: `الطريقة: ${record.verificationMethod} | موثق: ${record.locationVerified}`
  });
};

// --- Employees ---
export const getEmployees = async (): Promise<Employee[]> => {
  const defaults: Employee[] = [
    { id: '1', name: 'مدير النظام', role: 'ADMIN', phone: '0500000000', status: 'Active', password: 'admin' },
    { id: '2', name: 'موظف تجربة', role: 'USER', phone: '0555555555', status: 'Active', password: '123' },
  ];
  
  if (isFirebaseEnabled() && db) {
    const snapshot = await getDocs(collection(db, STORAGE_KEY_EMPLOYEES));
    if (snapshot.empty) {
        // Optional: Seed defaults if empty
        return [];
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
  // Need to fetch item first to get name
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

// --- Logs & Notifications ---
export const getAuditLogs = async (): Promise<AuditLog[]> => {
  const logs = await getFromStorage<AuditLog[]>(STORAGE_KEY_LOGS, []);
  return logs.sort((a,b) => b.timestamp - a.timestamp);
};

export const saveAuditLog = async (log: AuditLog): Promise<void> => {
  await saveDocument(STORAGE_KEY_LOGS, log.id, log);
};

export const getNotifications = async (): Promise<Notification[]> => {
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

  // Load Data Async
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
  const records = await getRecords();
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

  // Check Yesterday Missing Out
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0,0,0,0);
  const yesterdayStart = yesterday.getTime();
  const yesterdayEnd = yesterdayStart + 86400000;
  const yesterdayDateStr = yesterday.toLocaleDateString('ar-EG');
  
  const yesterdayRecords = records.filter(r => r.timestamp >= yesterdayStart && r.timestamp < yesterdayEnd);

  for (const emp of employees) {
     const empRecs = yesterdayRecords.filter(r => r.workerName === emp.name).sort((a,b) => a.timestamp - b.timestamp);
     
     if (empRecs.length > 0) {
        const lastRecord = empRecs[empRecs.length - 1];
        if (lastRecord.type === 'CHECK_IN') {
           const alreadyNotifiedMissingOut = notifications.some(n => 
             n.title === 'تنبيه عدم انصراف' && 
             n.message.includes(emp.name) && 
             n.message.includes(yesterdayDateStr) &&
             n.date === dateStrDisplay
           );

           if (!alreadyNotifiedMissingOut) {
             await saveNotification({
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
  }

  return alertsGenerated;
};
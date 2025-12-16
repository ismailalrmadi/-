
export enum AttendanceType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Changed from strictly 'ADMIN' | 'USER' to string to allow custom roles like 'SUPERVISOR'
export type UserRole = 'ADMIN' | 'USER' | 'SUPERVISOR' | string;

export type Permission = 
  | 'VIEW_OVERVIEW'
  | 'MANAGE_EMPLOYEES' // View, Add, Edit, Delete Employees
  | 'VIEW_ATTENDANCE'
  | 'MANAGE_GEOFENCES'
  | 'MANAGE_LEAVES'    // Approve/Reject
  | 'MANAGE_SCHEDULES'
  | 'VIEW_REPORTS'
  | 'VIEW_LOGS'
  | 'MANAGE_ROLES';    // Configure permissions

export interface RoleConfig {
  role: UserRole;
  permissions: Permission[];
}

export interface AttendanceRecord {
  id: string;
  workerName: string;
  timestamp: number; // Unix timestamp
  type: AttendanceType;
  location: Coordinates;
  photoUrl: string; // Base64 data URI
  locationVerified: boolean; // Was user within range?
  verificationMethod: 'GPS' | 'QR'; // New field
}

// --- New Models for Dashboard ---

export interface Employee {
  id: string;
  name: string;
  role: UserRole; // Updated to use the flexible UserRole type
  phone: string;
  status: 'Active' | 'Inactive';
  password?: string; // Added password field
}

export interface Geofence {
  id: string;
  name: string;
  center: Coordinates;
  radiusMeters: number;
  active: boolean;
}

export interface ShiftPeriod {
  start: string; // "08:00"
  end: string;   // "12:00"
  name?: string; // "Morning" or "Evening"
}

export interface WorkSchedule {
  id: string;
  shiftName: string;
  shifts: ShiftPeriod[]; // Array of shifts (e.g., Morning 8-12, Evening 13-17)
  days: string[]; // ["Sun", "Mon", ...]
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: number;
  details: string;
}

export interface CalendarEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'HOLIDAY' | 'EXTRA_WORKDAY';
}

export type ViewState = 'HOME' | 'HISTORY' | 'SETTINGS' | 'DASHBOARD' | 'LEAVES' | 'USER_DASHBOARD';

export interface WorkshopConfig {
  name: string;
  center: Coordinates;
  radiusMeters: number;
  qrCodeValue: string; // New field for the Secret QR string
}

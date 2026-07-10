export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  lat: number;
  lng: number;
  address: string;
  neighborhood?: string; // حي الرياض (للتحكم وتصنيف النطاق الجغرافي)
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  description: string;
  status: 'planning' | 'active' | 'completed';
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  status: 'idle' | 'traveling' | 'working' | 'break';
  vehicle: string;
  rating: number;
  currentLat: number;
  currentLng: number;
  color: string;
  shiftStart: string; // e.g. "08:00"
  shiftEnd: string;   // e.g. "17:00"
  breaks: {
    id: string;
    type: 'Lunch' | 'Rest';
    startTime: string; // e.g. "12:00"
    endTime: string;   // e.g. "13:00"
  }[];
  vacations?: string; // e.g. "الجمعة والسبت" or specific dates
}

export type JobScope = 'غرفة' | 'غرفتين' | 'ثلاث غرف' | 'فيلا' | 'غير محدد';

export interface Visit {
  id: string;
  clientId: string;
  technicianId: string;
  title: string;
  type: 'Maintenance' | 'Installation' | 'Repair' | 'Inspection';
  status: 'pending' | 'en_route' | 'checked_in' | 'completed' | 'delayed';
  date: string; // YYYY-MM-DD
  plannedStartTime: string; // HH:MM
  plannedEndTime: string;   // HH:MM
  actualStartTime?: string; // HH:MM
  actualEndTime?: string;   // HH:MM
  notes?: string;
  originalWorks?: string;
  photoUrl?: string;
  signatureUrl?: string;
  delayReason?: string;
  feedbackRating?: number; // 1-5
  feedbackComments?: string;
  routeSequence?: number;
  jobScope?: JobScope;
  estimatedDuration?: number; // in minutes
}

export interface Route {
  id: string;
  technicianId: string;
  date: string;
  visitIds: string[];
  totalDistanceKm: number;
  totalDurationMin: number;
  isFavorite?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  technicianId: string;
  technicianName: string;
  visitId?: string;
  clientName?: string;
  action: string; // e.g. "Started travel to client", "Checked-in", "Uploaded photo", "Completed"
  type: 'info' | 'success' | 'warning' | 'error';
}

export type UserRole = 'admin' | 'manager' | 'technician';

export interface RolePermissions {
  manageUsers: boolean;       // Create/edit/delete techs & clients
  scheduleVisits: boolean;    // Add/delete/assign visits
  optimizeRoutes: boolean;    // Route TSP optimization
  importCRM: boolean;         // Import bulk data
  viewAnalytics: boolean;     // View analytics charts
  managePermissions: boolean; // Customize this matrix
  completeVisits: boolean;    // Field updates on visits
  resetDatabase: boolean;     // Total wipe
}


export interface AppUser {
  id: string;
  name: string;
  phone: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'suspended';
  lastActive: string;
}

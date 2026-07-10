import { Client, Project, Technician, Visit, Route, LogEntry } from '../types';

export const initialClients: Client[] = [
  {
    id: 'c1',
    name: 'مجمع برج رافال السكني',
    contactPerson: 'م. طارق الدوسري',
    phone: '+966 50 123 4567',
    lat: 24.7951,
    lng: 46.6321,
    address: 'حي الصحافة، طريق الملك فهد، الرياض',
    neighborhood: 'حي الصحافة (شمال الرياض)'
  },
  {
    id: 'c2',
    name: 'فلل الماجدية السكنية 112',
    contactPerson: 'أ. ليلى الشمري',
    phone: '+966 55 987 6543',
    lat: 24.8192,
    lng: 46.6115,
    address: 'حي الملقا، شمال الرياض',
    neighborhood: 'حي الملقا (شمال الرياض)'
  },
  {
    id: 'c3',
    name: 'مجمع النخيل مول التجاري',
    contactPerson: 'م. أحمد الحارثي',
    phone: '+966 56 765 4321',
    lat: 24.7475,
    lng: 46.7112,
    address: 'حي المغرزات، طريق الإمام سعود، الرياض',
    neighborhood: 'حي المغرزات (شرق الرياض)'
  },
  {
    id: 'c4',
    name: 'شقق الياسمين الفاخرة',
    contactPerson: 'أ. نورة القحطاني',
    phone: '+966 54 333 4444',
    lat: 24.8213,
    lng: 46.6432,
    address: 'حي الياسمين، شمال الرياض',
    neighborhood: 'حي الياسمين (شمال الرياض)'
  },
  {
    id: 'c5',
    name: 'قصر حي حطين الجديد',
    contactPerson: 'أ. يوسف العتيبي',
    phone: '+966 53 111 2222',
    lat: 24.7588,
    lng: 46.6120,
    address: 'حي حطين، غرب الرياض',
    neighborhood: 'حي حطين (غرب الرياض)'
  },
  {
    id: 'c6',
    name: 'معارض العليا للأثاث والمطابخ',
    contactPerson: 'م. رانيا السديري',
    phone: '+966 59 555 6666',
    lat: 24.7078,
    lng: 46.6749,
    address: 'حي العليا، طريق الملك فهد، الرياض',
    neighborhood: 'حي العليا (وسط الرياض)'
  },
  {
    id: 'c7',
    name: 'برج تمكين السكني والإداري',
    contactPerson: 'أ. زيد المطيري',
    phone: '+966 55 999 8888',
    lat: 24.8115,
    lng: 46.6302,
    address: 'حي الغدير، طريق الملك فهد، الرياض',
    neighborhood: 'حي الغدير (شمال الرياض)'
  }
];

export const initialProjects: Project[] = [
  {
    id: 'p1',
    name: 'مشروع رفع مقاسات أبراج رافال',
    clientId: 'c1',
    description: 'رفع مقاسات تفصيلية للمطابخ وخزائن الملابس للشقق الفاخرة',
    status: 'active'
  },
  {
    id: 'p2',
    name: 'مشروع فلل الملقا النموذجية',
    clientId: 'c2',
    description: 'رفع مقاسات الأبواب الداخلية ونوافذ الألمنيوم دبل جلاس',
    status: 'active'
  },
  {
    id: 'p3',
    name: 'مشروع رخام مجمع النخيل مول',
    clientId: 'c3',
    description: 'رفع مقاسات الواجهات الرخامية والدرج الداخلي والمدخل الرئيسي',
    status: 'planning'
  }
];

export const initialTechnicians: Technician[] = [
  {
    id: 't1',
    name: 'سامر النجار',
    phone: '+966 50 000 1111',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'idle',
    vehicle: 'هيونداي H1 لرفع المقاسات (T-101)',
    rating: 4.8,
    currentLat: 24.7078,
    currentLng: 46.6749,
    color: '#0ea5e9',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    breaks: [
      { id: 'b1_1', type: 'Lunch', startTime: '12:00', endTime: '13:00' },
      { id: 'b1_2', type: 'Rest', startTime: '15:00', endTime: '15:15' }
    ],
    vacations: 'الجمعة والسبت (إجازة أسبوعية)'
  },
  {
    id: 't2',
    name: 'رامي الخوري',
    phone: '+966 55 000 2222',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'idle',
    vehicle: 'تويوتا إنوفا مجهزة (T-102)',
    rating: 4.9,
    currentLat: 24.7554,
    currentLng: 46.6667,
    color: '#10b981',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    breaks: [
      { id: 'b2_1', type: 'Lunch', startTime: '12:30', endTime: '13:30' }
    ],
    vacations: 'الجمعة والسبت (إجازة أسبوعية)'
  },
  {
    id: 't3',
    name: 'كرم الزعبي',
    phone: '+966 56 000 3333',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'idle',
    vehicle: 'فورد ترانزيت قياس ليزر (T-103)',
    rating: 4.7,
    currentLat: 24.8213,
    currentLng: 46.6432,
    color: '#f59e0b',
    shiftStart: '09:00',
    shiftEnd: '18:00',
    breaks: [
      { id: 'b3_1', type: 'Lunch', startTime: '13:00', endTime: '14:00' }
    ],
    vacations: 'السبت والأحد (إجازة أسبوعية)'
  }
];

export const initialVisits: Visit[] = [
  {
    id: 'v1',
    clientId: 'c1',
    technicianId: 't1',
    title: 'رفع مقاسات مطابخ برج رافال',
    type: 'Maintenance',
    status: 'pending',
    date: '2026-07-09',
    plannedStartTime: '08:30',
    plannedEndTime: '10:00',
    notes: 'يرجى أخذ المقاسات الدقيقة لفتحة المطبخ بالليزر مع تحديد أماكن مخارج السباكة وتوزيع الأفياش.',
    routeSequence: 1
  },
  {
    id: 'v2',
    clientId: 'c2',
    technicianId: 't1',
    title: 'رفع مقاسات نوافذ فلل الملقا',
    type: 'Installation',
    status: 'pending',
    date: '2026-07-09',
    plannedStartTime: '10:30',
    plannedEndTime: '12:00',
    notes: 'أخذ مقاسات حلوق النوافذ والأبواب الخارجية للفيلا رقم 14 للتجهيز والقص والتركيب.',
    routeSequence: 2
  },
  {
    id: 'v3',
    clientId: 'c4',
    technicianId: 't1',
    title: 'رفع مقاسات ستائر شقق الياسمين',
    type: 'Inspection',
    status: 'pending',
    date: '2026-07-09',
    plannedStartTime: '13:30',
    plannedEndTime: '15:30',
    notes: 'مطلوب قياس تجاويف الجبس العلوية للستائر المخفية في الصالات وغرف النوم الرئيسية.',
    routeSequence: 3
  },
  {
    id: 'v4',
    clientId: 'c3',
    technicianId: 't2',
    title: 'رفع مقاسات رخام مداخل النخيل',
    type: 'Repair',
    status: 'pending',
    date: '2026-07-09',
    plannedStartTime: '09:00',
    plannedEndTime: '11:00',
    notes: 'رفع مقاسات الدرج والممرات الجانبية لمطابقة رسومات الأوتوكاد قبل التوريد وقص الرخام.',
    routeSequence: 1
  },
  {
    id: 'v5',
    clientId: 'c5',
    technicianId: 't2',
    title: 'رفع مقاسات مغاسل قصر حطين',
    type: 'Repair',
    status: 'pending',
    date: '2026-07-09',
    plannedStartTime: '11:30',
    plannedEndTime: '13:30',
    notes: 'رفع مقاسات أسطح الكوارتز والمغاسل الرخامية الفاخرة لمجالس الرجال والنساء.',
    routeSequence: 2
  },
  {
    id: 'v6',
    clientId: 'c6',
    technicianId: 't3',
    title: 'رفع مقاسات معارض العليا',
    type: 'Maintenance',
    status: 'pending',
    date: '2026-07-09',
    plannedStartTime: '10:00',
    plannedEndTime: '12:30',
    notes: 'رفع مقاسات بارتشنات المعرض وتجاليد الجدران الخشبية وخزائن العرض الرئيسية.',
    routeSequence: 1
  },
  {
    id: 'v7',
    clientId: 'c7',
    technicianId: 't3',
    title: 'رفع مقاسات زجاج برج تمكين',
    type: 'Installation',
    status: 'pending',
    date: '2026-07-09',
    plannedStartTime: '14:30',
    plannedEndTime: '16:00',
    notes: 'رفع مقاسات فواصل الزجاج السيكوريت للمكاتب في الدور الـ 12 وباقي المكاتب الإدارية.',
    routeSequence: 2
  }
];

export const initialRoutes: Route[] = [
  {
    id: 'r_t1',
    technicianId: 't1',
    date: '2026-07-09',
    visitIds: ['v1', 'v2', 'v3'],
    totalDistanceKm: 16.4,
    totalDurationMin: 210,
    isFavorite: true
  },
  {
    id: 'r_t2',
    technicianId: 't2',
    date: '2026-07-09',
    visitIds: ['v4', 'v5'],
    totalDistanceKm: 11.2,
    totalDurationMin: 140
  },
  {
    id: 'r_t3',
    technicianId: 't3',
    date: '2026-07-09',
    visitIds: ['v6', 'v7'],
    totalDistanceKm: 14.8,
    totalDurationMin: 165
  }
];

export const initialLogs: LogEntry[] = [
  {
    id: 'l1',
    timestamp: '08:00',
    technicianId: 't1',
    technicianName: 'سامر النجار',
    action: 'سجل الدخول لبدء مهام رفع المقاسات اليومية بالليزر',
    type: 'info'
  },
  {
    id: 'l2',
    timestamp: '08:05',
    technicianId: 't2',
    technicianName: 'رامي الخوري',
    action: 'بدأ جولة فحص جاهزية المركبة وأجهزة قياس الليزر',
    type: 'info'
  },
  {
    id: 'l3',
    timestamp: '08:15',
    technicianId: 't3',
    technicianName: 'كرم الزعبي',
    action: 'سجل الدخول وتحميل قائمة عملاء رفع المقاسات بشمال الرياض',
    type: 'info'
  }
];

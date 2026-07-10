import React, { useState, useEffect, useRef } from 'react';
import { Client, Visit, Technician, JobScope } from '../types';
import { parseJobScopeFromWorks } from '../utils';
import { 
  FileSpreadsheet, 
  ClipboardPaste, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  Plus, 
  Trash2, 
  HelpCircle, 
  Layers, 
  ArrowRightLeft, 
  Link2, 
  LogOut, 
  RefreshCw, 
  CheckSquare,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';
import { googleSignIn, initAuth, logoutGoogle, getAccessToken } from '../lib/googleAuth';
import { User as FirebaseUser } from 'firebase/auth';

interface CRMImporterProps {
  clients: Client[];
  technicians: Technician[];
  visits?: Visit[];
  onAddClient: (client: Omit<Client, 'id'> & { id?: string }) => void;
  onAddVisit: (visit: Omit<Visit, 'id'> & { id?: string }) => void;
  onAddVisits?: (visits: (Omit<Visit, 'id'> & { id?: string })[]) => void;
  onAddClients?: (clients: Omit<Client, 'id'>[]) => void;
  appendLog: (techId: string, action: string, type: 'info' | 'success' | 'warning' | 'error', visitId?: string) => void;
}

// Helper to get non-overlapping time slot for a technician on a specific date
function getNextAvailableTime(
  techId: string,
  dateStr: string,
  durationMinutes: number,
  existingVisits: Visit[],
  newVisits: any[],
  defaultShiftStart: string
) {
  const combined = [
    ...existingVisits.filter(v => v.technicianId === techId && v.date === dateStr),
    ...newVisits.filter(v => v.technicianId === techId && v.date === dateStr)
  ];

  if (combined.length === 0) {
    const [sh, sm] = defaultShiftStart.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = startMins + durationMinutes;
    return {
      start: `${String(Math.floor(startMins / 60) % 24).padStart(2, '0')}:${String(startMins % 60).padStart(2, '0')}`,
      end: `${String(Math.floor(endMins / 60) % 24).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`
    };
  }

  let maxEndMins = 0;
  combined.forEach(v => {
    if (!v.plannedEndTime) return;
    const [eh, em] = v.plannedEndTime.split(':').map(Number);
    const endMins = eh * 60 + em;
    if (endMins > maxEndMins) {
      maxEndMins = endMins;
    }
  });

  // 30 mins buffer between visits
  const buffer = 30;
  const nextStartMins = maxEndMins + buffer;
  const nextEndMins = nextStartMins + durationMinutes;

  return {
    start: `${String(Math.floor(nextStartMins / 60) % 24).padStart(2, '0')}:${String(nextStartMins % 60).padStart(2, '0')}`,
    end: `${String(Math.floor(nextEndMins / 60) % 24).padStart(2, '0')}:${String(nextEndMins % 60).padStart(2, '0')}`
  };
}

interface ParsedRow {
  date: string;
  clientName: string;
  neighborhood: string;
  region: string;
  phone: string;
  works: string;
  agent: string;
  locationRaw: string;
  notes: string;
  status: string;
  lat: number;
  lng: number;
  isValid: boolean;
  isDuplicate: boolean;
  matchType: 'coordinates' | 'neighborhood' | 'default';
}

const NEIGHBORHOOD_COORDS: { [key: string]: { lat: number; lng: number; region: string } } = {
  'النخيل': { lat: 24.7475, lng: 46.6400, region: 'شمال الرياض' },
  'السويدي': { lat: 24.5950, lng: 46.6210, region: 'جنوب الرياض' },
  'المهدية': { lat: 24.6320, lng: 46.4950, region: 'غرب الرياض' },
  'العوالي': { lat: 24.5450, lng: 46.5680, region: 'غرب الرياض' },
  'ظهرة لبن': { lat: 24.6390, lng: 46.5350, region: 'غرب الرياض' },
  'لبن': { lat: 24.6390, lng: 46.5350, region: 'غرب الرياض' },
  'المغرزات': { lat: 24.7475, lng: 46.7112, region: 'شرق الرياض' },
  'الحزم': { lat: 24.5420, lng: 46.6120, region: 'جنوب الرياض' },
  'الربيع': { lat: 24.7932, lng: 46.6512, region: 'شمال الرياض' },
  'الملقا': { lat: 24.8192, lng: 46.6115, region: 'شمال الرياض' },
  'الياسمين': { lat: 24.8213, lng: 46.6432, region: 'شمال الرياض' },
  'العقيق': { lat: 24.7876, lng: 46.6204, region: 'شمال الرياض' },
  'النرجس': { lat: 24.8425, lng: 46.6800, region: 'شمال الرياض' },
  'الصحافة': { lat: 24.7951, lng: 46.6321, region: 'شمال الرياض' },
  'الغدير': { lat: 24.8115, lng: 46.6302, region: 'شمال الرياض' },
  'القيروان': { lat: 24.8654, lng: 46.5912, region: 'شمال الرياض' },
  'الروضة': { lat: 24.7297, lng: 46.7794, region: 'شرق الرياض' },
  'النسيم': { lat: 24.7200, lng: 46.8300, region: 'شرق الرياض' },
  'الريان': { lat: 24.7170, lng: 46.7840, region: 'شرق الرياض' },
  'الحمراء': { lat: 24.7735, lng: 46.7620, region: 'شرق الرياض' },
  'قرطبة': { lat: 24.8105, lng: 46.7450, region: 'شرق الرياض' },
  'اليرموك': { lat: 24.8170, lng: 46.7910, region: 'شرق الرياض' },
  'حطين': { lat: 24.7588, lng: 46.6120, region: 'غرب الرياض' },
  'البديعة': { lat: 24.6150, lng: 46.6100, region: 'غرب الرياض' },
  'الدرعية': { lat: 24.7333, lng: 46.5667, region: 'غرب الرياض' },
  'عرقة': { lat: 24.6850, lng: 46.5820, region: 'غرب الرياض' },
  'الشفا': { lat: 24.5574, lng: 46.6974, region: 'جنوب الرياض' },
  'العزيزية': { lat: 24.5910, lng: 46.7410, region: 'جنوب الرياض' },
  'المروة': { lat: 24.5380, lng: 46.7020, region: 'جنوب الرياض' },
  'السلي': { lat: 24.6440, lng: 46.8200, region: 'جنوب الرياض' },
  'الدار البيضاء': { lat: 24.5290, lng: 46.7600, region: 'جنوب الرياض' },
  'العليا': { lat: 24.7078, lng: 46.6749, region: 'وسط الرياض' },
  'السليمانية': { lat: 24.7050, lng: 46.6990, region: 'وسط الرياض' },
  'المربع': { lat: 24.6550, lng: 46.7110, region: 'وسط الرياض' },
  'الملز': { lat: 24.6710, lng: 46.7320, region: 'وسط الرياض' },
  'البطحاء': { lat: 24.6333, lng: 46.7167, region: 'وسط الرياض' }
};

const MOCK_GOOGLE_SHEETS_DATA = `2026-07-03\tابراهيم عبدالله الصايغ\tالنخيل\tشمال الرياض\t0581055502\t3غرف\tمحمد سليمان\t24° 44' 58.565" N 46° 40' 11.234" E\tضروري\tتم التواصل مع العميل وتحديد موعد 3.30
2026-07-04\tبدر مرزوق الدعجاني\tالسويدي\tجنوب الرياض\t050003020\tغرفه\tمحمد رضا\t24° 34' 55.2162" N 46° 37' 10.123" E\tيوجد شطره\tتم تحديد موعد
2026-07-04\tعبدالرحمن عبدالله المويهان\tالمهدية\tغرب الرياض\t0508688288\tكوفي كورنر\tمحمد رضا\thttps://maps.app.goo.gl/9ZpYt87U7X\t\tتم تنسيق موعد المغرب
2026-07-04\tمرام منصور معلنة\tالعوالي\tغرب الرياض\t0566157774\tغرفة\tاسلام\t24° 33' 24.2701" N 46° 32' 54.321" E\t\t
2026-07-04\tعبدالاله عبدالله العقيلي\tظهرة لبن\tغرب الرياض\t0568411777\tغرفة + الصالة + جدار المصعد\tصالح سليمان\t24° 37' 43.3441" N 46° 34' 15.678" E\tالتواصل مع العميل قبل\t
2026-07-04\tعبدالله محمد التميمي\tالمهدية\tغرب الرياض\t0553432210\t3 غرف\tمحمد رضا\t24° 38' 19.437" N 46° 31' 44.556" E\t\t
2026-07-07\tماجد هشام المرشد\tالمغرزات\tغير مصنف\t0543008255\tغرفة\tحسين\t24° 45' 28.9577" N 46° 42' 11.223" E\tالتواصل مع العميل قبل\t
2026-07-07\tعقيل حمد العلي\tالحزم\tجنوب الرياض\t0506969462\tغرفة\tمحمد رضا\t24° 31' 43.0352" N 46° 33' 44.112" E\t\t
2026-07-07\tعبد الكريم ابراهيم الفريح\tالربيع\tشمال الرياض\t054 119 9777\tغرفتين\tمحمد على\t24.7932, 46.6512\t\t`;

export default function CRMImporter({ clients, technicians, visits = [], onAddClient, onAddClients, onAddVisit, onAddVisits, appendLog }: CRMImporterProps) {
  // Navigation / Mode state
  const [importMode, setImportMode] = useState<'paste' | 'sheets'>('sheets');

  // Manual Paste States
  const [inputText, setInputText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importSummary, setImportSummary] = useState<{ success: number; skipped: number; total: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Google Sheets Direct Link States
  const [needsAuth, setNeedsAuth] = useState(true);
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [availableSheets, setAvailableSheets] = useState<{ name: string }[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Save/Restore Sheet Settings to LocalStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('ars_crm_sheet_url');
    const savedTab = localStorage.getItem('ars_crm_sheet_tab');
    const savedAutoSync = localStorage.getItem('ars_crm_auto_sync') === 'true';

    if (savedUrl) setSheetUrl(savedUrl);
    if (savedTab) setSelectedSheetName(savedTab);
    setAutoSyncEnabled(savedAutoSync);
  }, []);

  // Initialize Firebase OAuth
  useEffect(() => {
    initAuth(
      (user, token) => {
        setGoogleUser(user);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
        setGoogleUser(null);
      }
    );
  }, []);

  // Auto-Sync Polling Interval
  useEffect(() => {
    let intervalId: any = null;

    if (autoSyncEnabled && !needsAuth && sheetUrl) {
      // Execute initial sync
      fetchGoogleSheetData(true);

      // Set interval for every 60 seconds
      intervalId = setInterval(() => {
        fetchGoogleSheetData(true);
      }, 60000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoSyncEnabled, needsAuth, sheetUrl, selectedSheetName]);

  // Helper: Convert degrees, minutes, seconds string/direction into decimal degree coordinate
  const parseDMS = (dmsStr: string): number | null => {
    const regex = /(\d+)\s*°\s*(\d+)\s*'\s*([\d.]+)\s*"\s*([NSEW])?/i;
    const match = dmsStr.match(regex);
    if (!match) return null;
    const deg = parseFloat(match[1]);
    const min = parseFloat(match[2]);
    const sec = parseFloat(match[3]);
    const dir = match[4]?.toUpperCase();
    let decimal = deg + min / 60 + sec / 3600;
    if (dir === 'S' || dir === 'W') {
      decimal = -decimal;
    }
    return parseFloat(decimal.toFixed(6));
  };

  // Extract coordinates from text (DMS or decimal or link)
  const extractCoordinates = (locStr: string): { lat: number; lng: number; matchType: 'coordinates' | 'default' } | null => {
    if (!locStr) return null;

    // 1. Google Maps url matching
    const urlCoords = locStr.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || locStr.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (urlCoords) {
      return {
        lat: parseFloat(urlCoords[1]),
        lng: parseFloat(urlCoords[2]),
        matchType: 'coordinates'
      };
    }

    // 2. DMS coordinates: "24° 44' 58.565" N 46° 40' 11.234" E"
    const dmsMatches = locStr.match(/(\d+\s*°\s*\d+\s*'\s*[\d.]+\s*"\s*[NSEW]?)/gi);
    if (dmsMatches && dmsMatches.length >= 2) {
      const lat = parseDMS(dmsMatches[0]);
      const lng = parseDMS(dmsMatches[1]);
      if (lat !== null && lng !== null) {
        return { lat, lng, matchType: 'coordinates' };
      }
    }

    // 3. Simple Decimal: "24.7932, 46.6512" or "24.7932 46.6512"
    const decMatch = locStr.match(/(-?\d+\.\d+)\s*[,|\s]\s*(-?\d+\.\d+)/);
    if (decMatch) {
      return {
        lat: parseFloat(decMatch[1]),
        lng: parseFloat(decMatch[2]),
        matchType: 'coordinates'
      };
    }

    return null;
  };

  // Fallback Geocoding matching Riyadh's neighborhoods
  const matchNeighborhoodCoords = (neighborhoodStr: string): { lat: number; lng: number; matchType: 'neighborhood' | 'default' } => {
    if (!neighborhoodStr) return { lat: 24.7136, lng: 46.6753, matchType: 'default' };

    // Clean neighborhood string
    const cleaned = neighborhoodStr.replace('حي', '').trim();
    
    // Look for direct match
    for (const key of Object.keys(NEIGHBORHOOD_COORDS)) {
      if (cleaned.includes(key) || key.includes(cleaned)) {
        return {
          lat: NEIGHBORHOOD_COORDS[key].lat,
          lng: NEIGHBORHOOD_COORDS[key].lng,
          matchType: 'neighborhood'
        };
      }
    }

    return { lat: 24.7136, lng: 46.6753, matchType: 'default' };
  };

  // Extract Spreadsheet ID from URL
  const getSpreadsheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url.trim();
  };

  // Google Login Action
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage('');
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setNeedsAuth(false);
        appendLog('t1', `تم ربط حساب Google بنجاح: ${res.user.displayName}`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('فشل في تسجيل الدخول عبر Google. يرجى مراجعة إعدادات الأمان والمحاولة مجدداً.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Logout Action
  const handleGoogleLogout = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setNeedsAuth(true);
      setAvailableSheets([]);
      setSelectedSheetName('');
      setAutoSyncEnabled(false);
      localStorage.removeItem('ars_crm_auto_sync');
      appendLog('t1', `تم تسجيل الخروج من حساب Google وإلغاء ربط الشيت`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Sheet Metadata (Tabs/Worksheets)
  const fetchSheetMetadata = async () => {
    const spreadsheetId = getSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      setErrorMessage('يرجى إدخال رابط أو معرف Google Sheet صالح.');
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      setErrorMessage('يرجى تسجيل الدخول إلى حساب Google أولاً لإثبات الصلاحية.');
      return;
    }

    setIsFetchingMetadata(true);
    setErrorMessage('');
    try {
      localStorage.setItem('ars_crm_sheet_url', sheetUrl);

      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error?.message || `فشل الاتصال بجوجل شيت (كود ${res.status})`);
      }

      const data = await res.json();
      const sheetsList = data.sheets?.map((s: any) => ({ name: s.properties.title })) || [];
      setAvailableSheets(sheetsList);
      
      if (sheetsList.length > 0) {
        // Fallback to currently saved tab, otherwise select the first sheet
        const savedTab = localStorage.getItem('ars_crm_sheet_tab');
        const defaultTab = savedTab && sheetsList.some((s: any) => s.name === savedTab) ? savedTab : sheetsList[0].name;
        setSelectedSheetName(defaultTab);
        localStorage.setItem('ars_crm_sheet_tab', defaultTab);
      }
      
      appendLog('t1', `تم الاتصال بملف Google Sheet بنجاح وقراءة أوراق العمل`, 'success');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'فشل استعلام هيكل الملف. يرجى التأكد من صلاحيات القراءة على الرابط.');
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  // Fetch Actual Google Sheet Rows Data & Parse/Sync
  const fetchGoogleSheetData = async (isBackground: boolean = false) => {
    const spreadsheetId = getSpreadsheetId(sheetUrl);
    if (!spreadsheetId || !selectedSheetName) return;

    const token = getAccessToken();
    if (!token) {
      if (!isBackground) {
        setNeedsAuth(true);
        setErrorMessage('جلسة تسجيل الدخول منتهية، يرجى إعادة تسجيل الدخول.');
      }
      return;
    }

    if (!isBackground) setIsSyncingSheets(true);
    setErrorMessage('');

    try {
      // Query the first 500 rows from the sheet
      const range = `${encodeURIComponent(selectedSheetName)}!A2:J500`;
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`فشل جلب قيم الشيت (كود ${res.status})`);
      }

      const data = await res.json();
      const rows = data.values || [];

      if (rows.length === 0) {
        if (!isBackground) setErrorMessage('تم الاتصال بالملف، ولكن ورقة العمل فارغة أو لا تحتوي على صفوف بيانات.');
        return;
      }

      // Map Rows to ParsedRow structure
      const parsed: ParsedRow[] = [];
      let newClientsCount = 0;

      rows.forEach((cols: string[]) => {
        if (cols.length < 2) return; // Skip incomplete columns

        const date = cols[0] || new Date().toISOString().split('T')[0];
        const clientName = cols[1] || '';
        const neighborhood = cols[2] || '';
        const region = cols[3] || '';
        const phone = cols[4] || '';
        const works = cols[5] || 'رفع مقاسات';
        const agent = cols[6] || '';
        const locationRaw = cols[7] || '';
        const notes = cols[8] || '';
        const status = cols[9] || '';

        if (!clientName) return;

        // Extract coordinates or fallback to neighborhood GPS
        let finalLat = 24.7136;
        let finalLng = 46.6753;
        let matchType: 'coordinates' | 'neighborhood' | 'default' = 'default';

        const gpsCoords = extractCoordinates(locationRaw);
        if (gpsCoords) {
          finalLat = gpsCoords.lat;
          finalLng = gpsCoords.lng;
          matchType = 'coordinates';
        } else {
          const neighborCoords = matchNeighborhoodCoords(neighborhood);
          finalLat = neighborCoords.lat;
          finalLng = neighborCoords.lng;
          matchType = neighborCoords.matchType;
        }

        // Duplicate checks
        const isDuplicate = clients.some(
          (c) => c.name.trim() === clientName.trim() || c.phone.trim() === phone.trim()
        );

        parsed.push({
          date,
          clientName,
          neighborhood,
          region,
          phone,
          works,
          agent,
          locationRaw,
          notes,
          status,
          lat: finalLat,
          lng: finalLng,
          isValid: !!clientName && !!phone,
          isDuplicate,
          matchType
        });
      });

      // Synchronize newly added records automatically
      const newClientsToSync: Omit<Client, 'id'>[] = [];
      const newVisitsToSync: (Omit<Visit, 'id'> & { id?: string })[] = [];

      parsed.forEach((row) => {
        // Double check in state to prevent duplicates
        const clientExists = clients.some(
          (c) => c.name.trim() === row.clientName.trim() || c.phone.trim() === row.phone.trim()
        );

        if (!clientExists) {
          // Pre-generate unique client ID
          const targetClientId = `c_sheet_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

          // Create Client
          const newClientData = {
            id: targetClientId,
            name: row.clientName,
            contactPerson: row.clientName.split(' ')[0] || 'العميل',
            phone: row.phone || '0500000000',
            lat: row.lat,
            lng: row.lng,
            address: `${row.region || 'الرياض'} - حي ${row.neighborhood}`
          };
          newClientsToSync.push(newClientData);

          // Find agent or fallback
          const matchedTech = technicians.find(t => t.name.includes(row.agent) || row.agent.includes(t.name)) || technicians[0];
          const techId = matchedTech ? matchedTech.id : 't1';
          const defaultTechShiftStart = matchedTech?.shiftStart || '09:00';
          const parsedScope = parseJobScopeFromWorks(row.works);
          
          const timeSlot = getNextAvailableTime(
            techId,
            row.date,
            parsedScope.estimatedDuration,
            visits,
            newVisitsToSync,
            defaultTechShiftStart
          );

          // Schedule corresponding visit
          const newVisitData = {
            clientId: targetClientId,
            technicianId: techId,
            title: `رفع مقاسات: ${row.works}`,
            type: 'Inspection' as const,
            status: 'pending' as const,
            date: row.date,
            plannedStartTime: timeSlot.start,
            plannedEndTime: timeSlot.end,
            notes: `تحديث تلقائي لجوجل شيت | ملاحظات: ${row.notes || 'لا يوجد'} | المندوب: ${row.agent || 'غير محدد'} | حالة العميل: ${row.status || 'معلق'}`,
            jobScope: parsedScope.jobScope,
            estimatedDuration: parsedScope.estimatedDuration
          };
          newVisitsToSync.push(newVisitData);

          newClientsCount++;
        }
      });

      if (newClientsToSync.length > 0 && onAddClients) {
        onAddClients(newClientsToSync);
      } else {
        newClientsToSync.forEach(c => onAddClient(c));
      }

      if (newVisitsToSync.length > 0 && onAddVisits) {
        onAddVisits(newVisitsToSync);
      } else {
        newVisitsToSync.forEach(v => onAddVisit(v));
      }

      // Update state
      setParsedRows(parsed);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('ar-SA'));

      if (newClientsCount > 0) {
        appendLog('t1', `مزامنة تلقائية: تم استيراد وتوطين عدد ${newClientsCount} عملاء جدد من شيت Google ماب تلقائياً!`, 'success');
      } else if (!isBackground) {
        appendLog('t1', `مزامنة شيت: البيانات مطابقة ومحدثة بالكامل مع الشيت الرئيسي (لا يوجد عملاء جدد)`, 'info');
      }

    } catch (err: any) {
      console.error(err);
      if (!isBackground) {
        setErrorMessage(err.message || 'فشل في تحميل وجدولة صفوف البيانات. يرجى مراجعة الصلاحيات والاتصال بالشبكة.');
      }
    } finally {
      if (!isBackground) setIsSyncingSheets(false);
    }
  };

  // Run Manual Tab Change Save
  const handleTabChange = (name: string) => {
    setSelectedSheetName(name);
    localStorage.setItem('ars_crm_sheet_tab', name);
    // Clear preview rows to force reload
    setParsedRows([]);
  };

  // Toggle Auto Sync Value
  const handleToggleAutoSync = () => {
    const nextVal = !autoSyncEnabled;
    setAutoSyncEnabled(nextVal);
    localStorage.setItem('ars_crm_auto_sync', String(nextVal));
    appendLog('t1', nextVal ? 'تم تشغيل المزامنة والجدولة الجغرافية التلقائية كل دقيقة' : 'تم إيقاف المزامنة التلقائية للشيت', 'info');
  };

  // Run Parser on Text Paste (Manual Mode)
  useEffect(() => {
    if (importMode !== 'paste' || !inputText.trim()) {
      if (importMode === 'paste') setParsedRows([]);
      return;
    }

    const lines = inputText.split('\n');
    const newParsed: ParsedRow[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const cols = trimmed.split('\t');
      if (cols.length < 2) return;

      const date = cols[0] || new Date().toISOString().split('T')[0];
      const clientName = cols[1] || '';
      const neighborhood = cols[2] || '';
      const region = cols[3] || '';
      const phone = cols[4] || '';
      const works = cols[5] || 'رفع مقاسات';
      const agent = cols[6] || '';
      const locationRaw = cols[7] || '';
      const notes = cols[8] || '';
      const status = cols[9] || '';

      if (!clientName) return;

      let finalLat = 24.7136;
      let finalLng = 46.6753;
      let matchType: 'coordinates' | 'neighborhood' | 'default' = 'default';

      const gpsCoords = extractCoordinates(locationRaw);
      if (gpsCoords) {
        finalLat = gpsCoords.lat;
        finalLng = gpsCoords.lng;
        matchType = 'coordinates';
      } else {
        const neighborCoords = matchNeighborhoodCoords(neighborhood);
        finalLat = neighborCoords.lat;
        finalLng = neighborCoords.lng;
        matchType = neighborCoords.matchType;
      }

      const isDuplicate = clients.some(
        (c) => c.name.trim() === clientName.trim() || c.phone.trim() === phone.trim()
      );

      newParsed.push({
        date,
        clientName,
        neighborhood,
        region,
        phone,
        works,
        agent,
        locationRaw,
        notes,
        status,
        lat: finalLat,
        lng: finalLng,
        isValid: !!clientName && !!phone,
        isDuplicate,
        matchType
      });
    });

    setParsedRows(newParsed);
    setImportSummary(null);
  }, [inputText, clients, importMode]);

  const handleLoadExample = () => {
    setInputText(MOCK_GOOGLE_SHEETS_DATA);
  };

  // Perform Manual Import Execution (for paste mode)
  const handleExecutePasteImport = () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);

    let successCount = 0;
    let skippedCount = 0;
    const manualVisitsToSync: any[] = [];

    parsedRows.forEach((row) => {
      let existingClient = clients.find(
        (c) => c.name.trim() === row.clientName.trim() || c.phone.trim() === row.phone.trim()
      );

      let targetClientId = '';

      if (!existingClient) {
        targetClientId = `c_paste_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        
        const newClientData = {
          id: targetClientId,
          name: row.clientName,
          contactPerson: row.clientName.split(' ')[0] || 'العميل',
          phone: row.phone || '0500000000',
          lat: row.lat,
          lng: row.lng,
          address: `${row.region || 'الرياض'} - حي ${row.neighborhood}`
        };
        
        onAddClient(newClientData);
        successCount++;
      } else {
        targetClientId = existingClient.id;
        skippedCount++;
      }

      const matchedTech = technicians.find(t => t.name.includes(row.agent) || row.agent.includes(t.name)) || technicians[0];
      const techId = matchedTech ? matchedTech.id : 't1';
      const defaultTechShiftStart2 = matchedTech?.shiftStart || '09:00';
      const parsedScope2 = parseJobScopeFromWorks(row.works);
      
      const timeSlot2 = getNextAvailableTime(
        techId,
        row.date,
        parsedScope2.estimatedDuration,
        visits,
        manualVisitsToSync,
        defaultTechShiftStart2
      );

      const newVisitData = {
        clientId: targetClientId,
        technicianId: techId,
        title: `رفع مقاسات: ${row.works}`,
        type: 'Inspection' as const,
        status: 'pending' as const,
        date: row.date,
        plannedStartTime: timeSlot2.start,
        plannedEndTime: timeSlot2.end,
        notes: `ملاحظات الشيت: ${row.notes || 'لا يوجد'} | المندوب: ${row.agent || 'غير محدد'} | حالة العميل: ${row.status || 'معلق'}`,
        jobScope: parsedScope2.jobScope,
        estimatedDuration: parsedScope2.estimatedDuration
      };

      manualVisitsToSync.push(newVisitData);
    });

    if (onAddVisits && manualVisitsToSync.length > 0) {
      onAddVisits(manualVisitsToSync);
    } else {
      manualVisitsToSync.forEach(v => onAddVisit(v));
    }

    appendLog('t1', `قام نظام الربط باستيراد وتوطين ${parsedRows.length} عملاء وجدولة مواعيدهم على فنيي الميدان جغرافياً`, 'success');
    
    setImportSummary({
      success: successCount,
      skipped: skippedCount,
      total: parsedRows.length
    });
    setIsImporting(false);
    setInputText('');
  };

  return (
    <div id="crm-sheet-importer" className="space-y-6 text-right">
      {/* Intro Header */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-950 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2 justify-end">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-indigo-500/30">
              تكامل جداول البيانات (Google Sheets Dynamic Integration)
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/30">
              مزامنة فورية وتوطين خرائط
            </span>
          </div>
          <h3 className="text-xl font-black mt-3 mb-2 flex items-center gap-2 justify-end">
            جلب ومزامنة مواعيد العملاء من Google Sheets
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed max-w-3xl mr-auto">
            اربط جدول البيانات (Google CRM Sheet) بالمنصة مباشرة لمزامنة وتحديث قائمة العملاء تلقائياً. يقوم المحرك بقراءة إحداثيات Google Maps وتحويل صيغ الدرجات DMS إلى إحداثيات جغرافية فورية لتوطين العملاء على الخريطة وجدولتها على الفنيين الميدانيين تلقائياً.
          </p>
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-x-12 -translate-y-12" />
      </div>

      {/* Tabs for choosing Import Mode */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setImportMode('sheets'); setParsedRows([]); }}
          className={`px-5 py-3 text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
            importMode === 'sheets'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Link2 className="w-4 h-4" />
          الربط المباشر بـ Google Sheet (مستحسن)
        </button>
        <button
          onClick={() => { setImportMode('paste'); setParsedRows([]); }}
          className={`px-5 py-3 text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
            importMode === 'paste'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardPaste className="w-4 h-4" />
          نسخ ولصق يدوي (Copy-Paste)
        </button>
      </div>

      {/* Mode 1: Google Sheets Live Sync */}
      {importMode === 'sheets' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Settings Left Panel */}
          <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col space-y-5">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 justify-end pb-3 border-b border-slate-100">
              إعدادات الاتصال السحابي
              <Link2 className="w-4 h-4 text-indigo-600" />
            </h4>

            {/* Google Authentication Section */}
            {needsAuth ? (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-center flex flex-col items-center justify-center space-y-3">
                <User className="w-8 h-8 text-slate-400" />
                <div>
                  <h5 className="font-extrabold text-xs text-slate-800">يتطلب المصادقة مع Google</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    من فضلك سجل دخولك باستخدام حساب جوجل الذي يمتلك صلاحية الوصول للشيت لبدء الاتصال والمزامنة السحابية.
                  </p>
                </div>
                
                {/* Official Material Design Styled Sign-In Button */}
                <button 
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="gsi-material-button w-full shadow-sm"
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #dadce0',
                    borderRadius: '8px',
                    color: '#3c4043',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    height: '40px',
                    padding: '0 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  <div className="gsi-material-button-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '18px', height: '18px' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isLoggingIn ? 'جاري الاتصال بجوجل...' : 'تسجيل الدخول وربط جوجل شيت'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 flex items-center justify-between text-right">
                <button
                  onClick={handleGoogleLogout}
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-100 transition-all cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <h5 className="font-extrabold text-xs text-slate-800">{googleUser?.displayName}</h5>
                    <p className="text-[9px] font-mono text-slate-400">{googleUser?.email}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm border-2 border-emerald-400 shadow-sm overflow-hidden">
                    {googleUser?.photoURL ? (
                      <img src={googleUser.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      googleUser?.displayName?.charAt(0) || 'U'
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message banner */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2 text-right text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Spreadsheet URL Input */}
            <div>
              <label className="text-[10px] font-black text-slate-600 block mb-1.5">
                رابط ملف Google Sheets (أو معرف الملف ID):
              </label>
              <div className="flex gap-2">
                <button
                  onClick={fetchSheetMetadata}
                  disabled={needsAuth || !sheetUrl || isFetchingMetadata}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer"
                >
                  {isFetchingMetadata ? 'جاري الاتصال...' : 'ربط وقراءة الملف'}
                </button>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  disabled={needsAuth}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  dir="ltr"
                  className="w-full text-xs font-mono p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-left"
                />
              </div>
            </div>

            {/* Worksheet Tabs list */}
            {availableSheets.length > 0 && (
              <div>
                <label className="text-[10px] font-black text-slate-600 block mb-1.5">
                  اختر ورقة العمل (التبويب النشط):
                </label>
                <select
                  value={selectedSheetName}
                  onChange={(e) => handleTabChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {availableSheets.map((s, idx) => (
                    <option key={idx} value={s.name}>
                      📄 {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sync Controls & Auto Poll Option */}
            {availableSheets.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3.5 border border-slate-150">
                  <button
                    onClick={handleToggleAutoSync}
                    className={`p-1 rounded-lg transition-all cursor-pointer ${
                      autoSyncEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {autoSyncEnabled ? <Play className="w-4 h-4 shrink-0" /> : <Pause className="w-4 h-4 shrink-0" />}
                  </button>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-800 block">المزامنة التلقائية والجدولة الذكية</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">مراقبة الشيت وتوطين أي عملاء جدد تلقائياً كل دقيقة</span>
                  </div>
                </div>

                <button
                  onClick={() => fetchGoogleSheetData(false)}
                  disabled={isSyncingSheets || !selectedSheetName}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  {isSyncingSheets ? 'جاري الاتصال والجدولة...' : 'مزامنة وتحديث البيانات الآن'}
                </button>

                {lastSyncTime && (
                  <div className="text-center text-[9px] text-slate-400 font-bold">
                    آخر مزامنة ناجحة: {lastSyncTime}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview and Execution Area (Right/Bottom) */}
          <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-slate-500">
                الحالة: <strong className="text-emerald-600">{autoSyncEnabled ? 'مراقبة سحابية نشطة 🟢' : 'جاهز للمزامنة'}</strong>
              </span>
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                مخطط المعاينة والتوطين الجغرافي
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              </h4>
            </div>

            {parsedRows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center min-h-[300px]">
                <FileSpreadsheet className="w-12 h-12 text-indigo-400/40 mb-3" />
                <p className="text-xs font-bold text-slate-600">لم يتم جلب بيانات بعد</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm leading-relaxed">
                  بعد تسجيل الدخول بريدياً وربط رابط الشيت، اضغط على <strong>"ربط وقراءة الملف"</strong> لاختيار التبويب، ثم اضغط على <strong>"مزامنة وتحديث البيانات"</strong> لتوطين العملاء بخرائط جوجل ماب فورياً هنا.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex justify-between items-center text-right">
                  <span className="text-[10px] font-bold text-indigo-800">
                    تم قراءة وتحليل <strong className="text-indigo-600 text-xs">{parsedRows.length}</strong> عملاء من السحابة. العملاء المكتوب أمامهم "عميل جديد كلياً" تم جدولتهم وتوطينهم تلقائياً على الخريطة.
                  </span>
                </div>

                {/* Preview Table */}
                <div className="overflow-x-auto border border-slate-150 rounded-xl max-h-[350px]">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold">
                        <th className="p-2.5 text-right whitespace-nowrap">اسم العميل والمندوب</th>
                        <th className="p-2.5 text-center whitespace-nowrap">تليفون والحي</th>
                        <th className="p-2.5 text-center whitespace-nowrap">العمل المطلوب</th>
                        <th className="p-2.5 text-center whitespace-nowrap">الموقع الجغرافي</th>
                        <th className="p-2.5 text-left whitespace-nowrap">مزامنة البيانات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{row.clientName}</div>
                            <div className="text-[9px] text-indigo-600 mt-0.5">المندوب: {row.agent || 'غير محدد'}</div>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="font-semibold text-slate-700 block font-mono">{row.phone}</span>
                            <div className="text-[9px] text-slate-400 mt-0.5">{row.neighborhood} - {row.region}</div>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              {row.works}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            {row.matchType === 'coordinates' ? (
                              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200/50 flex items-center gap-0.5 justify-center w-fit mx-auto">
                                <MapPin className="w-3 h-3 text-emerald-500" />
                                إحداثيات GPS دقيقة
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200/50 flex items-center gap-0.5 justify-center w-fit mx-auto">
                                <MapPin className="w-3 h-3 text-amber-500" />
                                تقريبي بالحي
                              </span>
                            )}
                            <div className="text-[8px] font-mono text-slate-400 mt-0.5">{row.lat.toFixed(4)}, {row.lng.toFixed(4)}</div>
                          </td>
                          <td className="p-2.5 text-left">
                            {row.isDuplicate ? (
                              <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded">
                                مطابق ومجدول مسبقاً ✔
                              </span>
                            ) : (
                              <span className="bg-emerald-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                عميل جديد ✨
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Manual Clipboard Paste */}
      {importMode === 'paste' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Input Area (Left on desktop/top) */}
          <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <button
                onClick={handleLoadExample}
                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                تحميل شيت تجريبي (من الصورة)
                <Layers className="w-3.5 h-3.5" />
              </button>
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                منطقة اللصق المباشر (Copy-Paste Zone)
                <ClipboardPaste className="w-4 h-4 text-indigo-600" />
              </h4>
            </div>

            <div className="flex-1 min-h-[220px] flex flex-col">
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5">
                انسخ الصفوف من Excel أو Google Sheets والصقها في المربع أدناه:
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`التاريخ\tاسم العميل\tالحي\tالمنطقة\tالتليفون\tالاعمال\tالمندوب\tLOCATION\tملاحظات\tحالة العميل\n2026-07-03\tابراهيم عبدالله الصايغ\tالنخيل\tشمال الرياض\t0581055502\t3غرف\tمحمد سليمان\t24° 44' 58.565" N 46° 40' 11.234" E\tضروري\tتم التواصل`}
                dir="rtl"
                className="w-full flex-1 min-h-[200px] text-xs font-mono p-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 leading-relaxed text-right"
              />
            </div>

            <p className="text-[9px] text-slate-400 leading-normal">
              * يدعم التنسيق التلقائي المنسوخ من جداول البيانات (أعمدة مفصولة بعلامة Tab). سيتم التعرف على إحداثيات الدرجات والدقائق والثواني وتحويلها فورياً لـ GPS.
            </p>
          </div>

          {/* Preview and Execution Area (Right/Bottom) */}
          <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-slate-500">
                تم التعرف على <strong className="text-indigo-600 text-xs">{parsedRows.length}</strong> صفوف جاهزة للاستيراد
              </span>
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                معاينة وتحليل البيانات الجغرافية
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              </h4>
            </div>

            {importSummary && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3 text-emerald-800 animate-fade-in text-right">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0" />
                <div>
                  <h5 className="font-extrabold text-sm">تم استيراد الشيت بنجاح!</h5>
                  <p className="text-xs text-emerald-700/90 mt-0.5 leading-relaxed">
                    تمت إضافة {importSummary.success} عميل جديد وتوليد زيارات ميدانية معلقة لرفع المقاسات لهم. يمكنك الآن الذهاب إلى شاشة خريطة التتبع المباشر أو جدول المخطط الزمني لجدولتها فوراً وتعيينها للفنيين.
                  </p>
                </div>
              </div>
            )}

            {parsedRows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center min-h-[220px]">
                <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-xs font-bold text-slate-500">لا توجد بيانات لمعاينتها حالياً</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                  الصق الصفوف المنسوخة من جدول CRM الخاص بك، أو اضغط على زر "تحميل شيت تجريبي" لتجربة الميزة فوراً ببيانات واقعية من شيت الرياض.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Preview Table */}
                <div className="overflow-x-auto border border-slate-150 rounded-xl max-h-[300px]">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold">
                        <th className="p-2.5 text-right whitespace-nowrap">العميل والمشروع</th>
                        <th className="p-2.5 text-center whitespace-nowrap">الحي والمنطقة</th>
                        <th className="p-2.5 text-center whitespace-nowrap">تليفون</th>
                        <th className="p-2.5 text-center whitespace-nowrap">الأعمال المطلوبة</th>
                        <th className="p-2.5 text-center whitespace-nowrap">رصد الموقع الجغرافي</th>
                        <th className="p-2.5 text-left whitespace-nowrap">الحالة المكتشفة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{row.clientName}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5 font-mono">📅 تاريخ الشيت: {row.date}</div>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="font-semibold text-slate-700">حي {row.neighborhood}</span>
                            <div className="text-[9px] text-indigo-600 mt-0.5">{row.region}</div>
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">{row.phone}</td>
                          <td className="p-2.5 text-center text-slate-700">
                            <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              {row.works}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            {row.matchType === 'coordinates' ? (
                              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200/50 flex items-center gap-0.5 justify-center w-fit mx-auto">
                                <MapPin className="w-3 h-3 text-emerald-500" />
                                إحداثيات دقيقة (GPS)
                              </span>
                            ) : row.matchType === 'neighborhood' ? (
                              <span className="bg-amber-50 text-amber-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200/50 flex items-center gap-0.5 justify-center w-fit mx-auto">
                                <MapPin className="w-3 h-3 text-amber-500" />
                                تقريبي (حي {row.neighborhood})
                              </span>
                            ) : (
                              <span className="bg-slate-50 text-slate-500 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-0.5 justify-center w-fit mx-auto">
                                <HelpCircle className="w-3 h-3" />
                                افتراضي (وسط الرياض)
                              </span>
                            )}
                            <div className="text-[8px] font-mono text-slate-400 mt-0.5">{row.lat.toFixed(4)}, {row.lng.toFixed(4)}</div>
                          </td>
                          <td className="p-2.5 text-left">
                            {row.isDuplicate ? (
                              <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded">
                                موجود مسبقاً (زيارة إضافية)
                              </span>
                            ) : (
                              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded">
                                عميل جديد كلياً ✨
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setInputText('')}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    مسح المعاينة
                  </button>
                  <button
                    onClick={handleExecutePasteImport}
                    disabled={isImporting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    {isImporting ? 'جاري استيراد وجدولة المهام...' : 'استيراد وجدولة جميع العملاء والمهام فوراً'}
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Client, Technician } from '../types';
import { Users, UserPlus, MapPin, Trash2, Building, Phone, Mail, Car, ShieldAlert, Check, Edit2, X, Globe, Save, Search, Filter } from 'lucide-react';

interface ManagementPanelProps {
  clients: Client[];
  technicians: Technician[];
  onAddTechnician: (tech: Omit<Technician, 'id'>) => void;
  onDeleteTechnician: (id: string) => void;
  onUpdateTechnician: (tech: Technician) => void;
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onDeleteClient: (id: string) => void;
  onUpdateClient: (client: Client) => void;
}

interface RiyadhNeighborhood {
  name: string;
  lat: number;
  lng: number;
  region: 'north' | 'east' | 'west' | 'south' | 'center';
}

const RIYADH_NEIGHBORHOODS: RiyadhNeighborhood[] = [
  // شمال الرياض
  { name: 'حي الصحافة (شمال الرياض)', lat: 24.7951, lng: 46.6321, region: 'north' },
  { name: 'حي الملقا (شمال الرياض)', lat: 24.8192, lng: 46.6115, region: 'north' },
  { name: 'حي الياسمين (شمال الرياض)', lat: 24.8213, lng: 46.6432, region: 'north' },
  { name: 'حي العقيق (شمال الرياض)', lat: 24.7876, lng: 46.6204, region: 'north' },
  { name: 'حي النرجس (شمال الرياض)', lat: 24.8425, lng: 46.6800, region: 'north' },
  { name: 'حي الغدير (شمال الرياض)', lat: 24.8115, lng: 46.6302, region: 'north' },
  { name: 'حي القيروان (شمال الرياض)', lat: 24.8654, lng: 46.5912, region: 'north' },
  
  // شرق الرياض
  { name: 'حي الروضة (شرق الرياض)', lat: 24.7297, lng: 46.7794, region: 'east' },
  { name: 'حي المغرزات (شرق الرياض)', lat: 24.7475, lng: 46.7112, region: 'east' },
  { name: 'حي النسيم (شرق الرياض)', lat: 24.7200, lng: 46.8300, region: 'east' },
  { name: 'حي الريان (شرق الرياض)', lat: 24.7170, lng: 46.7840, region: 'east' },
  { name: 'حي الحمراء (شرق الرياض)', lat: 24.7735, lng: 46.7620, region: 'east' },
  { name: 'حي قرطبة (شرق الرياض)', lat: 24.8105, lng: 46.7450, region: 'east' },
  { name: 'حي اليرموك (شرق الرياض)', lat: 24.8170, lng: 46.7910, region: 'east' },

  // غرب الرياض
  { name: 'حي حطين (غرب الرياض)', lat: 24.7588, lng: 46.6120, region: 'west' },
  { name: 'حي لبن (غرب الرياض)', lat: 24.6390, lng: 46.5350, region: 'west' },
  { name: 'حي السويدي (غرب الرياض)', lat: 24.5950, lng: 46.6210, region: 'west' },
  { name: 'حي البديعة (غرب الرياض)', lat: 24.6150, lng: 46.6100, region: 'west' },
  { name: 'حي الدرعية (غرب الرياض)', lat: 24.7333, lng: 46.5667, region: 'west' },
  { name: 'حي عرقة (غرب الرياض)', lat: 24.6850, lng: 46.5820, region: 'west' },

  // جنوب الرياض
  { name: 'حي الشفا (جنوب الرياض)', lat: 24.5574, lng: 46.6974, region: 'south' },
  { name: 'حي العزيزية (جنوب الرياض)', lat: 24.5910, lng: 46.7410, region: 'south' },
  { name: 'حي المروة (جنوب الرياض)', lat: 24.5380, lng: 46.7020, region: 'south' },
  { name: 'حي السلي (جنوب الرياض)', lat: 24.6440, lng: 46.8200, region: 'south' },
  { name: 'حي الدار البيضاء (جنوب الرياض)', lat: 24.5290, lng: 46.7600, region: 'south' },

  // وسط الرياض
  { name: 'حي العليا (وسط الرياض)', lat: 24.7078, lng: 46.6749, region: 'center' },
  { name: 'حي السليمانية (وسط الرياض)', lat: 24.7050, lng: 46.6990, region: 'center' },
  { name: 'حي المربع (وسط الرياض)', lat: 24.6550, lng: 46.7110, region: 'center' },
  { name: 'حي الملز (وسط الرياض)', lat: 24.6710, lng: 46.7320, region: 'center' },
  { name: 'حي البطحاء (وسط الرياض)', lat: 24.6333, lng: 46.7167, region: 'center' }
];

const PRESET_COLORS = [
  { name: 'أزرق سماوي', value: '#0ea5e9' },
  { name: 'أخضر زمردي', value: '#10b981' },
  { name: 'برتقالي متوهج', value: '#f59e0b' },
  { name: 'بنفسجي ملكي', value: '#8b5cf6' },
  { name: 'وردي دافئ', value: '#ec4899' },
  { name: 'أحمر ناري', value: '#ef4444' }
];

const getRegionLabel = (neighborhoodName: string | undefined): { label: string; colorClass: string; bgClass: string; borderClass: string } => {
  if (!neighborhoodName) return { label: 'غير محدد', colorClass: 'text-slate-600', bgClass: 'bg-slate-50', borderClass: 'border-slate-200' };
  
  const matched = RIYADH_NEIGHBORHOODS.find(n => n.name === neighborhoodName || neighborhoodName.includes(n.name));
  const region = matched?.region;
  
  switch (region) {
    case 'north':
      return { label: 'شمال الرياض', colorClass: 'text-sky-700', bgClass: 'bg-sky-50', borderClass: 'border-sky-200' };
    case 'east':
      return { label: 'شرق الرياض', colorClass: 'text-amber-700', bgClass: 'bg-amber-50', borderClass: 'border-amber-200' };
    case 'west':
      return { label: 'غرب الرياض', colorClass: 'text-purple-700', bgClass: 'bg-purple-50', borderClass: 'border-purple-200' };
    case 'south':
      return { label: 'جنوب الرياض', colorClass: 'text-rose-700', bgClass: 'bg-rose-50', borderClass: 'border-rose-200' };
    case 'center':
      return { label: 'وسط الرياض', colorClass: 'text-indigo-700', bgClass: 'bg-indigo-50', borderClass: 'border-indigo-200' };
    default:
      if (neighborhoodName.includes('شمال')) {
        return { label: 'شمال الرياض', colorClass: 'text-sky-700', bgClass: 'bg-sky-50', borderClass: 'border-sky-200' };
      } else if (neighborhoodName.includes('شرق')) {
        return { label: 'شرق الرياض', colorClass: 'text-amber-700', bgClass: 'bg-amber-50', borderClass: 'border-amber-200' };
      } else if (neighborhoodName.includes('غرب')) {
        return { label: 'غرب الرياض', colorClass: 'text-purple-700', bgClass: 'bg-purple-50', borderClass: 'border-purple-200' };
      } else if (neighborhoodName.includes('جنوب')) {
        return { label: 'جنوب الرياض', colorClass: 'text-rose-700', bgClass: 'bg-rose-50', borderClass: 'border-rose-200' };
      } else if (neighborhoodName.includes('وسط') || neighborhoodName.includes('العليا') || neighborhoodName.includes('السليمانية')) {
        return { label: 'وسط الرياض', colorClass: 'text-indigo-700', bgClass: 'bg-indigo-50', borderClass: 'border-indigo-200' };
      }
      return { label: 'نطاق مخصص', colorClass: 'text-emerald-700', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200' };
  }
};

export default function ManagementPanel({
  clients,
  technicians,
  onAddTechnician,
  onDeleteTechnician,
  onUpdateTechnician,
  onAddClient,
  onDeleteClient,
  onUpdateClient
}: ManagementPanelProps) {
  // Form states for adding Technician
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techVehicle, setTechVehicle] = useState('');
  const [techColor, setTechColor] = useState('#0ea5e9');
  const [techLocationSelect, setTechLocationSelect] = useState('حي الصحافة (شمال الرياض)');
  const [techShiftStart, setTechShiftStart] = useState('08:00');
  const [techShiftEnd, setTechShiftEnd] = useState('17:00');
  const [techVacations, setTechVacations] = useState('الجمعة والسبت (إجازة أسبوعية)');
  const [techBreakStart, setTechBreakStart] = useState('12:00');
  const [techBreakEnd, setTechBreakEnd] = useState('13:00');
  
  // Custom tech location states
  const [customTechName, setCustomTechName] = useState('');
  const [customTechLat, setCustomTechLat] = useState('24.7136');
  const [customTechLng, setCustomTechLng] = useState('46.6753');

  const [techSuccessMsg, setTechSuccessMsg] = useState(false);

  // Form states for adding Client
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientLocationSelect, setClientLocationSelect] = useState('حي الصحافة (شمال الرياض)');

  // Custom client location states
  const [customClientName, setCustomClientName] = useState('');
  const [customClientLat, setCustomClientLat] = useState('24.7136');
  const [customClientLng, setCustomClientLng] = useState('46.6753');

  const [clientSuccessMsg, setClientSuccessMsg] = useState(false);

  // States for Riyadh neighborhood sorting/filtering classification
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<'all' | 'north' | 'east' | 'west' | 'south' | 'center'>('all');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Editing state
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Deletion confirm states
  const [techToDelete, setTechToDelete] = useState<Technician | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Temp states for editing
  const [editTechName, setEditTechName] = useState('');
  const [editTechPhone, setEditTechPhone] = useState('');
  const [editTechVehicle, setEditTechVehicle] = useState('');
  const [editTechColor, setEditTechColor] = useState('');
  const [editTechLocationSelect, setEditTechLocationSelect] = useState('');
  const [customEditTechName, setCustomEditTechName] = useState('');
  const [customEditTechLat, setCustomEditTechLat] = useState('24.7136');
  const [customEditTechLng, setCustomEditTechLng] = useState('46.6753');
  const [editTechShiftStart, setEditTechShiftStart] = useState('08:00');
  const [editTechShiftEnd, setEditTechShiftEnd] = useState('17:00');
  const [editTechVacations, setEditTechVacations] = useState('الجمعة والسبت (إجازة أسبوعية)');
  const [editTechBreakStart, setEditTechBreakStart] = useState('12:00');
  const [editTechBreakEnd, setEditTechBreakEnd] = useState('13:00');

  const [editClientName, setEditClientName] = useState('');
  const [editClientContact, setEditClientContact] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientAddress, setEditClientAddress] = useState('');
  const [editClientLocationSelect, setEditClientLocationSelect] = useState('');
  const [customEditClientName, setCustomEditClientName] = useState('');
  const [customEditClientLat, setCustomEditClientLat] = useState('24.7136');
  const [customEditClientLng, setCustomEditClientLng] = useState('46.6753');

  // Trigger editing a technician
  const startEditingTech = (tech: Technician) => {
    setEditingTech(tech);
    setEditTechName(tech.name);
    setEditTechPhone(tech.phone);
    setEditTechVehicle(tech.vehicle);
    setEditTechColor(tech.color);
    setEditTechShiftStart(tech.shiftStart);
    setEditTechShiftEnd(tech.shiftEnd);
    setEditTechVacations(tech.vacations || 'الجمعة والسبت (إجازة أسبوعية)');
    if (tech.breaks && tech.breaks.length > 0) {
      setEditTechBreakStart(tech.breaks[0].startTime);
      setEditTechBreakEnd(tech.breaks[0].endTime);
    } else {
      setEditTechBreakStart('12:00');
      setEditTechBreakEnd('13:00');
    }
    
    // Check if current coords match any neighborhood
    const match = RIYADH_NEIGHBORHOODS.find(
      (n) => Math.abs(n.lat - tech.currentLat) < 0.001 && Math.abs(n.lng - tech.currentLng) < 0.001
    );
    if (match) {
      setEditTechLocationSelect(match.name);
    } else {
      setEditTechLocationSelect('custom');
      setCustomEditTechName('موقع مخصص');
      setCustomEditTechLat(tech.currentLat.toString());
      setCustomEditTechLng(tech.currentLng.toString());
    }
  };

  // Trigger editing a client
  const startEditingClient = (client: Client) => {
    setEditingClient(client);
    setEditClientName(client.name);
    setEditClientContact(client.contactPerson);
    setEditClientPhone(client.phone);
    setEditClientAddress(client.address);
    
    // Check if current coords match any neighborhood
    const match = RIYADH_NEIGHBORHOODS.find(
      (n) => Math.abs(n.lat - client.lat) < 0.001 && Math.abs(n.lng - client.lng) < 0.001
    );
    if (match) {
      setEditClientLocationSelect(match.name);
    } else {
      setEditClientLocationSelect('custom');
      setCustomEditClientName('موقع مخصص');
      setCustomEditClientLat(client.lat.toString());
      setCustomEditClientLng(client.lng.toString());
    }
  };

  const handleTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName || !techPhone) return;

    let finalLat = 24.7136;
    let finalLng = 46.6753;
    let neighborhoodName = '';

    if (techLocationSelect === 'custom') {
      finalLat = parseFloat(customTechLat) || (24.7136 + (Math.random() - 0.5) * 0.06);
      finalLng = parseFloat(customTechLng) || (46.6753 + (Math.random() - 0.5) * 0.06);
      neighborhoodName = customTechName || 'موقع مخصص بالرياض';
    } else {
      const matched = RIYADH_NEIGHBORHOODS.find(n => n.name === techLocationSelect);
      if (matched) {
        finalLat = matched.lat;
        finalLng = matched.lng;
        neighborhoodName = matched.name;
      }
    }
    
    onAddTechnician({
      name: techName,
      phone: techPhone,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?w=150&auto=format&fit=crop&q=80`,
      status: 'idle',
      vehicle: techVehicle || 'سيارة قياس مجهزة',
      rating: 5.0,
      currentLat: finalLat,
      currentLng: finalLng,
      color: techColor,
      shiftStart: techShiftStart,
      shiftEnd: techShiftEnd,
      vacations: techVacations,
      breaks: [{ id: `b_new_${Date.now()}`, type: 'Lunch', startTime: techBreakStart, endTime: techBreakEnd }]
    });

    // Reset Form
    setTechName('');
    setTechPhone('');
    setTechVehicle('');
    setCustomTechName('');
    setTechSuccessMsg(true);
    setTimeout(() => setTechSuccessMsg(false), 3000);
  };

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientContact || !clientPhone) return;

    let finalLat = 24.7136;
    let finalLng = 46.6753;
    let neighborhoodName = '';

    if (clientLocationSelect === 'custom') {
      finalLat = parseFloat(customClientLat) || (24.7136 + (Math.random() - 0.5) * 0.06);
      finalLng = parseFloat(customClientLng) || (46.6753 + (Math.random() - 0.5) * 0.06);
      neighborhoodName = customClientName || 'موقع مخصص بالرياض';
    } else {
      const matched = RIYADH_NEIGHBORHOODS.find(n => n.name === clientLocationSelect);
      if (matched) {
        finalLat = matched.lat;
        finalLng = matched.lng;
        neighborhoodName = matched.name;
      }
    }

    onAddClient({
      name: clientName,
      contactPerson: clientContact,
      phone: clientPhone,
      lat: finalLat,
      lng: finalLng,
      address: clientAddress || neighborhoodName,
      neighborhood: neighborhoodName
    });

    // Reset Form
    setClientName('');
    setClientContact('');
    setClientPhone('');
    setClientAddress('');
    setCustomClientName('');
    setClientSuccessMsg(true);
    setTimeout(() => setClientSuccessMsg(false), 3000);
  };

  const handleSaveEditTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech || !editTechName || !editTechPhone) return;

    let finalLat = editingTech.currentLat;
    let finalLng = editingTech.currentLng;

    if (editTechLocationSelect === 'custom') {
      finalLat = parseFloat(customEditTechLat) || 24.7136;
      finalLng = parseFloat(customEditTechLng) || 46.6753;
    } else {
      const matched = RIYADH_NEIGHBORHOODS.find(n => n.name === editTechLocationSelect);
      if (matched) {
        finalLat = matched.lat;
        finalLng = matched.lng;
      }
    }

    onUpdateTechnician({
      ...editingTech,
      name: editTechName,
      phone: editTechPhone,
      vehicle: editTechVehicle,
      color: editTechColor,
      currentLat: finalLat,
      currentLng: finalLng,
      shiftStart: editTechShiftStart,
      shiftEnd: editTechShiftEnd,
      vacations: editTechVacations,
      breaks: [{ id: editingTech.breaks[0]?.id || `b_${editingTech.id}`, type: 'Lunch', startTime: editTechBreakStart, endTime: editTechBreakEnd }]
    });

    setEditingTech(null);
  };

  const handleSaveEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editClientName || !editClientContact || !editClientPhone) return;

    let finalLat = editingClient.lat;
    let finalLng = editingClient.lng;
    let neighborhoodName = '';

    if (editClientLocationSelect === 'custom') {
      finalLat = parseFloat(customEditClientLat) || 24.7136;
      finalLng = parseFloat(customEditClientLng) || 46.6753;
      neighborhoodName = customEditClientName || 'موقع مخصص بالرياض';
    } else {
      const matched = RIYADH_NEIGHBORHOODS.find(n => n.name === editClientLocationSelect);
      if (matched) {
        finalLat = matched.lat;
        finalLng = matched.lng;
        neighborhoodName = matched.name;
      }
    }

    onUpdateClient({
      ...editingClient,
      name: editClientName,
      contactPerson: editClientContact,
      phone: editClientPhone,
      address: editClientAddress || editClientLocationSelect,
      lat: finalLat,
      lng: finalLng,
      neighborhood: neighborhoodName
    });

    setEditingClient(null);
  };

  // Helper to render neighborhood options grouped by region
  const renderNeighborhoodOptions = () => (
    <>
      <optgroup label="✨ شمال الرياض">
        {RIYADH_NEIGHBORHOODS.filter(n => n.region === 'north').map((n) => (
          <option key={n.name} value={n.name}>{n.name}</option>
        ))}
      </optgroup>
      <optgroup label="✨ شرق الرياض">
        {RIYADH_NEIGHBORHOODS.filter(n => n.region === 'east').map((n) => (
          <option key={n.name} value={n.name}>{n.name}</option>
        ))}
      </optgroup>
      <optgroup label="✨ غرب الرياض">
        {RIYADH_NEIGHBORHOODS.filter(n => n.region === 'west').map((n) => (
          <option key={n.name} value={n.name}>{n.name}</option>
        ))}
      </optgroup>
      <optgroup label="✨ جنوب الرياض">
        {RIYADH_NEIGHBORHOODS.filter(n => n.region === 'south').map((n) => (
          <option key={n.name} value={n.name}>{n.name}</option>
        ))}
      </optgroup>
      <optgroup label="✨ وسط الرياض">
        {RIYADH_NEIGHBORHOODS.filter(n => n.region === 'center').map((n) => (
          <option key={n.name} value={n.name}>{n.name}</option>
        ))}
      </optgroup>
      <option value="custom">✍️ إضافة يدوية (تحديد حي آخر وإحداثيات مخصصة)...</option>
    </>
  );

  // Filter clients by region and search query
  const filteredClients = clients.filter(client => {
    // 1. Filter by region
    if (selectedRegionFilter !== 'all') {
      const regionInfo = getRegionLabel(client.neighborhood || client.address);
      const isMatch = (selectedRegionFilter === 'north' && regionInfo.label === 'شمال الرياض') ||
                      (selectedRegionFilter === 'east' && regionInfo.label === 'شرق الرياض') ||
                      (selectedRegionFilter === 'west' && regionInfo.label === 'غرب الرياض') ||
                      (selectedRegionFilter === 'south' && regionInfo.label === 'جنوب الرياض') ||
                      (selectedRegionFilter === 'center' && regionInfo.label === 'وسط الرياض');
      if (!isMatch) return false;
    }

    // 2. Filter by search query
    if (clientSearchQuery.trim()) {
      const query = clientSearchQuery.toLowerCase();
      const nameMatch = client.name.toLowerCase().includes(query);
      const contactMatch = client.contactPerson.toLowerCase().includes(query);
      const addressMatch = client.address.toLowerCase().includes(query);
      const phoneMatch = client.phone.includes(query);
      const neighborhoodMatch = (client.neighborhood || '').toLowerCase().includes(query);
      return nameMatch || contactMatch || addressMatch || phoneMatch || neighborhoodMatch;
    }

    return true;
  });

  const getRegionCount = (region: 'north' | 'east' | 'west' | 'south' | 'center' | 'all') => {
    if (region === 'all') return clients.length;
    return clients.filter(client => {
      const regionInfo = getRegionLabel(client.neighborhood || client.address);
      return (region === 'north' && regionInfo.label === 'شمال الرياض') ||
             (region === 'east' && regionInfo.label === 'شرق الرياض') ||
             (region === 'west' && regionInfo.label === 'غرب الرياض') ||
             (region === 'south' && regionInfo.label === 'جنوب الرياض') ||
             (region === 'center' && regionInfo.label === 'وسط الرياض');
    }).length;
  };

  return (
    <div id="management-control-panel" className="space-y-6 text-right">
      {/* Intro Panel */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-2 flex items-center gap-2 justify-end">
            لوحة الإدارة والتحكم الشاملة
            <Users className="w-5 h-5 text-indigo-400 animate-pulse" />
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed max-w-2xl mr-auto">
            من هنا يمكنك إضافة وحذف وتعديل الفنيين الميدانيين لرفع المقاسات، وتحديد مركباتهم وألوانهم على الخريطة، بالإضافة إلى تسجيل وتحديث بيانات العملاء ومواقعهم الجغرافية بدقة عبر أحياء مدينة الرياض المختلفة.
          </p>
        </div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-2xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technicians Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              {technicians.length} فنيين
            </span>
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              الفنيين الميدانيين لرفع المقاسات
              <Users className="w-4 h-4 text-indigo-600" />
            </h4>
          </div>

          {/* Form to Add Technician */}
          <form onSubmit={handleTechSubmit} className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-4">
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
              تسجيل فني ميداني جديد
              <UserPlus className="w-4 h-4 text-indigo-500" />
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">الهاتف الجوال</label>
                <input
                  type="text"
                  required
                  placeholder="+966 50 000 0000"
                  value={techPhone}
                  onChange={(e) => setTechPhone(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم الفني الثنائي</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خالد العتيبي"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">اللون المميز للموقع والخريطة</label>
                <select
                  value={techColor}
                  onChange={(e) => setTechColor(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                >
                  {PRESET_COLORS.map((color, i) => (
                    <option key={i} value={color.value}>{color.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">وصف المركبة / مجهزة لرفع المقاسات</label>
                <input
                  type="text"
                  placeholder="مثال: تويوتا هايلوكس (T-105)"
                  value={techVehicle}
                  onChange={(e) => setTechVehicle(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">موقع انطلاق الفني الأولي في الرياض</label>
              <select
                value={techLocationSelect}
                onChange={(e) => setTechLocationSelect(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right font-medium"
              >
                {renderNeighborhoodOptions()}
              </select>
            </div>

            {/* مواعيد الدوام والإجازات والاستراحة */}
            <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-3.5 text-right">
              <span className="text-[10px] font-bold text-indigo-600 block">🗓️ مواعيد الدوام، الإجازات والاستراحة</span>
              
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">نهاية الدوام</label>
                  <input
                    type="time"
                    required
                    value={techShiftEnd}
                    onChange={(e) => setTechShiftEnd(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">بداية الدوام</label>
                  <input
                    type="time"
                    required
                    value={techShiftStart}
                    onChange={(e) => setTechShiftStart(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">نهاية الاستراحة (البريك)</label>
                  <input
                    type="time"
                    required
                    value={techBreakEnd}
                    onChange={(e) => setTechBreakEnd(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">بداية الاستراحة (البريك)</label>
                  <input
                    type="time"
                    required
                    value={techBreakStart}
                    onChange={(e) => setTechBreakStart(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 block mb-1">أيام الإجازة الأسبوعية</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الجمعة والسبت"
                  value={techVacations}
                  onChange={(e) => setTechVacations(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Custom Technician Location input fields */}
            {techLocationSelect === 'custom' && (
              <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-3 animate-fade-in text-right">
                <span className="text-[10px] font-bold text-indigo-600 block">✍️ إدخال الموقع والحي يدوياً</span>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">اسم الحي / المنطقة المخصصة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: حي النخيل الغربي"
                    value={customTechName}
                    onChange={(e) => setCustomTechName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800 text-right focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1 text-right">خط الطول (Longitude)</label>
                    <input
                      type="text"
                      placeholder="46.6753"
                      value={customTechLng}
                      onChange={(e) => setCustomTechLng(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800 text-left focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1 text-right">خط العرض (Latitude)</label>
                    <input
                      type="text"
                      placeholder="24.7136"
                      value={customTechLat}
                      onChange={(e) => setCustomTechLat(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800 text-left focus:outline-none"
                    />
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 block leading-tight">
                  * سيتم تركيز الفني جغرافياً على الخريطة مباشرة حسب الإحداثيات المدخلة.
                </span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              إضافة الفني إلى قاعدة البيانات
              <UserPlus className="w-4 h-4" />
            </button>

            {techSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs animate-fade-in">
                <span>تم تسجيل وإدراج الفني الجديد وحجز مسار قيادة فارغ له بنجاح!</span>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
            )}
          </form>

          {/* List of Technicians */}
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {technicians.map((tech) => (
              <div key={tech.id} className="flex items-center justify-between p-3 border border-slate-100 hover:border-slate-200 rounded-xl bg-white transition-all">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startEditingTech(tech)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="تعديل الفني"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setTechToDelete(tech);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="حذف الفني"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">{tech.name}</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 justify-end">
                      {tech.vehicle}
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{tech.phone}</p>
                    <div className="mt-1 flex flex-wrap gap-1 justify-end">
                      <span className="text-[8px] font-bold bg-indigo-50 text-indigo-700 px-1 rounded border border-indigo-100">
                        ⏰ {tech.shiftStart} - {tech.shiftEnd}
                      </span>
                      {tech.breaks && tech.breaks.length > 0 && (
                        <span className="text-[8px] font-bold bg-amber-50 text-amber-700 px-1 rounded border border-amber-100">
                          ☕ بريك: {tech.breaks[0].startTime} - {tech.breaks[0].endTime}
                        </span>
                      )}
                      {tech.vacations && (
                        <span className="text-[8px] font-bold bg-emerald-50 text-emerald-700 px-1 rounded border border-emerald-100">
                          🏖️ {tech.vacations}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full border-2 overflow-hidden bg-slate-50 flex-shrink-0"
                    style={{ borderColor: tech.color }}
                  >
                    <img src={tech.avatar} alt={tech.name} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clients & Locations Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              {clients.length} عملاء ومواقع
            </span>
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              العملاء ومواقع رفع المقاسات بالرياض
              <Building className="w-4 h-4 text-emerald-600" />
            </h4>
          </div>

          {/* Form to Add Client */}
          <form onSubmit={handleClientSubmit} className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-4">
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
              تسجيل عميل وموقع جديد بالرياض
              <Building className="w-4 h-4 text-emerald-500" />
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم مسؤول الاتصال (العميل)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أ. نايف الشتري"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم المنشأة / المشروع السكني</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فلل الملقا السكنية"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">هاتف الاتصال بالعميل</label>
                <input
                  type="text"
                  required
                  placeholder="+966 50 111 2222"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">العنوان بالتفصيل</label>
                <input
                  type="text"
                  placeholder="مثال: الرياض، حي حطين، شارع الأمير تركي"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">موقع المشروع الجغرافي بالرياض (GPS)</label>
                <select
                  value={clientLocationSelect}
                  onChange={(e) => setClientLocationSelect(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right font-medium"
                >
                  {renderNeighborhoodOptions()}
                </select>
              </div>
            </div>

            {/* Custom Client Location input fields */}
            {clientLocationSelect === 'custom' && (
              <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-3 animate-fade-in text-right">
                <span className="text-[10px] font-bold text-emerald-600 block">✍️ إدخال موقع المشروع يدوياً</span>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">اسم الحي / الشارع المخصص للموقع</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: حي الياسمين، شارع أنس بن مالك"
                    value={customClientName}
                    onChange={(e) => setCustomClientName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800 text-right focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1 text-right">خط الطول (Longitude)</label>
                    <input
                      type="text"
                      placeholder="46.6753"
                      value={customClientLng}
                      onChange={(e) => setCustomClientLng(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800 text-left focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1 text-right">خط العرض (Latitude)</label>
                    <input
                      type="text"
                      placeholder="24.7136"
                      value={customClientLat}
                      onChange={(e) => setCustomClientLat(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800 text-left focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              إضافة موقع العميل المعتمد بالرياض
              <Building className="w-4 h-4" />
            </button>

            {clientSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs animate-fade-in">
                <span>تم إدراج الموقع والعميل الجديد بنجاح في قاعدة البيانات وجاهز للجدولة على الخريطة!</span>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
            )}
          </form>

          {/* Riyadh Geographic Classification & Distribution Panel */}
          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">توزيع أحياء الرياض</span>
              <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                توزيع عملاء النطاق الجغرافي
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
              </h5>
            </div>
            
            <div className="grid grid-cols-5 gap-1.5 text-center">
              <div className="bg-sky-50/70 border border-sky-100 p-1.5 rounded-lg">
                <span className="text-[9px] font-bold text-sky-700 block">شمال</span>
                <span className="text-xs font-black text-sky-900 font-mono">{getRegionCount('north')}</span>
              </div>
              <div className="bg-amber-50/70 border border-amber-100 p-1.5 rounded-lg">
                <span className="text-[9px] font-bold text-amber-700 block">شرق</span>
                <span className="text-xs font-black text-amber-900 font-mono">{getRegionCount('east')}</span>
              </div>
              <div className="bg-purple-50/70 border border-purple-100 p-1.5 rounded-lg">
                <span className="text-[9px] font-bold text-purple-700 block">غرب</span>
                <span className="text-xs font-black text-purple-900 font-mono">{getRegionCount('west')}</span>
              </div>
              <div className="bg-rose-50/70 border border-rose-100 p-1.5 rounded-lg">
                <span className="text-[9px] font-bold text-rose-700 block">جنوب</span>
                <span className="text-xs font-black text-rose-900 font-mono">{getRegionCount('south')}</span>
              </div>
              <div className="bg-indigo-50/70 border border-indigo-100 p-1.5 rounded-lg">
                <span className="text-[9px] font-bold text-indigo-700 block">وسط</span>
                <span className="text-xs font-black text-indigo-900 font-mono">{getRegionCount('center')}</span>
              </div>
            </div>
          </div>

          {/* Search & Tabs Filter */}
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="البحث بالاسم، الهاتف، الحي أو النطاق الجغرافي..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg py-2 pl-3 pr-9 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 text-right"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            {/* Geographical Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar justify-start flex-row-reverse">
              <button
                type="button"
                onClick={() => setSelectedRegionFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedRegionFilter === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                الكل ({getRegionCount('all')})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRegionFilter('north')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedRegionFilter === 'north'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100'
                }`}
              >
                شمال ({getRegionCount('north')})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRegionFilter('east')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedRegionFilter === 'east'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                }`}
              >
                شرق ({getRegionCount('east')})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRegionFilter('west')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedRegionFilter === 'west'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100'
                }`}
              >
                غرب ({getRegionCount('west')})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRegionFilter('south')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedRegionFilter === 'south'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                }`}
              >
                جنوب ({getRegionCount('south')})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRegionFilter('center')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedRegionFilter === 'center'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                }`}
              >
                وسط ({getRegionCount('center')})
              </button>
            </div>
          </div>

          {/* List of Clients */}
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {filteredClients.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <span className="text-[11px] text-slate-400 block">لا يوجد عملاء يطابقون خيارات البحث أو التصفية الحالية في أحياء الرياض.</span>
              </div>
            ) : (
              filteredClients.map((client) => {
                const regionInfo = getRegionLabel(client.neighborhood || client.address);
                return (
                  <div key={client.id} className="flex items-center justify-between p-3 border border-slate-100 hover:border-slate-200 rounded-xl bg-white transition-all">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEditingClient(client)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        title="تعديل العميل والموقع"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClientToDelete(client);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="حذف العميل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-right space-y-1 max-w-[70%]">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border whitespace-nowrap ${regionInfo.bgClass} ${regionInfo.colorClass} ${regionInfo.borderClass}`}>
                          {regionInfo.label}
                        </span>
                        {client.neighborhood && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-600 whitespace-nowrap">
                            {client.neighborhood.replace(/\s*\(.*?\)\s*/g, '')}
                          </span>
                        )}
                        <h5 className="font-bold text-xs text-slate-900 leading-tight">{client.name}</h5>
                      </div>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
                        <span className="truncate" title={client.address}>{client.address}</span>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      </p>
                      <p className="text-[10px] text-slate-400">
                        👤 {client.contactPerson} | 📞 <span className="font-mono">{client.phone}</span>
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Technician Edit Modal */}
      {editingTech && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up text-right space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <button
                onClick={() => setEditingTech(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                تعديل بيانات الفني الميداني
                <Edit2 className="w-4 h-4 text-indigo-600" />
              </h4>
            </div>

            <form onSubmit={handleSaveEditTech} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">الهاتف الجوال</label>
                  <input
                    type="text"
                    required
                    value={editTechPhone}
                    onChange={(e) => setEditTechPhone(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم الفني</label>
                  <input
                    type="text"
                    required
                    value={editTechName}
                    onChange={(e) => setEditTechName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">اللون الجغرافي</label>
                  <select
                    value={editTechColor}
                    onChange={(e) => setEditTechColor(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                  >
                    {PRESET_COLORS.map((color, i) => (
                      <option key={i} value={color.value}>{color.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">وصف المركبة</label>
                  <input
                    type="text"
                    required
                    value={editTechVehicle}
                    onChange={(e) => setEditTechVehicle(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">تحديث موقع انطلاق الفني الحالي</label>
                <select
                  value={editTechLocationSelect}
                  onChange={(e) => setEditTechLocationSelect(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right font-medium"
                >
                  {renderNeighborhoodOptions()}
                </select>
              </div>

              {/* مواعيد الدوام والإجازات والاستراحة تعديل */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3 text-right">
                <span className="text-[10px] font-bold text-indigo-600 block">🗓️ مواعيد الدوام، الإجازات والاستراحة</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">نهاية الدوام</label>
                    <input
                      type="time"
                      required
                      value={editTechShiftEnd}
                      onChange={(e) => setEditTechShiftEnd(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">بداية الدوام</label>
                    <input
                      type="time"
                      required
                      value={editTechShiftStart}
                      onChange={(e) => setEditTechShiftStart(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">نهاية البريك</label>
                    <input
                      type="time"
                      required
                      value={editTechBreakEnd}
                      onChange={(e) => setEditTechBreakEnd(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">بداية البريك</label>
                    <input
                      type="time"
                      required
                      value={editTechBreakStart}
                      onChange={(e) => setEditTechBreakStart(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">الإجازة الأسبوعية</label>
                  <input
                    type="text"
                    required
                    value={editTechVacations}
                    onChange={(e) => setEditTechVacations(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Edit Custom Location inputs */}
              {editTechLocationSelect === 'custom' && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3 text-right">
                  <span className="text-[10px] font-bold text-indigo-600 block">✍️ إدخال الإحداثيات يدوياً</span>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1 text-right">خط الطول (Lng)</label>
                      <input
                        type="text"
                        value={customEditTechLng}
                        onChange={(e) => setCustomEditTechLng(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-left focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1 text-right">خط العرض (Lat)</label>
                      <input
                        type="text"
                        value={customEditTechLat}
                        onChange={(e) => setCustomEditTechLat(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-left focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTech(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  حفظ التعديلات
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up text-right space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <button
                onClick={() => setEditingClient(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                تعديل بيانات العميل والموقع
                <Edit2 className="w-4 h-4 text-emerald-600" />
              </h4>
            </div>

            <form onSubmit={handleSaveEditClient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم مسؤول الاتصال (العميل)</label>
                  <input
                    type="text"
                    required
                    value={editClientContact}
                    onChange={(e) => setEditClientContact(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 text-right"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم المشروع / المنشأة</label>
                  <input
                    type="text"
                    required
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">هاتف العميل</label>
                  <input
                    type="text"
                    required
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">العنوان بالتفصيل</label>
                  <input
                    type="text"
                    required
                    value={editClientAddress}
                    onChange={(e) => setEditClientAddress(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 text-right"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">موقع المشروع بالخريطة (GPS)</label>
                  <select
                    value={editClientLocationSelect}
                    onChange={(e) => setEditClientLocationSelect(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 text-right font-medium"
                  >
                    {renderNeighborhoodOptions()}
                  </select>
                </div>
              </div>

              {/* Edit Custom Client Location inputs */}
              {editClientLocationSelect === 'custom' && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3 text-right">
                  <span className="text-[10px] font-bold text-emerald-600 block">✍️ إدخال الإحداثيات يدوياً</span>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1 text-right">خط الطول (Lng)</label>
                      <input
                        type="text"
                        value={customEditClientLng}
                        onChange={(e) => setCustomEditClientLng(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-left focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1 text-right">خط العرض (Lat)</label>
                      <input
                        type="text"
                        value={customEditClientLat}
                        onChange={(e) => setCustomEditClientLat(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-left focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  حفظ التعديلات
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Technician Delete Confirmation Modal */}
      {techToDelete && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up text-right space-y-4">
            <div className="flex items-center gap-3 text-red-600 justify-end">
              <span className="font-black text-sm">تأكيد حذف الفني</span>
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              هل أنت متأكد تماماً من رغبتك في حذف الفني <strong className="text-slate-950 font-bold">"{techToDelete.name}"</strong>؟ 
              <br />
              <span className="text-red-500 font-semibold">تنبيه: سيؤدي هذا الإجراء إلى حذف جميع مواعيده الميدانية المعلقة وإلغاء مسار قيادته نهائياً من قاعدة البيانات.</span>
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setTechToDelete(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTechnician(techToDelete.id);
                  setTechToDelete(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                تأكيد الحذف النهائي
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up text-right space-y-4">
            <div className="flex items-center gap-3 text-red-600 justify-end">
              <span className="font-black text-sm">تأكيد حذف العميل</span>
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              هل أنت متأكد تماماً من رغبتك في حذف العميل والمشروع <strong className="text-slate-950 font-bold">"{clientToDelete.name}"</strong>؟ 
              <br />
              <span className="text-red-500 font-semibold">تنبيه: سيؤدي هذا الإجراء إلى إلغاء وحذف كافة مواعيد رفع المقاسات المجدولة المرتبطة بهذا العميل نهائياً من قاعدة البيانات.</span>
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClient(clientToDelete.id);
                  setClientToDelete(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                تأكيد الحذف النهائي
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

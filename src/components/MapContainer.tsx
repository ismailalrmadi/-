import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Client, Technician, Visit } from '../types';
import { MapPin, Info, Compass } from 'lucide-react';

interface MapContainerProps {
  clients: Client[];
  technicians: Technician[];
  visits: Visit[];
  selectedClientId?: string;
  selectedTechnicianId?: string;
  onSelectClient?: (id: string) => void;
  onSelectTechnician?: (id: string) => void;
}

export default function MapContainer({
  clients,
  technicians,
  visits,
  selectedClientId,
  selectedTechnicianId,
  onSelectClient,
  onSelectTechnician
}: MapContainerProps) {
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [activeTech, setActiveTech] = useState<Technician | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const routesGroupRef = useRef<L.FeatureGroup | null>(null);

  // Initial center of Riyadh, Saudi Arabia
  const initialCenter: L.LatLngTuple = [24.7136, 46.6753];
  const initialZoom = 12;

  // Initialize the Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet map instance
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false, // We'll add zoom control at the top-right
      attributionControl: true
    });

    // Add standard custom zoom controls on top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add beautiful OpenStreetMap tile layer (hot style or standard style)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize feature groups for organization
    const routesGroup = L.featureGroup().addTo(map);
    const markersGroup = L.featureGroup().addTo(map);

    mapRef.current = map;
    routesGroupRef.current = routesGroup;
    markersGroupRef.current = markersGroup;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Selected Client to center & zoom map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedClientId) return;

    const client = clients.find(c => c.id === selectedClientId);
    if (client) {
      map.setView([client.lat, client.lng], 15, { animate: true, duration: 1 });
      setActiveClient(client);
      setActiveTech(null);
    }
  }, [selectedClientId, clients]);

  // Sync Selected Technician to center & zoom map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedTechnicianId) return;

    const tech = technicians.find(t => t.id === selectedTechnicianId);
    if (tech) {
      map.setView([tech.currentLat, tech.currentLng], 15, { animate: true, duration: 1 });
      setActiveTech(tech);
      setActiveClient(null);
    }
  }, [selectedTechnicianId, technicians]);

  // Draw markers (Clients & Technicians) and popups
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Apply date filter
    const visibleClients = filterDate 
      ? clients.filter(client => visits.some(v => v.clientId === client.id && v.date === filterDate))
      : clients;

    // 1. Render Client Markers
    visibleClients.forEach(client => {
      const isSelected = selectedClientId === client.id;
      // Find active visits at this client location
      const clientVisits = visits.filter(v => v.clientId === client.id && v.status !== 'completed');
      const hasActiveVisits = clientVisits.length > 0;
      const visitStatus = clientVisits[0]?.status || 'none';

      let bgClass = 'bg-slate-500 text-white';
      if (hasActiveVisits) {
        if (visitStatus === 'en_route') {
          bgClass = 'bg-orange-500 text-white animate-pulse-fast';
        } else if (visitStatus === 'checked_in') {
          bgClass = 'bg-blue-600 text-white animate-pulse-fast';
        } else {
          bgClass = 'bg-indigo-600 text-white';
        }
      }

      const ringClass = isSelected ? 'scale-125 ring-4 ring-emerald-500' : 'hover:scale-110';

      const markerHtml = `
        <div class="p-2 rounded-full cursor-pointer transition-transform duration-200 shadow-lg border border-white flex items-center justify-center w-9 h-9 ${ringClass} ${bgClass}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.74a1.71 1.71 0 0 1-2.202 0C8.539 20.193 3 14.993 3 10a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-client-marker-wrapper',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      const marker = L.marker([client.lat, client.lng], { icon: customIcon });

      const popupHtml = `
        <div class="p-1 max-w-sm text-slate-800 text-right font-sans">
          <div class="flex items-center gap-1.5 mb-1 text-indigo-600 justify-end">
            <span class="font-bold text-xs">موقع العميل</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.74a1.71 1.71 0 0 1-2.202 0C8.539 20.193 3 14.993 3 10a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <h4 class="font-extrabold text-xs text-slate-900">${client.name}</h4>
          <p class="text-[11px] text-slate-500 mt-1">${client.address}</p>
          <div class="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px]">
            <span>👤 <strong>مسؤول الاتصال:</strong> ${client.contactPerson}</span>
            <span>📞 <strong>الهاتف:</strong> ${client.phone}</span>
            
            <div class="grid grid-cols-2 gap-1 mt-2">
              <a href="tel:${client.phone}" class="block text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded-lg text-[10px] shadow-sm transition-colors decoration-none">
                📞 اتصال
              </a>
              <a href="https://wa.me/${client.phone.replace(/^0/, '966')}" target="_blank" rel="noopener noreferrer" class="block text-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1 px-2 rounded-lg text-[10px] shadow-sm transition-colors decoration-none">
                💬 واتساب
              </a>
            </div>
            
            <a href="https://www.google.com/maps/search/?api=1&query=${client.lat},${client.lng}" target="_blank" rel="noopener noreferrer" class="mt-1 block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2 rounded-lg text-[10px] shadow-sm transition-colors decoration-none">
              🗺️ فتح في خرائط جوجل
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { minWidth: 200, closeButton: false });

      marker.on('click', () => {
        setActiveClient(client);
        setActiveTech(null);
        if (onSelectClient) onSelectClient(client.id);
      });

      marker.addTo(markersGroup);

      // Auto-open popup if active client
      if (activeClient && activeClient.id === client.id) {
        setTimeout(() => marker.openPopup(), 100);
      }
    });

    // 2. Render Technician Markers
    technicians.forEach(tech => {
      if (typeof tech.currentLat !== "number" || typeof tech.currentLng !== "number") return;
      const isSelected = selectedTechnicianId === tech.id;
      const statusColors = {
        idle: 'bg-slate-400 border-slate-500',
        traveling: 'bg-orange-500 border-orange-600 animate-pulse',
        working: 'bg-emerald-500 border-emerald-600 animate-pulse',
        break: 'bg-amber-500 border-amber-600'
      };

      const ringClass = isSelected ? 'scale-125 ring-4 ring-offset-2 ring-indigo-500' : 'hover:scale-110';

      const markerHtml = `
        <div class="relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${ringClass}" style="width: 44px; height: 56px;">
          <!-- Status Indicator Dot -->
          <div class="absolute top-0 right-1 w-3 h-3 rounded-full border-2 border-white ${statusColors[tech.status]} z-10"></div>

          <!-- Technician Icon Circle -->
          <div class="w-10 h-10 rounded-full border-2 shadow-xl flex items-center justify-center overflow-hidden bg-white" style="border-color: ${tech.color}">
            <img src="${tech.avatar}" alt="${tech.name}" class="w-full h-full object-cover" />
          </div>

          <!-- Technician Mini Tag -->
          <div class="mt-1 px-2 py-0.5 bg-slate-900 text-white text-[9px] font-medium rounded-md whitespace-nowrap shadow-md">
            ${tech.name.split(' ')[0]}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-tech-marker-wrapper',
        iconSize: [44, 56],
        iconAnchor: [22, 44],
        popupAnchor: [0, -44]
      });

      const marker = L.marker([tech.currentLat, tech.currentLng], { icon: customIcon });

      const statusText = tech.status === 'idle' ? 'متاح / انتظار' :
                         tech.status === 'traveling' ? 'في الطريق' :
                         tech.status === 'working' ? 'قيد العمل' : 'استراحة';

      const statusBadgeClass = tech.status === 'idle' ? 'bg-slate-100 text-slate-600' :
                               tech.status === 'traveling' ? 'bg-orange-100 text-orange-600' :
                               tech.status === 'working' ? 'bg-emerald-100 text-emerald-600' :
                               'bg-amber-100 text-amber-600';

      const popupHtml = `
        <div class="p-1 max-w-xs text-slate-800 text-right font-sans">
          <div class="flex items-center gap-1.5 mb-1.5 justify-end">
            <span class="font-bold text-xs text-indigo-600">الفني الميداني</span>
            <div class="w-6 h-6 rounded-full overflow-hidden border border-slate-200">
              <img src="${tech.avatar}" alt="${tech.name}" class="w-full h-full object-cover" />
            </div>
          </div>
          <h4 class="font-extrabold text-xs text-slate-900">${tech.name}</h4>
          <div class="mt-2 space-y-1 text-[11px]">
            <div class="flex justify-between gap-4">
              <span class="${statusBadgeClass} font-semibold px-1.5 py-0.5 rounded text-[9px]">${statusText}</span>
              <span class="text-slate-500">الحالة:</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-slate-700">${tech.vehicle}</span>
              <span class="text-slate-500">المركبة:</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-slate-700 font-mono">${tech.phone}</span>
              <span class="text-slate-500">الاتصال:</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-amber-500 font-bold">★ ${tech.rating}</span>
              <span class="text-slate-500">التقييم:</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { minWidth: 180, closeButton: false });

      marker.on('click', () => {
        setActiveTech(tech);
        setActiveClient(null);
        if (onSelectTechnician) onSelectTechnician(tech.id);
      });

      marker.addTo(markersGroup);

      // Auto-open popup if active tech
      if (activeTech && activeTech.id === tech.id) {
        setTimeout(() => marker.openPopup(), 100);
      }
    });

  }, [clients, technicians, visits, selectedClientId, selectedTechnicianId, activeClient, activeTech, filterDate]);

  // Draw Polylines representing active travel routes
  useEffect(() => {
    const routesGroup = routesGroupRef.current;
    if (!routesGroup) return;

    routesGroup.clearLayers();

    // Group active, pending visits by technician
    technicians.forEach(tech => {
      if (typeof tech.currentLat !== "number" || typeof tech.currentLng !== "number") return;
      const techVisits = visits
        .filter(v => v.technicianId === tech.id && v.status !== 'completed' && (!filterDate || v.date === filterDate))
        .sort((a, b) => (a.routeSequence || 0) - (b.routeSequence || 0));

      if (techVisits.length === 0) return;

      const pathCoords: L.LatLngTuple[] = [
        [tech.currentLat, tech.currentLng]
      ];

      techVisits.forEach(v => {
        const client = clients.find(c => c.id === v.clientId);
        if (client) {
          pathCoords.push([client.lat, client.lng]);
        }
      });

      // Draw Leaflet polyline
      const polyline = L.polyline(pathCoords, {
        color: tech.color,
        weight: 4,
        opacity: 0.7,
        lineJoin: 'round',
        dashArray: '5, 10' // Stylish dashed effect
      });

      polyline.addTo(routesGroup);
    });
  }, [clients, technicians, visits, filterDate]);

  return (
    <div id="osm-map-widget" className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
      {/* Map Element Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Badge Indicator & Date Filter */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md border border-slate-800">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
          <span className="font-sans">OpenStreetMap Live</span>
        </div>
        <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-md border border-slate-200">
          <label className="text-[10px] font-bold text-slate-600 block text-right mb-1">تصفية العملاء حسب اليوم:</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full text-[11px] p-1.5 border border-slate-300 rounded text-slate-700 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Floating Status Guide Overlay */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-xs text-slate-600 space-y-1.5 z-10 max-w-[180px] text-right select-none">
        <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-1">دلالات الألوان</div>
        <div className="flex items-center gap-2 justify-end">
          <span>متاح / انتظار</span>
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-500" />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <span>في الطريق / قيادة</span>
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-orange-600 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <span>تسجيل دخول / قيد العمل</span>
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-blue-700 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <span>مكتمل</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
        </div>
      </div>
    </div>
  );
}

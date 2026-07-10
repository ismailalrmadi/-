import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Client, Technician, Visit, Project } from '../types';
import { detectConflicts, formatTimeTo12Hour } from '../lib/store';
import { Clock, AlertTriangle, Calendar, Plus, UserCheck, RefreshCw, Moon, Coffee, Edit2, Trash2, Map } from 'lucide-react';

interface SchedulerTimelineProps {
  clients: Client[];
  technicians: Technician[];
  visits: Visit[];
  projects: Project[];
  onAddVisit: (visit: Omit<Visit, 'id'>) => void;
  onAutoSchedule: () => void;
  onDeleteVisit: (id: string) => void;
  onUpdateVisits: (visits: Visit[]) => void;
}

export default function SchedulerTimeline({
  clients,
  technicians,
  visits,
  projects,
  onAddVisit,
  onAutoSchedule,
  onDeleteVisit,
  onUpdateVisits
}: SchedulerTimelineProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState(clients[0]?.id || '');
  const [newTechId, setNewTechId] = useState(technicians[0]?.id || '');
  const [newType, setNewType] = useState<Visit['type']>('Maintenance');
  const [newDate, setNewDate] = useState('2026-07-09');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:30');

  useEffect(() => {
    const tech = technicians.find(t => t.id === newTechId);
    if (tech && tech.shiftStart) {
      setNewStart(tech.shiftStart);
      const [sh, sm] = tech.shiftStart.split(':').map(Number);
      const endMins = sh * 60 + sm + 90; // Default 1.5 hours
      const endHour = Math.floor(endMins / 60) % 24;
      const endMinute = endMins % 60;
      setNewEnd(`${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`);
    }
  }, [newTechId, technicians]);
  const [newNotes, setNewNotes] = useState('');

  // Detect conflicts dynamically (bypassed per user request)
  const conflicts = detectConflicts(visits, technicians);

  // Dynamically calculate startHour and totalHours
  const allHours = [
    ...technicians.map(t => parseInt(t.shiftStart.split(':')[0])),
    ...technicians.map(t => parseInt(t.shiftEnd.split(':')[0])),
    ...visits.map(v => parseInt(v.plannedStartTime.split(':')[0])),
    ...visits.map(v => parseInt(v.plannedEndTime.split(':')[0]))
  ].filter(h => !isNaN(h));
  
  const minHour = Math.max(0, Math.min(...allHours, 8)); // don't go below 0
  const maxHour = Math.min(24, Math.max(...allHours, 18)); // don't go above 24
  
  const startHour = minHour;
  const totalHours = maxHour - minHour;
  
  // Time blocks for the visual grid
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  // Helper to calculate pixel offsets for scheduling blocks
  const getTimePercentage = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const minutesSinceStart = (h - startHour) * 60 + m;
    const totalMinutes = totalHours * 60;
    return Math.max(0, Math.min(100, (minutesSinceStart / totalMinutes) * 100));
  };

  const [viewMode, setViewMode] = useState<'week' | 'day' | 'kanban' | 'map'>('week');
  const [selectedWeekDate, setSelectedWeekDate] = useState('2026-07-09');
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);

  const handleSaveEdit = () => {
    if (editingVisit) {
      const updatedVisits = visits.map(v => v.id === editingVisit.id ? editingVisit : v);
      onUpdateVisits(updatedVisits);
      setEditingVisit(null);
    }
  };

  // Arabic days helper for the week view
  const getWeekDays = (baseDateStr: string) => {
    const parts = baseDateStr.split('-');
    const baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday...
    const sunday = new Date(baseDate);
    sunday.setDate(baseDate.getDate() - dayOfWeek);
    
    const days = [];
    const arabicNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      days.push({
        name: arabicNames[i],
        date: dateStr,
        displayDate: `${mm}/${dd}`
      });
    }
    return days;
  };

  const weekDays = getWeekDays(selectedWeekDate);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const visitId = result.draggableId;
    const destDate = result.destination.droppableId;
    
    const visitToUpdate = visits.find(v => v.id === visitId);
    if (visitToUpdate && visitToUpdate.date !== destDate) {
      const updatedVisits = visits.map(v => 
        v.id === visitId ? { ...v, date: destDate } : v
      );
      onUpdateVisits(updatedVisits);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddVisit({
      title: newTitle,
      clientId: newClientId,
      technicianId: newTechId,
      type: newType,
      status: 'pending',
      date: newDate,
      plannedStartTime: newStart,
      plannedEndTime: newEnd,
      notes: newNotes,
      routeSequence: visits.filter(v => v.technicianId === newTechId).length + 1
    });

    setNewTitle('');
    setNewNotes('');
    setShowAddModal(false);
  };

  return (
    <div id="scheduler-panel" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-right">
      {/* Header and Smart Dispatch Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        {/* Buttons */}
        <div className="flex items-center gap-2 order-2 sm:order-1">
          <button
            onClick={onAutoSchedule}
            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
            التوزيع والجدولة التلقائية الذكية (تصفير التداخل)
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            جدولة زيارة
          </button>
        </div>

        <div className="order-1 sm:order-2">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 justify-end">
            جدول أعمال المخطط الميداني الذكي
            <Calendar className="w-5 h-5 text-indigo-600" />
          </h3>
          <p className="text-xs text-slate-500">
            مراقبة حمولات عمل الفنيين، الكشف التلقائي عن تداخل المواعيد، وإعادة توزيع المهام تلقائياً.
          </p>
        </div>
      </div>

      {/* View Switcher and Week Selector Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-150">
        <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1 flex-wrap order-2 sm:order-1">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'map' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🗺️ خريطة حية
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'kanban' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 لوحة كانبان
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'week' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🗓️ أسبوعي
          </button>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'day' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ⏱️ يومي
          </button>
        </div>

        <div className="flex items-center gap-2 order-1 sm:order-2 justify-end">
          <input
            type="date"
            value={selectedWeekDate}
            onChange={(e) => setSelectedWeekDate(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800 text-right"
          />
          <span className="text-xs font-semibold text-slate-500">
            {viewMode === 'week' ? 'عرض الأسبوع المحتوي لتاريخ:' : 'عرض المخطط اليومي لتاريخ:'}
          </span>
        </div>
      </div>

      {/* Collision Detection Display */}
      {conflicts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-right">
          <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs justify-end">
            <span>تم كشف تداخل في المواعيد المجدولة ({conflicts.length})</span>
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 animate-bounce" />
          </div>
          <ul className="list-disc pr-5 pl-0 text-xs text-amber-700 space-y-1">
            {conflicts.map((conf, i) => (
              <li key={i} className="leading-relaxed">
                {conf.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Visual Timeline Row Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px] border border-slate-150 rounded-xl overflow-hidden bg-slate-50">
          
          {viewMode === 'day' && (
            <>
              {/* Daily Timeline Header: Hours Scale */}
              <div className="flex border-b border-slate-150 bg-slate-100/50">
                <div className="w-48 p-3 text-xs font-bold text-slate-500 border-r border-slate-150 bg-slate-100 uppercase shrink-0 text-right">
                  الفني الميداني
                </div>
                <div className="flex-1 flex relative">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="flex-1 text-center py-2 text-[10px] font-bold text-slate-400 border-r border-slate-150/50 last:border-0"
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Rows */}
              <div className="divide-y divide-slate-150">
                {technicians.map((tech) => {
                  const techVisits = visits.filter(
                    (v) => v.technicianId === tech.id && v.status !== 'completed' && v.date === selectedWeekDate
                  );

                  return (
                    <div key={tech.id} className="flex h-20 items-stretch bg-white hover:bg-slate-50/50 transition-colors">
                      <div className="w-48 p-3 border-r border-slate-150 flex items-center gap-2.5 shrink-0 bg-slate-50/30 text-right justify-end">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-800 truncate leading-tight">{tech.name}</div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">{tech.vehicle}</div>
                        </div>
                        <img src={tech.avatar} alt={tech.name} className="w-8 h-8 rounded-full object-cover border" />
                      </div>

                      <div className="flex-1 relative bg-grid">
                        {tech.breaks.map((br) => {
                          const left = getTimePercentage(br.startTime);
                          const right = getTimePercentage(br.endTime);
                          return (
                            <div
                              key={br.id}
                              className="absolute top-2 bottom-2 bg-amber-100/80 border border-dashed border-amber-300 rounded-lg flex flex-col items-center justify-center text-[9px] font-medium text-amber-700 z-10 transition-all hover:bg-amber-200"
                              style={{ left: `${left}%`, right: `${100 - right}%` }}
                            >
                              <Coffee className="w-3.5 h-3.5 text-amber-600 mb-0.5" />
                              <span>{br.type}</span>
                            </div>
                          );
                        })}

                        {techVisits.map((visit) => {
                          const left = getTimePercentage(visit.plannedStartTime);
                          const right = getTimePercentage(visit.plannedEndTime);
                          const hasConflict = conflicts.some((c) => c.visitId === visit.id);

                          const typeColors = {
                            Maintenance: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
                            Installation: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                            Repair: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
                            Inspection: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                          };

                          return (
                            <div
                              key={visit.id}
                              className={`absolute top-2 bottom-2 rounded-lg border p-1.5 px-2 flex flex-col justify-between overflow-hidden shadow-sm transition-all duration-200 group cursor-pointer z-20 ${
                                hasConflict
                                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-300 ring-offset-1 text-rose-700 hover:bg-rose-100'
                                  : typeColors[visit.type]
                              }`}
                              style={{ left: `${left}%`, right: `${100 - right}%` }}
                            >
                              <div className="min-w-0 flex justify-between items-start">
                                <span className="font-bold text-[10px] truncate leading-tight">{visit.title}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteVisit(visit.id);
                                  }}
                                  className="text-[10px] text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="flex justify-between items-end text-[9px] font-medium">
                                <span className="opacity-80 truncate">
                                  {formatTimeTo12Hour(visit.plannedStartTime)} - {formatTimeTo12Hour(visit.plannedEndTime)}
                                </span>
                                {hasConflict && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )} 
          {viewMode === 'week' && (
            <>
              {/* Weekly Timeline Header */}
              <div className="flex border-b border-slate-150 bg-slate-100/50">
                <div className="w-48 p-3 text-xs font-bold text-slate-500 border-r border-slate-150 bg-slate-100 uppercase shrink-0 text-right">
                  الفني الميداني
                </div>
                <div className="flex-1 flex relative">
                  {weekDays.map((day) => {
                    const isTodayDate = day.date === '2026-07-09';
                    return (
                      <div
                        key={day.date}
                        className={`flex-1 text-center py-2.5 text-xs font-bold border-r border-slate-155 last:border-0 ${
                          isTodayDate ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                        }`}
                      >
                        <div>{day.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{day.displayDate}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Rows */}
              <div className="divide-y divide-slate-150">
                {technicians.map((tech) => {
                  return (
                    <div key={tech.id} className="flex min-h-[110px] items-stretch bg-white hover:bg-slate-50/50 transition-colors">
                      <div className="w-48 p-3 border-r border-slate-150 flex flex-col justify-center items-center gap-1.5 shrink-0 bg-slate-50/30 text-center">
                        <img src={tech.avatar} alt={tech.name} className="w-9 h-9 rounded-full object-cover border-2 shadow-sm" style={{ borderColor: tech.color }} />
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs text-slate-800 leading-tight">{tech.name}</div>
                          <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[130px]">{tech.vehicle}</div>
                        </div>
                        <div className="text-[8px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full mt-1">
                          ⏰ {formatTimeTo12Hour(tech.shiftStart)} - {formatTimeTo12Hour(tech.shiftEnd)}
                        </div>
                      </div>

                      <div className="flex-1 flex relative">
                        {weekDays.map((day) => {
                          const dayVisits = visits.filter(
                            (v) => v.technicianId === tech.id && v.date === day.date
                          );
                          const isWeekendOrHoliday = tech.vacations && (tech.vacations.includes(day.name));

                          return (
                            <div
                              key={day.date}
                              className={`flex-1 p-2 border-r border-slate-150/50 last:border-0 flex flex-col gap-1.5 relative min-h-[90px] ${
                                isWeekendOrHoliday ? 'bg-slate-50' : 'bg-white'
                              }`}
                            >
                              {isWeekendOrHoliday ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 bg-slate-100/40 select-none">
                                  <span className="text-slate-400 text-[9px] font-bold">🏖️ إجازة أسبوعية</span>
                                  <span className="text-[8px] text-slate-400/80 mt-0.5 leading-tight">{tech.vacations?.split(' ')[0]}</span>
                                </div>
                              ) : (
                                <>
                                  {dayVisits.map((visit) => {
                                    const hasConflict = conflicts.some((c) => c.visitId === visit.id);
                                    const typeColors = {
                                      Maintenance: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
                                      Installation: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                                      Repair: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
                                      Inspection: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                    };

                                    return (
                                      <div
                                        key={visit.id}
                                        className={`rounded-lg border p-1 px-1.5 flex flex-col justify-between overflow-hidden shadow-xs transition-all duration-150 group cursor-pointer text-right min-h-[48px] ${
                                          hasConflict
                                            ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300 text-rose-700 hover:bg-rose-100'
                                            : typeColors[visit.type]
                                        }`}
                                      >
                                        <div className="flex justify-between items-start gap-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDeleteVisit(visit.id);
                                            }}
                                            className="text-[9px] text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            ✕
                                          </button>
                                          <span className="font-bold text-[9px] truncate leading-tight flex-1">{visit.title}</span>
                                        </div>
                                        <div className="flex justify-between items-end text-[8px] font-medium mt-1">
                                          {hasConflict && <AlertTriangle className="w-2.5 h-2.5 text-red-500 shrink-0" />}
                                          <span className="opacity-80 truncate">
                                            ⏱️ {formatTimeTo12Hour(visit.plannedStartTime)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {dayVisits.length === 0 && (
                                    <div className="flex-1 flex items-center justify-center border border-dashed border-slate-100 rounded-lg text-[9px] text-slate-300 select-none">
                                      فارغ
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          {viewMode === 'kanban' && (
             <DragDropContext onDragEnd={handleDragEnd}>
               <div className="flex gap-4 p-4 min-h-[500px] overflow-x-auto w-full bg-slate-50/50">
                 {weekDays.map(day => {
                   const dayVisits = visits.filter(v => v.date === day.date && v.status !== 'completed').sort((a, b) => a.plannedStartTime.localeCompare(b.plannedStartTime));
                   return (
                     <div key={day.date} className="bg-slate-100 rounded-xl p-3 flex flex-col gap-3 min-w-[300px] border border-slate-200/60 shadow-sm">
                       <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                         <div className="text-right">
                           <span className="font-bold text-slate-700 text-sm block">{day.name}</span>
                           <span className="text-[10px] text-slate-500 font-mono">{day.displayDate}</span>
                         </div>
                         <span className="bg-white text-slate-500 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm border border-slate-150">
                           {dayVisits.length}
                         </span>
                       </div>
                       
                       <Droppable droppableId={day.date}>
                         {(provided, snapshot) => (
                           <div 
                             {...provided.droppableProps}
                             ref={provided.innerRef}
                             className={`flex flex-col gap-2 flex-1 overflow-y-auto min-h-[150px] p-1 rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                           >
                             {dayVisits.map((visit, index) => {
                               const tech = technicians.find(t => t.id === visit.technicianId);
                               const hasConflict = conflicts.some(c => c.visitId === visit.id);
                               const typeColors = {
                                 Maintenance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                 Installation: 'bg-blue-50 text-blue-700 border-blue-200',
                                 Repair: 'bg-red-50 text-red-700 border-red-200',
                                 Inspection: 'bg-indigo-50 text-indigo-700 border-indigo-200'
                               };
                               const colors = typeColors[visit.type] || typeColors.Maintenance;
                               
                               return (
<React.Fragment key={visit.id}><Draggable  draggableId={visit.id} index={index}>
                                   {(provided, snapshot) => (
                                     <div
                                       ref={provided.innerRef}
                                       {...provided.draggableProps}
                                       {...provided.dragHandleProps}
                                       className={`p-3 rounded-lg shadow-sm border text-right transition-all ${snapshot.isDragging ? 'shadow-xl scale-105 z-50' : ''} ${hasConflict ? 'border-amber-400 bg-amber-50/80 shadow-amber-100' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                                       style={{ ...provided.draggableProps.style }}
                                     >
                                       <div className="flex justify-between items-start mb-2">
                                         <div className="flex items-center gap-1">
                                           <button 
                                             onClick={() => onDeleteVisit(visit.id)}
                                             className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                             title="حذف"
                                           >
                                             <Trash2 className="w-3.5 h-3.5" />
                                           </button>
                                           <button 
                                             onClick={() => setEditingVisit(visit)}
                                             className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
                                             title="تعديل الملاحظة واللون"
                                           >
                                             <Edit2 className="w-3.5 h-3.5" />
                                           </button>
                                         </div>
                                         <div className="flex items-center gap-1.5">
                                           <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${colors}`}>
                                             {visit.type}
                                           </span>
                                           {hasConflict && (
                                             <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" title="يوجد تعارض في الوقت لهذا الموعد" />
                                           )}
                                         </div>
                                       </div>
                                       <div className="font-bold text-xs text-slate-800 mb-1 leading-snug">{visit.title}</div>
                                       <div className="text-[10px] text-slate-500 mb-2 flex items-center gap-1 justify-end font-mono bg-slate-50 px-1.5 py-0.5 rounded-md inline-flex self-end">
                                         <span>{formatTimeTo12Hour(visit.plannedStartTime)}</span> - <span>{formatTimeTo12Hour(visit.plannedEndTime)}</span>
                                       </div>
                                       {tech && (
                                         <div className="flex items-center gap-1.5 justify-end mt-2 pt-2 border-t border-slate-100">
                                           <span className="text-[10px] font-bold text-slate-600">{tech.name}</span>
                                           <img src={tech.avatar} alt={tech.name} className="w-5 h-5 rounded-full ring-2 ring-white shadow-sm" />
                                         </div>
                                       )}
                                     </div>
                                   )}
                                 </Draggable></React.Fragment>
                               );
                             })}
                             {provided.placeholder}
                           </div>
                         )}
                       </Droppable>
                     </div>
                   );
                 })}
               </div>
             </DragDropContext>
          )}


          {viewMode === 'map' && (
             <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-50 min-h-[300px]">
               <span className="text-2xl mb-3">🗺️</span>
               <span className="font-bold text-sm">عرض الخريطة الحية</span>
               <span className="text-[10px] mt-1 text-slate-400">يرجى الانتقال للقسم العلوي من لوحة التحكم لعرض الخريطة الذكية لجميع العملاء</span>
             </div>
          )}

        </div>
      </div>

      {/* Book Visit Overlay Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up text-right">
            <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 justify-end">
              حجز موعد / مهمة رفع مقاسات
              <Plus className="w-5 h-5 text-indigo-600" />
            </h4>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">اسم الخدمة / مهمة رفع المقاسات</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: رفع مقاسات مطابخ شقق الملقا"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white text-slate-800 font-medium text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">الفني الميداني المسؤول</label>
                  <select
                    value={newTechId}
                    onChange={(e) => setNewTechId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right"
                  >
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">موقع العميل المستهدف</label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">وقت الانتهاء</label>
                  <input
                    type="time"
                    required
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">وقت البدء</label>
                  <input
                    type="time"
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">تصنيف المقاس</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as Visit['type'])}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right"
                  >
                    <option value="Maintenance">مطابخ وخزائن</option>
                    <option value="Installation">أبواب ونوافذ</option>
                    <option value="Repair">رخام وسيراميك</option>
                    <option value="Inspection">ستائر وديكور</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">توجيهات رفع المقاسات / ملاحظات الفني</label>
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل أو متطلبات خاصة بالليزر أو الارتفاعات..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md cursor-pointer"
                >
                  تأكيد الموعد وإدراجه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Visit Modal */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-right">
            <div className="bg-indigo-950 p-4 border-b border-indigo-900 flex justify-between items-center text-white">
              <span className="text-sm font-bold">تعديل الملاحظة ولون البطاقة</span>
              <button onClick={() => setEditingVisit(null)} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">نوع الموعد (يحدد لون البطاقة)</label>
                <select
                  value={editingVisit.type}
                  onChange={(e) => setEditingVisit({ ...editingVisit, type: e.target.value as Visit['type'] })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right"
                >
                  <option value="Maintenance">صيانة دورية (أخضر)</option>
                  <option value="Installation">تركيب جديد (أزرق)</option>
                  <option value="Repair">إصلاح عطل (أحمر)</option>
                  <option value="Inspection">فحص ورفع مقاسات (بنفسجي)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">عنوان الملاحظة</label>
                <input
                  type="text"
                  value={editingVisit.title}
                  onChange={(e) => setEditingVisit({ ...editingVisit, title: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">الملاحظات والتفاصيل</label>
                <textarea
                  value={editingVisit.notes || ''}
                  onChange={(e) => setEditingVisit({ ...editingVisit, notes: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right min-h-[80px]"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVisit(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

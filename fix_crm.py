import re

with open('src/components/CRMImporter.tsx', 'r') as f:
    content = f.read()

# We need to replace the plannedStartTime and plannedEndTime lines
# And we can get the tech from matchedTech

# First instance
target_1 = """          const techId = matchedTech ? matchedTech.id : 't1';

          // Schedule corresponding visit
          const parsedScope = parseJobScopeFromWorks(row.works);
          const newVisitData = {
            clientId: targetClientId,
            technicianId: techId,
            title: `رفع مقاسات: ${row.works}`,
            type: 'Inspection' as const,
            status: 'pending' as const,
            date: row.date,
            plannedStartTime: '10:00',
            plannedEndTime: `1${Math.floor(parsedScope.estimatedDuration / 60)}:${(parsedScope.estimatedDuration % 60).toString().padStart(2, '0')}`,
            notes: `تحديث تلقائي لجوجل شيت | ملاحظات: ${row.notes || 'لا يوجد'} | المندوب: ${row.agent || 'غير محدد'} | حالة العميل: ${row.status || 'معلق'}`,
            jobScope: parsedScope.jobScope,
            estimatedDuration: parsedScope.estimatedDuration
          };"""

replacement_1 = """          const techId = matchedTech ? matchedTech.id : 't1';
          const defaultTechShiftStart = matchedTech?.shiftStart || '09:00';
          const [sh, sm] = defaultTechShiftStart.split(':').map(Number);
          const startMins = sh * 60 + sm;
          const parsedScope = parseJobScopeFromWorks(row.works);
          const endMins = startMins + parsedScope.estimatedDuration;
          
          const startHour = Math.floor(startMins / 60) % 24;
          const startMin = startMins % 60;
          const endHour = Math.floor(endMins / 60) % 24;
          const endMin = endMins % 60;

          // Schedule corresponding visit
          const newVisitData = {
            clientId: targetClientId,
            technicianId: techId,
            title: `رفع مقاسات: ${row.works}`,
            type: 'Inspection' as const,
            status: 'pending' as const,
            date: row.date,
            plannedStartTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
            plannedEndTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
            notes: `تحديث تلقائي لجوجل شيت | ملاحظات: ${row.notes || 'لا يوجد'} | المندوب: ${row.agent || 'غير محدد'} | حالة العميل: ${row.status || 'معلق'}`,
            jobScope: parsedScope.jobScope,
            estimatedDuration: parsedScope.estimatedDuration
          };"""

# Second instance
target_2 = """      const techId = matchedTech ? matchedTech.id : 't1';

      const parsedScope2 = parseJobScopeFromWorks(row.works);
          const newVisitData = {
        clientId: targetClientId,
        technicianId: techId,
        title: `رفع مقاسات: ${row.works}`,
        type: 'Inspection' as const,
        status: 'pending' as const,
        date: row.date,
        plannedStartTime: '10:00',
        plannedEndTime: `1${Math.floor(parsedScope2.estimatedDuration / 60)}:${(parsedScope2.estimatedDuration % 60).toString().padStart(2, '0')}`,
        notes: `ملاحظات الشيت: ${row.notes || 'لا يوجد'} | المندوب: ${row.agent || 'غير محدد'} | حالة العميل: ${row.status || 'معلق'}`,
        jobScope: parsedScope2.jobScope,
        estimatedDuration: parsedScope2.estimatedDuration
      };"""

replacement_2 = """      const techId = matchedTech ? matchedTech.id : 't1';
      const defaultTechShiftStart2 = matchedTech?.shiftStart || '09:00';
      const [sh2, sm2] = defaultTechShiftStart2.split(':').map(Number);
      const startMins2 = sh2 * 60 + sm2;
      const parsedScope2 = parseJobScopeFromWorks(row.works);
      const endMins2 = startMins2 + parsedScope2.estimatedDuration;
      
      const startHour2 = Math.floor(startMins2 / 60) % 24;
      const startMin2 = startMins2 % 60;
      const endHour2 = Math.floor(endMins2 / 60) % 24;
      const endMin2 = endMins2 % 60;

          const newVisitData = {
        clientId: targetClientId,
        technicianId: techId,
        title: `رفع مقاسات: ${row.works}`,
        type: 'Inspection' as const,
        status: 'pending' as const,
        date: row.date,
        plannedStartTime: `${String(startHour2).padStart(2, '0')}:${String(startMin2).padStart(2, '0')}`,
        plannedEndTime: `${String(endHour2).padStart(2, '0')}:${String(endMin2).padStart(2, '0')}`,
        notes: `ملاحظات الشيت: ${row.notes || 'لا يوجد'} | المندوب: ${row.agent || 'غير محدد'} | حالة العميل: ${row.status || 'معلق'}`,
        jobScope: parsedScope2.jobScope,
        estimatedDuration: parsedScope2.estimatedDuration
      };"""

content = content.replace(target_1, replacement_1)
content = content.replace(target_2, replacement_2)

with open('src/components/CRMImporter.tsx', 'w') as f:
    f.write(content)

print("Updated CRMImporter.tsx")

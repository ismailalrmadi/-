import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """          const startHour = Math.floor(currentMins / 60) % 24;
          const startMinute = currentMins % 60;
          visit.plannedStartTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
          
          const endMins = currentMins + durationMins;
          const endHour = Math.floor(endMins / 60) % 24;
          const endMinute = endMins % 60;
          visit.plannedEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
          
          // Next visit starts 30 mins after this one ends (buffer)
          currentMins = endMins + 30;"""

replacement = """          let endMins = currentMins + durationMins;

          // Check if overlaps with technician's breaks
          if (t.breaks) {
            for (const b of t.breaks) {
              const [bsh, bsm] = (b.startTime || b.start).split(':').map(Number);
              const [beh, bem] = (b.endTime || b.end).split(':').map(Number);
              const bStartMins = bsh * 60 + bsm;
              const bEndMins = beh * 60 + bem;

              if (currentMins < bEndMins && endMins > bStartMins) {
                // Overlaps with break! Shift to end of the break
                currentMins = bEndMins;
                endMins = currentMins + durationMins;
              }
            }
          }

          const startHour = Math.floor(currentMins / 60) % 24;
          const startMinute = currentMins % 60;
          visit.plannedStartTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
          
          const endHour = Math.floor(endMins / 60) % 24;
          const endMinute = endMins % 60;
          visit.plannedEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
          
          // Next visit starts 30 mins after this one ends (buffer)
          currentMins = endMins + 30;"""

content = content.replace(target, replacement)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Updated App.tsx")

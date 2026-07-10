import re

with open('src/components/SchedulerTimeline.tsx', 'r') as f:
    content = f.read()

target = """  const [newDate, setNewDate] = useState('2026-07-09');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:30');"""

replacement = """  const [newDate, setNewDate] = useState('2026-07-09');
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
  }, [newTechId, technicians]);"""

content = content.replace(target, replacement)

with open('src/components/SchedulerTimeline.tsx', 'w') as f:
    f.write(content)

print("Updated SchedulerTimeline.tsx")

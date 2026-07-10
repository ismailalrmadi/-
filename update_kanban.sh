sed -i "s/const dayVisits = visits.filter(v => v.date === day.date)/const dayVisits = visits.filter(v => v.date === day.date \&\& v.status !== 'completed')/" src/components/SchedulerTimeline.tsx

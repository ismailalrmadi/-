const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetCode = `        // If remote database has no records (first initialization), seed it with initial clients & technicians
        if (remoteClients.length === 0 && remoteTechnicians.length === 0) {
          for (const c of clients) {
            await dbSaveClient(c);
          }
          for (const p of projects) {
            await dbSaveProject(p);
          }
          for (const t of technicians) {
            await dbSaveTechnician(t);
          }
          for (const v of visits) {
            await dbSaveVisit(v);
          }
          for (const r of routes) {
            await dbSaveRoute(r);
          }
          for (const l of logs) {
            await dbSaveLog(l);
          }
        } else {
          // Update local state and localStorage cache with data fetched from cloud Firestore
          if (remoteClients.length > 0) setClients(remoteClients);
          if (remoteProjects.length > 0) setProjects(remoteProjects);
          if (remoteTechnicians.length > 0) setTechnicians(remoteTechnicians);
          if (remoteVisits.length > 0) setVisits(remoteVisits);
          if (remoteRoutes.length > 0) setRoutes(remoteRoutes);
          if (remoteLogs.length > 0) {
            const uniqueLogsMap = new Map<string, LogEntry>();
            remoteLogs.forEach(l => {
              if (l && l.id) {
                uniqueLogsMap.set(l.id, l);
              }
            });
            const uniqueLogs = Array.from(uniqueLogsMap.values()) as LogEntry[];
            setLogs(uniqueLogs.sort((a: LogEntry, b: LogEntry) => b.id.localeCompare(a.id)));
          }
        }`;

const replacementCode = `        // Update local state and localStorage cache with data fetched from cloud Firestore
        setClients(remoteClients);
        setProjects(remoteProjects);
        setTechnicians(remoteTechnicians);
        setVisits(remoteVisits);
        setRoutes(remoteRoutes);
        const uniqueLogsMap = new Map<string, LogEntry>();
        remoteLogs.forEach(l => {
          if (l && l.id) {
            uniqueLogsMap.set(l.id, l);
          }
        });
        const uniqueLogs = Array.from(uniqueLogsMap.values()) as LogEntry[];
        setLogs(uniqueLogs.sort((a: LogEntry, b: LogEntry) => b.id.localeCompare(a.id)));`;

code = code.replace(targetCode, replacementCode);

fs.writeFileSync('src/App.tsx', code);

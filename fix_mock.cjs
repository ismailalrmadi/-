const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace state initialization to fallback to [] instead of initialData
code = code.replace(/return saved \? JSON.parse\(saved\) : initialClients;/g, "return saved ? JSON.parse(saved) : [];");
code = code.replace(/return saved \? JSON.parse\(saved\) : initialProjects;/g, "return saved ? JSON.parse(saved) : [];");
code = code.replace(/return saved \? JSON.parse\(saved\) : initialTechnicians;/g, "return saved ? JSON.parse(saved) : [];");
code = code.replace(/return saved \? JSON.parse\(saved\) : initialVisits;/g, "return saved ? JSON.parse(saved) : [];");
code = code.replace(/return saved \? JSON.parse\(saved\) : initialRoutes;/g, "return saved ? JSON.parse(saved) : [];");
code = code.replace(/return saved \? JSON.parse\(saved\) : initialLogs;/g, "return saved ? JSON.parse(saved) : [];");

// Remove the seeding logic!
const seedLogic = `        // If remote database has no records (first initialization), seed it with initial clients & technicians
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
          setClients(remoteClients);
          setProjects(remoteProjects);
          setTechnicians(remoteTechnicians);
          setVisits(remoteVisits);
          setRoutes(remoteRoutes);
          setLogs(remoteLogs);
        }`;

const newSyncLogic = `        // Update local state and localStorage cache with data fetched from cloud Firestore
        if (remoteClients.length > 0 || remoteTechnicians.length > 0 || remoteProjects.length > 0 || remoteVisits.length > 0) {
          setClients(remoteClients);
          setProjects(remoteProjects);
          setTechnicians(remoteTechnicians);
          setVisits(remoteVisits);
          setRoutes(remoteRoutes);
          setLogs(remoteLogs);
        }`;

code = code.replace(seedLogic, newSyncLogic);

fs.writeFileSync('src/App.tsx', code);

import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target_add = """  const handleAddVisit = (visitData: Omit<Visit, 'id'> & { id?: string }) => {
    const newVisit: Visit = {
      ...visitData,
      id: visitData.id || `v_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };
    setVisits(prev => [...prev, newVisit]);
    dbSaveVisit(newVisit); // Save to cloud Firestore
    appendLog(visitData.technicianId, `تمت جدولة زيارة جديدة: "${visitData.title}"`, 'info');
  };"""

replacement_add = target_add + """

  const handleAddVisits = (visitsData: (Omit<Visit, 'id'> & { id?: string })[]) => {
    const newVisits = visitsData.map((data, i) => ({
      ...data,
      id: data.id || `v_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`
    }));
    setVisits(prev => [...prev, ...newVisits]);
    newVisits.forEach(v => dbSaveVisit(v));
    // Not logging for each to prevent spam, we can log once if needed
  };

  const handleAddClients = (clientsData: Omit<Client, 'id'>[]) => {
    const newClients = clientsData.map((data, i) => ({
      ...data,
      id: `c_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`
    }));
    setClients(prev => [...prev, ...newClients]);
    newClients.forEach(c => dbSaveClient(c));
    return newClients;
  };"""

content = content.replace(target_add, replacement_add)

target_update = """  const handleUpdateVisits = (newVisits: Visit[]) => {
    setVisits(newVisits);
    newVisits.forEach(v => dbSaveVisit(v)); // Save updates to cloud Firestore
  };"""

replacement_update = """  const handleUpdateVisits = (newVisits: Visit[]) => {
    setVisits(prev => {
      const changedVisits = newVisits.filter(newVisit => {
        const oldVisit = prev.find(v => v.id === newVisit.id);
        return JSON.stringify(oldVisit) !== JSON.stringify(newVisit);
      });
      changedVisits.forEach(v => dbSaveVisit(v));
      return newVisits;
    });
  };"""

content = content.replace(target_update, replacement_update)


target_auto_schedule = """    setVisits(updatedVisits);
    // Write all updated visits to Firestore
    updatedVisits.forEach(v => dbSaveVisit(v));"""

replacement_auto_schedule = """    setVisits(prev => {
      const changedVisits = updatedVisits.filter(newVisit => {
        const oldVisit = prev.find(v => v.id === newVisit.id);
        return JSON.stringify(oldVisit) !== JSON.stringify(newVisit);
      });
      changedVisits.forEach(v => dbSaveVisit(v));
      return updatedVisits;
    });"""

content = content.replace(target_auto_schedule, replacement_auto_schedule)

target_crm_props = """                    onAddClient={handleAddClient}
                    onAddVisit={handleAddVisit}
                    appendLog={appendLog}
                  />"""

replacement_crm_props = """                    onAddClient={handleAddClient}
                    onAddClients={handleAddClients}
                    onAddVisit={handleAddVisit}
                    onAddVisits={handleAddVisits}
                    appendLog={appendLog}
                  />"""

content = content.replace(target_crm_props, replacement_crm_props)

with open('src/App.tsx', 'w') as f:
    f.write(content)

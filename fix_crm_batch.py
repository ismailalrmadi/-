import re

with open('src/components/CRMImporter.tsx', 'r') as f:
    content = f.read()

# Replace props
content = content.replace(
    "onAddVisit: (visit: Omit<Visit, 'id'> & { id?: string }) => void;",
    "onAddVisit: (visit: Omit<Visit, 'id'> & { id?: string }) => void;\n  onAddVisits?: (visits: (Omit<Visit, 'id'> & { id?: string })[]) => void;\n  onAddClients?: (clients: Omit<Client, 'id'>[]) => void;"
)

content = content.replace(
    "export default function CRMImporter({ clients, technicians, onAddClient, onAddVisit, appendLog }: CRMImporterProps) {",
    "export default function CRMImporter({ clients, technicians, onAddClient, onAddClients, onAddVisit, onAddVisits, appendLog }: CRMImporterProps) {"
)

# For Google Sheets sync:
target_gs = """      // Synchronize newly added records automatically
      parsed.forEach((row) => {
        // Double check in state to prevent duplicates"""

replacement_gs = """      // Synchronize newly added records automatically
      const newClientsToSync: Omit<Client, 'id'>[] = [];
      const newVisitsToSync: (Omit<Visit, 'id'> & { id?: string })[] = [];

      parsed.forEach((row) => {
        // Double check in state to prevent duplicates"""

content = content.replace(target_gs, replacement_gs)

target_gs_add = """          };
          onAddClient(newClientData);

          // Find agent or fallback"""

replacement_gs_add = """          };
          newClientsToSync.push(newClientData);

          // Find agent or fallback"""

content = content.replace(target_gs_add, replacement_gs_add)

target_gs_add2 = """          };
          onAddVisit(newVisitData);

          newClientsCount++;
        }
      });"""

replacement_gs_add2 = """          };
          newVisitsToSync.push(newVisitData);

          newClientsCount++;
        }
      });

      if (newClientsToSync.length > 0 && onAddClients) {
        onAddClients(newClientsToSync);
      } else {
        newClientsToSync.forEach(c => onAddClient(c));
      }

      if (newVisitsToSync.length > 0 && onAddVisits) {
        onAddVisits(newVisitsToSync);
      } else {
        newVisitsToSync.forEach(v => onAddVisit(v));
      }"""

content = content.replace(target_gs_add2, replacement_gs_add2)


# For text paste sync:
target_paste = """    const parsedRows = parseTextData(inputText);
    if (parsedRows.length === 0) {
      alert('لم يتم العثور على بيانات صالحة في النص المدخل.');
      return;
    }

    let newClientsCount = 0;
    
    parsedRows.forEach((row) => {
      // Prevent duplicates
      const clientExists = clients.some(
        (c) => c.name.trim() === row.clientName.trim() || c.phone.trim() === row.phone.trim()
      );

      if (clientExists) return;"""

replacement_paste = """    const parsedRows = parseTextData(inputText);
    if (parsedRows.length === 0) {
      alert('لم يتم العثور على بيانات صالحة في النص المدخل.');
      return;
    }

    let newClientsCount = 0;
    const newClientsToSync2: Omit<Client, 'id'>[] = [];
    const newVisitsToSync2: (Omit<Visit, 'id'> & { id?: string })[] = [];
    
    parsedRows.forEach((row) => {
      // Prevent duplicates
      const clientExists = clients.some(
        (c) => c.name.trim() === row.clientName.trim() || c.phone.trim() === row.phone.trim()
      );

      if (clientExists) return;"""

content = content.replace(target_paste, replacement_paste)


target_paste_add = """      };
      onAddClient(newClientData);

      // Find agent or fallback"""

replacement_paste_add = """      };
      newClientsToSync2.push(newClientData);

      // Find agent or fallback"""

content = content.replace(target_paste_add, replacement_paste_add)


target_paste_add2 = """      };
      onAddVisit(newVisitData);
    });

    appendLog('t1', `قام نظام الربط باستيراد وتوطين ${parsedRows.length} عملاء وجدولة مواعيدهم على فنيي الميدان جغرافياً`, 'success');"""

replacement_paste_add2 = """      };
      newVisitsToSync2.push(newVisitData);
    });

    if (newClientsToSync2.length > 0 && onAddClients) {
      onAddClients(newClientsToSync2);
    } else {
      newClientsToSync2.forEach(c => onAddClient(c));
    }

    if (newVisitsToSync2.length > 0 && onAddVisits) {
      onAddVisits(newVisitsToSync2);
    } else {
      newVisitsToSync2.forEach(v => onAddVisit(v));
    }

    appendLog('t1', `قام نظام الربط باستيراد وتوطين ${parsedRows.length} عملاء وجدولة مواعيدهم على فنيي الميدان جغرافياً`, 'success');"""

content = content.replace(target_paste_add2, replacement_paste_add2)

with open('src/components/CRMImporter.tsx', 'w') as f:
    f.write(content)


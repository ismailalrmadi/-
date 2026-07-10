const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const collections = ['clients', 'projects', 'technicians', 'visits', 'routes', 'logs'];
  for (const c of collections) {
    const snap = await getDocs(collection(db, c));
    snap.forEach(async d => {
       if (!d.data().id) {
           console.log(`Missing id in ${c}: ${d.id}`);
           await deleteDoc(doc(db, c, d.id));
       }
    });
  }
  setTimeout(() => process.exit(0), 2000);
}
run();

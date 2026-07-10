const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const collections = ['clients', 'projects', 'technicians', 'visits', 'routes', 'logs', 'users'];
  for (const c of collections) {
    const snap = await getDocs(collection(db, c));
    console.log(`--- ${c} ---`);
    snap.forEach(d => console.log(d.id, d.data()));
  }
  process.exit(0);
}
run();

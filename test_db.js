import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function check() {
  const snap = await getDocs(collection(db, 'clients'));
  console.log("Total clients:", snap.size);
  snap.forEach(d => console.log(d.id, d.data().name));
  process.exit(0);
}
check();

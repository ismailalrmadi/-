import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function wipeCollection(colName) {
  const snap = await getDocs(collection(db, colName));
  let count = 0;
  for (const d of snap.docs) {
    await deleteDoc(doc(db, colName, d.id));
    count++;
  }
  console.log(`Wiped ${count} documents from ${colName}`);
}

async function run() {
  await wipeCollection('clients');
  await wipeCollection('projects');
  await wipeCollection('technicians');
  await wipeCollection('visits');
  await wipeCollection('routes');
  await wipeCollection('logs');
  process.exit(0);
}
run();

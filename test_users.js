import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  try {
    await setDoc(doc(db, 'users', 'test'), { name: 'test' });
    console.log("Seeded test user");
  } catch(e) {
    console.log("ERROR writing users:", e);
  }
  process.exit(0);
}
run();

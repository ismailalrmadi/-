import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

const initialUsers = [
  { id: 'u1', name: 'إسماعيل الرمادي', phone: '0500000001', password: '123', role: 'admin', status: 'active', lastActive: 'الآن' },
  { id: 'u2', name: 'أحمد القحطاني', phone: '0500000002', password: '123', role: 'manager', status: 'active', lastActive: 'قبل ١٠ دقائق' },
  { id: 'u3', name: 'خالد الحربي', phone: '0500000003', password: '123', role: 'technician', status: 'active', lastActive: 'قبل ساعة' }
];

async function run() {
  for (const u of initialUsers) {
    await setDoc(doc(db, 'users', u.id), u);
  }
  console.log("Seeded initial users");
  process.exit(0);
}
run();

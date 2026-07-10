const { initializeApp } = require('firebase/app');
const { getFirestore, doc, deleteDoc } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  await deleteDoc(doc(db, 'clients', 'c123'));
  console.log("Deleted c123");
  process.exit(0);
}
run();

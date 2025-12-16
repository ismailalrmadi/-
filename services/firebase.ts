// @ts-ignore
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// إعدادات Firebase الخاصة بمشروعك (sheet-time)
const firebaseConfig = {
  apiKey: "AIzaSyAke7tMWpw9jqcEe629IkLgEoSnT8sGnO4",
  authDomain: "sheet-time.firebaseapp.com",
  projectId: "sheet-time",
  storageBucket: "sheet-time.firebasestorage.app",
  messagingSenderId: "287007833480",
  appId: "1:287007833480:web:b4309c2414af47be66ce3d",
  measurementId: "G-R7F1H52FKZ"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// تهيئة قاعدة البيانات (Firestore)
const db = getFirestore(app);

// تهيئة التحليلات (اختياري، يعمل فقط في المتصفح)
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, db, analytics };

// دالة التحقق (ستعود بـ true دائماً الآن لأن الإعدادات موجودة)
export const isFirebaseEnabled = () => true;
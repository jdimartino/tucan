// src/init-admin.js
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Configuración cargada desde variables de entorno
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const adminEmail = process.env.VITE_ADMIN_EMAIL || 'admin@tucan.app';
const adminPass = process.env.VITE_ADMIN_PASSWORD || 'admin123456';

async function setupAdmin() {
    let user;
    try {
        console.log(`🚀 Intentando crear usuario administrador: ${adminEmail}...`);
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
        user = userCredential.user;
        console.log(`✅ Usuario creado con UID: ${user.uid}`);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log('⚠️ El usuario ya existe en Auth. Intentando iniciar sesión...');
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPass);
            user = userCredential.user;
            console.log(`✅ Sesión iniciada para UID: ${user.uid}`);
        } else {
            throw error;
        }
    }

    console.log(`📝 Creando/actualizando documento en Firestore: users/${user.uid}...`);
    await setDoc(doc(db, 'users', user.uid), {
        name: "Administrador Inicial",
        role: "admin",
        active: true,
        updatedAt: new Date().toISOString()
    });

    console.log('🎉 ¡Configuración completada con éxito!');
    console.log('\nCredenciales de prueba:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPass}`);
    process.exit(0);
}

setupAdmin();

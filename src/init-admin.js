// src/init-admin.js
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Configuración cargada desde el archivo src/firebase.js (copiada aquí para independencia del script)
const firebaseConfig = {
    apiKey: "AIzaSyAHjMaLrQbF8uV8bj2aT1kKDmQbEiBfNDM",
    authDomain: "tucanapp-pos.firebaseapp.com",
    projectId: "tucanapp-pos",
    storageBucket: "tucanapp-pos.firebasestorage.app",
    messagingSenderId: "833846886165",
    appId: "1:833846886165:web:28746819de42fbddd1331c",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const adminEmail = 'admin@tucan.app';
const adminPass = 'admin123456'; // Cambiar después del primer login

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

// src/firebase.js — TucanApp POS
// Proyecto: tucanapp-pos · Configuración real

import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
    apiKey: "AIzaSyAHjMaLrQbF8uV8bj2aT1kKDmQbEiBfNDM",
    authDomain: "tucanapp-pos.firebaseapp.com",
    projectId: "tucanapp-pos",
    storageBucket: "tucanapp-pos.firebasestorage.app",
    messagingSenderId: "833846886165",
    appId: "1:833846886165:web:28746819de42fbddd1331c",
    measurementId: "G-SF5LVN3XWX",
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)

// Persistencia offline (Firestore offline-first)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore offline: múltiples pestañas abiertas')
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore offline: navegador no soportado')
    }
})

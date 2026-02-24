// src/services/userService.js
import {
    doc, setDoc, updateDoc, serverTimestamp, collection,
} from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { db } from '../firebase'

export async function createCashier({ name, email, password }) {
    const auth = getAuth()
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        email,
        role: 'cashier',
        active: true,
        createdAt: serverTimestamp(),
    })
    return cred.user
}

export async function toggleUser(uid, active) {
    return updateDoc(doc(db, 'users', uid), { active, updatedAt: serverTimestamp() })
}

export async function updateUserName(uid, name) {
    return updateDoc(doc(db, 'users', uid), { name, updatedAt: serverTimestamp() })
}

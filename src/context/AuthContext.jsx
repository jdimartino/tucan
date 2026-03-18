// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [role, setRole] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Obtener rol desde Firestore
                const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
                setUser(firebaseUser)
                const rawRole = snap.exists() ? snap.data().role : null
                setRole(rawRole === 'admin' || rawRole === 'cashier' ? rawRole : null)
            } else {
                setUser(null)
                setRole(null)
            }
            setLoading(false)
        })
        return unsub
    }, [])

    return (
        <AuthContext.Provider value={{ user, role, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)

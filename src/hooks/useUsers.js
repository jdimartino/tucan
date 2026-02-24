// src/hooks/useUsers.js
import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

export function useUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('name'))
        const unsub = onSnapshot(q, (snap) => {
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            setLoading(false)
        })
        return unsub
    }, [])

    return { users, loading }
}

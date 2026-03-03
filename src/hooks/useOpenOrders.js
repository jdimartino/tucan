// src/hooks/useOpenOrders.js
import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Escucha en tiempo real todas las órdenes con status 'open' de la sesión activa.
 */
export function useOpenOrders(sessionId) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!sessionId) {
            setOrders([])
            setLoading(false)
            return
        }
        const q = query(
            collection(db, 'orders'),
            where('sessionId', '==', sessionId),
            where('status', '==', 'open')
        )
        const unsub = onSnapshot(q, snap => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            // Ordenar por createdAt más reciente primero
            docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            setOrders(docs)
            setLoading(false)
        })
        return unsub
    }, [sessionId])

    return { orders, loading }
}

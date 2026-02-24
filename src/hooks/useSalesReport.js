// src/hooks/useSalesReport.js
// Consulta las órdenes de una sesión específica en tiempo real
import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export function useSalesReport(sessionId) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!sessionId) { setLoading(false); return }

        const q = query(
            collection(db, 'orders'),
            where('sessionId', '==', sessionId),
            where('status', '==', 'paid'),
            orderBy('createdAt', 'desc')
        )

        const unsub = onSnapshot(q, (snap) => {
            setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            setLoading(false)
        })
        return unsub
    }, [sessionId])

    // Totales calculados
    const totalCents = orders.reduce((s, o) => s + (o.totalCents || 0), 0)
    const totalUSD = totalCents / 100
    const totalTx = orders.length

    return { orders, loading, totalCents, totalUSD, totalTx }
}

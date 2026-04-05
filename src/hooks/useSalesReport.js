// src/hooks/useSalesReport.js
// Consulta las órdenes de una sesión específica en tiempo real
import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore'
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

        const unsub = onSnapshot(q, async (snap) => {
            const rawOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }))

            // Para órdenes sin paymentMethod en el doc principal (creadas antes del fix),
            // leer la subcollección payments/p1
            const enriched = await Promise.all(rawOrders.map(async (o) => {
                // Leer subcol si falta paymentMethod (orden antigua) o si es mixto (necesitamos paidUSD/paidBS)
                const needsSubcol = !o.paymentMethod || o.paymentMethod === 'mixed'
                if (!needsSubcol) return o
                const paySnap = await getDocs(collection(db, 'orders', o.id, 'payments'))
                const payData = paySnap.docs[0]?.data()
                return { ...o, paymentMethod: o.paymentMethod || payData?.method, paymentData: payData }
            }))

            setOrders(enriched)
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

// src/hooks/useHistoricalReport.js
import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export function useHistoricalReport(dateFromStr, dateToStr) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(false)
    const [productTotals, setProductTotals] = useState([])

    useEffect(() => {
        if (!dateFromStr || !dateToStr) {
            setOrders([])
            setProductTotals([])
            setLoading(false)
            return
        }

        const startTs = Timestamp.fromDate(new Date(dateFromStr + 'T00:00:00'))
        const endTs = Timestamp.fromDate(new Date(dateToStr + 'T23:59:59'))

        setLoading(true)

        const q = query(
            collection(db, 'orders'),
            where('status', '==', 'paid'),
            where('createdAt', '>=', startTs),
            where('createdAt', '<=', endTs),
            orderBy('createdAt', 'desc')
        )

        getDocs(q)
            .then(async (snap) => {
                const rawOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }))

                const enriched = await Promise.all(rawOrders.map(async (o) => {
                    const needsSubcol = !o.paymentMethod || o.paymentMethod === 'mixed'
                    if (!needsSubcol) return { ...o, paymentData: null }
                    const paySnap = await getDocs(collection(db, 'orders', o.id, 'payments'))
                    const payData = paySnap.docs[0]?.data()
                    return { ...o, paymentMethod: o.paymentMethod || payData?.method, paymentData: payData }
                }))

                setOrders(enriched)

                // Leer items de todas las órdenes y agregar por producto
                const totalsMap = {}
                await Promise.all(rawOrders.map(async (o) => {
                    const itemsSnap = await getDocs(collection(db, 'orders', o.id, 'items'))
                    itemsSnap.docs.forEach(d => {
                        const item = d.data()
                        const id = d.id
                        if (!totalsMap[id]) totalsMap[id] = { name: item.name, emoji: item.emoji, qty: 0, totalCents: 0 }
                        totalsMap[id].qty += item.qty
                        totalsMap[id].totalCents += item.subtotalCents
                    })
                }))

                const sorted = Object.entries(totalsMap)
                    .map(([id, val]) => ({ id, ...val }))
                    .sort((a, b) => b.totalCents - a.totalCents)

                setProductTotals(sorted)
                setLoading(false)
            })
            .catch(err => {
                console.error('Historical report error:', err)
                setLoading(false)
            })
    }, [dateFromStr, dateToStr])

    const totalCents = orders.reduce((s, o) => s + (o.totalCents || 0), 0)
    const totalTx = orders.length

    return { orders, loading, totalCents, totalTx, productTotals }
}

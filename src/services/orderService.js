// src/services/orderService.js
import {
    collection, addDoc, doc, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Guarda una orden completa en Firestore.
 * Estructura: orders/{id} + subcol items/{} + subcol payments/{}
 */
export async function saveOrder({ cashierId, sessionId, exchangeRateBs, items, payment }) {
    // 1. Crear doc principal de la orden
    const orderRef = await addDoc(collection(db, 'orders'), {
        cashierId,
        sessionId,
        rateAtTime: exchangeRateBs,
        status: 'paid',
        mode: 'fast',
        totalCents: items.reduce((s, i) => s + i.subtotalCents, 0),
        createdAt: serverTimestamp(),
    })

    // 2. Guardar cada ítem en subcol
    for (const item of items) {
        await setDoc(doc(db, 'orders', orderRef.id, 'items', item.productId), {
            name: item.name,
            emoji: item.emoji,
            qty: item.qty,
            unitPriceCents: item.unitPriceCents,
            subtotalCents: item.subtotalCents,
        })
    }

    // 3. Guardar el pago en subcol
    await setDoc(doc(db, 'orders', orderRef.id, 'payments', 'p1'), {
        ...payment,
        createdAt: serverTimestamp(),
    })

    return orderRef.id
}

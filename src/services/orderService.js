// src/services/orderService.js
import {
    collection, addDoc, doc, setDoc, updateDoc,
    serverTimestamp, query, where, getDocs, getDoc,
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

/**
 * Guarda una Factura en Espera (cuenta abierta) en Firestore.
 * mode: 'tab' / status: 'open'
 */
export async function saveHoldOrder({ cashierId, sessionId, exchangeRateBs, items, client }) {
    const orderRef = await addDoc(collection(db, 'orders'), {
        cashierId,
        sessionId,
        rateAtTime: exchangeRateBs,
        status: 'open',
        mode: 'tab',
        client: { name: client.name.trim(), phone: client.phone.trim() },
        totalCents: items.reduce((s, i) => s + i.subtotalCents, 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    for (const item of items) {
        await setDoc(doc(db, 'orders', orderRef.id, 'items', item.productId), {
            name: item.name,
            emoji: item.emoji,
            qty: item.qty,
            unitPriceCents: item.unitPriceCents,
            subtotalCents: item.subtotalCents,
        })
    }

    return orderRef.id
}

/**
 * Obtiene las órdenes abiertas (status: 'open') de una sesión.
 */
export async function getOpenOrders(sessionId) {
    const q = query(
        collection(db, 'orders'),
        where('sessionId', '==', sessionId),
        where('status', '==', 'open')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Retoma una orden en espera:
 * 1. Marca la orden como 'processing'
 * 2. Lee los ítems de la subcol y los devuelve para cargarlos en el carrito
 */
export async function reopenOrder(orderId) {
    // 1. Marcar como processing para evitar doble retoma
    await updateDoc(doc(db, 'orders', orderId), {
        status: 'processing',
        updatedAt: serverTimestamp(),
    })
    // 2. Leer items
    const itemsSnap = await getDocs(collection(db, 'orders', orderId, 'items'))
    return itemsSnap.docs.map(d => ({ productId: d.id, ...d.data() }))
}

/**
 * Cancela una orden en espera.
 */
export async function cancelHoldOrder(orderId) {
    return updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
    })
}

/**
 * Anexa ítems a una cuenta en espera existente.
 */
export async function appendHoldOrder(orderId, items) {
    // 1. Obtener la orden actual para actualizar el total
    const orderRef = doc(db, 'orders', orderId)
    const orderSnap = await getDoc(orderRef)
    if (!orderSnap.exists()) throw new Error('La orden no existe')

    const currentTotal = orderSnap.data().totalCents || 0
    const newItemsTotal = items.reduce((s, i) => s + i.subtotalCents, 0)

    // 2. Actualizar el doc principal
    await updateDoc(orderRef, {
        totalCents: currentTotal + newItemsTotal,
        updatedAt: serverTimestamp(),
    })

    // 3. Actualizar o crear los ítems en la subcolección
    for (const item of items) {
        const itemRef = doc(db, 'orders', orderId, 'items', item.productId)
        const itemSnap = await getDoc(itemRef)

        if (itemSnap.exists()) {
            const data = itemSnap.data()
            await updateDoc(itemRef, {
                qty: data.qty + item.qty,
                subtotalCents: data.subtotalCents + item.subtotalCents
            })
        } else {
            await setDoc(itemRef, {
                name: item.name,
                emoji: item.emoji,
                qty: item.qty,
                unitPriceCents: item.unitPriceCents,
                subtotalCents: item.subtotalCents,
            })
        }
    }
}

// src/services/sessionService.js
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export async function updateSessionRate(sessionId, exchangeRateBs) {
    return updateDoc(doc(db, 'sessions', sessionId), {
        exchangeRateBs,
        updatedAt: serverTimestamp(),
    })
}

export async function closeSession(sessionId, totals) {
    return updateDoc(doc(db, 'sessions', sessionId), {
        status: 'closed',
        closedAt: serverTimestamp(),
        totalSales: totals.totalUSD,
        totalTx: totals.totalTx,
    })
}

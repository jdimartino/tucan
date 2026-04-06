import { useEffect, useState } from 'react'
import { collection, query, where, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'

export function useSessionSync() {
    const { user } = useAuth()
    const { session, setSession } = useSession()
    const [recovering, setRecovering] = useState(!session && !!user)

    useEffect(() => {
        if (!user || session) { setRecovering(false); return }

        const q = query(
            collection(db, 'sessions'),
            where('cashierId', '==', user.uid),
            where('status', '==', 'open'),
            limit(1)
        )
        getDocs(q)
            .then((snap) => {
                if (!snap.empty) {
                    const doc = snap.docs[0]
                    const data = doc.data()
                    setSession({ id: doc.id, exchangeRateBs: data.exchangeRateBs, status: 'open' })
                }
            })
            .catch((err) => console.error('Session recovery failed:', err))
            .finally(() => setRecovering(false))
    }, [user?.uid])

    return { recovering }
}

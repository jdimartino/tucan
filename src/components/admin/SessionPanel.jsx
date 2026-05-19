// src/components/admin/SessionPanel.jsx
import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { DEFAULT_USER } from '../../context/AuthContext'
import { useSession } from '../../context/SessionContext'

export default function SessionPanel({ onSessionOpen }) {
    const { session, setSession } = useSession()
    const [opening, setOpening] = useState(false)
    const [error, setError] = useState('')

    const handleOpen = async (e) => {
        e.preventDefault()
        setOpening(true)
        try {
            const ref = await addDoc(collection(db, 'sessions'), {
                cashierId: DEFAULT_USER.uid,
                status: 'open',
                openedAt: serverTimestamp(),
                closedAt: null,
                totalSales: 0,
            })
            setSession({ id: ref.id, status: 'open' })
            onSessionOpen?.()
        } catch (err) {
            setError('Error abriendo caja. Intenta de nuevo.')
            console.error(err)
        } finally {
            setOpening(false)
        }
    }

    if (session?.status === 'open') {
        return (
            <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex items-center gap-4">
                    <div className="text-3xl">✅</div>
                    <div>
                        <p className="text-green-400 font-bold text-lg">Caja Abierta</p>
                        <p className="text-slate-300 text-sm">Sesión activa — lista para facturar</p>
                    </div>
                </div>
                <div className="bg-[#1E293B] rounded-2xl p-5">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">ID de Sesión</p>
                    <p className="text-slate-300 font-mono text-sm break-all">{session.id}</p>
                </div>
                <p className="text-slate-500 text-xs text-center">
                    Ve al panel del cajero para tomar pedidos usando esta sesión.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="bg-[#1E293B] rounded-2xl p-5">
                <h3 className="text-white font-bold text-lg mb-1">🏪 Apertura de Caja</h3>
                <p className="text-slate-400 text-sm mb-5">
                    Inicia la sesión del día para comenzar a facturar.
                </p>
                <form onSubmit={handleOpen} className="space-y-4">
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                    <button type="submit" disabled={opening} className="btn-primary w-full">
                        {opening ? 'Abriendo...' : '🏪 Abrir Caja'}
                    </button>
                </form>
            </div>
        </div>
    )
}

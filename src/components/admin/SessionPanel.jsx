// src/components/admin/SessionPanel.jsx
import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { useSession } from '../../context/SessionContext'

export default function SessionPanel({ onSessionOpen }) {
    const { user } = useAuth()
    const { session, setSession } = useSession()
    const [rate, setRate] = useState('')
    const [opening, setOpening] = useState(false)
    const [error, setError] = useState('')
    const [bcvRate, setBcvRate] = useState(null)
    const [bcvDate, setBcvDate] = useState(null)
    const [bcvLoading, setBcvLoading] = useState(true)

    useEffect(() => {
        fetch('https://ve.dolarapi.com/v1/dolares/oficial')
            .then(r => r.json())
            .then(data => {
                if (data?.promedio) {
                    setBcvRate(data.promedio)
                    setBcvDate(data.modificado ? new Date(data.modificado) : null)
                }
            })
            .catch(() => {})
            .finally(() => setBcvLoading(false))
    }, [])

    const handleOpen = async (e) => {
        e.preventDefault()
        const rateVal = parseFloat(rate)
        if (isNaN(rateVal) || rateVal <= 0) { setError('Ingresa una tasa válida mayor a 0'); return }
        setOpening(true)
        try {
            const ref = await addDoc(collection(db, 'sessions'), {
                cashierId: user.uid,
                exchangeRateBs: rateVal,
                status: 'open',
                openedAt: serverTimestamp(),
                closedAt: null,
                totalSales: 0,
            })
            setSession({ id: ref.id, exchangeRateBs: rateVal, status: 'open' })
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
                        <p className="text-slate-300 text-sm">Tasa del día: <span className="font-bold text-white">Bs {session.exchangeRateBs.toFixed(2)} / $1</span></p>
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
                    Define la tasa de cambio del día antes de comenzar a facturar.
                </p>
                <form onSubmit={handleOpen} className="space-y-4">
                    <div>
                        <label className="label-xs">Tasa BCV del día (Bs / $1)</label>
                        {bcvLoading ? (
                            <p className="text-slate-500 text-xs mb-2">Consultando tasa BCV...</p>
                        ) : bcvRate ? (
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                    BCV: Bs {bcvRate.toFixed(2)} / $1
                                </span>
                                {bcvDate && (
                                    <span className="text-[10px] text-slate-500">
                                        {bcvDate.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setRate(bcvRate.toFixed(2))}
                                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                                >
                                    Usar esta
                                </button>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-xs mb-2">No se pudo obtener la tasa BCV</p>
                        )}
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Bs</span>
                            <input
                                type="number" step="0.01" min="1"
                                value={rate}
                                onChange={e => setRate(e.target.value)}
                                className="input-field pl-10"
                                placeholder="ej. 47.50"
                                required
                            />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                    <button type="submit" disabled={opening} className="btn-primary w-full">
                        {opening ? 'Abriendo...' : '🏪 Abrir Caja'}
                    </button>
                </form>
            </div>
        </div>
    )
}

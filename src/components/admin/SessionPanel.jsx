// src/components/admin/SessionPanel.jsx
import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { DEFAULT_ADMIN_UID } from '../../context/AuthContext'
import { useSession } from '../../context/SessionContext'
import { useSalesReport } from '../../hooks/useSalesReport'
import { closeSession, updateSessionRate } from '../../services/sessionService'
import { resetAllOrders } from '../../services/orderService'
import { formatUSD, formatBsNum, fromCents } from '../../utils/money'
import { useToast } from '../Toast'

export default function SessionPanel({ onSessionOpen }) {
    const { session, setSession } = useSession()
    const { orders, loading, totalUSD, totalTx } = useSalesReport(session?.id)
    const toast = useToast()
    const [rate, setRate] = useState('')
    const [opening, setOpening] = useState(false)
    const [error, setError] = useState('')
    const [bcvRate, setBcvRate] = useState(null)
    const [bcvDate, setBcvDate] = useState(null)
    const [bcvLoading, setBcvLoading] = useState(true)
    const [closing, setClosing] = useState(false)
    const [confirm, setConfirm] = useState(false)
    const [newRate, setNewRate] = useState('')
    const [updating, setUpdating] = useState(false)
    const [confirmReset, setConfirmReset] = useState(false)
    const [resetting, setResetting] = useState(false)

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
                cashierId: DEFAULT_ADMIN_UID,
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

    const handleUpdateRate = async () => {
        const val = parseFloat(newRate)
        if (isNaN(val) || val <= 0) return
        setUpdating(true)
        try {
            await updateSessionRate(session.id, val)
            setSession(s => ({ ...s, exchangeRateBs: val }))
            setNewRate('')
            toast.success('Tasa actualizada')
        } catch (err) {
            console.error(err)
            toast.error('Error actualizando la tasa.')
        } finally {
            setUpdating(false)
        }
    }

    const handleClose = async () => {
        setClosing(true)
        try {
            await closeSession(session.id, { totalUSD, totalTx })
            setSession(null)
            toast.success('Caja cerrada correctamente')
        } catch (err) {
            console.error(err)
            toast.error('Error cerrando caja. Intenta de nuevo.')
        } finally {
            setClosing(false)
            setConfirm(false)
        }
    }

    const handleReset = async () => {
        if (!window.confirm('⚠️ ¿Estás seguro? Se borrarán TODAS las facturas y el contador se reiniciará a #0001. Los productos, precios, métodos de pago y configuraciones se conservan.\n\nEsta acción NO se puede deshacer.')) return
        if (!window.confirm('Confirmación final: ¿Estás ABSOLUTAMENTE seguro? Las órdenes eliminadas NO se pueden recuperar.')) return
        setResetting(true)
        try {
            const count = await resetAllOrders()
            setSession(null)
            toast.success(`✅ Reset completo. Se eliminaron ${count} órdenes y el contador se reinició a #0001.`)
        } catch (err) {
            console.error(err)
            toast.error('Error al resetear. Revisa la consola.')
        } finally {
            setResetting(false)
            setConfirmReset(false)
        }
    }

    const byMethod = orders.reduce((acc, o) => {
        const m = o.paymentMethod || 'unknown'
        acc[m] = (acc[m] || 0) + (o.totalCents || 0)
        return acc
    }, {})

    const METHOD_LABELS = {
        usd_cash: '💵 Efectivo USD',
        bs_cash: '💴 Efectivo BS',
        pago_movil: '📲 Pago Móvil',
        mixed: '🔀 Mixto',
        pos: '💳 Punto de Venta',
        unknown: '❓ Sin método',
    }

    if (session?.status === 'open') {
        return (
            <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex items-center gap-4">
                    <div className="text-3xl">✅</div>
                    <div>
                        <p className="text-green-400 font-bold text-lg">Caja Abierta</p>
                        <p className="text-slate-300 text-sm">
                            Tasa: <span className="font-bold text-white">Bs {session.exchangeRateBs.toFixed(2)} / $1</span>
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="bg-[#1E293B] rounded-2xl p-4 space-y-3 border border-white/5">
                        <p className="text-white font-bold text-sm">📊 Reporte del Día</p>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#0F172A] rounded-xl p-3 text-center">
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Total Ventas</p>
                                <p className="text-blue-400 font-extrabold text-lg">{formatUSD(totalUSD * 100)}</p>
                            </div>
                            <div className="bg-[#0F172A] rounded-xl p-3 text-center">
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Transacciones</p>
                                <p className="text-white font-extrabold text-lg">{totalTx}</p>
                            </div>
                        </div>

                        {Object.keys(byMethod).length > 0 && (
                            <div className="space-y-1">
                                {Object.entries(byMethod).map(([m, cents]) => {
                                    const bs = fromCents(cents) * session.exchangeRateBs
                                    return (
                                        <div key={m} className="flex justify-between text-xs">
                                            <span className="text-slate-400">{METHOD_LABELS[m] || m}</span>
                                            <span className="text-blue-400 font-bold">{formatUSD(cents)} <span className="text-amber-400 font-semibold">≈ Bs {formatBsNum(bs)}</span></span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        <div className="bg-[#0F172A] rounded-xl p-4 space-y-2">
                            <p className="text-white font-bold text-xs">
                                Actualizar Tasa
                                {bcvRate ? (
                                    <span className="ml-2 text-emerald-400/70 font-normal">
                                        BCV: Bs {bcvRate.toFixed(2)}/$
                                    </span>
                                ) : (
                                    <span className="ml-2 text-slate-500 font-normal">
                                        (sin tasa BCV)
                                    </span>
                                )}
                            </p>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Bs</span>
                                    <input
                                        type="number" step="0.01" min="1"
                                        value={newRate}
                                        onChange={e => setNewRate(e.target.value)}
                                        className="input-field pl-10"
                                        placeholder={session.exchangeRateBs.toFixed(2)}
                                    />
                                </div>
                                <button
                                    onClick={handleUpdateRate}
                                    disabled={updating || !newRate}
                                    className="btn-primary whitespace-nowrap disabled:opacity-40"
                                >
                                    {updating ? '...' : 'Actualizar'}
                                </button>
                            </div>
                        </div>

                        {!confirm ? (
                            <button onClick={() => setConfirm(true)} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-colors mt-1 text-sm">
                                🏁 Cerrar Caja
                            </button>
                        ) : (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 space-y-3" role="dialog" aria-label="Confirmar cierre de caja">
                                <p className="text-orange-400 font-bold text-center text-sm">¿Confirmar cierre de caja?</p>
                                <p className="text-slate-400 text-xs text-center">
                                    Se registrará un total de <span className="text-white font-bold">{formatUSD(totalUSD * 100)}</span> en {totalTx} transacciones.
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setConfirm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleClose}
                                        disabled={closing}
                                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm"
                                    >
                                        {closing ? 'Cerrando...' : 'Confirmar Cierre'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Reset total — temporal */}
                        <div className="border-t border-white/5 pt-4 mt-4">
                            <button
                                onClick={handleReset}
                                disabled={resetting}
                                className="w-full bg-red-600/15 hover:bg-red-600/25 border border-red-500/25 text-red-400 font-bold py-3 rounded-xl transition-all text-sm disabled:opacity-40"
                            >
                                {resetting ? 'Reseteando...' : '🗑️ Poner todo en cero'}
                            </button>
                        </div>
                    </div>
                )}
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

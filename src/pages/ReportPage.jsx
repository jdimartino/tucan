// src/pages/ReportPage.jsx
// Reporte del día al cierre de caja
import { useSession } from '../context/SessionContext'
import { useSalesReport } from '../hooks/useSalesReport'
import { closeSession } from '../services/sessionService'
import { formatUSD, fromCents } from '../utils/money'
import { useState } from 'react'

export default function ReportPage({ onBack }) {
    const { session, setSession } = useSession()
    const { orders, loading, totalUSD, totalTx } = useSalesReport(session?.id)
    const [closing, setClosing] = useState(false)
    const [confirm, setConfirm] = useState(false)
    const [closed, setClosed] = useState(false)

    const rate = session?.exchangeRateBs || 1

    // Desglose por método de pago
    const byMethod = orders.reduce((acc, o) => {
        const m = o?.payment?.method || 'unknown'
        acc[m] = (acc[m] || 0) + (o.totalCents || 0)
        return acc
    }, {})

    const METHOD_LABELS = {
        usd_cash: '💵 Efectivo USD',
        bs_cash: '💴 Efectivo BS',
        transfer: '📲 Transferencia',
        mixed: '🔀 Mixto',
        unknown: '❓ Sin método',
    }

    const handleClose = async () => {
        setClosing(true)
        try {
            await closeSession(session.id, { totalUSD, totalTx })
            setSession(null) // Limpiar sesión (localStorage también)
            setClosed(true)
        } catch (err) {
            console.error(err)
            alert('Error cerrando caja. Intenta de nuevo.')
        } finally {
            setClosing(false)
            setConfirm(false)
        }
    }

    if (closed) {
        return (
            <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-3">🏁</div>
                    <h3 className="text-white font-bold text-lg mb-1">Caja Cerrada</h3>
                    <p className="text-slate-400 text-sm">El reporte del día fue guardado en Firestore.</p>
                    <p className="text-blue-400 font-extrabold text-2xl mt-4">{formatUSD(totalUSD * 100)}</p>
                    <p className="text-slate-400 text-xs mt-1">{totalTx} transacciones</p>
                </div>
                <button onClick={onBack} className="btn-secondary w-full">← Volver al Panel</button>
            </div>
        )
    }

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="space-y-4">

            {/* Resumen principal */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1E293B] rounded-2xl p-4 text-center border border-white/5">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Ventas</p>
                    <p className="text-blue-400 font-extrabold text-2xl">{formatUSD(totalUSD * 100)}</p>
                    <p className="text-slate-500 text-xs mt-0.5">Bs {(totalUSD * rate).toFixed(2)}</p>
                </div>
                <div className="bg-[#1E293B] rounded-2xl p-4 text-center border border-white/5">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Transacciones</p>
                    <p className="text-white font-extrabold text-2xl">{totalTx}</p>
                    <p className="text-slate-500 text-xs mt-0.5">órdenes pagadas</p>
                </div>
            </div>

            {/* Tasa del día */}
            <div className="bg-[#1E293B] rounded-2xl px-4 py-3 flex items-center justify-between border border-white/5">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tasa del Día</p>
                <p className="text-white font-bold">Bs {rate} / $1</p>
            </div>

            {/* Desglose por método */}
            {Object.keys(byMethod).length > 0 && (
                <div>
                    <p className="label-xs mb-2">Desglose por Método</p>
                    <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-white/5">
                        {Object.entries(byMethod).map(([m, cents], i, arr) => (
                            <div key={m} className={`flex justify-between items-center px-4 py-3 ${i < arr.length - 1 ? 'border-b border-white/5' : ''}`}>
                                <p className="text-slate-300 text-sm">{METHOD_LABELS[m] || m}</p>
                                <p className="text-blue-400 font-bold text-sm">{formatUSD(cents)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Historial de órdenes */}
            {orders.length > 0 && (
                <div>
                    <p className="label-xs mb-2">Órdenes del Día ({orders.length})</p>
                    <div className="space-y-2">
                        {orders.map((o, i) => (
                            <div key={o.id} className="bg-[#1E293B] rounded-xl px-4 py-2.5 flex items-center justify-between border border-white/5">
                                <div>
                                    <p className="text-white text-xs font-semibold font-mono">#{o.id.slice(0, 8)}</p>
                                    <p className="text-slate-500 text-[10px]">{METHOD_LABELS[o?.payment?.method] || 'N/A'}</p>
                                </div>
                                <p className="text-blue-400 font-bold text-sm">{formatUSD(o.totalCents || 0)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {orders.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-sm">Sin ventas en esta sesión</p>
                </div>
            )}

            {/* Botón cerrar caja */}
            {!confirm ? (
                <button onClick={() => setConfirm(true)} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-colors mt-2">
                    🏁 Cerrar Caja
                </button>
            ) : (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 space-y-3">
                    <p className="text-orange-400 font-bold text-center text-sm">¿Confirmar cierre de caja?</p>
                    <p className="text-slate-400 text-xs text-center">Se registrará un total de <span className="text-white font-bold">{formatUSD(totalUSD * 100)}</span> en {totalTx} transacciones.</p>
                    <div className="flex gap-2">
                        <button onClick={() => setConfirm(false)} className="btn-secondary flex-1">Cancelar</button>
                        <button
                            onClick={handleClose}
                            disabled={closing}
                            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                        >
                            {closing ? 'Cerrando...' : 'Confirmar Cierre'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

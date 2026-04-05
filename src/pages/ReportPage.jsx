// src/pages/ReportPage.jsx
// Reporte del día al cierre de caja
import { useSession } from '../context/SessionContext'
import { useSalesReport } from '../hooks/useSalesReport'
import { closeSession } from '../services/sessionService'
import { formatUSD, formatBsNum, fromCents } from '../utils/money'
import { useState } from 'react'
import { useToast } from '../components/Toast'
import { getOrderItems } from '../services/orderService'

export default function ReportPage({ onBack }) {
    const { session, setSession } = useSession()
    const { orders, loading, totalUSD, totalTx } = useSalesReport(session?.id)
    const toast = useToast()
    const [closing, setClosing] = useState(false)
    const [confirm, setConfirm] = useState(false)
    const [closed, setClosed] = useState(false)
    const [expandedOrderId, setExpandedOrderId] = useState(null)
    const [orderItems, setOrderItems] = useState({})
    const [expandedMethod, setExpandedMethod] = useState(null)

    const rate = session?.exchangeRateBs || 1

    // Desglose por método de pago
    const byMethod = orders.reduce((acc, o) => {
        const m = o.paymentMethod || 'unknown'
        acc[m] = (acc[m] || 0) + (o.totalCents || 0)
        return acc
    }, {})

    // Sumatoria Mixto
    const mixedOrders = orders.filter(o => o.paymentMethod === 'mixed')
    const mixedUSD = mixedOrders.reduce((s, o) => s + (o.paymentData?.paidUSD || 0), 0)
    const mixedBS  = mixedOrders.reduce((s, o) => s + (o.paymentData?.paidBS  || 0), 0)

    // Total BS Pago Móvil
    const pagoMovilBS = orders
        .filter(o => o.paymentMethod === 'pago_movil')
        .reduce((s, o) => s + fromCents(o.totalCents) * (o.rateAtTime || rate), 0)

    const handleExpandOrder = async (orderId) => {
        if (expandedOrderId === orderId) { setExpandedOrderId(null); return }
        setExpandedOrderId(orderId)
        if (!orderItems[orderId]) {
            const items = await getOrderItems(orderId)
            setOrderItems(prev => ({ ...prev, [orderId]: items }))
        }
    }

    const METHOD_LABELS = {
        usd_cash: '💵 Efectivo USD',
        bs_cash: '💴 Efectivo BS',
        pago_movil: '📲 Pago Móvil',
        mixed: '🔀 Mixto',
        unknown: '❓ Sin método',
    }

    const handleClose = async () => {
        setClosing(true)
        try {
            await closeSession(session.id, { totalUSD, totalTx })
            setSession(null)
            setClosed(true)
            toast.success('Caja cerrada correctamente')
        } catch (err) {
            console.error(err)
            toast.error('Error cerrando caja. Intenta de nuevo.')
        } finally {
            setClosing(false)
            setConfirm(false)
        }
    }

    const handleShareWhatsApp = () => {
        const date = new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })
        const methodLines = Object.entries(byMethod)
            .map(([m, cents]) => `  ${METHOD_LABELS[m] || m} — ${formatUSD(cents)}`)
            .join('\n')
        const orderLines = orders
            .map(o => {
                const num = o.invoiceNumber != null ? `#${String(o.invoiceNumber).padStart(4, '0')}` : `#${o.id.slice(0, 6)}`
                const time = o.createdAt?.seconds
                    ? new Date(o.createdAt.seconds * 1000).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
                    : ''
                return `  ${num} ${time} — ${formatUSD(o.totalCents || 0)}`
            })
            .join('\n')
        const msg = [
            `🦜 *TucanApp — Reporte del Día*`,
            `📅 ${date}`,
            ``,
            `💵 *Total Ventas: ${formatUSD(totalUSD * 100)}*`,
            `💴 Bs ${(totalUSD * rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            `📊 Transacciones: ${totalTx}`,
            ``,
            `*Desglose por método:*`,
            methodLines,
            ``,
            `*Órdenes:*`,
            orderLines,
            ``,
            `Tasa del día: Bs ${rate} / $1`,
        ].join('\n')
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
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
                    <p className="text-slate-500 text-xs mt-0.5">Bs {formatBsNum(totalUSD * rate)}</p>
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
                        {Object.entries(byMethod).map(([m, cents], i, arr) => {
                            const hasDetail = m === 'mixed' || m === 'pago_movil'
                            const isExpanded = expandedMethod === m
                            return (
                                <div key={m} className={i < arr.length - 1 ? 'border-b border-white/5' : ''}>
                                    <div
                                        className={`flex justify-between items-center px-4 py-3 ${hasDetail ? 'cursor-pointer' : ''}`}
                                        onClick={() => hasDetail && setExpandedMethod(isExpanded ? null : m)}
                                    >
                                        <p className="text-slate-300 text-sm">{METHOD_LABELS[m] || m}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-blue-400 font-bold text-sm">{formatUSD(cents)}</p>
                                            {hasDetail && <span className="text-slate-600 text-xs">{isExpanded ? '▲' : '▼'}</span>}
                                        </div>
                                    </div>
                                    {isExpanded && m === 'mixed' && (
                                        <div className="px-4 pb-3 space-y-1 border-t border-white/5 pt-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">💵 USD recibido</span>
                                                <span className="text-slate-300 font-bold">${mixedUSD.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">💴 BS recibido</span>
                                                <span className="text-amber-400 font-bold">Bs {formatBsNum(mixedBS)}</span>
                                            </div>
                                        </div>
                                    )}
                                    {isExpanded && m === 'pago_movil' && (
                                        <div className="px-4 pb-3 border-t border-white/5 pt-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">💴 Total en BS</span>
                                                <span className="text-amber-400 font-bold">Bs {formatBsNum(pagoMovilBS)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Historial de órdenes */}
            {orders.length > 0 && (
                <div>
                    <p className="label-xs mb-2">Órdenes del Día ({orders.length})</p>
                    <div className="space-y-2">
                        {orders.map((o) => (
                            <div key={o.id} className="bg-[#1E293B] rounded-xl border border-white/5 overflow-hidden">
                                <div
                                    className="px-4 py-2.5 flex items-center justify-between cursor-pointer"
                                    onClick={() => handleExpandOrder(o.id)}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-white text-xs font-semibold font-mono">
                                                {o.invoiceNumber != null ? `#${String(o.invoiceNumber).padStart(4, '0')}` : `#${o.id.slice(0, 6)}`}
                                            </p>
                                            {o.createdAt?.seconds && (
                                                <p className="text-slate-500 text-[10px]">
                                                    {new Date(o.createdAt.seconds * 1000).toLocaleString('es-VE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-slate-500 text-[10px]">{METHOD_LABELS[o.paymentMethod] || 'N/A'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-blue-400 font-bold text-sm">{formatUSD(o.totalCents || 0)}</p>
                                        <span className="text-slate-600 text-xs">{expandedOrderId === o.id ? '▲' : '▼'}</span>
                                    </div>
                                </div>

                                {expandedOrderId === o.id && (
                                    <div className="border-t border-white/5 px-4 py-3 space-y-2">
                                        {/* Cliente (órdenes hold) */}
                                        {o.client && (
                                            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                                <span className="text-slate-400 text-xs">👤 {o.client.name}</span>
                                                {o.client.phone && <span className="text-slate-500 text-xs">📱 {o.client.phone}</span>}
                                            </div>
                                        )}
                                        {/* Ítems */}
                                        {!orderItems[o.id]
                                            ? <p className="text-slate-500 text-xs animate-pulse">Cargando...</p>
                                            : orderItems[o.id].map(item => (
                                                <div key={item.productId} className="flex justify-between text-xs">
                                                    <span className="text-slate-300">
                                                        {item.emoji} {item.name}
                                                        <span className="text-slate-500 ml-1">x{item.qty}</span>
                                                    </span>
                                                    <span className="text-blue-400 font-bold">{formatUSD(item.subtotalCents)}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
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

            {/* Botón compartir WhatsApp */}
            <button
                onClick={handleShareWhatsApp}
                className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
                📲 Compartir por WhatsApp
            </button>

            {/* Botón cerrar caja */}
            {!confirm ? (
                <button onClick={() => setConfirm(true)} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-colors mt-2">
                    🏁 Cerrar Caja
                </button>
            ) : (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 space-y-3" role="dialog" aria-label="Confirmar cierre de caja">
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

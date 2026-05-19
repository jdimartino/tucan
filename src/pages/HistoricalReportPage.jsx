// src/pages/HistoricalReportPage.jsx
// Reporte histórico por período de fechas
import { useState } from 'react'
import { useHistoricalReport } from '../hooks/useHistoricalReport'
import { formatBs } from '../utils/money'
import { getOrderItems } from '../services/orderService'

function todayStr() {
    const d = new Date()
    return d.toISOString().slice(0, 10)
}

function firstDayOfMonthStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const METHOD_LABELS = {
    bs_cash:    '💴 Efectivo Bs.',
    transfer:   '📲 Pago Móvil',
    pos_term:   '💳 Punto de Venta',
    usd_cash:   '💵 Efectivo USD',
    mixed:      '🔀 Combinado',
    unknown:    '❓ Sin método',
}

export default function HistoricalReportPage() {
    const [dateFrom, setDateFrom] = useState(firstDayOfMonthStr())
    const [dateTo, setDateTo] = useState(todayStr())

    const { orders, loading, totalTx, productTotals } = useHistoricalReport(dateFrom, dateTo)
    const totalCentsSum = orders.reduce((s, o) => s + (o.totalCents || 0), 0)

    const [expandedOrderId, setExpandedOrderId] = useState(null)
    const [orderItems, setOrderItems] = useState({})
    const [expandedMethod, setExpandedMethod] = useState(null)

    const byMethod = orders.reduce((acc, o) => {
        const m = o.paymentMethod || 'unknown'
        acc[m] = (acc[m] || 0) + (o.totalCents || 0)
        return acc
    }, {})

    const handleExpandOrder = async (orderId) => {
        if (expandedOrderId === orderId) { setExpandedOrderId(null); return }
        setExpandedOrderId(orderId)
        if (!orderItems[orderId]) {
            const items = await getOrderItems(orderId)
            setOrderItems(prev => ({ ...prev, [orderId]: items }))
        }
    }

    const handleShareWhatsApp = () => {
        const dateLabel = `${new Date(dateFrom).toLocaleDateString('es-VE', { day: 'numeric', month: 'long' })} al ${new Date(dateTo).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}`
        const methodLines = Object.entries(byMethod)
            .map(([m, cents]) => `  ${METHOD_LABELS[m] || m} — ${formatBs(cents)}`)
            .join('\n')
        const orderLines = orders
            .map(o => {
                const num = o.invoiceNumber != null ? `#${String(o.invoiceNumber).padStart(4, '0')}` : `#${o.id.slice(0, 6)}`
                const time = o.createdAt?.seconds
                    ? new Date(o.createdAt.seconds * 1000).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
                    : ''
                return `  ${num} ${time} — ${formatBs(o.totalCents || 0)}`
            })
            .join('\n')
        const msg = [
            `🐷 *Los 3 Cochinitos — Reporte Histórico*`,
            `📅 ${dateLabel}`,
            ``,
            `💵 *Total Ventas: ${formatBs(totalCentsSum)}*`,
            `📊 Transacciones: ${totalTx}`,
            ``,
            `*Desglose por método:*`,
            methodLines,
            ``,
            `*Órdenes:*`,
            orderLines,
        ].join('\n')
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    }

    return (
        <div className="space-y-4">
            {/* Selector de fechas */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="label-xs">Desde</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="input-field"
                    />
                </div>
                <div>
                    <label className="label-xs">Hasta</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="input-field"
                    />
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {!loading && (
                <>
                    {/* Resumen principal */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#1E293B] rounded-2xl p-4 text-center border border-white/5">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Ventas</p>
                            <p className="text-blue-400 font-extrabold text-2xl">{formatBs(totalCentsSum)}</p>
                        </div>
                        <div className="bg-[#1E293B] rounded-2xl p-4 text-center border border-white/5">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Transacciones</p>
                            <p className="text-white font-extrabold text-2xl">{totalTx}</p>
                            <p className="text-slate-500 text-xs mt-0.5">órdenes pagadas</p>
                        </div>
                    </div>

                    {/* Desglose por método */}
                    {Object.keys(byMethod).length > 0 && (
                        <div>
                            <p className="label-xs mb-2">Desglose por Método</p>
                            <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-white/5">
                                {Object.entries(byMethod).map(([m, cents], i, arr) => {
                                    const hasDetail = m === 'mixed'
                                    const isExpanded = expandedMethod === m
                                    return (
                                        <div key={m} className={i < arr.length - 1 ? 'border-b border-white/5' : ''}>
                                            <div
                                                className={`flex justify-between items-center px-4 py-3 ${hasDetail ? 'cursor-pointer' : ''}`}
                                                onClick={() => hasDetail && setExpandedMethod(isExpanded ? null : m)}
                                            >
                                                <p className="text-slate-300 text-sm">{METHOD_LABELS[m] || m}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-blue-400 font-bold text-sm">{formatBs(cents)}</p>
                                                    {hasDetail && <span className="text-slate-600 text-xs">{isExpanded ? '▲' : '▼'}</span>}
                                                </div>
                                            </div>
                                            {isExpanded && m === 'mixed' && (
                                                <div className="px-4 pb-3 space-y-1 border-t border-white/5 pt-2">
                                                    {(() => {
                                                        const breakdownTotals = {}
                                                        const labels = { bs_cash: '💴 Efectivo Bs.', transfer: '📲 Pago Móvil', pos_term: '💳 Punto de Venta', usd_cash: '💵 Efectivo USD' }
                                                        orders.filter(o => o.paymentMethod === 'mixed').forEach(o => {
                                                            const bd = o.paymentData?.breakdown
                                                            if (bd) bd.forEach(b => { breakdownTotals[b.method] = (breakdownTotals[b.method] || 0) + b.amountBS })
                                                        })
                                                        return Object.entries(breakdownTotals).map(([method, total]) => (
                                                            <div key={method} className="flex justify-between text-xs">
                                                                <span className="text-slate-400">{labels[method] || method}</span>
                                                                <span className="text-slate-300 font-bold">Bs {total.toFixed(2)}</span>
                                                            </div>
                                                        ))
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Productos vendidos */}
                    {productTotals.length > 0 && (
                        <div>
                            <p className="label-xs mb-2">🥘 Productos Vendidos ({productTotals.length})</p>
                            <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-white/5">
                                {productTotals.map((p, i, arr) => (
                                    <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 ${i < arr.length - 1 ? 'border-b border-white/5' : ''}`}>
                                        <span className="text-base shrink-0">{p.emoji}</span>
                                        <span className="text-xs text-slate-300 flex-1 truncate">{p.name}</span>
                                        <span className="text-xs text-slate-500 font-bold shrink-0">×{p.qty}</span>
                                        <span className="text-xs text-blue-400 font-bold shrink-0 w-20 text-right">{formatBs(p.totalCents)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Órdenes del período */}
                    {orders.length > 0 && (
                        <div>
                            <p className="label-xs mb-2">Órdenes del Período ({orders.length})</p>
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
                                                        <p className="text-slate-500 text-[11px]">
                                                            {new Date(o.createdAt.seconds * 1000).toLocaleString('es-VE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    )}
                                                </div>
                                                <p className="text-slate-500 text-[11px]">{METHOD_LABELS[o.paymentMethod] || 'N/A'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-blue-400 font-bold text-sm">{formatBs(o.totalCents || 0)}</p>
                                                <span className="text-slate-600 text-xs">{expandedOrderId === o.id ? '▲' : '▼'}</span>
                                            </div>
                                        </div>

                                        {expandedOrderId === o.id && (
                                            <div className="border-t border-white/5 px-4 py-3 space-y-2">
                                                {o.client && (
                                                    <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                                        <span className="text-slate-400 text-xs">👤 {o.client.name}</span>
                                                        {o.client.phone && <span className="text-slate-500 text-xs">📱 {o.client.phone}</span>}
                                                    </div>
                                                )}
                                                {!orderItems[o.id]
                                                    ? <p className="text-slate-500 text-xs animate-pulse">Cargando...</p>
                                                    : orderItems[o.id].map(item => (
                                                        <div key={item.productId} className="flex justify-between text-xs">
                                                            <span className="text-slate-300">
                                                                {item.emoji} {item.name}
                                                                <span className="text-slate-500 ml-1">x{item.qty}</span>
                                                            </span>
                                                            <span className="text-blue-400 font-bold">{formatBs(item.subtotalCents)}</span>
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
                            <p className="text-sm">Sin ventas en este período</p>
                        </div>
                    )}

                    {/* Botón compartir WhatsApp */}
                    <button
                        onClick={handleShareWhatsApp}
                        className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        📲 Compartir por WhatsApp
                    </button>
                </>
            )}
        </div>
    )
}

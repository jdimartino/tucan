// src/pages/TicketPage.jsx
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { useSession } from '../context/SessionContext'
import { DEFAULT_ADMIN_UID } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { saveOrder, nextInvoiceNumber, completeHoldOrder } from '../services/orderService'
import { formatUSD, formatBsNum, toCents, fromCents, calcChange } from '../utils/money'
import { useToast } from '../components/Toast'

const METHODS = [
    { id: 'usd_cash', label: 'Efectivo USD', icon: '💵' },
    { id: 'bs_cash', label: 'Efectivo BS', icon: '💴' },
    { id: 'pago_movil', label: 'Pago Móvil', icon: '📲' },
    { id: 'pos', label: 'Punto de Venta', icon: '💳' },
    { id: 'mixed', label: 'Mixto', icon: '🔀' },
]

export default function TicketPage() {
    const { items, totalCents, dispatch } = useCart()
    const { session } = useSession()
    const { setScreen, setOrderId, setLastOrderData, holdOrderId, setHoldOrderId } = useNav()
    const toast = useToast()
    const rate = session?.exchangeRateBs || 1

    const [method, setMethod] = useState('pos')
    const [paid, setPaid] = useState('')
    const [paidBS, setPaidBS] = useState('')
    const [mixedPayments, setMixedPayments] = useState([])
    const [newMixMethod, setNewMixMethod] = useState('')
    const [saving, setSaving] = useState(false)
    const [invoiceNum, setInvoiceNum] = useState(null)
    const [reference, setReference] = useState('')

    useEffect(() => {
        nextInvoiceNumber().then(setInvoiceNum).catch(() => {})
    }, [])

    const totalUSD = useMemo(() => fromCents(totalCents), [totalCents])
    const totalBS = useMemo(() => (totalUSD * rate).toFixed(2), [totalUSD, rate])

    const mixedTotalCovered = useMemo(() => {
        if (method !== 'mixed') return false
        const totalPaid = mixedPayments.reduce((s, mp) => s + (parseFloat(mp.amount) || 0), 0)
        return totalPaid >= parseFloat(totalBS)
    }, [method, mixedPayments, totalBS])

    const mixedRemainingBS = useMemo(() => {
        const totalPaid = mixedPayments.reduce((s, mp) => s + (parseFloat(mp.amount) || 0), 0)
        return Math.max(0, parseFloat(totalBS) - totalPaid)
    }, [method, mixedPayments, totalBS])

    const change = useMemo(() => {
        if (method === 'usd_cash') {
            const paidCents = toCents(parseFloat(paid) || 0)
            const ch = calcChange(paidCents, totalCents)
            return ch > 0 ? { label: 'Vuelto', value: formatUSD(ch) } : null
        }
        if (method === 'bs_cash') {
            const paidBsCents = toCents(parseFloat(paidBS) || 0)
            const totalBsCents = toCents(parseFloat(totalBS))
            const ch = calcChange(paidBsCents, totalBsCents)
            return ch > 0 ? { label: 'Vuelto', value: `Bs ${fromCents(ch).toFixed(2)}` } : null
        }
        return null
    }, [method, paid, paidBS, totalCents, totalBS])

    const handleMethodChange = (newMethod) => {
        setMethod(newMethod)
        if (newMethod !== 'mixed') {
            setMixedPayments([])
            setNewMixMethod('')
        }
    }

    const canPay = useCallback(() => {
        if (!session?.id) return false
        if (method === 'usd_cash') return true
        if (method === 'bs_cash') return true
        if (method === 'pos') return true
        if (method === 'pago_movil') return true
        if (method === 'mixed') return mixedTotalCovered
        return false
    }, [session?.id, method, mixedTotalCovered])

    const handlePay = async () => {
        if (!canPay()) return
        if (!session?.id) {
            toast.error('No hay caja abierta. Pide al administrador que abra la caja del día.')
            return
        }
        setSaving(true)
        try {
            const payment = {
                method,
                totalCents,
                ...(method === 'usd_cash' && { paidUSD: parseFloat(paid) || totalUSD, changeUSD: Math.max(0, (parseFloat(paid) || totalUSD) - totalUSD) }),
                ...(method === 'bs_cash' && { paidBS: parseFloat(paidBS) || parseFloat(totalBS), changeBS: Math.max(0, (parseFloat(paidBS) || parseFloat(totalBS)) - parseFloat(totalBS)) }),
                ...(method === 'pago_movil' && { reference }),
                ...(method === 'mixed' && { mixedPayments }),
                ...(method === 'pos' && { paidBS: parseFloat(totalBS) }),
            }
            const orderId = await saveOrder({
                cashierId: DEFAULT_ADMIN_UID,
                sessionId: session.id,
                exchangeRateBs: rate,
                items,
                payment,
                invoiceNumber: invoiceNum,
            })
            setOrderId(orderId)
            setLastOrderData({
                items: [...items],
                totalCents,
                invoiceNumber: invoiceNum,
                payment: { ...payment },
                exchangeRateBs: rate
            })
            dispatch({ type: 'CLEAR_CART' })
            if (holdOrderId) {
                await completeHoldOrder(holdOrderId)
                setHoldOrderId(null)
            }
            setScreen('success')
        } catch (err) {
            console.error(err)
            toast.error('Error al procesar el pago. Intenta de nuevo.')
        } finally {
            setSaving(false)
        }
    }

    const noSession = !session?.id

    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col pb-32">

            {/* Header */}
            <header className="bg-[#1E293B] border-b border-white/5 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button
                    onClick={() => { setHoldOrderId(null); setScreen('pos') }}
                    aria-label="Volver al POS"
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold text-base px-5 py-3 rounded-xl transition-all"
                >
                    ← Atrás
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-sm leading-none">Ticket de Cobro</p>
                        {invoiceNum != null
                            ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                                #{String(invoiceNum).padStart(4, '0')}
                              </span>
                            : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-500 border border-white/10 animate-pulse">
                                #----
                              </span>
                        }
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{items.length} producto{items.length !== 1 ? 's' : ''}</p>
                    <p className="text-[11px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-flex" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                        Bs {rate}/$
                    </p>
                </div>
                <div className="ml-auto text-right">
                    <p className="text-blue-400 font-extrabold text-lg leading-none">{formatUSD(totalCents)}</p>
                    <p className="text-amber-400 font-bold text-sm">Bs {formatBsNum(parseFloat(totalBS))}</p>
                </div>
            </header>

            <div className="flex-1 px-4 pt-4 space-y-4 pb-28">

                {/* Alerta: sin sesión activa */}
                {noSession && (
                    <div role="alert" className="bg-orange-500/15 border border-orange-500/30 rounded-2xl px-4 py-3 flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <p className="text-orange-400 font-bold text-sm">Sin sesión de caja</p>
                            <p className="text-slate-400 text-xs mt-0.5">El admin debe abrir la caja del día antes de cobrar. Hasta entonces el botón estará bloqueado.</p>
                        </div>
                    </div>
                )}

                {/* Lista de ítems */}
                <div className="bg-[#1E293B] rounded-2xl overflow-hidden">
                    {items.map((item, i) => (
                        <div key={item.productId} className={`flex items-center gap-3 px-4 py-2 ${i < items.length - 1 ? 'border-b border-white/5' : ''}`}>
                            <span className="text-base">{item.emoji}</span>
                            <div className="flex-1">
                                <p className="text-white text-xs font-semibold">{item.name}</p>
                                <p className="text-slate-500 text-[11px]">{item.qty} × {formatUSD(item.unitPriceCents)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-blue-400 font-bold text-xs">{formatUSD(item.subtotalCents)}</p>
                                <p className="text-amber-400 font-bold text-[11px]">Bs {formatBsNum(fromCents(item.subtotalCents) * rate)}</p>
                            </div>
                        </div>
                    ))}
                    {/* Total */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white/5">
                        <p className="text-white font-bold">Total</p>
                        <div className="text-right">
                            <p className="text-blue-400 font-extrabold">{formatUSD(totalCents)}</p>
                            <p className="text-amber-400 font-bold text-sm">Bs {formatBsNum(parseFloat(totalBS))}</p>
                        </div>
                    </div>
                </div>

                {/* Métodos de pago */}
                <fieldset>
                    <legend className="label-xs mb-2">Método de Pago</legend>
                    <div className="grid grid-cols-2 gap-2">
                        {METHODS.map(m => (
                            <button
                                key={m.id}
                                onClick={() => handleMethodChange(m.id)}
                                aria-pressed={method === m.id}
                                className={`flex items-center gap-2 p-3 rounded-xl border font-semibold text-sm transition-all ${method === m.id
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                                    : 'bg-[#1E293B] border-white/5 text-slate-300 hover:border-blue-500/30'
                                    }`}
                            >
                                <span className="text-lg">{m.icon}</span> {m.label}
                            </button>
                        ))}
                    </div>
                </fieldset>

                {/* Input monto recibido */}
                {method === 'usd_cash' && (
                    <div>
                        <label htmlFor="paid-usd" className="label-xs">Monto recibido (USD)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                id="paid-usd"
                                type="number" step="0.01" min={totalUSD}
                                value={paid}
                                onChange={e => setPaid(e.target.value)}
                                className="input-field pl-8"
                                placeholder={totalUSD.toFixed(2)}
                            />
                        </div>
                    </div>
                )}
                {method === 'bs_cash' && (
                    <div>
                        <label htmlFor="paid-bs" className="label-xs">Monto recibido (BS)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Bs</span>
                            <input
                                id="paid-bs"
                                type="number" step="0.01"
                                value={paidBS}
                                onChange={e => setPaidBS(e.target.value)}
                                className="input-field pl-10"
                                placeholder={totalBS}
                            />
                        </div>
                    </div>
                )}
                {method === 'bs_cash' && (
                    <p className="text-center text-slate-400 text-xs">
                        <span className="text-white font-bold text-base">Bs {formatBsNum(parseFloat(totalBS))}</span>
                        <span className="mx-2"> / </span>
                        <span className="text-slate-400">{formatUSD(totalCents)}</span>
                    </p>
                )}
                {method === 'pos' && (
                    <p className="text-center text-slate-400 text-xs">
                        <span className="text-white font-bold text-base">Bs {formatBsNum(parseFloat(totalBS))}</span>
                        <span className="mx-2"> / </span>
                        <span className="text-slate-400">{formatUSD(totalCents)}</span>
                    </p>
                )}

                {method === 'mixed' && (
                    <div className="bg-[#1E293B] rounded-2xl p-4 space-y-3 border border-white/5">
                        <p className="text-slate-400 text-xs font-semibold">Total a cubrir: <span className="text-white font-bold">Bs {formatBsNum(parseFloat(totalBS))}</span></p>
                        {mixedPayments.map((mp, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-lg shrink-0">{
                                    mp.method === 'usd_cash' ? '💵' :
                                    mp.method === 'bs_cash' ? '💴' :
                                    mp.method === 'pago_movil' ? '📲' : '💳'
                                }</span>
                                <span className="text-xs text-slate-300 font-semibold w-24 shrink-0">{
                                    mp.method === 'usd_cash' ? 'Efectivo USD' :
                                    mp.method === 'bs_cash' ? 'Efectivo BS' :
                                    mp.method === 'pago_movil' ? 'Pago Móvil' : 'Punto de Venta'
                                }</span>
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">Bs</span>
                                    <input
                                        type="number" step="0.01" min="0"
                                        value={mp.amount}
                                        onChange={e => {
                                            const next = [...mixedPayments]
                                            next[idx] = { ...next[idx], amount: e.target.value }
                                            setMixedPayments(next)
                                        }}
                                        className="w-full bg-[#0F172A] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                        placeholder="0,00"
                                    />
                                </div>
                                <button
                                    onClick={() => setMixedPayments(prev => prev.filter((_, i) => i !== idx))}
                                    className="shrink-0 text-slate-500 hover:text-red-400 text-lg transition-colors w-8 h-8 flex items-center justify-center"
                                >×</button>
                            </div>
                        ))}
                        <select
                            value={newMixMethod}
                            onChange={e => setNewMixMethod(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        >
                            <option value="">+ Agregar método de pago</option>
                            <option value="usd_cash">💵 Efectivo USD</option>
                            <option value="bs_cash">💴 Efectivo BS</option>
                            <option value="pago_movil">📲 Pago Móvil</option>
                            <option value="pos">💳 Punto de Venta</option>
                        </select>
                        {newMixMethod && (
                            <button
                                onClick={() => {
                                    setMixedPayments(prev => [...prev, { method: newMixMethod, amount: '' }])
                                    setNewMixMethod('')
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                            >Agregar método</button>
                        )}
                        {mixedPayments.length > 0 && (
                            <div className={`rounded-xl px-4 py-3 flex justify-between items-center border ${
                                mixedTotalCovered
                                    ? 'bg-green-500/10 border-green-500/20'
                                    : 'bg-amber-500/10 border-amber-500/20'
                            }`}>
                                <p className={`font-bold text-sm ${mixedTotalCovered ? 'text-green-400' : 'text-amber-400'}`}>
                                    {mixedTotalCovered ? '✅ Total cubierto' : 'Restante'}
                                </p>
                                {!mixedTotalCovered && (
                                    <div className="text-right">
                                        <p className="text-amber-400 font-extrabold">Bs {formatBsNum(mixedRemainingBS)}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Vuelto */}
                {change && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3 flex justify-between items-center">
                        <p className="text-green-400 font-bold text-sm">{change.label}</p>
                        <p className="text-green-400 font-extrabold text-lg">{change.value}</p>
                    </div>
                )}
                {method === 'pago_movil' && (
                    <div>
                        <label htmlFor="pm-ref" className="label-xs">Número de operación</label>
                        <input
                            id="pm-ref"
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            value={reference}
                            onChange={e => setReference(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            className="input-field"
                            placeholder="12345678"
                        />
                    </div>
                )}
                {method === 'pago_movil' && (
                    <p className="text-center text-slate-400 text-xs">
                        <span className="text-white font-bold text-base">Bs {formatBsNum(parseFloat(totalBS))}</span>
                        <span className="mx-2"> / </span>
                        <span className="text-slate-400">{formatUSD(totalCents)}</span>
                    </p>
                )}
            </div>

            {/* Botón Cobrar */}
            <div className="fixed bottom-0 left-0 right-0 p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
                <button
                    onClick={handlePay}
                    disabled={!canPay() || saving}
                    className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white font-extrabold py-4 px-6 rounded-2xl transition-all shadow-2xl shadow-green-600/30 disabled:opacity-40 disabled:pointer-events-none text-lg"
                >
                    {saving ? 'Procesando...' : `✅ Cobrar ${formatUSD(totalCents)}`}
                </button>
            </div>
        </div>
    )
}
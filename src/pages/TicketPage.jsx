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
    const [mixedWithUsd, setMixedWithUsd] = useState(true)
    const [mixedUsdAmount, setMixedUsdAmount] = useState('')
    const [mixedFirstMethod, setMixedFirstMethod] = useState('')
    const [mixedFirstAmount, setMixedFirstAmount] = useState('')
    const [mixedSecondMethod, setMixedSecondMethod] = useState('')
    const [saving, setSaving] = useState(false)
    const [invoiceNum, setInvoiceNum] = useState(null)
    const [reference, setReference] = useState('')

    useEffect(() => {
        nextInvoiceNumber().then(setInvoiceNum).catch(() => {})
    }, [])

    const totalUSD = useMemo(() => fromCents(totalCents), [totalCents])
    const totalBS = useMemo(() => (totalUSD * rate).toFixed(2), [totalUSD, rate])

    const mixedCoveredBs = useMemo(() => {
        if (method !== 'mixed') return 0
        if (mixedWithUsd) return (parseFloat(mixedUsdAmount) || 0) * rate
        return parseFloat(mixedFirstAmount) || 0
    }, [method, mixedWithUsd, mixedUsdAmount, mixedFirstAmount, rate])

    const mixedRemainingBS = useMemo(() => {
        if (method !== 'mixed') return parseFloat(totalBS)
        return Math.max(0, parseFloat(totalBS) - mixedCoveredBs)
    }, [method, totalBS, mixedCoveredBs])

    const change = useMemo(() => {
        if (method === 'usd_cash') {
            const paidCents = toCents(parseFloat(paid) || 0)
            const ch = calcChange(paidCents, totalCents)
            if (ch <= 0) return null
            const usdChange = fromCents(ch)
            const bsChange = usdChange * rate
            return { label: 'Vuelto USD', value: formatUSD(ch), bsValue: bsChange }
        }
        if (method === 'bs_cash') {
            const paidBsCents = toCents(parseFloat(paidBS) || 0)
            const totalBsCents = toCents(parseFloat(totalBS))
            const ch = calcChange(paidBsCents, totalBsCents)
            return ch > 0 ? { label: 'Vuelto BS', value: `Bs ${fromCents(ch).toFixed(2)}` } : null
        }
        return null
    }, [method, paid, paidBS, totalCents, totalBS, rate])

    const handleMethodChange = (newMethod) => {
        setMethod(newMethod)
        if (newMethod !== 'pago_movil' && newMethod !== 'pos') {
            setReference('')
        }
        if (newMethod !== 'mixed') {
            setMixedWithUsd(true)
            setMixedUsdAmount('')
            setMixedFirstMethod('')
            setMixedFirstAmount('')
            setMixedSecondMethod('')
        }
    }

    const canPay = useCallback(() => {
        if (!session?.id) return false
        if (method === 'usd_cash') return true
        if (method === 'bs_cash') return true
        if (method === 'pos') return true
        if (method === 'pago_movil') return true
        if (method === 'mixed') {
            if (mixedWithUsd) return (parseFloat(mixedUsdAmount) || 0) > 0 && mixedSecondMethod && mixedRemainingBS >= 0
            return mixedFirstMethod && (parseFloat(mixedFirstAmount) || 0) > 0 && mixedSecondMethod && mixedRemainingBS >= 0
        }
        return false
    }, [session?.id, method, mixedWithUsd, mixedUsdAmount, mixedFirstMethod, mixedFirstAmount, mixedSecondMethod, mixedRemainingBS])

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
                ...(method === 'mixed' && {
                    mixedWithUsd,
                    ...(mixedWithUsd
                        ? { mixedUsdAmount: parseFloat(mixedUsdAmount) || 0, mixedUsdInBs: mixedCoveredBs }
                        : { mixedFirstMethod, mixedFirstAmount: parseFloat(mixedFirstAmount) || 0 }
                    ),
                    mixedSecondMethod,
                    mixedBsAmount: mixedRemainingBS,
                    totalBS: parseFloat(totalBS),
                }),
                ...(method === 'pos' && { paidBS: parseFloat(totalBS), reference }),
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
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="pos-ref" className="label-xs">Número de operación (opcional)</label>
                            <input
                                id="pos-ref"
                                type="text"
                                inputMode="numeric"
                                maxLength={8}
                                value={reference}
                                onChange={e => setReference(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                className="input-field"
                                placeholder="12345678"
                            />
                        </div>
                        <p className="text-center text-slate-400 text-xs">
                            <span className="text-white font-bold text-base">Bs {formatBsNum(parseFloat(totalBS))}</span>
                            <span className="mx-2"> / </span>
                            <span className="text-slate-400">{formatUSD(totalCents)}</span>
                        </p>
                    </div>
                )}

                {method === 'mixed' && (
                    <div className="bg-[#1E293B] rounded-2xl p-4 space-y-4 border border-white/5">

                        {/* Toggle: Con USD / Sin USD */}
                        <div className="flex gap-2 bg-[#0F172A] p-1 rounded-xl border border-white/5" role="tablist">
                            <button
                                role="tab"
                                aria-selected={mixedWithUsd}
                                onClick={() => { setMixedWithUsd(true); setMixedSecondMethod('') }}
                                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${mixedWithUsd ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >💵 Con USD</button>
                            <button
                                role="tab"
                                aria-selected={!mixedWithUsd}
                                onClick={() => { setMixedWithUsd(false); setMixedSecondMethod('') }}
                                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${!mixedWithUsd ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >🔀 Sin USD</button>
                        </div>

                        {mixedWithUsd ? (
                            <>
                                {/* ── MODO CON USD ── */}
                                <div>
                                    <label htmlFor="mixed-usd" className="label-xs mb-2 flex items-center gap-2">
                                        Paso 1 — ¿Cuánto cobras en efectivo USD?
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                        <input
                                            id="mixed-usd"
                                            type="number" step="0.01" min="0"
                                            value={mixedUsdAmount}
                                            onChange={e => {
                                                setMixedUsdAmount(e.target.value)
                                                setMixedSecondMethod('')
                                            }}
                                            className="input-field pl-8"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {parseFloat(mixedUsdAmount) > 0 && (
                                        <p className="text-right text-xs mt-1 text-slate-400">
                                            = <span className="text-amber-400 font-bold">Bs {formatBsNum(mixedCoveredBs)}</span>
                                        </p>
                                    )}
                                </div>

                                {parseFloat(mixedUsdAmount) > 0 && (
                                    <div>
                                        <label className="label-xs mb-2 flex items-center gap-2">
                                            Paso 2 — ¿Cómo cobras el resto?
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'pos', label: 'Punto de Venta', icon: '💳' },
                                                { id: 'pago_movil', label: 'Pago Móvil', icon: '📲' },
                                                { id: 'bs_cash', label: 'Efectivo BS', icon: '💴' },
                                            ].map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setMixedSecondMethod(m.id)}
                                                    aria-pressed={mixedSecondMethod === m.id}
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-all ${
                                                        mixedSecondMethod === m.id
                                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                                                            : 'bg-[#0F172A] border-white/10 text-slate-300 hover:border-blue-500/30'
                                                    }`}
                                                >
                                                    <span className="text-lg">{m.icon}</span> {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* ── MODO SIN USD ── */}
                                <div>
                                    <label className="label-xs mb-2 flex items-center gap-2">
                                        Paso 1 — ¿Qué método usas?
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'pago_movil', label: 'Pago Móvil', icon: '📲' },
                                            { id: 'pos', label: 'Punto de Venta', icon: '💳' },
                                            { id: 'bs_cash', label: 'Efectivo BS', icon: '💴' },
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => { setMixedFirstMethod(m.id); setMixedSecondMethod('') }}
                                                aria-pressed={mixedFirstMethod === m.id}
                                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-all ${
                                                    mixedFirstMethod === m.id
                                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                                                        : 'bg-[#0F172A] border-white/10 text-slate-300 hover:border-blue-500/30'
                                                }`}
                                            >
                                                <span className="text-lg">{m.icon}</span> {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {mixedFirstMethod && (
                                    <div>
                                        <label htmlFor="mixed-first-amount" className="label-xs mb-2">
                                            ¿Cuánto cobras con {mixedFirstMethod === 'pos' ? 'Punto de Venta' : mixedFirstMethod === 'pago_movil' ? 'Pago Móvil' : 'Efectivo BS'}?
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Bs</span>
                                            <input
                                                id="mixed-first-amount"
                                                type="number" step="0.01" min="0"
                                                value={mixedFirstAmount}
                                                onChange={e => setMixedFirstAmount(e.target.value)}
                                                className="input-field pl-10"
                                                placeholder="0,00"
                                            />
                                        </div>
                                    </div>
                                )}

                                {mixedFirstMethod && parseFloat(mixedFirstAmount) > 0 && (
                                    <div>
                                        <label className="label-xs mb-2 flex items-center gap-2">
                                            Paso 2 — ¿Cómo cobras el resto?
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'pago_movil', label: 'Pago Móvil', icon: '📲' },
                                                { id: 'pos', label: 'Punto de Venta', icon: '💳' },
                                                { id: 'bs_cash', label: 'Efectivo BS', icon: '💴' },
                                            ].filter(m => m.id !== mixedFirstMethod).map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setMixedSecondMethod(m.id)}
                                                    aria-pressed={mixedSecondMethod === m.id}
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-all ${
                                                        mixedSecondMethod === m.id
                                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                                                            : 'bg-[#0F172A] border-white/10 text-slate-300 hover:border-blue-500/30'
                                                    }`}
                                                >
                                                    <span className="text-lg">{m.icon}</span> {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Resumen */}
                        {((mixedWithUsd && parseFloat(mixedUsdAmount) > 0) || (!mixedWithUsd && parseFloat(mixedFirstAmount) > 0)) && mixedSecondMethod && (
                            <div className="space-y-2">
                                <div className="bg-[#0F172A] rounded-xl px-4 py-3 space-y-2 border border-white/5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Total</span>
                                        <span className="text-white font-bold">Bs {formatBsNum(parseFloat(totalBS))}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">
                                            {mixedWithUsd
                                                ? '💵 Efectivo USD'
                                                : mixedFirstMethod === 'pos' ? '💳 Punto de Venta'
                                                : mixedFirstMethod === 'pago_movil' ? '📲 Pago Móvil'
                                                : '💴 Efectivo BS'}
                                        </span>
                                        <span className="text-green-400 font-bold">
                                            {mixedWithUsd
                                                ? `$${parseFloat(mixedUsdAmount).toFixed(2)} ≈ Bs ${formatBsNum(mixedCoveredBs)}`
                                                : `Bs ${formatBsNum(mixedCoveredBs)}`}
                                        </span>
                                    </div>
                                    <div className="border-t border-white/5 pt-2 flex justify-between text-xs">
                                        <span className="text-slate-400 font-semibold">
                                            {mixedSecondMethod === 'pos' ? '💳 Punto de Venta' :
                                             mixedSecondMethod === 'pago_movil' ? '📲 Pago Móvil' :
                                             '💴 Efectivo BS'}
                                        </span>
                                        <span className={`font-extrabold ${mixedRemainingBS > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                                            {mixedRemainingBS > 0
                                                ? `Bs ${formatBsNum(mixedRemainingBS)}`
                                                : '✅ Cubierto'}
                                        </span>
                                    </div>
                                </div>
                                {mixedRemainingBS <= 0 && (
                                    <p className="text-center text-green-400 text-xs font-bold">
                                        ✅ Total cubierto{mixedWithUsd ? ' con el efectivo USD' : ''}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Vuelto */}
                {change && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3 border">
                        {change.bsValue != null ? (
                            <div className="flex justify-between items-center gap-4">
                                <div>
                                    <p className="text-green-400 font-bold text-sm">{change.label}</p>
                                    <p className="text-slate-400 text-[10px] mt-0.5">Dar vuelto en BS</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-400 font-extrabold text-lg">{change.value}</p>
                                    <p className="text-amber-400 font-bold text-xs">≈ Bs {formatBsNum(change.bsValue)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <p className="text-green-400 font-bold text-sm">{change.label}</p>
                                <p className="text-green-400 font-extrabold text-lg">{change.value}</p>
                            </div>
                        )}
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
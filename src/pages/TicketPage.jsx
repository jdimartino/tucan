// src/pages/TicketPage.jsx
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useSession } from '../context/SessionContext'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { saveOrder } from '../services/orderService'
import { formatUSD, formatBS, toCents, fromCents, calcChange } from '../utils/money'

const METHODS = [
    { id: 'usd_cash', label: 'Efectivo USD', icon: '💵' },
    { id: 'bs_cash', label: 'Efectivo BS', icon: '💴' },
    { id: 'transfer', label: 'Transferencia', icon: '📲' },
    { id: 'mixed', label: 'Mixto', icon: '🔀' },
]

export default function TicketPage() {
    const { items, totalCents, dispatch } = useCart()
    const { session } = useSession()
    const { user } = useAuth()
    const { setScreen, setOrderId } = useNav()
    const rate = session?.exchangeRateBs || 1

    const [method, setMethod] = useState('usd_cash')
    const [paid, setPaid] = useState('')
    const [paidBS, setPaidBS] = useState('')
    const [saving, setSaving] = useState(false)

    const totalUSD = fromCents(totalCents)
    const totalBS = (totalUSD * rate).toFixed(2)

    // Calcular vuelto según método
    const getChange = () => {
        if (method === 'usd_cash') {
            const paidCents = toCents(parseFloat(paid) || 0)
            const change = calcChange(paidCents, totalCents)
            return change > 0 ? { label: 'Vuelto USD', value: formatUSD(change) } : null
        }
        if (method === 'bs_cash') {
            const paidBsCents = toCents(parseFloat(paidBS) || 0)
            const totalBsCents = toCents(parseFloat(totalBS))
            const change = calcChange(paidBsCents, totalBsCents)
            return change > 0 ? { label: 'Vuelto BS', value: `Bs ${fromCents(change).toFixed(2)}` } : null
        }
        return null
    }

    const canPay = () => {
        if (!session?.id) return false  // sin sesión activa NO se puede cobrar
        if (method === 'usd_cash') return parseFloat(paid) >= totalUSD
        if (method === 'bs_cash') return parseFloat(paidBS) >= parseFloat(totalBS)
        if (method === 'transfer') return true
        if (method === 'mixed') return (parseFloat(paid) || 0) + (parseFloat(paidBS) || 0) > 0
        return false
    }

    const handlePay = async () => {
        if (!canPay()) return
        if (!session?.id) {
            alert('No hay caja abierta. Pide al administrador que abra la caja del día.')
            return
        }
        setSaving(true)
        try {
            const change = getChange()
            const payment = {
                method,
                totalCents,
                ...(method === 'usd_cash' && { paidUSD: parseFloat(paid), changeUSD: parseFloat(paid) - totalUSD }),
                ...(method === 'bs_cash' && { paidBS: parseFloat(paidBS), changeBS: parseFloat(paidBS) - parseFloat(totalBS) }),
                ...(method === 'transfer' && { reference: 'transfer' }),
                ...(method === 'mixed' && { paidUSD: parseFloat(paid) || 0, paidBS: parseFloat(paidBS) || 0 }),
            }
            const orderId = await saveOrder({
                cashierId: user.uid,
                sessionId: session.id,
                exchangeRateBs: rate,
                items,
                payment,
            })
            setOrderId(orderId)
            dispatch({ type: 'CLEAR_CART' })
            setScreen('success')
        } catch (err) {
            console.error(err)
            alert('Error al procesar el pago. Intenta de nuevo.')
        } finally {
            setSaving(false)
        }
    }

    const change = getChange()

    // Banner de sesión no activa para el móvil
    const noSession = !session?.id

    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col pb-32">

            {/* Header */}
            <header className="bg-[#1E293B] border-b border-white/5 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button
                    onClick={() => setScreen('pos')}
                    className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                    ←
                </button>
                <div>
                    <p className="text-white font-bold text-sm leading-none">Ticket de Cobro</p>
                    <p className="text-slate-500 text-[10px]">{items.length} producto{items.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="ml-auto text-right">
                    <p className="text-blue-400 font-extrabold text-lg leading-none">{formatUSD(totalCents)}</p>
                    <p className="text-slate-500 text-[10px]">Bs {totalBS}</p>
                </div>
            </header>

            <div className="flex-1 px-4 pt-4 space-y-4">

                {/* Alerta: sin sesión activa */}
                {noSession && (
                    <div className="bg-orange-500/15 border border-orange-500/30 rounded-2xl px-4 py-3 flex items-start gap-3">
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
                        <div key={item.productId} className={`flex items-center gap-3 px-4 py-3 ${i < items.length - 1 ? 'border-b border-white/5' : ''}`}>
                            <span className="text-xl">{item.emoji}</span>
                            <div className="flex-1">
                                <p className="text-white text-sm font-semibold">{item.name}</p>
                                <p className="text-slate-500 text-xs">{item.qty} × {formatUSD(item.unitPriceCents)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-blue-400 font-bold text-sm">{formatUSD(item.subtotalCents)}</p>
                                <p className="text-slate-500 text-[10px]">Bs {(fromCents(item.subtotalCents) * rate).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                    {/* Total */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white/5">
                        <p className="text-white font-bold">Total</p>
                        <div className="text-right">
                            <p className="text-blue-400 font-extrabold">{formatUSD(totalCents)}</p>
                            <p className="text-slate-400 text-xs">Bs {totalBS}</p>
                        </div>
                    </div>
                </div>

                {/* Métodos de pago */}
                <div>
                    <label className="label-xs mb-2">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                        {METHODS.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMethod(m.id)}
                                className={`flex items-center gap-2 p-3 rounded-xl border font-semibold text-sm transition-all ${method === m.id
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                                    : 'bg-[#1E293B] border-white/5 text-slate-300 hover:border-blue-500/30'
                                    }`}
                            >
                                <span className="text-lg">{m.icon}</span> {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input monto recibido */}
                {(method === 'usd_cash' || method === 'mixed') && (
                    <div>
                        <label className="label-xs">Monto recibido (USD)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number" step="0.01" min={totalUSD}
                                value={paid}
                                onChange={e => setPaid(e.target.value)}
                                className="input-field pl-8"
                                placeholder={totalUSD.toFixed(2)}
                            />
                        </div>
                    </div>
                )}
                {(method === 'bs_cash' || method === 'mixed') && (
                    <div>
                        <label className="label-xs">Monto recibido (BS)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Bs</span>
                            <input
                                type="number" step="0.01" min={method === 'bs_cash' ? parseFloat(totalBS) : 0}
                                value={paidBS}
                                onChange={e => setPaidBS(e.target.value)}
                                className="input-field pl-10"
                                placeholder={totalBS}
                            />
                        </div>
                    </div>
                )}

                {/* Vuelto */}
                {change && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3 flex justify-between items-center">
                        <p className="text-green-400 font-bold text-sm">{change.label}</p>
                        <p className="text-green-400 font-extrabold text-lg">{change.value}</p>
                    </div>
                )}
                {method === 'transfer' && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3">
                        <p className="text-blue-400 font-semibold text-sm text-center">📲 Confirma la transferencia antes de cobrar</p>
                    </div>
                )}
            </div>

            {/* Botón Cobrar */}
            <div className="fixed bottom-0 left-0 right-0 p-4">
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

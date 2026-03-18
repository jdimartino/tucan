// src/pages/HoldPage.jsx
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useSession } from '../context/SessionContext'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { useOpenOrders } from '../hooks/useOpenOrders'
import { saveHoldOrder, reopenOrder, cancelHoldOrder, appendHoldOrder } from '../services/orderService'
import { formatUSD, fromCents } from '../utils/money'
import { useToast } from '../components/Toast'

export default function HoldPage() {
    const { items, totalCents, dispatch } = useCart()
    const { session } = useSession()
    const { user } = useAuth()
    const { setScreen } = useNav()
    const { orders, loading } = useOpenOrders(session?.id)
    const toast = useToast()

    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [saving, setSaving] = useState(false)
    const [retaking, setRetaking] = useState(null)
    const [assignMode, setAssignMode] = useState('new')
    const [selectedOrderId, setSelectedOrderId] = useState('')

    const rate = session?.exchangeRateBs || 1
    const hasItems = items.length > 0

    const canSaveNew = name.trim().length >= 2 && phone.trim().length >= 7 && hasItems && session?.id
    const canSaveExisting = selectedOrderId && hasItems && session?.id
    const canSave = assignMode === 'new' || orders.length === 0 ? canSaveNew : canSaveExisting

    const handleSave = async () => {
        if (!canSave) return
        setSaving(true)
        try {
            if (assignMode === 'new' || orders.length === 0) {
                await saveHoldOrder({
                    cashierId: user.uid,
                    sessionId: session.id,
                    exchangeRateBs: rate,
                    items,
                    client: { name, phone },
                })
            } else {
                await appendHoldOrder(selectedOrderId, items)
            }
            dispatch({ type: 'CLEAR_CART' })
            setName('')
            setPhone('')
            setSelectedOrderId('')
            setAssignMode('new')
            toast.success('Cuenta guardada correctamente')
        } catch (err) {
            console.error(err)
            toast.error('Error al guardar la cuenta. Intenta de nuevo.')
        } finally {
            setSaving(false)
        }
    }

    const handleRetake = async (orderId) => {
        setRetaking(orderId)
        try {
            const holdItems = await reopenOrder(orderId)
            dispatch({ type: 'CLEAR_CART' })
            holdItems.forEach(item => {
                for (let i = 0; i < item.qty; i++) {
                    dispatch({
                        type: 'ADD_ITEM',
                        payload: {
                            id: item.productId,
                            name: item.name,
                            emoji: item.emoji,
                            priceUSD: item.unitPriceCents / 100,
                        },
                    })
                }
            })
            setScreen('ticket')
        } catch (err) {
            console.error(err)
            toast.error('Error al retomar la cuenta.')
        } finally {
            setRetaking(null)
        }
    }

    const handleCancel = async (orderId) => {
        if (!confirm('¿Cancelar esta cuenta en espera?')) return
        try {
            await cancelHoldOrder(orderId)
            toast.success('Cuenta cancelada')
        } catch (err) {
            toast.error('Error al cancelar la cuenta.')
        }
    }

    const formatTime = (ts) => {
        if (!ts?.seconds) return ''
        const d = new Date(ts.seconds * 1000)
        return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col pb-8">

            {/* Header */}
            <header className="bg-[#1E293B] border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <p className="text-white font-bold text-sm leading-none">⏳ Factura en Espera</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">Guarda o retoma una cuenta</p>
                </div>
                <button
                    onClick={() => setScreen('pos')}
                    aria-label="Volver a facturación"
                    className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-600/20"
                >
                    ← Volver a Facturación
                </button>
            </header>

            <div className="flex-1 px-4 pt-4 space-y-5">

                {/* ── SECCIÓN A: Guardar el carrito actual ── */}
                {hasItems && (
                    <div className="bg-[#1E293B] rounded-2xl p-4 border border-white/5">
                        <h2 className="text-white font-bold text-sm mb-3">
                            💾 Guardar cuenta actual
                            <span className="text-slate-500 font-normal ml-2 text-xs">
                                {items.length} producto{items.length !== 1 ? 's' : ''} · {formatUSD(totalCents)}
                            </span>
                        </h2>

                        {/* Mini resumen del carrito */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {items.map(item => (
                                <span key={item.productId} className="text-[10px] bg-white/5 border border-white/10 text-slate-300 px-2 py-1 rounded-full flex items-center gap-1">
                                    {item.emoji} {item.qty}x {item.name}
                                </span>
                            ))}
                        </div>

                        {/* Opciones de asignación */}
                        {orders.length > 0 && (
                            <div className="flex gap-2 mb-4 bg-[#0F172A] p-1 rounded-xl border border-white/5" role="tablist">
                                <button
                                    role="tab"
                                    aria-selected={assignMode === 'new'}
                                    onClick={() => setAssignMode('new')}
                                    className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${assignMode === 'new' ? 'bg-amber-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Nuevo Cliente
                                </button>
                                <button
                                    role="tab"
                                    aria-selected={assignMode === 'existing'}
                                    onClick={() => setAssignMode('existing')}
                                    className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${assignMode === 'existing' ? 'bg-amber-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Anexar a Existente
                                </button>
                            </div>
                        )}

                        <div className="space-y-3">
                            {assignMode === 'new' || orders.length === 0 ? (
                                <>
                                    <div>
                                        <label htmlFor="client-name" className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nombre del Cliente</label>
                                        <input
                                            id="client-name"
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="ej. Jonathan"
                                            className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="client-phone" className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Celular</label>
                                        <input
                                            id="client-phone"
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                            placeholder="ej. 04121234567"
                                            className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label htmlFor="select-order" className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Seleccionar Cuenta Abierta</label>
                                    <select
                                        id="select-order"
                                        value={selectedOrderId}
                                        onChange={e => setSelectedOrderId(e.target.value)}
                                        className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    >
                                        <option value="" disabled>-- Elige un cliente --</option>
                                        {orders.map(o => (
                                            <option key={o.id} value={o.id}>
                                                {o.client?.name} (Lleva: {formatUSD(o.totalCents)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={!canSave || saving}
                                className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black font-extrabold py-3 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-amber-500/20"
                            >
                                {saving ? 'Guardando...' : assignMode === 'existing' && orders.length > 0 ? '⏳ Anexar Pedido' : '⏳ Dejar en Espera'}
                            </button>
                        </div>
                    </div>
                )}

                {!hasItems && (
                    <div className="bg-[#1E293B] rounded-2xl p-4 border border-white/5 text-center">
                        <p className="text-slate-500 text-sm">No hay ítems en el carrito.</p>
                        <p className="text-slate-600 text-xs mt-1">Agrega productos primero para guardar una cuenta.</p>
                    </div>
                )}

                {/* ── SECCIÓN B: Cuentas abiertas ── */}
                <div>
                    <h2 className="text-white font-bold text-sm mb-3 px-1">
                        📋 Cuentas abiertas
                        {orders.length > 0 && (
                            <span className="ml-2 bg-amber-500/20 text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                {orders.length}
                            </span>
                        )}
                    </h2>

                    {loading && (
                        <div className="flex justify-center py-6">
                            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && orders.length === 0 && (
                        <div className="bg-[#1E293B] rounded-2xl p-5 border border-white/5 text-center">
                            <div className="text-3xl mb-2">🪹</div>
                            <p className="text-slate-500 text-sm">No hay cuentas en espera.</p>
                        </div>
                    )}

                    {!loading && orders.map(order => (
                        <div key={order.id} className="bg-[#1E293B] rounded-2xl p-4 border border-white/5 mb-3">
                            {/* Info cliente */}
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-white font-bold text-base leading-none">
                                        {order.client?.name}
                                    </p>
                                    <p className="text-slate-500 text-xs mt-0.5">📱 {order.client?.phone}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-blue-400 font-extrabold">{formatUSD(order.totalCents)}</p>
                                    <p className="text-slate-600 text-[10px]">
                                        Bs {(fromCents(order.totalCents) * rate).toFixed(0)}
                                    </p>
                                    <p className="text-slate-600 text-[10px] mt-0.5">{formatTime(order.createdAt)}</p>
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleCancel(order.id)}
                                    aria-label={`Cancelar cuenta de ${order.client?.name}`}
                                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold py-2 rounded-xl text-xs transition-all"
                                >
                                    🗑 Cancelar
                                </button>
                                <button
                                    onClick={() => handleRetake(order.id)}
                                    disabled={retaking === order.id}
                                    aria-label={`Retomar cuenta de ${order.client?.name}`}
                                    className="flex-[2] bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-extrabold py-2 rounded-xl text-sm transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
                                >
                                    {retaking === order.id ? 'Cargando...' : '💳 Retomar y Cobrar'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

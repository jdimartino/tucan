// src/pages/POSPage.jsx
import { useState, useMemo } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'
import { useCart } from '../context/CartContext'
import { useNav } from '../context/NavigationContext'
import { useProducts } from '../hooks/useProducts'
import { useOpenOrders } from '../hooks/useOpenOrders'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import TucanIcon from '../components/TucanIcon'
import { formatUSD } from '../utils/money'

const ALL = 'Todos'

export default function POSPage() {
    const { user, role } = useAuth()
    const { session } = useSession()
    const { items, totalCents, itemCount, dispatch } = useCart()
    const { setScreen } = useNav()
    const { products, loading } = useProducts()
    const { orders: holdOrders } = useOpenOrders(session?.id)
    const isOnline = useOnlineStatus()
    const holdCount = holdOrders?.length || 0
    const [activeCategory, setActiveCategory] = useState(ALL)

    // Extraer categorías únicas de productos activos
    const categories = useMemo(() => {
        const cats = [...new Set(products.filter(p => p.active).map(p => p.category))]
        return [ALL, ...cats]
    }, [products])

    const filtered = useMemo(() => products.filter(p =>
        p.active &&
        (activeCategory === ALL || p.category === activeCategory)
    ), [products, activeCategory])

    // Guardia: si no hay sesión activa, pedir abrir caja
    if (session?.status !== 'open' && !loading) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-center">
                <div className="text-5xl mb-4">🏪</div>
                <h2 className="text-white text-xl font-bold mb-2">Caja cerrada</h2>
                <p className="text-slate-400 text-sm mb-6">Pide al Admin que abra la caja del día antes de facturar.</p>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                    {role === 'admin' && (
                        <button onClick={() => setScreen('admin')} className="btn-primary text-sm">
                            ⚙️ Ir al Panel Admin
                        </button>
                    )}
                    <button onClick={() => signOut(auth)} className="btn-secondary text-sm">
                        ← Cerrar Sesión
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col pb-28">

            {/* ── Header ── */}
            <header className="bg-[#1E293B] border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <p className="text-white font-bold text-sm leading-none flex items-center gap-1">
                        <TucanIcon className="w-4 h-4 inline-block" /> TucanApp POS
                        {!isOnline && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/20">
                                Offline
                            </span>
                        )}
                    </p>
                    <p className="text-slate-500 text-[10px] leading-none mt-0.5">{user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                    {holdCount > 0 && (
                        <button
                            onClick={() => setScreen('hold')}
                            aria-label={`${holdCount} facturas en espera`}
                            className="bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs font-extrabold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1 hover:bg-amber-500/30 transition-colors"
                        >
                            ⏳ <span className="hidden sm:inline">En espera:</span> {holdCount}
                        </button>
                    )}
                    {session?.exchangeRateBs && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                            Bs {session.exchangeRateBs}/$
                        </span>
                    )}
                    {role === 'admin' && (
                        <button
                            onClick={() => setScreen?.('admin')}
                            aria-label="Panel de administración"
                            className="text-xs text-slate-400 hover:text-blue-400 transition-colors font-semibold px-2 py-1 rounded-lg hover:bg-blue-500/10"
                        >
                            ⚙️
                        </button>
                    )}
                    <button
                        onClick={() => signOut(auth)}
                        aria-label="Cerrar sesión"
                        className="text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10 font-semibold"
                    >
                        Salir
                    </button>
                </div>
            </header>

            {/* ── Filtros de categoría ── */}
            <nav className="px-4 pt-4 pb-2" aria-label="Filtros de categoría">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            aria-pressed={activeCategory === cat}
                            className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-full transition-all flex-shrink-0 ${activeCategory === cat
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                : 'bg-[#1E293B] text-slate-400 hover:text-white border border-white/5'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </nav>

            {/* ── Banner facturas en espera ── */}
            {itemCount === 0 && holdCount > 0 && (
                <div className="px-4 pb-2">
                    <button
                        onClick={() => setScreen('hold')}
                        className="w-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold py-2 px-4 rounded-xl flex items-center justify-between transition-all hover:bg-amber-500/25 active:scale-[0.99] text-sm"
                    >
                        <span>⏳ {holdCount} factura{holdCount !== 1 ? 's' : ''} en espera</span>
                        <span className="text-xs opacity-70">Ver →</span>
                    </button>
                </div>
            )}

            {/* ── Grilla de Productos ── */}
            <main className="flex-1 px-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <div className="text-5xl mb-3">📦</div>
                        <p className="font-semibold">Sin productos</p>
                        {products.length === 0
                            ? <p className="text-sm mt-1">El Admin debe cargar el menú primero</p>
                            : <p className="text-sm mt-1">No hay ítems en esta categoría</p>
                        }
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {filtered.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                qty={items.find(i => i.productId === product.id)?.qty || 0}
                                rate={session?.exchangeRateBs || 0}
                                onAdd={() => dispatch({ type: 'ADD_ITEM', payload: product })}
                                onRemove={() => dispatch({ type: 'DECREMENT_ITEM', payload: product.id })}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* ── Cart Bar flotante inferior ── */}
            {itemCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-20 p-4">
                    <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2">

                        {/* Info: ítems + emojis + total */}
                        <div className="flex items-center justify-between px-1">
                            <span className="text-white font-extrabold text-lg leading-none">{formatUSD(totalCents)}</span>
                            <span className="text-slate-400 text-xs">{itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}</span>
                        </div>

                        {/* Lista vertical de ítems */}
                        <div className="w-full flex flex-col gap-1 max-h-28 overflow-y-auto">
                            {items.map(item => (
                                <div key={item.productId} className="flex items-center justify-between px-1 gap-2">
                                    <span className="text-xs text-slate-300 flex items-center gap-1.5 flex-1 min-w-0">
                                        <span>{item.emoji}</span>
                                        <span className="truncate">{item.qty}× {item.name}</span>
                                    </span>
                                    <span className="text-xs font-bold text-blue-400 shrink-0">
                                        {formatUSD(item.subtotalCents)}
                                    </span>
                                    <button
                                        onPointerDown={e => { e.stopPropagation(); dispatch({ type: 'DECREMENT_ITEM', payload: item.productId }) }}
                                        className="shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 active:scale-90 transition-all text-xs font-bold leading-none flex items-center justify-center"
                                        aria-label={`Quitar ${item.name}`}
                                    >
                                        −
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-2 mt-1">
                            <button
                                onClick={() => setScreen('hold')}
                                className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 active:scale-[0.98] text-amber-400 font-bold py-3 px-3 rounded-xl transition-all text-sm"
                            >
                                ⏳ En Espera
                            </button>
                            <button
                                onClick={() => setScreen('ticket')}
                                className="flex-[2] bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-extrabold py-3 px-5 rounded-xl transition-all shadow-lg shadow-blue-600/30 text-sm"
                            >
                                💳 Cobrar {formatUSD(totalCents)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

/* ── Componente ProductCard ── */
function ProductCard({ product, qty, rate, onAdd, onRemove }) {
    const bsPrice = rate > 0 ? `Bs ${(product.priceUSD * rate).toFixed(0)}` : null

    return (
        <div className={`bg-[#1E293B] rounded-2xl p-3 relative flex flex-col transition-all border ${qty > 0 ? 'border-blue-500/40' : 'border-white/5'}`}>
            {/* Badge cantidad */}
            {qty > 0 && (
                <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                    {qty}
                </span>
            )}

            <div className="text-3xl text-center mt-1 mb-2">{product.emoji}</div>
            <p className="text-white text-xs font-semibold text-center leading-tight mb-0.5 line-clamp-2">{product.name}</p>
            <p className="text-blue-400 text-sm font-extrabold text-center">${product.priceUSD.toFixed(2)}</p>
            {bsPrice && <p className="text-amber-400 font-bold text-[10px] text-center mb-2">{bsPrice}</p>}

            <div className="mt-auto pt-2 flex gap-1">
                {qty > 0 ? (
                    <>
                        <button
                            onClick={onRemove}
                            aria-label={`Quitar ${product.name}`}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2 rounded-xl text-sm transition-colors active:scale-95"
                        >−</button>
                        <button
                            onClick={onAdd}
                            aria-label={`Agregar más ${product.name}`}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-sm transition-colors active:scale-95"
                        >+</button>
                    </>
                ) : (
                    <button
                        onClick={onAdd}
                        aria-label={`Agregar ${product.name}`}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-sm transition-colors active:scale-95"
                    >Agregar</button>
                )}
            </div>
        </div>
    )
}

// src/pages/SuccessPage.jsx
import { useNav } from '../context/NavigationContext'
import { useSession } from '../context/SessionContext'

export default function SuccessPage() {
    const { setScreen, lastOrderId, lastOrderData } = useNav()
    const { session } = useSession()

    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-center">

            {/* Icono animado */}
            <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-green-500/30 flex items-center justify-center">
                        <span className="text-4xl">✅</span>
                    </div>
                </div>
            </div>

            <h1 className="text-white text-2xl font-extrabold mb-2">¡Pago Exitoso!</h1>
            <p className="text-slate-400 text-sm mb-8">La venta ha sido registrada correctamente.</p>

            {/* Detalles de la orden */}
            <div className="bg-[#1E293B] rounded-2xl w-full max-w-sm p-5 text-left space-y-4 mb-8 border border-white/5">
                <div className="flex justify-between items-center text-xs">
                    <p className="text-slate-400 font-bold uppercase tracking-wider">Número de Orden</p>
                    <p className="text-white font-mono truncate ml-2 max-w-[140px]">{lastOrderId?.slice(0, 8) || '—'}</p>
                </div>
                {session?.exchangeRateBs && (
                    <div className="flex justify-between items-center text-xs">
                        <p className="text-slate-400 font-bold uppercase tracking-wider">Tasa del día</p>
                        <p className="text-white">Bs {session.exchangeRateBs} / $1</p>
                    </div>
                )}

                {/* --- Montos Totales --- */}
                {lastOrderData && (
                    <div className="border-t border-white/5 pt-3 space-y-2 text-xs">
                        <div className="flex justify-between">
                            <p className="text-slate-400 font-bold uppercase tracking-wider">Monto Total</p>
                            <p className="text-blue-400 font-extrabold text-sm">
                                ${(lastOrderData.totalCents / 100).toFixed(2)}
                            </p>
                        </div>
                        {lastOrderData.payment && (
                            <>
                                {lastOrderData.payment.paidUSD > 0 && (
                                    <div className="flex justify-between">
                                        <p className="text-slate-500 font-semibold">Pagado USD</p>
                                        <p className="text-slate-300 font-bold">${lastOrderData.payment.paidUSD.toFixed(2)}</p>
                                    </div>
                                )}
                                {lastOrderData.payment.paidBS > 0 && (
                                    <div className="flex justify-between">
                                        <p className="text-slate-500 font-semibold">Pagado BS</p>
                                        <p className="text-slate-300 font-bold">Bs {lastOrderData.payment.paidBS.toFixed(2)}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* --- Detalle de Productos --- */}
                {lastOrderData?.items && (
                    <div className="border-t border-white/5 pt-3 space-y-2">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Detalle de Productos</p>
                        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                            {lastOrderData.items.map((item, index) => (
                                <div key={index} className="flex justify-between text-xs items-center">
                                    <span className="text-slate-300 truncate max-w-[160px]">
                                        {item.emoji} {item.name}{' '}
                                        <span className="text-slate-500">x{item.qty}</span>
                                    </span>
                                    <span className="text-slate-400 font-mono">
                                        ${(item.priceUSD * item.qty).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-white/5 text-xs">
                    <p className="text-slate-400 font-bold uppercase tracking-wider">Sesión</p>
                    <p className="text-green-400 font-bold">🟢 Activa</p>
                </div>
            </div>

            {/* Botón nueva venta */}
            <button
                onClick={() => setScreen('pos')}
                className="w-full max-w-sm bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-blue-600/30 text-lg"
            >
                🦜 Nueva Venta
            </button>

            <p className="text-slate-600 text-xs mt-6">
                Orden guardada en Firestore · {new Date().toLocaleTimeString('es-VE')}
            </p>
        </div>
    )
}

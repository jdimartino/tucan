// src/pages/AdminPage.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'
import { useNav } from '../context/NavigationContext'
import LogoIcon from '../components/LogoIcon'
import ProductList from '../components/admin/ProductList'
import SessionPanel from '../components/admin/SessionPanel'
import ReportPage from './ReportPage'
import HistoricalReportPage from './HistoricalReportPage'
import { resetAllOrders } from '../services/orderService'
import { useToast } from '../components/Toast'

const TABS = [
    { id: 'products', label: '📦 Productos' },
    { id: 'caja', label: '🏪 Caja' },
    { id: 'report', label: '📊 Reporte Hoy' },
    { id: 'historical', label: '📋 Reporte Histórico' },
]

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('products')
    const { role } = useAuth()
    const { session } = useSession()
    const { setScreen } = useNav()
    const toast = useToast()
    const [resetting, setResetting] = useState(false)

    const handleResetOrders = async () => {
        if (!window.confirm('⚠️ ¿Estás seguro? Se borrarán TODAS las facturas y el contador se reiniciará a #0001. Los productos, precios, métodos de pago y configuraciones se conservan.\n\nEsta acción NO se puede deshacer.')) return
        if (!window.confirm('Confirmación final: ¿Estás ABSOLUTAMENTE seguro? Las órdenes eliminadas NO se pueden recuperar.')) return
        setResetting(true)
        try {
            const count = await resetAllOrders()
            toast.success(`✅ Reset completo. Se eliminaron ${count} órdenes y el contador se reinició a #0001.`)
        } catch (err) {
            console.error(err)
            toast.error('Error al resetear. Revisa la consola.')
        } finally {
            setResetting(false)
        }
    }

    if (role !== 'admin') return null

    return (
        <div className="min-h-screen bg-[#1E1040] flex flex-col">
            {/* Header */}
            <header className="bg-[#2E1B5C] border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <LogoIcon className="w-7 h-7" />
                    <div>
                        <p className="text-white font-bold text-sm leading-none">Los 3 Cochinitos Admin</p>
                        <p className="text-slate-400 text-[11px] leading-none mt-0.5 font-semibold">By JDM</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {session?.status === 'open' && (
                        <button
                            onClick={() => setScreen('pos')}
                            className="text-sm font-bold px-4 py-2.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                        >
                            🏠 POS
                        </button>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div className="px-4 pt-4">
                <div className="flex gap-1 bg-[#2E1B5C] rounded-2xl p-1 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 text-xs font-bold py-2 px-2 rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 p-4 overflow-auto">
                {activeTab === 'products' && <ProductList />}
                {activeTab === 'caja' && <SessionPanel onSessionOpen={() => setScreen('pos')} />}
                {activeTab === 'report' && <ReportPage onBack={() => setActiveTab('caja')} />}
                {activeTab === 'historical' && <HistoricalReportPage />}
            </main>

            {/* ⚠️ TEMPORAL — Botón de reseteo de facturas */}
            <div className="px-4 pb-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3">
                    <p className="text-red-400 text-[11px] font-bold uppercase tracking-wider mb-2 text-center">⚠️ Zona de Reseteo (temporal)</p>
                    <button
                        onClick={handleResetOrders}
                        disabled={resetting}
                        className="w-full bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-extrabold py-3 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-red-600/20"
                    >
                        {resetting ? 'Eliminando órdenes...' : '🔄 Resetear Facturas (una sola vez)'}
                    </button>
                </div>
            </div>
        </div>
    )
}

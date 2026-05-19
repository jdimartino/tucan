// src/pages/AdminPage.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'
import { useNav } from '../context/NavigationContext'
import LogoIcon from '../components/LogoIcon'
import ProductList from '../components/admin/ProductList'
import SessionPanel from '../components/admin/SessionPanel'
import ReportPage from './ReportPage'

const TABS = [
    { id: 'products', label: '📦 Productos' },
    { id: 'caja', label: '🏪 Caja' },
    { id: 'report', label: '📊 Reporte' },
]

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('products')
    const { role } = useAuth()
    const { session } = useSession()
    const { setScreen } = useNav()

    if (role !== 'admin') return null

    return (
        <div className="min-h-screen bg-[#1E1040] flex flex-col">
            {/* Header */}
            <header className="bg-[#2E1B5C] border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <LogoIcon className="w-7 h-7" />
                    <div>
                        <p className="text-white font-bold text-sm leading-none">Cochinitos Admin</p>
                        <p className="text-slate-500 text-[11px] leading-none mt-0.5">admin@cochinitos.app</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {session?.status === 'open' && (
                        <button
                            onClick={() => setScreen('pos')}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
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
                {activeTab === 'caja' && <SessionPanel onSessionOpen={() => setActiveTab('products')} />}
                {activeTab === 'report' && <ReportPage onBack={() => setActiveTab('caja')} />}
            </main>
        </div>
    )
}

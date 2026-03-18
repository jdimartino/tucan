// src/pages/AdminPage.jsx
import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'
import { useNav } from '../context/NavigationContext'
import ProductList from '../components/admin/ProductList'
import UserList from '../components/admin/UserList'
import SessionPanel from '../components/admin/SessionPanel'
import ReportPage from './ReportPage'

const TABS = [
    { id: 'products', label: '📦 Productos' },
    { id: 'users', label: '👥 Usuarios' },
    { id: 'caja', label: '🏪 Caja' },
    { id: 'report', label: '📊 Reporte' },
]

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('products')
    const { user } = useAuth()
    const { session } = useSession()
    const { setScreen } = useNav()

    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col">
            {/* Header */}
            <header className="bg-[#1E293B] border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🦜</span>
                    <div>
                        <p className="text-white font-bold text-sm leading-none">TucanApp Admin</p>
                        <p className="text-slate-500 text-[10px] leading-none mt-0.5">{user?.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {session?.status === 'open' && (
                        <>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/20">
                                Bs {session.exchangeRateBs}/$
                            </span>
                            <button
                                onClick={() => setScreen('pos')}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                            >
                                🏠 POS
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => signOut(auth)}
                        className="text-xs text-slate-400 hover:text-red-400 transition-colors font-semibold px-2 py-1 rounded-lg hover:bg-red-500/10"
                    >
                        Salir
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="px-4 pt-4">
                <div className="flex gap-1 bg-[#1E293B] rounded-2xl p-1 overflow-x-auto">
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
                {activeTab === 'users' && <UserList />}
                {activeTab === 'caja' && <SessionPanel onSessionOpen={() => setActiveTab('products')} />}
                {activeTab === 'report' && <ReportPage onBack={() => setActiveTab('caja')} />}
            </main>
        </div>
    )
}

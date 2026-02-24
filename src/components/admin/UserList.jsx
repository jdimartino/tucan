// src/components/admin/UserList.jsx
import { useState } from 'react'
import { useUsers } from '../../hooks/useUsers'
import { toggleUser } from '../../services/userService'
import UserForm from './UserForm'
import { useAuth } from '../../context/AuthContext'

export default function UserList() {
    const { users, loading } = useUsers()
    const { user: me } = useAuth()
    const [showForm, setShowForm] = useState(false)

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
                <button onClick={() => setShowForm(true)} className="btn-primary">+ Cajero</button>
            </div>

            {users.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <div className="text-5xl mb-3">👤</div>
                    <p className="font-semibold">Sin cajeros registrados</p>
                    <p className="text-sm mt-1">Crea el primer cajero con el botón de arriba</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {users.map(u => (
                        <div key={u.id} className={`flex items-center gap-3 bg-[#1E293B] rounded-2xl px-4 py-3 transition-opacity ${!u.active ? 'opacity-40' : ''}`}>
                            {/* Avatar inicial */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${u.role === 'admin' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                                {u.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold text-sm truncate">
                                    {u.name}
                                    {u.id === me?.uid && <span className="text-blue-400 text-xs font-normal ml-2">(tú)</span>}
                                </p>
                                <p className="text-slate-500 text-xs truncate">{u.email || u.role}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${u.role === 'admin' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-600/20 text-blue-400'}`}>
                                    {u.role === 'admin' ? '👑 Admin' : '💳 Cajero'}
                                </span>
                                {/* No puede desactivarse a sí mismo */}
                                {u.id !== me?.uid && u.role !== 'admin' && (
                                    <button
                                        onClick={() => toggleUser(u.id, !u.active)}
                                        className={`text-xs px-2 py-1 rounded-lg font-bold transition-colors ${u.active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                    >
                                        {u.active ? '✓' : '○'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && <UserForm onClose={() => setShowForm(false)} />}
        </div>
    )
}

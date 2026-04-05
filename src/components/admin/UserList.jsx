// src/components/admin/UserList.jsx
import { useState } from 'react'
import { useUsers } from '../../hooks/useUsers'
import { toggleUser, updateUser } from '../../services/userService'
import UserForm from './UserForm'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../Toast'

export default function UserList() {
    const { users, loading } = useUsers()
    const { user: me } = useAuth()
    const toast = useToast()
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const [editRole, setEditRole] = useState('')
    const [saving, setSaving] = useState(false)

    const startEdit = (u) => {
        setEditingId(u.id)
        setEditName(u.name || '')
        setEditRole(u.role || 'cashier')
    }

    const cancelEdit = () => setEditingId(null)

    const handleSave = async (uid) => {
        if (!editName.trim()) return
        setSaving(true)
        try {
            await updateUser(uid, { name: editName.trim(), role: editRole })
            toast.success('Usuario actualizado')
            setEditingId(null)
        } catch (err) {
            console.error(err)
            toast.error('Error al actualizar el usuario')
        } finally {
            setSaving(false)
        }
    }

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
                        <div key={u.id} className={`bg-[#1E293B] rounded-2xl overflow-hidden transition-opacity ${!u.active ? 'opacity-40' : ''}`}>
                            {/* Fila principal */}
                            <div className="flex items-center gap-3 px-4 py-3">
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
                                    {/* Editar */}
                                    {u.id !== me?.uid && (
                                        <button
                                            onClick={() => editingId === u.id ? cancelEdit() : startEdit(u)}
                                            className="text-xs px-2 py-1 rounded-lg font-bold transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600"
                                            aria-label="Editar usuario"
                                        >
                                            ✏️
                                        </button>
                                    )}
                                    {/* Activar/desactivar */}
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

                            {/* Formulario de edición inline */}
                            {editingId === u.id && (
                                <div className="border-t border-white/5 px-4 py-3 space-y-3">
                                    <div>
                                        <label className="label-xs">Nombre</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="input-field mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="label-xs">Rol</label>
                                        <div className="flex gap-2 mt-1">
                                            <button
                                                onClick={() => setEditRole('cashier')}
                                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${editRole === 'cashier' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#0F172A] border-white/10 text-slate-400'}`}
                                            >
                                                💳 Cajero
                                            </button>
                                            <button
                                                onClick={() => setEditRole('admin')}
                                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${editRole === 'admin' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-[#0F172A] border-white/10 text-slate-400'}`}
                                            >
                                                👑 Admin
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={cancelEdit} className="flex-1 btn-secondary text-xs py-2">
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => handleSave(u.id)}
                                            disabled={saving || !editName.trim()}
                                            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs transition-all disabled:opacity-40"
                                        >
                                            {saving ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showForm && <UserForm onClose={() => setShowForm(false)} />}
        </div>
    )
}

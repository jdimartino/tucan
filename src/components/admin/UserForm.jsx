// src/components/admin/UserForm.jsx
import { useState } from 'react'
import { createCashier } from '../../services/userService'

export default function UserForm({ onClose }) {
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
        setSaving(true)
        try {
            await createCashier(form)
            onClose()
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') setError('Ese email ya está registrado.')
            else setError('Error al crear cajero. Intenta de nuevo.')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div className="bg-[#1E293B] rounded-[24px] w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-white mb-5">💳 Nuevo Cajero</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label-xs">Nombre completo</label>
                        <input value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="ej. María Gómez" required />
                    </div>
                    <div>
                        <label className="label-xs">Email</label>
                        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" placeholder="cajero@tucan.app" required />
                    </div>
                    <div>
                        <label className="label-xs">Contraseña temporal</label>
                        <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className="input-field" placeholder="mínimo 6 caracteres" required />
                    </div>
                    {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                        <button type="submit" disabled={saving} className="btn-primary flex-1">
                            {saving ? 'Creando...' : 'Crear Cajero'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

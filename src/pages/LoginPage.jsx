import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import TucanIcon from '../components/TucanIcon'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await signInWithEmailAndPassword(auth, email, password)
        } catch (err) {
            console.error(err)
            setError('Credenciales inválidas o error de conexión.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0F172A]">
            <div className="bg-[#1E293B] rounded-[24px] p-8 w-full max-w-md shadow-2xl border border-white/5">
                <div className="flex justify-center mb-4"><TucanIcon className="w-16 h-16" /></div>
                <h1 className="text-2xl font-extrabold text-center mb-1 text-white">TucanApp</h1>
                <p className="text-slate-400 text-center text-sm mb-8">
                    Sistema POS · Ingresa tu cuenta
                </p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="admin@tucan.app"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg text-center font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-lg shadow-blue-600/20"
                    >
                        {loading ? 'Entrando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <p className="text-slate-500 text-center text-[10px] mt-8 uppercase tracking-widest font-bold">
                    v0.1.0 · Caracas, VZLA
                </p>
            </div>
        </div>
    )
}

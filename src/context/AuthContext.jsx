// src/context/AuthContext.jsx
// Modo prueba: sin login, siempre admin
export const DEFAULT_ADMIN = {
    uid: 'admin-placeholder',
    email: 'admin@tucan.app',
}

export const DEFAULT_ADMIN_UID = 'admin-placeholder'

export const useAuth = () => ({
    user: DEFAULT_ADMIN,
    role: 'admin',
    loading: false,
})

// AuthProvider exists for compatibility but does nothing
export function AuthProvider({ children }) {
    return children
}
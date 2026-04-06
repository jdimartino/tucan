// src/App.jsx
import { AuthProvider, useAuth } from './context/AuthContext'
import { SessionProvider } from './context/SessionContext'
import { CartProvider } from './context/CartContext'
import { NavigationProvider, useNav } from './context/NavigationContext'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { useSessionSync } from './hooks/useSessionSync'
import LoginPage from './pages/LoginPage'
import POSPage from './pages/POSPage'
import TicketPage from './pages/TicketPage'
import SuccessPage from './pages/SuccessPage'
import AdminPage from './pages/AdminPage'
import HoldPage from './pages/HoldPage'

// Recupera sesión de Firestore si localStorage fue limpiado
function SessionGate({ children }) {
  const { recovering } = useSessionSync()
  if (recovering) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return children
}

// Router interno del cajero (pos → ticket → success)
function CashierRouter() {
  const { screen } = useNav()
  if (screen === 'ticket') return <TicketPage />
  if (screen === 'success') return <SuccessPage />
  if (screen === 'hold') return <HoldPage />
  return <POSPage />
}

function AppRouter() {
  const { user, role } = useAuth()

  // Sin sesión → Login
  if (!user) return <LoginPage />

  // Admin → puede usar el Panel Admin O el POS como cajero
  if (role === 'admin') {
    return (
      <SessionProvider>
        <SessionGate>
          <CartProvider>
            <NavigationProvider>
              <AdminOrPOS />
            </NavigationProvider>
          </CartProvider>
        </SessionGate>
      </SessionProvider>
    )
  }

  // Cajero → flujo POS
  return (
    <SessionProvider>
      <SessionGate>
        <CartProvider>
          <NavigationProvider>
            <CashierRouter />
          </NavigationProvider>
        </CartProvider>
      </SessionGate>
    </SessionProvider>
  )
}

// El admin puede cambiar entre su panel y el POS
function AdminOrPOS() {
  const { screen } = useNav()
  if (screen === 'ticket') return <TicketPage />
  if (screen === 'success') return <SuccessPage />
  if (screen === 'pos') return <POSPage />
  if (screen === 'hold') return <HoldPage />
  return <AdminPage />
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

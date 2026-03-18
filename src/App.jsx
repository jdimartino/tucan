// src/App.jsx
import { AuthProvider, useAuth } from './context/AuthContext'
import { SessionProvider } from './context/SessionContext'
import { CartProvider } from './context/CartContext'
import { NavigationProvider, useNav } from './context/NavigationContext'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import POSPage from './pages/POSPage'
import TicketPage from './pages/TicketPage'
import SuccessPage from './pages/SuccessPage'
import AdminPage from './pages/AdminPage'
import HoldPage from './pages/HoldPage'

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
        <CartProvider>
          <NavigationProvider>
            <AdminOrPOS />
          </NavigationProvider>
        </CartProvider>
      </SessionProvider>
    )
  }

  // Cajero → flujo POS
  return (
    <SessionProvider>
      <CartProvider>
        <NavigationProvider>
          <CashierRouter />
        </NavigationProvider>
      </CartProvider>
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

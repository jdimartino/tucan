// src/App.jsx
import { AuthProvider, useAuth } from './context/AuthContext'
import { SessionProvider } from './context/SessionContext'
import { CartProvider } from './context/CartContext'
import { NavigationProvider, useNav } from './context/NavigationContext'
import LoginPage from './pages/LoginPage'
import POSPage from './pages/POSPage'
import TicketPage from './pages/TicketPage'
import SuccessPage from './pages/SuccessPage'
import AdminPage from './pages/AdminPage'

// Router interno del cajero (pos → ticket → success)
function CashierRouter() {
  const { screen } = useNav()
  if (screen === 'ticket') return <TicketPage />
  if (screen === 'success') return <SuccessPage />
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
  // Si el screen es 'ticket' o 'success', renderiza esas pantallas
  if (screen === 'ticket') return <TicketPage />
  if (screen === 'success') return <SuccessPage />
  if (screen === 'pos') return <POSPage />
  // Por defecto, panel admin
  return <AdminPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}

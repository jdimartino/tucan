// src/App.jsx
import { SessionProvider } from './context/SessionContext'
import { CartProvider } from './context/CartContext'
import { NavigationProvider, useNav } from './context/NavigationContext'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { useSessionSync } from './hooks/useSessionSync'
import POSPage from './pages/POSPage'
import TicketPage from './pages/TicketPage'
import SuccessPage from './pages/SuccessPage'
import AdminPage from './pages/AdminPage'
import HoldPage from './pages/HoldPage'

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

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <SessionProvider>
          <SessionGate>
            <CartProvider>
              <NavigationProvider>
                <AppContent />
              </NavigationProvider>
            </CartProvider>
          </SessionGate>
        </SessionProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

function AppContent() {
  const { screen } = useNav()
  if (screen === 'ticket') return <TicketPage />
  if (screen === 'success') return <SuccessPage />
  if (screen === 'pos') return <POSPage />
  if (screen === 'hold') return <HoldPage />
  return <AdminPage />
}

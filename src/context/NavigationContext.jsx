// src/context/NavigationContext.jsx
// Router mínimo sin react-router (SPA de 3 pantallas)
import { createContext, useContext, useState } from 'react'

const NavContext = createContext(null)

// screens: 'pos' | 'ticket' | 'success'
export function NavigationProvider({ children }) {
    const [screen, setScreen] = useState('pos')
    const [lastOrderId, setOrderId] = useState(null)
    const [lastOrderData, setLastOrderData] = useState(null)
    const [holdOrderId, setHoldOrderId] = useState(null)

    return (
        <NavContext.Provider value={{ screen, setScreen, lastOrderId, setOrderId, lastOrderData, setLastOrderData, holdOrderId, setHoldOrderId }}>
            {children}
        </NavContext.Provider>
    )
}

export const useNav = () => useContext(NavContext)

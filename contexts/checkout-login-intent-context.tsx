"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

// Puente entre el banner de invitado en /checkout y el modal de login que vive
// dentro de Header: ambos son hermanos bajo RouteAwareChrome, así que el
// banner no puede llamar al estado del modal directamente. `loginRequestCount`
// es la señal (Header la observa y abre su modal cada vez que cambia), igual
// que el guard por ref que Header ya usa para el intent `?auth=login`.
interface CheckoutLoginIntentContextType {
  loginRequestCount: number
  requestLogin: () => void
}

const CheckoutLoginIntentContext = createContext<CheckoutLoginIntentContextType | undefined>(undefined)

export function CheckoutLoginIntentProvider({ children }: { children: ReactNode }) {
  const [loginRequestCount, setLoginRequestCount] = useState(0)

  const requestLogin = () => {
    setLoginRequestCount((count) => count + 1)
  }

  return (
    <CheckoutLoginIntentContext.Provider value={{ loginRequestCount, requestLogin }}>
      {children}
    </CheckoutLoginIntentContext.Provider>
  )
}

export function useCheckoutLoginIntent() {
  const context = useContext(CheckoutLoginIntentContext)
  if (context === undefined) {
    throw new Error("useCheckoutLoginIntent debe usarse dentro de CheckoutLoginIntentProvider")
  }
  return context
}

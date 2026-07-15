import { ReactNode } from "react"

interface MainContentWrapperProps {
  children: ReactNode
}

export function MainContentWrapper({ children }: MainContentWrapperProps) {
  return <div className="min-h-screen">{children}</div>
}

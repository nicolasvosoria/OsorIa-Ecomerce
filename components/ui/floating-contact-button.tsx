"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, X, Bot } from "lucide-react"
import Link from "next/link"
import { Chatbot } from "@/components/chatbot/chatbot"
import { useAdmin } from "@/contexts/admin-context"
import { useLanguage } from "@/contexts/language-context"

// Icono oficial de WhatsApp
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

export function FloatingContactButton() {
  // Llamar todos los hooks primero, antes de cualquier lógica condicional
  const [isOpen, setIsOpen] = useState(false)
  const [chatbotOpen, setChatbotOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // useAdmin debe llamarse después de los useState pero antes de los useEffect
  // para mantener el orden consistente de hooks
  const { isAdmin, isEditMode, selectedComponent } = useAdmin()
  const { t } = useLanguage()
  
  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleOptionClick = () => {
    setIsOpen(false)
  }

  // Ocultar el botón de contáctanos si el usuario es administrador
  if (isAdmin) {
    return null
  }

  // Ajustar posición cuando el panel de edición está abierto solo en desktop
  // En móviles, el panel es overlay completo, así que no necesitamos ajustar la posición
  const rightOffset = !isMobile && isEditMode && selectedComponent ? "28rem" : "1.5rem" // 28rem = 448px (384px + 64px de margen)

  return (
    <div 
      ref={menuRef} 
      className="fixed bottom-6 z-50 transition-all duration-300 md:transition-all md:duration-300"
      style={{ right: rightOffset }}
    >
      {/* Opciones del menú en arco */}
      <div className="absolute bottom-14 right-0">
        {/* Opción WhatsApp - posición superior derecha */}
        <Link
          href="https://wa.me/1234567890"
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOptionClick}
          className={`absolute flex items-center gap-3 rounded-full px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-300 ${
            isOpen ? "opacity-100 scale-100 translate-x-0 translate-y-0 pointer-events-auto" : "opacity-0 scale-0 translate-x-4 translate-y-4 pointer-events-none"
          }`}
          style={{
            backgroundColor: "var(--card)",
            color: "var(--card-foreground)",
            border: "1px solid var(--border)",
            right: "0px",
            bottom: "10px",
            transitionDelay: isOpen ? "0.1s" : "0s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)"
            e.currentTarget.style.backgroundColor = "var(--muted)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)"
            e.currentTarget.style.backgroundColor = "var(--card)"
          }}
        >
          <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
          <span className="font-semibold text-sm whitespace-nowrap">{t.contact.whatsapp}</span>
        </Link>

        {/* Opción Chatbot - posición superior izquierda */}
        <button
          onClick={() => {
            setChatbotOpen(true)
            handleOptionClick()
          }}
          className={`absolute flex items-center gap-3 rounded-full px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-300 ${
            isOpen ? "opacity-100 scale-100 translate-x-0 translate-y-0 pointer-events-auto" : "opacity-0 scale-0 translate-x-4 translate-y-4 pointer-events-none"
          }`}
          style={{
            backgroundColor: "var(--card)",
            color: "var(--card-foreground)",
            border: "1px solid var(--border)",
            right: "0px",
            bottom: "70px",
            transitionDelay: isOpen ? "0.05s" : "0s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)"
            e.currentTarget.style.backgroundColor = "var(--muted)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)"
            e.currentTarget.style.backgroundColor = "var(--card)"
          }}
        >
          <Bot className="h-5 w-5" />
          <span className="font-semibold text-sm whitespace-nowrap">{t.contact.chatbot}</span>
        </button>
      </div>

      {/* Botón principal */}
      <Button
        onClick={toggleMenu}
        className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 h-14 px-4 gap-2"
        style={{
          backgroundColor: isOpen ? "var(--destructive)" : "var(--accent)",
          color: "var(--accent-foreground)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.transform = "scale(1.1)"
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.transform = "scale(1)"
          }
        }}
      >
        {isOpen ? (
          <>
            <X className="h-5 w-5 transition-transform duration-300" style={{ color: "var(--accent-foreground)" }} />
            <span className="font-semibold text-sm whitespace-nowrap">{t.contact.close}</span>
          </>
        ) : (
          <>
            <MessageSquare className="h-5 w-5 transition-transform duration-300" style={{ color: "var(--accent-foreground)" }} />
            <span className="font-semibold text-sm whitespace-nowrap">{t.contact.contactUs}</span>
          </>
        )}
      </Button>

      {/* Chatbot */}
      <Chatbot isOpen={chatbotOpen} onClose={() => setChatbotOpen(false)} />
    </div>
  )
}


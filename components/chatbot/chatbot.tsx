"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Send, Bot, User, Loader2 } from "lucide-react"

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

// Base de conocimiento del chatbot
const knowledgeBase: Record<string, string> = {
  // Saludos
  "hola": "¡Hola! 👋 Bienvenido a nuestra tienda. ¿En qué puedo ayudarte hoy?",
  "buenos días": "¡Buenos días! ☀️ ¿Cómo puedo ayudarte hoy?",
  "buenas tardes": "¡Buenas tardes! 🌅 ¿En qué puedo asistirte?",
  "buenas noches": "¡Buenas noches! 🌙 ¿Necesitas ayuda con algo?",
  "saludos": "¡Hola! 👋 Estoy aquí para ayudarte. ¿Qué necesitas?",
  
  // Información de la tienda
  "horario": "Nuestro horario de atención es de lunes a viernes de 9:00 AM a 6:00 PM, y sábados de 10:00 AM a 2:00 PM. 🕐",
  "horarios": "Nuestro horario de atención es de lunes a viernes de 9:00 AM a 6:00 PM, y sábados de 10:00 AM a 2:00 PM. 🕐",
  "ubicación": "Puedes encontrarnos en nuestra tienda física o realizar compras online desde cualquier lugar. 📍",
  "dirección": "Puedes encontrarnos en nuestra tienda física o realizar compras online desde cualquier lugar. 📍",
  "contacto": "Puedes contactarnos a través de WhatsApp, por correo electrónico o visitando nuestra tienda. 📞",
  "teléfono": "Puedes contactarnos a través de WhatsApp, por correo electrónico o visitando nuestra tienda. 📞",
  "telefono": "Puedes contactarnos a través de WhatsApp, por correo electrónico o visitando nuestra tienda. 📞",
  
  // Productos
  "productos": "Tenemos una amplia variedad de productos disponibles. Puedes explorar nuestro catálogo navegando por las categorías en el menú. 🛍️",
  "catálogo": "Puedes ver todos nuestros productos navegando por las diferentes categorías en el menú principal. 📦",
  "catalogo": "Puedes ver todos nuestros productos navegando por las diferentes categorías en el menú principal. 📦",
  "precio": "Los precios varían según el producto. Puedes ver el precio de cada artículo en su página de detalles. 💰",
  "precios": "Los precios varían según el producto. Puedes ver el precio de cada artículo en su página de detalles. 💰",
  "descuento": "Ofrecemos descuentos especiales en diferentes temporadas. Revisa nuestra sección de ofertas para ver las promociones actuales. 🎉",
  "descuentos": "Ofrecemos descuentos especiales en diferentes temporadas. Revisa nuestra sección de ofertas para ver las promociones actuales. 🎉",
  "oferta": "Revisa nuestra sección de ofertas para ver las promociones actuales. 🎁",
  "ofertas": "Revisa nuestra sección de ofertas para ver las promociones actuales. 🎁",
  
  // Carrito y compras
  "carrito": "Puedes agregar productos al carrito haciendo clic en el botón 'Agregar al carrito' en cualquier producto. 🛒",
  "comprar": "Para comprar, primero agrega los productos que deseas al carrito, luego ve al carrito y haz clic en 'Finalizar compra'. 💳",
  "pago": "Aceptamos múltiples métodos de pago: tarjeta de crédito, débito, transferencia bancaria y más. 💳",
  "pagos": "Aceptamos múltiples métodos de pago: tarjeta de crédito, débito, transferencia bancaria y más. 💳",
  "envío": "Ofrecemos envío a todo el país. Los tiempos de entrega varían según tu ubicación. 🚚",
  "envios": "Ofrecemos envío a todo el país. Los tiempos de entrega varían según tu ubicación. 🚚",
  "entrega": "Los tiempos de entrega varían según tu ubicación. Generalmente entre 3 a 7 días hábiles. 📦",
  "entregas": "Los tiempos de entrega varían según tu ubicación. Generalmente entre 3 a 7 días hábiles. 📦",
  
  // Cuenta y registro
  "registro": "Para registrarte, haz clic en el botón 'Iniciar sesión' y luego selecciona 'Registrarse'. Crea una cuenta con tu correo electrónico. 📝",
  "registrarse": "Para registrarte, haz clic en el botón 'Iniciar sesión' y luego selecciona 'Registrarse'. Crea una cuenta con tu correo electrónico. 📝",
  "cuenta": "Puedes crear una cuenta haciendo clic en 'Iniciar sesión' y luego 'Registrarse'. Con una cuenta podrás personalizar tu experiencia. 👤",
  "login": "Puedes iniciar sesión haciendo clic en el botón 'Iniciar sesión' en la parte superior de la página. 🔐",
  "iniciar sesión": "Puedes iniciar sesión haciendo clic en el botón 'Iniciar sesión' en la parte superior de la página. 🔐",
  
  // Personalización
  "tema": "Si tienes una cuenta, puedes personalizar el tema de la página desde el menú de usuario. 🎨",
  "temas": "Si tienes una cuenta, puedes personalizar el tema de la página desde el menú de usuario. 🎨",
  "fuente": "Si tienes una cuenta, puedes cambiar la fuente de la página desde el menú de usuario. ✍️",
  "fuentes": "Si tienes una cuenta, puedes cambiar la fuente de la página desde el menú de usuario. ✍️",
  
  // Ayuda general
  "ayuda": "Estoy aquí para ayudarte. Puedes preguntarme sobre productos, compras, envíos, pagos o cualquier otra consulta. ¿En qué más puedo asistirte? 🤝",
  "información": "Puedo ayudarte con información sobre productos, compras, envíos, pagos y más. ¿Qué necesitas saber? ℹ️",
  "informacion": "Puedo ayudarte con información sobre productos, compras, envíos, pagos y más. ¿Qué necesitas saber? ℹ️",
  
  // Despedidas
  "gracias": "¡De nada! 😊 Si necesitas algo más, no dudes en preguntar. ¡Que tengas un excelente día!",
  "adios": "¡Hasta luego! 👋 Espero haberte ayudado. ¡Vuelve pronto!",
  "adiós": "¡Hasta luego! 👋 Espero haberte ayudado. ¡Vuelve pronto!",
  "chao": "¡Hasta luego! 👋 ¡Que tengas un excelente día!",
}

// Función para encontrar la respuesta más relevante
function findAnswer(question: string): string {
  const normalizedQuestion = question.toLowerCase().trim()
  
  // Buscar coincidencia exacta
  if (knowledgeBase[normalizedQuestion]) {
    return knowledgeBase[normalizedQuestion]
  }
  
  // Buscar coincidencias parciales
  for (const [key, value] of Object.entries(knowledgeBase)) {
    if (normalizedQuestion.includes(key) || key.includes(normalizedQuestion)) {
      return value
    }
  }
  
  // Respuesta por defecto
  return "Lo siento, no entiendo esa pregunta. 😅 Puedo ayudarte con información sobre productos, compras, envíos, pagos, horarios y más. ¿Puedes reformular tu pregunta? 💬"
}

interface ChatbotProps {
  isOpen: boolean
  onClose: () => void
}

export function Chatbot({ isOpen, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "¡Hola! 👋 Soy tu asistente virtual con IA. ¿En qué puedo ayudarte hoy?",
      sender: "bot",
      timestamp: typeof window !== 'undefined' ? new Date() : new Date(0),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Función para obtener respuesta de DeepSeek (timeout 55s para dar margen en Vercel)
  const getDeepSeekResponse = async (userMessages: Message[]): Promise<string | null> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 55000)
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: userMessages }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        console.error("[Chatbot] API error:", response.status, errBody)
        return null
      }

      const data = await response.json()
      return data.message || null
    } catch (error) {
      console.error("[Chatbot] Error calling chat API:", error)
      return null
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: typeof window !== 'undefined' ? new Date() : new Date(0),
    }

    const currentInput = inputValue
    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      // Intentar obtener respuesta de DeepSeek
      const allMessages = [...messages, userMessage]
      const aiResponse = await getDeepSeekResponse(allMessages)

      let botResponseText: string

      if (aiResponse) {
        botResponseText = aiResponse
      } else {
        // La API falló (timeout, error en Vercel, etc.): no dar respuesta genérica de catálogo para no confundir
        const fallback = findAnswer(currentInput)
        const looksLikeCatalogQuestion = /catalogo|catálogo|productos|qué tienen|que tienen|cuéntame|hablame/i.test(currentInput)
        botResponseText = looksLikeCatalogQuestion
          ? "No pude cargar el catálogo en este momento. Comprueba tu conexión e inténtalo de nuevo en unos segundos. Si el problema continúa, navega por las categorías del menú para ver los productos."
          : fallback
      }

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        sender: "bot",
        timestamp: typeof window !== 'undefined' ? new Date() : new Date(0),
      }

      setMessages((prev) => [...prev, botResponse])
    } catch (error) {
      const looksLikeCatalogQuestion = /catalogo|catálogo|productos|qué tienen|que tienen|cuéntame|hablame/i.test(currentInput)
      const text = looksLikeCatalogQuestion
        ? "No pude conectar con el asistente. Inténtalo de nuevo en unos segundos."
        : findAnswer(currentInput)
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text,
        sender: "bot",
        timestamp: typeof window !== 'undefined' ? new Date() : new Date(0),
      }
      setMessages((prev) => [...prev, botResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 pointer-events-auto"
        onClick={onClose}
      />

      {/* Chatbot Window */}
      <div
        className="relative w-full max-w-md h-[600px] max-h-[80vh] flex flex-col rounded-t-lg shadow-2xl pointer-events-auto"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-full"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <Bot className="h-5 w-5" style={{ color: "var(--accent-foreground)" }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: "var(--card-foreground)" }}>
                Asistente Virtual
              </h3>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                En línea
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.sender === "bot" && (
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  <Bot className="h-4 w-4" style={{ color: "var(--accent-foreground)" }} />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                  message.sender === "user"
                    ? "rounded-br-none"
                    : "rounded-bl-none"
                }`}
                style={{
                  backgroundColor:
                    message.sender === "user"
                      ? "var(--accent)"
                      : "var(--muted)",
                  color:
                    message.sender === "user"
                      ? "var(--accent-foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
              {message.sender === "user" && (
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "var(--muted)" }}
                >
                  <User className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
                </div>
              )}
            </div>
          ))}
          
          {/* Indicador de carga */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <Bot className="h-4 w-4" style={{ color: "var(--accent-foreground)" }} />
              </div>
              <div
                className="max-w-[75%] rounded-lg px-4 py-2 rounded-bl-none"
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Pensando...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="p-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta..."
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground)",
              }}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


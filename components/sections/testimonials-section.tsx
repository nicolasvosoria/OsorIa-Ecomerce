"use client"

import { Quote } from 'lucide-react'
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

const defaultTestimonials = [
  {
    id: "1",
    quote:
      "Como barista, siempre busco café de calidad para ofrecer la mejor experiencia a mis clientes. Highlands Café es simplemente excepcional: su sabor es único y sus notas frutales conquistan a todos los que lo prueban. ¡Nuestros clientes siempre nos piden más!",
    author: "Roberto Silva",
    role: 'Propietaria de "Café & Co."',
    image: "/barista-professional-portrait.jpg",
  },
  {
    id: "2",
    quote:
      "Llevo años buscando un café que sepa a café, sin tantos procesos industriales. Highlands Café me ha sorprendido con su autenticidad. Me encanta que sea de origen Huila, ¡y cada taza es un viaje directo a la montaña!",
    author: "Miguel Ramírez",
    role: "Amante del Café",
    image: "/coffee-lover-happy-customer-portrait.jpg",
  },
  {
    id: "3",
    quote:
      "Trabajamos con Highlands Café porque entendemos el trabajo y la pasión que hay detrás de cada grano. El sabor y la textura de su café realmente destacan entre la competencia. Sin duda, nuestros clientes siempre lo eligen.",
    author: "Andrés Morales",
    role: 'Propietario de "El Rincón del Café"',
    image: "/cafe-owner-professional-portrait.jpg",
  },
]

export function TestimonialsSection() {
  const style = useComponentStyle("testimonials")
  const { componentEdits } = useAdmin()
  
  const edits = componentEdits.get("testimonials") || {}
  const styleData = style as any
  const title = edits.title || styleData.title || "\"Clientes Felices, Tazas Llenas de Gratitud\""
  const description = edits.description || styleData.description || "Cada taza de Highlands Café cuenta una historia, y nuestros clientes son los protagonistas. Desde apasionados del café hasta baristas, tiendas gourmet y cafeterías en Colombia y el mundo, todos coinciden en algo: el sabor auténtico del Huila no se olvida. Gracias por confiar en nosotros, ¡su felicidad es nuestro mejor sello de calidad!"
  const testimonials = edits.testimonials || styleData.testimonials || defaultTestimonials
  
  const bgColor = edits.bgColor || styleData.bgColor
  const textColor = edits.textColor || styleData.textColor

  return (
    <section 
      className="py-16 md:py-24 bg-background"
      style={{ ...(bgColor && { backgroundColor: bgColor }) }}
    >
      <div className="container mx-auto px-sides">
        <div className="text-center mb-12">
          <h2 
            className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance leading-tight"
            style={{ ...(textColor && { color: textColor }) }}
          >
            {title}
          </h2>
          <p 
            className="text-base md:text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed"
            style={{ ...(textColor && { color: textColor, opacity: 0.8 }) }}
          >
            {description}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial: any) => (
            <div key={testimonial.id} className="bg-card p-6 rounded-lg shadow-sm">
              <Quote className="w-8 h-8 text-primary mb-4" />
              <p 
                className="text-muted-foreground mb-6 leading-relaxed"
                style={{ ...(textColor && { color: textColor, opacity: 0.8 }) }}
              >
                {testimonial.quote}
              </p>
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.image || "/placeholder.svg"}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p 
                    className="font-bold text-foreground"
                    style={{ ...(textColor && { color: textColor }) }}
                  >
                    {testimonial.author}
                  </p>
                  <p 
                    className="text-sm text-muted-foreground"
                    style={{ ...(textColor && { color: textColor, opacity: 0.7 }) }}
                  >
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

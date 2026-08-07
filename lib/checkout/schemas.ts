import { z } from "zod"

import { enabledPaymentMethodIds, normalizePaymentMethod } from "@/lib/checkout/payment-methods"

// Shape mínima de los items que arma el checkout; precios y totales son solo
// informativos porque createOrder los reprecia contra la base de datos.
const checkoutOrderItemSchema = z.object({
  product_id: z.string().optional(),
  product_name: z.string().min(1),
  product_sku: z.string().optional(),
  variant_id: z.string().optional(),
  variant_title: z.string().optional(),
  unit_price: z.number(),
  quantity: z.number().int().positive(),
  total_price: z.number(),
  currency_code: z.string().optional(),
  product_image_url: z.string().optional(),
  product_slug: z.string().optional(),
  selected_options: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
})

// Solo los datos que legítimamente decide el cliente. Lo que el servidor
// fuerza (user_id, customer_type, payment_status, payment_reference, totales)
// queda fuera a propósito: la action lo resuelve de la sesión y del repricing.
export const checkoutOrderSchema = z.object({
  customer_first_name: z.string().trim().min(1, "El nombre es requerido"),
  customer_last_name: z.string().trim().min(1, "El apellido es requerido"),
  customer_email: z.string().trim().email("El correo electrónico no es válido"),
  customer_phone: z.string().optional(),
  shipping_address: z.string().trim().min(1, "La dirección es requerida"),
  // D28: los dos selects encadenados (departamento, luego municipio filtrado)
  // escriben estos cuatro campos juntos -- shipping_location_id es el FK a
  // co_locations (D2/D30) y los otros tres son su copia congelada al momento
  // de la compra. shipping_city sigue siendo el nombre del municipio, mismo
  // campo de siempre, ahora poblado por el picker en vez de texto libre.
  shipping_department_code: z.string().trim().min(1, "Selecciona un departamento"),
  shipping_department_name: z.string().trim().min(1, "Selecciona un departamento"),
  shipping_city: z.string().trim().min(1, "Selecciona un municipio"),
  shipping_municipality_code: z.string().trim().min(1, "Selecciona un municipio"),
  shipping_location_id: z.string().trim().min(1, "Selecciona un municipio"),
  shipping_postal_code: z.string().default(""),
  shipping_country: z.string().optional(),
  shipping_notes: z.string().optional(),
  notes: z.string().optional(),
  // Un método fuera del registry no tumba el pedido: se normaliza al método
  // habilitado por defecto, igual que hacía el endpoint anterior.
  payment_method: z.unknown().transform(normalizePaymentMethod),
  items: z.array(checkoutOrderItemSchema).min(1, "El carrito está vacío"),
})

export type CheckoutOrderInput = z.input<typeof checkoutOrderSchema>

// El teléfono es opcional para la action (createOrder no depende de él), pero
// el checkout siempre lo pidió al cliente: eso es una regla de formulario, no
// del contrato del servidor, así que vive en los schemas derivados de abajo.
const REQUIRED_PHONE_MESSAGE = "El teléfono es requerido"
const requiredPhoneField = z.string().trim().min(1, REQUIRED_PHONE_MESSAGE)

// El radio de método de pago solo puede emitir un id habilitado, pero se
// revalida igual por si un método se deshabilita entre que se carga el
// formulario y se envía (la action también renormaliza, esto es defensa en el cliente).
const paymentMethodField = z
  .string()
  .refine((value) => enabledPaymentMethodIds().includes(value), "Selecciona un método de pago")

// Lo que edita el formulario de invitado: todo el pedido salvo "items" (los arma
// el carrito) y "notes" (el formulario no lo pide). Deriva de checkoutOrderSchema
// con pick/omit para no duplicar sus reglas de validación.
export const guestCheckoutFormSchema = checkoutOrderSchema.omit({ items: true, notes: true }).extend({
  customer_phone: requiredPhoneField,
  payment_method: paymentMethodField,
})

export type GuestCheckoutFormValues = z.input<typeof guestCheckoutFormSchema>

// Lo que edita un usuario autenticado: el correo ya viene de su cuenta (es su
// identidad), pero el nombre puede faltar en el perfil, así que el formulario
// lo pide igual que el invitado y lo precarga cuando el perfil lo trae. D24:
// misma tarjeta de envío que el invitado -- dirección, departamento y
// municipio -- así que se listan explícitamente aquí; a diferencia de
// guestCheckoutFormSchema (que usa .omit y hereda campos nuevos solos), este
// .pick exige agregar cada campo nuevo a mano o el formulario autenticado se
// queda sin él en silencio.
export const authenticatedCheckoutFormSchema = checkoutOrderSchema
  .pick({
    customer_first_name: true,
    customer_last_name: true,
    shipping_address: true,
    shipping_department_code: true,
    shipping_department_name: true,
    shipping_city: true,
    shipping_municipality_code: true,
    shipping_location_id: true,
    shipping_postal_code: true,
    shipping_country: true,
  })
  .extend({
    customer_phone: requiredPhoneField,
    payment_method: paymentMethodField,
  })

export type AuthenticatedCheckoutFormValues = z.input<typeof authenticatedCheckoutFormSchema>

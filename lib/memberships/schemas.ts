import { z } from "zod"

import { STORE_ROLE_NAMES } from "./roles"

export const addMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El correo es requerido")
    .email("Ingresa un correo válido"),
  role: z.enum(STORE_ROLE_NAMES),
})

export type AddMemberFormValues = z.infer<typeof addMemberSchema>

// La regla de contraseña del producto: la misma que aplica la recuperación por
// correo y el cambio desde la cuenta. Aquí se decide cuál es el problema; el
// mensaje lo pone cada pantalla, que es donde vive el copy traducido.
export const MIN_PASSWORD_LENGTH = 6

export type PasswordProblem = "incomplete" | "tooShort" | "mismatch"

export function findPasswordProblem({
  newPassword,
  confirmation,
}: {
  newPassword: string
  confirmation: string
}): PasswordProblem | null {
  if (!newPassword || !confirmation) {
    return "incomplete"
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return "tooShort"
  }
  if (newPassword !== confirmation) {
    return "mismatch"
  }
  return null
}

export type PasswordFieldErrors = {
  currentPassword?: string
  newPassword?: string
  confirmation?: string
}

// Qué campo se queda con el aviso: el toast aparece lejos del formulario y se va
// solo, así que el mensaje tiene que quedarse donde se corrige. La recuperación
// por correo no pide la contraseña actual, y un campo que no existe no se puede
// señalar: por eso ausente no es lo mismo que vacío.
export function blamePasswordFields({
  problem,
  message,
  typed,
}: {
  problem: PasswordProblem
  message: string
  typed: { currentPassword?: string; newPassword: string; confirmation: string }
}): PasswordFieldErrors {
  if (problem === "tooShort") {
    return { newPassword: message }
  }
  if (problem === "mismatch") {
    return { confirmation: message }
  }
  return {
    currentPassword: typed.currentPassword === "" ? message : undefined,
    newPassword: typed.newPassword ? undefined : message,
    confirmation: typed.confirmation ? undefined : message,
  }
}

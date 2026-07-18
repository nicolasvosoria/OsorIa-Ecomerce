export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  operation: string = 'operation',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms en ${operation}`)), timeoutMs),
    ),
  ])
}

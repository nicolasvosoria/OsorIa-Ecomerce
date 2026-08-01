// El nombre de la tienda llega a la página del aviso en el header `x-store-name`
// que minta el proxy, y un header HTTP solo transporta ASCII. El proxy escribe el
// nombre crudo y el servidor Node de Next lo entrega intacto (verificado con
// `next dev`: "Cumbre Dorada Café" llega sin tocar), pero el transporte de Vercel
// que lleva los headers de petición del middleware a la función que renderiza
// codifica en UTF-8 porcentual cada byte no ASCII: en producción llegaba
// "Cumbre Dorada Caf%C3%A9" y el aviso se lo imprimía crudo al cliente. Quien
// codifica es la plataforma, no el proxy, así que el lector acepta las dos formas.
export function resolveStoreNameFromHeader(headerValue: string | null): string | null {
  if (!headerValue) {
    return null
  }

  return decodeTransportEncoding(headerValue).trim() || null
}

// `decodeURIComponent` lanza ante una secuencia mal formada —un `%` suelto, que es
// justo lo que llega cuando el nombre lleva un `%` literal y el transporte no tuvo
// bytes no ASCII que codificar—. Eso no es un fallo: significa que el valor viajó
// sin codificar, así que se usa crudo. Lanzar aquí tumbaría el aviso, que es la
// página que existe precisamente para cuando algo va mal.
function decodeTransportEncoding(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export type MedidasFoto = { ancho: number; alto: number }

/**
 * Lee el ancho y el alto visibles en el navegador (la orientación EXIF ya
 * aplicada por el elemento Image). El endpoint de la foto no los recibe: el
 * backend los calcula al guardar el archivo.
 */
export function medirFoto(archivo: File): Promise<MedidasFoto | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(archivo)
    const imagen = new Image()
    const terminar = (medidas: MedidasFoto | null) => {
      URL.revokeObjectURL(url)
      resolve(medidas)
    }
    imagen.onload = () => {
      const ancho = imagen.naturalWidth
      const alto = imagen.naturalHeight
      terminar(ancho > 0 && alto > 0 ? { ancho, alto } : null)
    }
    imagen.onerror = () => terminar(null)
    imagen.src = url
  })
}

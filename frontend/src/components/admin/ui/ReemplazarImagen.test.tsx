import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReemplazarImagen } from '@/components/admin/ui/ReemplazarImagen'

afterEach(() => {
  cleanup()
})

function Harness({ src = null }: { src?: string | null }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  return <ReemplazarImagen src={src} archivo={archivo} onArchivo={setArchivo} />
}

function elegir(archivo: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [archivo] } })
}

describe('ReemplazarImagen', () => {
  it('rechaza un tipo o un tamaño inválido', () => {
    render(<Harness />)

    elegir(new File(['nota'], 'nota.txt', { type: 'text/plain' }))
    expect(screen.getByRole('alert').textContent).toBe(
      'La imagen debe ser JPG, PNG o WebP de hasta 5 MB.',
    )
    expect(screen.queryByRole('img', { name: 'Imagen actual del bloque' })).toBeNull()

    elegir(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }))
    expect(screen.getByRole('alert').textContent).toBe(
      'La imagen debe ser JPG, PNG o WebP de hasta 5 MB.',
    )
  })

  it('muestra la vista previa del archivo válido y la limpia al descartar', () => {
    render(<Harness />)

    elegir(new File(['png'], 'bloque.png', { type: 'image/png' }))
    const vista = screen.getByRole('img', { name: 'Imagen actual del bloque' })
    expect(vista.getAttribute('src')).toMatch(/^blob:/)

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.queryByRole('img', { name: 'Imagen actual del bloque' })).toBeNull()
  })
})

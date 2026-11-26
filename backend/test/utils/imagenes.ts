/**
 * Cabeceras mínimas de imagen: bastan para detectar el tipo y leer las
 * dimensiones, sin guardar archivos binarios en el repositorio.
 */

const hex = (bytes: string): Buffer =>
  Buffer.from(bytes.replaceAll(' ', ''), 'hex');

const uint16 = (valor: number): Buffer => {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16BE(valor);
  return bytes;
};

/** Segmento JPG: marcador, longitud (se incluye a sí misma) y contenido. */
const segmento = (marcador: number, contenido: Buffer): Buffer =>
  Buffer.concat([
    Buffer.from([0xff, marcador]),
    uint16(contenido.length + 2),
    contenido,
  ]);

/** Bloque EXIF big-endian con una sola entrada: Orientation (0x0112). */
const exif = (orientacion: number): Buffer =>
  Buffer.concat([
    Buffer.from('Exif\0\0'),
    hex('4d4d 002a 00000008 0001 0112 0003 00000001'),
    uint16(orientacion),
    hex('0000 00000000'),
  ]);

/** JPG de `ancho` × `alto`; con `orientacion` añade el bloque EXIF. */
export function crearJpg(
  ancho: number,
  alto: number,
  orientacion?: number,
): Buffer {
  const aplicacion =
    orientacion === undefined
      ? segmento(0xe0, hex('4a46494600 0101 00 0001 0001 0000'))
      : segmento(0xe1, exif(orientacion));
  const marco = segmento(
    0xc0,
    Buffer.concat([
      hex('08'),
      uint16(alto),
      uint16(ancho),
      hex('03 012200 021101 031101'),
    ]),
  );

  return Buffer.concat([hex('ffd8'), aplicacion, marco, hex('ffd9')]);
}

export function crearPng(ancho: number, alto: number): Buffer {
  const cabecera = Buffer.alloc(33);
  hex('89504e470d0a1a0a').copy(cabecera);
  cabecera.writeUInt32BE(13, 8);
  cabecera.write('IHDR', 12, 'ascii');
  cabecera.writeUInt32BE(ancho, 16);
  cabecera.writeUInt32BE(alto, 20);
  return cabecera;
}

export function crearWebp(ancho: number, alto: number): Buffer {
  const archivo = Buffer.alloc(30);
  archivo.write('RIFF', 0, 'ascii');
  archivo.writeUInt32LE(22, 4);
  archivo.write('WEBPVP8X', 8, 'ascii');
  archivo.writeUInt32LE(10, 16);
  archivo.writeUIntLE(ancho - 1, 24, 3);
  archivo.writeUIntLE(alto - 1, 27, 3);
  return archivo;
}

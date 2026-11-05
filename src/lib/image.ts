/** Largest data URL we store per image (well under Firestore's 1 MiB document limit). */
export const MAX_IMAGE_DATA_URL = 800_000

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as an image.'))
    }
    img.src = url
  })
}

function draw(img: HTMLImageElement, maxSide: number, type: 'image/png' | 'image/jpeg', quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image processing is not available in this browser.')
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL(type, quality)
}

/** Downscales and compresses an image file into a data URL small enough to store. */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (PNG, JPG or WebP).')
  const img = await loadImage(file)

  if (file.type === 'image/png') {
    const png = draw(img, 1200, 'image/png', 1)
    if (png.length <= MAX_IMAGE_DATA_URL) return png
  }

  const attempts: { max: number; quality: number }[] = [
    { max: 1400, quality: 0.84 },
    { max: 1100, quality: 0.78 },
    { max: 900, quality: 0.7 },
    { max: 700, quality: 0.62 },
  ]
  for (const attempt of attempts) {
    const jpeg = draw(img, attempt.max, 'image/jpeg', attempt.quality)
    if (jpeg.length <= MAX_IMAGE_DATA_URL) return jpeg
  }
  throw new Error('This image is too large even after compression. Try a smaller one.')
}

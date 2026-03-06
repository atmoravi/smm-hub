// lib/image.ts

const MAX_SIZE_KB = 300
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024
const TARGET_WIDTH = 800
const TARGET_HEIGHT = 800

export async function compressImage(file: File): Promise<{ blob: Blob; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > TARGET_WIDTH) {
            height = Math.round((height * TARGET_WIDTH) / width)
            width = TARGET_WIDTH
          }
        } else {
          if (height > TARGET_HEIGHT) {
            width = Math.round((width * TARGET_HEIGHT) / height)
            height = TARGET_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Compress with quality reduction until under size limit
        let quality = 0.95
        let blob: Blob | null = null

        const tryCompress = () => {
          canvas.toBlob(
            (b) => {
              if (!b) {
                reject(new Error('Failed to compress image'))
                return
              }
              blob = b
              const sizeKB = b.size / 1024

              if (sizeKB > MAX_SIZE_KB && quality > 0.1) {
                quality -= 0.1
                tryCompress()
              } else {
                const base64 = canvas.toDataURL('image/jpeg', quality)
                resolve({ blob, base64 } as { blob: Blob; base64: string })
              }
            },
            'image/jpeg',
            quality
          )
        }

        tryCompress()
      }
      img.onerror = () => reject(new Error('Failed to load image'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Please upload a JPG, PNG, or WebP image' }
  }

  // Check file size (max 2MB before compression)
  const maxSizeBeforeCompress = 2 * 1024 * 1024 // 2MB
  if (file.size > maxSizeBeforeCompress) {
    return { valid: false, error: 'Image must be less than 2MB' }
  }

  return { valid: true }
}

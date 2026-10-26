import { supabase } from './supabaseClient'

// Обрезает картинку до квадрата и сжимает до JPEG 256x256
export async function resizeToJpeg(file, size = 256) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Не удалось открыть файл. Подойдут JPG, PNG или WebP')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1a1a21'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось обработать картинку'))),
      'image/jpeg', 0.85)
  )
}

export async function uploadAvatar(userId, blob) {
  const { error } = await supabase.storage.from('avatars').upload(`${userId}/avatar.jpg`, blob, {
    upsert: true, contentType: 'image/jpeg', cacheControl: '300',
  })
  if (error) throw error
  const { error: e2 } = await supabase.from('profiles')
    .update({ avatar_version: Date.now() }).eq('id', userId)
  if (e2) throw e2
}

export async function removeAvatar(userId) {
  const { error } = await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`])
  if (error) throw error
  const { error: e2 } = await supabase.from('profiles')
    .update({ avatar_version: 0 }).eq('id', userId)
  if (e2) throw e2
}

export async function updateUsername(userId, username) {
  const { error } = await supabase.from('profiles').update({ username }).eq('id', userId)
  if (error) throw error
}
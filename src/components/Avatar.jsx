import { useState } from 'react'
import '../profile.css'

const BASE = import.meta.env.VITE_SUPABASE_URL

export const avatarUrl = (userId, version) =>
  `${BASE}/storage/v1/object/public/avatars/${userId}/avatar.jpg${version ? `?v=${version}` : ''}`

// Фото пользователя; если фото нет, показывается первая буква имени
export default function Avatar({ userId, name = '?', version, size = 32 }) {
  const [failedUrl, setFailedUrl] = useState(null)
  const url = userId ? avatarUrl(userId, version) : null
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) }

  if (url && failedUrl !== url) {
    return (
      <img className="avatar-img" style={style} src={url} alt="" loading="lazy"
           onError={() => setFailedUrl(url)} />
    )
  }
  return (
    <span className="avatar-fallback" style={style}>
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  )
}
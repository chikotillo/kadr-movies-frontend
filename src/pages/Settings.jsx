import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import '../profile.css'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { resizeToJpeg, uploadAvatar, removeAvatar, updateUsername } from '../services/profileApi'
import Avatar from '../components/Avatar'
import { Loader } from '../components/Status'

export default function Settings() {
  const { user, profile, loading, reloadProfile } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)
  const [draft, setDraft] = useState(null) // null: поле показывает текущее имя
  const [busy, setBusy] = useState(false)

  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <Loader />

  const currentName = profile.username ?? ''
  const value = draft ?? currentName

  async function run(fn, okMessage) {
    setBusy(true)
    try {
      await fn()
      await reloadProfile()
      if (okMessage) toast(okMessage)
    } catch (e) {
      toast(e.message || 'Не получилось', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('Выберите картинку', 'error')
    if (file.size > 15 * 1024 * 1024) return toast('Файл слишком большой (максимум 15 МБ)', 'error')
    run(async () => uploadAvatar(user.id, await resizeToJpeg(file)), 'Фото обновлено')
  }

  function saveName(e) {
    e.preventDefault()
    const clean = value.trim().replace(/\s+/g, ' ')
    if (clean.length < 2 || clean.length > 24) return toast('Имя: от 2 до 24 символов', 'error')
    run(async () => {
      await updateUsername(user.id, clean)
      setDraft(null)
    }, 'Имя сохранено')
  }

  return (
    <>
      <h1>Настройки профиля</h1>
      <section className="panel settings">
        <div className="avatar-edit">
          <Avatar userId={user.id} name={currentName || user.email}
                  version={profile.avatar_version} size={96} />
          <div className="avatar-actions">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            <button disabled={busy} onClick={() => fileRef.current?.click()}>Загрузить фото</button>
            {profile.avatar_version > 0 && (
              <button className="ghost" disabled={busy}
                      onClick={() => run(() => removeAvatar(user.id), 'Фото удалено')}>
                Удалить фото
              </button>
            )}
            <p className="muted">Фото обрежется до квадрата. Подойдут JPG, PNG, WebP. Его увидят другие пользователи.</p>
          </div>
        </div>

        <form className="settings-form" onSubmit={saveName}>
          <label>
            Имя
            <input value={value} maxLength={24} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <div>
            <button disabled={busy || value.trim() === currentName}>Сохранить имя</button>
          </div>
        </form>

        <div className="settings-meta">
          <p><span className="muted">Email</span> {user.email}</p>
          {profile.model_user_id && <p><span className="muted">Ваш ID</span> #{profile.model_user_id}</p>}
        </div>
      </section>
      <p><Link to="/profile" className="link">← В кабинет</Link></p>
    </>
  )
}
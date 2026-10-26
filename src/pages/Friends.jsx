import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import '../friends.css'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  searchUsers, myFriendships, sendFriendRequest, respondToRequest,
  removeFriendship, myRoomInvites, dismissInvite,
} from '../services/friendsApi'
import { createRoom, inviteToRoom } from '../services/roomsApi'
import { Loader } from '../components/Status'
import Avatar from '../components/Avatar'

function Person({ id, name, tag, children }) {
  return (
    <div className="person">
      {id
  ? <Avatar userId={id} name={name} size={38} />
  : <span className="person-avatar">{(name || '?').charAt(0).toUpperCase()}</span>}
      <span className="person-name">
        <b>{name || 'Без имени'}</b>
        {tag && <small className="muted">#{tag}</small>}
      </span>
      <span className="person-actions">{children}</span>
    </div>
  )
}

export default function Friends() {
  const { user, profile, loading: authLoading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [invites, setInvites] = useState([])
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)

  async function reload() {
    try {
      const [l, inv] = await Promise.all([myFriendships(), myRoomInvites()])
      setList(l)
      setInvites(inv)
    } catch (e) {
      toast(e.message, 'error')
      setList((x) => x ?? [])
    }
  }

  useEffect(() => {
    if (user) reload()
  }, [user?.id])

  useEffect(() => {
    const text = q.trim()
    if (text.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      searchUsers(text)
        .then((r) => !cancelled && setResults(r))
        .catch(() => !cancelled && setResults([]))
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q])

  if (authLoading) return <Loader />
  if (!user) return <Navigate to="/login" replace />

  async function run(fn, okMessage) {
    setBusy(true)
    try {
      await fn()
      if (okMessage) toast(okMessage)
      await reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const messages = {
    sent: 'Заявка отправлена',
    accepted: 'Теперь вы друзья',
    already_sent: 'Заявка уже отправлена',
    already_friends: 'Вы уже друзья',
  }

  const send = (u) => run(async () => {
    const result = await sendFriendRequest(u.id)
    toast(messages[result] ?? 'Готово')
  })

  async function startRoom(friend) {
    setBusy(true)
    try {
      const code = await createRoom()
      await inviteToRoom(code, friend.other_id)
      toast(`Приглашение отправлено: ${friend.username || 'друг'}`)
      navigate(`/roulette/room/${code}`)
    } catch (e) {
      toast(e.message, 'error')
      setBusy(false)
    }
  }

  async function emptyRoom() {
    setBusy(true)
    try {
      navigate(`/roulette/room/${await createRoom()}`)
    } catch (e) {
      toast(e.message, 'error')
      setBusy(false)
    }
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(`#${profile.model_user_id}`)
      toast('ID скопирован')
    } catch {
      toast('Не удалось скопировать', 'error')
    }
  }

  const items = list ?? []
  const accepted = items.filter((x) => x.status === 'accepted')
  const incoming = items.filter((x) => x.status === 'pending' && x.incoming)
  const outgoing = items.filter((x) => x.status === 'pending' && !x.incoming)
  const relation = Object.fromEntries(items.map((x) => [x.other_id, x]))

  return (
    <div className="friends">
      <h1>Друзья</h1>
      {profile?.model_user_id && (
        <div className="id-chip">
          Ваш ID: <b>#{profile.model_user_id}</b>
          <button className="ghost" onClick={copyId}>Копировать</button>
        </div>
      )}

      {invites.length > 0 && (
        <>
          <h2>Вас зовут крутить рулетку</h2>
          <div className="person-list">
            {invites.map((i) => (
              <Person key={i.invite_id} name={i.from_name}>
                <Link to={`/roulette/room/${i.room_code}`} className="btn">Войти</Link>
                <button className="ghost" disabled={busy}
                        onClick={() => run(() => dismissInvite(i.invite_id))}>Скрыть</button>
              </Person>
            ))}
          </div>
        </>
      )}

      {incoming.length > 0 && (
        <>
          <h2>Заявки в друзья</h2>
          <div className="person-list">
            {incoming.map((f) => (
              <Person key={f.friendship_id} id={f.other_id} name={f.username} tag={f.model_user_id}>
                <button disabled={busy}
                        onClick={() => run(() => respondToRequest(f.friendship_id, true), 'Теперь вы друзья')}>
                  Принять
                </button>
                <button className="ghost" disabled={busy}
                        onClick={() => run(() => respondToRequest(f.friendship_id, false))}>
                  Отклонить
                </button>
              </Person>
            ))}
          </div>
        </>
      )}

      <h2>Найти человека</h2>
      <input placeholder="Имя или ID (например, #100123)" value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim().length >= 2 && results.length === 0 && <p className="muted">Никого не нашли.</p>}
      <div className="person-list">
        {results.map((u) => {
          const rel = relation[u.id]
          return (
            <Person key={u.id} id={u.id} name={u.username} tag={u.model_user_id}>
              {!rel && <button disabled={busy} onClick={() => send(u)}>Добавить в друзья</button>}
              {rel?.status === 'accepted' && <span className="muted">Уже друзья</span>}
              {rel?.status === 'pending' && !rel.incoming && <span className="muted">Заявка отправлена</span>}
              {rel?.status === 'pending' && rel.incoming && (
                <button disabled={busy}
                        onClick={() => run(() => respondToRequest(rel.friendship_id, true), 'Теперь вы друзья')}>
                  Принять заявку
                </button>
              )}
            </Person>
          )
        })}
      </div>

      <h2>Мои друзья · {accepted.length}</h2>
      {list === null && <Loader />}
      {list && accepted.length === 0 && (
        <p className="muted">Пока никого. Найдите друга по имени или ID и отправьте заявку.</p>
      )}
      <div className="person-list">
        {accepted.map((f) => (
          <Person key={f.friendship_id} id={f.other_id} name={f.username} tag={f.model_user_id}>
            <button disabled={busy} onClick={() => startRoom(f)}>Крутить вместе</button>
            <button className="ghost" disabled={busy}
                    onClick={() => window.confirm('Убрать из друзей?') && run(() => removeFriendship(f.friendship_id), 'Убрано из друзей')}>
              Убрать
            </button>
          </Person>
        ))}
      </div>
      <button className="ghost" disabled={busy} onClick={emptyRoom}>Создать комнату без приглашения</button>

      {outgoing.length > 0 && (
        <>
          <h2>Отправленные заявки</h2>
          <div className="person-list">
            {outgoing.map((f) => (
              <Person key={f.friendship_id} id={f.other_id} name={f.username} tag={f.model_user_id}>
                <button className="ghost" disabled={busy}
                        onClick={() => run(() => removeFriendship(f.friendship_id), 'Заявка отменена')}>
                  Отменить
                </button>
              </Person>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
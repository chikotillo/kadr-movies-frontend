import { useEffect, useRef, useState } from 'react'
import '../profile.css'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { loadMessages, sendMessage, subscribeChat } from '../services/chatApi'
import Avatar from './Avatar'

const time = (iso) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

export default function RoomChat({ roomId }) {
  const { user } = useAuth()
  const toast = useToast()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const box = useRef(null)

  // добавляет сообщения без дублей
  const merge = (incoming) =>
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]))
      incoming.forEach((m) => byId.set(m.id, m))
      return [...byId.values()].sort((a, b) => a.id - b.id).slice(-200)
    })

  useEffect(() => {
    let cancelled = false
    setMessages([])
    const load = () =>
      loadMessages(roomId).then((list) => !cancelled && merge(list)).catch(() => {})
    load()
    const unsubscribe = subscribeChat(roomId, (m) => !cancelled && merge([m]))
    const poll = setInterval(load, 15000) // запасной вариант, если живая связь оборвалась
    return () => {
      cancelled = true
      unsubscribe()
      clearInterval(poll)
    }
  }, [roomId])

  useEffect(() => {
    const el = box.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      merge([await sendMessage(roomId, user.id, body)])
      setText('')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel chat">
      <h3>Чат комнаты</h3>
      <div className="chat-box" ref={box}>
        {messages.length === 0 && (
          <p className="muted">Пока тихо. Напишите первым: обсудите, что смотреть.</p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === user.id
          return (
            <div key={m.id} className={mine ? 'msg mine' : 'msg'}>
              {!mine && <Avatar userId={m.user_id} name={m.author_name} size={28} />}
              <div className="msg-bubble">
                {!mine && <b className="msg-name">{m.author_name}</b>}
                <span className="msg-text">{m.body}</span>
                <small className="msg-time">{time(m.created_at)}</small>
              </div>
            </div>
          )
        })}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input value={text} maxLength={500} placeholder="Сообщение…"
               onChange={(e) => setText(e.target.value)} />
        <button disabled={busy || !text.trim()}>Отправить</button>
      </form>
    </section>
  )
}
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import '../friends.css'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { searchMovies, getMoviesByIds, displayTitle, genreRu, movieOverview } from '../services/moviesApi'
import { myFriendships } from '../services/friendsApi'
import {
  joinRoom, loadRoom, subscribeRoom, addRoomMovie, removeRoomItem,
  spinRoom, inviteToRoom, leaveRoom, deleteRoom,
} from '../services/roomsApi'
import Poster from '../components/Poster'
import { Loader } from '../components/Status'
import Avatar from '../components/Avatar'
import RoomChat from '../components/RoomChat'

const ITEM = 128
const GAP = 12
const STEP = ITEM + GAP
const TOTAL = 46
const WIN_AT = 38
const SPIN_MS = 5600

const cut = (t, n = 240) => (t && t.length > n ? t.slice(0, n).trimEnd() + '…' : t)
const hashCode = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)

// одинаковые «случайные» числа у всех участников
function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function Confetti() {
  const parts = useMemo(
    () => Array.from({ length: 32 }, (_, i) => ({
      x: (Math.random() - 0.5) * 760,
      y: -(120 + Math.random() * 260),
      r: Math.random() * 720 - 360,
      c: ['#d4ff3f', '#5df2b4', '#7c5cff', '#ff4d8d', '#ffb020'][i % 5],
      d: Math.random() * 0.15,
      s: 6 + Math.random() * 6,
    })),
    []
  )
  return (
    <div className="confetti" aria-hidden="true">
      {parts.map((p, i) => (
        <i key={i} style={{
          '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg`,
          background: p.c, animationDelay: `${p.d}s`, width: p.s, height: p.s * 1.6,
        }} />
      ))}
    </div>
  )
}

export default function RouletteRoom() {
  const { code: rawCode } = useParams()
  const code = (rawCode ?? '').toUpperCase()
  const { user, loading: authLoading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [status, setStatus] = useState('loading')
  const [errText, setErrText] = useState('')
  const [room, setRoom] = useState(null)
  const [items, setItems] = useState([])
  const [members, setMembers] = useState([])
  const [friends, setFriends] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [q, setQ] = useState('')
  const [found, setFound] = useState([])
  const [strip, setStrip] = useState([])
  const [x, setX] = useState(0)
  const [dur, setDur] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [burst, setBurst] = useState(0)

  const view = useRef(null)
  const timers = useRef([])
  const seenSeq = useRef(0)
  const refreshTimer = useRef(null)
  const refreshRef = useRef(() => {})

  // подключение к комнате, живые обновления и запасной опрос раз в 10 секунд
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setStatus('login')
      return
    }
    let cancelled = false
    let unsubscribe = () => {}
    let poll = null
    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

    function animate(st, win) {
      const list = st.items.map((i) => i.movies)
      const rnd = mulberry32(hashCode(code) + st.room.spin_seq * 7919)
      const pickR = () => list[Math.floor(rnd() * list.length)]
      const arr = []
      for (let i = 0; i < TOTAL; i++) {
        let m = pickR()
        let guard = 0
        while (arr.length && m.movie_id === arr[arr.length - 1].movie_id && list.length > 1 && guard++ < 10) {
          m = pickR()
        }
        arr.push(m)
      }
      arr[WIN_AT] = win
      const jitter = (rnd() - 0.5) * ITEM * 0.6

      setWinner(null)
      setStrip(arr)
      setSpinning(true)
      setDur(0)
      setX(0)
      const width = view.current?.clientWidth ?? 800
      const target = WIN_AT * STEP + ITEM / 2 - width / 2 + jitter
      later(() => {
        setDur(SPIN_MS)
        setX(-target)
      }, 60)
      later(() => {
        setSpinning(false)
        setWinner(win)
        setBurst((b) => b + 1)
        navigator.vibrate?.(80)
      }, SPIN_MS + 160)
    }

    async function apply(st, initial) {
      setRoom(st.room)
      setItems(st.items)
      setMembers(st.members)
      const seq = st.room.spin_seq
      if (!initial && seq <= seenSeq.current) return
      seenSeq.current = Math.max(seenSeq.current, seq)
      if (!st.room.winner_movie_id) return

      let win = st.items.find((i) => i.movie_id === st.room.winner_movie_id)?.movies
      if (!win) win = (await getMoviesByIds([st.room.winner_movie_id]))[0]
      if (cancelled || !win) return

      const age = st.room.spun_at ? Date.now() - new Date(st.room.spun_at).getTime() : Infinity
      if (initial || age > 20000 || st.items.length === 0) setWinner(win)
      else animate(st, win)
    }

    function refresh() {
      clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(async () => {
        try {
          const st = await loadRoom(code)
          if (cancelled) return
          if (!st) setStatus('closed')
          else apply(st, false)
        } catch {
          // повторим при следующем событии
        }
      }, 150)
    }
    refreshRef.current = refresh

    ;(async () => {
      try {
        await joinRoom(code)
        const st = await loadRoom(code)
        if (cancelled) return
        if (!st) throw new Error('Комната не найдена')
        await apply(st, true)
        if (cancelled) return
        setStatus('ready')
        unsubscribe = subscribeRoom(st.room.id, refresh)
        poll = setInterval(refresh, 10000)
      } catch (e) {
        if (!cancelled) {
          setErrText(e.message)
          setStatus('error')
        }
      }
    })()

    return () => {
      cancelled = true
      unsubscribe()
      clearInterval(poll)
      clearTimeout(refreshTimer.current)
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [user?.id, authLoading, code])

  // поиск фильма для добавления
  useEffect(() => {
    const text = q.trim()
    if (text.length < 2) {
      setFound([])
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      searchMovies({ q: text, sort: 'popular', pageSize: 6 })
        .then((r) => !cancelled && setFound(r.movies))
        .catch(() => !cancelled && setFound([]))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q])

  if (authLoading || status === 'loading') return <Loader />
  if (status === 'login') {
    return (
      <div className="banner">
        <Link to="/login">Войдите</Link>, чтобы присоединиться к комнате. После входа откройте ссылку ещё раз.
      </div>
    )
  }
  if (status === 'closed') {
    return (
      <div className="banner">
        Комната закрыта. <Link to="/friends" className="link">К друзьям</Link>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="banner">
        {errText || 'Не удалось открыть комнату'}
        <br />
        <Link to="/friends" className="btn">К друзьям</Link>
      </div>
    )
  }

  const isOwner = room.owner === user.id
  const memberIds = new Set(members.map((m) => m.user_id))

  async function add(movie) {
    if (items.some((i) => i.movie_id === movie.movie_id)) return toast('Этот фильм уже в барабане')
    if (items.length >= 20) return toast('Максимум 20 фильмов')
    try {
      await addRoomMovie(room.id, user.id, movie.movie_id)
      setQ('')
      setFound([])
      refreshRef.current()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function removeItem(it) {
    try {
      await removeRoomItem(it.id)
      refreshRef.current()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function spin() {
    try {
      await spinRoom(code)
      refreshRef.current()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function toggleInvite() {
    const next = !showInvite
    setShowInvite(next)
    if (!next) return
    try {
      const l = await myFriendships()
      setFriends(l.filter((f) => f.status === 'accepted'))
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function invite(f) {
    try {
      await inviteToRoom(code, f.other_id)
      toast(`Приглашение отправлено: ${f.username || 'друг'}`)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast('Ссылка скопирована')
    } catch {
      toast('Скопируйте адрес из строки браузера', 'error')
    }
  }

  async function leave() {
    if (!window.confirm('Выйти из комнаты?')) return
    try {
      await leaveRoom(code)
      navigate('/friends')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function closeRoom() {
    if (!window.confirm('Закрыть комнату для всех?')) return
    try {
      await deleteRoom(code)
      navigate('/friends')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const meta = winner
    ? [winner.release_year, (winner.genres ?? []).slice(0, 3).map(genreRu).join(', ')].filter(Boolean).join(' · ')
    : ''

  return (
    <div className="roulette room">
      <h1>Рулетка вместе</h1>

      <div className="room-head">
        <span className="room-code">{room.code}</span>
        <button className="ghost" onClick={copyLink}>Скопировать ссылку</button>
        <button className="ghost" onClick={toggleInvite}>{showInvite ? 'Скрыть друзей' : 'Позвать друга'}</button>
      </div>

      <div className="members">
        {members.map((m) => (
          <span key={m.user_id} className="member">
            <Avatar userId={m.user_id} name={m.username} size={26} />
            {m.username}{m.user_id === room.owner ? ' · хозяин' : ''}
          </span>
        ))}
      </div>

      {showInvite && (
        <section className="panel">
          <h3>Позвать друга</h3>
          {friends.length === 0 && (
            <p className="muted">Друзей пока нет. <Link to="/friends" className="link">Найти друзей</Link></p>
          )}
          <div className="person-list">
            {friends.map((f) => (
              <div key={f.friendship_id} className="person">
                <span className="person-avatar">{(f.username || '?').charAt(0).toUpperCase()}</span>
                <span className="person-name"><b>{f.username || 'Без имени'}</b></span>
                <span className="person-actions">
                  {memberIds.has(f.other_id)
                    ? <span className="muted">Уже в комнате</span>
                    : <button onClick={() => invite(f)}>Позвать</button>}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={spinning ? 'machine spinning' : 'machine'}>
        <div className="machine-top">
          <span className="lamps"><i /><i /><i /><i /><i /></span>
          <span>Lumen Roulette</span>
          <span className="lamps"><i /><i /><i /><i /><i /></span>
        </div>

        <div className="reel-view" ref={view}>
          <div className="reel-marker" />
          <div className="reel-strip"
               style={{
                 transform: `translateX(${x}px)`,
                 transition: dur ? `transform ${dur}ms cubic-bezier(.1,.65,.1,1)` : 'none',
               }}>
            {strip.length
              ? strip.map((m, i) => (
                  <div key={i}
                       className={winner ? (i === WIN_AT ? 'reel-item win' : 'reel-item dim') : 'reel-item'}>
                    <Poster movie={m} />
                  </div>
                ))
              : Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="reel-item blank"><span>?</span></div>
                ))}
          </div>
        </div>

        <div className="machine-actions">
          <button className="spin-btn" disabled={spinning || items.length < 2} onClick={spin}>
            {spinning ? 'Крутится…' : winner ? 'Крутить ещё' : 'Крутить'}
          </button>
          <span className="muted">
            {items.length < 2 ? 'Нужно минимум 2 фильма' : `В барабане: ${items.length}`}
          </span>
        </div>
      </section>

      {winner && (
        <section className="winner" key={burst}>
          <Confetti />
          <Poster movie={winner} className="winner-poster" />
          <div>
            <span className="eyebrow">Выпало{room.spun_by_name ? ` · крутил(а) ${room.spun_by_name}` : ''}</span>
            <h2>{displayTitle(winner)}</h2>
            <p className="muted">
              {meta}{winner.ml_avg_rating != null ? ` · ★ ${winner.ml_avg_rating}` : ''}
            </p>
            <p className="overview">{cut(movieOverview(winner)) ?? 'Описание пока недоступно.'}</p>
            <div className="hero-actions">
              <Link to={`/movie/${winner.movie_id}`} className="btn">Открыть фильм</Link>
            </div>
          </div>
        </section>
      )}

      <section className="panel pool">
        <h3>Общий барабан <span className="muted">· {items.length} / 20</span></h3>

        <input placeholder="Найти фильм и добавить в барабан…" value={q}
               onChange={(e) => setQ(e.target.value)} />
        {found.length > 0 && (
          <div className="pool-found">
            {found.map((m) => (
              <button key={m.movie_id} className="pool-found-item" onClick={() => add(m)}>
                <Poster movie={m} className="sug-poster" />
                <span>
                  <b>{displayTitle(m)}</b>
                  <small>{m.release_year ?? '—'}</small>
                </span>
                <em>+</em>
              </button>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <p className="muted">Пока пусто. Добавьте фильмы поиском, друзья тоже могут добавлять свои.</p>
        ) : (
          <div className="pool-list">
            {items.map((it) => (
              <div key={it.id} className="pool-chip">
                <Poster movie={it.movies} className="sug-poster" />
                <span>
                  {displayTitle(it.movies)}
                  <small className="by">добавил(а) {it.added_by_name}</small>
                </span>
                {(it.added_by === user.id || isOwner) && (
                  <button aria-label="Убрать" onClick={() => removeItem(it)}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      
      <RoomChat roomId={room.id} />
      <div className="room-foot">
        <button className="ghost" onClick={leave}>Выйти из комнаты</button>
        {isOwner && <button className="ghost" onClick={closeRoom}>Закрыть комнату для всех</button>}
      </div>
    </div>
  )
}
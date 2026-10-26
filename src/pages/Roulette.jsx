import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../services/supabaseClient'
import { searchMovies, displayTitle, genreRu, movieOverview } from '../services/moviesApi'
import Poster from '../components/Poster'

const MAX = 10
const ITEM = 128
const GAP = 12
const STEP = ITEM + GAP
const TOTAL = 46
const WIN_AT = 38
const SPIN_MS = 5600

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const cut = (t, n = 240) => (t && t.length > n ? t.slice(0, n).trimEnd() + '…' : t)

function Confetti() {
  const parts = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => ({
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

export default function Roulette() {
  const { user } = useAuth()
  const toast = useToast()
  const [pool, setPool] = useState([])
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

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // подсказки при поиске фильма
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

  function resetMachine() {
    setWinner(null)
    setStrip([])
    setX(0)
    setDur(0)
  }

  function changePool(next) {
    setPool(next)
    resetMachine()
  }

  function add(movie) {
    if (spinning) return
    if (pool.some((m) => m.movie_id === movie.movie_id)) return toast('Этот фильм уже в барабане')
    if (pool.length >= MAX) return toast(`Максимум ${MAX} фильмов`)
    changePool([...pool, movie])
    setQ('')
    setFound([])
  }

  async function fillRandom() {
    if (spinning) return
    try {
      const r = await searchMovies({ sort: 'popular', page: Math.floor(Math.random() * 12), pageSize: 24 })
      changePool(shuffle(r.movies).slice(0, 6))
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function fromWatchlist() {
    if (spinning || !user) return
    try {
      const { data, error } = await supabase.from('watchlist').select('movie_id').eq('user_id', user.id).limit(80)
      if (error) throw error
      const ids = shuffle(data.map((r) => r.movie_id)).slice(0, MAX)
      if (!ids.length) return toast('Список «Посмотреть позже» пока пуст')
      const { data: movies, error: e2 } = await supabase.from('movies').select('*').in('movie_id', ids)
      if (e2) throw e2
      changePool(movies)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  function spin(list = pool) {
    if (spinning || list.length < 2) return
    const win = pick(list)
    const items = []
    for (let i = 0; i < TOTAL; i++) {
      let m = pick(list)
      while (items.length && m.movie_id === items[items.length - 1].movie_id) m = pick(list)
      items.push(m)
    }
    items[WIN_AT] = win

    setWinner(null)
    setStrip(items)
    setSpinning(true)
    setDur(0)
    setX(0)

    const width = view.current?.clientWidth ?? 800
    const jitter = (Math.random() - 0.5) * ITEM * 0.6
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

  function dropWinnerAndSpin() {
    const rest = pool.filter((m) => m.movie_id !== winner.movie_id)
    setPool(rest)
    if (rest.length < 2) {
      resetMachine()
      toast('Осталось меньше двух фильмов, добавьте ещё')
      return
    }
    spin(rest)
  }

  const meta = winner
    ? [winner.release_year, (winner.genres ?? []).slice(0, 3).map(genreRu).join(', ')].filter(Boolean).join(' · ')
    : ''

  return (
    <div className="roulette">
      <h1>Рулетка фильмов</h1>
      <p className="muted">Не знаете, что посмотреть? Соберите несколько фильмов в барабан, а мы выберем за вас.</p>

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
          <button className="spin-btn" disabled={spinning || pool.length < 2} onClick={() => spin()}>
            {spinning ? 'Крутится…' : winner ? 'Крутить ещё' : 'Крутить'}
          </button>
          <span className="muted">
            {pool.length < 2 ? 'Добавьте минимум 2 фильма' : `В барабане: ${pool.length}`}
          </span>
        </div>
      </section>

      {winner && (
        <section className="winner" key={burst}>
          <Confetti />
          <Poster movie={winner} className="winner-poster" />
          <div>
            <span className="eyebrow">Выпало</span>
            <h2>{displayTitle(winner)}</h2>
            <p className="muted">
              {meta}{winner.ml_avg_rating != null ? ` · ★ ${winner.ml_avg_rating}` : ''}
            </p>
            <p className="overview">{cut(movieOverview(winner)) ?? 'Описание пока недоступно.'}</p>
            <div className="hero-actions">
              <Link to={`/movie/${winner.movie_id}`} className="btn">Открыть фильм</Link>
              <button className="btn outline" onClick={dropWinnerAndSpin}>Не хочу, крутим без него</button>
            </div>
          </div>
        </section>
      )}

      <section className="panel pool">
        <h3>Из чего выбираем <span className="muted">· {pool.length} / {MAX}</span></h3>

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

        <div className="pool-quick">
          <button className="ghost" disabled={spinning} onClick={fillRandom}>Случайные хиты</button>
          {user && <button className="ghost" disabled={spinning} onClick={fromWatchlist}>Из «Посмотреть позже»</button>}
          {pool.length > 0 && (
            <button className="link" disabled={spinning} onClick={() => changePool([])}>Очистить</button>
          )}
        </div>

        {pool.length === 0 ? (
          <p className="muted">Пока пусто. Найдите фильмы поиском или нажмите «Случайные хиты».</p>
        ) : (
          <div className="pool-list">
            {pool.map((m) => (
              <div key={m.movie_id} className="pool-chip">
                <Poster movie={m} className="sug-poster" />
                <span>{displayTitle(m)}</span>
                <button aria-label="Убрать" disabled={spinning}
                        onClick={() => changePool(pool.filter((x2) => x2.movie_id !== m.movie_id))}>✕</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
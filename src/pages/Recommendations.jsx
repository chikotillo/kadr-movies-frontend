import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyRecommendations, attachMovies } from '../services/recommendApi'
import { GENRES, genreRu } from '../services/moviesApi'
import MovieCard from '../components/MovieCard'
import { SkeletonGrid, ErrorBox } from '../components/Status'

// подпись честно отражает, чем именно подобраны фильмы
const SOURCE_TEXT = {
  als: 'Персональные рекомендации на основе модели ALS.',
  genre_fallback: 'Подбор по жанрам и оценкам, которые вы поставили.',
  popular_fallback: 'Пока мало оценок, поэтому показаны популярные фильмы. Оцените больше, и подбор станет точнее.',
}

const ruGenre = (g) => (GENRES.includes(g) ? genreRu(g) : g)

// превращаем «Есть общие жанры: … Похоже на фильм «X», который вы оценили на 5.0.»
// в метки жанров и короткую фразу
function Reason({ text }) {
  const m = text.match(
    /общие жанры:\s*(.+?)\.\s*Похоже на фильм\s*«(.+?)»,?\s*который вы оценили на\s*([\d.]+)/i
  )

  if (!m) {
    const plain = GENRES.reduce((t, g) => t.replaceAll(g, genreRu(g)), text)
    return (
      <div className="reason">
        <span className="reason-title">Почему рекомендуем</span>
        <p>{plain}</p>
      </div>
    )
  }

  const genres = m[1].split(',').map((g) => ruGenre(g.trim())).filter(Boolean)
  return (
    <div className="reason">
      <span className="reason-title">Почему рекомендуем</span>
      <span className="reason-label">Совпали жанры</span>
      <div className="reason-chips">
        {genres.map((g) => <span key={g} className="mini-chip">{g}</span>)}
      </div>
      <p className="reason-like">
        Напоминает «{m[2]}»: вы поставили <b>{m[3]} ★</b>
      </p>
    </div>
  )
}

export default function Recommendations() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [source, setSource] = useState(null)
  const [error, setError] = useState(null)
  const [slow, setSlow] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setItems(null)
    setError(null)
    setSlow(false)
    const slowTimer = setTimeout(() => setSlow(true), 4000)

    getMyRecommendations(20)
      .then(async ({ items: raw, source: src }) => {
        const movies = await attachMovies(raw)
        if (!cancelled) {
          setItems(movies)
          setSource(src)
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => clearTimeout(slowTimer))

    return () => {
      cancelled = true
      clearTimeout(slowTimer)
    }
  }, [user?.id, attempt])

  if (!user) {
    return (
      <>
        <h1>Рекомендации</h1>
        <p className="banner">
          <Link to="/login">Войдите</Link>, чтобы получить персональные рекомендации.
        </p>
      </>
    )
  }

  return (
    <>
      <h1>Рекомендации для вас</h1>
      <p className="muted">{SOURCE_TEXT[source] ?? 'Подбираются по вашим оценкам.'}</p>

      {error && (
        <>
          <ErrorBox message={error} />
          <button onClick={() => setAttempt((n) => n + 1)}>Повторить</button>
        </>
      )}

      {!items && !error && (
        <>
          {slow && <p className="note">Сервер просыпается, это может занять до минуты…</p>}
          <SkeletonGrid n={12} />
        </>
      )}

      {items && items.length === 0 && (
        <div className="empty">
          <p>Пока нечего рекомендовать. Оцените хотя бы 5 фильмов.</p>
          <Link to="/taste" className="btn">Настроить вкус</Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid rec-grid">
          {items.map(({ movie, reason }) => (
            <div key={movie.movie_id} className="rec">
              <MovieCard movie={movie} />
              {reason && <Reason text={reason} />}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
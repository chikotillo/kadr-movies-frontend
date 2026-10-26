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

// переводим жанры и разбиваем пояснение на короткие строки
const reasonLines = (text) =>
  GENRES.reduce((t, g) => t.replaceAll(g, genreRu(g)), text)
    .split(/(?<=\.)\s+/)
    .filter(Boolean)

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
              {reason && (
                <div className="reason">
                  <span className="reason-title">Почему это вам</span>
                  {reasonLines(reason).map((line, i) => <p key={i}>{line}</p>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
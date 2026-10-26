import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyRecommendations, attachMovies } from '../services/recommendApi'
import MovieCard from '../components/MovieCard'
import { SkeletonGrid, ErrorBox } from '../components/Status'

export default function Recommendations() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
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
      .then(attachMovies)
      .then((r) => !cancelled && setItems(r))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => clearTimeout(slowTimer))

    return () => { cancelled = true; clearTimeout(slowTimer) }
  }, [user?.id, attempt])

  if (!user) {
    return (
      <>
        <h1>Рекомендации</h1>
        <p className="banner"><Link to="/login">Войдите</Link>, чтобы получить персональные рекомендации.</p>
      </>
    )
  }

  return (
    <>
      <h1>Рекомендации для вас</h1>
      <p className="muted">Подбираются по вашим оценкам алгоритмом ALS.</p>

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
        <div className="grid">
          {items.map(({ movie, reason }) => (
            <div key={movie.movie_id} className="card-wrap">
              <MovieCard movie={movie} />
              {reason && <p className="muted">{reason}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
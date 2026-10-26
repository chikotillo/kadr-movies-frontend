import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRecommendations, getPopularFallback } from '../services/recommendationApi'
import { getMoviesByIds, getPopular } from '../services/moviesApi'
import MovieCard from '../components/MovieCard'
import { Loader, ErrorBox } from '../components/Status'

const DEMO_ML_USER = 1

function friendly(e) {
  if (e.message === 'API_NOT_CONFIGURED') return 'Сервис рекомендаций пока не подключён к этой версии сайта'
  if (e.message === 'Failed to fetch') return 'Сервис рекомендаций недоступен'
  return e.message
}

// соединяет данные API с карточками фильмов из нашей базы
async function attachMovies(recs) {
  const movies = await getMoviesByIds(recs.map((r) => r.movieId))
  const byId = Object.fromEntries(movies.map((m) => [m.movie_id, m]))
  return recs.map((rec) => ({
    rec,
    movie: byId[rec.movieId] ?? {
      movie_id: rec.movieId, title: rec.title, genres: rec.genres, release_year: null,
    },
  }))
}

export default function Recommendations() {
  const { user, profile, loading: authLoading } = useAuth()
  const [demo, setDemo] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [popular, setPopular] = useState([])
  const [popLoading, setPopLoading] = useState(false)
  const [popError, setPopError] = useState(null)
  const [popFromCatalog, setPopFromCatalog] = useState(false)

  const mlUserId = demo ? DEMO_ML_USER : profile?.ml_user_id ?? null

  // персональные рекомендации (только если есть MovieLens ID)
  useEffect(() => {
    if (!mlUserId) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const recs = await getRecommendations(mlUserId, 12)
        setItems(await attachMovies(recs))
      } catch (e) {
        setError(friendly(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [mlUserId])

  // запасной вариант: популярное, когда персональных рекомендаций нет
  useEffect(() => {
    if (authLoading || mlUserId) {
      setPopular([])
      return
    }
    setPopLoading(true)
    setPopError(null)
    setPopFromCatalog(false)
    ;(async () => {
      try {
        const recs = await getPopularFallback(12)
        setPopular(await attachMovies(recs))
      } catch {
        // сервис рекомендаций недоступен: показываем популярное из нашего каталога
        try {
          const movies = await getPopular(12)
          setPopular(movies.map((movie) => ({
            movie,
            rec: { averageRating: Number(movie.ml_avg_rating), ratingCount: movie.ml_rating_count },
          })))
          setPopFromCatalog(true)
        } catch (e) {
          setPopError(friendly(e))
        }
      } finally {
        setPopLoading(false)
      }
    })()
  }, [authLoading, mlUserId])

  if (authLoading) return <Loader />

  return (
    <>
      <h1>Рекомендации</h1>

      {demo && (
        <div className="banner">
          Демонстрационный профиль MovieLens №1 — это не ваши личные рекомендации.
        </div>
      )}

      {!user && !demo && (
        <p>
          Войдите в аккаунт или{' '}
          <button className="link" onClick={() => setDemo(true)}>посмотрите демо</button>.{' '}
          <Link to="/login">Войти</Link>
        </p>
      )}

      {user && !mlUserId && !demo && (
        <div className="banner">
          Персональные рекомендации для вашего аккаунта пока недоступны: сервис ещё не
          умеет учитывать оценки новых пользователей. Ниже — популярные фильмы.
          <br />
          <button className="btn" onClick={() => setDemo(true)}>
            Показать демо-профиль MovieLens №1
          </button>
        </div>
      )}

      {loading && <Loader />}
      {error && <ErrorBox message={error} />}
      {mlUserId && !loading && !error && items.length === 0 && (
        <p>Для этого профиля нет рекомендаций.</p>
      )}
      <div className="grid">
        {items.map(({ rec, movie }) => (
          <MovieCard key={movie.movie_id} movie={movie}
                     note={`Прогноз ALS: ${Math.min(5, rec.predictedRating).toFixed(1)} / 5`} />
        ))}
      </div>

      {!mlUserId && (
        <>
          <h2>Популярное сейчас</h2>
          <p className="muted">
            {popFromCatalog
              ? 'Сервис рекомендаций сейчас недоступен, поэтому показано популярное из каталога. Это не персональные рекомендации.'
              : 'Это не персональные рекомендации, а общий список популярных фильмов.'}
          </p>
          {popLoading && <Loader />}
          {popError && <ErrorBox message={popError} />}
          <div className="grid">
            {popular.map(({ rec, movie }) => (
              <MovieCard key={movie.movie_id} movie={movie}
                         note={`★ ${rec.averageRating.toFixed(1)} (${rec.ratingCount} оценок)`} />
            ))}
          </div>
        </>
      )}
    </>
  )
}
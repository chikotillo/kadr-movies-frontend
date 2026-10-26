import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { searchMovies, displayTitle } from '../services/moviesApi'
import { getRatingsCount, getRatingsFor, saveRating } from '../services/userApi'
import Poster from '../components/Poster'
import { Loader, ErrorBox } from '../components/Status'

const NEED = 5   // порог, который назвал участник №1
const PAGE = 12

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth()
  const [page, setPage] = useState(0)
  const [movies, setMovies] = useState([])
  const [mine, setMine] = useState({})
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await searchMovies({ sort: 'popular', page, pageSize: PAGE })
        const [rated, total] = await Promise.all([
          getRatingsFor(user.id, res.movies.map((m) => m.movie_id)),
          getRatingsCount(user.id),
        ])
        if (cancelled) return
        setMovies(res.movies)
        setMine(rated)
        setCount(total)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, page])

  async function rate(movieId, value) {
    setError(null)
    try {
      await saveRating(user.id, movieId, value)
      setMine((m) => ({ ...m, [movieId]: value }))
      setCount(await getRatingsCount(user.id))
    } catch (e) {
      setError(e.message)
    }
  }

  if (authLoading) return <Loader />
  if (!user) {
    return (
      <div className="banner">
        <Link to="/login">Войдите</Link>, чтобы настроить свой вкус.
      </div>
    )
  }

  const left = Math.max(0, NEED - count)

  return (
    <>
      <h1>Настрой вкус</h1>
      <p className="muted">
        Оцените фильмы, которые вы видели (от 1 до 5). Незнакомые пропускайте.
      </p>

      <div className="progress">
        <div className="progress-bar" style={{ width: `${Math.min(100, (count / NEED) * 100)}%` }} />
      </div>
      <p>
        {left > 0
          ? `Оценено ${count} из ${NEED}. Осталось ${left}, чтобы открыть персональные рекомендации.`
          : `Готово: у вас ${count} оценок.`}
      </p>

      {left === 0 && (
        <div className="banner">
          Достаточно оценок для персонализации. Откройте рекомендации: они подбираются по вашим оценкам.
          <br />
          <Link to="/recommendations" className="btn">К рекомендациям</Link>{' '}
          <Link to="/profile" className="btn">Мой профиль вкуса</Link>
        </div>
      )}

      {error && <ErrorBox message={error} />}
      {loading && <Loader />}

      <div className="grid">
        {!loading && movies.map((m) => (
          <div key={m.movie_id} className="card">
            <Poster movie={m} />
            <div className="card-body">
              <h3>{displayTitle(m)}</h3>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} className={mine[m.movie_id] === v ? 'step active' : 'step'}
                          onClick={() => rate(m.movie_id, v)}>
                    {v}
                  </button>
                ))}
              </div>
              {mine[m.movie_id] && <p className="note">Ваша оценка: {mine[m.movie_id]}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="pager">
        <button disabled={loading} onClick={() => setPage((p) => p + 1)}>
          Показать другие фильмы
        </button>
      </div>
    </>
  )
}
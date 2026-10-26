import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPopular, searchMovies } from '../services/moviesApi'
import { getMyRecommendations, attachMovies } from '../services/recommendApi'
import { getRecentMovies } from '../services/recent'
import { useAuth } from '../context/AuthContext'
import FeaturedHero from '../components/FeaturedHero'
import Moods from '../components/Moods'
import MovieRail from '../components/MovieRail'
import { ErrorBox } from '../components/Status'

const byGenre = (genre) => () =>
  searchMovies({ genre, sort: 'popular', pageSize: 16 }).then((r) => r.movies)

const RAILS = [
  { key: 'rated', title: 'Лучшие по оценкам зрителей', to: '/catalog?sort=rating', load: () => getPopular(16) },
  { key: 'most', title: 'Самые обсуждаемые', to: '/catalog?sort=popular',
    load: () => searchMovies({ sort: 'popular', pageSize: 16 }).then((r) => r.movies) },
  { key: 'scifi', title: 'Фантастика', to: '/catalog?genre=Sci-Fi', load: byGenre('Sci-Fi') },
  { key: 'comedy', title: 'Комедии', to: '/catalog?genre=Comedy', load: byGenre('Comedy') },
  { key: 'animation', title: 'Анимация', to: '/catalog?genre=Animation', load: byGenre('Animation') },
]

export default function Home() {
  const { user } = useAuth()
  const [data, setData] = useState({})
  const [error, setError] = useState(null)
  const [recent, setRecent] = useState([])
  // undefined: ещё грузим или нет входа, null: персональных пока нет, массив: подборка готова
  const [mine, setMine] = useState(undefined)

  useEffect(() => {
    RAILS.forEach(({ key, load }) => {
      load()
        .then((movies) => setData((d) => ({ ...d, [key]: movies })))
        .catch((e) => setError(e.message))
    })
    getRecentMovies().then(setRecent).catch(() => {})
  }, [])

  // есть ли у человека персональная подборка (тогда призыв «настрой вкус» не нужен)
  useEffect(() => {
    setMine(undefined)
    if (!user) return
    let cancelled = false
    getMyRecommendations(12)
      .then(async ({ items, source }) => {
        if (source === 'popular_fallback' || items.length === 0) {
          if (!cancelled) setMine(null)
          return
        }
        const list = (await attachMovies(items)).map((x) => x.movie)
        if (!cancelled) setMine(list.length ? list : null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <>
      <FeaturedHero />

      <Moods />

      {!user && (
        <section className="cta">
          <div>
            <h3>Получайте рекомендации</h3>
            <p className="muted">Создайте аккаунт, оценивайте фильмы и собирайте свои списки.</p>
          </div>
          <Link to="/login" className="btn">Создать аккаунт</Link>
        </section>
      )}

      {user && mine === null && (
        <section className="cta">
          <div>
            <h3>Настройте свой вкус</h3>
            <p className="muted">Оцените 5 фильмов, которые вы видели, и откройте персональные рекомендации.</p>
          </div>
          <Link to="/taste" className="btn">Настроить вкус</Link>
        </section>
      )}

      {user && Array.isArray(mine) && (
        <MovieRail title="Подобрано для вас" to="/recommendations" movies={mine} />
      )}

      {recent.length > 0 && (
        <MovieRail title="Вы недавно смотрели" to="/catalog" movies={recent} />
      )}

      {error && <ErrorBox message={error} />}
      {RAILS.map((r) => (
        <MovieRail key={r.key} title={r.title} to={r.to} movies={data[r.key] ?? null} />
      ))}
    </>
  )
}
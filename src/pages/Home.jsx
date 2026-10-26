import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPopular, searchMovies, GENRES, genreRu } from '../services/moviesApi'
import { useAuth } from '../context/AuthContext'
import FeaturedHero from '../components/FeaturedHero'
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

  useEffect(() => {
    RAILS.forEach(({ key, load }) => {
      load()
        .then((movies) => setData((d) => ({ ...d, [key]: movies })))
        .catch((e) => setError(e.message))
    })
  }, [])

  return (
    <>
      <FeaturedHero />

      <div className="chip-row home-genres">
        {GENRES.slice(0, 12).map((g) => (
          <Link key={g} to={`/catalog?genre=${encodeURIComponent(g)}`} className="chip">
            {genreRu(g)}
          </Link>
        ))}
      </div>

      <section className="cta">
        <div>
          <h3>{user ? 'Настройте свой вкус' : 'Получайте рекомендации'}</h3>
          <p className="muted">
            {user
              ? 'Оцените 5 фильмов, которые вы видели, и откройте персональные рекомендации.'
              : 'Создайте аккаунт, оценивайте фильмы и собирайте свои списки.'}
          </p>
        </div>
        <Link to={user ? '/taste' : '/login'} className="btn">
          {user ? 'Настроить вкус' : 'Создать аккаунт'}
        </Link>
      </section>

      {error && <ErrorBox message={error} />}
      {RAILS.map((r) => (
        <MovieRail key={r.key} title={r.title} to={r.to} movies={data[r.key] ?? null} />
      ))}
    </>
  )
}
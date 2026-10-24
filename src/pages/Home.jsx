import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPopular, searchMovies, GENRES, genreRu } from '../services/moviesApi'
import { useAuth } from '../context/AuthContext'
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
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [data, setData] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    RAILS.forEach(({ key, load }) => {
      load()
        .then((movies) => setData((d) => ({ ...d, [key]: movies })))
        .catch((e) => setError(e.message))
    })
  }, [])

  function search(e) {
    e.preventDefault()
    const text = q.trim()
    navigate(text ? `/catalog?q=${encodeURIComponent(text)}` : '/catalog')
  }

  return (
    <>
      <section className="hero">
        <h1>Фильмы, которые вам понравятся</h1>
        <p>Оценивайте фильмы, собирайте списки и получайте рекомендации на основе алгоритма ALS и данных MovieLens.</p>

        <form className="hero-search" onSubmit={search}>
          <input placeholder="🔍 Найти фильм по названию" value={q} onChange={(e) => setQ(e.target.value)} />
          <button>Найти</button>
        </form>

        <div className="chip-row">
          {GENRES.slice(0, 10).map((g) => (
            <Link key={g} to={`/catalog?genre=${encodeURIComponent(g)}`} className="chip">
              {genreRu(g)}
            </Link>
          ))}
        </div>

        <div className="hero-actions">
          <Link to={user ? '/taste' : '/login'} className="btn">
            {user ? 'Настроить вкус' : 'Создать аккаунт'}
          </Link>
          <Link to="/recommendations" className="btn outline">Рекомендации</Link>
        </div>
        <div className="hero-stats">9 742 фильма · 100 836 оценок MovieLens · рекомендации на основе ALS (Spark MLlib)</div>
      </section>

      {error && <ErrorBox message={error} />}
      {RAILS.map((r) => (
        <MovieRail key={r.key} title={r.title} to={r.to} movies={data[r.key] ?? null} />
      ))}
    </>
  )
}
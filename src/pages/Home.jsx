import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPopular, searchMovies, getRandomMovieId } from '../services/moviesApi'
import { getMyRecommendations, attachMovies } from '../services/recommendApi'
import { getRecentMovies } from '../services/recent'
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

const MOODS = [
  { label: 'Посмеяться', emoji: '😂', genre: 'Comedy', a: '#f59e0b', b: '#ef4444' },
  { label: 'Пощекотать нервы', emoji: '😱', genre: 'Thriller', a: '#6d28d9', b: '#1e1b4b' },
  { label: 'Поплакать', emoji: '🥲', genre: 'Drama', a: '#2563eb', b: '#312e81' },
  { label: 'Улететь в космос', emoji: '🚀', genre: 'Sci-Fi', a: '#0891b2', b: '#1e3a8a' },
  { label: 'Влюбиться', emoji: '💞', genre: 'Romance', a: '#db2777', b: '#7c3aed' },
  { label: 'Всей семьёй', emoji: '🧸', genre: 'Animation', a: '#16a34a', b: '#0f766e' },
]

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState({})
  const [error, setError] = useState(null)
  const [recent, setRecent] = useState([])
  const [rolling, setRolling] = useState(false)
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

  async function surprise() {
    setRolling(true)
    try {
      const id = await getRandomMovieId()
      if (id) navigate(`/movie/${id}`)
    } finally {
      setRolling(false)
    }
  }

  return (
    <>
      <FeaturedHero />

      <div className="rail-head" style={{ marginTop: 28 }}>
        <h2>Что смотрим сегодня?</h2>
      </div>
      <div className="moods">
        {MOODS.map((m) => (
          <Link key={m.label} to={`/catalog?genre=${encodeURIComponent(m.genre)}`} className="mood"
                style={{ '--a': m.a, '--b': m.b }}>
            <span className="mood-emoji">{m.emoji}</span>
            <span className="mood-label">{m.label}</span>
          </Link>
        ))}
        <button type="button" className="mood mood-random" disabled={rolling} onClick={surprise}
                style={{ '--a': '#7c5cff', '--b': '#ec4899' }}>
          <span className="mood-emoji">🎲</span>
          <span className="mood-label">{rolling ? 'Ищу…' : 'Удиви меня'}</span>
        </button>
      </div>

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
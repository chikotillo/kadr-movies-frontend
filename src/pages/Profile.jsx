import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getFavorites, getWatchlist, getMyRatings, setListItem, deleteRating,
} from '../services/userApi'
import MovieCard from '../components/MovieCard'
import TasteProfile from '../components/TasteProfile'
import { Loader, ErrorBox } from '../components/Status'

const TABS = [
  { key: 'taste', label: 'Профиль вкуса' },
  { key: 'ratings', label: 'Мои оценки' },
  { key: 'favorites', label: 'Избранное' },
  { key: 'watchlist', label: 'Посмотреть позже' },
]

export default function Profile() {
  const { user, profile, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('taste')
  const [data, setData] = useState({ ratings: [], favorites: [], watchlist: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    Promise.all([getMyRatings(user.id), getFavorites(user.id), getWatchlist(user.id)])
      .then(([ratings, favorites, watchlist]) => setData({ ratings, favorites, watchlist }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading) return <Loader />
  if (!user) return <Navigate to="/login" replace />

  async function remove(kind, movieId) {
    setError(null)
    try {
      if (kind === 'ratings') await deleteRating(user.id, movieId)
      else await setListItem(kind, user.id, movieId, false)
      setData((d) => ({
        ...d,
        [kind]: d[kind].filter((x) => x.movies.movie_id !== movieId),
      }))
    } catch (e) {
      setError(e.message)
    }
  }

  const list = tab === 'taste' ? [] : data[tab]

  return (
    <>
      <h1>Личный кабинет</h1>
      <p className="muted">{profile?.username || user.email}</p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'tab active' : 'tab'}
                  onClick={() => setTab(t.key)}>
            {t.label}{t.key !== 'taste' ? ` (${data[t.key].length})` : ''}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} />}
      {loading && <Loader />}
      {!loading && tab === 'taste' && <TasteProfile ratings={data.ratings} />}
      {!loading && tab !== 'taste' && list.length === 0 && <p>Здесь пока пусто.</p>}

      <div className="grid">
        {!loading && tab !== 'taste' && list.map((item) => (
          <div key={item.movies.movie_id} className="card-wrap">
            <MovieCard movie={item.movies}
                       note={tab === 'ratings' ? `Ваша оценка: ${item.rating}` : null} />
            <button className="remove" onClick={() => remove(tab, item.movies.movie_id)}>
              {tab === 'ratings' ? 'Удалить оценку' : 'Убрать'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
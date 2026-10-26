import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getLatestReviews, getLikeInfo } from '../services/socialApi'
import useReviewActions from '../hooks/useReviewActions'
import ReviewItem from '../components/ReviewItem'
import { Loader } from '../components/Status'

const SIZE = 20

export default function Community() {
  const { user } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [likes, setLikes] = useState({})
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const { like, remove } = useReviewActions(setItems, setLikes)

  async function load(p) {
    try {
      const list = await getLatestReviews(p, SIZE)
      const info = await getLikeInfo(list.map((r) => r.id), user?.id)
      setItems((old) => (p === 0 ? list : [...(old ?? []), ...list]))
      setLikes((old) => ({ ...old, ...info }))
      setHasMore(list.length === SIZE)
      setPage(p)
    } catch (e) {
      toast(e.message, 'error')
      setItems((old) => old ?? [])
    }
  }

  useEffect(() => {
    load(0)
  }, [user?.id])

  async function more() {
    setLoadingMore(true)
    await load(page + 1)
    setLoadingMore(false)
  }

  return (
    <div className="feed">
      <h1>Сообщество</h1>
      <p className="muted">Что зрители пишут о фильмах. Присоединяйтесь: откройте любой фильм и напишите своё мнение.</p>

      {items === null && <Loader />}
      {items && items.length === 0 && (
        <p>Пока здесь тихо. <Link to="/catalog" className="link">Откройте фильм</Link> и напишите первым.</p>
      )}
      {items && items.map((r) => (
        <ReviewItem key={r.id} review={r} movie={r.movies} like={likes[r.id]} canLike={!!user}
                    isMine={user?.id === r.user_id} onLike={like} onDelete={remove} />
      ))}

      {hasMore && (
        <div className="pager">
          <button disabled={loadingMore} onClick={more}>
            {loadingMore ? 'Загружаю…' : 'Показать ещё'}
          </button>
        </div>
      )}
    </div>
  )
}
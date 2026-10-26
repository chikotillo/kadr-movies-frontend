import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getReviews, getLikeInfo, addReview } from '../services/socialApi'
import useReviewActions from '../hooks/useReviewActions'
import ReviewItem from './ReviewItem'
import { Loader } from './Status'

export default function Reviews({ movieId }) {
  const { user } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [likes, setLikes] = useState({})
  const [body, setBody] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [busy, setBusy] = useState(false)
  const { like, remove } = useReviewActions(setItems, setLikes)

  useEffect(() => {
    let cancelled = false
    setItems(null)
    ;(async () => {
      try {
        const list = await getReviews(movieId)
        const info = await getLikeInfo(list.map((r) => r.id), user?.id)
        if (!cancelled) {
          setItems(list)
          setLikes(info)
        }
      } catch (e) {
        if (!cancelled) {
          setItems([])
          toast(e.message, 'error')
        }
      }
    })()
    return () => { cancelled = true }
  }, [movieId, user?.id])

  async function submit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    try {
      const created = await addReview(user.id, movieId, body, spoiler)
      setItems((list) => [created, ...(list ?? [])])
      setBody('')
      setSpoiler(false)
      toast('Сообщение опубликовано')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="reviews">
      <h2>Обсуждение{items ? ` · ${items.length}` : ''}</h2>

      {user ? (
        <form className="review-form" onSubmit={submit}>
          <textarea value={body} maxLength={2000}
                    placeholder="Поделитесь впечатлением о фильме…"
                    onChange={(e) => setBody(e.target.value)} />
          <div className="review-form-row">
            <label className="checkline">
              <input type="checkbox" checked={spoiler}
                     onChange={(e) => setSpoiler(e.target.checked)} />
              Это спойлер
            </label>
            <span className="muted">{body.length} / 2000</span>
            <button disabled={busy || !body.trim()}>
              {busy ? 'Публикую…' : 'Опубликовать'}
            </button>
          </div>
        </form>
      ) : (
        <p className="banner">
          <Link to="/login">Войдите</Link>, чтобы участвовать в обсуждении.
        </p>
      )}

      {items === null && <Loader />}
      {items && items.length === 0 && <p className="muted">Пока никто не написал. Будьте первым!</p>}
      {items && items.map((r) => (
        <ReviewItem key={r.id} review={r} like={likes[r.id]} canLike={!!user}
                    isMine={user?.id === r.user_id} onLike={like} onDelete={remove} />
      ))}
    </section>
  )
}
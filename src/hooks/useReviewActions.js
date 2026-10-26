import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { setLike, deleteReview } from '../services/socialApi'

export default function useReviewActions(setItems, setLikes) {
  const { user } = useAuth()
  const toast = useToast()

  async function like(reviewId, on) {
    if (!user) return
    const shift = (delta, mine) =>
      setLikes((l) => ({
        ...l,
        [reviewId]: { count: Math.max(0, (l[reviewId]?.count ?? 0) + delta), mine },
      }))
    shift(on ? 1 : -1, on) // сразу меняем экран
    try {
      await setLike(user.id, reviewId, on)
    } catch (e) {
      shift(on ? -1 : 1, !on) // не вышло: откатываем
      toast(e.message, 'error')
    }
  }

  async function remove(id) {
    if (!window.confirm('Удалить сообщение?')) return
    try {
      await deleteReview(id)
      setItems((list) => list.filter((r) => r.id !== id))
      toast('Сообщение удалено')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return { like, remove }
}
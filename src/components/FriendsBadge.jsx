import { useEffect, useState } from 'react'
import '../friends.css'
import { useAuth } from '../context/AuthContext'
import { myFriendships, myRoomInvites } from '../services/friendsApi'

export default function FriendsBadge() {
  const { user } = useAuth()
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!user) {
      setN(0)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const [list, invites] = await Promise.all([myFriendships(), myRoomInvites()])
        const requests = list.filter((x) => x.status === 'pending' && x.incoming).length
        if (!cancelled) setN(requests + invites.length)
      } catch {
        // счётчик необязателен: при ошибке просто не показываем
      }
    }
    load()
    const timer = setInterval(load, 45000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [user?.id])

  return n > 0 ? <span className="dot-badge">{n}</span> : null
}
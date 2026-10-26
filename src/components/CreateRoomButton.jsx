import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { createRoom, joinRoom, addRoomMovie } from '../services/roomsApi'

export default function CreateRoomButton({ pool = [], disabled }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function go() {
    if (!user) {
      toast('Войдите, чтобы крутить с друзьями', 'error')
      navigate('/login')
      return
    }
    setBusy(true)
    try {
      const code = await createRoom()
      const roomId = await joinRoom(code)
      for (const m of pool.slice(0, 20)) {
        await addRoomMovie(roomId, user.id, m.movie_id)
      }
      toast('Комната создана: позовите друзей')
      navigate(`/roulette/room/${code}`)
    } catch (e) {
      toast(e.message, 'error')
      setBusy(false)
    }
  }

  return (
    <button className="ghost" disabled={disabled || busy} onClick={go}>
      {busy ? 'Создаю…' : 'Крутить с друзьями'}
    </button>
  )
}
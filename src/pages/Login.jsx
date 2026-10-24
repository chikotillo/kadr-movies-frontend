import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password, username)
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/profile')
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
      {mode === 'register' && (
        <input placeholder="Имя" value={username}
               onChange={(e) => setUsername(e.target.value)} required />
      )}
      <input type="email" placeholder="Email" value={email}
             onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Пароль (мин. 6 символов)" minLength={6}
             value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="error">{error}</p>}
      <button disabled={busy}>
        {busy ? '...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
      </button>
      <button type="button" className="link"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
      </button>
    </form>
  )
}
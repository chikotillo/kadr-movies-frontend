import { supabase } from './supabaseClient'

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

// возвращает { items, source }: source = 'als' | 'genre_fallback' | 'popular_fallback' | null
export async function getMyRecommendations(limit = 20) {
  if (!API_URL) throw new Error('Не задан VITE_API_URL')

  // действующий токен пользователя из Supabase
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Войдите в аккаунт, чтобы получить рекомендации')

  // бесплатный Render засыпает: первый запрос может идти до минуты
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 70000)
  let res
  try {
    res = await fetch(`${API_URL}/recommendations/me?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
  } catch (e) {
    throw new Error(e.name === 'AbortError'
      ? 'Сервер долго не отвечает, попробуйте ещё раз'
      : 'Не удалось связаться с сервером рекомендаций')
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 401) throw new Error('Сессия истекла, войдите заново')
  if (!res.ok) throw new Error(`Сервер рекомендаций вернул ошибку ${res.status}`)

  const json = await res.json()
  const items = Array.isArray(json)
    ? json
    : json.recommendations ?? json.items ?? json.results ?? []
  return { items, source: Array.isArray(json) ? null : json.source ?? null }
}

// если API вернул только id, догружаем фильмы из Supabase
export async function attachMovies(items) {
  const ids = items.map((x) => Number(x.movie_id ?? x.movieId ?? x.id)).filter(Boolean)
  if (!ids.length) return []
  const { data, error } = await supabase.from('movies').select('*').in('movie_id', ids)
  if (error) throw error
  const byId = new Map(data.map((m) => [m.movie_id, m]))
  return items
    .map((x) => {
      const id = Number(x.movie_id ?? x.movieId ?? x.id)
      const movie = byId.get(id)
      return movie
        ? { movie, reason: x.reason ?? x.explanation ?? null, score: x.score ?? x.predicted_rating ?? null }
        : null
    })
    .filter(Boolean)
}
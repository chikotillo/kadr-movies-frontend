const BASE = import.meta.env.VITE_RECS_API_URL

function url(path) {
  // на опубликованном сайте адрес API задаётся переменной окружения
  if (!BASE) throw new Error('API_NOT_CONFIGURED')
  return `${BASE}${path}`
}

export async function getHealth() {
  const r = await fetch(url('/health'))
  if (!r.ok) throw new Error('API недоступен')
  return r.json()
}

// Персональные рекомендации для пользователя MovieLens
export async function getRecommendations(mlUserId, limit = 10) {
  const r = await fetch(url(`/recommendations/${mlUserId}?limit=${limit}`))
  if (r.status === 404) return []
  if (!r.ok) throw new Error(`Ошибка API: ${r.status}`)
  const data = await r.json()
  return data.map((m) => ({
    movieId: m.movieId,
    title: m.title,
    genres: m.genres ? m.genres.split('|') : [],
    predictedRating: m.predictedRating,
  }))
}

// Популярные фильмы для пользователей без персональных рекомендаций
export async function getPopularFallback(limit = 12) {
  const r = await fetch(url(`/recommendations/new?limit=${limit}`))
  if (!r.ok) throw new Error(`Ошибка API: ${r.status}`)
  const data = await r.json()
  return data.map((m) => ({
    movieId: m.movieId,
    title: m.title,
    genres: m.genres ? m.genres.split('|') : [],
    averageRating: m.averageRating,
    ratingCount: m.ratingCount,
    type: m.recommendationType,
  }))
}
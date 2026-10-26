import { supabase } from './supabaseClient'

const KEY = 'lumen_recent'

export function getRecentIds() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function pushRecent(id) {
  try {
    const list = [id, ...getRecentIds().filter((x) => x !== id)].slice(0, 12)
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* хранилище недоступно: не страшно */
  }
}

export async function getRecentMovies() {
  const ids = getRecentIds()
  if (!ids.length) return []
  const { data, error } = await supabase.from('movies').select('*').in('movie_id', ids)
  if (error) throw error
  const byId = new Map(data.map((m) => [m.movie_id, m]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}
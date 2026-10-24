import { supabase } from './supabaseClient'

export async function getUserMovieState(userId, movieId) {
  const [r, f, w] = await Promise.all([
    supabase.from('ratings').select('rating')
      .eq('user_id', userId).eq('movie_id', movieId).maybeSingle(),
    supabase.from('favorites').select('movie_id')
      .eq('user_id', userId).eq('movie_id', movieId).maybeSingle(),
    supabase.from('watchlist').select('movie_id')
      .eq('user_id', userId).eq('movie_id', movieId).maybeSingle(),
  ])
  for (const x of [r, f, w]) if (x.error) throw x.error
  return {
    rating: r.data ? Number(r.data.rating) : null,
    favorite: !!f.data,
    watchlist: !!w.data,
  }
}

export async function saveRating(userId, movieId, rating) {
  const { error } = await supabase.from('ratings').upsert(
    { user_id: userId, movie_id: movieId, rating, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,movie_id' }
  )
  if (error) throw error
}

export async function deleteRating(userId, movieId) {
  const { error } = await supabase.from('ratings').delete()
    .eq('user_id', userId).eq('movie_id', movieId)
  if (error) throw error
}

// table: 'favorites' или 'watchlist'
export async function setListItem(table, userId, movieId, on) {
  if (on) {
    const { error } = await supabase.from(table).upsert(
      { user_id: userId, movie_id: movieId },
      { onConflict: 'user_id,movie_id', ignoreDuplicates: true }
    )
    if (error) throw error
  } else {
    const { error } = await supabase.from(table).delete()
      .eq('user_id', userId).eq('movie_id', movieId)
    if (error) throw error
  }
}
async function getList(table, userId, fields = '') {
  const { data, error } = await supabase
    .from(table)
    .select(`${fields}created_at, movies(*)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.filter((x) => x.movies)
}

export const getFavorites = (userId) => getList('favorites', userId)
export const getWatchlist = (userId) => getList('watchlist', userId)
export const getMyRatings = (userId) => getList('ratings', userId, 'rating, ')

export async function getRatingsCount(userId) {
  const { count, error } = await supabase
    .from('ratings')
    .select('movie_id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}

export async function getRatingsFor(userId, movieIds) {
  if (!movieIds.length) return {}
  const { data, error } = await supabase
    .from('ratings')
    .select('movie_id, rating')
    .eq('user_id', userId)
    .in('movie_id', movieIds)
  if (error) throw error
  return Object.fromEntries(data.map((r) => [r.movie_id, Number(r.rating)]))
}
import { supabase } from './supabaseClient'

const COLS = 'id, user_id, movie_id, author_name, body, spoiler, created_at'

export async function getReviews(movieId) {
  const { data, error } = await supabase
    .from('reviews').select(COLS)
    .eq('movie_id', movieId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

export async function getLatestReviews(page = 0, size = 20) {
  const from = page * size
  const { data, error } = await supabase
    .from('reviews')
    .select(`${COLS}, movies(movie_id, title, title_ru, release_year, genres, poster_url)`)
    .order('created_at', { ascending: false })
    .range(from, from + size - 1)
  if (error) throw error
  return data
}

// количество лайков и мой лайк для списка сообщений
export async function getLikeInfo(reviewIds, userId) {
  if (!reviewIds.length) return {}
  const { data, error } = await supabase
    .from('review_likes').select('review_id, user_id').in('review_id', reviewIds)
  if (error) throw error
  const info = {}
  data.forEach(({ review_id, user_id }) => {
    const x = (info[review_id] ??= { count: 0, mine: false })
    x.count += 1
    if (userId && user_id === userId) x.mine = true
  })
  return info
}

export async function addReview(userId, movieId, body, spoiler) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ user_id: userId, movie_id: movieId, body: body.trim(), spoiler })
    .select(COLS).single()
  if (error) throw error
  return data
}

export async function deleteReview(id) {
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) throw error
}

export async function setLike(userId, reviewId, on) {
  if (on) {
    const { error } = await supabase.from('review_likes').upsert(
      { review_id: reviewId, user_id: userId },
      { onConflict: 'review_id,user_id', ignoreDuplicates: true })
    if (error) throw error
  } else {
    const { error } = await supabase.from('review_likes').delete()
      .eq('review_id', reviewId).eq('user_id', userId)
    if (error) throw error
  }
}
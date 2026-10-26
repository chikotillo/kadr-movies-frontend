import { supabase } from './supabaseClient'

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data
}

export const searchUsers = (q) => rpc('search_users', { q })
export const myFriendships = () => rpc('my_friendships')
export const sendFriendRequest = (target) => rpc('send_friend_request', { target })
export const respondToRequest = (fid, accept) => rpc('respond_friend_request', { fid, accept })
export const removeFriendship = (fid) => rpc('remove_friendship', { fid })
export const myRoomInvites = () => rpc('my_room_invites')
export const dismissInvite = (iid) => rpc('dismiss_invite', { iid })
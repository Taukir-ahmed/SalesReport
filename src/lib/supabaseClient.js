import { createClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

/* People often paste the full REST endpoint from the Supabase dashboard.
 * Trim it back to the project origin so either form works. */
export const url = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')

export const isSupabaseConfigured =
  !!url && !!key && !url.includes('your-project-ref') && !key.includes('your-anon')

export const projectRef = isSupabaseConfigured
  ? (url.match(/^https?:\/\/([^.]+)\./)?.[1] ?? url)
  : null

export const supabase = isSupabaseConfigured
  ? createClient(url, key, { auth: { persistSession: false } })
  : null

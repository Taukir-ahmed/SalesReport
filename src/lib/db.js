/* ---------------------------------------------------------------------------
 * DATA LAYER — Supabase only
 * ---------------------------------------------------------------------------
 * Everything lives in your Supabase project. Nothing is kept in the browser,
 * so the sheet is the same from any device or machine you open it on.
 *
 * Rows are stored as { id, month_key, position, data } where `data` is a JSON
 * blob keyed by column key. That is the trick that lets you add columns later
 * without ever touching the database schema.
 * ------------------------------------------------------------------------- */
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { CORE_KEYS, DEFAULT_COLUMNS, normalizeColumn, sortColumns } from './columns'

export const MODE = 'supabase'
export { isSupabaseConfigured }

/* Turn Postgres/PostgREST noise into something you can act on. */
export function friendlyError(e) {
  if (!e) return 'Something went wrong.'
  const code = e.code || ''
  const msg = e.message || String(e)

  if (code === '42P01' || /relation .* does not exist|Could not find the table/i.test(msg)) {
    if (/pipeline/i.test(msg))
      return 'The pipeline table isn\'t in your project yet — run supabase/pipeline.sql in the Supabase SQL editor, then reload.'
    return "The tables aren't in your project yet — run supabase/schema.sql in the Supabase SQL editor, then reload."
  }
  if (code === '42501' || /row-level security/i.test(msg))
    return 'Supabase blocked that write (row-level security). Re-run the policy section at the bottom of supabase/schema.sql.'
  /* a table that exists but is out of date -- easy to hit after an update */
  if (code === '42703' || /column .* does not exist/i.test(msg)) {
    if (/deleted_at/i.test(msg))
      return 'Your pipeline table is missing the deleted_at column that the bin needs. Run the ALTER TABLE line at the top of supabase/pipeline.sql in the Supabase SQL editor, then reload.'
    return `${msg}. Re-run supabase/pipeline.sql (or schema.sql) to bring the table up to date, then reload.`
  }
  if (/JWT|apikey|Invalid API key/i.test(msg))
    return 'Supabase rejected the API key. Check VITE_SUPABASE_ANON_KEY in your .env, then restart the dev server.'
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg))
    return "Couldn't reach Supabase. Check your internet connection and that VITE_SUPABASE_URL is right."
  return msg
}

const guard = () => {
  if (!supabase) throw new Error('Supabase is not configured.')
}

/* ------------------------------- columns -------------------------------- */

export async function loadColumns() {
  guard()
  const { data, error } = await supabase.from('sheet_columns').select('*').order('position')
  if (error) throw error
  if (!data || data.length === 0) {
    await saveColumns(DEFAULT_COLUMNS)
    return DEFAULT_COLUMNS.map(normalizeColumn)
  }

  const found = sortColumns(data.map(normalizeColumn))

  /* A sheet created before Status/Remarks existed shouldn't be stuck without
   * them -- add whatever core column is missing, once, on the way in. */
  const have = new Set(found.map((c) => c.key))
  const missing = DEFAULT_COLUMNS.filter((c) => CORE_KEYS.includes(c.key) && !have.has(c.key))
  if (missing.length) {
    const merged = [...found, ...missing.map(normalizeColumn)].map((c, i) => ({ ...c, position: i }))
    return await saveColumns(merged)
  }
  return found
}

/* Whole-list save: upsert what's there now, drop anything you removed. */
export async function saveColumns(columns) {
  guard()
  const clean = sortColumns(columns.map((c, i) => normalizeColumn({ ...c, position: i }, i)))
  const keep = new Set(clean.map((c) => c.key))

  const { data: existing, error: readErr } = await supabase.from('sheet_columns').select('key')
  if (readErr) throw readErr

  const drop = (existing ?? []).map((r) => r.key).filter((k) => !keep.has(k))
  if (drop.length) {
    const { error } = await supabase.from('sheet_columns').delete().in('key', drop)
    if (error) throw error
  }
  if (clean.length) {
    const { error } = await supabase.from('sheet_columns').upsert(clean, { onConflict: 'key' })
    if (error) throw error
  }
  return clean
}

/* ---------------------------------- rows --------------------------------- */

export async function loadRows(monthKey) {
  guard()
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('month_key', monthKey)
    .order('position')
  if (error) throw error
  return data ?? []
}

export async function loadMonths() {
  guard()
  const { data, error } = await supabase.from('sales').select('month_key')
  if (error) throw error
  return [...new Set((data ?? []).map((r) => r.month_key))]
}

export async function insertRow(row) {
  guard()
  const { data, error } = await supabase
    .from('sales')
    .insert({ month_key: row.month_key, position: row.position ?? 0, data: row.data ?? {} })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRow(id, patch) {
  guard()
  const { data, error } = await supabase.from('sales').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteRow(id) {
  guard()
  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) throw error
}

/* Used if a column key ever changes -- keeps the stored JSON tidy. */
export async function renameDataKey(oldKey, newKey) {
  guard()
  if (oldKey === newKey) return
  const { data, error } = await supabase.from('sales').select('id, data')
  if (error) throw error
  for (const r of data ?? []) {
    if (r.data && Object.prototype.hasOwnProperty.call(r.data, oldKey)) {
      const next = { ...r.data, [newKey]: r.data[oldKey] }
      delete next[oldKey]
      await supabase.from('sales').update({ data: next }).eq('id', r.id)
    }
  }
}

/* One quick round-trip on boot so problems surface immediately. */
export async function ping() {
  guard()
  const { error } = await supabase.from('sales').select('id', { count: 'exact', head: true })
  if (error) throw error
  return true
}

/* -------------------------------- pipeline -------------------------------- */

export function isMissingTable(e) {
  const msg = e?.message || ''
  return e?.code === '42P01' || /relation .*(pipeline).* does not exist|Could not find the table/i.test(msg)
}

export const BIN_DAYS = 7

export async function loadPipeline({ includeMoved = false } = {}) {
  guard()
  let q = supabase
    .from('pipeline')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (!includeMoved) q = q.is('moved_at', null)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

/* Deleted leads wait in the bin for a week before they really go. */
export async function loadBin() {
  guard()
  const { data, error } = await supabase
    .from('pipeline')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function restoreLead(id) {
  guard()
  const { data, error } = await supabase
    .from('pipeline')
    .update({ deleted_at: null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function purgeLead(id) {
  guard()
  const { error } = await supabase.from('pipeline').delete().eq('id', id)
  if (error) throw error
}

/* Anything binned more than a week ago is cleared out on the next load. */
export async function purgeExpired() {
  guard()
  const cutoff = new Date(Date.now() - BIN_DAYS * 86400000).toISOString()
  const { error } = await supabase.from('pipeline').delete().lt('deleted_at', cutoff)
  if (error) throw error
}

export async function insertLead(lead = {}) {
  guard()
  const { data, error } = await supabase
    .from('pipeline')
    .insert({
      name: lead.name ?? '',
      phone: lead.phone ?? '',
      course: lead.course ?? '',
      remarks: lead.remarks ?? '',
      status: lead.status ?? '',
      added_on: lead.added_on ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLead(id, patch) {
  guard()
  const { data, error } = await supabase.from('pipeline').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

/* Not a real delete -- it drops the lead into the bin. */
export async function deleteLead(id) {
  guard()
  const { data, error } = await supabase
    .from('pipeline')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

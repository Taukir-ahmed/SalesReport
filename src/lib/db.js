/* ---------------------------------------------------------------------------
 * DATA LAYER — Supabase with Local Demo Mode Fallback
 * ---------------------------------------------------------------------------
 * When configured, everything lives in your Supabase project.
 * When Supabase is not yet configured, Local Demo Mode provides a full-featured
 * interactive experience using browser localStorage.
 * ------------------------------------------------------------------------- */
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { CORE_KEYS, DEFAULT_COLUMNS, normalizeColumn, sortColumns, monthKeyOf } from './columns'
import { getSeedRows, getSeedLeads } from './demoData'

export const MODE = isSupabaseConfigured ? 'supabase' : 'demo'
export { isSupabaseConfigured }

export function isDemoMode() {
  return !isSupabaseConfigured && localStorage.getItem('salesroom_demo_mode') === 'true'
}

/* Turn Postgres/PostgREST noise into something you can act on. */
export function friendlyError(e) {
  if (!e) return 'Something went wrong.'
  const code = e.code || ''
  const msg = e.message || String(e)

  if (code === '42P01' || /relation .* does not exist|Could not find the table/i.test(msg)) {
    if (/pipeline/i.test(msg))
      return "The pipeline table isn't in your project yet — run supabase/pipeline.sql in the Supabase SQL editor, then reload."
    return "The tables aren't in your project yet — run supabase/schema.sql in the Supabase SQL editor, then reload."
  }
  if (code === '42501' || /row-level security/i.test(msg))
    return 'Supabase blocked that write (row-level security). Re-run the policy section at the bottom of supabase/schema.sql.'
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
  if (!supabase && !isDemoMode()) throw new Error('Supabase is not configured.')
}

/* --------------------------- Demo LocalStorage Helpers -------------------------- */
const LS_COLUMNS = 'salesroom_demo_columns'
const LS_ROWS = 'salesroom_demo_rows'
const LS_LEADS = 'salesroom_demo_leads'

function getLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setLocalJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch (e) {
    console.error('LocalStorage write failed:', e)
  }
}

/* ------------------------------- columns -------------------------------- */

export async function loadColumns() {
  if (isDemoMode()) {
    const stored = getLocalJson(LS_COLUMNS, null)
    if (!stored || stored.length === 0) {
      setLocalJson(LS_COLUMNS, DEFAULT_COLUMNS)
      return DEFAULT_COLUMNS.map(normalizeColumn)
    }
    return sortColumns(stored.map(normalizeColumn))
  }

  guard()
  const { data, error } = await supabase.from('sheet_columns').select('*').order('position')
  if (error) throw error
  if (!data || data.length === 0) {
    await saveColumns(DEFAULT_COLUMNS)
    return DEFAULT_COLUMNS.map(normalizeColumn)
  }

  const found = sortColumns(data.map(normalizeColumn))
  const have = new Set(found.map((c) => c.key))
  const missing = DEFAULT_COLUMNS.filter((c) => CORE_KEYS.includes(c.key) && !have.has(c.key))
  if (missing.length) {
    const merged = [...found, ...missing.map(normalizeColumn)].map((c, i) => ({ ...c, position: i }))
    return await saveColumns(merged)
  }
  return found
}

export async function saveColumns(columns) {
  const clean = sortColumns(columns.map((c, i) => normalizeColumn({ ...c, position: i }, i)))

  if (isDemoMode()) {
    setLocalJson(LS_COLUMNS, clean)
    return clean
  }

  guard()
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
  if (isDemoMode()) {
    let rows = getLocalJson(LS_ROWS, null)
    if (!rows) {
      rows = getSeedRows(monthKey)
      setLocalJson(LS_ROWS, rows)
    }
    return rows
      .filter((r) => r.month_key === monthKey)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }

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
  if (isDemoMode()) {
    const rows = getLocalJson(LS_ROWS, null) || []
    const nowKey = monthKeyOf(new Date())
    const keys = new Set([nowKey, ...rows.map((r) => r.month_key)])
    return [...keys]
  }

  guard()
  const { data, error } = await supabase.from('sales').select('month_key')
  if (error) throw error
  return [...new Set((data ?? []).map((r) => r.month_key))]
}

export async function insertRow(row) {
  if (isDemoMode()) {
    const rows = getLocalJson(LS_ROWS, null) || getSeedRows(row.month_key)
    const newRow = {
      id: 'demo-row-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      month_key: row.month_key,
      position: row.position ?? rows.length,
      data: row.data ?? {},
    }
    rows.push(newRow)
    setLocalJson(LS_ROWS, rows)
    return newRow
  }

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
  if (isDemoMode()) {
    const rows = getLocalJson(LS_ROWS, [])
    const idx = rows.findIndex((r) => r.id === id)
    if (idx !== -1) {
      rows[idx] = {
        ...rows[idx],
        ...patch,
        data: patch.data ? { ...rows[idx].data, ...patch.data } : rows[idx].data,
      }
      setLocalJson(LS_ROWS, rows)
      return rows[idx]
    }
    return null
  }

  guard()
  const { data, error } = await supabase.from('sales').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteRow(id) {
  if (isDemoMode()) {
    const rows = getLocalJson(LS_ROWS, [])
    setLocalJson(
      LS_ROWS,
      rows.filter((r) => r.id !== id)
    )
    return
  }

  guard()
  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) throw error
}

export async function renameDataKey(oldKey, newKey) {
  if (oldKey === newKey) return

  if (isDemoMode()) {
    const rows = getLocalJson(LS_ROWS, [])
    for (const r of rows) {
      if (r.data && Object.prototype.hasOwnProperty.call(r.data, oldKey)) {
        r.data[newKey] = r.data[oldKey]
        delete r.data[oldKey]
      }
    }
    setLocalJson(LS_ROWS, rows)
    return
  }

  guard()
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

export async function ping() {
  if (isDemoMode()) return true
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
  if (isDemoMode()) {
    let leads = getLocalJson(LS_LEADS, null)
    if (!leads) {
      leads = getSeedLeads()
      setLocalJson(LS_LEADS, leads)
    }
    return leads
      .filter((l) => !l.deleted_at && (includeMoved || !l.moved_at))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }

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

export async function loadBin() {
  if (isDemoMode()) {
    const leads = getLocalJson(LS_LEADS, [])
    return leads
      .filter((l) => !!l.deleted_at)
      .sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0))
  }

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
  if (isDemoMode()) {
    const leads = getLocalJson(LS_LEADS, [])
    const lead = leads.find((l) => l.id === id)
    if (lead) {
      lead.deleted_at = null
      setLocalJson(LS_LEADS, leads)
      return lead
    }
    return null
  }

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
  if (isDemoMode()) {
    const leads = getLocalJson(LS_LEADS, [])
    setLocalJson(
      LS_LEADS,
      leads.filter((l) => l.id !== id)
    )
    return
  }

  guard()
  const { error } = await supabase.from('pipeline').delete().eq('id', id)
  if (error) throw error
}

export async function purgeExpired() {
  if (isDemoMode()) {
    const cutoff = new Date(Date.now() - BIN_DAYS * 86400000).toISOString()
    const leads = getLocalJson(LS_LEADS, [])
    setLocalJson(
      LS_LEADS,
      leads.filter((l) => !l.deleted_at || l.deleted_at >= cutoff)
    )
    return
  }

  guard()
  const cutoff = new Date(Date.now() - BIN_DAYS * 86400000).toISOString()
  const { error } = await supabase.from('pipeline').delete().lt('deleted_at', cutoff)
  if (error) throw error
}

export async function insertLead(lead = {}) {
  if (isDemoMode()) {
    const leads = getLocalJson(LS_LEADS, null) || getSeedLeads()
    const newLead = {
      id: 'demo-lead-' + Date.now(),
      name: lead.name ?? '',
      phone: lead.phone ?? '',
      course: lead.course ?? '',
      remarks: lead.remarks ?? '',
      status: lead.status ?? '',
      added_on: lead.added_on ?? new Date().toISOString(),
      created_at: new Date().toISOString(),
      moved_at: null,
      deleted_at: null,
    }
    leads.unshift(newLead)
    setLocalJson(LS_LEADS, leads)
    return newLead
  }

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
  if (isDemoMode()) {
    const leads = getLocalJson(LS_LEADS, [])
    const idx = leads.findIndex((l) => l.id === id)
    if (idx !== -1) {
      leads[idx] = { ...leads[idx], ...patch }
      setLocalJson(LS_LEADS, leads)
      return leads[idx]
    }
    return null
  }

  guard()
  const { data, error } = await supabase.from('pipeline').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteLead(id) {
  if (isDemoMode()) {
    const leads = getLocalJson(LS_LEADS, [])
    const lead = leads.find((l) => l.id === id)
    if (lead) {
      lead.deleted_at = new Date().toISOString()
      setLocalJson(LS_LEADS, leads)
      return lead
    }
    return null
  }

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

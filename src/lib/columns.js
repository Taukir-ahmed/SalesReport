import { usesOptions } from './fieldTypes'
import { SALE_STATUS_OPTIONS } from './status'

/* The sheet you start with. Everything here is editable from the
 * "Columns" panel at runtime -- this is only the first-run seed. */
export const DEFAULT_COLUMNS = [
  {
    key: 'date',
    label: 'Date',
    type: 'date',
    options: [],
    width: 140,
    position: 0,
    visible: true,
    required: true,
    locked: true, // the month a row belongs to is read off this column
  },
  {
    key: 'customer',
    label: 'Customer Name',
    type: 'text',
    options: [],
    width: 240,
    position: 1,
    visible: true,
    required: true,
    locked: false,
  },
  {
    key: 'course',
    label: 'Course',
    type: 'select',
    options: [
      'Full Stack Development',
      'Data Science & AI',
      'Digital Marketing',
      'UI/UX Design',
      'Cyber Security',
    ],
    width: 230,
    position: 2,
    visible: true,
    required: false,
    locked: false,
  },
  {
    key: 'amount',
    label: 'Amount',
    type: 'currency',
    options: [],
    width: 170,
    position: 3,
    visible: true,
    required: false,
    locked: false,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'status',
    options: SALE_STATUS_OPTIONS,
    width: 165,
    position: 4,
    visible: true,
    required: false,
    locked: false,
  },
  {
    key: 'remarks',
    label: 'Remarks',
    type: 'text',
    options: [],
    width: 240,
    position: 5,
    visible: true,
    required: false,
    locked: false,
  },
]

/* Columns the app relies on. If a sheet was created before one of these
 * existed, it gets added on next load instead of the user hunting for it. */
export const CORE_KEYS = ['date', 'customer', 'course', 'amount', 'status', 'remarks']
export const STATUS_KEY = 'status'
export const AMOUNT_KEY = 'amount'
export const partsKey = (key) => `${key}_parts`

export const DATE_KEY = 'date'

export function normalizeColumn(col, index = 0) {
  return {
    key: col.key,
    label: col.label ?? col.key,
    type: col.type ?? 'text',
    options: usesOptions(col.type) ? col.options ?? [] : col.options ?? [],
    width: Number(col.width) || 160,
    position: col.position ?? index,
    visible: col.visible !== false,
    required: !!col.required,
    locked: !!col.locked,
  }
}

export function sortColumns(cols) {
  return [...cols].sort((a, b) => a.position - b.position)
}

export function slugKey(label, existing = []) {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30) || 'field'
  let key = base
  let n = 2
  while (existing.includes(key)) key = `${base}_${n++}`
  return key
}

/* A fresh, empty row shaped by the current columns. */
export function blankRow(columns, monthKey) {
  const data = {}
  for (const c of columns) {
    if (c.type === 'checkbox') data[c.key] = false
    else data[c.key] = ''
  }
  if (data[DATE_KEY] !== undefined) data[DATE_KEY] = defaultDateFor(monthKey)
  return data
}

/* Today's date if we're looking at the current month, else the 1st of that month. */
export function defaultDateFor(monthKey) {
  const today = new Date()
  const nowKey = monthKeyOf(today)
  if (!monthKey || monthKey === nowKey) return toISODate(today)
  return `${monthKey}-01`
}

export function toISODate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function monthKeyOf(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(String(dateLike) + 'T00:00:00')
  if (isNaN(d)) return monthKeyOf(new Date())
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}`
}

export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthKeyOf(d)
}

/* Which monthly sheet does this row belong to? Read off the date column when
 * one exists, otherwise it stays wherever it was created. */
export function monthKeyForRow(data, fallback) {
  const v = data?.[DATE_KEY]
  if (v) return monthKeyOf(v)
  return fallback
}

export function monthShort(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

/* A row the user started but hasn't typed anything into yet. The auto-filled
 * date and unticked checkboxes don't count as content. */
export function isBlankRow(row, columns) {
  return columns.every(
    (c) => c.type === 'date' || c.type === 'checkbox' || !row?.data?.[c.key]
  )
}

/* ------------------------------ day grouping ------------------------------ */

export function lastDayOfMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function dayLabel(iso) {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return iso
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export function weekdayLabel(iso) {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return ''
  return d.toLocaleDateString('en-IN', { weekday: 'short' })
}

/* Build one entry per calendar day of the month, in order.
 *   kind 'sales'  -> at least one sale logged that day (green)
 *   kind 'nosale' -> a day that has been and gone with nothing logged (red)
 *   kind 'today'  -> today, still empty; not marked as a loss yet
 * Days in the future are left out entirely, and rows with no date at all are
 * collected at the end so nothing can go missing.
 */
export function buildDayGroups(rows, monthKey, today = new Date()) {
  const byDate = new Map()
  const undated = []
  for (const r of rows) {
    const d = r.data?.[DATE_KEY]
    if (!d) undated.push(r)
    else {
      if (!byDate.has(d)) byDate.set(d, [])
      byDate.get(d).push(r)
    }
  }

  const todayIso = toISODate(today)
  const todayMonth = monthKeyOf(today)
  const groups = []

  if (monthKey <= todayMonth) {
    const lastDay = monthKey === todayMonth ? Number(todayIso.slice(8, 10)) : lastDayOfMonth(monthKey)
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${monthKey}-${String(d).padStart(2, '0')}`
      const dayRows = byDate.get(iso)
      byDate.delete(iso)
      if (dayRows && dayRows.length) groups.push({ date: iso, rows: dayRows, kind: 'sales' })
      else groups.push({ date: iso, rows: [], kind: iso === todayIso ? 'today' : 'nosale' })
    }
  }

  // any dated rows that fell outside the loop (e.g. a future date typed in)
  for (const [iso, dayRows] of [...byDate.entries()].sort()) {
    groups.push({ date: iso, rows: dayRows, kind: 'sales' })
  }
  groups.sort((a, b) => a.date.localeCompare(b.date))
  if (undated.length) groups.push({ date: null, rows: undated, kind: 'sales' })
  return groups
}

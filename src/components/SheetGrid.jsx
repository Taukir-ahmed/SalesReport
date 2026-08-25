import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { typeOf } from '../lib/fieldTypes'
import {
  DATE_KEY,
  buildDayGroups,
  dayLabel,
  isBlankRow,
  partsKey,
  weekdayLabel,
} from '../lib/columns'
import { toneOf } from '../lib/status'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

const TYPE_ICON = {
  text: 'Abc',
  select: '▾',
  status: '●',
  number: '#',
  currency: '₹',
  date: '📅',
  checkbox: '☑',
}

/* --------------------------- the editable cell --------------------------- */
function CellEditor({ col, value, onCommit, onCancel, onNav }) {
  const t = typeOf(col)
  const [v, setV] = useState(value ?? '')
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    if (el.select && t.input !== 'date' && t.input !== 'select') el.select()
  }, [t.input])

  const commit = () => onCommit(t.parse(v))

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
      onNav(1, 0)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      commit()
      onNav(0, e.shiftKey ? -1 : 1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  if (t.input === 'select') {
    return (
      <select
        ref={ref}
        className="cell-input"
        value={v}
        onChange={(e) => {
          setV(e.target.value)
          onCommit(e.target.value)
        }}
        onKeyDown={onKeyDown}
        onBlur={commit}
      >
        <option value="">—</option>
        {(col.options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {v && !(col.options || []).includes(v) && <option value={v}>{v}</option>}
      </select>
    )
  }

  return (
    <input
      ref={ref}
      className={`cell-input ${t.align === 'right' ? 'right' : ''}`}
      type={t.input === 'number' ? 'number' : t.input === 'date' ? 'date' : 'text'}
      step={t.input === 'number' ? 'any' : undefined}
      value={v ?? ''}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={commit}
      placeholder={col.type === 'currency' ? '0' : ''}
    />
  )
}

/* -------------------------------- the grid -------------------------------- */
export default function SheetGrid({
  columns,
  rows,
  monthKey,
  grouped,
  hideEmptyDays,
  onHideEmptyDays,
  sort,
  onSort,
  onCell,
  onAddRow,
  onDeleteRow,
  onResize,
  onAddPayment,
  focusCell,
  clearFocus,
  busy,
  searching,
}) {
  const [editing, setEditing] = useState(null)
  const resizing = useRef(null)

  const dateCol = columns.find((c) => c.key === DATE_KEY)
  const useGroups = grouped && !!dateCol && !sort.key
  const bodyCols = useGroups ? columns.filter((c) => c.key !== DATE_KEY) : columns

  const allGroups = useGroups ? buildDayGroups(rows, monthKey) : null
  const emptyDays = allGroups ? allGroups.filter((g) => g.kind === 'nosale').length : 0
  const groups = allGroups && hideEmptyDays ? allGroups.filter((g) => g.rows.length > 0) : allGroups
  const flatRows = useGroups ? groups.flatMap((g) => g.rows) : rows

  /* land on the live end of the month rather than on the 1st */
  const scrollRef = useRef(null)
  const landedOn = useRef(null)
  useLayoutEffect(() => {
    if (!useGroups || landedOn.current === monthKey || !scrollRef.current) return
    landedOn.current = monthKey
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [useGroups, monthKey, rows.length])

  useEffect(() => {
    if (focusCell) {
      setEditing(focusCell)
      clearFocus()
    }
  }, [focusCell, clearFocus])

  const isBlank = useCallback((row) => !!row && isBlankRow(row, columns), [columns])

  /* reuse the trailing blank row instead of stacking up more of them */
  const requestRow = useCallback(
    async (focusKey, dateISO) => {
      const last = flatRows[flatRows.length - 1]
      if (!dateISO && isBlank(last)) {
        setEditing({ rowId: last.id, key: focusKey ?? bodyCols[0]?.key })
        return last
      }
      return onAddRow(focusKey, dateISO)
    },
    [flatRows, bodyCols, isBlank, onAddRow]
  )

  const move = useCallback(
    async (rowId, colIdx, dRow, dCol) => {
      const rowIdx = flatRows.findIndex((r) => r.id === rowId)
      let r = rowIdx + dRow
      let c = colIdx + dCol
      if (c >= bodyCols.length) {
        c = 0
        r += 1
      } else if (c < 0) {
        c = bodyCols.length - 1
        r -= 1
      }
      if (r < 0) return setEditing(null)
      if (r >= flatRows.length) {
        const created = await requestRow(bodyCols[Math.max(c, 0)]?.key)
        if (!created) setEditing(null)
        return
      }
      setEditing({ rowId: flatRows[r].id, key: bodyCols[c].key })
    },
    [bodyCols, flatRows, requestRow]
  )

  const startResize = (e, col) => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = { key: col.key, startX: e.clientX, startW: col.width }
    const onMove = (ev) => {
      const s = resizing.current
      if (!s) return
      onResize(s.key, Math.max(80, Math.round(s.startW + (ev.clientX - s.startX))))
    }
    const onUp = () => {
      resizing.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('resizing')
    }
    document.body.classList.add('resizing')
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const toggleSort = (key) => {
    if (sort.key !== key) return onSort({ key, dir: 'asc' })
    if (sort.dir === 'asc') return onSort({ key, dir: 'desc' })
    return onSort({ key: null, dir: 'asc' })
  }

  const realCount = flatRows.filter((r) => !isBlank(r)).length
  const totals = bodyCols.map((c) => {
    const t = typeOf(c)
    if (t.aggregate === 'sum') {
      const sum = flatRows.reduce((s, r) => s + (Number(r.data?.[c.key]) || 0), 0)
      return c.type === 'currency' ? '₹' + inr.format(Math.round(sum)) : inr.format(sum)
    }
    if (t.aggregate === 'checked') return flatRows.filter((r) => r.data?.[c.key]).length + ' ✓'
    if (t.aggregate === 'count') {
      const n = flatRows.filter((r) => r.data?.[c.key]).length
      return n ? `${n} filled` : ''
    }
    return ''
  })

  /* ------------------------------ cell render ----------------------------- */
  const renderCell = (row, c, ci) => {
    const t = typeOf(c)
    const raw = row.data?.[c.key]
    const isEditing = editing && editing.rowId === row.id && editing.key === c.key

    if (c.type === 'checkbox') {
      return (
        <td key={c.key} className="center">
          <input type="checkbox" checked={!!raw} onChange={(e) => onCell(row.id, c.key, e.target.checked)} />
        </td>
      )
    }

    const parts = row.data?.[partsKey(c.key)]
    const split = c.type === 'currency' && Array.isArray(parts) && parts.length > 1

    return (
      <td
        key={c.key}
        className={`${t.align === 'right' ? 'right' : ''} ${isEditing ? 'editing' : ''} ${
          c.type === 'currency' ? 'money' : ''
        }`}
        onClick={() => !isEditing && setEditing({ rowId: row.id, key: c.key })}
      >
        {isEditing ? (
          <CellEditor
            col={c}
            value={split ? '' : raw}
            onCommit={(v) => {
              onCell(row.id, c.key, v)
              if (c.type === 'select' || c.type === 'status') setEditing(null)
            }}
            onCancel={() => setEditing(null)}
            onNav={(dr, dc) => move(row.id, ci, dr, dc)}
          />
        ) : c.type === 'status' && raw ? (
          <span className={`pill tone-${toneOf(raw)}`}>{raw}</span>
        ) : split ? (
          <span className="split" title={`Total ₹${inr.format(Number(raw) || 0)}`}>
            {parts.map((p, i) => (
              <span key={i}>
                {i > 0 && <em>+</em>}₹{inr.format(Number(p) || 0)}
              </span>
            ))}
          </span>
        ) : (
          <span className={raw === '' || raw == null ? 'muted' : ''}>
            {raw === '' || raw == null ? '' : t.display(raw)}
          </span>
        )}

        {c.type === 'currency' && !isEditing && (raw || split) && (
          <button
            className="pay-add"
            title="Add another payment from the same person"
            onClick={(e) => {
              e.stopPropagation()
              onAddPayment(row, c)
            }}
          >
            +
          </button>
        )}
      </td>
    )
  }

  const dataRow = (row, n, dateCellNode = null) => (
    <tr key={row.id} className={`tone-row-${toneOf(row.data?.status)}`}>
      <td className="gutter">
        <span className="rownum">{n}</span>
        <button
          className="row-del"
          title="Delete this row"
          onClick={() => {
            if (confirm('Delete this sale?')) onDeleteRow(row.id)
          }}
        >
          ×
        </button>
      </td>
      {dateCellNode}
      {bodyCols.map((c, ci) => renderCell(row, c, ci))}
      <td className="tail" />
    </tr>
  )

  /* --------------------------------- body --------------------------------- */
  let n = 0
  const body = []

  if (useGroups) {
    for (const g of groups) {
      const dayTone = g.kind === 'sales' ? 'green' : g.kind === 'nosale' ? 'red' : 'blue'
      const dateCell = (span) => (
        <td className={`date-cell day-${dayTone}`} rowSpan={span}>
          <span className="dc-day">{g.date ? dayLabel(g.date) : 'No date'}</span>
          <span className="dc-wd">{g.date ? weekdayLabel(g.date) : ''}</span>
          {g.rows.length > 1 && <span className="dc-count">{g.rows.length} sales</span>}
        </td>
      )

      if (g.rows.length === 0) {
        body.push(
          <tr key={g.date} className={`empty-day ${g.kind}`}>
            <td className="gutter">
              <span className="rownum dash">–</span>
            </td>
            {dateCell(1)}
            <td colSpan={bodyCols.length + 1} className="nosale-cell">
              {g.kind === 'nosale' ? (
                <>
                  <span className="pill tone-red">No sale</span>
                  <span className="nosale-note">nothing was logged on this day</span>
                </>
              ) : (
                <>
                  <span className="pill tone-blue">Today</span>
                  <span className="nosale-note">nothing logged yet</span>
                </>
              )}
              <button className="link-btn" onClick={() => onAddRow(bodyCols[0]?.key, g.date)}>
                + add a sale for this day
              </button>
            </td>
          </tr>
        )
      } else {
        g.rows.forEach((row, i) => {
          n += 1
          body.push(dataRow(row, n, i === 0 ? dateCell(g.rows.length) : null))
        })
      }
    }
  } else {
    rows.forEach((row) => {
      n += 1
      body.push(dataRow(row, n))
    })
  }

  return (
    <section className="sheet-wrap">
      {useGroups && (
        <div className="sheet-bar">
          <span className="sheet-bar-note">
            {emptyDays === 0
              ? 'Every day this month has a sale on it.'
              : `${emptyDays} day${emptyDays === 1 ? '' : 's'} with no sale so far this month`}
          </span>
          <label className="sheet-bar-toggle">
            <input
              type="checkbox"
              checked={hideEmptyDays}
              onChange={(e) => onHideEmptyDays(e.target.checked)}
            />
            <span>Hide the empty days</span>
          </label>
        </div>
      )}
      <div className="sheet-scroll" ref={scrollRef}>
        <table className="sheet">
          <colgroup>
            <col style={{ width: 46 }} />
            {useGroups && <col style={{ width: dateCol.width }} />}
            {bodyCols.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
            <col style={{ width: 40 }} />
          </colgroup>

          <thead>
            <tr>
              <th className="gutter-h" />
              {useGroups && (
                <th className="date-h">
                  <span className="th-btn static">
                    <span className="th-icon">📅</span>
                    <span className="th-label">{dateCol.label}</span>
                  </span>
                  <span className="resizer" onMouseDown={(e) => startResize(e, dateCol)} />
                </th>
              )}
              {bodyCols.map((c) => (
                <th key={c.key} className={typeOf(c).align === 'right' ? 'right' : ''}>
                  <button className="th-btn" onClick={() => toggleSort(c.key)} title="Sort">
                    <span className="th-icon">{TYPE_ICON[c.type] ?? '·'}</span>
                    <span className="th-label">{c.label}</span>
                    {sort.key === c.key && <span className="th-sort">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                  <span className="resizer" onMouseDown={(e) => startResize(e, c)} />
                </th>
              ))}
              <th className="tail-h" />
            </tr>
          </thead>

          <tbody>
            {body}

            <tr className="ghost" onClick={() => !busy && requestRow(bodyCols[0]?.key)}>
              <td className="gutter">
                <span className="rownum plus">+</span>
              </td>
              <td colSpan={bodyCols.length + (useGroups ? 2 : 1)} className="ghost-cell">
                {busy ? 'Adding…' : 'Click here to add a sale  ·  Tab moves across, Enter drops down'}
              </td>
            </tr>

            {flatRows.length === 0 && searching && (
              <tr className="empty">
                <td colSpan={bodyCols.length + (useGroups ? 3 : 2)}>
                  Nothing matches that search on this sheet.
                </td>
              </tr>
            )}
          </tbody>

          <tfoot>
            <tr>
              <td className="gutter" />
              {useGroups && (
                <td className="date-cell foot">
                  <strong>TOTAL</strong>
                </td>
              )}
              {bodyCols.map((c, i) => (
                <td key={c.key} className={typeOf(c).align === 'right' ? 'right' : ''}>
                  {i === 0 ? (
                    <strong>
                      {useGroups ? '' : 'TOTAL · '}
                      {realCount} {realCount === 1 ? 'sale' : 'sales'}
                    </strong>
                  ) : (
                    <strong>{totals[i]}</strong>
                  )}
                </td>
              ))}
              <td className="tail" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

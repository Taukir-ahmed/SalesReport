import { typeOf } from './fieldTypes'
import { DATE_KEY, buildDayGroups, monthLabel, partsKey } from './columns'
import { SALE_STATUS, tone, toneOf } from './status'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const BRAND = 'FF1F3864'
const ACCENT = 'FF2E5FA3'
const BORDER = { style: 'thin', color: { argb: 'FFD3DCE8' } }

const colLetter = (n) => {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const partsOf = (row, key) => {
  const p = row.data?.[partsKey(key)]
  return Array.isArray(p) ? p.filter((n) => n !== '' && n != null) : []
}

const breakupText = (parts) => parts.map((p) => inr.format(Number(p) || 0)).join(' + ')

/* Which columns go into the file, with a "Payment breakup" column slipped in
 * after the amount when at least one sale was paid in instalments. */
function buildExportColumns(columns, rows) {
  const visible = columns.filter((c) => c.visible)
  const date = visible.find((c) => c.key === DATE_KEY)
  const rest = visible.filter((c) => c.key !== DATE_KEY)
  const ordered = date ? [date, ...rest] : rest

  const out = []
  for (const c of ordered) {
    out.push(c)
    if (c.type === 'currency' && rows.some((r) => partsOf(r, c.key).length > 1)) {
      out.push({
        key: `__parts_${c.key}`,
        label: 'Payment breakup',
        type: 'text',
        width: 190,
        synthetic: 'parts',
        of: c.key,
      })
    }
  }
  return out
}

/* How wide should a column be, and how tall should a row be? Excel won't
 * auto-fit for us, so we measure the text ourselves. */
const MIN_W = 11
const MAX_W = 46          // past this, wrap onto more lines instead of widening
const CHAR_H = 15         // px per wrapped line

function cellText(c, row, statusKey) {
  if (c.synthetic === 'parts') {
    const parts = partsOf(row, c.of)
    return parts.length > 1 ? breakupText(parts) : ''
  }
  const raw = row.data?.[c.key]
  if (raw === '' || raw == null) return ''
  if (c.type === 'date') return 'dd-mmm-yyyy'
  if (c.type === 'currency' || c.type === 'number') return '₹' + inr.format(Number(raw) || 0)
  if (c.type === 'checkbox') return raw ? 'Yes' : 'No'
  return String(raw)
}

function measure(cols, groups, statusKey) {
  const widths = cols.map((c) => c.label.length + 3)
  for (const g of groups) {
    for (const row of g.rows) {
      cols.forEach((c, i) => {
        const len = cellText(c, row, statusKey).length + 3
        if (len > widths[i]) widths[i] = len
      })
    }
    if (g.rows.length === 0) {
      cols.forEach((c, i) => {
        if (c.key === statusKey && widths[i] < 16) widths[i] = 16
      })
    }
  }
  return widths.map((w) => Math.min(MAX_W, Math.max(MIN_W, Math.ceil(w))))
}

/* A cell wider than its column has to wrap, which needs a taller row. */
function linesNeeded(text, width) {
  if (!text) return 1
  const words = String(text).split(/\s+/)
  let lines = 1
  let len = 0
  for (const w of words) {
    if (len && len + 1 + w.length > width - 2) {
      lines += 1
      len = w.length
    } else {
      len += (len ? 1 : 0) + w.length
    }
  }
  return Math.max(1, lines)
}

/* --------------------------- styled .xlsx export -------------------------- */
export async function exportXlsx({ columns, rows, monthKey, leads = [], sheetTitle }) {
  const ExcelJS = (await import('exceljs')).default
  const cols = buildExportColumns(columns, rows)
  const groups = buildDayGroups(rows, monthKey)
  const statusKey = columns.find((c) => c.type === 'status')?.key

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sales Sheet'
  wb.created = new Date()

  const ws = wb.addWorksheet(monthLabel(monthKey), {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const widths = measure(cols, groups, statusKey)
  const wraps = cols.map((c, i) => c.type === 'text' && widths[i] >= MAX_W)

  const lastCol = Math.max(cols.length, 1)
  const lastLetter = colLetter(lastCol)
  const saleCount = rows.length
  const noSaleDays = groups.filter((g) => g.kind === 'nosale').length

  /* title band ------------------------------------------------------------ */
  ws.mergeCells(`A1:${lastLetter}1`)
  const title = ws.getCell('A1')
  title.value = `Sales Report — ${monthLabel(monthKey)}`
  title.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } }
  ws.getRow(1).height = 30

  ws.mergeCells(`A2:${lastLetter}2`)
  const sub = ws.getCell('A2')
  sub.value =
    `${sheetTitle || 'Monthly sales'}  •  ${saleCount} sale${saleCount === 1 ? '' : 's'}` +
    `  •  ${noSaleDays} day${noSaleDays === 1 ? '' : 's'} with no sale` +
    `  •  Generated ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
  sub.font = { size: 10, color: { argb: 'FF5A6B84' }, italic: true }
  sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(2).height = 18
  ws.getRow(3).height = 6

  /* header ---------------------------------------------------------------- */
  const HEAD = 4
  const header = ws.getRow(HEAD)
  cols.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.value = c.label
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.alignment = {
      vertical: 'middle',
      horizontal: typeOf(c).align === 'right' ? 'right' : 'left',
      indent: 1,
    }
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
  })
  header.height = 24

  /* body: one block per day, date merged down the block --------------------- */
  let r = HEAD
  const merges = []

  const writeCell = (rowIdx, colIdx, value, opts = {}) => {
    const cell = ws.getRow(rowIdx).getCell(colIdx)
    cell.value = value
    if (opts.numFmt) cell.numFmt = opts.numFmt
    cell.alignment = {
      vertical: opts.vertical || 'middle',
      horizontal: opts.align || 'left',
      indent: opts.align === 'center' ? 0 : 1,
      wrapText: !!opts.wrap,
    }
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
    cell.font = { size: 11, bold: !!opts.bold, color: { argb: opts.color || 'FF1E293B' } }
    if (opts.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } }
    return cell
  }

  for (const g of groups) {
    const dayTone = g.kind === 'sales' ? tone('green') : g.kind === 'nosale' ? tone('red') : tone('blue')
    const dateValue = g.date ? new Date(g.date + 'T00:00:00') : 'No date'
    const blockStart = r + 1
    const lines = Math.max(g.rows.length, 1)

    if (g.rows.length === 0) {
      r += 1
      const label = g.kind === 'nosale' ? SALE_STATUS.NONE : 'Nothing logged yet'
      cols.forEach((c, i) => {
        if (c.key === DATE_KEY) {
          writeCell(r, i + 1, dateValue, {
            numFmt: 'dd-mmm-yyyy',
            fill: dayTone.day,
            color: dayTone.font,
            bold: true,
          })
        } else if (c.key === statusKey) {
          writeCell(r, i + 1, label, { fill: dayTone.fill, color: dayTone.font, bold: true })
        } else {
          writeCell(r, i + 1, i === 1 ? '—' : '', { fill: dayTone.rowFill })
        }
      })
      ws.getRow(r).height = 20
      continue
    }

    g.rows.forEach((row, idx) => {
      r += 1
      const rowTone = tone(toneOf(row.data?.[statusKey]))
      const rowFill = rowTone.rowFill

      cols.forEach((c, i) => {
        const ci = i + 1
        if (c.key === DATE_KEY) {
          writeCell(r, ci, idx === 0 ? dateValue : null, {
            numFmt: 'dd-mmm-yyyy',
            fill: dayTone.day,
            color: dayTone.font,
            bold: true,
            vertical: 'middle',
          })
          return
        }
        if (c.synthetic === 'parts') {
          const parts = partsOf(row, c.of)
          writeCell(r, ci, parts.length > 1 ? breakupText(parts) : '', {
            fill: rowFill,
            color: 'FF5A6B84',
          })
          return
        }

        const t = typeOf(c)
        const raw = row.data?.[c.key]
        let value = raw ?? ''
        let numFmt = t.excel.numFmt

        if (c.type === 'date' && raw) {
          const d = new Date(String(raw) + 'T00:00:00')
          value = isNaN(d) ? raw : d
        } else if ((c.type === 'currency' || c.type === 'number') && raw !== '' && raw != null) {
          const n = Number(raw)
          value = isNaN(n) ? raw : n
        } else if (c.type === 'checkbox') {
          value = raw ? 'Yes' : 'No'
        }

        const isStatus = c.key === statusKey && raw
        writeCell(r, ci, value, {
          numFmt,
          align: t.align,
          fill: isStatus ? tone(toneOf(raw)).fill : rowFill,
          color: isStatus ? tone(toneOf(raw)).font : 'FF1E293B',
          bold: !!isStatus,
          wrap: wraps[i],
        })
      })

      /* tall enough for whatever wrapped inside it */
      const lines = cols.reduce(
        (max, c, i) => (wraps[i] ? Math.max(max, linesNeeded(cellText(c, row, statusKey), widths[i])) : max),
        1
      )
      ws.getRow(r).height = Math.max(20, lines * CHAR_H + 5)
    })

    if (lines > 1) {
      const dateIdx = cols.findIndex((c) => c.key === DATE_KEY)
      if (dateIdx >= 0) merges.push([blockStart, dateIdx + 1, r, dateIdx + 1])
    }
  }

  const lastDataRow = r
  merges.forEach(([r1, c1, r2, c2]) => ws.mergeCells(r1, c1, r2, c2))

  /* totals ---------------------------------------------------------------- */
  const totalRow = ws.getRow(lastDataRow + 1)
  cols.forEach((c, i) => {
    const t = typeOf(c)
    const cell = totalRow.getCell(i + 1)
    if (i === 0) cell.value = 'TOTAL'
    else if (t.aggregate === 'sum' && lastDataRow > HEAD) {
      const L = colLetter(i + 1)
      cell.value = { formula: `SUM(${L}${HEAD + 1}:${L}${lastDataRow})` }
      if (t.excel.numFmt) cell.numFmt = t.excel.numFmt
    }
    cell.font = { bold: true, size: 11, color: { argb: 'FF0F2038' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EAF6' } }
    cell.alignment = { vertical: 'middle', horizontal: t.align, indent: t.align === 'center' ? 0 : 1 }
    cell.border = {
      top: { style: 'medium', color: { argb: BRAND } },
      bottom: BORDER,
      left: BORDER,
      right: BORDER,
    }
  })
  totalRow.height = 22

  cols.forEach((_, i) => {
    ws.getColumn(i + 1).width = widths[i]
  })

  /* legend ---------------------------------------------------------------- */
  const legendRow = lastDataRow + 3
  ws.getCell(legendRow, 1).value = 'Colour key'
  ws.getCell(legendRow, 1).font = { bold: true, size: 10, color: { argb: 'FF5A6B84' } }
  ;[
    [SALE_STATUS.COMPLETE, 'green'],
    [SALE_STATUS.REGISTRATION, 'orange'],
    [SALE_STATUS.HALF, 'purple'],
    [SALE_STATUS.NONE, 'red'],
  ].forEach(([label, t], i) => {
    const cell = ws.getCell(legendRow + 1, i + 1)
    cell.value = label
    cell.font = { size: 10, bold: true, color: { argb: tone(t).font } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tone(t).fill } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
  })

  /* pipeline tab ----------------------------------------------------------- */
  if (leads.length) {
    const ps = wb.addWorksheet('Pipeline', { views: [{ state: 'frozen', ySplit: 2 }] })
    ps.mergeCells('A1:E1')
    const pt = ps.getCell('A1')
    pt.value = `Pipeline — ${leads.length} open lead${leads.length === 1 ? '' : 's'}`
    pt.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
    pt.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } }
    pt.alignment = { vertical: 'middle', indent: 1 }
    ps.getRow(1).height = 26
    ;['Name', 'Number', 'Course', 'Status', 'Remarks'].forEach((h, i) => {
      const cell = ps.getRow(2).getCell(i + 1)
      cell.value = h
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
      cell.alignment = { vertical: 'middle', indent: 1 }
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
    })
    ps.getRow(2).height = 22
    leads.forEach((l, i) => {
      const t = tone(toneOf(l.status))
      const values = [l.name, l.phone, l.course, l.status, l.remarks]
      values.forEach((v, ci) => {
        const cell = ps.getRow(3 + i).getCell(ci + 1)
        cell.value = v ?? ''
        cell.alignment = { vertical: 'middle', indent: 1 }
        cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
        cell.font = { size: 11, bold: ci === 3, color: { argb: ci === 3 ? t.font : 'FF1E293B' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: ci === 3 ? t.fill : t.rowFill },
        }
      })
      ps.getRow(3 + i).height = 20
    })
    const heads = ['Name', 'Number', 'Course', 'Status', 'Remarks']
    const pw = heads.map((h, i) => {
      const longest = leads.reduce(
        (m, l) => Math.max(m, String([l.name, l.phone, l.course, l.status, l.remarks][i] ?? '').length),
        h.length
      )
      return Math.min(MAX_W, Math.max(MIN_W, longest + 3))
    })
    pw.forEach((w, i) => (ps.getColumn(i + 1).width = w))
    leads.forEach((l, i) => {
      const lines = linesNeeded(l.remarks, pw[4])
      ps.getRow(3 + i).height = Math.max(20, lines * CHAR_H + 5)
      if (lines > 1) ps.getRow(3 + i).getCell(5).alignment = { vertical: 'middle', indent: 1, wrapText: true }
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  download(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Sales-${monthKey}.xlsx`
  )
}

/* --------------------------------- CSV ----------------------------------- */
export function exportCsv({ columns, rows, monthKey }) {
  const cols = buildExportColumns(columns, rows)
  const groups = buildDayGroups(rows, monthKey)
  const statusKey = columns.find((c) => c.type === 'status')?.key

  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines = [cols.map((c) => esc(c.label)).join(',')]
  for (const g of groups) {
    if (g.rows.length === 0) {
      lines.push(
        cols
          .map((c) => {
            if (c.key === DATE_KEY) return esc(g.date)
            if (c.key === statusKey) return esc(g.kind === 'nosale' ? SALE_STATUS.NONE : '')
            return ''
          })
          .join(',')
      )
      continue
    }
    for (const row of g.rows) {
      lines.push(
        cols
          .map((c) => {
            if (c.synthetic === 'parts') {
              const parts = partsOf(row, c.of)
              return esc(parts.length > 1 ? breakupText(parts) : '')
            }
            const v = row.data?.[c.key]
            if (c.type === 'checkbox') return esc(v ? 'Yes' : 'No')
            return esc(v)
          })
          .join(',')
      )
    }
  }
  download(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), `Sales-${monthKey}.csv`)
}

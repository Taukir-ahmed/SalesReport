import { typeOf } from './fieldTypes'
import { DATE_KEY, monthLabel, partsKey } from './columns'
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

// Executive Argon Theme Colors
const BRAND = 'FF1E293B'      // Slate Navy (Header background)
const INDIGO = 'FF5E72E4'     // Argon Electric Indigo
const SLATE_BG = 'FFF8FAFC'   // Ice light slate for alternating rows
const BORDER_COLOR = 'FFCBD5E1'
const BORDER = { style: 'thin', color: { argb: BORDER_COLOR } }

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

const breakupText = (parts) => parts.map((p) => '₹' + inr.format(Number(p) || 0)).join(' + ')

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
        label: 'Payment Breakup',
        type: 'text',
        width: 190,
        synthetic: 'parts',
        of: c.key,
      })
    }
  }
  return out
}

const MIN_W = 12
const MAX_W = 46
const CHAR_H = 15

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

function measureWidths(cols, rows, statusKey) {
  const widths = cols.map((c) => Math.max(c.label.length + 4, MIN_W))
  for (const row of rows) {
    cols.forEach((c, i) => {
      const len = cellText(c, row, statusKey).length + 4
      if (len > widths[i]) widths[i] = len
    })
  }
  return widths.map((w) => Math.min(MAX_W, Math.max(MIN_W, Math.ceil(w))))
}

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

/* --------------------------- Styled Executive .xlsx Export -------------------------- */
export async function exportXlsx({
  columns,
  rows = [],
  monthKey,
  leads = [],
  sheetTitle = 'Sales & Revenue Performance Report',
  filterLabel = 'All Selected Records',
  filenameSuffix = '',
  includeKPI = true,
  includePipeline = true,
  stats = null,
}) {
  const ExcelJS = (await import('exceljs')).default
  const cols = buildExportColumns(columns, rows)
  const statusKey = columns.find((c) => c.type === 'status')?.key
  const moneyCol = columns.find((c) => c.type === 'currency') || columns.find((c) => c.type === 'number')

  // Calculate totals
  const totalAmount = moneyCol
    ? rows.reduce((s, r) => s + (Number(r.data?.[moneyCol.key]) || 0), 0)
    : 0
  const totalSales = rows.length
  const avgTicket = totalSales ? totalAmount / totalSales : 0

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Salesroom Executive Reporting'
  wb.created = new Date()

  // Sheet 1: Sales Performance Report
  const sheetName = monthKey ? monthLabel(monthKey) : 'Sales Report'
  const ws = wb.addWorksheet(sheetName.slice(0, 31), {
    views: [{ showGridLines: true, state: 'frozen', ySplit: includeKPI ? 8 : 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const widths = measureWidths(cols, rows, statusKey)
  const wraps = cols.map((c, i) => c.type === 'text' && widths[i] >= MAX_W)
  const lastCol = Math.max(cols.length, 1)
  const lastLetter = colLetter(lastCol)

  /* Row 1: Spacing */
  ws.getRow(1).height = 10

  /* Row 2: Title Banner */
  ws.mergeCells(`A2:${lastLetter}2`)
  const title = ws.getCell('A2')
  title.value = `SALES & REVENUE EXECUTIVE REPORT`
  title.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' }
  title.alignment = { vertical: 'middle', horizontal: 'center' }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } }
  ws.getRow(2).height = 32

  /* Row 3: Subtitle / Scope Banner */
  ws.mergeCells(`A3:${lastLetter}3`)
  const sub = ws.getCell('A3')
  const timestamp = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  sub.value = `Filter: ${filterLabel}   •   Total Sales: ${totalSales}   •   Generated on: ${timestamp}   •   Confidential`
  sub.font = { size: 9.5, italic: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' }
  sub.alignment = { vertical: 'middle', horizontal: 'center' }
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } }
  ws.getRow(3).height = 20

  let startRow = 4

  /* Executive KPI Cards Block (Rows 5-6) */
  if (includeKPI && cols.length >= 4) {
    ws.getRow(4).height = 8 // small spacer

    // Determine column spans for 4 KPI cards across available columns
    const span = Math.max(1, Math.floor(cols.length / 4))
    const c1Start = 1, c1End = span
    const c2Start = c1End + 1, c2End = c1End + span
    const c3Start = c2End + 1, c3End = c2End + span
    const c4Start = c3End + 1, c4End = cols.length

    const kpiCards = [
      {
        start: c1Start,
        end: c1End,
        label: 'TOTAL REVENUE',
        value: totalAmount,
        numFmt: '₹#,##0',
        valColor: 'FF16A34A', // Green
        valBg: 'FFF0FDF4',
      },
      {
        start: c2Start,
        end: c2End,
        label: 'CLOSED DEALS',
        value: totalSales,
        numFmt: null,
        valColor: 'FF2563EB', // Blue
        valBg: 'FFEBF5FF',
      },
      {
        start: c3Start,
        end: c3End,
        label: 'AVERAGE TICKET',
        value: Math.round(avgTicket),
        numFmt: '₹#,##0',
        valColor: 'FF9333EA', // Purple
        valBg: 'FFFDF4FF',
      },
      {
        start: c4Start,
        end: c4End,
        label: 'REPORT PERIOD',
        value: filterLabel.length > 24 ? filterLabel.slice(0, 24) + '…' : filterLabel,
        numFmt: null,
        valColor: 'FF0F172A',
        valBg: 'FFF1F5F9',
      },
    ]

    // Render Top Labels (Row 5)
    ws.getRow(5).height = 18
    // Render Values (Row 6)
    ws.getRow(6).height = 28

    kpiCards.forEach((kpi) => {
      const sLet = colLetter(kpi.start)
      const eLet = colLetter(kpi.end)

      ws.mergeCells(`${sLet}5:${eLet}5`)
      const lCell = ws.getCell(`${sLet}5`)
      lCell.value = kpi.label
      lCell.font = { size: 9, bold: true, color: { argb: 'FF64748B' }, name: 'Segoe UI' }
      lCell.alignment = { horizontal: 'center', vertical: 'middle' }
      lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }

      ws.mergeCells(`${sLet}6:${eLet}6`)
      const vCell = ws.getCell(`${sLet}6`)
      vCell.value = kpi.value
      if (kpi.numFmt) vCell.numFmt = kpi.numFmt
      vCell.font = { size: 14, bold: true, color: { argb: kpi.valColor }, name: 'Segoe UI' }
      vCell.alignment = { horizontal: 'center', vertical: 'middle' }
      vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.valBg } }

      // Borders
      for (let ci = kpi.start; ci <= kpi.end; ci++) {
        const lettr = colLetter(ci)
        ws.getCell(`${lettr}5`).border = BORDER
        ws.getCell(`${lettr}6`).border = BORDER
      }
    })

    ws.getRow(7).height = 8 // spacer
    startRow = 8
  }

  /* Table Header (Row 8 or 4) */
  const HEAD = startRow
  const header = ws.getRow(HEAD)
  header.height = 26
  cols.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.value = c.label.toUpperCase()
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Segoe UI' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.alignment = {
      vertical: 'middle',
      horizontal: typeOf(c).align === 'right' ? 'right' : 'left',
      indent: 1,
    }
    cell.border = BORDER
  })

  /* Data Rows */
  let r = HEAD
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
    cell.border = BORDER
    cell.font = {
      size: 10,
      bold: !!opts.bold,
      italic: !!opts.italic,
      color: { argb: opts.color || 'FF1E293B' },
      name: 'Segoe UI',
    }
    if (opts.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } }
    return cell
  }

  // Sort rows chronologically
  const sortedRows = [...rows].sort((a, b) =>
    String(a.data?.[DATE_KEY] ?? '').localeCompare(String(b.data?.[DATE_KEY] ?? ''))
  )

  sortedRows.forEach((row, idx) => {
    r += 1
    const isZebra = idx % 2 === 1
    const zebraFill = isZebra ? SLATE_BG : 'FFFFFFFF'

    cols.forEach((c, i) => {
      const ci = i + 1
      if (c.synthetic === 'parts') {
        const parts = partsOf(row, c.of)
        writeCell(r, ci, parts.length > 1 ? breakupText(parts) : '—', {
          fill: zebraFill,
          color: 'FF64748B',
          italic: true,
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
      let statusFill = zebraFill
      let statusFont = 'FF1E293B'

      if (isStatus) {
        const rawLower = String(raw).toLowerCase()
        if (rawLower.includes('complete') || rawLower.includes('full') || rawLower.includes('done')) {
          statusFill = 'FFDCFCE7' // Soft Green
          statusFont = 'FF15803D'
        } else if (rawLower.includes('half') || rawLower.includes('part')) {
          statusFill = 'FFF3E8FF' // Soft Purple
          statusFont = 'FF6B21A8'
        } else if (rawLower.includes('registration')) {
          statusFill = 'FFFEF3C7' // Soft Amber
          statusFont = 'FFB45309'
        } else if (rawLower.includes('promise')) {
          statusFill = 'FFDBEAFE' // Soft Blue
          statusFont = 'FF1D4ED8'
        } else if (rawLower.includes('no sale')) {
          statusFill = 'FFFEE2E2' // Soft Red
          statusFont = 'FFB91C1C'
        }
      }

      writeCell(r, ci, value, {
        numFmt,
        align: isStatus ? 'center' : t.align,
        fill: isStatus ? statusFill : zebraFill,
        color: isStatus ? statusFont : c.key === 'customer' ? 'FF0F172A' : 'FF334155',
        bold: isStatus || c.key === 'customer' || c.type === 'currency',
        wrap: wraps[i],
      })
    })

    const lines = cols.reduce(
      (max, c, i) => (wraps[i] ? Math.max(max, linesNeeded(cellText(c, row, statusKey), widths[i])) : max),
      1
    )
    ws.getRow(r).height = Math.max(22, lines * CHAR_H + 4)
  })

  const lastDataRow = r

  /* Totals Row */
  if (lastDataRow >= HEAD + 1) {
    const totalRow = ws.getRow(lastDataRow + 1)
    totalRow.height = 26

    cols.forEach((c, i) => {
      const ci = i + 1
      const t = typeOf(c)
      const cell = totalRow.getCell(ci)

      if (i === 0) {
        cell.value = `TOTAL (${totalSales} ${totalSales === 1 ? 'SALE' : 'SALES'})`
      } else if (t.aggregate === 'sum') {
        const L = colLetter(ci)
        cell.value = { formula: `SUM(${L}${HEAD + 1}:${L}${lastDataRow})` }
        if (t.excel.numFmt) cell.numFmt = t.excel.numFmt
      } else {
        cell.value = ''
      }

      cell.font = { bold: true, size: 10, color: { argb: 'FF0F172A' }, name: 'Segoe UI' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
      cell.alignment = { vertical: 'middle', horizontal: t.align || 'left', indent: 1 }
      cell.border = {
        top: { style: 'medium', color: { argb: BRAND } },
        bottom: { style: 'double', color: { argb: BRAND } },
        left: BORDER,
        right: BORDER,
      }
    })
  }

  // Set column widths
  cols.forEach((_, i) => {
    ws.getColumn(i + 1).width = widths[i]
  })

  /* Tab 2: Lead Pipeline CRM (Optional) */
  if (includePipeline && leads.length) {
    const ps = wb.addWorksheet('Active Pipeline', {
      views: [{ showGridLines: true, state: 'frozen', ySplit: 2 }],
    })

    ps.mergeCells('A1:E1')
    const pt = ps.getCell('A1')
    pt.value = `ACTIVE LEAD PIPELINE (${leads.length} LEADS)`
    pt.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' }
    pt.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } }
    pt.alignment = { vertical: 'middle', indent: 1 }
    ps.getRow(1).height = 28

    const heads = ['Name', 'Number', 'Course', 'Status', 'Remarks']
    const pHeader = ps.getRow(2)
    pHeader.height = 24
    heads.forEach((h, i) => {
      const cell = pHeader.getCell(i + 1)
      cell.value = h.toUpperCase()
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Segoe UI' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
      cell.alignment = { vertical: 'middle', indent: 1 }
      cell.border = BORDER
    })

    leads.forEach((l, i) => {
      const rowIdx = 3 + i
      const isZ = i % 2 === 1
      const zFill = isZ ? SLATE_BG : 'FFFFFFFF'
      const values = [l.name, l.phone, l.course, l.status, l.remarks]

      values.forEach((v, ci) => {
        const cell = ps.getRow(rowIdx).getCell(ci + 1)
        cell.value = v ?? ''
        cell.alignment = { vertical: 'middle', indent: 1 }
        cell.border = BORDER
        cell.font = { size: 10, bold: ci === 0, color: { argb: 'FF1E293B' }, name: 'Segoe UI' }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zFill } }
      })
      ps.getRow(rowIdx).height = 20
    })

    const pw = heads.map((h, i) => {
      const longest = leads.reduce(
        (m, l) => Math.max(m, String([l.name, l.phone, l.course, l.status, l.remarks][i] ?? '').length),
        h.length
      )
      return Math.min(MAX_W, Math.max(MIN_W, longest + 4))
    })
    pw.forEach((w, i) => (ps.getColumn(i + 1).width = w))
  }

  const buf = await wb.xlsx.writeBuffer()
  const outName = filenameSuffix ? `SalesReport-${filenameSuffix}.xlsx` : `SalesReport-${monthKey}.xlsx`
  download(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    outName
  )
}

/* --------------------------------- CSV Export ----------------------------------- */
export function exportCsv({ columns, rows = [], monthKey, filenameSuffix = '' }) {
  const visible = columns.filter((c) => c.visible)
  const dateCol = visible.find((c) => c.key === DATE_KEY)
  const rest = visible.filter((c) => c.key !== DATE_KEY)
  const cols = dateCol ? [dateCol, ...rest] : rest

  const esc = (val) => {
    const s = String(val ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const lines = []
  lines.push(cols.map((c) => esc(c.label)).join(','))

  for (const r of rows) {
    const rowCells = cols.map((c) => {
      const v = r.data?.[c.key]
      return esc(v ?? '')
    })
    lines.push(rowCells.join(','))
  }

  const outName = filenameSuffix ? `SalesReport-${filenameSuffix}.csv` : `SalesReport-${monthKey}.csv`
  download(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), outName)
}

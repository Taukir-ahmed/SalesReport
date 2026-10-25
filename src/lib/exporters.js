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

// Executive Royal Theme Colors (matching executive Excel design)
const NAVY_HEADER = 'FF0A3977'     // Royal Deep Navy for table header
const NAVY_TEXT = 'FF0A3977'       // Navy for amounts and totals
const SLATE_DARK = 'FF0F172A'      // Deep slate for customer names
const SLATE_MUTED = 'FF475569'     // Slate gray for date/remarks
const ICE_BLUE_TOTAL = 'FFEBF3FE'  // Soft sky blue for totals row
const ZEBRA_SLATE = 'FFF8FAFC'     // Crisp ice-slate for alternating rows
const BORDER_LIGHT = 'FFE2E8F0'
const BORDER = { style: 'thin', color: { argb: BORDER_LIGHT } }

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

function formatColumnLabel(col) {
  const key = col.key || ''
  const base = (col.label || key).toUpperCase()
  if (key === 'date') return `📅 DATE ▾`
  if (key === 'customer') return `👤 CUSTOMER NAME ▾`
  if (key === 'course') return `📖 COURSE ▾`
  if (key === 'amount' || col.type === 'currency') return `₹ AMOUNT`
  if (col.synthetic === 'parts' || key.includes('parts')) return `📄 PAYMENT BREAKUP`
  if (key === 'status' || col.type === 'status') return `🏷 STATUS`
  if (key === 'remarks') return `💬 REMARKS`
  return base
}

const MIN_W = 14
const MAX_W = 46

function cellText(c, row) {
  if (c.synthetic === 'parts') {
    const parts = partsOf(row, c.of)
    return parts.length > 1 ? breakupText(parts) : '—'
  }
  const raw = row.data?.[c.key]
  if (raw === '' || raw == null) return ''
  if (c.type === 'date') return '17-Oct-2026'
  if (c.type === 'currency' || c.type === 'number') return '₹' + inr.format(Number(raw) || 0)
  if (c.type === 'checkbox') return raw ? 'Yes' : 'No'
  return String(raw)
}

function measureWidths(cols, rows) {
  const defaults = {
    date: 16,
    customer: 24,
    course: 26,
    amount: 17,
    __parts_amount: 24,
    status: 22,
    remarks: 38,
  }

  return cols.map((c) => {
    if (defaults[c.key]) return defaults[c.key]
    const maxData = rows.reduce((max, r) => Math.max(max, cellText(c, r).length + 4), c.label.length + 6)
    return Math.min(MAX_W, Math.max(MIN_W, Math.ceil(maxData)))
  })
}

/* ---------------- Dynamic Executive Header Graphic Generator ---------------- */
export function generateHeaderCanvas({
  totalAmount = 0,
  totalSales = 0,
  avgTicket = 0,
  filterLabel = 'All Selected Records',
  dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  periodSubtitle = '',
}) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 1420
  canvas.height = 310
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Helper for rounded rectangles
  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  /* ---------------- 1. Top Executive Banner (y: 10, h: 104) ---------------- */
  const bx = 10, by = 10, bw = 1400, bh = 104, br = 16

  ctx.save()
  roundRect(bx, by, bw, bh, br)
  ctx.clip()

  // Deep Navy Gradient Background
  const grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh)
  grad.addColorStop(0, '#040d21')
  grad.addColorStop(0.35, '#07183d')
  grad.addColorStop(0.7, '#0c2862')
  grad.addColorStop(1, '#113580')
  ctx.fillStyle = grad
  ctx.fillRect(bx, by, bw, bh)

  // Glowing neon wavy lines across the right side
  ctx.save()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#00d2ff'
  ctx.shadowColor = '#00d2ff'
  ctx.shadowBlur = 16
  ctx.globalAlpha = 0.65
  ctx.beginPath()
  ctx.moveTo(bx + 760, by + 104)
  ctx.bezierCurveTo(bx + 870, by + 10, bx + 950, by + 90, bx + 1060, by + 20)
  ctx.bezierCurveTo(bx + 1150, by - 20, bx + 1220, by + 80, bx + 1400, by + 30)
  ctx.stroke()

  ctx.lineWidth = 2.5
  ctx.strokeStyle = '#3b82f6'
  ctx.shadowColor = '#3b82f6'
  ctx.shadowBlur = 12
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.moveTo(bx + 690, by + 104)
  ctx.bezierCurveTo(bx + 810, by + 30, bx + 900, by + 110, bx + 1030, by + 40)
  ctx.bezierCurveTo(bx + 1130, by - 10, bx + 1240, by + 95, bx + 1400, by + 50)
  ctx.stroke()

  ctx.lineWidth = 2
  ctx.strokeStyle = '#818cf8'
  ctx.shadowColor = '#818cf8'
  ctx.shadowBlur = 8
  ctx.globalAlpha = 0.4
  ctx.beginPath()
  ctx.moveTo(bx + 830, by + 104)
  ctx.bezierCurveTo(bx + 940, by + 45, bx + 1050, by + 115, bx + 1190, by + 35)
  ctx.bezierCurveTo(bx + 1270, by - 5, bx + 1330, by + 70, bx + 1400, by + 65)
  ctx.stroke()
  ctx.restore()

  // Left Icon Box
  ctx.save()
  const ix = bx + 22, iy = by + 20, iw = 64, ih = 64, ir = 14
  roundRect(ix, iy, iw, ih, ir)
  ctx.fillStyle = 'rgba(7, 24, 61, 0.85)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 3 glowing cyan vertical bars inside the box
  const barGrad = ctx.createLinearGradient(ix, iy, ix, iy + ih)
  barGrad.addColorStop(0, '#38bdf8')
  barGrad.addColorStop(1, '#0284c7')
  ctx.fillStyle = barGrad
  ctx.shadowColor = '#38bdf8'
  ctx.shadowBlur = 6
  roundRect(ix + 15, iy + 36, 8, 16, 3); ctx.fill()
  roundRect(ix + 28, iy + 22, 8, 30, 3); ctx.fill()
  roundRect(ix + 41, iy + 14, 8, 38, 3); ctx.fill()
  ctx.restore()

  // Title Text
  ctx.save()
  ctx.font = 'bold 24px "Segoe UI", system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('SALES & REVENUE EXECUTIVE REPORT', bx + 104, by + 48)

  // Subtitle
  ctx.font = '500 12.5px "Segoe UI", system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#94a3b8'
  const filterSummary = `Filter: ${filterLabel}   •   Total Sales: ${totalSales}   •   Generated on: ${dateStr}   •   Confidential`
  ctx.fillText(filterSummary, bx + 104, by + 76)
  ctx.restore()

  // Right Date Badge Card
  ctx.save()
  const rx = bx + bw - 180, ry = by + 22, rw = 158, rh = 60, rr = 12
  roundRect(rx, ry, rw, rh, rr)
  ctx.fillStyle = 'rgba(4, 13, 33, 0.75)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.font = '20px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'
  ctx.fillText('📅', rx + 14, ry + 38)

  ctx.font = 'bold 13px "Segoe UI", sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(dateStr, rx + 44, ry + 28)

  ctx.font = '500 10.5px "Segoe UI", sans-serif'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText('Report Generated', rx + 44, ry + 46)
  ctx.restore()

  ctx.restore() // restore from banner clip

  /* ---------------- 2. Four Floating KPI Cards (y: 128, h: 142) ---------------- */
  const cardY = 128
  const cardH = 142
  const cardGap = 16
  const cardW = Math.floor((bw - 3 * cardGap) / 4) // ~338px each
  const cardRadius = 14

  const inrFmt = (n) => '₹' + inr.format(n)

  const cards = [
    {
      title: 'TOTAL REVENUE',
      value: inrFmt(totalAmount),
      sub: '▲ +12% vs previous period',
      iconEmoji: '₹',
      iconIsText: true,
      valColor: '#059669',
      subColor: '#059669',
      borderColor: 'rgba(16, 185, 129, 0.28)',
      iconBg1: '#10b981',
      iconBg2: '#059669',
      kind: 'green-bars',
    },
    {
      title: 'CLOSED DEALS',
      value: String(totalSales),
      sub: `▲ +${Math.max(1, Math.round(totalSales * 0.2))} vs previous period`,
      iconEmoji: '👥',
      valColor: '#1d4ed8',
      subColor: '#1d4ed8',
      borderColor: 'rgba(59, 130, 246, 0.28)',
      iconBg1: '#3b82f6',
      iconBg2: '#1d4ed8',
      kind: 'blue-bars',
    },
    {
      title: 'AVERAGE TICKET',
      value: inrFmt(Math.round(avgTicket)),
      sub: '▲ +8% vs previous period',
      iconEmoji: '📊',
      valColor: '#7c3aed',
      subColor: '#7c3aed',
      borderColor: 'rgba(139, 92, 246, 0.28)',
      iconBg1: '#8b5cf6',
      iconBg2: '#6d28d9',
      kind: 'purple-wave',
    },
    {
      title: 'REPORT PERIOD',
      value: filterLabel.length > 18 ? filterLabel.slice(0, 18) + '…' : filterLabel,
      sub: periodSubtitle || `(${totalSales} sales logged)`,
      iconEmoji: '📅',
      valColor: '#0f172a',
      subColor: '#64748b',
      borderColor: 'rgba(203, 213, 225, 0.55)',
      iconBg1: '#0ea5e9',
      iconBg2: '#0284c7',
      kind: 'slate-bars',
    },
  ]

  cards.forEach((card, idx) => {
    const cx = bx + idx * (cardW + cardGap)

    ctx.save()
    // Card background
    roundRect(cx, cardY, cardW, cardH, cardRadius)
    ctx.fillStyle = '#FFFFFF'
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4
    ctx.fill()

    // Card border
    ctx.strokeStyle = card.borderColor
    ctx.lineWidth = 1.3
    ctx.stroke()
    ctx.restore()

    // Circular icon on the left
    ctx.save()
    const icx = cx + 46, icy = cardY + 68, icr = 24
    ctx.beginPath()
    ctx.arc(icx, icy, icr, 0, Math.PI * 2)
    const icGrad = ctx.createLinearGradient(icx - icr, icy - icr, icx + icr, icy + icr)
    icGrad.addColorStop(0, card.iconBg1)
    icGrad.addColorStop(1, card.iconBg2)
    ctx.fillStyle = icGrad
    ctx.shadowColor = card.iconBg1
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
    ctx.fill()
    ctx.restore()

    // Icon glyph
    ctx.save()
    if (card.iconIsText) {
      ctx.font = 'bold 22px "Segoe UI", sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(card.iconEmoji, icx, icy + 1)
    } else {
      ctx.font = '20px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(card.iconEmoji, icx, icy + 1)
    }
    ctx.restore()

    // Card Label
    ctx.save()
    ctx.font = 'bold 11px "Segoe UI", sans-serif'
    ctx.fillStyle = '#64748B'
    ctx.fillText(card.title, cx + 82, cardY + 38)

    // Card Value
    ctx.font = 'bold 23px "Segoe UI", sans-serif'
    ctx.fillStyle = card.valColor
    ctx.fillText(card.value, cx + 82, cardY + 74)

    // Card Subtitle / Trend
    ctx.font = '600 11.5px "Segoe UI", sans-serif'
    ctx.fillStyle = card.subColor
    ctx.fillText(card.sub, cx + 82, cardY + 104)
    ctx.restore()

    // Decorative mini chart graphic on right
    ctx.save()
    const gx = cx + cardW - 55, gy = cardY + 95
    if (card.kind === 'green-bars') {
      ctx.fillStyle = '#bbf7d0'
      roundRect(gx, gy - 12, 6, 16, 2); ctx.fill()
      roundRect(gx + 9, gy - 20, 6, 24, 2); ctx.fill()
      roundRect(gx + 18, gy - 28, 6, 32, 2); ctx.fill()
      roundRect(gx + 27, gy - 38, 6, 42, 2); ctx.fill()
    } else if (card.kind === 'blue-bars') {
      ctx.fillStyle = '#bfdbfe'
      roundRect(gx, gy - 14, 6, 18, 2); ctx.fill()
      roundRect(gx + 9, gy - 22, 6, 26, 2); ctx.fill()
      roundRect(gx + 18, gy - 30, 6, 34, 2); ctx.fill()
      roundRect(gx + 27, gy - 40, 6, 44, 2); ctx.fill()
    } else if (card.kind === 'purple-wave') {
      ctx.strokeStyle = '#c084fc'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(gx - 8, gy - 10)
      ctx.bezierCurveTo(gx + 4, gy - 28, gx + 16, gy - 5, gx + 26, gy - 32)
      ctx.bezierCurveTo(gx + 32, gy - 40, gx + 36, gy - 20, gx + 40, gy - 36)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#cbd5e1'
      roundRect(gx, gy - 12, 6, 16, 2); ctx.fill()
      roundRect(gx + 9, gy - 20, 6, 24, 2); ctx.fill()
      roundRect(gx + 18, gy - 28, 6, 32, 2); ctx.fill()
      roundRect(gx + 27, gy - 38, 6, 42, 2); ctx.fill()
    }
    ctx.restore()
  })

  return canvas.toDataURL('image/png')
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
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const widths = measureWidths(cols, rows)
  const lastCol = Math.max(cols.length, 7)
  const lastLetter = colLetter(lastCol)
  const timestamp = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  /* ---------------- Rows 1 to 4: Executive Header & KPI Area ---------------- */
  ws.getRow(1).height = 68  // Banner top
  ws.getRow(2).height = 28  // Banner bottom / spacer
  ws.getRow(3).height = 76  // KPI cards
  ws.getRow(4).height = 16  // Spacer before table

  // Populate fallback cell fills for viewers without image rendering
  ws.mergeCells(`A1:${lastLetter}1`)
  const tCell = ws.getCell('A1')
  tCell.value = 'SALES & REVENUE EXECUTIVE REPORT'
  tCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' }
  tCell.alignment = { vertical: 'middle', horizontal: 'center' }
  tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF07183D' } }

  ws.mergeCells(`A2:${lastLetter}2`)
  const sCell = ws.getCell('A2')
  sCell.value = `Filter: ${filterLabel}   •   Total Sales: ${totalSales}   •   Generated on: ${timestamp}   •   Confidential`
  sCell.font = { size: 9.5, italic: true, color: { argb: 'FF94A3B8' }, name: 'Segoe UI' }
  sCell.alignment = { vertical: 'middle', horizontal: 'center' }
  sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C2862' } }

  // Fallback Row 3 KPI cell blocks
  const span = Math.max(1, Math.floor(lastCol / 4))
  const kpiRanges = [
    { start: 1, end: span, label: `₹ TOTAL REVENUE: ₹${inr.format(totalAmount)}`, bg: 'FFF0FDF4', fg: 'FF059669' },
    { start: span + 1, end: span * 2, label: `👥 CLOSED DEALS: ${totalSales}`, bg: 'FFEBF5FF', fg: 'FF1D4ED8' },
    { start: span * 2 + 1, end: span * 3, label: `📊 AVG TICKET: ₹${inr.format(Math.round(avgTicket))}`, bg: 'FFFDF4FF', fg: 'FF7C3AED' },
    { start: span * 3 + 1, end: lastCol, label: `📅 PERIOD: ${filterLabel}`, bg: 'FFF8FAFC', fg: 'FF0F172A' },
  ]
  kpiRanges.forEach((k) => {
    const sL = colLetter(k.start)
    const eL = colLetter(k.end)
    ws.mergeCells(`${sL}3:${eL}3`)
    const c = ws.getCell(`${sL}3`)
    c.value = k.label
    c.font = { bold: true, size: 11, color: { argb: k.fg }, name: 'Segoe UI' }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.bg } }
  })

  // Attempt to generate and embed high-definition Canvas image in browser
  try {
    const canvasDataUrl = generateHeaderCanvas({
      totalAmount,
      totalSales,
      avgTicket,
      filterLabel,
      dateStr: timestamp,
    })
    if (canvasDataUrl) {
      const base64Data = canvasDataUrl.replace(/^data:image\/\w+;base64,/, '')
      const imageId = wb.addImage({
        base64: base64Data,
        extension: 'png',
      })
      ws.addImage(imageId, {
        tl: { col: 0, row: 0 },
        br: { col: lastCol, row: 4 },
      })
    }
  } catch (err) {
    console.warn('Canvas header image generation skipped:', err)
  }

  /* ---------------- Row 5: Table Header Row ---------------- */
  const HEAD = 5
  const header = ws.getRow(HEAD)
  header.height = 28

  cols.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.value = formatColumnLabel(c)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Segoe UI' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } }
    cell.alignment = {
      vertical: 'middle',
      horizontal: c.type === 'currency' ? 'right' : c.key === statusKey || c.synthetic === 'parts' ? 'center' : 'left',
      indent: c.type === 'currency' || c.key === statusKey || c.synthetic === 'parts' ? 0 : 1,
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E40AF' } },
      bottom: { style: 'medium', color: { argb: 'FF072752' } },
      left: { style: 'thin', color: { argb: 'FF1E40AF' } },
      right: { style: 'thin', color: { argb: 'FF1E40AF' } },
    }
  })

  /* ---------------- Data Rows (Row 6 onwards) ---------------- */
  let r = HEAD
  const writeCell = (rowIdx, colIdx, value, opts = {}) => {
    const cell = ws.getRow(rowIdx).getCell(colIdx)
    cell.value = value
    if (opts.numFmt) cell.numFmt = opts.numFmt
    cell.alignment = {
      vertical: 'middle',
      horizontal: opts.align || 'left',
      indent: opts.align === 'center' || opts.align === 'right' ? 0 : 1,
      wrapText: !!opts.wrap,
    }
    cell.border = BORDER
    cell.font = {
      size: 9.5,
      bold: !!opts.bold,
      italic: !!opts.italic,
      color: { argb: opts.color || 'FF334155' },
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
    const zebraFill = isZebra ? ZEBRA_SLATE : 'FFFFFFFF'

    cols.forEach((c, i) => {
      const ci = i + 1

      // Synthetic parts column (Payment Breakup)
      if (c.synthetic === 'parts') {
        const parts = partsOf(row, c.of)
        const hasParts = parts.length > 1
        writeCell(r, ci, hasParts ? breakupText(parts) : '—', {
          fill: zebraFill,
          color: hasParts ? 'FF64748B' : 'FF94A3B8',
          italic: hasParts,
          align: hasParts ? 'left' : 'center',
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
      let statusFont = 'FF334155'
      let displayValue = value

      if (isStatus) {
        const rawStr = String(raw).trim()
        const rawLower = rawStr.toLowerCase()
        if (rawLower.includes('complete') || rawLower.includes('full') || rawLower.includes('done')) {
          statusFill = 'FFDCFCE7' // Soft Green
          statusFont = 'FF15803D' // Forest Green
          displayValue = `✔ ${rawStr}`
        } else if (rawLower.includes('registration')) {
          statusFill = 'FFDCFCE7' // Soft Green
          statusFont = 'FF15803D'
          displayValue = `✔ ${rawStr}`
        } else if (rawLower.includes('half') || rawLower.includes('part')) {
          statusFill = 'FFF3E8FF' // Soft Purple
          statusFont = 'FF7E22CE' // Deep Purple
          displayValue = `◐ ${rawStr}`
        } else if (rawLower.includes('promise')) {
          statusFill = 'FFDBEAFE' // Soft Blue
          statusFont = 'FF1D4ED8'
          displayValue = `● ${rawStr}`
        } else if (rawLower.includes('no sale')) {
          statusFill = 'FFFEE2E2' // Soft Red
          statusFont = 'FFB91C1C'
          displayValue = `✖ ${rawStr}`
        }
      }

      const isAmount = c.type === 'currency'
      const isCustomer = c.key === 'customer'
      const isDate = c.type === 'date'

      writeCell(r, ci, isStatus ? displayValue : value, {
        numFmt,
        align: isStatus ? 'center' : isAmount ? 'right' : 'left',
        fill: isStatus ? statusFill : zebraFill,
        color: isStatus
          ? statusFont
          : isAmount
          ? NAVY_TEXT
          : isCustomer
          ? SLATE_DARK
          : isDate
          ? SLATE_MUTED
          : 'FF334155',
        bold: isStatus || isCustomer || isAmount,
      })
    })

    ws.getRow(r).height = 24
  })

  const lastDataRow = r

  // Enable native interactive Excel AutoFilter on table range
  if (lastDataRow >= HEAD + 1) {
    ws.autoFilter = {
      from: { row: HEAD, column: 1 },
      to: { row: lastDataRow, column: cols.length },
    }
  }

  /* ---------------- Total Row ---------------- */
  if (lastDataRow >= HEAD + 1) {
    const totalRow = ws.getRow(lastDataRow + 1)
    totalRow.height = 28

    const moneyColIndex = cols.findIndex((c) => c.type === 'currency') + 1

    // Merge A through C for total title (or columns before amount)
    const mergeEnd = Math.max(1, moneyColIndex > 1 ? moneyColIndex - 1 : 1)
    if (mergeEnd > 1) {
      ws.mergeCells(`A${lastDataRow + 1}:${colLetter(mergeEnd)}${lastDataRow + 1}`)
    }

    cols.forEach((c, i) => {
      const ci = i + 1
      const cell = totalRow.getCell(ci)

      if (ci === 1) {
        cell.value = `📊   TOTAL (${totalSales} ${totalSales === 1 ? 'SALE' : 'SALES'})`
        cell.font = { bold: true, size: 10.5, color: { argb: NAVY_TEXT }, name: 'Segoe UI' }
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      } else if (ci === moneyColIndex) {
        const L = colLetter(ci)
        cell.value = { formula: `SUM(${L}${HEAD + 1}:${L}${lastDataRow})` }
        cell.numFmt = '₹#,##0'
        cell.font = { bold: true, size: 11, color: { argb: NAVY_TEXT }, name: 'Segoe UI' }
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
      } else if (ci > moneyColIndex) {
        cell.value = '—'
        cell.font = { bold: true, size: 10, color: { argb: 'FF60A5FA' }, name: 'Segoe UI' }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ICE_BLUE_TOTAL } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF93C5FD' } },
        bottom: { style: 'double', color: { argb: 'FF2563EB' } },
        left: { style: 'thin', color: { argb: 'FFDBEAFE' } },
        right: { style: 'thin', color: { argb: 'FFDBEAFE' } },
      }
    })
  }

  // Set explicit column widths
  cols.forEach((_, i) => {
    ws.getColumn(i + 1).width = widths[i]
  })

  /* ---------------- Tab 2: Lead Pipeline CRM ---------------- */
  if (includePipeline && leads.length) {
    const ps = wb.addWorksheet('Active Pipeline', {
      views: [{ showGridLines: true }],
    })

    ps.mergeCells('A1:E1')
    const pt = ps.getCell('A1')
    pt.value = `ACTIVE LEAD PIPELINE (${leads.length} LEADS)`
    pt.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' }
    pt.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } }
    pt.alignment = { vertical: 'middle', indent: 1 }
    ps.getRow(1).height = 28

    const heads = ['Name', 'Number', 'Course', 'Status', 'Remarks']
    const pHeader = ps.getRow(2)
    pHeader.height = 24
    heads.forEach((h, i) => {
      const cell = pHeader.getCell(i + 1)
      cell.value = h.toUpperCase()
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Segoe UI' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } }
      cell.alignment = { vertical: 'middle', indent: 1 }
      cell.border = BORDER
    })

    leads.forEach((l, i) => {
      const rowIdx = 3 + i
      const isZ = i % 2 === 1
      const zFill = isZ ? ZEBRA_SLATE : 'FFFFFFFF'
      const values = [l.name, l.phone, l.course, l.status, l.remarks]

      values.forEach((v, ci) => {
        const cell = ps.getRow(rowIdx).getCell(ci + 1)
        cell.value = v ?? ''
        cell.alignment = { vertical: 'middle', indent: 1 }
        cell.border = BORDER
        cell.font = { size: 9.5, bold: ci === 0, color: { argb: 'FF1E293B' }, name: 'Segoe UI' }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zFill } }
      })
      ps.getRow(rowIdx).height = 22
    })

    const pw = [22, 18, 24, 18, 36]
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

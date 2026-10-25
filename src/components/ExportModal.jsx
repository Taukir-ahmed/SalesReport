import { useState, useMemo } from 'react'
import { toISODate, monthKeyOf, monthLabel, DATE_KEY, isBlankRow } from '../lib/columns'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export default function ExportModal({
  isOpen,
  onClose,
  rows = [],
  columns = [],
  monthKey,
  leads = [],
  onExport,
}) {
  const todayIso = toISODate(new Date())

  // Default to 'month' or 'today'
  const [scope, setScope] = useState('month')
  const [format, setFormat] = useState('xlsx')
  const [singleDate, setSingleDate] = useState(todayIso)
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  )
  const [endDate, setEndDate] = useState(todayIso)
  const [includeKPI, setIncludeKPI] = useState(true)
  const [includePipeline, setIncludePipeline] = useState(true)

  // Real, non-blank rows
  const realRows = useMemo(
    () => rows.filter((r) => !isBlankRow(r, columns)),
    [rows, columns]
  )

  // Filter rows based on selected scope
  const { filteredRows, filterLabel, filenameSuffix } = useMemo(() => {
    let result = []
    let label = ''
    let suffix = ''

    if (scope === 'today') {
      result = realRows.filter((r) => r.data?.[DATE_KEY] === todayIso)
      label = `Today (${todayIso})`
      suffix = `Today-${todayIso}`
    } else if (scope === 'yesterday') {
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      result = realRows.filter((r) => r.data?.[DATE_KEY] === yest)
      label = `Yesterday (${yest})`
      suffix = `Yesterday-${yest}`
    } else if (scope === 'week') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      result = realRows.filter((r) => {
        const d = r.data?.[DATE_KEY]
        return d && d >= sevenDaysAgo && d <= todayIso
      })
      label = `Past 7 Days (${sevenDaysAgo} to ${todayIso})`
      suffix = `Week-${todayIso}`
    } else if (scope === 'month') {
      result = realRows.filter((r) => {
        const d = r.data?.[DATE_KEY]
        return d && d.startsWith(monthKey)
      })
      label = `Month of ${monthLabel(monthKey)}`
      suffix = `${monthKey}`
    } else if (scope === 'single') {
      result = realRows.filter((r) => r.data?.[DATE_KEY] === singleDate)
      label = `Date: ${singleDate}`
      suffix = `Date-${singleDate}`
    } else if (scope === 'range') {
      result = realRows.filter((r) => {
        const d = r.data?.[DATE_KEY]
        return d && d >= startDate && d <= endDate
      })
      label = `Range: ${startDate} to ${endDate}`
      suffix = `Range-${startDate}_to_${endDate}`
    } else {
      result = realRows
      label = 'All Recorded Sales'
      suffix = 'All-Sales'
    }

    return { filteredRows: result, filterLabel: label, filenameSuffix: suffix }
  }, [scope, realRows, todayIso, monthKey, singleDate, startDate, endDate])

  // Calculate matching stats
  const matchingStats = useMemo(() => {
    const moneyCol =
      columns.find((c) => c.type === 'currency') || columns.find((c) => c.type === 'number')
    const total = moneyCol
      ? filteredRows.reduce((sum, r) => sum + (Number(r.data?.[moneyCol.key]) || 0), 0)
      : 0
    const count = filteredRows.length
    const avg = count ? total / count : 0
    return { total, count, avg }
  }, [filteredRows, columns])

  if (!isOpen) return null

  const handleDownload = () => {
    onExport({
      format,
      scope,
      filterLabel,
      filenameSuffix,
      filteredRows,
      includeKPI,
      includePipeline,
      stats: matchingStats,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Export Sales & Revenue Report</h2>
          <p>
            Choose your date range and export format. Generates a beautifully formatted executive report ready to share.
          </p>
        </div>

        <div className="modal-body export-modal-body">
          {/* Format Picker */}
          <div className="export-section">
            <label className="export-section-title">1. EXPORT FORMAT</label>
            <div className="format-pills">
              <button
                type="button"
                className={`format-pill ${format === 'xlsx' ? 'active' : ''}`}
                onClick={() => setFormat('xlsx')}
              >
                <span className="format-icon">📊</span>
                <div>
                  <strong>Excel Report (.xlsx)</strong>
                  <small>Styled executive report with KPI cards & color status tags</small>
                </div>
              </button>
              <button
                type="button"
                className={`format-pill ${format === 'csv' ? 'active' : ''}`}
                onClick={() => setFormat('csv')}
              >
                <span className="format-icon">📄</span>
                <div>
                  <strong>Raw CSV (.csv)</strong>
                  <small>Standard comma-separated table for database or CRM import</small>
                </div>
              </button>
            </div>
          </div>

          {/* Date Scope Selection */}
          <div className="export-section">
            <label className="export-section-title">2. SELECT DATE RANGE</label>
            <div className="scope-grid">
              {[
                { id: 'today', label: '⚡ Today Only', sub: todayIso },
                { id: 'week', label: '📅 Past 7 Days', sub: 'Last 7 days' },
                { id: 'month', label: `🗓 This Month`, sub: monthLabel(monthKey) },
                { id: 'single', label: '🎯 Choose Date', sub: 'Specific day' },
                { id: 'range', label: '↔ Custom Range', sub: 'Start to end date' },
                { id: 'all', label: '🌐 All Sales', sub: 'Entire history' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`scope-card ${scope === item.id ? 'active' : ''}`}
                  onClick={() => setScope(item.id)}
                >
                  <strong>{item.label}</strong>
                  <small>{item.sub}</small>
                </button>
              ))}
            </div>

            {/* Sub-pickers for specific date or custom range */}
            {scope === 'single' && (
              <div className="date-picker-box">
                <label>
                  <span>Select Exact Date:</span>
                  <input
                    type="date"
                    className="date-input"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                  />
                </label>
              </div>
            )}

            {scope === 'range' && (
              <div className="date-range-box">
                <label>
                  <span>From Date:</span>
                  <input
                    type="date"
                    className="date-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
                <span className="range-arrow">→</span>
                <label>
                  <span>To Date:</span>
                  <input
                    type="date"
                    className="date-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Live Matching Summary Pill */}
          <div className="export-preview-card">
            <div className="preview-indicator">
              <span className="preview-dot" />
              <strong>{filterLabel}</strong>
            </div>
            <div className="preview-stats">
              <div className="p-stat">
                <span>Matching Sales</span>
                <strong>{matchingStats.count}</strong>
              </div>
              <div className="p-stat">
                <span>Total Collection</span>
                <strong className="text-green">₹{inr.format(matchingStats.total)}</strong>
              </div>
              <div className="p-stat">
                <span>Average Value</span>
                <strong>₹{inr.format(Math.round(matchingStats.avg))}</strong>
              </div>
            </div>
          </div>

          {/* Format Options */}
          {format === 'xlsx' && (
            <div className="export-options">
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={includeKPI}
                  onChange={(e) => setIncludeKPI(e.target.checked)}
                />
                <span>Include Executive KPI Summary cards at top of report</span>
              </label>
              {leads.length > 0 && (
                <label className="check-option">
                  <input
                    type="checkbox"
                    checked={includePipeline}
                    onChange={(e) => setIncludePipeline(e.target.checked)}
                  />
                  <span>Include Active Pipeline leads in second tab ({leads.length} leads)</span>
                </label>
              )}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn export-download-btn"
            onClick={handleDownload}
          >
            📥 Download {format === 'xlsx' ? 'Excel Report' : 'CSV File'} ({matchingStats.count} {matchingStats.count === 1 ? 'sale' : 'sales'})
          </button>
        </div>
      </div>
    </div>
  )
}

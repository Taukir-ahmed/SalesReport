import { useMemo, useState } from 'react'
import { monthKeyOf, monthLabel, monthShort, shiftMonth } from '../lib/columns'

export default function TopBar({
  view,
  ready = true,
  monthKey,
  months,
  onMonth,
  search,
  onSearch,
  onExport,
  onSettings,
  grouped,
  onGrouped,
  onAddLead,
  busy,
  demoMode,
  onExitDemo,
}) {
  const [exportOpen, setExportOpen] = useState(false)
  const thisMonth = monthKeyOf(new Date())
  const isSheet = view === 'sheet'

  const tabs = useMemo(() => {
    const set = new Set([...months, monthKey, thisMonth])
    return [...set].sort().reverse().slice(0, 12)
  }, [months, monthKey, thisMonth])

  return (
    <header className="topbar">
      {/* Top navigation row: Breadcrumbs on left, Global tools on right */}
      <div className="topbar-row">
        <div className="brand">
          <p className="breadcrumb-title">
            Workspace <span className="breadcrumb">/</span>{' '}
            <strong>{isSheet ? 'Sales sheet' : 'Pipeline'}</strong>
          </p>
          {demoMode && (
            <div style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span className="demo-pill-badge" title="Running with local sample data in browser localStorage">
                ⚡ Demo Mode
              </span>
              {onExitDemo && (
                <button
                  className="ghost-btn demo-connect-btn"
                  onClick={onExitDemo}
                  title="Configure Supabase connection"
                >
                  Connect Cloud
                </button>
              )}
            </div>
          )}
        </div>

        <div className="topbar-actions">
          {isSheet && ready && (
            <>
              <div className="search">
                <span>⌕</span>
                <input
                  aria-label="Search this sheet"
                  value={search}
                  placeholder="Search this sheet…"
                  onChange={(e) => onSearch(e.target.value)}
                />
                {search && (
                  <button className="clear" onClick={() => onSearch('')} title="Clear search">
                    ×
                  </button>
                )}
              </div>

              <button
                className={`ghost-btn ${grouped ? 'on' : ''}`}
                onClick={() => onGrouped(!grouped)}
                title={grouped ? 'Grouped by calendar day' : 'Flat sortable list'}
              >
                {grouped ? '▤ By day' : '≡ Flat list'}
              </button>

              <button
                className="primary-btn export-trigger-btn"
                onClick={onExport}
                title="Export custom sales report (Excel or CSV)"
              >
                📊 Export ▾
              </button>

              <button className="ghost-btn" onClick={onSettings} title="Configure columns">
                ⚙ Columns
              </button>
            </>
          )}

          {!isSheet && onAddLead && (
            <button className="primary-btn hero-add-lead" disabled={busy} onClick={onAddLead}>
              ＋ Add lead
            </button>
          )}
        </div>
      </div>

      {/* Hero title banner */}
      <div className="topbar-hero-row">
        <div className="hero-heading-block">
          <span className="hero-eyebrow">
            {isSheet ? 'YOUR MONTH, AT A GLANCE' : 'WORKING PIPELINE'}
          </span>
          <h1 className="hero-title">
            {isSheet ? 'Make every win count.' : 'Good things in progress.'}
          </h1>
          <p className="hero-subtitle">
            {isSheet
              ? 'Every conversation that became a win.'
              : 'Keep track of the people you’re following up with.'}
          </p>
        </div>

        {isSheet && ready && (
          <div className="month-nav">
            <button
              className="icon-btn"
              title="Previous month"
              onClick={() => onMonth(shiftMonth(monthKey, -1))}
            >
              ‹
            </button>
            <div className="month-current">
              <strong>{monthLabel(monthKey)}</strong>
              {monthKey === thisMonth && <span className="live-dot" title="Current month" />}
            </div>
            <button
              className="icon-btn"
              title="Next month"
              onClick={() => onMonth(shiftMonth(monthKey, 1))}
            >
              ›
            </button>
            {monthKey !== thisMonth && (
              <button className="ghost-btn today-btn" onClick={() => onMonth(thisMonth)}>
                Today
              </button>
            )}
          </div>
        )}
      </div>

      {/* Month tabs row */}
      {isSheet && ready && (
        <div className="month-tabs">
          {tabs.map((m) => (
            <button
              key={m}
              className={`tab ${m === monthKey ? 'active' : ''}`}
              onClick={() => onMonth(m)}
            >
              {monthShort(m)}
              {months.includes(m) ? (
                ''
              ) : (
                <span className="tab-empty" title="No entries yet">
                  {' '}
                  ·
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}

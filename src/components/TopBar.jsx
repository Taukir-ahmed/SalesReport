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
      <div className="topbar-row">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <p className="breadcrumb-title">
              Workspace <span className="breadcrumb">/</span>{' '}
              {isSheet ? 'Sales sheet' : view === 'help' ? 'Sales Help' : 'Pipeline'}
            </p>
          </div>
        </div>

        {isSheet && ready ? (
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
              <button className="ghost-btn" onClick={() => onMonth(thisMonth)}>
                Today
              </button>
            )}
          </div>
        ) : (
          <div className="month-nav">
            <div className="month-current wide">
              <strong>
                {view === 'help' ? 'Better conversations start with listening' : 'Working pipeline'}
              </strong>
            </div>
          </div>
        )}

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
                  <button className="clear" onClick={() => onSearch('')} title="Clear">
                    ×
                  </button>
                )}
              </div>

              <button
                className={`ghost-btn ${grouped ? 'on' : ''}`}
                onClick={() => onGrouped(!grouped)}
                title={grouped ? 'Showing one block per day' : 'Showing a flat, sortable list'}
              >
                {grouped ? '▤ By day' : '≡ Flat list'}
              </button>

              <div className="dropdown">
                <button className="primary-btn" onClick={() => setExportOpen((v) => !v)}>
                  Export ▾
                </button>
                {exportOpen && (
                  <>
                    <div className="dropdown-backdrop" onClick={() => setExportOpen(false)} />
                    <div className="dropdown-menu">
                      <button
                        onClick={() => {
                          setExportOpen(false)
                          onExport('xlsx')
                        }}
                      >
                        <strong>Excel (.xlsx)</strong>
                        <small>Coloured, with the pipeline on a second tab</small>
                      </button>
                      <button
                        onClick={() => {
                          setExportOpen(false)
                          onExport('csv')
                        }}
                      >
                        <strong>CSV (.csv)</strong>
                        <small>Plain data for imports</small>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button className="ghost-btn" onClick={onSettings} title="Add or change columns">
                ⚙ Columns
              </button>
            </>
          )}
        </div>
      </div>

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

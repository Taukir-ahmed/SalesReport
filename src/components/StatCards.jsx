const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

const ICONS = ['₹', '↗', '◎', '◷']

export default function StatCards({ stats }) {
  const cards = [
    {
      label: 'Total collected',
      value: stats.hasMoney ? '₹' + inr.format(Math.round(stats.total)) : '—',
      tone: 'green',
      note: 'Everything received this month',
      trend: stats.hasMoney && stats.total > 0 ? '+ Active' : 'Pending',
      iconIndex: 0,
    },
    {
      label: 'Sales closed',
      value: stats.deals,
      tone: 'blue',
      note: 'Entries on this sheet',
      trend: `${stats.deals} won`,
      iconIndex: 1,
    },
    {
      label: 'Average ticket',
      value: stats.hasMoney ? '₹' + inr.format(Math.round(stats.avg)) : '—',
      tone: 'violet',
      note: 'Total ÷ number of sales',
      trend: stats.deals ? 'Avg / sale' : '—',
      iconIndex: 2,
    },
    {
      label: 'Days with no sale',
      value: stats.blankDays,
      tone: stats.blankDays ? 'red' : 'green',
      note: stats.blankDays ? 'Shown in red on sheet' : 'Every day has a sale',
      trend: stats.blankDays ? `${stats.blankDays} days` : '0 blank',
      iconIndex: 3,
    },
  ]

  return (
    <section className="stats" aria-label="Monthly sales summary">
      {cards.map((c) => (
        <div key={c.label} className={`stat stat-${c.tone}`}>
          <div className="stat-header">
            <div className="stat-info">
              <span className="stat-label">{c.label}</span>
              <span className="stat-value">{c.value}</span>
            </div>
            <div className={`stat-icon-wrapper icon-${c.tone}`} aria-hidden="true">
              <span className="stat-icon">{ICONS[c.iconIndex]}</span>
            </div>
          </div>
          <div className="stat-footer">
            <span className={`stat-trend trend-${c.tone}`}>{c.trend}</span>
            <span className="stat-note">{c.note}</span>
          </div>
        </div>
      ))}
    </section>
  )
}

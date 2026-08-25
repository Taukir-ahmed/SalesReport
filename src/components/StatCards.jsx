const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export default function StatCards({ stats }) {
  const cards = [
    {
      label: 'Total collected',
      value: stats.hasMoney ? '₹' + inr.format(Math.round(stats.total)) : '—',
      tone: 'green',
      note: 'Everything received this month',
    },
    { label: 'Sales closed', value: stats.deals, tone: 'blue', note: 'Entries on this sheet' },
    {
      label: 'Average ticket',
      value: stats.hasMoney ? '₹' + inr.format(Math.round(stats.avg)) : '—',
      tone: 'violet',
      note: 'Total ÷ number of sales',
    },
    {
      label: 'Days with no sale',
      value: stats.blankDays,
      tone: stats.blankDays ? 'red' : 'green',
      note: stats.blankDays ? 'Shown in red on the sheet' : 'Every day so far has a sale',
    },
  ]
  return (
    <section className="stats">
      {cards.map((c) => (
        <div key={c.label} className={`stat stat-${c.tone}`}>
          <span className="stat-label">{c.label}</span>
          <span className="stat-value">{c.value}</span>
          <span className="stat-note">{c.note}</span>
        </div>
      ))}
    </section>
  )
}

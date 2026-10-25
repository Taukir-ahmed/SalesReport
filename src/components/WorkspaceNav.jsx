export default function WorkspaceNav({ view, onView, count, connected, demoMode }) {
  return (
    <aside className="workspace-nav">
      <a
        className="workspace-brand"
        href="#"
        onClick={(e) => {
          e.preventDefault()
        }}
      >
        <span className="workspace-logo">
          s<span>↗</span>
        </span>
        <span>
          Salesroom<small>A LITTLE MORE HUMAN.</small>
        </span>
      </a>
      <span className="nav-caption">WORKSPACE</span>
      <nav aria-label="Main navigation">
        {[
          ['sheet', '▤', 'Sales sheet'],
          ['pipeline', '▥', 'Pipeline'],
        ].map(([id, icon, label]) => (
          <button
            key={id}
            className={view === id ? 'selected' : ''}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => onView(id)}
          >
            <span className="nav-icon" aria-hidden="true">
              {icon}
            </span>
            {label}
            {id === 'pipeline' && count > 0 && <span className="nav-count">{count}</span>}
          </button>
        ))}
      </nav>
      <div className="nav-studio-note">
        <span aria-hidden="true">✳</span>
        <strong>
          Good conversations
          <br />
          open doors.
        </strong>
        <p>
          Your space to listen,
          <br />
          explore, and follow through.
        </p>
      </div>
      <div className="nav-bottom">
        <span className="workspace-avatar">SR</span>
        <div className="nav-bottom-info">
          <span className="nav-user-title">Sales workspace</span>
          <small className="nav-status">
            <span className={`status-dot ${connected ? 'online' : demoMode ? 'demo' : 'offline'}`} />
            {connected ? 'Cloud connected' : demoMode ? 'Local Demo mode' : 'Local / Offline mode'}
          </small>
        </div>
      </div>
    </aside>
  )
}

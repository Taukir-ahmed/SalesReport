export default function ConnectionScreen({ kind, message, onRetry, onEnterDemo }) {
  const setup = kind === 'setup'
  return (
    <div className="boot">
      <div className="conn-card">
        <div className={`conn-icon ${setup ? '' : 'bad'}`}>{setup ? '⚙' : '!'}</div>
        <h2>{setup ? 'Connect your Supabase project' : "Can't reach your sheet"}</h2>
        <p>
          {setup
            ? 'Connect your existing Supabase project to sync your sales sheet to the cloud, or preview everything right now with interactive sample data in local Demo Mode.'
            : message}
        </p>

        {setup && onEnterDemo && (
          <div className="conn-demo-box">
            <button type="button" className="primary-btn conn-demo-btn" onClick={onEnterDemo}>
              ⚡ Launch Demo Mode (10 Sample Records)
            </button>
            <span className="conn-demo-sub">
              Instant local preview • Test Argon UI, click-to-edit table & Excel export
            </span>
          </div>
        )}

        {setup && (
          <>
            <div className="conn-divider">
              <span>OR CONNECT CLOUD DATABASE</span>
            </div>
            <ol className="conn-steps">
              <li>
                Copy <code>.env.example</code> to <code>.env</code> in the project folder.
              </li>
              <li>
                Paste your <strong>Project URL</strong> and <strong>anon public</strong> key from
                Supabase → Project Settings → API.
              </li>
              <li>
                Use the Supabase project that already holds your sales and pipeline tables.
              </li>
              <li>
                Stop and restart <code>npm run dev</code> — env files are only read at startup.
              </li>
            </ol>
          </>
        )}

        {!setup && (
          <p className="conn-hint">
            Check that your existing sales and pipeline tables are available in this project. Env
            changes need a restart of <code>npm run dev</code>.
          </p>
        )}

        {onRetry && (
          <button className="primary-btn" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

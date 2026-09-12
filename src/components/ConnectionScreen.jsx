export default function ConnectionScreen({ kind, message, onRetry }) {
  const setup = kind === 'setup'
  return (
    <div className="boot">
      <div className="conn-card">
        <div className={`conn-icon ${setup ? '' : 'bad'}`}>{setup ? '⚙' : '!'}</div>
        <h2>{setup ? 'Connect your Supabase project' : "Can't reach your sheet"}</h2>
        <p>
          {setup
            ? 'Connect your existing Supabase project to open the sales sheet and pipeline. Sales Help is available from the navigation while you set this up.'
            : message}
        </p>

        {setup && (
          <ol className="conn-steps">
            <li>
              Copy <code>.env.example</code> to <code>.env</code> in the project folder.
            </li>
            <li>
              Paste your <strong>Project URL</strong> and <strong>anon public</strong> key from
              Supabase → Project Settings → API.
            </li>
            <li>
              Use the Supabase project that already holds your sales and pipeline tables. Database
              setup scripts are not included in this repository.
            </li>
            <li>
              Stop and restart <code>npm run dev</code> — env files are only read at startup.
            </li>
          </ol>
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

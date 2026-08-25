export default function ConnectionScreen({ kind, message, onRetry }) {
  const setup = kind === 'setup'
  return (
    <div className="boot">
      <div className="conn-card">
        <div className={`conn-icon ${setup ? '' : 'bad'}`}>{setup ? '⚙' : '!'}</div>
        <h2>{setup ? 'Connect your Supabase project' : "Can't reach your sheet"}</h2>
        <p>
          {setup
            ? 'This app keeps everything in Supabase — nothing is stored in the browser. Add your project keys and it will start up.'
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
              Run <code>supabase/schema.sql</code> in the Supabase SQL editor.
            </li>
            <li>
              Stop and restart <code>npm run dev</code> — env files are only read at startup.
            </li>
          </ol>
        )}

        {!setup && (
          <p className="conn-hint">
            If this is the first run, make sure <code>supabase/schema.sql</code> has been run in the
            SQL editor. Env changes need a restart of <code>npm run dev</code>.
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

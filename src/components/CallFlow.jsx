import { useEffect, useMemo, useRef, useState } from 'react'
import { localCallFlow, researchSources } from '../lib/callFlow'
import { formatCallGuide } from '../lib/callInsights'
import {
  DEFAULT_MODEL,
  SETTINGS_KEY,
  generateFlow,
  readSettings,
  saveSettings,
} from '../lib/gemini'

export default function CallFlow({ context }) {
  const [settings, setSettings] = useState(() => {
    try {
      return readSettings(window.localStorage)
    } catch {
      return { key: '', model: DEFAULT_MODEL }
    }
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [modelDraft, setModelDraft] = useState(settings.model)
  const [settingsNotice, setSettingsNotice] = useState('')
  const [challenge, setChallenge] = useState('')
  const [evidence, setEvidence] = useState('')
  const [generated, setGenerated] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copyNotice, setCopyNotice] = useState('')
  const [expanded, setExpanded] = useState(null)
  const request = useRef(null)
  const stamp = JSON.stringify({ context, challenge, evidence })
  const fallback = useMemo(() => localCallFlow(context, challenge), [context, challenge])
  const live = generated?.stamp === stamp ? generated : null
  const steps = live?.steps || fallback

  useEffect(() => {
    request.current?.abort()
    request.current = null
    setBusy(false)
    setGenerated(null)
    setError('')
    setExpanded(null)
    return () => {
      request.current?.abort()
      request.current = null
    }
  }, [stamp, settings.key, settings.model])

  function saveKey(e) {
    e.preventDefault()
    try {
      const next = saveSettings(window.localStorage, {
        key: keyDraft || settings.key,
        model: modelDraft,
      })
      setSettings(next)
      setKeyDraft('')
      setSettingsNotice('Saved in this browser. You can replace or remove the key here.')
    } catch (err) {
      setSettingsNotice(
        err.name === 'SecurityError' || err.name === 'QuotaExceededError'
          ? 'This browser blocked local storage. Enable site storage and try again.'
          : err.message
      )
    }
  }
  function removeKey() {
    try {
      window.localStorage.removeItem(SETTINGS_KEY)
      setSettings({ key: '', model: DEFAULT_MODEL })
      setKeyDraft('')
      setModelDraft(DEFAULT_MODEL)
      setSettingsNotice('Key removed from this browser.')
    } catch {
      setSettingsNotice(
        'The browser blocked removal. Clear this site’s storage in browser settings.'
      )
    }
  }
  async function generate() {
    if (!settings.key) {
      setSettingsOpen(true)
      return
    }
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 60000)
    try {
      const steps = await generateFlow({
        ...settings,
        context,
        challenge,
        evidence,
        signal: controller.signal,
      })
      if (request.current === controller && !controller.signal.aborted) {
        setGenerated({ stamp, steps, model: settings.model })
        setExpanded(null)
      }
    } catch (e) {
      if (request.current === controller)
        setError(
          timedOut
            ? 'Gemini took too long. Try again; your local flow is still available.'
            : e.name === 'AbortError'
              ? ''
              : e.message
        )
    } finally {
      clearTimeout(timer)
      if (request.current === controller) {
        request.current = null
        setBusy(false)
      }
    }
  }
  async function copyAll() {
    try {
      await navigator.clipboard.writeText(formatCallGuide(steps))
      setCopyNotice('10 talking points with insights and examples copied.')
    } catch {
      setCopyNotice('Copy is unavailable. You can select and copy the lines manually.')
    }
  }

  return (
    <section className="call-flow" aria-label="10-line call flow">
      <div className="flow-toolbar">
        <div>
          <span className="eyebrow">THE CONVERSATION, BEFORE THE PITCH</span>
          <h2>Your 10 talking points</h2>
        </div>
        <button
          className="ghost-btn"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
        >
          Gemini settings
        </button>
      </div>
      {settingsOpen && (
        <form className="gemini-settings" onSubmit={saveKey}>
          <h3>Connect your Gemini API</h3>
          <p>
            The key is stored in this browser’s localStorage. Anyone with access to this browser
            profile can use it. It is sent only to Google for requests, never saved to your
            repository or Supabase.
          </p>
          <label>
            {settings.key ? 'Replace API key' : 'Gemini API key'}
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder={
                settings.key
                  ? 'Key saved · paste a new key to replace it'
                  : 'Paste your Gemini API key'
              }
            />
          </label>
          <label>
            Gemini model
            <input
              value={modelDraft}
              onChange={(e) => setModelDraft(e.target.value)}
              list="gemini-models"
              required
            />
          </label>
          <datalist id="gemini-models">
            <option value="gemini-2.5-flash" />
            <option value="gemini-2.5-flash-lite" />
          </datalist>
          <div className="flow-actions">
            <button className="primary-btn" type="submit">
              Save Gemini settings
            </button>
            {settings.key && (
              <button className="ghost-btn" type="button" onClick={removeKey}>
                Remove saved key
              </button>
            )}
          </div>
          <p role="status">
            {settingsNotice || (settings.key ? 'Key saved on this device.' : 'No key saved yet.')}
          </p>
        </form>
      )}
      <label className="challenge-label">
        What did they say, or what makes this call difficult?
        <textarea
          rows={2}
          value={challenge}
          onChange={(e) => setChallenge(e.target.value)}
          placeholder="e.g. ‘I use Copilot for DAX formulas. What else could I do with AI?’"
        />
      </label>
      <details className="course-evidence">
        <summary>
          Course evidence to help Gemini compare fairly <span>optional</span>
        </summary>
        <label>
          Relevant syllabus, trainer experience, real deadline, or support actually included
          <textarea
            rows={3}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Specific modules, a verifiable trainer profile, or actual feedback offered. Do not paste secrets or private client data."
          />
        </label>
      </details>
      <div className="flow-actions">
        <button className="primary-btn" onClick={generate} disabled={busy}>
          {busy ? 'Creating your flow…' : settings.key ? 'Generate with Gemini' : 'Connect Gemini'}
        </button>
        {busy && (
          <button
            className="ghost-btn"
            onClick={() => {
              request.current?.abort()
              request.current = null
              setBusy(false)
            }}
          >
            Cancel
          </button>
        )}
        <button className="text-btn" onClick={copyAll}>
          Copy call guide
        </button>
        <span className="flow-source">
          {live ? `Gemini · ${live.model}` : 'Instant local flow'}
        </span>
      </div>
      <p className="request-note">
        Generate sends the role, learning context, difficult moment, and course evidence above to
        Google. Client name and pipeline notes are excluded. Requests run only when you click;
        free-tier limits may apply.
      </p>
      {error && (
        <p className="flow-error" role="alert">
          {error}
        </p>
      )}
      <p className="flow-hint">
        Ask, listen, then share something useful. Each point includes an insight to say back. Open
        it for an example, what it takes, and a follow-up.
      </p>
      <ol className="flow-list" aria-busy={busy}>
        {steps.map((step, i) => (
          <li key={`${live ? 'ai' : 'local'}-${i}`} className={expanded === i ? 'expanded' : ''}>
            <button
              className="flow-line"
              aria-expanded={expanded === i}
              aria-controls={`flow-detail-${i}`}
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <span className="flow-number">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <small>{step.title}</small>
                <span>{step.line}</span>
              </span>
              <span aria-hidden="true">{expanded === i ? '−' : '+'}</span>
            </button>
            <div className="flow-insight">
              <strong>Share this insight</strong>
              <p lang="en">“{step.insight}”</p>
            </div>
            {expanded === i && (
              <div className="flow-detail" id={`flow-detail-${i}`}>
                <span className="language-badge">{step.principle}</span>
                <strong>A concrete example · try saying</strong>
                <p lang="en">“{step.example}”</p>
                <strong>What it takes · keep the explanation accurate</strong>
                <p>{step.realityCheck}</p>
                <strong>How to explore their reply</strong>
                <p>{step.expand}</p>
                <strong>Then ask</strong>
                <p lang="en">“{step.followUp}”</p>
                <strong>Listen for</strong>
                <p>{step.listenFor}</p>
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="flow-copy-notice" role="status">
        {copyNotice}
      </p>
      <details className="research-notes">
        <summary>Why this flow works · reading notes</summary>
        <p>
          These are original prompts informed by the methods below, not quotations or a promise of
          conversion.
        </p>
        {researchSources.map((s) => (
          <p key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title} ↗
            </a>
            <br />
            {s.note}
          </p>
        ))}
        <p>
          Use the client’s real priorities to discuss urgency. Only share scarcity, outcomes, or
          credentials you can substantiate.
        </p>
      </details>
    </section>
  )
}

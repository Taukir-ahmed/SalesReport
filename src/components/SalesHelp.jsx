import { useMemo, useState } from 'react'
import CallFlow from './CallFlow'
import { buildGuidance, courseConnection, goals, objections, objectionHelp } from '../lib/salesHelp'

const blank = {
  name: '',
  role: '',
  purpose: '',
  interest: '',
  knowledge: '',
  situation: '',
  goal: 'Discover their goal',
}

export default function SalesHelp({ leads, onSaveNotes, available }) {
  const [context, setContext] = useState(blank)
  const [leadId, setLeadId] = useState('')
  const [callVersion, setCallVersion] = useState(0)
  const [angleId, setAngleId] = useState(null)
  const [objection, setObjection] = useState('Just exploring')
  const [tab, setTab] = useState('angles')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const result = useMemo(() => buildGuidance(context), [context])
  const angle = result.cards.find((c) => c.id === angleId) || result.cards[0]
  const connection = courseConnection(context, angle.id)
  const field = (key) => ({
    value: context[key],
    onChange: (e) => {
      setContext((c) => ({ ...c, [key]: e.target.value }))
      setNotice('')
    },
  })
  const chooseLead = (id) => {
    setCallVersion((v) => v + 1)
    const lead = leads.find((l) => l.id === id)
    setLeadId(id)
    setContext({ ...blank, name: lead?.name || '' })
    setNotes(lead?.remarks || '')
    setNotice('')
    setAngleId(null)
    setObjection('Just exploring')
    setTab('angles')
  }
  const reset = () => {
    if (
      (notes ||
        context.name ||
        context.role ||
        context.purpose ||
        context.interest ||
        context.situation ||
        context.knowledge) &&
      !window.confirm('Start a new call? Unsaved context and notes will be cleared.')
    )
      return
    chooseLead('')
  }
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Call line copied.')
    } catch {
      setNotice('Copy is unavailable here. Select the call line and copy it manually.')
    }
  }
  const save = async () => {
    setSaving(true)
    setNotice('')
    try {
      await onSaveNotes(leadId, notes)
      setNotice('Notes saved to this pipeline lead.')
    } catch {
      setNotice('Notes could not be saved. Your draft is still here; try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="sales-help" aria-label="Sales Help">
      <div className="help-heading">
        <div>
          <span className="eyebrow">CONVERSATIONS, WITH CONTEXT</span>
          <h1>
            A better conversation.
            <br className="mobile-break" /> One line at a time.
          </h1>
          <p>Go beyond the course pitch. Find what is actually worth exploring.</p>
        </div>
        <button className="ghost-btn" onClick={reset} disabled={saving}>
          ＋ New call
        </button>
      </div>
      <div className="help-layout">
        <aside className="client-panel">
          <div className="panel-heading">
            <span className="section-number">01</span>
            <h2>Who’s on the call?</h2>
          </div>
          {available && (
            <label>
              Pipeline lead
              <select
                disabled={saving}
                value={leadId}
                onChange={(e) => {
                  if (
                    e.target.value !== leadId &&
                    (notes ||
                      context.role ||
                      context.purpose ||
                      context.interest ||
                      context.situation ||
                      context.knowledge) &&
                    !window.confirm('Switch clients? Unsaved context and notes will be cleared.')
                  )
                    return
                  chooseLead(e.target.value)
                }}
              >
                <option value="">New conversation</option>
                {leads
                  .filter((l) => !l.moved_at)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name || 'Unnamed lead'}
                      {l.phone ? ` · ${l.phone}` : ''}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            Client name <span className="optional">optional</span>
            <input placeholder="e.g. Rahul" {...field('name')} />
          </label>
          <label>
            What do they do?
            <input placeholder="e.g. Accountant, teacher, shop owner" {...field('role')} />
          </label>
          <label>
            Their situation, in their own words
            <textarea
              rows={4}
              placeholder="e.g. 3 years in frontend, feels stuck; wants backend/AI work. Says: ‘I’m worried about layoffs, but don’t know Python.’"
              {...field('situation')}
            />
          </label>
          <label>
            What do they already know?
            <input placeholder="e.g. Python, ChatGPT, built a RAG demo" {...field('knowledge')} />
          </label>
          <label>
            Why did they attend the workshop?
            <textarea
              rows={3}
              placeholder="General learning is enough. Use their words…"
              {...field('purpose')}
            />
          </label>
          <label>
            Hobbies or an idea they’ve put off
            <input placeholder="e.g. Cooking, photography, writing" {...field('interest')} />
          </label>
          <label>
            What matters to them?
            <select {...field('goal')}>
              {goals.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <div className="context-note">
            <span>✧</span>
            <p>
              Angles update as you type. Ask first; their job alone doesn’t tell you what they want.
            </p>
          </div>
        </aside>

        <div className="conversation-panel">
          <div className="conversation-top">
            <span className="eyebrow">
              {context.name ? `IN CONVERSATION WITH ${context.name}` : 'YOUR CALL COMPANION'}
            </span>
            <span className="language-badge">English</span>
          </div>
          <CallFlow key={callVersion} context={context} />
          <div
            className="help-tabs"
            role="tablist"
            aria-label="Call guidance"
            onKeyDown={(e) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
              e.preventDefault()
              const buttons = [...e.currentTarget.querySelectorAll('[role="tab"]')]
              const current = buttons.indexOf(e.target)
              const next =
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? buttons.length - 1
                    : (current + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) %
                      buttons.length
              buttons[next].click()
              buttons[next].focus()
            }}
          >
            {[
              ['angles', 'Conversation angles'],
              ['hesitation', 'Handle a hesitation'],
              ['next', 'Next step'],
            ].map(([id, label]) => (
              <button
                key={id}
                id={`tab-${id}`}
                role="tab"
                aria-selected={tab === id}
                aria-controls="guidance-panel"
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div id="guidance-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === 'angles' && (
              <>
                <div className="angle-intro">
                  <h2>A few doors to open</h2>
                  <span>Choose what resonates</span>
                </div>
                <div className="angle-options">
                  {result.cards.map((c, i) => (
                    <button
                      key={c.id}
                      className={angle.id === c.id ? 'active' : ''}
                      aria-pressed={angle.id === c.id}
                      onClick={() => setAngleId(c.id)}
                    >
                      <span>0{i + 1}</span>
                      <strong>{c.title}</strong>
                      <span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
                <article className="angle-detail">
                  <span className="prompt-label">{angle.tag} · TRY SAYING</span>
                  <p className="spoken-line">“{angle.line}”</p>
                  <div className="follow-up">
                    <span className="prompt-label">THEN ASK</span>
                    <p>“{angle.question}”</p>
                  </div>
                  <div className="example-card">
                    <span className="example-icon" aria-hidden="true">
                      ↗
                    </span>
                    <div>
                      <span className="prompt-label">A PROJECT TO PICTURE · ILLUSTRATIVE</span>
                      <p>{angle.example.charAt(0).toUpperCase() + angle.example.slice(1)}.</p>
                    </div>
                  </div>
                  <div className="follow-up">
                    <span className="prompt-label">MAKE IT TANGIBLE · {connection.topic}</span>
                    <p>“{connection.line}”</p>
                  </div>
                  <div className="possibility">
                    <span className="prompt-label">WHERE IT COULD GO</span>
                    <p>{angle.next}</p>
                  </div>
                  <p className="fit-note">{angle.fit}</p>
                  <button
                    className="text-btn"
                    onClick={() => copy(`${angle.line}\n\n${angle.question}\n\n${connection.line}`)}
                  >
                    Copy these lines ↗
                  </button>
                </article>
              </>
            )}
            {tab === 'hesitation' && (
              <article className="hesitation-card">
                <h2>Understand what’s behind it.</h2>
                <div className="objection-options">
                  {objections.map((o) => (
                    <button
                      key={o}
                      aria-pressed={objection === o}
                      className={objection === o ? 'active' : ''}
                      onClick={() => setObjection(o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <span className="prompt-label">TRY SAYING</span>
                <p className="spoken-line">“{objectionHelp[objection][0]}”</p>
                <div className="follow-up">
                  <span className="prompt-label">LISTEN, THEN RESPOND</span>
                  <p>{objectionHelp[objection][1]}</p>
                </div>
                <button className="text-btn" onClick={() => copy(objectionHelp[objection][0])}>
                  Copy line ↗
                </button>
              </article>
            )}
            {tab === 'next' && (
              <article className="next-card">
                <h2>Make the next step feel clear.</h2>
                <p className="spoken-line">
                  “What felt most useful to you in our conversation? Let’s look at what the course
                  actually teaches that could help with that.”
                </p>
                <div className="course-facts">
                  <div>
                    <span>Full course</span>
                    <strong>₹35,000</strong>
                  </div>
                  <div>
                    <span>Registration</span>
                    <strong>₹2,200</strong>
                  </div>
                  <div>
                    <span>Included</span>
                    <strong>Lifetime updates</strong>
                  </div>
                </div>
                <p className="course-coverage">
                  Course topics: latest AI tools, video generation, image generation, data analysis,
                  and research.
                </p>
                <div className="follow-up">
                  <span className="prompt-label">IF THEY WANT TO PROCEED</span>
                  <p>
                    “The course costs ₹35,000 and includes lifetime updates. Registration is ₹2,200.
                    Before you pay, let me explain what registration includes, whether it counts
                    toward the total fee, when the balance is due, and the refund terms. Then you
                    can decide.”
                  </p>
                </div>
                <p className="terms-note">
                  Confirm before collecting payment: registration benefits, whether ₹2,200 is
                  included in the total, balance payment timing, and refund terms. These details
                  have not been provided.
                </p>
                <div className="follow-up">
                  <span className="prompt-label">IF THEY’RE NOT READY</span>
                  <p>
                    “That’s fine. Is there a specific question still on your mind? If you would
                    like, we can clarify it and speak again at a time that works for you.”
                  </p>
                </div>
              </article>
            )}
          </div>
          <section className="call-notes">
            <label htmlFor="call-notes">
              Call notes <span className="optional">what they cared about, agreed next step</span>
            </label>
            <textarea
              id="call-notes"
              disabled={saving}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setNotice('')
              }}
              rows={3}
              placeholder="Capture their words and what you agreed to do next…"
            />
            <div>
              <small>
                {leadId
                  ? 'Save updates this lead’s remarks.'
                  : 'Draft only · kept while this page stays open.'}
              </small>
              {leadId && (
                <button className="primary-btn" disabled={saving} onClick={save}>
                  {saving ? 'Saving…' : 'Save to pipeline'}
                </button>
              )}
            </div>
          </section>
          <p className="help-notice" role="status">
            {notice}
          </p>
        </div>
      </div>
    </section>
  )
}

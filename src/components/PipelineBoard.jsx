import { useEffect, useState } from 'react'
import { PIPELINE_STATUS, PIPELINE_STATUS_OPTIONS, converts, toneOf } from '../lib/status'

const BIN_DAYS = 7
const daysLeft = (iso) => {
  const gone = (Date.now() - new Date(iso).getTime()) / 86400000
  return Math.max(0, Math.ceil(BIN_DAYS - gone))
}

/* A cell that keeps what you type locally and saves when you leave it. */
function LeadInput({ value, onSave, placeholder, type = 'text', className = '' }) {
  const [v, setV] = useState(value ?? '')
  useEffect(() => setV(value ?? ''), [value])
  return (
    <input
      className={`lead-input ${className}`}
      type={type}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== (value ?? '') && onSave(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setV(value ?? '')
          e.currentTarget.blur()
        }
      }}
    />
  )
}

export default function PipelineBoard({
  leads,
  bin,
  binOpen,
  onBinOpen,
  onRestore,
  onPurge,
  courseOptions,
  onUpdate,
  onAdd,
  onDelete,
  onStatus,
  showMoved,
  onShowMoved,
  busy,
  error,
}) {
  if (error) {
    return (
      <section className="sheet-wrap">
        <div className="pipeline-setup">
          <div className="conn-icon bad">!</div>
          <h3>The pipeline isn't ready yet</h3>
          <p>{error}</p>
        </div>
      </section>
    )
  }

  if (binOpen) {
    return (
      <>
        <section className="chips">
          <button className="ghost-btn on" onClick={() => onBinOpen(false)}>
            ‹ Back to the pipeline
          </button>
          <span className="bin-note">
            Deleted leads are kept for {BIN_DAYS} days, then cleared automatically.
          </span>
        </section>

        <section className="sheet-wrap">
          <div className="sheet-scroll">
            <table className="sheet pipeline bin">
              <colgroup>
                <col style={{ width: 220 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 190 }} />
              </colgroup>
              <thead>
                <tr>
                  <th><span className="th-btn static"><span className="th-label">Name</span></span></th>
                  <th><span className="th-btn static"><span className="th-label">Number</span></span></th>
                  <th><span className="th-btn static"><span className="th-label">Course</span></span></th>
                  <th><span className="th-btn static"><span className="th-label">Status</span></span></th>
                  <th><span className="th-btn static"><span className="th-label">Clears in</span></span></th>
                  <th><span className="th-btn static"><span className="th-label">&nbsp;</span></span></th>
                </tr>
              </thead>
              <tbody>
                {bin.map((l) => (
                  <tr key={l.id} className="lead binned">
                    <td className="pad">{l.name || <span className="muted">Unnamed lead</span>}</td>
                    <td className="pad">{l.phone}</td>
                    <td className="pad">{l.course}</td>
                    <td className="pad">
                      {l.status ? <span className={`pill tone-${toneOf(l.status)}`}>{l.status}</span> : ''}
                    </td>
                    <td className="pad">
                      <span className={daysLeft(l.deleted_at) <= 2 ? 'expiring' : ''}>
                        {daysLeft(l.deleted_at)} day{daysLeft(l.deleted_at) === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td className="pad right-actions">
                      <button className="ghost-btn sm" onClick={() => onRestore(l.id)}>
                        Restore
                      </button>
                      <button
                        className="ghost-btn sm danger"
                        onClick={() =>
                          confirm(`Delete ${l.name || 'this lead'} for good? This one can't be undone.`) &&
                          onPurge(l.id)
                        }
                      >
                        Delete forever
                      </button>
                    </td>
                  </tr>
                ))}
                {bin.length === 0 && (
                  <tr className="empty">
                    <td colSpan={6}>
                      <strong>The bin is empty.</strong>
                      <span>Anything you delete from the pipeline waits here for a week.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    )
  }

  const active = leads.filter((l) => !l.moved_at)
  const count = (s) => active.filter((l) => l.status === s).length

  const chips = [
    { label: 'Open leads', value: active.length, tone: 'blue' },
    { label: 'Promise to pay', value: count(PIPELINE_STATUS.PROMISE), tone: 'gold' },
    { label: 'No sale', value: count(PIPELINE_STATUS.NONE), tone: 'red' },
    { label: 'DNP', value: count(PIPELINE_STATUS.DNP), tone: 'grey' },
  ]

  return (
    <>
      <section className="chips">
        {chips.map((c) => (
          <div key={c.label} className={`chip chip-${c.tone}`}>
            <span className="chip-value">{c.value}</span>
            <span className="chip-label">{c.label}</span>
          </div>
        ))}
        <label className="chip-toggle">
          <input type="checkbox" checked={showMoved} onChange={(e) => onShowMoved(e.target.checked)} />
          <span>Show leads already moved to the sheet</span>
        </label>
        <button className="ghost-btn" onClick={() => onBinOpen(true)} title="Deleted leads, kept for a week">
          🗑 Bin{bin.length > 0 ? ` · ${bin.length}` : ''}
        </button>
      </section>

      <section className="sheet-wrap">
        <div className="sheet-scroll">
          <table className="sheet pipeline">
            <colgroup>
              <col style={{ width: 46 }} />
              <col style={{ width: 220 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 210 }} />
              <col style={{ width: 190 }} />
              <col style={{ width: 260 }} />
              <col style={{ width: 40 }} />
            </colgroup>
            <thead>
              <tr>
                <th className="gutter-h" />
                <th>
                  <span className="th-btn static">
                    <span className="th-icon">Abc</span>
                    <span className="th-label">Name</span>
                  </span>
                </th>
                <th>
                  <span className="th-btn static">
                    <span className="th-icon">#</span>
                    <span className="th-label">Number</span>
                  </span>
                </th>
                <th>
                  <span className="th-btn static">
                    <span className="th-icon">▾</span>
                    <span className="th-label">Course</span>
                  </span>
                </th>
                <th>
                  <span className="th-btn static">
                    <span className="th-icon">●</span>
                    <span className="th-label">Status</span>
                  </span>
                </th>
                <th>
                  <span className="th-btn static">
                    <span className="th-icon">Abc</span>
                    <span className="th-label">Remarks</span>
                  </span>
                </th>
                <th className="tail-h" />
              </tr>
            </thead>

            <tbody>
              {leads.map((l, i) => (
                <tr
                  key={l.id}
                  className={`lead tone-row-${toneOf(l.status)} ${
                    l.status === PIPELINE_STATUS.PROMISE ? 'glow-gold' : ''
                  } ${l.moved_at ? 'moved' : ''}`}
                >
                  <td className="gutter">
                    <span className="rownum">{i + 1}</span>
                    <button
                      className="row-del"
                      title="Remove this lead"
                      onClick={() => confirm(`Remove ${l.name || 'this lead'} from the pipeline?`) && onDelete(l.id)}
                    >
                      ×
                    </button>
                  </td>
                  <td>
                    <LeadInput value={l.name} placeholder="Name" onSave={(v) => onUpdate(l.id, { name: v })} />
                    {l.moved_at && <span className="moved-tag">on the sheet</span>}
                  </td>
                  <td>
                    <LeadInput
                      value={l.phone}
                      placeholder="Phone"
                      onSave={(v) => onUpdate(l.id, { phone: v })}
                    />
                  </td>
                  <td>
                    <select
                      className="lead-input"
                      value={l.course || ''}
                      onChange={(e) => onUpdate(l.id, { course: e.target.value })}
                    >
                      <option value="">—</option>
                      {courseOptions.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                      {l.course && !courseOptions.includes(l.course) && (
                        <option value={l.course}>{l.course}</option>
                      )}
                    </select>
                  </td>
                  <td>
                    <select
                      className={`lead-input status-select tone-${toneOf(l.status)}`}
                      value={l.status || ''}
                      disabled={!!l.moved_at}
                      onChange={(e) => onStatus(l, e.target.value)}
                    >
                      <option value="">Not set</option>
                      {PIPELINE_STATUS_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                          {converts(o) ? '  →  sheet' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <LeadInput
                      value={l.remarks}
                      placeholder="What happened on the call…"
                      onSave={(v) => onUpdate(l.id, { remarks: v })}
                    />
                  </td>
                  <td className="tail" />
                </tr>
              ))}

              <tr className="ghost" onClick={() => !busy && onAdd()}>
                <td className="gutter">
                  <span className="rownum plus">+</span>
                </td>
                <td colSpan={6} className="ghost-cell">
                  {busy ? 'Adding…' : 'Click here to add a lead'}
                </td>
              </tr>

              {leads.length === 0 && (
                <tr className="empty">
                  <td colSpan={7}>
                    <strong>No leads in the pipeline.</strong>
                    <span>
                      Add the numbers you're working on. Mark one <em>Sale done</em>,{' '}
                      <em>Registration done</em> or <em>Half payment done</em> and it moves itself onto
                      the sales sheet.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

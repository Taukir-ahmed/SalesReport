import { useEffect, useRef, useState } from 'react'
import { CONVERTS_TO, toneOf } from '../lib/status'

/* Shown when a pipeline lead is marked as a sale: collects the amount that
 * actually came in before the lead moves onto the sheet. */
export default function ConvertModal({ lead, status, onCancel, onConfirm }) {
  const target = CONVERTS_TO[status]
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState(lead.remarks || '')
  const ref = useRef(null)
  useEffect(() => ref.current?.focus(), [])

  const submit = (e) => {
    e.preventDefault()
    onConfirm({ amount: amount === '' ? '' : Number(amount), remarks })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal small" onSubmit={submit}>
        <header className="modal-head">
          <div>
            <h2>Move to the sales sheet</h2>
            <p>
              <strong>{lead.name || 'This lead'}</strong>
              {lead.course ? ` · ${lead.course}` : ''} will be added to today's sheet as{' '}
              <span className={`pill tone-${toneOf(target)}`}>{target}</span>
            </p>
          </div>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>Amount received now (₹)</span>
            <input
              ref={ref}
              type="number"
              step="any"
              value={amount}
              placeholder="0"
              onChange={(e) => setAmount(e.target.value)}
            />
            <small>
              {status === 'Half payment done' || status === 'Registration done'
                ? 'Just what came in today — you can add the balance to the same row later with the + button on the amount.'
                : 'Leave blank if you want to fill it in on the sheet.'}
            </small>
          </label>

          <label className="field">
            <span>Remarks</span>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </label>
        </div>

        <footer className="modal-foot">
          <span className="foot-note">The lead stays in your pipeline history.</span>
          <div>
            <button type="button" className="ghost-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Move to sheet
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}

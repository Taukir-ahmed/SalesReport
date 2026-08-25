import { useEffect, useRef, useState } from 'react'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/* Adds a second (or third…) instalment to a row that has already been paid
 * against — the sheet then shows them as "2,000 + 24,000". */
export default function PaymentModal({ row, column, parts, onCancel, onConfirm }) {
  const [amount, setAmount] = useState('')
  const ref = useRef(null)
  useEffect(() => ref.current?.focus(), [])

  const existing = parts.length ? parts : [Number(row.data?.[column.key]) || 0]
  const running = existing.reduce((s, n) => s + (Number(n) || 0), 0)
  const next = running + (Number(amount) || 0)

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        className="modal small"
        onSubmit={(e) => {
          e.preventDefault()
          if (!amount) return
          onConfirm(Number(amount))
        }}
      >
        <header className="modal-head">
          <div>
            <h2>Add another payment</h2>
            <p>
              {row.data?.customer ? <strong>{row.data.customer}</strong> : 'This row'} has paid{' '}
              {existing.map((p, i) => (
                <span key={i}>
                  {i > 0 && ' + '}₹{inr.format(Number(p) || 0)}
                </span>
              ))}{' '}
              so far.
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
          </label>
          <p className="running-total">
            New total: <strong>₹{inr.format(next)}</strong>
          </p>
        </div>

        <footer className="modal-foot">
          <span className="foot-note">Shown on the sheet as separate instalments.</span>
          <div>
            <button type="button" className="ghost-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={!amount}>
              Add payment
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}

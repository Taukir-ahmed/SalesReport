import { useState } from 'react'
import { FIELD_TYPES, TYPE_KEYS, usesOptions } from '../lib/fieldTypes'
import { slugKey } from '../lib/columns'

export default function ColumnSettings({ columns, onClose, onSave }) {
  const [draft, setDraft] = useState(() => columns.map((c) => ({ ...c, options: [...(c.options || [])] })))
  const [open, setOpen] = useState(columns[0]?.key ?? null)

  const patch = (key, changes) =>
    setDraft((d) => d.map((c) => (c.key === key ? { ...c, ...changes } : c)))

  const movecol = (idx, dir) =>
    setDraft((d) => {
      const next = [...d]
      const j = idx + dir
      if (j < 0 || j >= next.length) return d
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next.map((c, i) => ({ ...c, position: i }))
    })

  const addColumn = () => {
    const label = 'New column'
    const key = slugKey(label, draft.map((c) => c.key))
    const col = {
      key,
      label,
      type: 'text',
      options: [],
      width: 180,
      position: draft.length,
      visible: true,
      required: false,
      locked: false,
      __new: true,
    }
    setDraft((d) => [...d, col])
    setOpen(key)
  }

  const removeColumn = (key) => {
    const col = draft.find((c) => c.key === key)
    if (col?.locked) return
    if (!confirm(`Remove "${col.label}" from the sheet?\n\nAlready-saved values stay in the database, so you can add the column back later and they reappear.`))
      return
    setDraft((d) => d.filter((c) => c.key !== key).map((c, i) => ({ ...c, position: i })))
  }

  const save = () => {
    const taken = draft.filter((c) => !c.__new).map((c) => c.key)
    const cleaned = draft
      .filter((c) => c.label.trim())
      .map((c, i) => {
        const label = c.label.trim()
        // a column that has never been saved gets a database key based on its
        // final name, so the stored JSON stays readable
        const key = c.__new ? slugKey(label, taken) : c.key
        if (c.__new) taken.push(key)
        const { __new, ...rest } = c
        return { ...rest, key, label, position: i }
      })
    onSave(cleaned)
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <header className="modal-head">
          <div>
            <h2>Columns</h2>
            <p>
              Rename, reorder, hide, or add columns — and switch any field between a dropdown, a text
              box, a date, an amount and more. Nothing in the database has to change.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="modal-body">
          {draft.map((c, i) => {
            const isOpen = open === c.key
            return (
              <div key={c.key} className={`col-card ${isOpen ? 'open' : ''} ${c.visible ? '' : 'hidden-col'}`}>
                <div className="col-card-head">
                  <button className="col-title" onClick={() => setOpen(isOpen ? null : c.key)}>
                    <span className="chev">{isOpen ? '▾' : '▸'}</span>
                    <strong>{c.label || 'Untitled'}</strong>
                    <span className="col-type">{FIELD_TYPES[c.type]?.label ?? c.type}</span>
                    {!c.visible && <span className="col-flag">hidden</span>}
                    {c.locked && <span className="col-flag lock">drives the month</span>}
                  </button>
                  <div className="col-tools">
                    <button className="icon-btn sm" title="Move up" onClick={() => movecol(i, -1)}>
                      ↑
                    </button>
                    <button className="icon-btn sm" title="Move down" onClick={() => movecol(i, 1)}>
                      ↓
                    </button>
                    <button
                      className="icon-btn sm danger"
                      title={c.locked ? 'This column cannot be removed' : 'Remove column'}
                      disabled={c.locked}
                      onClick={() => removeColumn(c.key)}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="col-card-body">
                    <label className="field">
                      <span>Column name</span>
                      <input value={c.label} onChange={(e) => patch(c.key, { label: e.target.value })} />
                    </label>

                    <label className="field">
                      <span>Input type</span>
                      <select
                        value={c.type}
                        disabled={c.locked}
                        onChange={(e) => patch(c.key, { type: e.target.value })}
                      >
                        {TYPE_KEYS.map((t) => (
                          <option key={t} value={t}>
                            {FIELD_TYPES[t].label}
                          </option>
                        ))}
                      </select>
                      <small>{FIELD_TYPES[c.type]?.hint}</small>
                    </label>

                    {usesOptions(c.type) && (
                      <label className="field wide">
                        <span>Dropdown choices — one per line</span>
                        <textarea
                          rows={Math.max(4, (c.options || []).length + 1)}
                          value={(c.options || []).join('\n')}
                          onChange={(e) =>
                            patch(c.key, {
                              options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                            })
                          }
                          placeholder={'Full Stack Development\nData Science & AI'}
                        />
                        <small>
                          Change these any time — old rows keep whatever was already saved in them.
                        </small>
                      </label>
                    )}

                    <div className="field-row">
                      <label className="field small">
                        <span>Width (px)</span>
                        <input
                          type="number"
                          min="80"
                          value={c.width}
                          onChange={(e) => patch(c.key, { width: Number(e.target.value) || 160 })}
                        />
                      </label>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={c.visible}
                          onChange={(e) => patch(c.key, { visible: e.target.checked })}
                        />
                        <span>Show on the sheet</span>
                      </label>
                      <span className="key-chip" title="The name this field has in the database">
                        key: {c.__new ? slugKey(c.label || 'field', draft.filter((x) => !x.__new).map((x) => x.key)) : c.key}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <button className="add-col" onClick={addColumn}>
            + Add a column
          </button>
        </div>

        <footer className="modal-foot">
          <span className="foot-note">Applies to every month's sheet.</span>
          <div>
            <button className="ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-btn" onClick={save}>
              Save columns
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

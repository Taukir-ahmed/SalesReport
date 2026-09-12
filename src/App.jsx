import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TopBar from './components/TopBar'
import StatCards from './components/StatCards'
import SheetGrid from './components/SheetGrid'
import PipelineBoard from './components/PipelineBoard'
import ColumnSettings from './components/ColumnSettings'
import ConnectionScreen from './components/ConnectionScreen'
import ConvertModal from './components/ConvertModal'
import PaymentModal from './components/PaymentModal'
import Toast from './components/Toast'
import WorkspaceNav from './components/WorkspaceNav'
import SalesHelp from './components/SalesHelp'
import * as db from './lib/db'
import { isSupabaseConfigured } from './lib/supabaseClient'
import {
  DATE_KEY,
  blankRow,
  buildDayGroups,
  isBlankRow,
  monthKeyForRow,
  monthKeyOf,
  partsKey,
  sortColumns,
  toISODate,
} from './lib/columns'
import { CONVERTS_TO, converts } from './lib/status'
import { exportCsv, exportXlsx } from './lib/exporters'

export default function App() {
  const [view, setView] = useState(isSupabaseConfigured ? 'sheet' : 'help')
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [months, setMonths] = useState([])
  const [monthKey, setMonthKey] = useState(monthKeyOf(new Date()))
  const [loading, setLoading] = useState(true)
  const [fatal, setFatal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [grouped, setGrouped] = useState(true)
  const [hideEmptyDays, setHideEmptyDays] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [toast, setToast] = useState(null)
  const [focusCell, setFocusCell] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const [leads, setLeads] = useState([])
  const [showMoved, setShowMoved] = useState(false)
  const [bin, setBin] = useState([])
  const [binOpen, setBinOpen] = useState(false)
  const [pipelineError, setPipelineError] = useState(null)
  const [convert, setConvert] = useState(null)
  const [payment, setPayment] = useState(null)

  const say = useCallback((message, tone = 'ok') => setToast({ message, tone, at: Date.now() }), [])
  const complain = useCallback((e) => {
    console.error(e)
    setToast({ message: db.friendlyError(e), tone: 'error', at: Date.now() })
  }, [])

  /* ------------------------------ initial load ---------------------------- */
  /* One parallel burst instead of a chain of round-trips -- on a normal
     connection this is the difference between ~3s and well under one. */
  const loadedMonth = useRef(null)
  const loadedLeads = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isSupabaseConfigured) {
        setFatal({ kind: 'setup' })
        setLoading(false)
        return
      }
      setLoading(true)
      setFatal(null)
      const startMonth = monthKeyOf(new Date())

      const [cols, ms, rs, ls] = await Promise.allSettled([
        db.loadColumns(),
        db.loadMonths(),
        db.loadRows(startMonth),
        db.loadPipeline({ includeMoved: false }),
      ])
      if (cancelled) return

      /* the column list is the one thing we can't run without */
      if (cols.status === 'rejected') {
        console.error(cols.reason)
        setFatal({ kind: 'error', message: db.friendlyError(cols.reason) })
        setLoading(false)
        return
      }
      setColumns(cols.value)
      if (ms.status === 'fulfilled') setMonths(ms.value)
      if (rs.status === 'fulfilled') {
        setRows(rs.value)
        loadedMonth.current = startMonth
      }
      if (ls.status === 'fulfilled') {
        setLeads(ls.value)
        loadedLeads.current = true
        setPipelineError(null)
      } else {
        console.error(ls.reason)
        setPipelineError(db.friendlyError(ls.reason))
        loadedLeads.current = true
      }
      setLoading(false)

      /* clear out anything that has sat in the bin past its week, quietly and
         after the UI is already up */
      db.purgeExpired()
        .then(() => db.loadBin())
        .then((b) => !cancelled && setBin(b))
        .catch((e) => console.warn('bin cleanup skipped', e))
    })()
    return () => {
      cancelled = true
    }
  }, [attempt])

  /* ------------------------------- month load ----------------------------- */
  const refreshRows = useCallback(
    async (key = monthKey) => {
      try {
        setRows(await db.loadRows(key))
        loadedMonth.current = key
      } catch (e) {
        complain(e)
      }
    },
    [monthKey, complain]
  )

  useEffect(() => {
    if (loading || fatal) return
    if (loadedMonth.current === monthKey) return
    refreshRows(monthKey)
  }, [monthKey, loading, fatal, refreshRows])

  /* ------------------------------- pipeline ------------------------------- */
  const refreshLeads = useCallback(
    async (withMoved = showMoved) => {
      try {
        const data = await db.loadPipeline({ includeMoved: withMoved })
        setLeads(data)
        setPipelineError(null)
      } catch (e) {
        console.error(e)
        setPipelineError(db.friendlyError(e))
      }
    },
    [showMoved]
  )

  useEffect(() => {
    if (loading || fatal || loadedLeads.current) return
    refreshLeads()
  }, [loading, fatal, refreshLeads])

  /* --------------------------------- rows --------------------------------- */
  const addRow = useCallback(
    async (focusKey, dateISO) => {
      setBusy(true)
      try {
        const position = rows.length ? Math.max(...rows.map((r) => r.position ?? 0)) + 1 : 0
        const data = blankRow(columns, monthKey)
        if (dateISO) data[DATE_KEY] = dateISO
        const created = await db.insertRow({ month_key: monthKey, position, data })
        setRows((prev) => [...prev, created])
        setMonths((prev) => (prev.includes(monthKey) ? prev : [...prev, monthKey]))
        if (focusKey) setFocusCell({ rowId: created.id, key: focusKey })
        return created
      } catch (e) {
        complain(e)
      } finally {
        setBusy(false)
      }
    },
    [columns, monthKey, rows, complain]
  )

  const updateCells = useCallback(
    async (rowId, patchData) => {
      const row = rows.find((r) => r.id === rowId)
      if (!row) return
      const nextData = { ...row.data, ...patchData }
      const nextMonth = monthKeyForRow(nextData, row.month_key)
      const moved = nextMonth !== row.month_key

      setRows((prev) =>
        moved
          ? prev.filter((r) => r.id !== rowId)
          : prev.map((r) => (r.id === rowId ? { ...r, data: nextData } : r))
      )
      try {
        await db.updateRow(rowId, { data: nextData, month_key: nextMonth })
        if (moved) {
          setMonths((prev) => (prev.includes(nextMonth) ? prev : [...prev, nextMonth]))
          say(`Moved to ${nextMonth} — that month's sheet now has it.`)
        }
      } catch (e) {
        complain(e)
        refreshRows()
      }
    },
    [rows, say, complain, refreshRows]
  )

  const updateCell = useCallback(
    (rowId, key, value) => {
      const row = rows.find((r) => r.id === rowId)
      const patch = { [key]: value }
      /* typing straight into an amount replaces any instalment breakdown */
      if (row && Array.isArray(row.data?.[partsKey(key)]))
        patch[partsKey(key)] = value === '' ? [] : [value]
      return updateCells(rowId, patch)
    },
    [rows, updateCells]
  )

  const removeRow = useCallback(
    async (rowId) => {
      const snapshot = rows
      setRows((prev) => prev.filter((r) => r.id !== rowId))
      try {
        await db.deleteRow(rowId)
      } catch (e) {
        setRows(snapshot)
        complain(e)
      }
    },
    [rows, complain]
  )

  const applyPayment = useCallback(
    async (value) => {
      const { row, column } = payment
      const existing = Array.isArray(row.data?.[partsKey(column.key)])
        ? row.data[partsKey(column.key)].filter((n) => n !== '' && n != null)
        : [Number(row.data?.[column.key]) || 0].filter((n) => n)
      const parts = [...existing, Number(value)]
      const total = parts.reduce((s, n) => s + (Number(n) || 0), 0)
      setPayment(null)
      await updateCells(row.id, { [column.key]: total, [partsKey(column.key)]: parts })
      say(
        `Added ₹${Number(value).toLocaleString('en-IN')} — row now totals ₹${total.toLocaleString('en-IN')}`
      )
    },
    [payment, updateCells, say]
  )

  /* ---------------------------- pipeline actions --------------------------- */
  const addLead = useCallback(async () => {
    setBusy(true)
    try {
      const created = await db.insertLead({ added_on: toISODate(new Date()) })
      setLeads((prev) => [created, ...prev])
    } catch (e) {
      complain(e)
    } finally {
      setBusy(false)
    }
  }, [complain])

  const updateLead = useCallback(
    async (id, patch) => {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      try {
        await db.updateLead(id, patch)
      } catch (e) {
        complain(e)
        refreshLeads()
      }
    },
    [complain, refreshLeads]
  )

  const refreshBin = useCallback(async () => {
    try {
      setBin(await db.loadBin())
    } catch (e) {
      console.warn(e)
    }
  }, [])

  /* Delete drops the lead in the bin rather than destroying it. */
  const removeLead = useCallback(
    async (id) => {
      const snapshot = leads
      const lead = leads.find((l) => l.id === id)
      setLeads((prev) => prev.filter((l) => l.id !== id))
      try {
        const binned = await db.deleteLead(id)
        setBin((prev) => [binned ?? { ...lead, deleted_at: new Date().toISOString() }, ...prev])
        say(`${lead?.name || 'Lead'} moved to the bin — recoverable for ${db.BIN_DAYS} days.`)
      } catch (e) {
        setLeads(snapshot)
        complain(e)
      }
    },
    [leads, complain, say]
  )

  const restoreLead = useCallback(
    async (id) => {
      const lead = bin.find((l) => l.id === id)
      setBin((prev) => prev.filter((l) => l.id !== id))
      try {
        const back = await db.restoreLead(id)
        setLeads((prev) => [back, ...prev])
        say(`${lead?.name || 'Lead'} is back in the pipeline.`)
      } catch (e) {
        complain(e)
        refreshBin()
      }
    },
    [bin, complain, say, refreshBin]
  )

  const purgeLead = useCallback(
    async (id) => {
      const snapshot = bin
      setBin((prev) => prev.filter((l) => l.id !== id))
      try {
        await db.purgeLead(id)
      } catch (e) {
        setBin(snapshot)
        complain(e)
      }
    },
    [bin, complain]
  )

  /* Promise to pay / No sale / DNP stay in the pipeline. The other three
   * graduate the lead onto the sheet, once we know what was actually paid. */
  const onLeadStatus = useCallback(
    (lead, status) => {
      if (converts(status)) setConvert({ lead, status })
      else updateLead(lead.id, { status })
    },
    [updateLead]
  )

  const doConvert = useCallback(
    async ({ amount, remarks }) => {
      const { lead, status } = convert
      const saleStatus = CONVERTS_TO[status]
      const today = toISODate(new Date())
      const thisMonth = monthKeyOf(new Date())
      setConvert(null)
      try {
        const data = blankRow(columns, thisMonth)
        data[DATE_KEY] = today
        data.customer = lead.name || ''
        data.course = lead.course || ''
        data.status = saleStatus
        data.remarks = remarks || ''
        if (amount !== '' && !isNaN(amount)) {
          data.amount = Number(amount)
          data[partsKey('amount')] = [Number(amount)]
        }
        data.pipeline_id = lead.id

        const existing = await db.loadRows(thisMonth)
        const position = existing.length ? Math.max(...existing.map((r) => r.position ?? 0)) + 1 : 0
        const created = await db.insertRow({ month_key: thisMonth, position, data })

        await db.updateLead(lead.id, {
          status,
          moved_at: new Date().toISOString(),
          sale_id: created.id,
          remarks: remarks || lead.remarks || '',
        })

        setMonths((prev) => (prev.includes(thisMonth) ? prev : [...prev, thisMonth]))
        setMonthKey(thisMonth)
        setView('sheet')
        setRows((prev) => (thisMonth === monthKey ? [...prev, created] : prev))
        refreshLeads()
        if (thisMonth !== monthKey) refreshRows(thisMonth)
        say(`${lead.name || 'Lead'} moved to today's sheet as ${saleStatus}.`)
      } catch (e) {
        complain(e)
        refreshLeads()
      }
    },
    [convert, columns, monthKey, refreshLeads, refreshRows, say, complain]
  )

  /* -------------------------------- columns -------------------------------- */
  const persistColumns = useCallback(
    async (next) => {
      const before = columns
      setColumns(sortColumns(next))
      try {
        setColumns(await db.saveColumns(next))
      } catch (e) {
        setColumns(before)
        complain(e)
      }
    },
    [columns, complain]
  )

  const widthTimer = useRef(null)
  const resizeColumn = useCallback((key, width) => {
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, width } : c)))
    clearTimeout(widthTimer.current)
    widthTimer.current = setTimeout(() => {
      setColumns((cur) => {
        db.saveColumns(cur).catch((e) => console.warn('width save failed', e))
        return cur
      })
    }, 700)
  }, [])

  /* ------------------------------- derived --------------------------------- */
  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns])
  const courseOptions = useMemo(
    () => columns.find((c) => c.key === 'course')?.options ?? [],
    [columns]
  )

  const viewRows = useMemo(() => {
    let out = rows
    const q = search.trim().toLowerCase()
    if (q) {
      out = out.filter((r) =>
        visibleColumns.some((c) =>
          String(r.data?.[c.key] ?? '')
            .toLowerCase()
            .includes(q)
        )
      )
    }
    if (sort.key) {
      const col = columns.find((c) => c.key === sort.key)
      const numeric = col && (col.type === 'currency' || col.type === 'number')
      out = [...out].sort((a, b) => {
        const av = a.data?.[sort.key] ?? ''
        const bv = b.data?.[sort.key] ?? ''
        const cmp = numeric
          ? (Number(av) || 0) - (Number(bv) || 0)
          : String(av).localeCompare(String(bv), undefined, { numeric: true })
        return sort.dir === 'asc' ? cmp : -cmp
      })
    } else {
      out = [...out].sort((a, b) =>
        String(a.data?.[DATE_KEY] ?? '').localeCompare(String(b.data?.[DATE_KEY] ?? ''))
      )
    }
    return out
  }, [rows, search, sort, columns, visibleColumns])

  const realRows = useMemo(() => rows.filter((r) => !isBlankRow(r, columns)), [rows, columns])

  const stats = useMemo(() => {
    const moneyCol =
      columns.find((c) => c.type === 'currency') || columns.find((c) => c.type === 'number')
    const total = moneyCol
      ? realRows.reduce((s, r) => s + (Number(r.data?.[moneyCol.key]) || 0), 0)
      : 0
    const blankDays = buildDayGroups(realRows, monthKey).filter((g) => g.kind === 'nosale').length
    return {
      total,
      deals: realRows.length,
      avg: realRows.length ? total / realRows.length : 0,
      blankDays,
      hasMoney: !!moneyCol,
    }
  }, [realRows, columns, monthKey])

  const doExport = async (kind) => {
    const payload = {
      columns,
      rows: viewRows.filter((r) => !isBlankRow(r, columns)),
      monthKey,
      grouped,
      leads: leads.filter((l) => !l.moved_at),
      sheetTitle: 'Business development — daily sales',
    }
    try {
      if (kind === 'csv') exportCsv(payload)
      else await exportXlsx(payload)
      say(`Downloaded Sales-${monthKey}.${kind === 'csv' ? 'csv' : 'xlsx'}`)
    } catch (e) {
      console.error(e)
      say('Export failed: ' + (e.message || e), 'error')
    }
  }

  return (
    <div className="app">
      <WorkspaceNav
        view={view}
        onView={setView}
        count={leads.filter((l) => !l.moved_at).length}
        connected={isSupabaseConfigured && !fatal && !loading}
      />
      <div className="workspace">
        <TopBar
          ready={!fatal && !loading}
          view={view}
          monthKey={monthKey}
          months={months}
          onMonth={setMonthKey}
          search={search}
          onSearch={setSearch}
          onExport={doExport}
          onSettings={() => setSettingsOpen(true)}
          grouped={grouped}
          onGrouped={setGrouped}
        />

        <main className="main">
          <div hidden={view !== 'help'}>
            <SalesHelp
              leads={leads}
              available={!fatal && !loading && !pipelineError}
              onSaveNotes={async (id, remarks) => {
                await db.updateLead(id, { remarks })
                setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, remarks } : l)))
              }}
            />
          </div>
          {view === 'help' ? null : fatal ? (
            <ConnectionScreen
              kind={fatal.kind}
              message={fatal.message}
              onRetry={fatal.kind === 'error' ? () => setAttempt((n) => n + 1) : null}
            />
          ) : loading ? (
            <div className="boot">
              <div className="boot-card">
                <div className="spinner" />
                <p>Opening your workspace…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {view === 'sheet'
                      ? 'YOUR MONTH, AT A GLANCE'
                      : 'MAKE THE NEXT CONVERSATION COUNT'}
                  </span>
                  <h1>{view === 'sheet' ? 'Sales overview' : 'Your pipeline'}</h1>
                  <p>
                    {view === 'sheet'
                      ? 'Every conversation that became a win.'
                      : 'Keep track of the people you’re following up with.'}
                  </p>
                </div>
                {view === 'pipeline' && (
                  <button className="primary-btn" disabled={busy} onClick={() => addLead()}>
                    ＋ Add lead
                  </button>
                )}
              </div>
              {view === 'sheet' ? (
                <>
                  <StatCards stats={stats} />
                  <SheetGrid
                    columns={visibleColumns}
                    rows={viewRows}
                    monthKey={monthKey}
                    grouped={grouped}
                    hideEmptyDays={hideEmptyDays}
                    onHideEmptyDays={setHideEmptyDays}
                    sort={sort}
                    onSort={setSort}
                    onCell={updateCell}
                    onAddRow={addRow}
                    onDeleteRow={removeRow}
                    onResize={resizeColumn}
                    onAddPayment={(row, column) => setPayment({ row, column })}
                    focusCell={focusCell}
                    clearFocus={() => setFocusCell(null)}
                    busy={busy}
                    searching={!!search.trim()}
                  />
                </>
              ) : (
                <PipelineBoard
                  leads={leads}
                  bin={bin}
                  binOpen={binOpen}
                  onBinOpen={setBinOpen}
                  onRestore={restoreLead}
                  onPurge={purgeLead}
                  courseOptions={courseOptions}
                  onUpdate={updateLead}
                  onAdd={addLead}
                  onDelete={removeLead}
                  onStatus={onLeadStatus}
                  showMoved={showMoved}
                  onShowMoved={(v) => {
                    setShowMoved(v)
                    refreshLeads(v)
                  }}
                  busy={busy}
                  error={pipelineError}
                />
              )}
            </>
          )}
        </main>
      </div>

      {settingsOpen && (
        <ColumnSettings
          columns={columns}
          onClose={() => setSettingsOpen(false)}
          onSave={persistColumns}
        />
      )}

      {convert && (
        <ConvertModal
          lead={convert.lead}
          status={convert.status}
          onCancel={() => setConvert(null)}
          onConfirm={doConvert}
        />
      )}

      {payment && (
        <PaymentModal
          row={payment.row}
          column={payment.column}
          parts={payment.row.data?.[partsKey(payment.column.key)] ?? []}
          onCancel={() => setPayment(null)}
          onConfirm={applyPayment}
        />
      )}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  )
}

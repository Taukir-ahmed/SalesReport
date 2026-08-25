/* ---------------------------------------------------------------------------
 * FIELD TYPE REGISTRY
 * ---------------------------------------------------------------------------
 * This is the one place that decides how a column behaves.
 * A column stored in the DB only says: { key, label, type, options, width... }
 * Everything else -- what input shows up, how the value is displayed, whether
 * it gets summed in the totals row, how it is written into the Excel export --
 * is looked up here by `type`.
 *
 * So flipping "Course" from a dropdown to a plain text box is a one-click
 * change in Settings (it just rewrites `type`), and adding a brand new
 * behaviour (say a "rating" or "percentage" field) means adding one entry to
 * this object -- no other file needs to change.
 * ------------------------------------------------------------------------- */

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export const FIELD_TYPES = {
  text: {
    label: 'Text box',
    hint: 'Free typing. Good for names, remarks, anything.',
    input: 'text',
    align: 'left',
    aggregate: null,
    parse: (v) => (v ?? '').toString(),
    display: (v) => (v ?? '').toString(),
    excel: { numFmt: null },
  },
  select: {
    label: 'Dropdown',
    hint: 'Pick from a fixed list you control below.',
    input: 'select',
    align: 'left',
    aggregate: null,
    parse: (v) => (v ?? '').toString(),
    display: (v) => (v ?? '').toString(),
    excel: { numFmt: null },
  },
  number: {
    label: 'Number',
    hint: 'Plain number. Adds up in the totals row.',
    input: 'number',
    align: 'right',
    aggregate: 'sum',
    parse: (v) => (v === '' || v === null || v === undefined ? '' : Number(v)),
    display: (v) => (v === '' || v === null || v === undefined ? '' : inr.format(Number(v))),
    excel: { numFmt: '#,##0.##' },
  },
  currency: {
    label: 'Amount (₹)',
    hint: 'Money. Adds up in the totals row and exports as currency.',
    input: 'number',
    align: 'right',
    aggregate: 'sum',
    parse: (v) => (v === '' || v === null || v === undefined ? '' : Number(v)),
    display: (v) =>
      v === '' || v === null || v === undefined || isNaN(Number(v))
        ? ''
        : '₹' + inr.format(Number(v)),
    excel: { numFmt: '₹#,##0' },
  },
  date: {
    label: 'Date',
    hint: 'Date picker. The Date column also decides which month a sale lands in.',
    input: 'date',
    align: 'left',
    aggregate: null,
    parse: (v) => (v ?? '').toString(),
    display: (v) => {
      if (!v) return ''
      const d = new Date(v + 'T00:00:00')
      if (isNaN(d)) return v
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    },
    excel: { numFmt: 'dd-mmm-yyyy' },
  },
  status: {
    label: 'Status pill',
    hint: 'Dropdown, but shown as a coloured pill. Great for Paid / Pending.',
    input: 'select',
    align: 'left',
    aggregate: 'count',
    parse: (v) => (v ?? '').toString(),
    display: (v) => (v ?? '').toString(),
    excel: { numFmt: null },
  },
  checkbox: {
    label: 'Checkbox',
    hint: 'Yes / no tick. Totals row counts the ticks.',
    input: 'checkbox',
    align: 'center',
    aggregate: 'checked',
    parse: (v) => !!v,
    display: (v) => (v ? 'Yes' : 'No'),
    excel: { numFmt: null },
  },
}

export const TYPE_KEYS = Object.keys(FIELD_TYPES)
export const typeOf = (col) => FIELD_TYPES[col?.type] || FIELD_TYPES.text
export const usesOptions = (type) => type === 'select' || type === 'status'

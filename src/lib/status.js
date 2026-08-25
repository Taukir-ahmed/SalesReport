/* ---------------------------------------------------------------------------
 * STATUS VOCABULARY + COLOURS
 * ---------------------------------------------------------------------------
 * One place that decides what every status is called and what colour it gets,
 * on screen and inside the Excel file. Add a status here and it works in both.
 * ------------------------------------------------------------------------- */

export const SALE_STATUS = {
  COMPLETE: 'Sale complete',
  REGISTRATION: 'Registration done',
  HALF: 'Half payment',
  NONE: 'No sale',
}

export const SALE_STATUS_OPTIONS = [
  SALE_STATUS.COMPLETE,
  SALE_STATUS.REGISTRATION,
  SALE_STATUS.HALF,
  SALE_STATUS.NONE,
]

export const PIPELINE_STATUS = {
  SALE_DONE: 'Sale done',
  PROMISE: 'Promise to pay',
  HALF: 'Half payment done',
  REGISTRATION: 'Registration done',
  NONE: 'No sale',
  DNP: 'DNP',
}

export const PIPELINE_STATUS_OPTIONS = [
  PIPELINE_STATUS.SALE_DONE,
  PIPELINE_STATUS.PROMISE,
  PIPELINE_STATUS.HALF,
  PIPELINE_STATUS.REGISTRATION,
  PIPELINE_STATUS.NONE,
  PIPELINE_STATUS.DNP,
]

/* Which pipeline statuses graduate a lead onto the main sheet, and what they
 * become once they're there. Promise to pay, No sale and DNP stay put. */
export const CONVERTS_TO = {
  [PIPELINE_STATUS.SALE_DONE]: SALE_STATUS.COMPLETE,
  [PIPELINE_STATUS.HALF]: SALE_STATUS.HALF,
  [PIPELINE_STATUS.REGISTRATION]: SALE_STATUS.REGISTRATION,
}

export const converts = (status) => !!CONVERTS_TO[status]

/* text/bg/row are CSS colours for the app.
 * fill/font/day/rowFill are the same colours as Excel ARGB strings. */
const TONES = {
  green:  { text: '#12703a', bg: '#dcf5e6', row: '#f2fbf6', fill: 'FFDDF5E6', font: 'FF12703A', day: 'FFC8EDD6', rowFill: 'FFF2FBF6' },
  orange: { text: '#a1560a', bg: '#fdead0', row: '#fff8ef', fill: 'FFFDEAD0', font: 'FFA1560A', day: 'FFFBDCAF', rowFill: 'FFFFF8EF' },
  purple: { text: '#5b3fb5', bg: '#e9e3ff', row: '#f7f4ff', fill: 'FFE9E3FF', font: 'FF5B3FB5', day: 'FFDCD2FF', rowFill: 'FFF7F4FF' },
  red:    { text: '#b3261e', bg: '#fbdedb', row: '#fef4f3', fill: 'FFFBDEDB', font: 'FFB3261E', day: 'FFF7C5C0', rowFill: 'FFFEF4F3' },
  gold:   { text: '#8a6100', bg: '#fdf0c4', row: '#fffbea', fill: 'FFFDF0C4', font: 'FF8A6100', day: 'FFFAE79A', rowFill: 'FFFFFBEA' },
  grey:   { text: '#5a6b84', bg: '#e8ecf2', row: '#f6f8fb', fill: 'FFE8ECF2', font: 'FF5A6B84', day: 'FFDCE2EA', rowFill: 'FFF6F8FB' },
  blue:   { text: '#2e5fa3', bg: '#e0ecfb', row: '#f4f9ff', fill: 'FFE0ECFB', font: 'FF2E5FA3', day: 'FFC9DFF7', rowFill: 'FFF4F9FF' },
}

const BY_STATUS = {
  [SALE_STATUS.COMPLETE.toLowerCase()]: 'green',
  [SALE_STATUS.REGISTRATION.toLowerCase()]: 'orange',
  [SALE_STATUS.HALF.toLowerCase()]: 'purple',
  [SALE_STATUS.NONE.toLowerCase()]: 'red',
  [PIPELINE_STATUS.SALE_DONE.toLowerCase()]: 'green',
  [PIPELINE_STATUS.PROMISE.toLowerCase()]: 'gold',
  [PIPELINE_STATUS.HALF.toLowerCase()]: 'purple',
  [PIPELINE_STATUS.DNP.toLowerCase()]: 'grey',
  // a few things people type by hand
  paid: 'green',
  pending: 'gold',
  partial: 'purple',
  cancelled: 'red',
  refunded: 'red',
}

export function toneOf(status) {
  return BY_STATUS[String(status || '').trim().toLowerCase()] || 'blue'
}

export function styleOf(status) {
  return TONES[toneOf(status)]
}

export const tone = (name) => TONES[name] ?? TONES.blue

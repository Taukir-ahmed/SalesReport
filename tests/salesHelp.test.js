import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGuidance,
  courseConnection,
  inferGoal,
  objectionHelp,
  objections,
} from '../src/lib/salesHelp.js'

const client = {
  role: 'Accountant',
  purpose: 'I want a secondary income',
  interest: 'Cooking',
  goal: 'Discover their goal',
}

test('matches client work and ranks the stated goal without discarding their hobby', () => {
  const result = buildGuidance(client)
  assert.equal(result.cards[0].id, 'income')
  assert.match(result.cards[0].example, /payslip/)
  assert.match(result.cards.find((c) => c.id === 'personal').example, /recipe/)
  assert.match(result.discovery, /I want a secondary income/)
})

test('an explicitly selected priority overrides a keyword in workshop notes', () => {
  assert.equal(buildGuidance({ ...client, goal: 'Explore a hobby' }).cards[0].id, 'personal')
})

test('negated income intent stays a discovery question', () => {
  assert.equal(inferGoal('General learning and understanding AI'), 'Discover their goal')
  assert.equal(inferGoal('General learning and career growth'), 'Career growth')
  assert.equal(inferGoal('I do not want a secondary income'), 'Discover their goal')
  assert.equal(inferGoal('extra income nahi chahiye'), 'Discover their goal')
})

test('unknown or empty context has usable questions and does not invent a profession', () => {
  const result = buildGuidance({ role: '', purpose: '', interest: '', goal: 'Discover their goal' })
  assert.equal(result.matched, false)
  assert.equal(result.cards.length, 3)
  assert.match(result.discovery, /workshop/)
  assert.ok(result.cards.every((c) => c.line && c.question && c.example && c.next))
})

test('project examples link to relevant course topics', () => {
  assert.match(courseConnection(client, 'personal').line, /recipe/)
  assert.match(courseConnection(client, 'income').line, /payslip/)
  assert.match(courseConnection({ role: 'Teacher' }, 'expertise').line, /students/)
})

test('all hesitations have guidance, including an unambiguous end to a declined call', () => {
  for (const objection of objections) assert.equal(objectionHelp[objection].length, 2)
  assert.match(objectionHelp['Not interested'][1], /End the pitch/)
  assert.match(objectionHelp['Office tools restricted'][1], /instead of suggesting a workaround/)
})

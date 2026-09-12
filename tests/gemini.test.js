import { test } from 'node:test'
import assert from 'node:assert/strict'
import { localCallFlow } from '../src/lib/callFlow.js'
import {
  buildPrompt,
  generateFlow,
  parseFlow,
  readSettings,
  saveSettings,
  SETTINGS_KEY,
} from '../src/lib/gemini.js'

const context = {
  name: 'PRIVATE_NAME',
  role: 'Software engineer',
  knowledge: 'Python, built a RAG project',
  purpose: 'General learning',
  situation: 'Wants deeper architecture discussions',
  notes: 'PRIVATE_NOTES',
}
const steps = localCallFlow(context)
const response = {
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ steps }) }] } }],
}

test('engineer flow offers 10 domain-specific cues without a price pitch', () => {
  assert.equal(steps.length, 10)
  assert.match(steps[2].expand, /RAG and MCP/)
  assert.match(steps[4].expand, /design discussion/)
  assert.doesNotMatch(steps.map((s) => s.line).join(' '), /₹|35,000|2,200|side income/)
  assert.equal(localCallFlow({}).length, 10)
})
test('keys can be saved, replaced, and read without modifying unrelated storage', () => {
  const data = new Map([['other', 'keep']])
  const storage = { getItem: (k) => data.get(k), setItem: (k, v) => data.set(k, v) }
  saveSettings(storage, { key: 'test-key-1', model: 'gemini-2.5-flash' })
  saveSettings(storage, { key: 'test-key-2', model: 'gemini-2.5-flash-lite' })
  assert.equal(readSettings(storage).key, 'test-key-2')
  assert.equal(data.get('other'), 'keep')
  data.delete(SETTINGS_KEY)
  assert.equal(readSettings(storage).key, '')
  assert.equal(readSettings({ getItem: () => '{bad' }).key, '')
  assert.throws(() => saveSettings(storage, { key: 'abc', model: 'https://other.example' }))
})
test('prompt excludes client identity and notes while covering hard scenarios', () => {
  const prompt = buildPrompt(context, 'I can self-study', 'Trainer profile to verify')
  assert.doesNotMatch(prompt, /PRIVATE_NAME|PRIVATE_NOTES/)
  assert.match(prompt, /I can self-study/)
  assert.match(prompt, /General learning/)
  assert.match(prompt, /Wants deeper architecture discussions/)
  assert.match(prompt, /Never infer a personality/)
  assert.match(prompt, /All output fields must be in natural English only/)
  assert.match(prompt, /never create|Never tell/)
})
test('validates complete structured output and refuses partial or malformed flows', () => {
  assert.equal(parseFlow(response).length, 10)
  assert.throws(() => parseFlow({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), /incomplete/)
  assert.throws(
    () =>
      parseFlow({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] }),
    /10 complete/
  )
  const bad = structuredClone(response)
  bad.candidates[0].content.parts[0].text = JSON.stringify({ steps: steps.slice(0, 9) })
  assert.throws(() => parseFlow(bad), /10 complete/)
  const unsupported = structuredClone(response)
  const invalidSteps = structuredClone(steps)
  invalidSteps[9].line = 'Our course projects and mentorship are the right fit for you.'
  unsupported.candidates[0].content.parts[0].text = JSON.stringify({ steps: invalidSteps })
  assert.throws(() => parseFlow(unsupported), /unsupported course claim/)
})
test('request authenticates only to Google and returns validated cues', async () => {
  const actual = await generateFlow({
    key: 'test-key',
    model: 'gemini-2.5-flash',
    context,
    fetcher: async (url, init) => {
      assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'))
      assert.ok(!url.includes('test-key'))
      assert.equal(init.headers['x-goog-api-key'], 'test-key')
      const body = JSON.parse(init.body)
      assert.match(body.systemInstruction.parts[0].text, /Use English only in every output field/)
      assert.equal(body.generationConfig.responseSchema.properties.steps.maxItems, 10)
      return { ok: true, json: async () => response }
    },
  })
  assert.equal(actual.length, 10)
})
test('quota, invalid credentials and cancellation have usable failure handling', async () => {
  for (const status of [400, 401, 403, 404, 429, 503]) {
    await assert.rejects(
      generateFlow({
        key: 'test-key',
        model: 'gemini-2.5-flash',
        context,
        fetcher: async () => ({ ok: false, status }),
      }),
      (e) => e.message.length > 20 && !e.message.includes('test-key')
    )
  }
  await assert.rejects(
    generateFlow({
      key: 'test-key',
      model: 'gemini-2.5-flash',
      context,
      fetcher: async () => {
        throw new DOMException('Cancelled', 'AbortError')
      },
    }),
    (e) => e.name === 'AbortError'
  )
})

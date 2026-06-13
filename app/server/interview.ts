import { Hono } from 'hono'
import Anthropic from '@anthropic-ai/sdk'
import { db } from './db'

// The 10 Modified Oswestry sections, scored 0–5 each (total = sum/50 × 100).
const ITEMS = [
  'pain_intensity', 'personal_care', 'lifting', 'walking', 'sitting',
  'standing', 'sleeping', 'social_life', 'traveling', 'employment_homemaking',
] as const

const SYSTEM = `You are running a QUICK daily check-in using the Modified Oswestry (MODQ). Keep it fast, warm, and effortless for someone who may be in pain.

Ask at most 3–4 very short questions, GROUPING related areas into one question (e.g. "Sitting, standing, and walking — any trouble today?", "Sleep, work, and social life — all as normal?"). One short sentence per turn. No preamble, no explanations, don't restate their answers at length.

Cover all 10 sections (pain intensity, personal care, lifting, walking, sitting, standing, sleeping, social life, traveling, employment/homemaking), inferring sensibly from grouped answers. Map each to its validated 0–5 scale (0 = no limitation, 5 = maximal limitation). Don't invent or drift from the instrument. No diagnosis, interpretation, or medical advice — you're administering a questionnaire.

As soon as you can reasonably score all 10 sections, call submit_modq_score with all 10 values. Lean toward finishing quickly — 3–4 exchanges is ideal. Until then, reply with exactly one short question.`

const scoreTool = {
  name: 'submit_modq_score',
  description: 'Record the completed MODQ once all 10 sections can be scored from the conversation.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(
      ITEMS.map((i) => [i, { type: 'integer', enum: [0, 1, 2, 3, 4, 5], description: `${i} severity 0–5` }]),
    ) as Record<string, unknown>,
    required: [...ITEMS],
  },
} as Anthropic.Tool

export const interview = new Hono()

interview.post('/api/interview', async (c) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return c.json({ error: 'ANTHROPIC_API_KEY not set — the interviewer needs it to run.' }, 500)
  }
  const body = await c.req.json<{ messages?: Anthropic.MessageParam[] }>()
  const messages: Anthropic.MessageParam[] = body.messages?.length
    ? body.messages
    : [{ role: 'user', content: "Hi, I'd like to do the check-in." }]

  const client = new Anthropic()
  const resp = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: SYSTEM,
    tools: [scoreTool],
    messages,
  })

  if (resp.stop_reason === 'tool_use') {
    const tu = resp.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_modq_score',
    )
    if (tu) {
      const input = tu.input as Record<string, number>
      const sum = ITEMS.reduce((s, i) => s + (input[i] ?? 0), 0)
      const total = Math.round((sum / 50) * 100)
      const date = new Date().toISOString().slice(0, 10)
      const id = `s-interview-${Date.now()}`
      db.transaction(() => {
        db.prepare('INSERT OR REPLACE INTO surveys (id,date,modq_total,source) VALUES (?,?,?,?)')
          .run(id, date, total, 'interview')
        const ins = db.prepare('INSERT OR REPLACE INTO survey_items (survey_id,item,value) VALUES (?,?,?)')
        for (const i of ITEMS) ins.run(id, i, input[i] ?? 0)
      })()
      return c.json({ done: true, survey: { id, date, modq_total: total }, items: input })
    }
  }

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  // Return the raw assistant content so the client appends it verbatim for the next turn.
  return c.json({ done: false, message: text, assistant: resp.content })
})

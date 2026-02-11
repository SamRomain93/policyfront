const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const SB_URL = 'https://api.supabase.com/v1/projects/girenjxxtxakvtgvgwtv'
const SB_TOKEN = 'sbp_2ac26e40d971ebc913f80ab4402cd3df44f9441e'

async function main() {
  if (!ANTHROPIC_KEY) { console.log('ERROR: No API key'); process.exit(1) }

  const res = await fetch(`${SB_URL}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `SELECT m.id, m.title, m.excerpt, t.name as topic_name 
              FROM mentions m JOIN topics t ON m.topic_id = t.id 
              WHERE m.sentiment IS NULL LIMIT 30`
    }),
  })
  const mentions = await res.json()
  console.log(`${mentions.length} unscored mentions`)

  let scored = 0
  for (const m of mentions) {
    const text = `${m.title || ''} ${m.excerpt || ''}`.substring(0, 600)
    if (text.length < 20) continue

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 3,
          temperature: 0,
          messages: [{ role: 'user', content: `What is the sentiment of this article about "${m.topic_name}"? Answer with ONLY one word: positive, negative, or neutral. No other text.\n\n${text}` }],
        }),
      })
      if (!r.ok) { console.log(`  ${m.id.substring(0,8)}: API ${r.status}`); continue }
      const data = await r.json()
      const raw = (data.content?.[0]?.text || '').trim().toLowerCase().replace(/[^a-z]/g, '')
      const sentiment = ['positive','negative','neutral'].includes(raw) ? raw : null
      
      if (sentiment) {
        await fetch(`${SB_URL}/database/query`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SB_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `UPDATE mentions SET sentiment = '${sentiment}' WHERE id = '${m.id}'` }),
        })
        scored++
        console.log(`  ${m.id.substring(0,8)} → ${sentiment}`)
      } else {
        console.log(`  ${m.id.substring(0,8)}: got "${raw}" - skipped`)
      }
    } catch (e) { console.log(`  ${m.id.substring(0,8)}: error ${e.message}`) }
    await new Promise(r => setTimeout(r, 300))
  }
  console.log(`\nDone: ${scored}/${mentions.length} scored`)
}
main()

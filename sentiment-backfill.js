// One-time sentiment backfill for existing unscored mentions
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const SB_URL = 'https://api.supabase.com/v1/projects/girenjxxtxakvtgvgwtv'
const SB_TOKEN = 'sbp_2ac26e40d971ebc913f80ab4402cd3df44f9441e'

async function main() {
  if (!ANTHROPIC_KEY) {
    console.log('ERROR: ANTHROPIC_API_KEY not set')
    process.exit(1)
  }
  console.log(`Using API key: ${ANTHROPIC_KEY.substring(0, 10)}...`)
  
  // Get unscored mentions
  const res = await fetch(`${SB_URL}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `SELECT m.id, m.title, m.excerpt, t.name as topic_name 
              FROM mentions m 
              JOIN topics t ON m.topic_id = t.id 
              WHERE m.sentiment IS NULL 
              LIMIT 20`
    }),
  })
  
  const mentions = await res.json()
  console.log(`Found ${mentions.length} unscored mentions`)
  
  for (const m of mentions) {
    const text = `${m.title || ''}\n${m.excerpt || ''}`.substring(0, 600)
    console.log(`Processing ${m.id.substring(0, 8)}: ${text.length} chars`)
    if (text.length < 30) {
      console.log(`  Skipping (too short)`)
      continue
    }
    
    try {
      console.log(`  Calling Anthropic API...`)
      const sentRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 20,
          messages: [{
            role: 'user',
            content: `Classify the sentiment of this article toward "${m.topic_name}" as exactly one word: positive, negative, or neutral.\n\n${text}`,
          }],
        }),
      })
      
      console.log(`  Response status: ${sentRes.status}`)
      if (sentRes.ok) {
        const data = await sentRes.json()
        const answer = (data.content?.[0]?.text || '').trim().toLowerCase()
        const sentiment = ['positive', 'negative', 'neutral'].includes(answer) ? answer : null
        
        if (sentiment) {
          await fetch(`${SB_URL}/database/query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SB_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `UPDATE mentions SET sentiment = '${sentiment}' WHERE id = '${m.id}'`
            }),
          })
          console.log(`  ✓ ${m.id.substring(0, 8)} → ${sentiment}`)
        }
      }
    } catch (err) {
      console.log(`  ✗ ${m.id.substring(0, 8)} failed:`, err)
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500))
  }
  
  console.log('Done!')
}

main()

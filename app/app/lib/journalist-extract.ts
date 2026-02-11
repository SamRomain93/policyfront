// Journalist byline and contact extraction from article HTML/metadata
// Uses Firecrawl scraped content + best-effort contact discovery

// Common byline patterns in news articles
const BYLINE_PATTERNS = [
  /(?:By|BY|by)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
  /class="(?:byline|author|writer)[^"]*"[^>]*>([^<]+)</i,
  /"author"[^}]*"name"\s*:\s*"([^"]+)"/,
  /name="author"\s+content="([^"]+)"/,
  /property="article:author"\s+content="([^"]+)"/,
  /rel="author"[^>]*>([^<]+)</,
]

// Extract email patterns from article text
const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g

// Extract Twitter/X handles
const TWITTER_PATTERN = /(?:@|twitter\.com\/|x\.com\/)([a-zA-Z0-9_]{1,15})/gi

export type ExtractedJournalist = {
  name: string
  outlet: string | null
  email: string | null
  phone: string | null
  twitter: string | null
  linkedin: string | null
  website: string | null
}

export function extractByline(html: string, text: string): string | null {
  // Try structured data first (most reliable)
  const jsonLdMatch = html.match(/"@type"\s*:\s*"Person"[^}]*"name"\s*:\s*"([^"]+)"/)
  if (jsonLdMatch) return cleanName(jsonLdMatch[1])

  // Try meta tags
  const metaMatch = html.match(/name="author"\s+content="([^"]+)"/) ||
                    html.match(/property="article:author"\s+content="([^"]+)"/)
  if (metaMatch) return cleanName(metaMatch[1])

  // Try common HTML patterns
  for (const pattern of BYLINE_PATTERNS) {
    const match = html.match(pattern) || text.match(pattern)
    if (match) {
      const name = cleanName(match[1])
      if (isValidName(name)) return name
    }
  }

  // Try first line "By Name" pattern in plain text
  const firstLines = text.split('\n').slice(0, 10).join(' ')
  const byMatch = firstLines.match(/(?:^|\n)\s*[Bb]y\s+([A-Z][a-z]+(?:\s+[A-Z]\.?\s+)?[A-Z][a-z]+)/)
  if (byMatch) return cleanName(byMatch[1])

  return null
}

export function extractContactInfo(html: string, text: string, authorName: string | null): {
  email: string | null
  twitter: string | null
  phone: string | null
} {
  let email: string | null = null
  let twitter: string | null = null
  let phone: string | null = null

  // Look for email in author bio area or near byline
  const emailMatches = text.match(EMAIL_PATTERN)
  if (emailMatches) {
    // Prefer emails that look like reporter emails, not generic
    const reporterEmail = emailMatches.find(e =>
      !e.includes('info@') && !e.includes('tips@') && !e.includes('editor@') &&
      !e.includes('contact@') && !e.includes('press@') && !e.includes('news@') &&
      !e.includes('support@') && !e.includes('noreply@') && !e.includes('subscribe@')
    )
    email = reporterEmail || null
  }

  // Look for Twitter/X handle near the author name
  const twitterMatches: string[] = []
  let tMatch: RegExpExecArray | null
  const twitterRegex = new RegExp(TWITTER_PATTERN.source, 'gi')
  while ((tMatch = twitterRegex.exec(text)) !== null) {
    const handle = tMatch[1].toLowerCase()
    // Skip common non-personal handles
    if (!['share', 'intent', 'home', 'search', 'login', 'signup'].includes(handle)) {
      twitterMatches.push(handle)
    }
  }

  // If author name is known, try to match a handle that resembles their name
  if (authorName && twitterMatches.length > 0) {
    const nameParts = authorName.toLowerCase().split(/\s+/)
    const nameHandle = twitterMatches.find(h =>
      nameParts.some(part => h.includes(part))
    )
    twitter = nameHandle ? `@${nameHandle}` : (twitterMatches[0] ? `@${twitterMatches[0]}` : null)
  } else if (twitterMatches.length > 0) {
    twitter = `@${twitterMatches[0]}`
  }

  // Look for phone numbers near author info
  const phoneMatch = text.match(/(?:tel|phone|call|reach)[:\s]*(?:\+?1[-.]?)?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/i)
  if (phoneMatch) {
    const digits = phoneMatch[0].replace(/\D/g, '')
    if (digits.length >= 10) {
      phone = digits.slice(-10).replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
    }
  }

  return { email, twitter, phone }
}

// Try to find LinkedIn profile URL
export function extractLinkedIn(html: string, authorName: string | null): string | null {
  const linkedinMatch = html.match(/href="(https?:\/\/(?:www\.)?linkedin\.com\/in\/[^"]+)"/i)
  if (linkedinMatch) return linkedinMatch[1]

  // If we have the author name, we can construct a search URL (not an actual profile)
  // Don't return constructed URLs - only return real links found in the page
  if (authorName) {
    // Check for linkedin mentions in text
    const textMatch = html.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i)
    if (textMatch) return `https://linkedin.com/in/${textMatch[1]}`
  }

  return null
}

export function extractJournalist(
  html: string,
  text: string,
  outlet: string | null,
  metadata?: Record<string, unknown>
): ExtractedJournalist | null {
  // Try metadata.author first (Firecrawl provides this reliably)
  let name: string | null = null
  if (metadata?.author && typeof metadata.author === 'string') {
    const cleaned = cleanName(metadata.author)
    if (isValidName(cleaned)) name = cleaned
  }
  if (!name) name = extractByline(html, text)
  if (!name) return null

  const contacts = extractContactInfo(html, text, name)
  const linkedin = extractLinkedIn(html, name)

  return {
    name,
    outlet,
    email: contacts.email,
    phone: contacts.phone,
    twitter: contacts.twitter,
    linkedin,
    website: null,
  }
}

function cleanName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/^(By|by|BY)\s+/i, '')
    .replace(/[,|].*$/, '') // Remove titles after comma/pipe
    .replace(/\s+(Reporter|Editor|Correspondent|Writer|Staff|AP|AFP|Reuters).*$/i, '')
    .trim()
}

function isValidName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 60) return false
  // Must have at least two words
  if (name.split(/\s+/).length < 2) return false
  // Must start with uppercase
  if (!/^[A-Z]/.test(name)) return false
  // No weird characters
  if (/[0-9@#$%]/.test(name)) return false
  // Skip generic placeholders
  const lower = name.toLowerCase()
  if (['guest author', 'staff writer', 'staff reporter', 'editorial board',
       'news desk', 'associated press', 'ap news', 'reuters', 'admin',
       'contributor', 'guest contributor', 'special to'].some(g => lower.includes(g))) return false
  return true
}

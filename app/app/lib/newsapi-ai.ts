// NewsAPI.ai client for PolicyFront
// Docs: https://newsapi.ai/documentation
// Free tier: 2,000 tokens/month (1 token = 1 search, up to 100 articles)

const BASE_URL = 'https://newsapi.ai/api/v1'

export type NewsArticle = {
  uri: string
  url: string
  title: string
  body: string
  date: string
  dateTimePub: string
  source: {
    uri: string
    title: string
  }
  authors: Array<{
    uri: string    // often contains email (e.g. "john_doe@outlet.com")
    name: string
    type: string
    isAgency: boolean
  }>
  sentiment: number | null  // -1 to 1
  isDuplicate: boolean
  image: string | null
  eventUri: string | null  // groups related articles
  lang: string
}

export type SearchResult = {
  articles: NewsArticle[]
  totalResults: number
  pages: number
}

// Convert numeric sentiment (-1 to 1) to our string categories
export function sentimentLabel(score: number | null): 'positive' | 'negative' | 'neutral' | null {
  if (score === null || score === undefined) return null
  if (score > 0.15) return 'positive'
  if (score < -0.15) return 'negative'
  return 'neutral'
}

// Extract journalist info from NewsAPI.ai author data
export function extractAuthorInfo(authors: NewsArticle['authors']): {
  name: string | null
  email: string | null
} {
  // Filter out agencies and generic authors
  const realAuthors = authors.filter(a => 
    !a.isAgency && 
    a.name && 
    a.name.length > 2 &&
    !['reuters', 'ap', 'afp', 'associated press', 'staff', 'admin', 'editor', 'guest'].some(
      g => a.name.toLowerCase().includes(g)
    ) &&
    a.name.split(/\s+/).length >= 2  // must be a real name with first + last
  )

  if (realAuthors.length === 0) return { name: null, email: null }

  const author = realAuthors[0]
  const email = author.uri && author.uri.includes('@') ? author.uri.replace(/_/g, '.') : null

  return {
    name: author.name,
    email,
  }
}

// Search for articles matching a topic
export async function searchArticles(params: {
  keyword: string
  lang?: string
  country?: string
  dateStart?: string  // YYYY-MM-DD
  dateEnd?: string
  count?: number
  sortBy?: 'date' | 'rel' | 'socialScore'
  apiKey: string
}): Promise<SearchResult> {
  const body: Record<string, unknown> = {
    keyword: params.keyword,
    lang: params.lang || 'eng',
    articlesCount: params.count || 20,
    articlesSortBy: params.sortBy || 'date',
    includeArticleAuthors: true,
    includeArticleSocialScore: false,
    apiKey: params.apiKey,
  }

  if (params.dateStart) body.dateStart = params.dateStart
  if (params.dateEnd) body.dateEnd = params.dateEnd

  // Only get articles from the last 30 days by default
  if (!params.dateStart) {
    const d = new Date()
    d.setDate(d.getDate() - 7)  // Last 7 days for freshness
    body.dateStart = d.toISOString().split('T')[0]
  }

  try {
    const res = await fetch(`${BASE_URL}/article/getArticles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`NewsAPI.ai error: ${res.status}`)
    }

    const data = await res.json()
    const articles = data.articles?.results || []
    
    return {
      articles,
      totalResults: data.articles?.totalResults || 0,
      pages: data.articles?.pages || 0,
    }
  } catch (err) {
    console.error('NewsAPI.ai search failed:', err)
    return { articles: [], totalResults: 0, pages: 0 }
  }
}

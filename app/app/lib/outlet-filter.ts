// Domains that are NOT news outlets - filter these from mentions
// Government/Legislature sites, bill trackers, social media, etc.

const BLOCKED_PATTERNS = [
  // Government & Legislature
  /\.gov$/,
  /legislature\./,
  /legis\./,
  /leg\.state\./,
  /mgaleg\./,

  // Bill tracking tools (not news)
  /legiscan\.com/,
  /billtrack50\.com/,
  /fastdemocracy\.com/,
  /pluralpolicy\.com/,
  /citizenportal\./,
  /openstates\.org/,
  /trackbill\.com/,

  // Social media
  /facebook\.com/,
  /twitter\.com/,
  /x\.com/,
  /instagram\.com/,
  /tiktok\.com/,
  /linkedin\.com/,
  /reddit\.com/,
  /youtube\.com/,
  /spotify\.com/,

  // Meeting minutes / internal docs
  /eminutes\.com/,
  /blob\.core\.windows\.net/,

  // Generic non-news
  /wikipedia\.org/,
  /amazon\.com/,
  /google\.com/,
]

export function isNewsOutlet(domain: string): boolean {
  if (!domain) return false
  const lower = domain.toLowerCase()
  return !BLOCKED_PATTERNS.some(pattern => pattern.test(lower))
}

// Classify outlet type for display
export function outletType(domain: string): 'news' | 'trade' | 'advocacy' | 'other' {
  const lower = domain.toLowerCase()

  // Major news outlets
  if (/politico|reuters|bloomberg|nytimes|washingtonpost|wsj|apnews|cnn|fox|abc|nbc|cbs|npr|pbs/.test(lower)) {
    return 'news'
  }

  // Trade/industry publications
  if (/utilitydive|energynews|seia\.org|solarpowerworldonline|pv-magazine|greentechmedia|canarymedia/.test(lower)) {
    return 'trade'
  }

  // Advocacy/nonprofit
  if (/\.org$/.test(lower) || /edf\.org|sierraclub|nrdc|advancedenergy/.test(lower)) {
    return 'advocacy'
  }

  return 'news' // default to news for unknown domains
}

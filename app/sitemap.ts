import type { MetadataRoute } from 'next'
import { PARTNERS } from '@/config/bookmakers'
import { isFeatured } from '@/config/leagues'
import { SITE } from '@/config/site'
import { getLeagues, getMatchesByDate, settle } from '@/lib/data'
import { addDays, todayYmd } from '@/lib/format'
import { leagueHref, matchHref } from '@/lib/links'
import { TAGS } from '@/lib/tags'
import type { LeagueInfo, Match } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url
  const now = new Date()
  const today = todayYmd()
  const days = Array.from({ length: SITE.daysAhead + 2 }, (_, i) => addDays(today, i - 1))
  const urls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    ...['/tags', '/leagues', '/bookmakers'].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...['/about', '/responsible-gaming'].map((p) => ({ url: `${base}${p}`, changeFrequency: 'monthly' as const, priority: 0.3 })),
    ...TAGS.map((t) => ({ url: `${base}/tag/${t.slug}`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.8 })),
    ...PARTNERS.map((p) => ({ url: `${base}/bookmakers/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...days.filter((d) => d !== today).map((d) => ({ url: `${base}/matches/${d}`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.6 })),
  ]
  const lists = await Promise.all(days.map((d) => settle(getMatchesByDate(d, { priority: 'low' }), [] as Match[])))
  for (const m of lists.flat()) {
    if (m.status === 'cancelled') continue
    urls.push({
      url: `${base}${matchHref(m)}`,
      lastModified: now,
      changeFrequency: m.status === 'finished' ? 'weekly' : 'hourly',
      priority: isFeatured(m.league) ? 0.7 : 0.4,
    })
  }
  const leagues = await settle(getLeagues({ priority: 'low' }), [] as LeagueInfo[])
  for (const l of leagues.filter((x) => isFeatured(x))) {
    urls.push({ url: `${base}${leagueHref(l)}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 })
  }
  return urls
}

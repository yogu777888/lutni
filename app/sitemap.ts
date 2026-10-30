import type { MetadataRoute } from 'next'
import { PARTNERS, indexable } from '@/config/bookmakers'
import { SITE } from '@/config/site'
import { getLeagues, getMatchesByDate, peekOddsSnap, settle, tagsFor } from '@/lib/data'
import { goalsPicks, linePicks } from '@/lib/day-summary'
import { addDays, todayYmd } from '@/lib/format'
import { leagueHref, matchHref } from '@/lib/links'
import { indexLeague, indexMatch } from '@/lib/seo'
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
    ...['/about', '/tochnost', '/veroyatnost', '/o-proekte', '/responsible-gaming', '/privacy', '/nalog'].map((p) => ({ url: `${base}${p}`, changeFrequency: 'monthly' as const, priority: 0.3 })),
    ...TAGS.map((t) => ({ url: `${base}/tag/${t.slug}`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.8 })),
    ...PARTNERS.filter(indexable).map((p) => ({ url: `${base}/bookmakers/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...days.filter((d) => d !== today).map((d) => ({ url: `${base}/matches/${d}`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.6 })),
    // полный список матчей: сегодня — /matches, другие дни — /matches/<дата>/all
    { url: `${base}/matches`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.9 },
    ...days.filter((d) => d !== today).map((d) => ({ url: `${base}/matches/${d}/all`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.5 })),
  ]
  const lists = await Promise.all(days.map((d) => settle(getMatchesByDate(d, { priority: 'low' }), [] as Match[])))
  // подборки дня — голевые матчи и движение линии, и на сегодня тоже; пустые (по снимкам линии из кэша) — нет: они
  // закрыты от индекса (`generateMetadata` страниц), а закрытые в карте сайта поисковики считают ошибкой
  days.forEach((d, i) => {
    const items = lists[i].map((m) => ({ match: m, ...tagsFor(m) }))
    const snapOf = (id: number) => peekOddsSnap(id)
    const has = { goals: goalsPicks(items, snapOf, 0.55).picks.length > 0, odds: linePicks(items, snapOf, { min: 0.05 }).picks.length > 0 }
    for (const p of ['goals', 'odds'] as const)
      if (has[p]) urls.push({ url: `${base}/matches/${d}/${p}`, lastModified: now, changeFrequency: 'hourly', priority: 0.5 })
  })
  // матчи — только те, что открыты для поиска (`indexMatch` в `lib/seo.ts`: топ-турниры)
  for (const m of lists.flat()) {
    if (!indexMatch(m)) continue
    urls.push({
      url: `${base}${matchHref(m)}`,
      lastModified: now,
      changeFrequency: m.status === 'finished' ? 'weekly' : 'hourly',
      priority: 0.7,
    })
  }
  const leagues = await settle(getLeagues({ priority: 'low' }), [] as LeagueInfo[])
  for (const l of leagues.filter(indexLeague)) {
    urls.push({ url: `${base}${leagueHref(l)}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 })
  }
  return urls
}

/**
 * Линия каждого партнёра в ближайших матчах — для страниц «Букмекеры» (владелец: «а страница букмекеров как?»):
 * вместо выдуманных «плюсов» («быстрые выплаты», «высокие коэффициенты») — то, что мы знаем сами: у кого из легальных
 * букмекеров кэфы есть в наших данных и в каких матчах. Сейчас это PARI (раздел /Pari) и Марафон (/Odds); Фонбета,
 * Winline, BetBoom и Лиги Ставок в API нет — у них список пустой.
 *
 * Снимки линии — те же, что в строках списка (`daySnaps`: из кэша сразу, топ-турниры догружаем, но ждём не дольше `ms`).
 * Сегодня ничего не осталось (вечер, всё началось) — берём завтра.
 */
import { PARTNERS } from '@/config/bookmakers'
import { daySnaps, featuredFirst, getMatchesByDate, tagsFor, type FeedItem } from './data'
import { addDays, appNow, todayYmd } from './format'
import { x12For, type X12Line } from './lines'
import type { Match } from './types'

export type PartnerRow = { item: FeedItem; line: X12Line }
export type PartnerDay = { ymd: string; when: 'сегодня' | 'завтра'; rows: PartnerRow[] }

export async function partnerLines(ms = 1000): Promise<Map<string, PartnerDay>> {
  const today = todayYmd()
  const now = appNow()
  const out = new Map<string, PartnerDay>()
  for (const [ymd, when] of [
    [today, 'сегодня'],
    [addDays(today, 1), 'завтра'],
  ] as const) {
    // все партнёры уже нашлись сегодня — завтра не нужен
    if (PARTNERS.every((p) => out.has(p.slug))) break
    let list: Match[] = []
    try {
      list = (await getMatchesByDate(ymd, { priority: 'low' })).filter((m) => m.status === 'scheduled' && m.ts > now)
    } catch {
      continue
    }
    list.sort(featuredFirst)
    // завтра — только то, что уже в кэше (прогрев разбирает и завтрашние топ-матчи): страница не ждёт второй раз
    const { snaps } = await daySnaps(list, when === 'сегодня' ? ms : 0)
    for (const p of PARTNERS) {
      if (out.has(p.slug)) continue
      const rows: PartnerRow[] = []
      for (const m of list) {
        // x12For без линии этого партнёра отдаёт линию первого другого — берём только его собственную
        const line = x12For(snaps.get(m.id), p.slug)
        if (line?.slug === p.slug) rows.push({ item: { match: m, ...tagsFor(m) }, line })
      }
      if (rows.length) out.set(p.slug, { ymd, when, rows })
    }
  }
  return out
}

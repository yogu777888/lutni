/**
 * Ставка подборки и её кэф у легального партнёра (владелец: «страница подборки как?» — у «Много голов» был шанс 77%, но
 * не было кэфа на «больше 2,5» и кнопки, а в карточке стоял «Прогноз ТМ 3.5» — против самой подборки). У каждой подборки,
 * где ставка понятна, — один рынок: «Много голов» — больше 2,5, «Мало голов» — меньше 2,5, «Обе забьют» — да, фаворит и
 * аутсайдер — победа, «Кэф упал» — тот исход, «Дома не проигрывают» — хозяева не проиграют, «50 на 50» — ничья, «Много
 * травм» — победа соперника. «Серии», «Личные встречи», «Топ-матч» — одной очевидной ставки нет: в строке кэфы 1X2. Партнёр — первый по `PARTNERS`, у кого
 * этот рынок есть в снимке линии.
 */
import type { Partner } from '@/config/bookmakers'
import { partnerBooks, type OddsSnap } from './lines'
import { totalAt, type BookOdds, type Quote } from './odds'
import type { TagHit } from './tags'
import type { Match } from './types'

export type TagBet = { label: string; odd: number; partner: Partner }

type Pick = { label: string; get: (b: BookOdds) => Quote | undefined | null }

function pickFor(slug: string, hit: TagHit, m: Match, books: BookOdds[]): Pick | null {
  const q = (n: string) => `«${n}»`
  switch (slug) {
    case 'tb-2-5':
      return { label: '3 гола и больше', get: (b) => totalAt(b, 2.5)?.over }
    case 'tm-2-5':
      return { label: 'Не больше 2 голов', get: (b) => totalAt(b, 2.5)?.under }
    case 'obe-zabyut':
      return { label: 'Обе забьют', get: (b) => b.btts?.yes }
    case 'krepost':
      return { label: `${q(m.home.name)} не проиграет`, get: (b) => b.dc?.hd }
    case 'progruz': {
      // в поводе названа команда, на чью победу упал кэф
      const side = hit.reason.includes(q(m.home.name)) ? 'home' : 'away'
      return { label: `Победа ${q(m[side].name)}`, get: (b) => b.x12?.[side] }
    }
    case 'favorit':
    case 'andedog': {
      // сторона — по линии первого партнёра с исходами: у фаворита кэф ниже, у аутсайдера выше
      const x = books.find((b) => b.x12?.home && b.x12?.away)?.x12
      if (!x?.home || !x.away) return null
      const favHome = x.home.value <= x.away.value
      const side = (slug === 'favorit') === favHome ? 'home' : 'away'
      return { label: `Победа ${q(m[side].name)}`, get: (b) => b.x12?.[side] }
    }
    case 'ravnye':
      return { label: 'Ничья', get: (b) => b.x12?.draw }
    case 'kadry': {
      // в поводе названа команда, у которой не сыграют; ставка подборки — победа соперника
      const side = hit.reason.includes(q(m.home.name)) ? 'away' : 'home'
      return { label: `Победа ${q(m[side].name)}`, get: (b) => b.x12?.[side] }
    }
    default:
      return null
  }
}

/**
 * Ставка подборки у каждого партнёра, у кого есть этот рынок, — в порядке `PARTNERS`: страница одна на всех, какую
 * показать, выбирает посетитель (`OddsPick`, `data-bk`). null — у подборки нет одной ставки (тогда в строке 1X2).
 */
export function tagBets(slug: string, hit: TagHit, m: Match, snap: OddsSnap | null | undefined): TagBet[] | null {
  if (!snap || m.status !== 'scheduled') return []
  const refs = partnerBooks(snap.books)
  const pick = pickFor(
    slug,
    hit,
    m,
    refs.map((r) => r.book),
  )
  if (!pick) return null
  const out: TagBet[] = []
  for (const { partner, book } of refs) {
    const odd = pick.get(book)?.value
    if (odd && odd > 1) out.push({ label: pick.label, odd, partner })
  }
  return out
}

export function tagBet(slug: string, hit: TagHit, m: Match, snap: OddsSnap | null | undefined): TagBet | null {
  if (!snap || m.status !== 'scheduled') return null
  const refs = partnerBooks(snap.books)
  const pick = pickFor(
    slug,
    hit,
    m,
    refs.map((r) => r.book),
  )
  if (!pick) return null
  for (const { partner, book } of refs) {
    const odd = pick.get(book)?.value
    if (odd && odd > 1) return { label: pick.label, odd, partner }
  }
  return null
}

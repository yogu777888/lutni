import type { TeamSetPieces } from '@/lib/data'
import type { Team } from '@/lib/types'
import { CmpRow } from './FormBlock'
import { TeamHead } from './TeamHead'

const dec = (n: number) => n.toFixed(1).replace('.', ',')

/**
 * «Угловые и карточки» — средние за последние матчи каждой команды (владелец: «а ты прям аналитическую модель собрался
 * писать? давай без этого, пока просто визуально сделай»): только статистика прошлых игр, без шансов и прогноза.
 * Сверху крупно — сколько в среднем бывает за матч в играх этих команд (среднее двух команд: свои + соперника), ниже — строки
 * сравнения, как в «Форме команд». Своих угловых больше — лучше; угловых соперника и своих жёлтых меньше — лучше;
 * жёлтые соперника — без лидера (это не про команду).
 */
export function SetPiecesBlock({ home, away, h, a }: { home: Team; away: Team; h: TeamSetPieces | null; a: TeamSetPieces | null }) {
  const has = (t: TeamSetPieces | null, k: 'cornersN' | 'cardsN') => (t && t[k] ? t : null)
  const ch = has(h, 'cornersN')
  const ca = has(a, 'cornersN')
  const yh = has(h, 'cardsN')
  const ya = has(a, 'cardsN')
  // в матчах обеих команд — только если цифры есть у обеих: по одной команде «в их матчах» было бы неправдой
  const corners = ch && ca ? (ch.cornersFor + ch.cornersAgainst + ca.cornersFor + ca.cornersAgainst) / 2 : null
  const cards = yh && ya ? (yh.cards + yh.cardsAgainst + ya.cards + ya.cardsAgainst) / 2 : null
  const big = (v: number, word: string) => (
    <div className="flex items-end gap-2.5">
      <span className="display-num text-[44px] leading-[0.9] text-fg sm:text-[52px]">{dec(v)}</span>
      <span className="pb-0.5 text-[14px] leading-snug text-dim">
        {word}
        <br />за матч
      </span>
    </div>
  )
  return (
    <div>
      {corners != null || cards != null ? (
        <div className="mb-4 grid grid-cols-2 gap-x-4 border-b border-edge pb-4 sm:flex sm:gap-x-10">
          {corners != null ? big(corners, 'угловых') : null}
          {cards != null ? big(cards, 'жёлтых') : null}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4 border-b border-edge pb-3">
        <TeamHead t={home} />
        <TeamHead t={away} right />
      </div>
      <ul className="mt-1.5">
        {ch || ca ? (
          <>
            <CmpRow label={'Угловые за игру'} h={ch?.cornersFor ?? null} a={ca?.cornersFor ?? null} show={dec} />
            <CmpRow label="Угловые соперника" h={ch?.cornersAgainst ?? null} a={ca?.cornersAgainst ?? null} show={dec} lowerBetter />
          </>
        ) : null}
        {yh || ya ? (
          <>
            <CmpRow label={'Жёлтые за игру'} h={yh?.cards ?? null} a={ya?.cards ?? null} show={dec} lowerBetter />
            <CmpRow label="Жёлтые у соперника" h={yh?.cardsAgainst ?? null} a={ya?.cardsAgainst ?? null} show={dec} neutral />
          </>
        ) : null}
      </ul>
    </div>
  )
}

import { SITE } from '@/config/site'
import type { DayPicks, ValueRow } from '@/lib/day-picks'
import { ValueBlock } from './shell/RightPanel'

/**
 * Боковая колонка списка (ниже xl — под ним): «Выгодно сегодня» (`values` — только у сегодняшнего дня; на телефоне
 * правой панели нет, а это блок, который приносит деньги). «Где ставить» убран вместе со страницей «Букмекеры»
 * (владелец: «и блок где ставить тоже уберем пока? если что потом вернем?» — вернуть по истории git). Показать нечего —
 * колонки нет (`hasSidebar`).
 */
export function hasSidebar(values: ValueRow[] = [], valuesBy: DayPicks['valuesBy'] = {}): boolean {
  return Boolean(values.length || Object.values(valuesBy).some((v) => v.rows.length) || SITE.telegramUrl)
}


export function Sidebar({ values = [], valuesBy = {} }: { values?: ValueRow[]; valuesBy?: DayPicks['valuesBy'] }) {
  if (!hasSidebar(values, valuesBy)) return null
  return (
    <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
      {values.length || Object.values(valuesBy).some((v) => v.rows.length) ? <ValueBlock rows={values} by={valuesBy} card /> : null}
      {SITE.telegramUrl ? (
        <a href={SITE.telegramUrl} target="_blank" rel="noopener" className="card flex items-center gap-3 p-6 transition-colors hover:bg-panel-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#229ED9] text-lg font-bold text-[#fff]">✈</span>
          <span>
            <span className="block text-[15px] font-semibold">tag.bet в Telegram</span>
            <span className="text-[13px] text-dim">Выгодные ставки и падение кэфов — сразу в ленту</span>
          </span>
        </a>
      ) : null}
    </aside>
  )
}

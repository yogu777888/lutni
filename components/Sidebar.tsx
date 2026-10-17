import { BlockMore } from './BlockMore'
import { PARTNERS } from '@/config/bookmakers'
import { SITE } from '@/config/site'
import type { ValueRow } from '@/lib/day-picks'
import { BlockHead } from './BlockHead'
import { PartnerCard } from './PartnerCard'
import { ValueBlock } from './shell/RightPanel'

/**
 * Боковая колонка списка (ниже xl — под ним): «Выгодно сегодня» (`values` — только у сегодняшнего дня; на телефоне
 * правой панели нет, а это блок, который приносит деньги) и «Где ставить». «Как читать теги» убрана: тегов в строках
 * давно нет, легенда объясняла то, чего на экране нет (владелец: «а на телефоне главная как?»).
 */
export function Sidebar({ values = [] }: { values?: ValueRow[] }) {
  return (
    <aside className="space-y-3 sm:space-y-5 lg:sticky lg:top-24 lg:self-start">
      {values.length ? <ValueBlock rows={values} card /> : null}
      <section className="card overflow-hidden">
        <BlockHead title="Где ставить" line />
        <div className="divide-y divide-edge px-4 py-4 sm:px-5">
          {PARTNERS.slice(0, 3).map((p) => (
            <PartnerCard key={p.slug} partner={p} placement="sidebar" />
          ))}
        </div>
        {/* про лицензию — над чертой, у списка; под чертой — только ссылка, как во всех блоках-списках (`BlockMore`) */}
        <p className="px-4 pb-3.5 text-[12px] text-mute sm:px-5">Только букмекеры с лицензией ФНС России.</p>
        <BlockMore href="/bookmakers">Все букмекеры</BlockMore>
      </section>
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

import Link from 'next/link'
import { PARTNERS } from '@/config/bookmakers'
import { SITE } from '@/config/site'
import { PartnerCard } from './PartnerCard'
import { TagPill } from './TagPill'

export function Sidebar() {
  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
      <section className="card p-6">
        <p className="eyebrow">Где ставить</p>
        <div className="mt-4 divide-y divide-edge">
          {PARTNERS.slice(0, 3).map((p) => (
            <PartnerCard key={p.slug} partner={p} placement="sidebar" />
          ))}
        </div>
        <p className="mt-4 text-[11px] text-mute">Только букмекеры с лицензией ФНС России.</p>
        <Link href="/bookmakers" className="group mt-4 inline-flex items-center gap-1.5 border-b-2 border-acid pb-0.5 text-[14px] font-semibold">
          Весь рейтинг <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </section>
      <section className="card p-6">
        <p className="eyebrow">Как читать теги</p>
        <ul className="mt-4 space-y-3 text-[14px]">
          <li className="flex items-center gap-2.5">
            <TagPill slug="value" link={false} />
            <span className="text-dim">платят больше, чем стоит</span>
          </li>
          <li className="flex items-center gap-2.5">
            <TagPill slug="progruz" link={false} />
            <span className="text-dim">кэф резко снизился</span>
          </li>
          <li className="flex items-center gap-2.5">
            <TagPill slug="tb-2-5" link={false} />
            <span className="text-dim">ждём 3 гола и больше</span>
          </li>
        </ul>
        <Link href="/tags" className="group mt-5 inline-flex items-center gap-1.5 border-b-2 border-acid pb-0.5 text-[14px] font-semibold">
          Все теги <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </section>
      {SITE.telegramUrl ? (
        <a href={SITE.telegramUrl} target="_blank" rel="noopener" className="card flex items-center gap-3 p-6 transition-colors hover:bg-panel-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#229ED9] text-lg font-bold text-white">✈</span>
          <span>
            <span className="block text-[15px] font-semibold">Теги в Telegram</span>
            <span className="text-[13px] text-dim">Value и прогрузы — сразу в ленту</span>
          </span>
        </a>
      ) : null}
    </aside>
  )
}

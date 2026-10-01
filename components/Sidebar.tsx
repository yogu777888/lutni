import Link from 'next/link'
import { PARTNERS } from '@/config/bookmakers'
import { SITE } from '@/config/site'
import { PartnerCard } from './PartnerCard'
import { TagPill } from './TagPill'

export function Sidebar() {
  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <section className="card p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">Лучшие букмекеры</h2>
          <Link href="/bookmakers" className="text-[12px] text-mute transition-colors hover:text-fg">
            Рейтинг
          </Link>
        </div>
        <div className="divide-y divide-edge">
          {PARTNERS.slice(0, 3).map((p, i) => (
            <PartnerCard key={p.slug} partner={p} placement="sidebar" rank={i + 1} />
          ))}
        </div>
      </section>
      <section className="card p-5">
        <h2 className="text-[15px] font-semibold">Как работают теги</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-dim">
          Каждый матч получает теги по данным линии, модели голов и статистики. Нажмите на кружок наверху — пролистаете матчи тега.
        </p>
        <ul className="mt-4 space-y-2.5 text-[13px]">
          <li className="flex items-center gap-2.5">
            <TagPill slug="value" link={false} />
            <span className="text-dim">коэффициент выше справедливого</span>
          </li>
          <li className="flex items-center gap-2.5">
            <TagPill slug="progruz" link={false} />
            <span className="text-dim">линия резко сдвинулась</span>
          </li>
          <li className="flex items-center gap-2.5">
            <TagPill slug="tb-2-5" link={false} />
            <span className="text-dim">ждём много голов</span>
          </li>
        </ul>
        <Link href="/tags" className="mt-4 inline-block text-[13px] font-medium text-fg transition-opacity hover:opacity-75">
          Все теги →
        </Link>
      </section>
      {SITE.telegramUrl ? (
        <a href={SITE.telegramUrl} target="_blank" rel="noopener" className="card flex items-center gap-3 p-5 transition-colors hover:bg-panel-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#229ED9] text-lg font-bold text-white">✈</span>
          <span>
            <span className="block text-[14px] font-semibold">Теги в Telegram</span>
            <span className="text-[12px] text-dim">Value-ставки и прогрузы — сразу в ленту</span>
          </span>
        </a>
      ) : null}
    </aside>
  )
}

import Link from 'next/link'
import { PARTNERS } from '@/config/bookmakers'
import { SITE } from '@/config/site'
import { PartnerCard } from './PartnerCard'
import { TagPill } from './TagPill'

export function Sidebar() {
  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <section className="card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[15px] font-bold">Лучшие букмекеры</h2>
          <Link href="/bookmakers" className="text-xs text-dim hover:text-acid">
            Рейтинг →
          </Link>
        </div>
        <div className="space-y-2.5">
          {PARTNERS.slice(0, 3).map((p, i) => (
            <PartnerCard key={p.slug} partner={p} placement="sidebar" rank={i + 1} />
          ))}
        </div>
      </section>
      <section className="card p-4">
        <h2 className="text-[15px] font-bold">Как работают теги</h2>
        <p className="mt-2 text-sm leading-relaxed text-dim">
          Каждый матч получает теги по данным линии, модели голов и статистики. Нажмите на тег — откроются все матчи с ним.
        </p>
        <ul className="mt-3 space-y-2 text-[13px]">
          <li className="flex items-center gap-2">
            <TagPill slug="value" link={false} />
            <span className="text-dim">коэффициент выше справедливого</span>
          </li>
          <li className="flex items-center gap-2">
            <TagPill slug="progruz" link={false} />
            <span className="text-dim">линия резко сдвинулась</span>
          </li>
          <li className="flex items-center gap-2">
            <TagPill slug="tb-2-5" link={false} />
            <span className="text-dim">ждём много голов</span>
          </li>
        </ul>
        <Link href="/tags" className="mt-3 inline-block text-sm font-semibold text-acid hover:underline">
          Все теги →
        </Link>
      </section>
      {SITE.telegramUrl ? (
        <a
          href={SITE.telegramUrl}
          target="_blank"
          rel="noopener"
          className="card flex items-center gap-3 p-4 transition hover:ring-1 hover:ring-acid/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#229ED9] text-lg font-bold text-white">✈</span>
          <span>
            <span className="block font-bold">Теги в Telegram</span>
            <span className="text-xs text-dim">Value-ставки и прогрузы — сразу в ленту</span>
          </span>
        </a>
      ) : null}
    </aside>
  )
}

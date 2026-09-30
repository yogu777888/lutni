import type { Metadata } from 'next'
import Link from 'next/link'
import { AdMark } from '@/components/AdMark'
import { CtaLink } from '@/components/CtaLink'
import { PartnerBadge } from '@/components/PartnerBadge'
import { Stars } from '@/components/Stars'
import { PARTNERS } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'

export const metadata: Metadata = {
  title: 'Рейтинг легальных букмекеров: бонусы, коэффициенты, выплаты',
  description:
    'Рейтинг легальных букмекерских контор от tag.bet: уровень коэффициентов, линия на футбол, выплаты, приложение и бонусы для новых клиентов.',
  alternates: { canonical: '/bookmakers' },
}

export default function BookmakersPage() {
  return (
    <>
      <div className="pitch-bg -mx-4 mb-6 border-b border-edge px-4 pb-6 pt-3 sm:mx-0 sm:rounded-3xl sm:border sm:p-7">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Рейтинг букмекеров</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
          Только легальные букмекеры с лицензией. Оцениваем уровень коэффициентов на футбол (маржу считаем по реальным линиям), ширину
          росписи, скорость выплат и удобство приложения.
        </p>
      </div>
      <ol className="space-y-3">
        {PARTNERS.map((p, i) => (
          <li key={p.slug} className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="num w-6 text-center font-display text-lg font-bold text-mute">{i + 1}</span>
              <PartnerBadge partner={p} size={52} />
              <div className="min-w-[160px] flex-1">
                <Link href={`/bookmakers/${p.slug}`} className="font-display text-lg font-bold hover:text-acid">
                  {p.name}
                </Link>
                <div className="mt-0.5 flex items-center gap-2">
                  <Stars value={p.rating} />
                  <span className="num text-sm font-semibold">{p.rating.toFixed(1)}</span>
                </div>
                <p className="mt-1 text-xs text-dim">{p.license}</p>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[220px]">
                <p className="text-sm font-bold text-acid">{p.bonus}</p>
                <p className="text-[11px] text-dim">{p.bonusNote}</p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <CtaLink href={goHref(p, 'bookmakers')} className="flex-1 sm:flex-none">
                  На сайт
                </CtaLink>
                <Link
                  href={`/bookmakers/${p.slug}`}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-panel-3 px-4 py-2.5 text-sm font-bold ring-1 ring-inset ring-edge-2 hover:bg-edge-2 sm:flex-none"
                >
                  Обзор
                </Link>
              </div>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pl-10 text-[13px] text-fg/80">
              {p.highlights.map((h) => (
                <li key={h} className="flex items-center gap-1.5">
                  <span className="text-win">✓</span>
                  {h}
                </li>
              ))}
            </ul>
            <AdMark partner={p} className="mt-2 pl-10" />
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs leading-relaxed text-mute">
        Рейтинг носит информационный характер. Перед регистрацией проверьте наличие лицензии на сайте букмекера. 18+. Азартные игры
        могут вызывать зависимость.
      </p>
    </>
  )
}

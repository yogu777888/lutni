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
      <div className="mb-8 pt-2">
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.03em] sm:text-[34px]">Рейтинг букмекеров</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-dim">
          Только легальные букмекеры с лицензией. Оцениваем уровень коэффициентов на футбол (маржу считаем по реальным линиям), ширину
          росписи, скорость выплат и удобство приложения.
        </p>
      </div>
      <ol className="space-y-3">
        {PARTNERS.map((p, i) => (
          <li key={p.slug} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="num w-5 text-center text-[15px] font-medium text-mute">{i + 1}</span>
              <PartnerBadge partner={p} size={48} />
              <div className="min-w-[160px] flex-1">
                <Link href={`/bookmakers/${p.slug}`} className="text-[18px] font-semibold tracking-tight transition-opacity hover:opacity-75">
                  {p.name}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <Stars value={p.rating} />
                  <span className="num text-[13px] font-medium text-dim">{p.rating.toFixed(1)}</span>
                </div>
                <p className="mt-1 text-[12px] text-mute">{p.license}</p>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[220px]">
                <p className="text-[14px] font-medium">{p.bonus}</p>
                <p className="text-[12px] text-mute">{p.bonusNote}</p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <CtaLink href={goHref(p, 'bookmakers')} variant="light" className="flex-1 sm:flex-none">
                  На сайт
                </CtaLink>
                <Link
                  href={`/bookmakers/${p.slug}`}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-white/[0.08] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/[0.13] sm:flex-none"
                >
                  Обзор
                </Link>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 pl-9 text-[13px] text-dim">
              {p.highlights.map((h) => (
                <li key={h} className="flex items-center gap-1.5">
                  <span className="text-mute">✓</span>
                  {h}
                </li>
              ))}
            </ul>
            <AdMark partner={p} className="mt-2 pl-9" />
          </li>
        ))}
      </ol>
      <p className="mt-8 text-[12px] leading-relaxed text-mute">
        Рейтинг носит информационный характер. Перед регистрацией проверьте наличие лицензии на сайте букмекера. 18+. Азартные игры
        могут вызывать зависимость.
      </p>
    </>
  )
}

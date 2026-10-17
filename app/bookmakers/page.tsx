import type { Metadata } from 'next'
import Link from 'next/link'
import { AdMark } from '@/components/AdMark'
import { PartnerBadge } from '@/components/PartnerBadge'
import { PARTNERS, realBonus } from '@/config/bookmakers'
import { goHref, SPONSORED_REL } from '@/lib/affiliate'
import { pluralN } from '@/lib/format'
import { partnerLines } from '@/lib/partner-lines'

// сколько матчей с линией у каждого партнёра — из нашего кэша, на каждый запрос
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Легальные букмекеры: лицензии и коэффициенты на футбол',
  description: 'Легальные букмекерские конторы с лицензией ФНС России: официальные сайты и у кого коэффициенты на футбол есть на tag.bet.',
  alternates: { canonical: '/bookmakers' },
}

/**
 * «Легальные букмекеры» — как блок лиги на главной (владелец: «а визуально страница букмекеры как? относительно главной»):
 * одна панель — заголовок и строки через черту, а не шесть карточек по ~130px с двумя капсулами (на первый экран влезало
 * три с половиной букмекера); от xl — без подложки центра (`.bare-sub`). «На сайт» — тихая плашка, лаймом при наведении,
 * как в «Где поставить»: шесть лаймовых капсул столбиком были самым ярким на странице, а лайм у нас — «выгодно».
 *
 * Без оценок и места в списке (владелец: «сортируй по оценке надо?» — оценки 4.3–4.8 были заглушками без критериев, а
 * сравнение в рекламе должно быть обоснованным); порядок — партнёрский (PARTNERS). В строке — только то, что отличает
 * букмекеров (владелец: «а страница букмекеров как?»): лицензия у всех одна — она в подзаголовке; заглушки «Бонус для
 * новых клиентов» и выдуманных «плюсов» нет; вместо них — есть ли кэфы букмекера на tag.bet.
 */
export default async function BookmakersPage() {
  const lines = await partnerLines()
  return (
    <>
      <span hidden className="bare-sub" />
      <section className="card overflow-hidden">
        <header className="border-b border-edge px-4 py-4 sm:px-5">
          <h1 className="h1-block text-[22px] leading-tight sm:text-[24px]">Легальные букмекеры</h1>
          <p className="mt-1 text-[13.5px] leading-snug text-dim">
            Только с лицензией ФНС России и членством в ЕЦУПИС. Ссылки на букмекеров — партнёрские: мы можем получать
            вознаграждение.
          </p>
        </header>
        <ul className="divide-y divide-edge">
          {PARTNERS.map((p) => {
            const day = lines.get(p.slug)
            const bonus = realBonus(p)
            return (
              <li
                key={p.slug}
                className="relative grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3.5 transition-colors hover:bg-white/[0.02] sm:px-5"
              >
                <PartnerBadge partner={p} size={40} />
                <div className="min-w-0">
                  {/* вся строка — на страницу букмекера (кэфы, как зарегистрироваться); к букмекеру — только «На сайт» */}
                  <Link href={`/bookmakers/${p.slug}`} className="text-[16px] font-semibold tracking-tight after:absolute after:inset-0">
                    {p.name}
                  </Link>
                  {day ? (
                    <p className="text-[13px] leading-snug text-dim">
                      Кэфы на tag.bet — в {pluralN(day.rows.length, ['матче', 'матчах', 'матчах'])} {day.when}
                    </p>
                  ) : (
                    <p className="text-[13px] leading-snug text-mute">Кэфов на tag.bet пока нет — линия на сайте букмекера</p>
                  )}
                  {bonus ? <p className="mt-0.5 text-[13px] font-medium">{bonus}</p> : null}
                  <AdMark partner={p} className="mt-1" />
                </div>
                <a
                  href={goHref(p, 'bookmakers')}
                  target="_blank"
                  rel={SPONSORED_REL}
                  className="relative z-10 inline-flex h-[34px] items-center rounded-ctl bg-white/[0.08] px-3.5 text-[13px] font-semibold transition-colors hover:bg-btn hover:text-btn-ink"
                >
                  На сайт
                </a>
              </li>
            )
          })}
        </ul>
        <p className="border-t border-edge px-4 py-3 text-[12px] leading-relaxed text-mute sm:px-5">
          Информация носит справочный характер. Перед регистрацией проверьте наличие лицензии на сайте букмекера. 18+. Азартные игры
          могут вызывать зависимость.
        </p>
      </section>
    </>
  )
}

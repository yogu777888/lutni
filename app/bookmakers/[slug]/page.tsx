import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdMark } from '@/components/AdMark'
import { BlockHead } from '@/components/BlockHead'
import { PageHead } from '@/components/PageHead'
import { CtaLink } from '@/components/CtaLink'
import { MatchRow } from '@/components/MatchRow'
import { PartnerBadge } from '@/components/PartnerBadge'
import { getPartner, indexable, realBonus, type Partner, type PayRow } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { pluralN, todayYmd } from '@/lib/format'
import { listHref } from '@/lib/links'
import { partnerLines, type PartnerRow } from '@/lib/partner-lines'

// кэфы партнёра в ближайших матчах — из нашего кэша, на каждый запрос
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

/** «2026-10-18» → «18 октября 2026». */
const ruDate = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(' г.', '')

/** Таблица пополнения или вывода: от sm — колонками, на телефоне — строкой под способом (пять колонок в 390px не влезают). */
function PayTable({ title, timeLabel, rows }: { title: string; timeLabel: string; rows: PayRow[] }) {
  const v = (x?: string) => x || '—'
  return (
    <div>
      <h3 className="px-4 pb-2 pt-4 text-[15px] font-semibold sm:px-5">{title}</h3>
      <table className="hidden w-full text-left text-[14px] sm:table">
        <thead className="text-[12px] text-mute">
          <tr className="border-b border-edge">
            <th className="py-2 pl-5 pr-3 font-medium">Способ</th>
            <th className="px-3 py-2 font-medium">Минимум</th>
            <th className="px-3 py-2 font-medium">Максимум</th>
            <th className="px-3 py-2 font-medium">Комиссия</th>
            <th className="py-2 pl-3 pr-5 font-medium">{timeLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {rows.map((r) => (
            <tr key={r.method}>
              <td className="py-2.5 pl-5 pr-3 font-medium">
                {r.method}
                {r.note ? <span className="mt-0.5 block text-[12.5px] font-normal leading-snug text-mute">{r.note}</span> : null}
              </td>
              <td className="num px-3 py-2.5 text-fg/85">{v(r.min)}</td>
              <td className="num px-3 py-2.5 text-fg/85">{v(r.max)}</td>
              <td className="px-3 py-2.5 text-fg/85">{v(r.fee)}</td>
              <td className="py-2.5 pl-3 pr-5 text-fg/85">{v(r.time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-edge border-t border-edge sm:hidden">
        {rows.map((r) => (
          <li key={r.method} className="px-4 py-2.5">
            <div className="text-[15px] font-medium">{r.method}</div>
            <div className="mt-0.5 text-[13px] text-dim">
              {[r.min && `от ${r.min}`, r.max && `до ${r.max}`, r.fee, r.time].filter(Boolean).join(' · ') || '—'}
            </div>
            {r.note ? <div className="mt-0.5 text-[12.5px] leading-snug text-mute">{r.note}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

type Faq = { q: string; a: string; link?: { href: string; text: string } }

/** Способ оплаты внутри фразы: «Банковская карта (МИР…)» → «банковская карта»; СБП, ЦУПИС, ЮMoney — как есть. */
const way = (m: string) => {
  const s = m.replace(/ \(.*\)$/, '')
  return /^[А-ЯЁ][а-яё]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s
}

/**
 * «Вопросы и ответы» — из проверенных фактов (`facts`), без текста «для объёма»: вопрос есть, только если есть ответ. Те же
 * вопросы люди задают поиску («как вывести деньги из Winline»); разметка FAQPage — в странице.
 */
function faqFor(p: Partner): Faq[] {
  const f = p.facts ?? {}
  const out: Faq[] = []
  if (f.licenseNo || f.legalEntity) {
    const lic = [f.licenseNo, f.licenseDate && `от ${ruDate(f.licenseDate)}`].filter(Boolean).join(' ')
    out.push({
      q: `${p.name} — легальный букмекер?`,
      a: `Да. ${p.name} работает по лицензии ФНС России${lic ? ` ${lic}` : ''}${f.legalEntity ? `, компания — ${f.legalEntity}` : ''}, и входит в ЕЦУПИС: деньги игроков и выплаты проходят через единый учёт ставок.`,
    })
  }
  if (f.minDeposit || f.deposit?.length) {
    const ways = f.deposit?.map((r) => way(r.method)).join(', ')
    out.push({
      q: `Какой минимальный депозит в ${p.name}?`,
      a: [f.minDeposit && `Минимальное пополнение — ${f.minDeposit}.`, ways && `Пополнить счёт можно так: ${ways}.`].filter(Boolean).join(' '),
    })
  }
  if (f.withdraw?.length) {
    const ways = f.withdraw.map((r) => [way(r.method), r.min && `от ${r.min}`, r.time?.toLowerCase()].filter(Boolean).join(' — ')).join('; ')
    out.push({
      q: `Как вывести деньги из ${p.name}?`,
      a: `Выигрыш выводят на те же способы, что и пополнение: ${ways}. Перед первым выводом нужно пройти идентификацию.`,
    })
  }
  if (f.verification) out.push({ q: `Как пройти идентификацию в ${p.name}?`, a: `Способы: ${f.verification}.` })
  if (f.apps) out.push({ q: `Есть ли у ${p.name} приложение?`, a: `${f.apps}.` })
  const sup = f.support
  if (sup && (sup.phone || sup.email)) {
    const parts = [sup.phone && `телефон ${sup.phone}${sup.phoneNote ? ` (${sup.phoneNote})` : ''}`, sup.email && `почта ${sup.email}`, sup.chat && 'онлайн-чат на сайте']
    out.push({ q: `Как связаться с поддержкой ${p.name}?`, a: `${parts.filter(Boolean).join(', ')}.`.replace(/^./, (c) => c.toUpperCase()) })
  }
  // налог — общий для всех, поэтому только к вопросам о самом букмекере, а не вместо них
  if (out.length >= 2)
    out.push({
      q: `Нужно ли платить налог с выигрыша в ${p.name}?`,
      a: `Да: с выигрыша (разницы между выплатой и ставкой) удерживается НДФЛ. С 2026 года легальный букмекер удерживает его сам при каждой выплате, отдельная декларация обычно не нужна.`,
      link: { href: '/nalog', text: 'Подробнее — «Налог на выигрыш»' },
    })
  return out.length >= 3 ? out : []
}

const domain = (site: string) => site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = getPartner(slug)
  if (!p) return {}
  // без «и отзывы»: отзывов на странице нет, а заголовок в поиске их обещал
  return {
    title: `${p.name}: обзор букмекера — лицензия, сайт, кэфы на футбол`,
    description: `Букмекер ${p.name}: лицензия ФНС России, официальный сайт ${domain(p.site)}, коэффициенты на футбол и как зарегистрироваться.`,
    alternates: { canonical: `/bookmakers/${p.slug}` },
    // пустая страница (только кнопка) — не для поиска, пока не заполнят факты: «тонкая партнёрская» тянет вниз весь сайт
    ...(indexable(p) ? {} : { robots: { index: false, follow: true } }),
  }
}

/** Сколько матчей с линией показываем; остальные — в списке дня. */
const SHOWN = 10

export default async function BookmakerPage({ params }: Props) {
  const { slug } = await params
  const p = getPartner(slug)
  if (!p) notFound()
  const day = (await partnerLines()).get(p.slug)
  // главные матчи (топ-турниры первыми), а на экране — по времени: по турнирам время скакало 20:30 → 23:00 → 20:00
  const byTime = (a: PartnerRow, b: PartnerRow) => a.item.match.ts - b.item.match.ts
  const shown = day ? day.rows.slice(0, SHOWN).sort(byTime) : []
  // остальные — под раскрывашкой, как «Ещё N матчей в других турнирах» на главной: «36 матчей» в шапке при 10 строках
  // и ссылке на весь список дня (там не только PARI) — остальные 26 было не найти
  const more = day ? day.rows.slice(SHOWN).sort(byTime) : []
  const bonus = realBonus(p)
  // «Получить бонус» — только когда знаем, какой бонус: без условий от партнёрки кнопка обещала бы неизвестно что
  const cta = bonus ? `Получить бонус в ${p.name}` : `На сайт ${p.name}`
  // маржа на исход матча по линии в наших данных — то, что мы считаем сами, а не «низкая маржа» на словах; только своя
  // цифра букмекера, без сравнения с другими и без «выгоднее»
  const margin = day?.rows.length
    ? day.rows.reduce((s, { line }) => s + 1 / line.home + 1 / line.draw + 1 / line.away - 1, 0) / day.rows.length
    : null
  const f = p.facts ?? {}
  const facts: [string, React.ReactNode][] = [
    ...(margin != null && margin > 0
      ? [[
          'Маржа на исход матча',
          <>
            {(margin * 100).toFixed(1).replace('.', ',')}%{' '}
            <span className="text-dim">
              — в среднем по {pluralN(day!.rows.length, ['матчу', 'матчам', 'матчам'])} {day!.when}. Доля букмекера в кэфах: чем
              она меньше, тем ближе кэфы к честной цене
            </span>
          </>,
        ] as [string, React.ReactNode]]
      : []),
    ...(f.minDeposit ? [['Минимальный депозит', f.minDeposit] as [string, React.ReactNode]] : []),
    ...(f.apps ? [['Приложение', f.apps] as [string, React.ReactNode]] : []),
    ...(f.verification ? [['Идентификация', f.verification] as [string, React.ReactNode]] : []),
  ]
  const checked = f.checked ? ruDate(f.checked) : null
  // «О компании» — как блок лицензии у legalbet: юрлицо, номер и дата лицензии; общая строка про ФНС и ЕЦУПИС — в шапке
  const sup = f.support
  const tel = sup?.phone ? `tel:${sup.phone.replace(/[^\d+]/g, '')}` : null
  const company: [string, React.ReactNode][] = [
    ...(f.legalEntity ? [['Юрлицо', f.legalEntity] as [string, React.ReactNode]] : []),
    ...(f.address ? [['Адрес', f.address] as [string, React.ReactNode]] : []),
    ...(f.inn || f.ogrn ? [['ИНН / ОГРН', <span key="r" className="num">{[f.inn, f.ogrn].filter(Boolean).join(' / ')}</span>] as [string, React.ReactNode]] : []),
    ...(f.licenseNo
      ? [['Лицензия ФНС', [f.licenseNo, f.licenseDate && `от ${ruDate(f.licenseDate)}`, f.licenseTerm].filter(Boolean).join(', ')] as [string, React.ReactNode]]
      : []),
    ...(f.legalEntity || f.licenseNo ? [['Учёт ставок', 'Член ЕЦУПИС'] as [string, React.ReactNode]] : []),
    ...(f.legalEntity || f.licenseNo ? [['Официальный сайт', domain(p.site)] as [string, React.ReactNode]] : []),
    ...(sup && (sup.phone || sup.email || sup.chat)
      ? [[
          'Поддержка',
          <span key="s" className="flex flex-col gap-0.5">
            {sup.phone && tel ? (
              <span>
                <a href={tel} className="num underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-fg">
                  {sup.phone}
                </a>
                {sup.phoneNote ? <span className="text-dim"> — {sup.phoneNote}</span> : null}
              </span>
            ) : null}
            {sup.email ? (
              <a href={`mailto:${sup.email}`} className="w-fit underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-fg">
                {sup.email}
              </a>
            ) : null}
            {sup.chat ? <span className="text-dim">Онлайн-чат на сайте</span> : null}
          </span>,
        ] as [string, React.ReactNode]]
      : []),
  ]
  const faq = faqFor(p)
  const steps = [
    `Нажмите «${cta}» — откроется официальный сайт букмекера (${domain(p.site)}).`,
    'Зарегистрируйтесь по номеру телефона и подтвердите возраст (18+).',
    'Пройдите идентификацию личности — это обязательное требование для легальных букмекеров.',
    ...(bonus ? ['Выполните условия акции из раздела «Бонусы» на сайте букмекера.'] : []),
  ]
  return (
    <>
      {/* от xl — без подложки центра, разделы — панелями через 8px, как на главной (владелец: «а визуально страница
          букмекеры как? относительно главной»; правила — .bare-sub в app/globals.css) */}
      <span hidden className="bare-sub" />
      <div className="space-y-4 xl:space-y-2">
        {/* шапка — одной строкой: знак, название, лицензия и сайт, кнопка справа (~110px вместо ~280: карточка с градиентом
            и «БУКМЕКЕР PARI» Oswald 56px; «Кэфы PARI сегодня» начинались на середине экрана) */}
        {/* оценки «4.8 / 5 · оценка tag.bet» нет: она была заглушкой без критериев; официальный сайт — в подписи, а не
            отдельным разделом «Лицензия и надёжность»; бонус — только настоящий (AFF_<SLUG>_BONUS) */}
        <PageHead
          crumbs={[{ href: '/bookmakers', label: 'Букмекеры' }, { href: `/bookmakers/${p.slug}`, label: p.name }]}
          lead={<PartnerBadge partner={p} size={48} />}
          title={`Букмекер ${p.name}`}
          sub={
            <>
              {p.license} · официальный сайт <span className="font-semibold text-fg/85">{domain(p.site)}</span>
              {bonus ? (
                <span className="mt-1 block text-[14px] font-medium text-fg">
                  {bonus} <span className="text-[12px] font-normal text-mute">· {p.bonusNote}</span>
                </span>
              ) : null}
            </>
          }
          aside={
            <>
              <CtaLink href={goHref(p, 'review')} className="w-full sm:w-auto">
                {cta}
              </CtaLink>
              <AdMark partner={p} className="mt-1.5 sm:text-right" />
            </>
          }
        />

        {/* «Коротко о …» — вместо обзора с оценками (владелец: «в букмекерах какие-то обзоры надо делать?»): только то,
            что можно проверить — маржа по нашим данным и факты из `facts` в config/bookmakers.ts; нечего показать — блока нет */}
        {facts.length ? (
          <section className="card overflow-hidden">
            <BlockHead title={`Коротко о ${p.name}`} line />
            <dl className="divide-y divide-edge text-[15px]">
              {facts.map(([k, v]) => (
                <div key={k} className="grid gap-0.5 px-4 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
                  <dt className="text-dim">{k}</dt>
                  <dd className="leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {/* вместо выдуманных «Плюсов» и «Минусов» (владелец: «а страница букмекеров как?») — кэфы этого букмекера в
            ближайших матчах, теми же строками и с той же шапкой, что блок лиги на главной: ссылки на матч, кэфы — к
            букмекеру, лаймом — выгодный кэф */}
        <section id="kefy" className="card scroll-mt-24 overflow-hidden">
          <BlockHead title={`Кэфы ${p.name}${day ? ` ${day.when}` : ''}`} aside={day ? `${pluralN(day.rows.length, ['матч', 'матча', 'матчей'])} · Реклама · 18+` : null} line={Boolean(day)} />
          {day ? (
            <>
              <div className="divide-y divide-edge">
                {shown.map(({ item, line }) => (
                  <MatchRow key={item.match.id} m={item.match} tags={item.tags} summary={item.summary} line={line} showLeague />
                ))}
              </div>
              {more.length ? (
                <details className="group/more border-t border-edge">
                  <summary className="flex items-center justify-between gap-3 px-4 py-3.5 text-[14px] text-dim transition-colors hover:text-fg sm:px-5">
                    <span>
                      Ещё {pluralN(more.length, ['матч', 'матча', 'матчей'])} с кэфами {p.name}
                    </span>
                    <span aria-hidden className="text-mute transition-transform group-open/more:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <div className="divide-y divide-edge border-t border-edge">
                    {more.map(({ item, line }) => (
                      <MatchRow key={item.match.id} m={item.match} tags={item.tags} summary={item.summary} line={line} showLeague />
                    ))}
                  </div>
                </details>
              ) : null}
              <div className="border-t border-edge px-4 py-3 text-[13.5px] sm:px-5">
                <Link href={listHref(day.ymd, todayYmd())} className="text-dim transition-colors hover:text-fg">
                  Все матчи {day.when} →
                </Link>
              </div>
            </>
          ) : (
            <p className="max-w-[62ch] px-4 pb-5 text-[15px] leading-relaxed text-fg/85 sm:px-5">
              Кэфы {p.name} на tag.bet пока не сравниваем: их линии нет в наших данных. Коэффициенты — на сайте букмекера.
            </p>
          )}
        </section>

        <section className="card overflow-hidden">
          <BlockHead title={bonus ? 'Как получить бонус' : 'Как зарегистрироваться'} />
          <ol className="space-y-2.5 px-4 pb-5 text-[15px] sm:px-5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-semibold text-fg">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="border-t border-edge px-4 py-3 text-[12px] leading-relaxed text-mute sm:px-5">
            Информация носит справочный характер; условия бонусов устанавливает букмекер и может изменить их в любой момент. 18+.
          </p>
        </section>

        {/* пополнение и вывод — таблицами, как у legalbet (владелец прислал их страницу Winline): только сверенное из
            `facts.deposit` / `facts.withdraw`, с датой сверки; нет данных — блока нет */}
        {f.deposit?.length || f.withdraw?.length ? (
          <section className="card overflow-hidden">
            <BlockHead title="Пополнение и вывод" aside={checked ? `данные на ${checked}` : null} />
            {f.deposit?.length ? <PayTable title="Пополнение" timeLabel="Зачисление" rows={f.deposit} /> : null}
            {f.withdraw?.length ? <PayTable title="Вывод" timeLabel="Срок вывода" rows={f.withdraw} /> : null}
            <p className="mt-2 border-t border-edge px-4 py-3 text-[12px] leading-relaxed text-mute sm:px-5">
              Лимиты, комиссии и сроки устанавливает букмекер и может их изменить — проверяйте в кассе на сайте {domain(p.site)}.
            </p>
          </section>
        ) : null}

        {/* «Вопросы и ответы» — из тех же фактов, что выше (владелец: «нужно больше контента … чтобы поисковики не забанили»):
            вопрос только при ответе, разметка FAQPage для поисковиков */}
        {faq.length ? (
          <section className="card overflow-hidden">
            <BlockHead title="Вопросы и ответы" line />
            <div className="divide-y divide-edge">
              {faq.map((x) => (
                <div key={x.q} className="px-4 py-3.5 sm:px-5">
                  <h3 className="text-[15px] font-semibold">{x.q}</h3>
                  <p className="mt-1 max-w-[72ch] text-[14.5px] leading-relaxed text-fg/80">
                    {x.a}
                    {x.link ? (
                      <>
                        {' '}
                        <Link href={x.link.href} className="text-dim underline decoration-white/25 underline-offset-4 transition-colors hover:text-fg">
                          {x.link.text}
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
                }).replace(/</g, '\\u003c'),
              }}
            />
          </section>
        ) : null}

        {company.length ? (
          <section className="card overflow-hidden">
            <BlockHead title="О компании" aside={checked ? `данные на ${checked}` : null} line />
            <dl className="divide-y divide-edge text-[15px]">
              {company.map(([k, val]) => (
                <div key={k} className="grid gap-0.5 px-4 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
                  <dt className="text-dim">{k}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>
    </>
  )
}

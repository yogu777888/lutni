import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/JsonLd'
import { PageHead } from '@/components/PageHead'
import { Section } from '@/components/Section'
import { SITE } from '@/config/site'

// на каждый запрос, как все страницы: в шапке и подвале — настройки партнёров из env (см. app/layout.tsx)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'О проекте tag.bet',
  description: `Кто делает tag.bet, зачем он нужен, как сайт зарабатывает и как связаться с автором — ${SITE.author.name}.`,
  alternates: { canonical: '/o-proekte' },
}

const P = 'text-[15px] leading-relaxed text-fg/85'
const A = 'underline underline-offset-2 hover:text-fg'

/*
 * «О проекте» (владелец: «я живой чел и я просто пишу код для этой модели», ник — как в Telegram, «@dukkin мой
 * аккаунт и почту пока напиши рандомную, потом добавим»): кто делает сайт, зачем, чем он не является, на что живёт,
 * контакты. Для поисковиков — живой автор с аккаунтом (`Person` с `sameAs`). Ник и почта — `SITE.author` в `config/site.ts`.
 * Реквизиты ИП / самозанятого (для маркировки рекламы) — добавить сюда, когда будут.
 */
export default function AboutProjectPage() {
  const { name, telegram, email } = SITE.author
  const tg = `@${telegram.split('/').pop()}`
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'О проекте tag.bet',
          url: `${SITE.url}/o-proekte`,
          mainEntity: {
            '@type': 'WebSite',
            name: SITE.name,
            url: SITE.url,
            author: { '@type': 'Person', name, email, sameAs: [telegram] },
          },
        }}
      />
      {/* вид остальных простых страниц: без подложки, шапка — PageHead, разделы — панелями; строки — не длиннее ~72 знаков */}
      <span hidden className="bare-sub" />
      <div className="space-y-4 xl:space-y-2 [&_.card_p]:max-w-[72ch] [&_.card_ul]:max-w-[72ch]">
        <PageHead
          title="О проекте"
          sub={<>tag.bet — сайт, на котором удобно следить за футболом: матчи дня, счёт, статистика, коэффициенты и подборки матчей.</>}
        />
        <Section plain title="Кто делает">
          <p className={P}>
            Сайт делает один человек — {name}. Я сам пишу код сайта и его модели: она по одним правилам для каждого матча оценивает шансы
            исходов, сравнивает их с коэффициентами легальных букмекеров и раскладывает матчи по подборкам. Тексты и цифры на страницах
            собираются автоматически, а правила, по которым они считаются, пишу я.
          </p>
        </Section>
        <Section plain title="Зачем">
          <p className={P}>
            Хотелось одно место, где за минуту видно, какие матчи сегодня, кто фаворит, где ждать голов и у какого букмекера коэффициент
            выше, чем стоит исход. Без прогнозов «за подписку» и обещаний заработка — только расчёт, который можно проверить.
          </p>
        </Section>
        <Section plain title="Как это считается">
          <p className={P}>
            Откуда берутся шансы, что такое честный коэффициент и «выгодная ставка», как часто обновляются данные и чего модель не знает —
            на странице{' '}
            <Link href="/about" className={A}>
              «Как работает модель tag.bet»
            </Link>
            . Там же — проверка: насколько показанные шансы сбываются на самом деле.
          </p>
        </Section>
        <Section plain title="Чем сайт не является">
          <ul className={`list-disc space-y-1.5 pl-5 ${P}`}>
            <li>Не букмекер: ставки здесь не принимаются.</li>
            <li>Не продаёт прогнозы и не обещает выигрыш — любая оценка может не сбыться.</li>
            <li>
              Не призыв делать ставки. Ставки — это риск · 18+.{' '}
              <Link href="/responsible-gaming" className={A}>
                Ответственная игра
              </Link>
            </li>
          </ul>
        </Section>
        <Section plain title="На что живёт сайт">
          <p className={P}>
            Сайт бесплатный. Ссылки на букмекеров — партнёрские: если вы перейдёте по ним и зарегистрируетесь, сайт может получить
            вознаграждение. На оценки шансов это не влияет — они считаются по одним правилам для каждого матча. Показываем только легальных
            букмекеров с лицензией ФНС России.
          </p>
        </Section>
        <Section plain title="Связаться">
          <ul className={`space-y-1.5 ${P}`}>
            <li>
              Telegram:{' '}
              <a href={telegram} target="_blank" rel="noopener" className={A}>
                {tg}
              </a>
            </li>
            <li>
              Почта:{' '}
              <a href={`mailto:${email}`} className={A}>
                {email}
              </a>
            </li>
          </ul>
          <p className={`mt-3 ${P}`}>Пишите, если нашли ошибку в данных или расчёте, — поправлю.</p>
        </Section>
      </div>
    </>
  )
}

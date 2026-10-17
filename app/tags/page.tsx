import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHead } from '@/components/PageHead'
import { StorySymbol } from '@/components/story/StorySymbol'
import { getUpcomingFeed } from '@/lib/data'
import { appNow, pluralN, todayYmd, ymdInTz } from '@/lib/format'
import { TAGS } from '@/lib/tags'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Подборки матчей: много голов, фавориты, кэф упал',
  description:
    'Подборки футбольных матчей tag.bet: выгодные ставки, много и мало голов, «обе забьют», явные фавориты, аутсайдеры в форме, серии, травмы. Матчи на сегодня и ближайшие дни.',
  alternates: { canonical: '/tags' },
}

const MATCHES = ['матч', 'матча', 'матчей'] as const

/**
 * «Подборки» — как правая панель (владелец: «страница подборки как?», согласился): было «ТЕГИ СТАВОК» плакатом при пункте
 * меню «Подборки», карточки с чипом, заголовком и подписью об одном и том же, «Ставка: … (1X)», «29 матчей» за три дня
 * вперёд с идущими. Теперь одна панель строками: значок, название (как в панели), состояние — что впереди («5 матчей
 * сегодня», «3 матча завтра», «идут 2 матча», «сейчас матчей нет»), строка пояснения; пустые — в конце.
 */
export default async function TagsPage() {
  const { items } = await getUpcomingFeed(3)
  const now = appNow()
  const today = todayYmd()
  const rows = TAGS.map((t) => {
    const list = items.filter((it) => it.tags.some((x) => x.slug === t.slug))
    const ahead = list.filter((it) => it.match.status === 'scheduled' && it.match.ts > now)
    const live = list.filter((it) => it.match.status === 'live').length
    const todayN = ahead.filter((it) => ymdInTz(it.match.ts) === today).length
    const state = todayN
      ? `${pluralN(todayN, MATCHES)} сегодня`
      : ahead.length
        ? `${pluralN(ahead.length, MATCHES)} в ближайшие дни`
        : live
          ? `${live % 10 === 1 && live % 100 !== 11 ? 'идёт' : 'идут'} ${pluralN(live, MATCHES)}`
          : 'сейчас матчей нет'
    return { t, state, empty: !ahead.length && !live }
  }).sort((a, b) => Number(a.empty) - Number(b.empty))

  return (
    <>
      <span hidden className="bare-sub" />
      <div className="space-y-4 xl:space-y-2">
        <PageHead
          title="Подборки"
          sub="Матчи, собранные по одному признаку: где ждём много голов, где есть явный фаворит, где упал кэф. Признак считается по данным — кэфам букмекеров, форме команд, травмам. Это подсказка, где посмотреть, а не гарантия."
        />
        <section className="card overflow-hidden">
          <ul className="divide-y divide-edge">
            {rows.map(({ t, state, empty }) => (
              <li key={t.slug}>
                <Link href={`/tag/${t.slug}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02] sm:px-5">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] ${empty ? 'text-mute' : ''}`}>
                    <StorySymbol k={t.slug} tone="currentColor" className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] font-semibold ${empty ? 'text-dim' : ''}`}>{t.title}</span>
                    <span className="block text-[13px] leading-snug text-mute">
                      {state} · {t.hint}
                    </span>
                  </span>
                  <span aria-hidden className="text-mute">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

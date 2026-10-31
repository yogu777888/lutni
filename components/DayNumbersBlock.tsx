import type { DayNumbers } from '@/lib/day-numbers'
import { pct, pluralN } from '@/lib/format'
import { BlockMore } from './BlockMore'
import { TenScale } from './TenScale'

/**
 * «Сегодня в цифрах» — средние шансы tag.bet по матчам топ-турниров дня, как курсы валют в новостях (владелец, из переписки
 * с ChatGPT: «им нужно с чем то сравнить… писать средние показатели по матчам на сайте?»): с этим сравнивают «3 гола
 * и больше — 64%» на странице матча («в среднем за день 50%»). Три строки — шанс, шкала из 10 делений; внизу — «Что значат эти
 * проценты» (страница «Почему даже 90% иногда не сбываются»). Выше среднего — не значит выгодно: это про «Выгодно сегодня», ниже.
 * `card` — карточкой (ниже xl, `Sidebar`), иначе — в правой панели.
 */
export function DayNumbersBlock({ n, card = false }: { n: DayNumbers; card?: boolean }) {
  const rows = [
    { k: 'Победа хозяев', p: n.home },
    n.over25 != null ? { k: '3 гола и больше', p: n.over25 } : null,
    n.btts != null ? { k: 'Обе забьют', p: n.btts } : null,
  ].filter((r) => r != null)
  const sub = `Средние шансы по ${pluralN(n.n, ['матчу', 'матчам', 'матчам'])} топ-турниров · по кэфам без маржи`
  return (
    <section className={card ? 'min-w-0' : 'mt-6 border-t border-edge pt-4'}>
      <h3 className={card ? 'px-4 text-[20px] font-bold leading-tight tracking-[-0.01em] sm:px-5' : 'text-[15px] font-semibold'}>Сегодня в цифрах</h3>
      <p className={`${card ? 'mb-2.5 mt-1 px-4 sm:px-5' : 'mt-0.5'} text-[13px] leading-snug text-mute`}>{sub}</p>
      <div className={card ? 'card overflow-hidden' : ''}>
        <ul className={card ? 'px-4 sm:px-5' : 'mt-1'}>
          {rows.map((r) => (
            <li key={r.k} className={`border-edge py-2.5 ${card ? 'border-b last:border-b-0' : ''}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={`${card ? 'text-[15px]' : 'text-[14px]'} text-dim`}>{r.k}</span>
                <span className="num text-[16px] font-semibold">{pct(r.p)}</span>
              </div>
              <TenScale p={r.p} className="mt-2" />
            </li>
          ))}
        </ul>
        <BlockMore href="/veroyatnost" panel={!card}>
          Что значат эти проценты
        </BlockMore>
      </div>
    </section>
  )
}

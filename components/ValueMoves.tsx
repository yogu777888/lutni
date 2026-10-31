import { pct } from '@/lib/format'
import type { ValueScore } from '@/lib/track-record'

/** С какого числа ставок показываем цифры: на десятке ставок сдвиги кэфа — случайность. */
export const VALUE_MIN = 20

const P = 'text-[15px] leading-relaxed text-fg/85'
const abs1 = (x: number) => `${(Math.abs(x) * 100).toFixed(1).replace('.', ',')}%`

/**
 * «Выгодно» вживую на «Истории точности» (владелец согласился: записывать кэф в момент оценки и перед стартом): куда пошёл
 * кэф к началу матча после того, как мы назвали ставку выгодной, и как сбывалось. Только доли и проценты — без «сколько бы
 * заработали» в рублях (ст. 27 закона «О рекламе»).
 */
export function ValueMoves({ v }: { v: ValueScore | null }) {
  const n = v?.n ?? 0
  return (
    <>
      <p className={P}>
        Когда мы называем ставку выгодной, записываем кэф букмекера в этот момент и его же кэф перед самым началом матча. Если к началу
        кэф чаще падает, чем растёт, рынок со временем приходит к нашей честной цене — «Выгодно» находит недооценённое. Если чаще растёт —
        расчёт ошибается. Это проверка расчёта, а не обещание выигрыша.
      </p>
      {v && n >= VALUE_MIN ? (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          <Row k="Ставок «Выгодно» с итогом" v={String(n)} />
          <Row k="К началу матча кэф упал" v={pct(v.down)} sub={`вырос — у ${pct(v.up)}, не изменился — у ${pct(Math.max(0, 1 - v.down - v.up))}`} />
          <Row k="Кэф к началу в среднем" v={v.move >= 0 ? `ниже на ${abs1(v.move)}` : `выше на ${abs1(v.move)}`} />
          <Row k="Давали в среднем" v={pct(v.prob)} sub={`сбылось — ${pct(v.hit)}`} />
        </ul>
      ) : (
        <p className="mt-3 text-[14px] text-dim">
          Цифры появятся, когда наберётся {VALUE_MIN} таких ставок с итогом{n ? ` — сейчас ${n}` : ''}.
        </p>
      )}
    </>
  )
}

function Row({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <li className="flex items-baseline justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-[15px] text-dim">{k}</div>
        {sub ? <div className="text-[13px] text-mute">{sub}</div> : null}
      </div>
      <div className="shrink-0 text-[16px] font-semibold tabular-nums">{v}</div>
    </li>
  )
}

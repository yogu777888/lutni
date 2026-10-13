import { pluralN } from '@/lib/format'

/** «1 матч», «3 матча», «10 матчей». */
export const matchesN = (n: number) => pluralN(n, ['матч', 'матча', 'матчей'])

/**
 * Подпись под названием в обеих боковых панелях — сколько матчей и что с ними сейчас: «10 матчей · 3 в игре» (красным),
 * «6 матчей · с 22:00» (ещё ничего не начиналось), «· в 22:00» (следующий, когда часть уже сыграна), «· все сыграны».
 * Одна схема у турниров слева и подборок справа (владелец согласился: голые цифры справа читались как счётчик
 * непрочитанных, а статичные описания подборок повторяли названия).
 */
export function StateLine({ total, live, next, started }: { total: number; live: number; next: string | null; started: boolean }) {
  const state = live ? null : next ? `${started ? 'в' : 'с'} ${next}` : started ? 'все сыграны' : ''
  return (
    <>
      {matchesN(total)}
      {live || state ? ' · ' : ''}
      {live ? <span className="text-live">{live} в игре</span> : state}
    </>
  )
}

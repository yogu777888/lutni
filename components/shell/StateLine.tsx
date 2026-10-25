import { pluralN } from '@/lib/format'

/** «через 30 мин», «через 1 ч 20 мин», «через 2 ч»; время уже наступило — «вот-вот начнётся». */
export function untilText(min: number) {
  if (min <= 0) return 'вот-вот начнётся'
  if (min < 60) return `через ${min} мин`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `через ${h} ч${m ? ` ${m} мин` : ''}`
}

/** «1 матч», «3 матча», «10 матчей». */
export const matchesN = (n: number) => pluralN(n, ['матч', 'матча', 'матчей'])

/** «идёт 1 матч», «идут 3 матча», «идут 21 матч» — сколько идёт сейчас (и в шапке лиги в центре). */
export function liveText(n: number) {
  return `${n % 10 === 1 && n % 100 !== 11 ? 'идёт' : 'идут'} ${matchesN(n)}`
}

/**
 * Подпись под названием в обеих боковых панелях — законченная фраза о том, что сейчас и что впереди; число — только
 * внутри фразы, где оно отвечает на вопрос (владелец: «а сами подписи вообще норм? такие нужны?» — «10 матчей ·» в начале
 * каждой строки ни на что не влияло, все строки начинались одинаково, а разница уходила в хвост; общее число — в подсказке):
 * «идут 3 матча» / «ещё 2 матча в 21:00» (все оставшиеся в одно время) / «ещё 4 матча с 20:00» / «начало в 20:00»
 * (ничего ещё не начиналось) / «идут все 4» / «все сыграны»; у «Скоро начнутся» — «через 30 мин». Слева важнее, что идёт
 * (турниры), справа (`ahead`) — что впереди (подборки).
 */
export function StateLine(props: StateProps) {
  return <>{stateText(props)}</>
}

type StateProps = {
  total: number
  live: number
  next: string | null
  started: boolean
  pending: number
  /** все не начавшиеся — в одно время: «ещё 2 матча в 21:00», а не «с 21:00» */
  same?: boolean
  inMin?: number | null
  /** «Скоро начнутся»: сколько осталось до первого матча — «через 30 мин» (больше трёх часов — «начало в 22:00») */
  soon?: boolean
  /** подборки справа: впереди важнее, чем «идут» (идущие и так слева в «Сейчас идут») */
  ahead?: boolean
}

/** То же, что `StateLine`, строкой — для подсказок. */
export function stateText({
  total,
  live,
  next,
  started,
  pending,
  same = false,
  inMin = null,
  soon = false,
  ahead = false,
}: StateProps) {
  if (soon && next && !live && inMin != null && inMin <= 180) return untilText(inMin)
  // идут все — «идут все 4» / «идёт 1 матч»
  if (live && live === total) return total === 1 ? 'идёт 1 матч' : `идут все ${total}`
  const rest = next ? (started ? `ещё ${matchesN(pending)} ${same ? 'в' : 'с'} ${next}` : `начало в ${next}`) : null
  const now = live ? liveText(live) : null
  const text = (ahead ? rest ?? now : now ?? rest) ?? (started ? 'все сыграны' : '')
  return text
}

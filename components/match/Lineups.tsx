import { ICONS } from '@/components/NavIcon'
import { TeamLogo } from '@/components/TeamLogo'
import { surname, type LineupPlayer, type Lineups as LineupsData, type TeamLineup } from '@/lib/sstats/ls'
import { Tabs } from './Tabs'

type Side = { name: string; logo: string | null }

/** Мяч у игрока — тот же знак, что «Матчи» в нижнем меню (Phosphor, MIT) */
const BALL = ICONS['/'][1]

/** Оценка — белой пилюлей у лучшего в матче, у остальных — тихой (лайм у нас только про деньги и «выгодно»). */
function Rating({ p }: { p: LineupPlayer }) {
  if (p.rating == null) return null
  return (
    <span
      className={`num absolute -right-3 -top-1.5 rounded-full px-1 text-[10.5px] font-semibold leading-[15px] ${p.best ? 'bg-fg text-ink' : 'bg-[#2a333d] text-fg'}`}
    >
      {p.rating.toFixed(1)}
    </span>
  )
}

/** Игрок на поле: кружок с номером цветом клуба, фамилия, у кружка — оценка, мяч за гол, карточка, замена. */
function Dot({ p, away }: { p: LineupPlayer; away: boolean }) {
  const hint = [
    p.name,
    p.number ? `№ ${p.number}` : null,
    p.captain ? 'капитан' : null,
    p.rating != null ? `оценка ${p.rating.toFixed(1)}` : null,
    p.goals ? `голы: ${p.goals}` : null,
    p.assists ? `голевые передачи: ${p.assists}` : null,
    p.subOut ? `заменён на ${p.subOut}′` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <li title={hint} className="flex w-0 min-w-0 flex-1 flex-col items-center">
      <span className="relative">
        <span
          className={`num grid h-8 w-8 place-items-center rounded-full border-2 bg-panel text-[13px] font-semibold ${p.subOut ? 'opacity-70' : ''}`}
          style={{ borderColor: away ? 'var(--club-a, #fff)' : 'var(--club-h, #fff)' }}
        >
          {p.number ?? ''}
        </span>
        <Rating p={p} />
        {p.goals || p.ownGoals ? (
          <span className="absolute -left-2.5 -top-1.5 flex" aria-hidden>
            {Array.from({ length: Math.min(3, p.goals + p.ownGoals) }, (_, i) => (
              <svg key={i} viewBox="0 0 24 24" width={14} height={14} className={`rounded-full bg-fg text-ink ${i ? '-ml-1.5' : ''}`}>
                <path d={BALL} fill="currentColor" fillRule="evenodd" />
              </svg>
            ))}
          </span>
        ) : null}
        {p.red || p.yellow ? (
          <span aria-hidden className={`absolute -bottom-0.5 -left-2 h-3 w-2 rounded-[2px] ${p.red ? 'bg-live' : 'bg-[#f5c518]'}`} />
        ) : null}
        {p.subOut ? (
          <span aria-hidden className="num absolute -bottom-1.5 -right-3.5 rounded-full bg-[#2a333d] px-1 text-[10.5px] leading-[15px] text-dim">
            {p.subOut}′
          </span>
        ) : null}
      </span>
      <span className="mt-1.5 w-full truncate text-center text-[13px] leading-tight text-fg/90">
        {surname(p.name)}
        {p.captain ? <span className="text-mute"> (к)</span> : null}
      </span>
    </li>
  )
}

/**
 * Половина поля: вратарь у своих ворот, нападение — у центральной линии. У гостей (снизу) — зеркально; `flip` — вратарь
 * снизу при любой команде (на телефоне поле одной команды: атака сверху, как в прототипе владельца).
 */
function Half({ t, away, flip = away }: { t: TeamLineup; away: boolean; flip?: boolean }) {
  const rows = flip ? [...t.rows].reverse() : t.rows
  return (
    <div className={`flex flex-col justify-between gap-3 px-2 ${flip ? 'pb-4 pt-6' : 'pb-6 pt-4'}`}>
      {rows.map((row, i) => (
        <ul key={i} className="flex justify-around">
          {(flip ? [...row].reverse() : row).map((p, j) => (
            <Dot key={`${p.name}-${j}`} p={p} away={away} />
          ))}
        </ul>
      ))}
    </div>
  )
}

function TeamHead({ side, t, away }: { side: Side; t: TeamLineup; away?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamLogo name={side.name} src={side.logo} size={24} />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{side.name}</span>
      {t.formation ? (
        <span className="num shrink-0 text-[14px] text-dim" title="Схема">
          {t.formation}
        </span>
      ) : null}
      {/* средняя оценка игроков — после начала (`averageRating` в /Ls/GameLineups) */}
      {t.avg != null ? (
        <span className="num shrink-0 rounded-full bg-[#2a333d] px-2 text-[13px] font-semibold leading-6" title="Средняя оценка игроков">
          {t.avg.toFixed(1).replace('.', ',')}
        </span>
      ) : null}
      <span className="sr-only">{away ? '— гости' : '— хозяева'}</span>
    </div>
  )
}

/** Запасные: кто вышел — с минутой «↑ 63′» и оценкой, кто нет — тише. */
function Bench({ t }: { t: TeamLineup }) {
  const list = [...t.bench].sort((a, b) => Number(b.subIn != null) - Number(a.subIn != null) || (a.subIn ?? 0) - (b.subIn ?? 0))
  return (
    <ul className="space-y-1.5">
      {list.map((p, i) => (
        <li key={`${p.name}-${i}`} className={`flex items-baseline gap-2 text-[14px] ${p.subIn != null ? '' : 'text-mute'}`} title={p.name}>
          <span className="num w-6 shrink-0 text-right text-[13px] text-mute">{p.number ?? ''}</span>
          <span className="min-w-0 flex-1 truncate">{p.name}</span>
          {p.subIn != null ? <span className="num shrink-0 text-[13px] text-dim">↑ {p.subIn}′</span> : null}
          {p.rating != null ? <span className="num shrink-0 text-[13px] text-dim">{p.rating.toFixed(1)}</span> : null}
        </li>
      ))}
    </ul>
  )
}

/**
 * «Составы» — из `/Ls/GameLineups` (владелец: «сделай всё»): поле сверху вниз, как у Apple Sports и Sofascore на
 * телефоне, — хозяева в верхней половине, гости в нижней, у каждой схема; у игрока — номер в кружке цветом клуба
 * (`ClubVars`), фамилия, после начала — оценка (лучшая в матче — белой пилюлей), голы мячом, карточка, минута замены.
 * Ниже — запасные двумя колонками и тренеры (на компьютере — колонкой справа от поля). Кто не сыграет — в «Кадровых потерях», здесь не повторяем.
 */
export function Lineups({ data, home, away }: { data: LineupsData; home: Side; away: Side }) {
  const coach = (t: TeamLineup, s: Side) => (t.coach ? `${s.name} — ${t.coach}` : null)
  const coaches = [coach(data.home, home), coach(data.away, away)].filter(Boolean)
  return (
    // от 48rem ширины блока (компьютер) запасные и тренеры — колонкой справа от поля, а не под ним: блок вдвое ниже
    <div className="@container">
      <div className="mx-auto max-w-xl @3xl:grid @3xl:max-w-none @3xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] @3xl:gap-x-8">
      <div>
      {/* от sm — обе команды на одном поле; на телефоне поле ~560px — по одной команде с переключателем (вдвое короче) */}
      <div className="hidden sm:block">
        <TeamHead side={home} t={data.home} />
        {/* поле: черта по центру, круг, штрафные у ворот */}
        <div className="relative mt-3 overflow-hidden rounded-tile bg-white/[0.03] ring-1 ring-inset ring-white/[0.08]">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-white/[0.08]" />
          <span aria-hidden className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]" />
          <span aria-hidden className="absolute left-1/2 top-0 h-12 w-2/5 -translate-x-1/2 border-x border-b border-white/[0.08]" />
          <span aria-hidden className="absolute bottom-0 left-1/2 h-12 w-2/5 -translate-x-1/2 border-x border-t border-white/[0.08]" />
          <div className="relative grid min-h-[620px] grid-rows-2">
            <Half t={data.home} away={false} />
            <Half t={data.away} away />
          </div>
        </div>
        <div className="mt-3">
          <TeamHead side={away} t={data.away} away />
        </div>
      </div>
      <Tabs
        small
        className="sm:hidden"
        panelClassName="mt-4"
        items={([['home', home, data.home, false], ['away', away, data.away, true]] as const).map(([key, side, t, isAway]) => ({
          key,
          label: side.name,
          content: (
            <>
              <TeamHead side={side} t={t} away={isAway} />
              {/* половина поля: центральный круг сверху, штрафная у ворот снизу */}
              <div className="relative mt-3 overflow-hidden rounded-tile bg-white/[0.03] ring-1 ring-inset ring-white/[0.08]">
                <span aria-hidden className="absolute left-1/2 top-0 h-10 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]" />
                <span aria-hidden className="absolute bottom-0 left-1/2 h-12 w-2/5 -translate-x-1/2 border-x border-t border-white/[0.08]" />
                <div className="relative grid min-h-[300px]">
                  <Half t={t} away={isAway} flip />
                </div>
              </div>
              {/* запасные — той же команды, что на поле */}
              {t.bench.length ? (
                <div className="mt-5 border-t border-edge pt-4">
                  <p className="mb-2.5 text-[13px] text-mute">Запасные</p>
                  <Bench t={t} />
                </div>
              ) : null}
            </>
          ),
        }))}
      />
      </div>
      <div className="mt-5 border-t border-edge pt-4 max-sm:mt-4 max-sm:border-0 max-sm:pt-0 @3xl:mt-0 @3xl:border-0 @3xl:pt-0">
        <p className="hidden text-[13px] text-mute sm:block">Запасные</p>
        <div className="mt-2.5 hidden gap-x-6 gap-y-4 sm:grid sm:grid-cols-2 @3xl:grid-cols-1 @3xl:gap-y-5">
          <div>
            <p className="mb-1.5 hidden truncate text-[13px] font-semibold text-dim @3xl:block">{home.name}</p>
            <Bench t={data.home} />
          </div>
          <div>
            <p className="mb-1.5 hidden truncate text-[13px] font-semibold text-dim @3xl:block">{away.name}</p>
            <Bench t={data.away} />
          </div>
        </div>
        {coaches.length ? <p className="text-[13px] text-mute sm:mt-4 @3xl:mt-5">Тренеры: {coaches.join(' · ')}</p> : null}
      </div>
      </div>
    </div>
  )
}

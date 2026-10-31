'use client'

import { useEffect, useState } from 'react'
import { SPONSORED_REL } from '@/lib/affiliate'
import { valueThreshold } from '@/lib/model'
import type { CompareRow, FormSide, Side, StoryData, StorySlide, StoryTeam } from '@/lib/story'
import type { StoryFocus } from '@/lib/story-groups'
import { split100 } from '@/lib/verdict'
import { TeamLogo } from '../TeamLogo'
import { ClubVars } from '../match/ClubVars'
import { ResBadge } from '../match/FormStrip'
import { MirrorBars, mirrorWidths } from '../match/SplitBar'

/**
 * Слайды сторис. Графики — обычные div/SVG с CSS-анимациями из globals.css
 * (st-*): анимация стартует, когда слайд монтируется. Цвета — как на странице матча: у кого лучше —
 * полоса цветом своего клуба, у другого — серая (`MirrorBars`, `ClubVars`), форма — В/Н/П цветом (`ResBadge`);
 * лайм — только «выгодно» и переход к букмекеру, красный — только «идёт».
 */

type S<K extends StorySlide['kind']> = Extract<StorySlide, { kind: K }>

/** Сколько показывать слайд, мс (на прогноз — дольше: там решение и кнопка). */
export const SLIDE_MS: Record<StorySlide['kind'], number> = {
  cover: 4500,
  odds: 7000,
  goals: 7500,
  form: 8000,
  stats: 8500,
  goalsTimeline: 7500,
  pick: 10000,
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useCountUp(target: number, duration: number, delay: number) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (reducedMotion()) {
      setV(target)
      return
    }
    let raf = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      setV(target * (1 - (1 - t) ** 3))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])
  return v
}

/** Число, которое «набегает» от нуля. Для скринридеров — сразу итоговое значение. */
function Num({
  value,
  format,
  delay = 0,
  duration = 1100,
  className = '',
}: {
  value: number
  format: (v: number) => string
  delay?: number
  duration?: number
  className?: string
}) {
  const v = useCountUp(value, duration, delay)
  return (
    <span className={`num ${className}`}>
      <span aria-hidden>{format(v)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}

const pctFmt = (v: number) => `${Math.round(v * 100)}%`
const dec = (v: number, d = 1) => v.toFixed(d).replace('.', ',')
const intFmt = (v: number) => String(Math.round(v))
const wait = (ms: number) => ({ animationDelay: `${ms}ms` })

/** Слайд с данными: заголовок и данные — одной группой, данные сразу под заголовком (не по центру оставшегося места —
 *  висели в пустоте). На телефоне и планшете группа — по середине экрана: сверху она оставляла пустыми три четверти
 *  высокого экрана (владелец: «истории на телефоне как то коряво выглядят»); не влезает — прокрутки нет, отступы 0. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col px-5 pb-2 pt-3">
      <div className="max-lg:my-auto max-lg:pb-6">{children}</div>
    </div>
  )
}

function Head({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="shrink-0">
      <div className="st-rise text-[13px] font-semibold text-dim">{eyebrow}</div>
      <h2 className="st-rise mt-1 text-[20px] font-bold leading-[1.2] tracking-tight" style={wait(80)}>
        {title}
      </h2>
      {sub ? (
        <p className="st-rise mt-1.5 text-[14px] leading-snug text-dim" style={wait(160)}>
          {sub}
        </p>
      ) : null}
    </div>
  )
}

/** Внутренний блок — как на странице матча («Давление команд», «Прогноз»): плашка `white/4` с полями 16px. */
function Card({ children, delay = 200, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div className={`st-rise rounded-tile bg-white/[0.04] p-4 ${className}`} style={wait(delay)}>
      {children}
    </div>
  )
}

/** Шапка сравнения — как `TeamHead` у «Статистики» и «Формы команд»: эмблема 28px и название, гости — зеркально. */
function Legend({ story }: { story: StoryData }) {
  const team = (t: StoryTeam, right: boolean) => (
    <span className={`flex min-w-0 items-center gap-2.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="shrink-0">
        <TeamLogo name={t.name} src={t.logo} size={28} />
      </span>
      {/* до двух строк: «Райо Вальек…» рядом с «Реал Сосьед…» не читалось */}
      <span className="line-clamp-2 break-words text-[16px] font-semibold leading-tight">{t.name}</span>
    </span>
  )
  return (
    <div className="grid grid-cols-2 gap-3">
      {team(story.home, false)}
      {team(story.away, true)}
    </div>
  )
}

/**
 * Строка сравнения — разметкой `Row` из «Статистики» на странице матча: цифры по краям (у кого лучше — белым жирным,
 * у другого — серым), подпись по центру, под ней зеркальная полоса `MirrorBars`: у кого лучше — цветом своего клуба,
 * у другого — серая (владелец: «в матче у нас если команда сильнее то график окрашивается в цвет команды»).
 */
function CmpRow({ r, first, delay }: { r: CompareRow; first: boolean; delay: number }) {
  const better = (v: number, o: number) => (r.neutral ? v < o : v > o)
  const lead = r.home === r.away ? null : better(r.home, r.away) ? 'home' : 'away'
  const num = (side: Side) => (
    <span className={`num min-w-0 text-[16px] leading-snug ${side === 'away' ? 'text-right' : ''} ${lead === side ? 'font-bold text-fg' : lead ? 'font-semibold text-dim' : 'font-semibold text-fg'}`}>
      {r.text[side === 'home' ? 0 : 1]}
    </span>
  )
  return (
    <li className={`st-rise py-2 ${first ? '' : 'border-t border-edge'}`} style={wait(delay)}>
      <div className="grid grid-cols-[minmax(3rem,1fr)_minmax(0,auto)_minmax(3rem,1fr)] items-baseline gap-x-2">
        {num('home')}
        <span className="text-balance text-center text-[14px] leading-snug text-dim">{r.label}</span>
        {num('away')}
      </div>
      <div className="mt-2">
        <MirrorBars widths={mirrorWidths(r.home, r.away, !!r.abs)} lead={lead} />
      </div>
    </li>
  )
}

function CmpRows({ rows, base = 300 }: { rows: CompareRow[]; base?: number }) {
  return (
    <ul className="mt-2">
      {rows.map((r, i) => (
        <CmpRow key={r.label} r={r} first={i === 0} delay={base + i * 90} />
      ))}
    </ul>
  )
}

// ─── Обложка ─────────────────────────────────────────────────────────────────

function TeamBig({ team, cls }: { team: StoryTeam; cls: string }) {
  return (
    <div className={`${cls} flex min-w-0 flex-col items-center gap-3`} style={wait(120)}>
      <div className="rounded-full bg-white/[0.08] p-3">
        <TeamLogo name={team.name} src={team.logo} size={64} />
      </div>
      <span className="line-clamp-2 text-[17px] font-bold leading-tight">{team.name}</span>
    </div>
  )
}

function Cover({ s, story, focus, lead }: { s: S<'cover'>; story: StoryData; focus: StoryFocus | null; lead: boolean }) {
  const live = story.status === 'live' || story.status === 'suspended'
  const score = story.score && (live || story.status === 'finished') ? story.score : null
  // открыли из подборки («Серия», «Кэф упал»…) — первым крупно ответ, почему матч в ней (владелец: «чтобы был ответ на вопрос,
  // а не просто статистика»): «Команда «Барселона» выиграла 5 матчей подряд»; вывод — строкой ниже, подборка в списке не повторяется
  // только у историй-подборок (`lead`): у «Главных» повод — лучший тег матча, а не признак истории — там крупно вывод
  const hit = lead && focus ? s.tags.find((t) => t.slug === focus.slug) : undefined
  const answer = hit ? (hit.slug === 'value' ? hit.short : hit.reason) : lead ? focus?.reason || null : null
  const tags = s.tags.filter((t) => t.slug !== focus?.slug).slice(0, answer ? 2 : 3)
  const time = story.when.match(/\d{1,2}:\d{2}/)?.[0] ?? null
  const day = story.when.split(',')[0]
  const b = s.before
  return (
    <div className="flex h-full flex-col items-center px-6 pb-4 pt-5 text-center">
      <div className="st-fade text-[13px] text-dim">
        {story.league}
        {story.round ? ` · ${story.round}` : ''}
      </div>
      <div className="my-auto w-full">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <TeamBig team={story.home} cls="st-slide-l" />
          <div className="st-pop flex h-[90px] flex-col items-center justify-center px-1" style={wait(350)}>
            {score ? (
              <span className="num display-num text-[46px] leading-none">
                {score.home}
                <span className="mx-1 text-dim">:</span>
                {score.away}
              </span>
            ) : (
              <span className="num display-num text-[36px] leading-none">{time ?? '—'}</span>
            )}
            <span className={`mt-1.5 text-[13px] font-semibold ${live ? 'text-live' : 'text-dim'}`}>
              {live ? `${story.elapsed ?? ''}′` : story.status === 'finished' ? 'итог' : day}
            </span>
          </div>
          <TeamBig team={story.away} cls="st-slide-r" />
        </div>
        {answer ? (
          <p className="st-rise mx-auto mt-6 max-w-[21rem] text-[20px] font-bold leading-snug" style={wait(500)}>
            {answer}
          </p>
        ) : null}
        {s.verdict && answer ? (
          <p className="st-rise mx-auto mt-3 max-w-[21rem] text-[15px] leading-snug text-dim" style={wait(600)}>
            {s.verdict}
          </p>
        ) : s.verdict ? (
          <p className="st-rise mx-auto mt-6 max-w-[20rem] text-[20px] font-bold leading-snug" style={wait(500)}>
            {s.verdict}
          </p>
        ) : null}
        {b ? (
          <p className="st-rise mx-auto mt-6 max-w-[21rem] text-[14px] leading-relaxed text-dim" style={wait(500)}>
            До матча: <span className="whitespace-nowrap">«{story.home.name}» {b.home}% ·</span> <span className="whitespace-nowrap">ничья {b.draw}% ·</span>{' '}
            <span className="whitespace-nowrap">«{story.away.name}» {b.away}%</span>
          </p>
        ) : null}
        {tags.length ? (
          <ul className="st-rise mx-auto mt-5 max-w-[21rem] divide-y divide-white/10 rounded-tile bg-white/[0.04] text-left" style={wait(650)}>
            {tags.map((t) => (
              <li key={t.slug} className="px-3.5 py-2.5 text-[14px] leading-snug">
                <span className="font-semibold">{t.title}</span>
                <span className="text-fg/75"> — {t.short}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="st-fade flex items-center gap-1.5 text-[13px] text-dim" style={wait(1000)}>
        {s.teaser}
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 animate-pulse fill-none stroke-current" strokeWidth="2" aria-hidden>
          <path d="m6 3 5 5-5 5" />
        </svg>
      </p>
    </div>
  )
}

// ─── Кто фаворит: оценка tag.bet и кэфы партнёра ─────────────────────────────

function Odds({ s, story }: { s: S<'odds'>; story: StoryData }) {
  // проценты исходов — в сумме ровно 100; ярче — самый вероятный, как полосы на странице матча
  const n = split100(s.probs)
  const keys = ['home', 'draw', 'away'] as const
  const name = { home: story.home.name, draw: 'Ничья', away: story.away.name }
  const max = Math.max(s.probs.home, s.probs.draw, s.probs.away)
  return (
    <Frame>
      <Head eyebrow="Кто фаворит" title={s.title} sub={s.sub} />
      <Card className="mt-5">
        <div className="grid h-[min(24dvh,190px)] grid-cols-3 items-end gap-3 border-b border-white/15">
          {keys.map((k, i) => (
            <div key={k} className="flex h-full flex-col items-center justify-end">
              <Num
                value={n[k] / 100}
                format={pctFmt}
                delay={300 + i * 120}
                className={`display-num mb-1.5 leading-none ${s.probs[k] === max ? 'text-[44px]' : 'text-[26px] text-fg/70'}`}
              />
              {/* самый вероятный — цветом клуба, как лучшая сторона полос на странице матча; ничья — белым; остальные серые */}
              <div
                className={`st-grow-y w-full rounded-t-[6px] ${s.probs[k] !== max ? 'bg-white/20' : k === 'draw' ? 'bg-fg/85' : `club-bar-${k[0]}`}`}
                style={{ height: `${Math.max(3, (s.probs[k] / max) * 80)}%`, ...wait(300 + i * 120) }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          {keys.map((k) => {
            const odd = s.line?.odds[k] ?? null
            const value = odd != null && odd / s.fair[k] - 1 >= valueThreshold(odd)
            return (
              <div key={k} className="min-w-0">
                {/* название до двух строк: «Райо Валье…» не читалось */}
                <div className="flex min-h-[36px] flex-col items-center justify-start gap-1 text-[14px] font-semibold leading-tight">
                  <span className="line-clamp-2 break-words">{name[k]}</span>
                </div>
                <div className="num mt-1 text-[13px] text-dim">честная {s.fair[k].toFixed(2)}</div>
                {s.line && odd ? (
                  <a
                    href={s.line.href}
                    target="_blank"
                    rel={SPONSORED_REL}
                    title={`${name[k]}: ${odd.toFixed(2)} в ${s.line.partner} · Реклама 18+`}
                    className={`num mt-2 flex h-10 items-center justify-center rounded-ctl text-[16px] font-bold transition-colors ${
                      value ? 'bg-acid text-acid-ink hover:bg-acid/90' : 'bg-white/[0.08] hover:bg-white/[0.14]'
                    }`}
                  >
                    {odd.toFixed(2)}
                  </a>
                ) : null}
              </div>
            )
          })}
        </div>
        {s.line ? <p className="mt-3 text-center text-[12px] text-dim">Кэфы {s.line.partner} · Реклама · 18+</p> : null}
      </Card>
      {/* время снимка линии, по которой считана оценка (владелец, из переписки: «Внутри истории показывать текущий процент
          и «Обновлено в 14:02»»); в старом кэше поля нет */}
      {s.updated ? <p className="st-fade mt-3 text-center text-[13px] text-mute">{s.updated}</p> : null}
    </Frame>
  )
}

// ─── Голы и вероятный счёт ───────────────────────────────────────────────────

/** Шанс строкой с полосой от края до края — как «Голы и счёт» на странице матча (кольца похожи на значок загрузки). */
function ChanceLine({ p, label, delay }: { p: number; label: string; delay: number }) {
  return (
    <div className="st-rise border-t border-edge py-2.5" style={wait(delay)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[15px] font-semibold">{label}</span>
        <Num value={p} format={pctFmt} delay={delay} className="text-[16px] font-bold" />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.09]">
        <div className="st-grow-x h-full rounded-full bg-fg/85" style={{ width: `${p * 100}%`, ...wait(delay + 100) }} />
      </div>
    </div>
  )
}

function Goals({ s, story }: { s: S<'goals'>; story: StoryData }) {
  // голы команд — строкой сравнения: у кого больше — цветом клуба
  const teams = s.teams ? compare('Голы команд', s.teams.home, s.teams.away, (v) => dec(v)) : null
  return (
    <Frame>
      <Head eyebrow="Голы" title={s.title} sub={s.sub} />
      {/* главная цифра слайда — сколько голов ждём, крупно, как счёт на сайте */}
      <div className="st-pop mt-5 flex items-baseline gap-3" style={wait(200)}>
        <Num value={s.total} format={(v) => dec(v)} delay={200} className="display-num text-[56px] leading-none" />
        <span className="text-[15px] font-semibold text-dim">гола ждём в среднем</span>
      </div>
      <Card className="mt-4 !pb-2" delay={300}>
        {teams ? (
          <>
            <Legend story={story} />
            <CmpRows rows={[teams]} base={350} />
          </>
        ) : null}
        {s.over25 != null ? <ChanceLine p={s.over25} label="3 гола и больше" delay={450} /> : null}
        {s.btts != null ? <ChanceLine p={s.btts} label="Обе забьют" delay={550} /> : null}
      </Card>
    </Frame>
  )
}

const compare = (label: string, home: number, away: number, fmt: (v: number) => string, neutral = false): CompareRow => ({
  label,
  home,
  away,
  text: [fmt(home), fmt(away)],
  neutral,
})

// ─── Форма ───────────────────────────────────────────────────────────────────

/** Форма — как «Форма команд» на странице матча: строки сравнения с полосами и последние 5 матчей значками В/Н/П цветом. */
function Form({ s, story }: { s: S<'form'>; story: StoryData }) {
  const h = s.home
  const a = s.away
  const rows =
    h && a
      ? [
          compare('Очки из 15', h.points5, a.points5, intFmt),
          compare('Забивает за игру', h.gfAvg, a.gfAvg, (v) => dec(v)),
          compare('Пропускает за игру', h.gaAvg, a.gaAvg, (v) => dec(v), true),
        ]
      : []
  // в данных свежие первыми, на экране — слева направо по времени (свежий справа)
  const strip = (f: FormSide | null, right: boolean, base: number) =>
    f ? (
      <div className={`flex gap-1.5 ${right ? 'justify-end' : ''}`}>
        {[...f.last5].reverse().map((r, i) => (
          <span key={i} className="st-pop" style={wait(base + i * 70)}>
            <ResBadge r={r} />
          </span>
        ))}
      </div>
    ) : (
      <span className={`text-[13px] text-dim ${right ? 'text-right' : ''}`}>нет свежих матчей</span>
    )
  const note = (f: FormSide | null, right: boolean) => (
    <span className={`min-w-0 truncate text-[13px] text-dim ${right ? 'text-right' : ''}`}>{f?.note ?? ''}</span>
  )
  return (
    <Frame>
      <Head eyebrow="Форма" title={s.title} sub={s.sub} />
      <Card className="mt-5 !pb-3" delay={250}>
        <Legend story={story} />
        {h?.note || a?.note ? (
          <div className="mt-1 grid grid-cols-2 gap-3 pl-[38px] pr-[38px]">
            {note(h, false)}
            {note(a, true)}
          </div>
        ) : null}
        <CmpRows rows={rows} base={350} />
        <div className="st-rise border-t border-edge pt-3" style={wait(650)}>
          <div className="text-center text-[13px] text-dim">Последние 5 матчей</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {strip(h, false, 700)}
            {strip(a, true, 700)}
          </div>
        </div>
      </Card>
    </Frame>
  )
}

// ─── Статистика: строки, как «Статистика» на странице матча ──────────────────

function Stats({ s, story }: { s: S<'stats'>; story: StoryData }) {
  return (
    <Frame>
      <Head eyebrow="Статистика" title={s.title} sub={s.sub} />
      <Card className="mt-5 !pb-2" delay={200}>
        <Legend story={story} />
        <CmpRows rows={s.rows} base={280} />
      </Card>
    </Frame>
  )
}

// ─── Голы по ходу матча ──────────────────────────────────────────────────────

function GoalsTimeline({ s, story }: { s: S<'goalsTimeline'>; story: StoryData }) {
  let h = 0
  let a = 0
  const rows = s.goals.map((g) => {
    if (g.side === 'home') h++
    else a++
    return { ...g, score: `${h}:${a}` }
  })
  const shown = rows.slice(0, 7)
  // у автора гола — точка цветом клуба, которому засчитан гол (как пунктир гола в «Давлении команд»)
  const label = (g: (typeof rows)[number]) => (
    <span className={`inline-flex max-w-full items-center gap-2 ${g.side === 'home' ? 'flex-row-reverse text-right' : ''}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full club-bar-${g.side[0]}`} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold">{g.player || (g.kind === 'own-goal' ? 'Автогол' : 'Гол')}</span>
        {g.kind === 'penalty' ? <span className="block text-[12px] text-dim">с пенальти</span> : g.kind === 'own-goal' && g.player ? <span className="block text-[12px] text-dim">автогол</span> : null}
      </span>
    </span>
  )
  return (
    <Frame>
      <Head eyebrow="Голы" title={s.title} sub={s.sub} />
      <Card className="mt-5" delay={200}>
        <Legend story={story} />
        <ul className="mt-3">
          {shown.map((g, i) => (
            <li key={i} className="st-rise grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-edge py-2.5" style={wait(300 + i * 160)}>
              <span className="flex min-w-0 justify-end">{g.side === 'home' ? label(g) : null}</span>
              <span className="num flex w-14 flex-col items-center">
                <span className="display-num text-[20px] leading-none">{g.score}</span>
                <span className="mt-1 text-[12px] text-dim">{g.label}</span>
              </span>
              <span className="flex min-w-0">{g.side === 'away' ? label(g) : null}</span>
            </li>
          ))}
        </ul>
        {rows.length > shown.length ? <p className="mt-1 text-center text-[13px] text-dim">и ещё {rows.length - shown.length} — в разборе матча</p> : null}
      </Card>
    </Frame>
  )
}

// ─── Прогноз ─────────────────────────────────────────────────────────────────

function PickSlide({ s }: { s: S<'pick'> }) {
  // у выгодной ставки — суть перевеса: наш шанс выше того, что заложен в кэф
  const bars = [
    { key: 'model', label: 'Шанс по кэфам без маржи', p: s.prob, cls: s.value ? 'bg-acid' : 'bg-fg/85' },
    ...(s.odd ? [{ key: 'book', label: `Шанс, заложенный в кэф ${s.odd.toFixed(2)}`, p: 1 / s.odd, cls: 'bg-white/30' }] : []),
  ]
  const tiles = [
    { k: 'Честная цена', v: s.fairOdd.toFixed(2), cls: '' },
    ...(s.odd ? [{ k: s.bookmaker ? `Кэф ${s.bookmaker}` : 'Кэф', v: s.odd.toFixed(2), cls: '' }] : []),
    ...(s.value && s.ev != null ? [{ k: 'Выгода', v: `+${dec(s.ev * 100)}%`, cls: 'text-good' }] : []),
  ]
  return (
    <Frame>
      <div className="st-rise text-[13px] font-semibold text-dim">{s.value ? 'Выгодная ставка' : 'Наш выбор'}</div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className={`st-pop max-w-[20rem] text-[32px] font-bold leading-[1.1] tracking-tight ${s.value ? 'text-good' : ''}`} style={wait(150)}>
          {s.label}
        </div>
        <p className="st-rise mt-2 max-w-[19rem] text-[16px] font-semibold leading-snug text-fg/90" style={wait(300)}>
          {s.desc}
        </p>
        <div className="mt-6 w-full space-y-3 text-left">
          {bars.map((b, i) => (
            <div key={b.key} className="st-rise" style={wait(450 + i * 150)}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-semibold text-fg/90">{b.label}</span>
                <Num value={b.p} format={(v) => `${Math.round(v * 100)}%`} delay={450 + i * 150} className="text-[16px] font-bold" />
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.09]">
                <div className={`st-grow-x h-full rounded-full ${b.cls}`} style={{ width: `${b.p * 100}%`, ...wait(450 + i * 150) }} />
              </div>
            </div>
          ))}
        </div>
        <dl className="st-rise mt-5 grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`, ...wait(750) }}>
          {tiles.map((t) => (
            <div key={t.k} className="rounded-tile bg-white/[0.06] px-1 py-2">
              <dt className="truncate text-[11px] text-dim">{t.k}</dt>
              <dd className={`num text-[17px] font-bold ${t.cls}`}>{t.v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-mute">Шанс, а не гарантия результата · 18+</p>
      </div>
    </Frame>
  )
}

export function Slide({ slide, story, focus = null, lead = false }: { slide: StorySlide; story: StoryData; focus?: StoryFocus | null; lead?: boolean }) {
  // цвета клубов матча — переменными для полос (`.club-bar-h/-a`), как на странице матча; пока не догрузились — серые
  return (
    <ClubVars id={story.id} ymd={story.ymd} className="h-full">
      <SlideBody slide={slide} story={story} focus={focus} lead={lead} />
    </ClubVars>
  )
}

function SlideBody({ slide, story, focus, lead }: { slide: StorySlide; story: StoryData; focus: StoryFocus | null; lead: boolean }) {
  switch (slide.kind) {
    case 'cover':
      return <Cover s={slide} story={story} focus={focus} lead={lead} />
    case 'odds':
      return <Odds s={slide} story={story} />
    case 'goals':
      return <Goals s={slide} story={story} />
    case 'form':
      return <Form s={slide} story={story} />
    case 'stats':
      return <Stats s={slide} story={story} />
    case 'goalsTimeline':
      return <GoalsTimeline s={slide} story={story} />
    case 'pick':
      return <PickSlide s={slide} />
  }
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { lateNote, momentumSummary, playedTime, pressShares } from '@/lib/match-notes'
import { minuteLabel, type MomentumPoint } from '@/lib/sstats/ls'
import type { MatchEvent } from '@/lib/types'
import { NavIcon } from '../NavIcon'
import { withScore } from './EventsBlock'
import { SplitBar } from './SplitBar'

type Side = { name: string; logo?: string | null }

const mins = (n: number) => `${n} мин`
const STEP = 5

type Bucket = { x: number; from: number; to: number; label: string; h: number; a: number }

/**
 * Давление по 5 минут внутри тайма (отрезок не переходит через перерыв; добавленное время — своими отрезками):
 * у каждой команды — средняя сила её давления за отрезок, 0–100 (`v` из `/Ls/GameMomentum`: > 0 — хозяева,
 * < 0 — гости). `x` — середина отрезка на оси сыгранного времени (`playedTime`).
 */
function buckets(points: MomentumPoint[], pos: (part: number, minute: number) => number): Bucket[] {
  const start = (part: number) => (part === 1 ? 0 : part === 2 ? 45 : 90)
  const acc = new Map<string, MomentumPoint[]>()
  for (const p of points) {
    const k = `${p.part}:${Math.floor((p.minute - 1 - start(p.part)) / STEP)}`
    acc.set(k, [...(acc.get(k) ?? []), p])
  }
  return [...acc.values()].map((ps) => {
    const first = ps[0]
    const lastP = ps[ps.length - 1]
    const from = pos(first.part, first.minute) - 1
    const to = pos(lastP.part, lastP.minute)
    const a = minuteLabel(first).replace('′', '')
    return {
      x: (from + to) / 2,
      from,
      to,
      label: first === lastP ? minuteLabel(first) : `${a}–${minuteLabel(lastP)}`,
      h: Math.round((ps.reduce((s, p) => s + Math.max(p.v, 0), 0) / ps.length) * 100),
      a: Math.round((ps.reduce((s, p) => s + Math.max(-p.v, 0), 0) / ps.length) * 100),
    }
  })
}

/** Тайм события по минуте и добавленному: «45+2» — первый тайм, 47-я минута тайма. */
const evPart = (e: MatchEvent) => (e.minute <= 45 ? 1 : e.minute <= 90 ? 2 : 3)
const evLabel = (e: MatchEvent) => `${e.minute}${e.extra ? `+${e.extra}` : ''}′`
const EV_WORD: Partial<Record<MatchEvent['kind'], string>> = { goal: 'гол', penalty: 'гол с пенальти', 'own-goal': 'автогол', red: 'удаление', 'missed-penalty': 'незабитый пенальти' }

/**
 * «Давление команд» (заголовок — у раздела) — по прототипу владельца из ChatGPT («а может так лучше?»): две линии,
 * у каждой команды своя, цветом клуба (`.club-stroke-h/-a`; цвета похожи — у гостей пунктир, `[data-alike]` от
 * `ClubVars`), точка — 5 минут матча, слева шкала индекса давления 0–100, под графиком — легенда и один вывод про
 * последние 10 минут (только если все 10 минут есть в данных). Ось минут — сыгранное время с добавленным: по ходу —
 * до текущей минуты с небольшим запасом, после матча — вся продолжительность. Голы — метка «эмблема 17′» и пунктир.
 * Сверху — «Сколько минут давила команда» с полосой и «ещё N мин — на равных · сыграно M мин» (`momentumSummary`).
 */
export function Momentum({ points, events, final = null, home, away, live, clock = null }: { points: MomentumPoint[]; events: MatchEvent[]; /** счёт матча — чтобы понять, кому засчитан автогол */ final?: { home: number; away: number } | null; home: Side; away: Side; live: boolean; /** минута на часах по ходу (`elapsed`) */ clock?: number | null }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const [act, setAct] = useState<number | null>(null)
  // открытая метка гола: наведение, фокус или нажатие
  const [gAct, setGAct] = useState<number | null>(null)
  // меню «···»: картинка, поделиться, таблица, копирование
  const [menu, setMenu] = useState(false)
  const [table, setTable] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const menuBox = useRef<HTMLDivElement>(null)
  const lines = useRef<Partial<Record<'h' | 'a', SVGPathElement | null>>>({})
  useEffect(() => {
    if (!menu) return
    const off = (e: PointerEvent) => !menuBox.current?.contains(e.target as Node) && setMenu(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', off)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 2200)
    return () => clearTimeout(t)
  }, [flash])
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const sum = momentumSummary(points)
  const pt = playedTime(points)
  // три группы не пересекаются: перевес хозяев, на равных, перевес гостей — доли минут с данными, в сумме ровно 100%
  const share = pressShares(points)
  const bs = buckets(points, pt.pos)
  const last = points[points.length - 1]
  // xData — последняя минута с данными; xNow — «сейчас» по часам матча (данные бывают на минуту-две позади)
  const xData = last ? pt.pos(last.part, last.minute) : 0
  const clockPos = (m: number) => (m <= 45 ? m : m <= 90 ? pt.len1 + m - 45 : pt.len1 + pt.len2 + m - 90)
  const xNow = live && clock ? Math.max(xData, clockPos(clock)) : xData
  // правый край — «сейчас» по ходу и конец матча после
  const xMax = Math.max(live ? xNow : pt.total, 10)
  const behind = live && last && xNow > xData
  const top = Math.max(...bs.map((b) => Math.max(b.h, b.a)), 1)
  const yMax = Math.min(100, Math.max(40, Math.ceil(top / 20) * 20))
  const yTicks = Array.from({ length: yMax / 20 + 1 }, (_, i) => i * 20)

  const evPos = (e: MatchEvent) => pt.pos(evPart(e), e.minute + (e.extra ?? 0))
  // размеры графика: слева — подписи шкалы, сверху — метки голов, снизу — минуты
  const L = 40
  const R = 6
  const pw = Math.max(0, w - L - R)
  const X = (x: number) => L + (x / xMax) * pw
  // голы: метка «мяч 17′» шириной ~64px — ярус выше, если рядом по экрану уже стоит метка. Кому засчитан и счёт после
  // гола — как в «Ключевых событиях» (`withScore`: автогол — по итоговому счёту); не сошлось — счёта нет, автогол без команды
  const goals: { x: number; e: MatchEvent; label: string; level: number; side: 'home' | 'away' | null; score: string | null }[] = []
  let prev = [0, 0]
  for (const e of withScore(events.filter((e) => e.kind === 'goal' || e.kind === 'penalty' || e.kind === 'own-goal'), final)) {
    const sc = e.score ? e.score.split(':').map(Number) : null
    const side = sc ? (sc[0] > prev[0] ? 'home' : 'away') : e.kind === 'own-goal' ? null : e.side
    if (sc) prev = sc
    const x = evPos(e)
    if (x > xMax) continue
    const near = goals.filter((g) => Math.abs(X(g.x) - X(x)) < 70).map((g) => g.level)
    let level = 0
    while (near.includes(level)) level++
    goals.push({ x, e, label: evLabel(e), level, side, score: e.score })
  }
  const goalRows = goals.length ? Math.max(...goals.map((g) => g.level)) + 1 : 0
  const T = goalRows * 28 + 12
  const H = w >= 640 ? 170 : 140
  const B = 26
  const Y = (v: number) => T + H - (v / yMax) * H
  const narrow = w < 480
  const xTicks = (narrow ? [0, 45, 90, 120] : [0, 15, 30, 45, 60, 75, 90, 105, 120])
    .filter((m) => (m <= 45 || pt.len2 > 0 || m === 0) && (m <= 90 || pt.total > pt.len1 + pt.len2))
    .map((m) => ({ m, x: clockPos(m) }))
    .filter((t) => t.x <= xMax)
  // только настоящие точки (середины отрезков): до первой и после последней линию не продлеваем, через отрезок без
  // данных — разрыв, а не прямая
  const path = (k: 'h' | 'a') =>
    bs.map((b, i) => `${i && b.from <= bs[i - 1].to ? 'L' : 'M'}${X(b.x).toFixed(1)},${Y(b[k]).toFixed(1)}`).join(' ')
  const cur = act != null ? bs[act] : null
  // события отрезка — только те, что есть в данных матча
  const curEvents = cur ? events.filter((e) => EV_WORD[e.kind] && evPos(e) > cur.from && evPos(e) <= cur.to) : []

  const pick = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * xMax
    let best = -1
    let d = Infinity
    bs.forEach((b, i) => {
      if (Math.abs(b.x - x) < d) {
        d = Math.abs(b.x - x)
        best = i
      }
    })
    setAct(best >= 0 && d <= STEP ? best : null)
  }

  const swatch = (k: 'h' | 'a') => (
    <svg width="18" height="8" aria-hidden className={`momentum-line ${k === 'h' ? 'club-stroke-h' : 'club-stroke-a'}`}>
      <path d="M1,4 L17,4" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  )

  const hv = sum.minutes.home
  const av = sum.minutes.away
  const pct = (v: number) => `${(v / 10).toFixed(1).replace('.', ',')}%`
  const note = lateNote(points, live, clock, home.name, away.name)
  // ограничения данных — и в копии, и на картинке: не выдаём часть матча за весь
  const scope = [
    share ? `по ${mins(share.n)} игры с данными` : null,
    behind ? `данные до ${minuteLabel(last)}` : null,
    pt.gap > 0 ? `нет данных — ${mins(pt.gap)}` : null,
  ].filter(Boolean).join(' · ')
  const pageUrl = () => location.origin + location.pathname

  /** Картинка для соцсетей — рисуем заново на canvas по тем же точкам (без подсказок и кнопок), цвета линий — с экрана. */
  const png = async (): Promise<Blob | null> => {
    const W = 1080
    const P = 64
    const font = getComputedStyle(document.body).fontFamily
    const css = (k: 'h' | 'a') => (lines.current[k] ? getComputedStyle(lines.current[k]!) : null)
    const col = (k: 'h' | 'a') => css(k)?.stroke || (k === 'h' ? '#dfe3e8' : '#7d8794')
    const dashed = css('a')?.strokeDasharray && css('a')!.strokeDasharray !== 'none'
    const gl = 26 // шрифт меток голов
    const rows: number[] = []
    const cl = 120 // слева — шкала
    const cw = W - P - cl
    const cx = (x: number) => cl + (x / xMax) * cw
    const lv = goals.map((g) => {
      let level = 0
      const near = goals.filter((o, j) => j < goals.indexOf(g) && Math.abs(cx(o.x) - cx(g.x)) < 110).map((o) => rows[goals.indexOf(o)])
      while (near.includes(level)) level++
      rows.push(level)
      return level
    })
    const gRows = goals.length ? Math.max(...lv) + 1 : 0
    const top = 250 + gRows * 48
    const ch = 460
    const Hh = top + ch + 60 + 70 + 90
    const c = document.createElement('canvas')
    c.width = W
    c.height = Hh
    const g = c.getContext('2d')
    if (!g) return null
    g.fillStyle = '#11161d'
    g.fillRect(0, 0, W, Hh)
    g.textBaseline = 'alphabetic'
    g.fillStyle = '#f2f4f7'
    g.font = `700 52px ${font}`
    g.fillText('Давление команд', P, P + 50)
    g.font = `500 34px ${font}`
    g.fillStyle = '#c3c9d1'
    g.fillText(`${home.name} — ${away.name}`, P, P + 104)
    if (share) {
      g.font = `400 26px ${font}`
      g.fillStyle = '#8a939e'
      g.fillText(`${home.name} ${pct(share.home)} · на равных ${pct(share.even)} · ${away.name} ${pct(share.away)}`, P, P + 150, W - 2 * P)
    }
    const cy = (v: number) => top + ch - (v / yMax) * ch
    g.font = `400 24px ${font}`
    g.textAlign = 'right'
    for (const v of yTicks) {
      g.strokeStyle = v ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)'
      g.setLineDash(v ? [6, 8] : [])
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(cl, cy(v))
      g.lineTo(cl + cw, cy(v))
      g.stroke()
      g.fillStyle = '#8a939e'
      g.fillText(String(v), cl - 16, cy(v) + 8)
    }
    g.textAlign = 'center'
    for (const m of [0, 15, 30, 45, 60, 75, 90, 105, 120].filter((m) => (m <= 45 || pt.len2 > 0 || m === 0) && (m <= 90 || pt.total > pt.len1 + pt.len2))) {
      const x = clockPos(m)
      if (x <= xMax) g.fillText(`${m}′`, Math.min(Math.max(cx(x), cl + 20), cl + cw - 20), top + ch + 42)
    }
    goals.forEach((o, i) => {
      g.strokeStyle = o.side ? col(o.side === 'home' ? 'h' : 'a') : 'rgba(255,255,255,0.4)'
      g.setLineDash([6, 6])
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(cx(o.x), top - 20 - lv[i] * 48)
      g.lineTo(cx(o.x), top + ch)
      g.stroke()
      g.setLineDash([])
      g.font = `600 ${gl}px ${font}`
      const t = `● ${o.label}`
      const tw = g.measureText(t).width + 28
      const lx = Math.min(Math.max(cx(o.x) - tw / 2, cl), cl + cw - tw)
      const ly = top - 62 - lv[i] * 48
      g.fillStyle = '#232c36'
      g.beginPath()
      g.roundRect(lx, ly, tw, 42, 21)
      g.fill()
      g.fillStyle = '#f2f4f7'
      g.fillText(t, lx + tw / 2, ly + 30)
    })
    for (const k of ['a', 'h'] as const) {
      g.strokeStyle = col(k)
      g.lineWidth = 6
      g.lineJoin = 'round'
      g.lineCap = 'round'
      g.setLineDash(k === 'a' && dashed ? [14, 12] : [])
      g.beginPath()
      bs.forEach((b, i) => (i && b.from <= bs[i - 1].to ? g.lineTo(cx(b.x), cy(b[k])) : g.moveTo(cx(b.x), cy(b[k]))))
      g.stroke()
      g.setLineDash([])
      g.fillStyle = col(k)
      for (const b of bs) {
        g.beginPath()
        g.arc(cx(b.x), cy(b[k]), 8, 0, Math.PI * 2)
        g.fill()
      }
    }
    // легенда
    const ly = top + ch + 112
    g.font = `500 28px ${font}`
    g.textAlign = 'left'
    let lx = P
    for (const [k, name] of [['h', home.name], ['a', away.name]] as const) {
      g.strokeStyle = col(k)
      g.lineWidth = 6
      g.setLineDash(k === 'a' && dashed ? [12, 8] : [])
      g.beginPath()
      g.moveTo(lx, ly - 9)
      g.lineTo(lx + 44, ly - 9)
      g.stroke()
      g.setLineDash([])
      g.fillStyle = '#f2f4f7'
      g.fillText(name, lx + 60, ly)
      lx += 60 + g.measureText(name).width + 48
    }
    // подпись: охват данных и tag.bet
    g.font = `400 22px ${font}`
    g.fillStyle = '#8a939e'
    g.fillText(['Индекс давления 0–100', scope].filter(Boolean).join(' · '), P, Hh - 44, W - 2 * P - 200)
    g.font = `700 34px ${font}`
    g.textAlign = 'right'
    g.fillStyle = '#f2f4f7'
    const bw = g.measureText('bet').width
    g.fillText('bet', W - P, Hh - 42)
    g.fillStyle = '#c8ff2e'
    const dw = g.measureText('.').width
    g.fillText('.', W - P - bw, Hh - 42)
    g.fillStyle = '#f2f4f7'
    g.fillText('tag', W - P - bw - dw, Hh - 42)
    return new Promise((ok) => c.toBlob(ok, 'image/png'))
  }
  const fileName = () => `davlenie-${location.pathname.split('/').pop() || 'match'}.png`
  const save = async () => {
    const b = await png()
    if (!b) return setFlash('Не удалось сохранить')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = fileName()
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const shareIt = async () => {
    const title = `Давление команд: ${home.name} — ${away.name}`
    const url = pageUrl()
    try {
      const b = await png()
      const file = b ? new File([b], fileName(), { type: 'image/png' }) : null
      if (file && navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title, text: `${title} — ${url}` })
      if (navigator.share) return await navigator.share({ title, url })
      await navigator.clipboard.writeText(url)
      setFlash('Ссылка скопирована')
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setFlash('Не удалось поделиться')
    }
  }
  const copy = async () => {
    const text = [
      `${home.name} — ${away.name}`,
      `Давление команд${scope ? ` (${scope})` : ''}`,
      share ? `Распределение давления:\n${home.name} — ${pct(share.home)}\nНа равных — ${pct(share.even)}\n${away.name} — ${pct(share.away)}` : null,
      note,
      `Источник: tag.bet — ${pageUrl()}`,
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setFlash('Данные скопированы')
    } catch {
      setFlash('Не удалось скопировать')
    }
  }
  const items: [string, () => void][] = [
    ['Сохранить изображение', save],
    ['Поделиться', shareIt],
    [table ? 'Показать график' : 'Табличный вид', () => setTable(!table)],
    ['Скопировать данные', copy],
  ]

  return (
    <div>
      {/* доля проанализированных минут: перевес хозяев · на равных · перевес гостей, в сумме 100% */}
      {/* распределение — своим внутренним блоком на тон светлее, график — ниже на фоне карточки */}
      <div className="rounded-tile bg-white/[0.04] p-4">
        <p className="text-center text-[14px] text-dim">Распределение давления</p>
        <SplitBar home={share?.home ?? 0} away={share?.away ?? 0} even={share?.even ?? 0} className="mt-2.5 h-2" />
        <div className="mt-2.5 grid grid-cols-3 gap-3">
          {[
            { v: share?.home ?? 0, label: home.name, strong: hv >= av, cls: 'text-left' },
            { v: share?.even ?? 0, label: 'на равных', strong: false, cls: 'text-center' },
            { v: share?.away ?? 0, label: away.name, strong: av >= hv, cls: 'text-right' },
          ].map((c, i) => (
            <div key={i} className={`min-w-0 ${c.cls}`}>
              <div className={`num text-[22px] leading-none ${c.strong ? 'font-bold text-fg' : 'text-dim'}`}>{pct(c.v)}</div>
              <div className="mt-1 truncate text-[13px] text-mute">{c.label}</div>
            </div>
          ))}
        </div>
        {/* только ограничения данных: отставание и пропуски; знаменатель процентов — в ⓘ у заголовка */}
        {behind || pt.gap > 0 ? (
          <p className="mt-2.5 text-center text-[13px] text-mute">
            {[behind ? `Данные до ${minuteLabel(last)}` : null, pt.gap > 0 ? `нет данных — ${mins(pt.gap)}` : null].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>

      {/* график с легендой — вторым внутренним блоком того же фона */}
      <div className="relative mt-4 rounded-tile bg-white/[0.04] p-4">
      {/* меню графика: картинка, поделиться, таблица, копирование */}
      <div ref={menuBox} className="absolute right-1.5 top-1.5 z-[5]">
        <button
          type="button"
          aria-label="Действия с графиком"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
          className={`flex h-6 w-8 items-center justify-center rounded-full text-dim hover:bg-white/[0.08] hover:text-fg ${menu ? 'bg-white/[0.08] text-fg' : ''}`}
        >
          <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor" aria-hidden>
            <circle cx="2" cy="2" r="1.6" />
            <circle cx="8" cy="2" r="1.6" />
            <circle cx="14" cy="2" r="1.6" />
          </svg>
        </button>
        {menu ? (
          <div role="menu" className="absolute right-0 top-full mt-1 w-56 overflow-hidden rounded-tile bg-panel-3 py-1 text-[14px] shadow-lg">
            {items.map(([label, run]) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false)
                  run()
                }}
                className="block w-full px-3.5 py-2 text-left hover:bg-white/[0.06]"
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        {flash ? (
          <div role="status" className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-ctl bg-panel-3 px-2.5 py-1.5 text-[13px] shadow-lg">
            {flash}
          </div>
        ) : null}
      </div>
      {/* табличный вид — те же отрезки, что на графике */}
      {table ? (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-[13px] text-mute">
              <th className="py-1.5 pr-3 text-left font-normal">Минуты</th>
              <th className="py-1.5 pr-3 text-right font-normal">{home.name}</th>
              <th className="py-1.5 pr-10 text-right font-normal">{away.name}</th>
            </tr>
          </thead>
          <tbody>
            {bs.map((b, i) => (
              <tr key={i} className="border-t border-white/[0.06]">
                <td className="py-1.5 pr-3 tabular-nums text-dim">{b.label}</td>
                <td className={`num py-1.5 pr-3 text-right ${b.h > b.a ? 'font-semibold text-fg' : 'text-dim'}`}>{b.h}</td>
                <td className={`num py-1.5 pr-10 text-right ${b.a > b.h ? 'font-semibold text-fg' : 'text-dim'}`}>{b.a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div ref={box} className={`relative ${table ? 'hidden' : ''}`}>
        {w ? (
          <svg width={w} height={T + H + B} className="block select-none" role="img" aria-label={`Индекс давления команд по 5 минут, 0–100: «${home.name}» и «${away.name}».`}>
            {/* шкала силы давления и сетка */}
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={L} x2={L + pw} y1={Y(v)} y2={Y(v)} className={v ? 'stroke-white/[0.07]' : 'stroke-white/20'} strokeDasharray={v ? '3 4' : undefined} />
                <text x={L - 8} y={Y(v)} dy="0.35em" textAnchor="end" className="fill-mute text-[13px]">
                  {v}
                </text>
              </g>
            ))}
            {/* перерыв — тонкой чертой */}
            {pt.len2 > 0 ? <line x1={X(pt.len1)} x2={X(pt.len1)} y1={T} y2={T + H} className="stroke-white/10" /> : null}
            {/* голы — пунктир через график */}
            {goals.map((g, i) => (
              <line key={i} x1={X(g.x)} x2={X(g.x)} y1={T - 8 - g.level * 28} y2={T + H} className={g.side === 'home' ? 'club-stroke-h' : g.side === 'away' ? 'club-stroke-a' : 'stroke-white/40'} strokeDasharray="3 3" />
            ))}
            {/* наведённый отрезок */}
            {cur ? <line x1={X(cur.x)} x2={X(cur.x)} y1={T} y2={T + H} className="stroke-white/35" /> : null}
            {/* линии команд: сначала гости, сверху хозяева */}
            {(['a', 'h'] as const).map((k) => (
              <g key={k} className={`momentum-line ${k === 'h' ? 'club-stroke-h' : 'club-stroke-a'}`}>
                <path ref={(el) => void (lines.current[k] = el)} d={path(k)} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {bs.map((b, i) => (
                  <circle key={i} cx={X(b.x)} cy={Y(b[k])} r={act === i ? 5 : 3.5} className="club-dot" strokeWidth={2} />
                ))}
              </g>
            ))}
            {/* минуты матча */}
            {xTicks.map(({ m, x }, i) => (
              <text key={m} x={X(x)} y={T + H + 19} textAnchor={i === 0 ? 'start' : X(x) > L + pw - 16 ? 'end' : 'middle'} className="fill-mute text-[13px]">
                {m}′
              </text>
            ))}
            <rect
              x={L}
              y={0}
              width={pw}
              height={T + H}
              fill="transparent"
              className="touch-pan-y"
              onPointerMove={pick}
              onPointerDown={pick}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setAct(null)}
            />
          </svg>
        ) : (
          <div style={{ height: T + 140 + B }} />
        )}
        {/* метки голов: мяч и «17′ · Гол»; чей гол и кто забил — по наведению или нажатию (только из данных матча) */}
        {w
          ? goals.map((g, i) => {
              const x = X(g.x)
              const shift = x - L < 50 ? '' : L + pw - x < 50 ? '-translate-x-full' : '-translate-x-1/2'
              const side = shift === '' ? 'left-0' : shift === '-translate-x-full' ? 'right-0' : 'left-1/2 -translate-x-1/2'
              const team = g.side === 'home' ? home.name : g.side === 'away' ? away.name : null
              const what = g.e.kind === 'own-goal' ? 'Автогол' : g.e.kind === 'penalty' ? 'Гол с пенальти' : 'Гол'
              return (
                <span key={i} className={`absolute z-[3] ${shift}`} style={{ left: x, top: 8 + T - 34 - g.level * 28 }}>
                  <button
                    type="button"
                    aria-expanded={gAct === i}
                    onPointerEnter={(ev) => ev.pointerType === 'mouse' && setGAct(i)}
                    onPointerLeave={(ev) => ev.pointerType === 'mouse' && setGAct(null)}
                    onFocus={() => setGAct(i)}
                    onBlur={() => setGAct(null)}
                    // мышь открыла наведением, касание — нажатием; закрывается уходом курсора или нажатием мимо (blur)
                    onClick={() => setGAct(i)}
                    className="flex items-center gap-1 whitespace-nowrap rounded-full bg-panel-3 py-0.5 pl-1 pr-2 text-[13px] font-semibold tabular-nums"
                  >
                    <NavIcon href="/" on size={14} className="text-fg" />
                    {g.label}
                    <span className="sr-only">, {what}{team ? ` «${team}»` : ''}{g.e.player ? `, ${g.e.player}` : ''}{g.score ? `, счёт ${g.score}` : ''}</span>
                  </button>
                  {gAct === i ? (
                    <span className={`pointer-events-none absolute top-full mt-1 whitespace-nowrap rounded-ctl bg-panel-3 px-2.5 py-1.5 text-[13px] shadow-lg ${side}`} aria-hidden>
                      <span className="block font-semibold">
                        {g.label} · {what}
                      </span>
                      {team ? <span className="block">{team}</span> : null}
                      {g.e.player ? <span className="block text-dim">{g.e.player}</span> : null}
                      {g.score ? <span className="block text-dim">Счёт после гола: {g.score}</span> : null}
                    </span>
                  ) : null}
                </span>
              )
            })
          : null}
        {/* подсказка: отрезок и сила давления обеих команд */}
        {cur && w ? (
          <div
            className="pointer-events-none absolute z-[2] -translate-x-1/2 whitespace-nowrap rounded-ctl bg-panel-3 px-2.5 py-1.5 text-[13px] shadow-lg"
            style={{ left: Math.min(Math.max(X(cur.x), 100), w - 100), top: T + 8 }}
          >
            {/* отрезок — минуты, по которым усреднён индекс (одна минута — одна минута) */}
            <div className="font-semibold">
              {cur.label} <span className="font-normal text-mute">· Индекс давления</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {swatch('h')}
              {home.name} — <span className="num font-semibold">{cur.h}/100</span>
            </div>
            <div className="flex items-center gap-1.5">
              {swatch('a')}
              {away.name} — <span className="num font-semibold">{cur.a}/100</span>
            </div>
            {/* события этого отрезка — отдельно от цифр давления */}
            {curEvents.length ? (
              <div className="mt-1.5 border-t border-white/10 pt-1.5">
                {curEvents.map((e, i) => (
                  <div key={i}>
                    {EV_WORD[e.kind]!.replace(/^./, (c) => c.toUpperCase())} «{e.side === 'home' ? home.name : away.name}» · {evLabel(e)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* легенда: у каждой линии — название команды */}
      <div className={`mt-1 ${table ? 'hidden' : 'flex'} flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[14px]`}>
        <span className="flex items-center gap-2">
          {swatch('h')}
          {home.name}
        </span>
        <span className="flex items-center gap-2">
          {swatch('a')}
          {away.name}
        </span>
      </div>
      </div>
      {/* вывод про последние 10 минут — внутри карточки, тихой строкой без фона */}
      {note ? <p className="mt-3 px-1 text-[13px] leading-snug text-mute">{note}</p> : null}
    </div>
  )
}

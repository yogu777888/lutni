'use client'

import { useEffect, useRef, useState } from 'react'
import { lateNote, momentumSummary, playedTime, pressShares } from '@/lib/match-notes'
import { minuteLabel, type MomentumPoint } from '@/lib/sstats/ls'
import type { MatchEvent } from '@/lib/types'
import { ICONS, NavIcon } from '../NavIcon'
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
export function Momentum({ points, events, final = null, url, league, status, home, away, live, clock = null }: { points: MomentumPoint[]; events: MatchEvent[]; /** счёт матча — чтобы понять, кому засчитан автогол */ final?: { home: number; away: number } | null; /** адрес матча на tag.bet — для картинки, «Поделиться» и копии */ url: string; league?: string; /** «59′» по ходу, «Матч завершён» после */ status?: string; home: Side; away: Side; live: boolean; /** минута на часах по ходу (`elapsed`) */ clock?: number | null }) {
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
  // шкала всегда 0–100: подписи только 0, 50, 100 (владелец: «основное внимание — на динамике, а не на сетке»)
  const yMax = 100
  const yTicks = [0, 50, 100]

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
  const T = goalRows * 26 + 12
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
  // едва заметная заливка под линией — по тем же отрезкам, с теми же разрывами
  const area = (k: 'h' | 'a') => {
    const runs: Bucket[][] = []
    bs.forEach((b, i) => (i && b.from <= bs[i - 1].to ? runs[runs.length - 1].push(b) : runs.push([b])))
    return runs
      .filter((r) => r.length > 1)
      .map((r) => `M${X(r[0].x).toFixed(1)},${Y(0)} ` + r.map((b) => `L${X(b.x).toFixed(1)},${Y(b[k]).toFixed(1)}`).join(' ') + ` L${X(r[r.length - 1].x).toFixed(1)},${Y(0)} Z`)
      .join(' ')
  }
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
      <path d="M1,4 L17,4" strokeWidth={2} strokeLinecap="round" />
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
  const pageUrl = () => url

  /**
   * Картинка для соцсетей — рисуем заново на canvas по тем же точкам (без подсказок и кнопок), цвета линий — с экрана.
   * 1080px в ширину, всё в 2× от экрана: линии 4px, текст от 22px. Мяч — тот же SVG-путь, что в метках (`ICONS['/']`).
   */
  const png = async (): Promise<Blob | null> => {
    await document.fonts?.ready
    const W = 1080
    const P = 64
    const font = getComputedStyle(document.body).fontFamily
    const css = (k: 'h' | 'a') => (lines.current[k] ? getComputedStyle(lines.current[k]!) : null)
    const col = (k: 'h' | 'a') => css(k)?.stroke || (k === 'h' ? '#dfe3e8' : '#7d8794')
    const dashed = css('a')?.strokeDasharray && css('a')!.strokeDasharray !== 'none'
    const ball = new Path2D(ICONS['/'][1])
    const cl = 96 // слева — шкала
    const cw = W - P - cl
    const cx = (x: number) => cl + (x / xMax) * cw
    // ярусы меток голов — как на экране: ближе ~110px — выше
    const lv: number[] = []
    goals.forEach((o, i) => {
      const near = lv.filter((_, j) => Math.abs(cx(goals[j].x) - cx(o.x)) < 110)
      let level = 0
      while (near.includes(level)) level++
      lv.push(level)
    })
    const gRows = goals.length ? Math.max(...lv) + 1 : 0
    const top = 300 + gRows * 52
    const ch = 440
    const Hh = top + ch + 210
    const c = document.createElement('canvas')
    c.width = W
    c.height = Hh
    const g = c.getContext('2d')
    if (!g) return null
    const text = (t: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left', max?: number) => {
      g.font = `${f} ${font}`
      g.fillStyle = color
      g.textAlign = align
      g.fillText(t, x, y, max)
    }
    g.fillStyle = '#11161d'
    g.fillRect(0, 0, W, Hh)
    // шапка: заголовок, матч со счётом, турнир и минута / статус, распределение
    text('Давление команд', P, P + 44, '700 46px', '#f2f4f7')
    const sc = final ? `  ${final.home}:${final.away}  ` : ' — '
    text(`${home.name}${sc}${away.name}`, P, P + 102, '600 36px', '#e6e9ed', 'left', W - 2 * P)
    text([league, status].filter(Boolean).join(' · '), P, P + 146, '400 26px', '#8a939e', 'left', W - 2 * P)
    if (share) text(`${home.name} ${pct(share.home)} · на равных ${pct(share.even)} · ${away.name} ${pct(share.away)}`, P, P + 190, '400 24px', '#8a939e', 'left', W - 2 * P)
    const cy = (v: number) => top + ch - (v / yMax) * ch
    // сетка: только 0, 50, 100 — почти незаметная
    for (const v of yTicks) {
      g.strokeStyle = v ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.16)'
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(cl, cy(v))
      g.lineTo(cl + cw, cy(v))
      g.stroke()
      text(String(v), cl - 18, cy(v) + 8, '400 22px', '#8a939e', 'right')
    }
    if (pt.len2 > 0) {
      g.strokeStyle = 'rgba(255,255,255,0.08)'
      g.beginPath()
      g.moveTo(cx(pt.len1), top)
      g.lineTo(cx(pt.len1), top + ch)
      g.stroke()
      const right = cx(pt.len1) + 110 > cl + cw
      text('Перерыв', cx(pt.len1) + (right ? -10 : 10), top + 26, '400 22px', '#6b747f', right ? 'right' : 'left')
    }
    for (const m of [0, 15, 30, 45, 60, 75, 90, 105, 120].filter((m) => (m <= 45 || pt.len2 > 0 || m === 0) && (m <= 90 || pt.total > pt.len1 + pt.len2))) {
      const x = clockPos(m)
      if (x <= xMax) text(`${m}′`, Math.min(Math.max(cx(x), cl + 18), cl + cw - 18), top + ch + 40, '400 22px', '#8a939e', 'center')
    }
    // голы: тонкий пунктир цветом команды и метка «мяч 17′»
    goals.forEach((o, i) => {
      g.strokeStyle = o.side ? col(o.side === 'home' ? 'h' : 'a') : 'rgba(255,255,255,0.4)'
      g.globalAlpha = 0.6
      g.setLineDash([4, 6])
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(cx(o.x), top - 12 - lv[i] * 52)
      g.lineTo(cx(o.x), top + ch)
      g.stroke()
      g.setLineDash([])
      g.globalAlpha = 1
      g.font = `500 24px ${font}`
      const tw = g.measureText(o.label).width + 24 + 8 + 24
      const lx = Math.min(Math.max(cx(o.x) - tw / 2, cl), cl + cw - tw)
      const ly = top - 56 - lv[i] * 52
      g.fillStyle = 'rgba(255,255,255,0.08)'
      g.beginPath()
      g.roundRect(lx, ly, tw, 44, 22)
      g.fill()
      g.save()
      g.translate(lx + 12, ly + 10)
      g.scale(24 / 256, 24 / 256)
      g.fillStyle = '#e6e9ed'
      g.fill(ball)
      g.restore()
      text(o.label, lx + 12 + 24 + 8, ly + 31, '500 24px', '#e6e9ed')
    })
    // линии: 4px, скруглённые, без точек; под ними — заливка 5%, разрывы как на экране
    const runs: Bucket[][] = []
    bs.forEach((b, i) => (i && b.from <= bs[i - 1].to ? runs[runs.length - 1].push(b) : runs.push([b])))
    for (const k of ['a', 'h'] as const) {
      g.fillStyle = col(k)
      g.globalAlpha = 0.05
      for (const r of runs.filter((r) => r.length > 1)) {
        g.beginPath()
        g.moveTo(cx(r[0].x), cy(0))
        r.forEach((b) => g.lineTo(cx(b.x), cy(b[k])))
        g.lineTo(cx(r[r.length - 1].x), cy(0))
        g.fill()
      }
      g.globalAlpha = 1
      g.strokeStyle = col(k)
      g.lineWidth = 4
      g.lineJoin = 'round'
      g.lineCap = 'round'
      g.setLineDash(k === 'a' && dashed ? [10, 8] : [])
      g.beginPath()
      bs.forEach((b, i) => (i && b.from <= bs[i - 1].to ? g.lineTo(cx(b.x), cy(b[k])) : g.moveTo(cx(b.x), cy(b[k]))))
      g.stroke()
      g.setLineDash([])
    }
    // легенда
    const ly = top + ch + 100
    g.font = `500 24px ${font}`
    let lx = P
    for (const [k, name] of [['h', home.name], ['a', away.name]] as const) {
      g.strokeStyle = col(k)
      g.lineWidth = 4
      g.setLineDash(k === 'a' && dashed ? [10, 7] : [])
      g.beginPath()
      g.moveTo(lx, ly - 8)
      g.lineTo(lx + 36, ly - 8)
      g.stroke()
      g.setLineDash([])
      text(name, lx + 50, ly, '500 24px', '#e6e9ed')
      lx += 50 + g.measureText(name).width + 40
    }
    // низ: шкала и адрес матча слева, tag.bet справа
    text('Индекс давления · 0–100', P, Hh - 62, '400 22px', '#8a939e')
    text(url.replace(/^https?:\/\//, ''), P, Hh - 30, '400 20px', '#6b747f', 'left', W - 2 * P - 200)
    g.font = `700 34px ${font}`
    const bw = g.measureText('bet').width
    const dw = g.measureText('.').width
    text('bet', W - P, Hh - 38, '700 34px', '#f2f4f7', 'right')
    text('.', W - P - bw, Hh - 38, '700 34px', '#c8ff2e', 'right')
    text('tag', W - P - bw - dw, Hh - 38, '700 34px', '#f2f4f7', 'right')
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
  // значки пунктов меню — контуром 1.5px на сетке 16×16
  const MI = {
    save: 'M8 2.5v7.5M5 7l3 3 3-3M3 12.5h10',
    share: 'M8 10V2.5M5 5.5 8 2.5l3 3M4.5 8H3.5v5.5h9V8h-1',
    table: 'M2.5 3.5h11v9h-11zM2.5 6.5h11M2.5 9.5h11M6.5 6.5v6',
    chart: 'M2.5 12.5l3.5-4 3 2.5 4.5-6',
    copy: 'M5.5 5.5h7v7h-7zM10.5 5.5v-2h-7v7h2',
  }
  const items: [string, keyof typeof MI, () => void][] = [
    ['Сохранить изображение', 'save', save],
    ['Поделиться', 'share', shareIt],
    [table ? 'Показать график' : 'Табличный вид', table ? 'chart' : 'table', () => setTable(!table)],
    ['Скопировать данные', 'copy', copy],
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
          <div role="menu" className="absolute right-0 top-full mt-1 w-[min(14rem,calc(100vw-2rem))] overflow-hidden rounded-tile bg-panel-3 py-1 text-[14px] shadow-lg">
            {items.map(([label, icon, run]) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false)
                  run()
                }}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-white/[0.06]"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-dim" aria-hidden>
                  <path d={MI[icon]} />
                </svg>
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
                <line x1={L} x2={L + pw} y1={Y(v)} y2={Y(v)} className={v ? 'stroke-white/[0.04]' : 'stroke-white/[0.14]'} />
                <text x={L - 10} y={Y(v)} dy="0.35em" textAnchor="end" className="fill-mute text-[12px] tabular-nums">
                  {v}
                </text>
              </g>
            ))}
            {/* перерыв — тонкой чертой */}
            {/* перерыв: черта после первого тайма с добавленным временем (pt.len1 = 45 + добавленные минуты) */}
            {pt.len2 > 0 ? (
              <g>
                <line x1={X(pt.len1)} x2={X(pt.len1)} y1={T} y2={T + H} className="stroke-white/10" />
                <text x={X(pt.len1) + (X(pt.len1) + 64 > L + pw ? -5 : 5)} y={T + 12} textAnchor={X(pt.len1) + 64 > L + pw ? 'end' : 'start'} className="fill-mute text-[12px] opacity-70">
                  Перерыв
                </text>
              </g>
            ) : null}
            {/* голы — пунктир через график */}
            {goals.map((g, i) => (
              <line key={i} x1={X(g.x)} x2={X(g.x)} y1={T - 6 - g.level * 26} y2={T + H} className={g.side === 'home' ? 'club-stroke-h' : g.side === 'away' ? 'club-stroke-a' : 'stroke-white/40'} strokeWidth={1} strokeDasharray="2 3" opacity={0.55} />
            ))}
            {/* наведённый отрезок */}
            {cur ? <line x1={X(cur.x)} x2={X(cur.x)} y1={T} y2={T + H} className="stroke-white/20" /> : null}
            {/* линии команд: сначала гости, сверху хозяева */}
            {(['a', 'h'] as const).map((k) => (
              <g key={k} className={`momentum-line ${k === 'h' ? 'club-stroke-h' : 'club-stroke-a'}`}>
                <path d={area(k)} stroke="none" fillOpacity={0.05} />
                <path ref={(el) => void (lines.current[k] = el)} d={path(k)} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {/* точка — только у выбранного отрезка, у обеих команд */}
                {cur ? <circle cx={X(cur.x)} cy={Y(cur[k])} r={4} className="club-dot" strokeWidth={2} /> : null}
              </g>
            ))}
            {/* минуты матча */}
            {xTicks.map(({ m, x }, i) => (
              <text key={m} x={X(x)} y={T + H + 19} textAnchor={i === 0 ? 'start' : X(x) > L + pw - 16 ? 'end' : 'middle'} className="fill-mute text-[12px] tabular-nums">
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
                <span key={i} className={`absolute z-[3] ${shift}`} style={{ left: x, top: T - 28 - g.level * 26 }}>
                  <button
                    type="button"
                    aria-expanded={gAct === i}
                    onPointerEnter={(ev) => ev.pointerType === 'mouse' && setGAct(i)}
                    onPointerLeave={(ev) => ev.pointerType === 'mouse' && setGAct(null)}
                    onFocus={() => setGAct(i)}
                    onBlur={() => setGAct(null)}
                    // мышь открыла наведением, касание — нажатием; закрывается уходом курсора или нажатием мимо (blur)
                    onClick={() => setGAct(i)}
                    className={`flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-[12px] font-medium tabular-nums transition-colors ${gAct === i ? 'bg-white/[0.12] text-fg' : 'bg-white/[0.06] text-dim hover:text-fg'}`}
                  >
                    <NavIcon href="/" on size={12} />
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
            // сбоку от выбранного отрезка, чтобы не закрывать его точки: в левой половине — справа, в правой — слева
            className={`pointer-events-none absolute z-[2] whitespace-nowrap rounded-ctl bg-panel-3 px-2.5 py-1.5 text-[13px] shadow-lg w-max ${X(cur.x) < w / 2 ? '' : '-translate-x-full'}`}
            // ~190px — ширина подсказки: у краёв графика не выходит за блок
            style={{ left: X(cur.x) < w / 2 ? Math.min(X(cur.x) + 12, w - 190) : Math.max(X(cur.x) - 12, 190), top: T + 6 }}
          >
            {/* отрезок — минуты, по которым усреднён индекс (одна точка SStats — одна минута) */}
            <div className="text-[12px] text-mute">
              <span className="font-semibold text-fg tabular-nums">{cur.label}</span> · Давление
            </div>
            <div className="mt-1 grid grid-cols-[auto_auto_auto] items-center gap-x-2 gap-y-0.5">
              {(['h', 'a'] as const).map((k) => (
                <div key={k} className="contents">
                  {swatch(k)}
                  <span className="max-w-[9rem] truncate">{k === 'h' ? home.name : away.name}</span>
                  <span className="num text-right font-semibold">
                    {cur[k]}
                    <span className="font-normal text-mute">/100</span>
                  </span>
                </div>
              ))}
            </div>
            {/* события этого отрезка — отдельно от цифр давления */}
            {curEvents.length ? (
              <div className="mt-1.5 border-t border-white/10 pt-1.5 text-[12px] text-dim">
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

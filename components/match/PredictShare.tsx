'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon, type IconKey } from '@/components/Icon'

/** Всё, что попадает на картинку прогноза, — строками: партнёра с RegExp в клиентский компонент не передать. */
export type PredictCard = {
  home: string
  away: string
  /** «Ла Лига · сегодня 20:30» */
  when: string
  headline: string | null
  probs: { v: number; label: string; top: boolean }[] | null
  facts: string[]
  /** ставка — без букмекера и кэфа: картинку пересылают, а там нет пометки «Реклама» */
  bet: { label: string; outcome: string; fair: string } | null
  url: string
}

/**
 * «···» в шапке «Прогноза» (владелец: «справа кнопочку чтоб можно было фото сохранить или переслать»): «Сохранить
 * изображение» и «Поделиться» — как у «Давления команд». PNG 1080px рисуем заново на canvas: шапка с матчем, вывод, полоса
 * шансов, доводы, ставка (исход и честная цена — без букмекера и кэфа, см. `bet`), оговорка, адрес матча и tag.bet.
 */
export function PredictShare({ card }: { card: PredictCard }) {
  const [menu, setMenu] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const off = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setMenu(false)
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

  const png = async (): Promise<Blob | null> => {
    await document.fonts?.ready
    const W = 1080
    const P = 64
    const font = getComputedStyle(document.body).fontFamily
    const c = document.createElement('canvas')
    const g0 = c.getContext('2d')
    if (!g0) return null
    // перенос по словам — длинные доводы и названия
    const wrap = (t: string, f: string, max: number) => {
      g0.font = `${f} ${font}`
      const out: string[] = []
      let line = ''
      for (const w of t.split(' ')) {
        const next = line ? `${line} ${w}` : w
        if (line && g0.measureText(next).width > max) {
          out.push(line)
          line = w
        } else line = next
      }
      if (line) out.push(line)
      return out
    }
    const inner = W - 2 * P - 64
    const head = card.headline ? wrap(card.headline, '700 46px', inner) : []
    const facts = card.facts.flatMap((f) => wrap(f, '400 28px', inner - 30).map((l, i) => ({ l, first: i === 0 })))
    const outcome = card.bet ? wrap(card.bet.outcome, '700 38px', inner) : []
    const b1 = 32 + head.length * 56 + (card.probs ? 130 : 0) + (facts.length ? 24 + facts.length * 40 : 0) + 24
    const b2 = card.bet ? 32 + 36 + outcome.length * 48 + 52 + 24 : 0
    const top = 250
    const H = top + b1 + (b2 ? 32 + b2 : 0) + 190
    c.width = W
    c.height = H
    const g = g0
    const text = (t: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left', max?: number) => {
      g.font = `${f} ${font}`
      g.fillStyle = color
      g.textAlign = align
      g.fillText(t, x, y, max)
    }
    const tile = (y: number, h: number) => {
      g.fillStyle = 'rgba(255,255,255,0.05)'
      g.beginPath()
      g.roundRect(P, y, W - 2 * P, h, 28)
      g.fill()
    }
    g.fillStyle = '#11161d'
    g.fillRect(0, 0, W, H)
    text('Прогноз', P, P + 44, '700 46px', '#f2f4f7')
    text(`${card.home} — ${card.away}`, P, P + 106, '600 36px', '#e6e9ed', 'left', W - 2 * P)
    text(card.when, P, P + 150, '400 26px', '#8a939e', 'left', W - 2 * P)
    // блок прогноза
    tile(top, b1)
    let y = top + 32
    const L = P + 32
    const R = W - P - 32
    for (const l of head) {
      y += 44
      text(l, L, y, '700 46px', '#f2f4f7')
      y += 12
    }
    if (card.probs) {
      y += 18
      const sum = card.probs.reduce((s, p) => s + p.v, 0) || 1
      let x = L
      const span = R - L - 8
      card.probs.forEach((p, i) => {
        const w = (p.v / sum) * span
        g.fillStyle = p.top ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)'
        g.beginPath()
        g.roundRect(x, y, Math.max(w, 2), 10, [i === 0 ? 5 : 0, i === 2 ? 5 : 0, i === 2 ? 5 : 0, i === 0 ? 5 : 0])
        g.fill()
        x += w + 4
      })
      const xs = [L, (L + R) / 2, R]
      const al: CanvasTextAlign[] = ['left', 'center', 'right']
      card.probs.forEach((p, i) => {
        text(`${p.v}%`, xs[i], y + 56, '600 32px', p.top ? '#f2f4f7' : '#a3abb5', al[i])
        text(p.label, xs[i], y + 92, '400 24px', '#8a939e', al[i], (R - L) / 3 - 12)
      })
      y += 112
    }
    if (facts.length) {
      y += 24
      for (const f of facts) {
        y += 32
        if (f.first) {
          g.fillStyle = '#8a939e'
          g.beginPath()
          g.arc(L + 6, y - 10, 5, 0, Math.PI * 2)
          g.fill()
        }
        text(f.l, L + 30, y, '400 28px', '#e6e9ed')
        y += 8
      }
    }
    // блок ставки
    if (card.bet) {
      const y2 = top + b1 + 32
      tile(y2, b2)
      let yy = y2 + 32 + 26
      text(card.bet.label, L, yy, '600 26px', card.bet.label === 'Выгодная ставка' ? '#c8ff2e' : '#a3abb5')
      for (const l of outcome) {
        yy += 48
        text(l, L, yy, '700 38px', '#f2f4f7')
      }
      text(card.bet.fair, L, yy + 52, '400 26px', '#a3abb5', 'left', R - L)
    }
    text('Шанс по кэфам, а не гарантия. Ставки — это риск · 18+', P, H - 112, '400 22px', '#8a939e')
    text(card.url.replace(/^https?:\/\//, ''), P, H - 62, '400 20px', '#6b747f', 'left', W - 2 * P - 200)
    g.font = `700 34px ${font}`
    const bw = g.measureText('bet').width
    const dw = g.measureText('.').width
    text('bet', W - P, H - 62, '700 34px', '#f2f4f7', 'right')
    text('.', W - P - bw, H - 62, '700 34px', '#c8ff2e', 'right')
    text('tag', W - P - bw - dw, H - 62, '700 34px', '#f2f4f7', 'right')
    return new Promise((ok) => c.toBlob(ok, 'image/png'))
  }
  const fileName = () => `prognoz-${location.pathname.split('/').pop() || 'match'}.png`
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
    const title = `Прогноз: ${card.home} — ${card.away}`
    try {
      const b = await png()
      const file = b ? new File([b], fileName(), { type: 'image/png' }) : null
      if (file && navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title, text: `${title} — ${card.url}` })
      if (navigator.share) return await navigator.share({ title, url: card.url })
      await navigator.clipboard.writeText(card.url)
      setFlash('Ссылка скопирована')
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setFlash('Не удалось поделиться')
    }
  }
  // значки — те же, что в меню «Давления команд»
  const items: [string, IconKey, () => void][] = [
    ['Сохранить изображение', 'save', save],
    ['Поделиться', 'share', shareIt],
  ]
  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        aria-label="Сохранить или переслать прогноз"
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-dim hover:bg-white/[0.08] hover:text-fg ${menu ? 'bg-white/[0.08] text-fg' : ''}`}
      >
        <Icon k="more" className="h-[18px] w-[18px]" />
      </button>
      {menu ? (
        <div role="menu" className="absolute right-0 top-full z-10 mt-1 w-max max-w-[calc(100vw-2rem)] overflow-hidden rounded-tile bg-panel-3 py-1 text-[14px] shadow-lg">
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
              <Icon k={icon} size={16} className="shrink-0 text-dim" />
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {flash ? (
        <div role="status" className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-ctl bg-panel-3 px-2.5 py-1.5 text-[13px] shadow-lg">
          {flash}
        </div>
      ) : null}
    </div>
  )
}

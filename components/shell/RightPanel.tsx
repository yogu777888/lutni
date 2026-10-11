'use client'

import { useState } from 'react'
import type { FavTeam } from '../favorites'
import { TeamLogo } from '../TeamLogo'
import { PanelToggle } from './PanelToggle'

/** Значок Telegram (бумажный самолётик) — одним цветом. */
function TgIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21.4 4.3 2.9 11.5c-1.3.5-1.3 1.2-.2 1.6l4.7 1.5 1.8 5.6c.2.6.1.8.8.8.5 0 .7-.2 1-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.4-1.5ZM8.9 14.2l9.4-5.9c.4-.3.9-.1.5.2l-8 7.3-.3 3.3-1.6-4.9Z" />
    </svg>
  )
}

/** Места «пузырьков» с эмблемами в верхней части панели: x, y (% от области), диаметр px, сдвиг покачивания (с). */
const SPOTS: [number, number, number, number][] = [
  [18, 22, 64, 0],
  [62, 12, 52, -2],
  [42, 46, 76, -4],
  [82, 44, 48, -1],
  [12, 70, 46, -3],
  [70, 76, 60, -5],
  [36, 88, 40, -2.5],
  [88, 8, 36, -1.5],
]

/** Облако круглых эмблем популярных команд дня — белые круги разного размера, едва покачиваются. */
function CrestCloud({ teams }: { teams: FavTeam[] }) {
  const list = teams.filter((t) => t.logo).concat(teams.filter((t) => !t.logo)).slice(0, SPOTS.length)
  if (list.length < 3) return null
  return (
    <div aria-hidden className="relative mx-auto mt-2 h-[230px] w-full max-w-[260px] [@media(max-height:739px)]:hidden">
      {list.map((t, i) => {
        const [x, y, d, delay] = SPOTS[i]
        return (
          <span
            key={t.id}
            className="crest-bob absolute grid place-items-center rounded-full bg-white shadow-[0_8px_24px_rgb(0_0_0/0.25)]"
            style={{ left: `${x}%`, top: `${y}%`, width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, animationDelay: `${delay}s` }}
          >
            <TeamLogo name={t.name} src={t.logo ?? null} size={Math.round(d * 0.62)} />
          </span>
        )
      })}
    </div>
  )
}

const POINTS = [
  'Ваши команды — на всех устройствах',
  'Напоминания о матчах в Telegram',
  'Сигнал, когда падает кэф',
]

/**
 * Правая панель каркаса (от xl) — вход на сайт, как «Зарегистрируйся» у Spotify: вся панель — яркий градиент,
 * крупный заголовок, три пользы и белая кнопка «Войти через Telegram». Входа пока нет (бэкенд — следующим шагом):
 * кнопка только говорит «Скоро». Сверху — облако круглых эмблем популярных команд дня (`CrestCloud`). Свёрнута —
 * полоска со значком Telegram.
 */
export function RightPanel({ teams = [] }: { teams?: FavTeam[] }) {
  const [soon, setSoon] = useState(false)
  return (
    <div className="relative h-full overflow-hidden rounded-card bg-[linear-gradient(165deg,#7fb21a_0%,#1f9b7a_42%,#1f5f9e_78%,#2b3f8f_100%)] text-white">
      {/* свёрнута — полоска: кнопка «развернуть» и значок Telegram */}
      <div className="shell-r-rail h-full flex-col items-center gap-3 py-3">
        <PanelToggle side="r" open={false} />
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20" title="Войти через Telegram">
          <TgIcon className="h-5 w-5" />
        </span>
      </div>

      <div className="shell-r-full scrollbar-none flex h-full flex-col overflow-y-auto p-5">
        <div className="-ml-2 -mt-1 [&_button]:text-white/80 [&_button:hover]:bg-white/15 [&_button:hover]:text-white">
          <PanelToggle side="r" open />
        </div>
        <CrestCloud teams={teams} />
        <div className="mt-auto">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/75">tag.bet для своих</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[34px] font-semibold uppercase leading-[1.02]">
            Следи за своими командами
          </h2>
          <ul className="mt-5 space-y-2.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[14.5px] leading-snug">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setSoon(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-[#0b0f14] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <TgIcon className="h-5 w-5 text-[#229ed9]" />
            Войти через Telegram
          </button>
          <p className="mt-2.5 text-center text-[12.5px] text-white/75" aria-live="polite">
            {soon ? 'Скоро — уже делаем вход' : 'Бесплатно, без пароля и почты'}
          </p>
        </div>
      </div>
    </div>
  )
}

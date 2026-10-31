import { UI } from '@/components/Icon'
import { StorySymbol } from '@/components/story/StorySymbol'

/**
 * Значок темы слева от подписи строки статистики (владелец: «в статистике слева от показателя значок по теме ставить,
 * чтоб визуально было легче»): серый 16px, на линии текста; карточки — своим цветом (жёлтая, красная), это не текст.
 * Одна таблица на статистику матча (`StatsPanel`) и команд (`TeamStatsPanel`): ключ строки → знак. Нет ключа — по группе.
 */
type Glyph = { d?: string; ui?: keyof typeof UI; sym?: string; tone?: string }

const LINE = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// контурные знаки на сетке 24, линия 2px
const G = {
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 11.5v1',
  aim: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16M12 2v4M12 18v4M2 12h4M18 12h4',
  pie: 'M12 3a9 9 0 1 0 9 9h-9zM15 3.5a9 9 0 0 1 5.5 5.5H15z',
  goal: 'M3 19V6h18v13M7 6v13M11 6v13M15 6v13M19 6v13M3 10h18M3 14h18',
  shield: 'M12 3l7 3v5c0 4.6-3 8.2-7 10c-4-1.8-7-5.4-7-10V6z',
  glove: 'M8 21v-4l-3-4V8a1.5 1.5 0 0 1 3 0v3V5a1.5 1.5 0 0 1 3 0v5V4a1.5 1.5 0 0 1 3 0v6V6a1.5 1.5 0 0 1 3 0v8c0 3-1.5 5-4 7z',
  whistle: 'M10 9h11v4h-4.2A6 6 0 1 1 10 9zM10 9V6M8.5 15a1.5 1.5 0 1 0 0 .01',
  flag: 'M6 21V4M6 4h11l-2.5 4l2.5 4H6',
  zero: 'M12 4.5c3 0 4.5 3.4 4.5 7.5s-1.5 7.5-4.5 7.5S7.5 16.1 7.5 12S9 4.5 12 4.5M5 19L19 5',
  points: 'M12 3l2.6 5.6l6 .7l-4.5 4.1l1.2 6L12 16.4l-5.3 3l1.2-6l-4.5-4.1l6-.7z',
  dot: 'M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
} as const

const KEY: Record<string, Glyph> = {
  // статистика матча (`META` в lib/sstats/stat-rows.ts)
  ballPossession: { d: G.pie },
  passAccuracy: { ui: 'swap' },
  totalPasses: { ui: 'swap' },
  longPasses: { ui: 'swap' },
  finalThirdPasses: { ui: 'swap' },
  crosses: { ui: 'swap' },
  throughPasses: { ui: 'swap' },
  expectedGoals: { d: G.aim },
  xgOnTarget: { d: G.aim },
  expectedAssists: { d: G.aim },
  totalShots: { ui: 'ball' },
  shotsOnGoal: { d: G.target },
  shotsOffGoal: { ui: 'ball' },
  blockedShots: { d: G.shield },
  shotsInsideBox: { ui: 'ball' },
  shotsOutsideBox: { ui: 'ball' },
  hitWoodwork: { d: G.goal },
  bigChances: { d: G.target },
  touchesInBox: { ui: 'ball' },
  dangerousAttacks: { ui: 'chart' },
  cornerKicks: { sym: 'uglovye' },
  tackles: { d: G.shield },
  duelsWon: { d: G.shield },
  interceptions: { d: G.shield },
  clearances: { d: G.shield },
  errorsToShot: { d: G.shield },
  errorsToGoal: { d: G.shield },
  goalkeeperSaves: { d: G.glove },
  xgotFaced: { d: G.glove },
  goalsPrevented: { d: G.glove },
  goalKicks: { d: G.glove },
  fouls: { d: G.whistle },
  yellowCards: { ui: 'card', tone: '#ffd60a' },
  redCards: { ui: 'card', tone: '#ff453a' },
  offsides: { d: G.flag },
  freeKicks: { d: G.whistle },
  throwIns: { ui: 'swap' },
  // статистика команд (`TeamStatsPanel`)
  points5: { d: G.points },
  gf: { ui: 'ball' },
  ga: { d: G.goal },
  over25: { sym: 'tb-2-5' },
  btts: { sym: 'obe-zabyut' },
  cleanSheet: { d: G.shield },
  failedToScore: { d: G.zero },
  xgFor: { d: G.aim },
  xgAgainst: { d: G.aim },
  cornersFor: { sym: 'uglovye' },
  cornersAgainst: { sym: 'uglovye' },
  cards: { ui: 'card', tone: '#ffd60a' },
  cardsAgainst: { ui: 'card', tone: '#ffd60a' },
}

const BY_GROUP: Record<string, Glyph> = {
  ball: { ui: 'swap' },
  attack: { ui: 'ball' },
  defense: { d: G.shield },
  gk: { d: G.glove },
  discipline: { d: G.whistle },
}

export function StatIcon({ k, group }: { k: string; group?: string }) {
  return <StatGlyph k={k} group={group} className="mr-1.5 inline-block size-4 shrink-0 align-[-3px] text-mute" />
}

/** тот же знак строки статистики — своим размером и цветом (`currentColor`): тема вывода в «Матче в фокусе» */
export function StatGlyph({ k, group, className }: { k: string; group?: string; className: string }) {
  const g = KEY[k] ?? (group ? BY_GROUP[group] : undefined) ?? { d: G.dot }
  if (g.sym) return <StorySymbol k={g.sym} tone="currentColor" className={className} />
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} style={g.tone ? { color: g.tone } : undefined}>
      {g.ui ? <path fillRule="evenodd" fill="currentColor" d={UI[g.ui]} /> : <path d={g.d} {...LINE} />}
    </svg>
  )
}

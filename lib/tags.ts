/**
 * Теги ставок — главная фишка tag.bet.
 *
 * Каждый матч автоматически получает теги (#value, #ТБ2.5, #прогруз…) с
 * объяснением «почему». Теги — это одновременно:
 *  - навигация для игрока («покажи все матчи, где ждут много голов»);
 *  - SEO-страницы /tag/<slug> («прогнозы на тотал больше 2.5 сегодня»);
 *  - повод для клика на букмекера (у каждого тега есть рекомендуемый рынок).
 */
import { pct, pluralN } from './format'
import type { Candidate, Consensus, ModelOutput, Pick } from './model'
import { isValue } from './model'
import type { H2H, TeamForm } from './stats'
import type { Injury, Match, Standings } from './types'

export type TagDef = {
  slug: string
  label: string
  title: string
  /** Для чипсов и подсказок. */
  hint: string
  /** SEO-вводный текст на странице тега. */
  about: string
  /** Какую ставку обычно смотрят под этот тег. */
  bet: string
  /** Классы Tailwind для «пилюли». */
  tone: string
  /** Только по полным данным матча (нужна страница матча/прогрев). */
  deep: boolean
}

export const TAGS: TagDef[] = [
  {
    slug: 'value',
    label: '#value',
    title: 'Value-ставки',
    hint: 'Коэффициент выше справедливого',
    about:
      'Value-ставка — это исход, коэффициент на который у конкретного букмекера выше справедливого. Справедливый коэффициент мы считаем по консенсусу рынка без маржи (с повышенным весом «острых» букмекеров) и пуассоновской модели голов. Чем больше перевес (EV), тем выгоднее ставка на дистанции.',
    bet: 'Исход с максимальным перевесом',
    tone: 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/30',
    deep: true,
  },
  {
    slug: 'progruz',
    label: '#прогруз',
    title: 'Прогрузы',
    hint: 'Коэффициент резко упал',
    about:
      'Прогруз — заметное падение коэффициента на исход от открытия линии к текущему моменту. Обычно это значит, что на исход идут крупные деньги или вышли важные новости (травмы, составы). Мы сравниваем средние коэффициенты открытия и текущие по всем букмекерам.',
    bet: 'Исход, на который падает коэффициент',
    tone: 'text-rose-300 bg-rose-400/10 ring-rose-400/30',
    deep: false,
  },
  {
    slug: 'tb-2-5',
    label: '#ТБ2.5',
    title: 'Тотал больше 2.5',
    hint: 'Ждём результативный матч',
    about:
      'Матчи, в которых рынок и модель ожидают три и больше голов. Учитываем вероятность тотала больше 2.5 по линиям букмекеров, ожидаемые голы (xG) и результативность команд в последних матчах.',
    bet: 'Тотал больше 2.5',
    tone: 'text-orange-300 bg-orange-400/10 ring-orange-400/30',
    deep: false,
  },
  {
    slug: 'tm-2-5',
    label: '#ТМ2.5',
    title: 'Тотал меньше 2.5',
    hint: 'Ждём закрытую игру',
    about:
      'Матчи, где рынок ждёт не больше двух голов: осторожные команды, сильная оборона, высокая цена ошибки. Основа — вероятность тотала меньше 2.5 по линиям букмекеров и модель голов.',
    bet: 'Тотал меньше 2.5',
    tone: 'text-sky-300 bg-sky-400/10 ring-sky-400/30',
    deep: false,
  },
  {
    slug: 'obe-zabyut',
    label: '#обезабьют',
    title: 'Обе забьют',
    hint: 'Голы с обеих сторон',
    about:
      'Матчи, где высока вероятность, что забьют обе команды: по линии «обе забьют — да», пуассоновской модели и статистике последних игр (как часто команды забивают и пропускают).',
    bet: 'Обе забьют — да',
    tone: 'text-amber-300 bg-amber-400/10 ring-amber-400/30',
    deep: false,
  },
  {
    slug: 'favorit',
    label: '#фаворит',
    title: 'Явные фавориты',
    hint: 'Один из соперников сильно сильнее',
    about:
      'Матчи с явным фаворитом: рынок оценивает шансы одной из команд на победу в 60% и выше. Такие исходы часто используют в экспрессах, а на одиночные ставки смотрят в сторону форы.',
    bet: 'Победа фаворита или фора',
    tone: 'text-violet-300 bg-violet-400/10 ring-violet-400/30',
    deep: false,
  },
  {
    slug: 'ravnye',
    label: '#равные',
    title: 'Равные силы',
    hint: 'Шансы почти одинаковые',
    about:
      'Матчи равных соперников: разница в шансах на победу минимальна. В таких играх часто смотрят ничью, двойной шанс или тоталы.',
    bet: 'Ничья, двойной шанс или тотал',
    tone: 'text-slate-200 bg-slate-400/10 ring-slate-400/30',
    deep: false,
  },
  {
    slug: 'andedog',
    label: '#андердог',
    title: 'Андердог в форме',
    hint: 'Аутсайдер линии играет лучше фаворита',
    about:
      'Команда — аутсайдер по линии букмекеров, но в последних пяти матчах набрала заметно больше очков, чем соперник. Рынок может недооценивать текущую форму.',
    bet: 'Победа или фора андердога',
    tone: 'text-yellow-200 bg-yellow-400/10 ring-yellow-400/30',
    deep: true,
  },
  {
    slug: 'seriya',
    label: '#серия',
    title: 'Серии',
    hint: 'Длинная серия побед или поражений',
    about:
      'У одной из команд длинная серия: несколько побед или поражений подряд. Серии влияют на мотивацию и на то, как букмекеры формируют линию.',
    bet: 'Зависит от направления серии',
    tone: 'text-cyan-300 bg-cyan-400/10 ring-cyan-400/30',
    deep: true,
  },
  {
    slug: 'krepost',
    label: '#крепость',
    title: 'Домашняя крепость',
    hint: 'Хозяева не проигрывают дома',
    about:
      'Хозяева давно не проигрывают на своём поле. Домашний фактор в футболе один из самых стабильных — смотрите на победу или двойной шанс хозяев.',
    bet: 'Хозяева не проиграют (1X)',
    tone: 'text-teal-300 bg-teal-400/10 ring-teal-400/30',
    deep: true,
  },
  {
    slug: 'kadry',
    label: '#кадры',
    title: 'Кадровые потери',
    hint: 'Много травмированных и дисквалифицированных',
    about:
      'Одна из команд не досчитается сразу нескольких игроков из-за травм и дисквалификаций. Проверьте, учёл ли это рынок.',
    bet: 'Против ослабленной команды',
    tone: 'text-red-300 bg-red-400/10 ring-red-400/30',
    deep: true,
  },
  {
    slug: 'h2h',
    label: '#h2h',
    title: 'Тренд личных встреч',
    hint: 'Устойчивый тренд в очных матчах',
    about:
      'В последних личных встречах команд прослеживается устойчивый тренд: много голов или доминирование одной из команд.',
    bet: 'По тренду личных встреч',
    tone: 'text-fuchsia-300 bg-fuchsia-400/10 ring-fuchsia-400/30',
    deep: true,
  },
  {
    slug: 'top-match',
    label: '#топматч',
    title: 'Топ-матчи',
    hint: 'Встреча лидеров',
    about: 'Встречи команд из верхней части турнирной таблицы — главные матчи тура.',
    bet: 'Смотрите полный анализ матча',
    tone: 'text-lime-200 bg-lime-400/10 ring-lime-400/30',
    deep: true,
  },
]

export const TAG_BY_SLUG = new Map(TAGS.map((t) => [t.slug, t]))

export type TagHit = { slug: string; score: number; reason: string }

export type TagInput = {
  match: Match
  cons?: Consensus | null
  model?: ModelOutput | null
  candidates?: Candidate[]
  pick?: Pick | null
  homeForm?: TeamForm | null
  awayForm?: TeamForm | null
  h2h?: H2H | null
  injuries?: Injury[]
  standings?: Standings | null
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const MATCHES = ['матч', 'матча', 'матчей'] as const
const q = (name: string) => `«${name}»`

export function computeTags(input: TagInput): TagHit[] {
  const { match, cons, model } = input
  const hits: TagHit[] = []
  const add = (slug: string, score: number, reason: string) => hits.push({ slug, score: clamp01(score), reason })
  const home = match.home.name
  const away = match.away.name

  // вероятности исходов: модель (если посчитана) или чистый консенсус
  const x12 = model?.x12 ?? cons?.x12 ?? null
  const over25 = model?.over['2.5'] ?? cons?.over['2.5'] ?? null
  const btts = model?.btts ?? cons?.btts ?? null

  // #value
  const values = (input.candidates ?? []).filter(isValue).sort((a, b) => (b.ev ?? 0) - (a.ev ?? 0))
  if (values.length) {
    const c = values[0]
    const o = c.bestPartner ?? c.best!
    add(
      'value',
      (c.ev ?? 0) / 0.12,
      `${c.label} за ${o.value.toFixed(2)} (${o.partner?.name ?? o.bookmakerName}) при справедливом ${c.fairOdd.toFixed(2)}: перевес +${((c.ev ?? 0) * 100).toFixed(1)}%`,
    )
  }

  // #прогруз — средний коэффициент на исход упал от открытия
  if (cons?.movement) {
    let best: { side: 'home' | 'away'; drop: number; from: number; to: number } | null = null
    for (const side of ['home', 'away'] as const) {
      const mv = cons.movement[side]
      if (!mv || mv.opening <= 1 || mv.current <= 1) continue
      const drop = 1 - mv.current / mv.opening
      if (drop >= 0.08 && (!best || drop > best.drop)) best = { side, drop, from: mv.opening, to: mv.current }
    }
    if (best) {
      add(
        'progruz',
        best.drop / 0.2,
        `Коэффициент на победу ${q(best.side === 'home' ? home : away)} упал с ${best.from.toFixed(2)} до ${best.to.toFixed(2)} (−${Math.round(best.drop * 100)}%)`,
      )
    }
  }

  // тоталы
  if (over25 != null) {
    if (over25 >= 0.57) add('tb-2-5', (over25 - 0.55) / 0.2, `Вероятность тотала больше 2.5 — ${pct(over25)}`)
    else if (1 - over25 >= 0.57) add('tm-2-5', (0.45 - over25) / 0.2, `Вероятность тотала меньше 2.5 — ${pct(1 - over25)}`)
  } else if (input.homeForm && input.awayForm) {
    const f = (input.homeForm.over25Rate + input.awayForm.over25Rate) / 2
    if (f >= 0.7) add('tb-2-5', (f - 0.6) / 0.3, `ТБ 2.5 заходил в ${pct(f)} последних матчей команд`)
    if (f <= 0.3) add('tm-2-5', (0.4 - f) / 0.3, `ТМ 2.5 заходил в ${pct(1 - f)} последних матчей команд`)
  }

  // обе забьют
  if (btts != null && btts >= 0.57) {
    add('obe-zabyut', (btts - 0.55) / 0.2, `Вероятность, что забьют обе команды, — ${pct(btts)}`)
  } else if (btts == null && input.homeForm && input.awayForm) {
    const hf = input.homeForm
    const af = input.awayForm
    if (hf.bttsRate >= 0.6 && af.bttsRate >= 0.6 && hf.failedToScoreRate <= 0.2 && af.failedToScoreRate <= 0.2) {
      add('obe-zabyut', (hf.bttsRate + af.bttsRate) / 2 - 0.4, `Обе забивали в ${pct((hf.bttsRate + af.bttsRate) / 2)} последних матчей команд`)
    }
  }

  // фаворит / равные
  if (x12) {
    const fav = x12.home >= x12.away ? { name: home, p: x12.home } : { name: away, p: x12.away }
    if (fav.p >= 0.6) add('favorit', (fav.p - 0.55) / 0.3, `Шансы ${q(fav.name)} на победу — ${pct(fav.p)}`)
    const diff = Math.abs(x12.home - x12.away)
    if (diff <= 0.06) add('ravnye', 1 - diff / 0.06, `Шансы почти равны: П1 ${pct(x12.home)} — П2 ${pct(x12.away)}, ничья ${pct(x12.draw)}`)
  }

  const hf = input.homeForm
  const af = input.awayForm

  // андердог в форме
  if (x12 && hf && af && hf.last5.length >= 4 && af.last5.length >= 4) {
    const dogHome = x12.home < x12.away
    const dogP = dogHome ? x12.home : x12.away
    const dog = dogHome ? hf : af
    const fav = dogHome ? af : hf
    if (dogP <= 0.36 && dog.points5 >= fav.points5 + 3) {
      add(
        'andedog',
        (dog.points5 - fav.points5) / 9,
        `Команда ${q(dogHome ? home : away)} — аутсайдер по линии (${pct(dogP)}), но за 5 матчей набрала ${pluralN(dog.points5, ['очко', 'очка', 'очков'])} против ${fav.points5} у соперника`,
      )
    }
  }

  // серии
  for (const [f, name] of [
    [hf, home],
    [af, away],
  ] as const) {
    if (!f?.streak) continue
    const { kind, len } = f.streak
    const games = pluralN(len, MATCHES)
    if (kind === 'W' && len >= 4) add('seriya', len / 8, `Команда ${q(name)} выиграла ${games} подряд`)
    if (kind === 'L' && len >= 4) add('seriya', len / 8, `Команда ${q(name)} проиграла ${games} подряд`)
    if (kind === 'unbeaten' && len >= 8) add('seriya', len / 14, `Команда ${q(name)} не проигрывает ${games} подряд`)
    if (kind === 'winless' && len >= 6) add('seriya', len / 12, `Команда ${q(name)} не побеждает ${games} подряд`)
  }

  // крепость
  if (hf && hf.home.played >= 4 && hf.home.unbeatenRun >= 5 && hf.home.wins >= 3) {
    add('krepost', hf.home.unbeatenRun / 8, `${q(home)} не проигрывает дома ${pluralN(hf.home.unbeatenRun, MATCHES)} подряд`)
  }

  // кадровые потери
  if (input.injuries?.length) {
    for (const [team, name] of [
      [match.home, home],
      [match.away, away],
    ] as const) {
      const n = input.injuries.filter((i) => i.teamId === team.id).length
      if (n >= 3) add('kadry', n / 6, `Команда ${q(name)} не досчитается ${n} игроков`)
    }
  }

  // личные встречи
  const h = input.h2h
  if (h && h.games.length >= 4) {
    const n = h.games.length
    if (h.over25Rate >= 0.75) add('h2h', h.over25Rate - 0.25, `В ${Math.round(h.over25Rate * n)} из ${n} последних очных встреч было больше 2.5 голов`)
    else if (h.homeWins / n >= 0.75) add('h2h', h.homeWins / n - 0.25, `Команда ${q(home)} выиграла ${h.homeWins} из ${n} последних личных встреч`)
    else if (h.awayWins / n >= 0.75) add('h2h', h.awayWins / n - 0.25, `Команда ${q(away)} выиграла ${h.awayWins} из ${n} последних личных встреч`)
  }

  // топ-матч
  const table = input.standings?.groups.find((g) => g.rows.some((r) => r.teamId === match.home.id))
  if (table && table.rows.length >= 8) {
    const rh = table.rows.find((r) => r.teamId === match.home.id)?.rank
    const ra = table.rows.find((r) => r.teamId === match.away.id)?.rank
    if (rh && ra && rh <= 4 && ra <= 4) add('top-match', 1 - (rh + ra) / 10, `Встреча команд с ${Math.min(rh, ra)}-го и ${Math.max(rh, ra)}-го места`)
  }

  // один тег одного типа — оставляем самый сильный
  const bySlug = new Map<string, TagHit>()
  for (const t of hits) {
    const cur = bySlug.get(t.slug)
    if (!cur || t.score > cur.score) bySlug.set(t.slug, t)
  }
  return [...bySlug.values()].sort(
    (a, b) => TAGS.findIndex((t) => t.slug === a.slug) - TAGS.findIndex((t) => t.slug === b.slug),
  )
}

import type { ReactNode } from 'react'
import type { CircleKind, StoryFocus, StoryGroup } from '@/lib/story-groups'
import type { SeenMark } from './seen'

/** Открыть сторис из любого места страницы: StoryLink, кружки на главной, кнопка на странице матча, ?story=<id>. */
export const OPEN_STORY = 'tagbet:story'

/** Матч в очереди сторис; group и focus — если открыли из кружка (подпись в шапке и «почему» на обложке). */
export type StoryQueueItem = {
  id: number
  href: string
  /** cover — своя картинка кружка (public/stories), если есть: фон сторис; pos/total — место матча в кружке («2/5») */
  group?: { key: string; label: string; kind: CircleKind; cover?: string; pos: number; total: number }
  focus?: StoryFocus | null
  /** Матчи следующих кружков, которые уже были раньше в очереди: отметить просмотренными, когда дойдём сюда. */
  also?: SeenMark[]
}

export type OpenStoryDetail = {
  id: number
  href: string
  opener?: HTMLElement | null
  /** Открыто по ссылке ?story=<id>: без своей записи в истории браузера. */
  deep?: boolean
  /** Готовая очередь (кружки). Без неё листаем матчи в порядке ссылок на странице. */
  queue?: StoryQueueItem[]
  /** Ряд кружков над историей на компьютере («Подборки дня», «Турниры дня»): переключать подборку, не закрывая историю. */
  circles?: StoryRow
}

/**
 * Кружки ряда — те же, что в панели, из которой открыли: `disc` рисует круг 36px с кольцом по свежим отметкам `seen`
 * (без `data-story-key` — иначе история при закрытии сворачивалась бы в кружок внутри себя).
 */
export type StoryRow = { title: string; groups: StoryGroup[]; disc: (g: StoryGroup, seen: Set<string>) => ReactNode }

export function openStory(detail: OpenStoryDetail) {
  window.dispatchEvent(new CustomEvent<OpenStoryDetail>(OPEN_STORY, { detail }))
}

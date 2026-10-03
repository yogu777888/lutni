import type { CircleKind, StoryFocus } from '@/lib/story-groups'
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
}

export function openStory(detail: OpenStoryDetail) {
  window.dispatchEvent(new CustomEvent<OpenStoryDetail>(OPEN_STORY, { detail }))
}

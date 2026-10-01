/** Открыть сторис из любого места страницы: StoryLink, кнопка на странице матча, ?story=<id>. */
export const OPEN_STORY = 'tagbet:story'

export type OpenStoryDetail = {
  id: number
  href: string
  opener?: HTMLElement | null
  /** Открыто по ссылке ?story=<id>: без своей записи в истории браузера. */
  deep?: boolean
}

export function openStory(detail: OpenStoryDetail) {
  window.dispatchEvent(new CustomEvent<OpenStoryDetail>(OPEN_STORY, { detail }))
}

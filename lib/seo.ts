/**
 * Что отдаём поисковикам (владелец: «мне по большому счету просто надо оптимизировать сайт чтоб его поисковики не
 * утопили»). Тысячи почти одинаковых страниц матчей низших лиг без линии, разбора и подборок — главный риск фильтров
 * за «малополезный контент»: о сайте судят по большинству страниц. Такие страницы посетители видят как обычно, но в
 * индекс и карту сайта они не идут (`noindex, follow` — ссылки с них поисковик учитывает).
 */
import type { Metadata } from 'next'
import { isFeatured } from '@/config/leagues'
import { IS_MOCK } from './sstats/client'
import type { Match } from './types'

/**
 * Страница матча в поиске — только у топ-турниров: прогрев разбирает их заранее (подборки, «выгодно», xG прошлых
 * матчей, составы, история линии PARI), у остальных — табло и общий текст.
 */
export const indexMatch = (m: Match) => m.status !== 'cancelled' && isFeatured(m.league)

/** Страница турнира в поиске — только у топ-турниров: из 1249 турниров у большинства на странице почти ничего нет. */
export const indexLeague = (l: { id: number; name: string; country?: string }) => isFeatured(l)

/** Закрыть страницу от индекса; в демо закрыто всё и ссылки тоже (`robots` в `app/layout.tsx`) — не перебиваем. */
export const NOINDEX: Metadata['robots'] = IS_MOCK ? { index: false, follow: false } : { index: false, follow: true }

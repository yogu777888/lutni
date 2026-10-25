import type { Metadata } from 'next'
import { DayView, dayTitle } from '@/components/DayView'
import { todayYmd } from '@/lib/format'

// готовая главная хранится 30 с и отдаётся всем (ISR; владелец: «если будет 10000 посетителей…»); «По времени»
// (`/?sort=time`) — отдельная страница всегда свежей сборки (`app/matches/po-vremeni`, подмена адреса в next.config.ts)
export const revalidate = 30

export async function generateMetadata(): Promise<Metadata> {
  const today = todayYmd()
  return {
    title: { absolute: `${dayTitle(today, today)}: коэффициенты, теги и прогнозы | tag.bet` },
    description:
      'Матчи сегодня с коэффициентами букмекеров и тегами ставок: value, прогрузы, тоталы, «обе забьют». Вероятности без маржи, форма команд и прогнозы tag.bet.',
    alternates: { canonical: '/' },
  }
}

export default async function Home() {
  const today = todayYmd()
  return <DayView ymd={today} today={today} sort="league" />
}

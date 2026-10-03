import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { DayView, dayTitle } from '@/components/DayView'
import { diffDays, isYmd, todayYmd } from '@/lib/format'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ date: string }>; searchParams: Promise<{ sort?: string }> }

function valid(date: string) {
  return isYmd(date) && Math.abs(diffDays(date, todayYmd())) <= 365
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params
  if (!valid(date)) return {}
  const today = todayYmd()
  const past = diffDays(date, today) < 0
  return {
    title: `${dayTitle(date, today)}${past ? '' : ': коэффициенты и прогнозы'}`,
    description: past
      ? `Результаты футбольных матчей за ${date.split('-').reverse().join('.')}: счёт, статистика, теги ставок.`
      : `Футбольные матчи ${date.split('-').reverse().join('.')}: коэффициенты букмекеров, теги ставок, вероятности и прогнозы.`,
    alternates: { canonical: `/matches/${date}` },
  }
}

export default async function DayPage({ params, searchParams }: Props) {
  const { date } = await params
  const { sort } = await searchParams
  if (!valid(date)) notFound()
  const today = todayYmd()
  if (date === today) redirect(sort === 'time' ? '/?sort=time' : '/')
  return <DayView ymd={date} today={today} sort={sort === 'time' ? 'time' : 'league'} />
}

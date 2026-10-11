import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { DayView, dayTitle, listTitle } from '@/components/DayView'
import { diffDays, isYmd, todayYmd } from '@/lib/format'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ date: string }>; searchParams: Promise<{ sort?: string }> }

const valid = (date: string) => isYmd(date) && Math.abs(diffDays(date, todayYmd())) <= 365

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params
  if (!valid(date)) return {}
  const today = todayYmd()
  const dmy = date.split('-').reverse().join('.')
  return {
    title: `${listTitle(dayTitle(date, today))}: список матчей`,
    description: `Все футбольные матчи ${dmy} по турнирам и по времени: счёт, коэффициенты букмекеров и теги ставок.`,
    alternates: { canonical: `/matches/${date}/all` },
  }
}

/** Полный список матчей другого дня (сегодня — /matches). */
export default async function DayListPage({ params, searchParams }: Props) {
  const { date } = await params
  const { sort } = await searchParams
  if (!valid(date)) notFound()
  const today = todayYmd()
  if (date === today) redirect(sort === 'time' ? '/matches?sort=time' : '/matches')
  return <DayView ymd={date} today={today} view="list" sort={sort === 'time' ? 'time' : 'league'} />
}

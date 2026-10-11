import Link from 'next/link'
import { PARTNERS } from '@/config/bookmakers'
import { PartnerCard } from '../PartnerCard'

/** «Где ставить» в правой панели каркаса: три легальных букмекера с бонусом (реклама, 18+). */
export function WhereToBet() {
  return (
    <section className="rounded-card bg-panel p-4">
      <h2 className="text-[15px] font-semibold">Где ставить</h2>
      <div className="mt-3 divide-y divide-edge">
        {PARTNERS.slice(0, 3).map((p) => (
          <PartnerCard key={p.slug} partner={p} placement="sidebar" />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-mute">Только букмекеры с лицензией ФНС России · 18+</p>
      <Link href="/bookmakers" className="mt-2 inline-block text-[13px] font-semibold text-dim transition-colors hover:text-fg">
        Весь рейтинг →
      </Link>
    </section>
  )
}

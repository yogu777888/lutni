import type { Partner } from '@/config/bookmakers'
import { SPONSORED_REL } from '@/lib/affiliate'
import { PartnerBadge } from './PartnerBadge'

/** Нижняя плашка на мобильных: главный CTA всегда под пальцем. */
export function StickyCta({ partner, href, title, subtitle, action }: { partner: Partner; href: string; title: string; subtitle: string; action: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-ink/95 px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5 backdrop-blur lg:hidden">
      <a href={href} target="_blank" rel={SPONSORED_REL} className="flex items-center gap-3">
        <PartnerBadge partner={partner} size={38} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{title}</span>
          <span className="block truncate text-[11px] text-dim">{subtitle} · Реклама · 18+</span>
        </span>
        <span className="shrink-0 rounded-xl bg-acid px-4 py-2.5 text-sm font-extrabold text-acid-ink">{action}</span>
      </a>
    </div>
  )
}

import { IS_MOCK } from '@/lib/sstats/client'

/** В демо-режиме честно предупреждаем, что данные синтетические — тихо, без кричащей плашки. */
export function DemoBanner() {
  if (!IS_MOCK) return null
  return (
    <div className="border-b border-[#2b2611] bg-[#17150b] px-4 py-1.5 text-center text-[12px] text-[#e3c565]">
      <span className="sm:hidden">Демо-режим: данные сгенерированы для проверки</span>
      <span className="hidden sm:inline">
        Демо-режим: матчи и коэффициенты сгенерированы для проверки сайта. Чтобы подключить реальные данные, уберите SSTATS_MOCK=1.
      </span>
    </div>
  )
}

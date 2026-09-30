import { IS_MOCK } from '@/lib/sstats/client'

/** В демо-режиме честно предупреждаем, что данные синтетические. */
export function DemoBanner() {
  if (!IS_MOCK) return null
  return (
    <div className="bg-draw/90 px-4 py-1.5 text-center text-xs font-semibold text-black">
      Демо-режим: матчи и коэффициенты сгенерированы для проверки сайта. Чтобы подключить реальные данные, уберите SSTATS_MOCK=1.
    </div>
  )
}

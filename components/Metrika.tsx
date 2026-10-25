'use client'

import Script from 'next/script'
import { useConsent } from './consent'
import { MetrikaGoals } from './MetrikaGoals'

/** Яндекс.Метрика + цель «bk_click» на каждый переход к букмекеру — только после «Принять» в плашке cookie. */
export function Metrika({ id }: { id: string }) {
  const consent = useConsent()
  if (!/^\d+$/.test(id) || consent !== 'yes') return null
  return (
    <>
      <Script id="ym" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${id},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}
      </Script>
      <MetrikaGoals id={Number(id)} />
    </>
  )
}

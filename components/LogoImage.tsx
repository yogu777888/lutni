'use client'

import { useState } from 'react'
import { Monogram } from './Monogram'

export function LogoImage({ name, src, size }: { name: string; src: string; size: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Monogram name={name} size={size} />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  )
}

import { icons, type IconName } from '@/core/icons'
import type { CSSProperties } from 'react'

interface Props {
  name: IconName
  size?: number
  stroke?: number
  color?: string
  inverse?: string
  style?: CSSProperties
  className?: string
}

export function Icon({ name, size = 22, stroke = 1.8, color = 'currentColor', inverse = 'var(--surface)', style, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
      className={className}
    >
      {icons[name].map((s, i) => {
        const fill = s.fill ? ('inv' in s && s.inv ? inverse : color) : 'none'
        const strokeProp = s.fill ? 'none' : undefined
        if (s.t === 'path') return <path key={i} d={s.d} fill={fill} stroke={strokeProp} />
        if (s.t === 'circle') return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={fill} stroke={strokeProp} />
        return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={fill} stroke={strokeProp} />
      })}
    </svg>
  )
}

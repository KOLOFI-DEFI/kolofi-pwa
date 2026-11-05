/**
 * Icon geometry shared by web (<svg>) and native (react-native-svg).
 * 24×24 viewBox, stroke-based (stroke = currentColor, width 1.8) unless `fill` is set.
 * Shapes with `inv` are filled with the icon's inverse colour (e.g. the phone inside the WhatsApp bubble).
 */
export type IconShape =
  | { t: 'path'; d: string; fill?: boolean; inv?: boolean }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: boolean }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx: number; fill?: boolean }

const p = (d: string, fill = false, inv = false): IconShape => ({ t: 'path', d, fill, inv })
const c = (cx: number, cy: number, r: number, fill = false): IconShape => ({ t: 'circle', cx, cy, r, fill })
const r = (x: number, y: number, w: number, h: number, rx: number, fill = false): IconShape => ({ t: 'rect', x, y, w, h, rx, fill })

export const icons = {
  back: [p('M14.5 6l-6 6 6 6')],
  close: [p('M6.5 6.5l11 11M17.5 6.5l-11 11')],
  chevronRight: [p('M9.5 6l6 6-6 6')],
  plus: [p('M12 5v14M5 12h14')],
  arrowUpRight: [p('M7 17L17 7M9 7h8v8')],
  bell: [p('M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5h-14z'), p('M10 20.5a2.2 2.2 0 0 0 4 0')],
  home: [p('M4 10.5L12 4l8 6.5V20h-5.5v-5.5h-5V20H4z')],
  vault: [r(3.5, 5.5, 17, 13, 3), c(12, 12, 3)],
  circles: [c(12, 6, 2.3, true), c(6.3, 16, 2.3, true), c(17.7, 16, 2.3, true), p('M8.3 8.7a7 7 0 0 0-1.8 4.3M15.7 8.7a7 7 0 0 1 1.8 4.3M9 19.2a7 7 0 0 0 6 0')],
  user: [c(12, 8.5, 3.8), p('M4.5 20c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5')],
  copy: [r(8.5, 8.5, 11, 11, 2.5), p('M15.5 8.5V6a2 2 0 0 0-2-2H6.5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2')],
  check: [p('M5 12.5l4.5 4.5L19 7.5')],
  lock: [r(5, 10.5, 14, 10, 2.5), p('M8 10.5V8a4 4 0 0 1 8 0v2.5')],
  more: [c(6, 12, 1.4, true), c(12, 12, 1.4, true), c(18, 12, 1.4, true)],
  backspace: [p('M9 5.5h10.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3.5 12z'), p('M11.5 9.5l5 5M16.5 9.5l-5 5')],
  external: [r(4, 4, 16, 16, 3, true)],
  target: [c(12, 12, 7.5), c(12, 12, 3.5)],
  stopwatch: [c(12, 13.5, 6.5), p('M12 13.5V10M10 3.5h4M17.5 7.5l1.2-1.2')],
  star: [p('M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z', true)],
  faceId: [p('M12 4.5L19.5 12 12 19.5 4.5 12z', false), c(12, 12, 2, true)],
  personal: [c(12, 12, 6, true)],
  pie: [c(12, 12, 7), p('M12 5v7h7')],
  help: [c(12, 12, 8), p('M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4'), c(12, 16.8, 0.9, true)],
  sun: [c(12, 12, 4), p('M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4')],
  moon: [p('M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z')],
  activity: [p('M3.5 12h4l2.5-6 4 12 2.5-6h4')],
  wallet: [r(3.5, 6, 17, 13, 3), p('M16 12.5h4.5'), p('M6.5 6l9-2.5 1 2.5')],
  logout: [p('M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14'), p('M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5')],
  download: [p('M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14')],
  arrowDownLeft: [p('M17 7L7 17M15 17H7V9')],
  shield: [p('M12 3.5l7 2.8v5.4c0 4.3-2.9 7.6-7 8.8-4.1-1.2-7-4.5-7-8.8V6.3z'), p('M9 12l2.2 2.2L15.5 10')],
  key: [c(8, 15, 3.5), p('M10.5 12.5L19 4M15.5 7.5l2.5 2.5M17.5 5.5l2 2')],
  mail: [r(3.5, 5.5, 17, 13, 2.5), p('M4 7l8 6 8-6')],
  device: [r(6.5, 3, 11, 18, 2.5), p('M10.5 18h3')],
  refresh: [p('M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.5H15')],
  swap: [p('M7 7.5h12M15.5 4l3.5 3.5-3.5 3.5M17 16.5H5M8.5 13L5 16.5 8.5 20')],
  clock: [c(12, 12, 8), p('M12 7.5V12l3 2')],
  hash: [p('M9 4l-2 16M17 4l-2 16M4.5 9h16M3.5 15h16')],
  grid: [r(4, 4, 6.5, 6.5, 1.5), r(13.5, 4, 6.5, 6.5, 1.5), r(4, 13.5, 6.5, 6.5, 1.5), r(13.5, 13.5, 6.5, 6.5, 1.5)],
  sparkle: [p('M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z')],
  info: [c(12, 12, 8), p('M12 11v5.5'), c(12, 7.8, 0.9, true)],
  monitor: [r(3, 4.5, 18, 12, 2.5), p('M8.5 20h7M12 16.5V20')],
  whatsapp: [
    p('M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2z', true),
    p('M9.1 7.6c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.9 4.5 4 2.2.9 2.7.7 3.2.6.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3l-1.8-.9c-.3-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.6.1a7.2 7.2 0 0 1-3.6-3.1c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.9z', true, true),
  ],
} satisfies Record<string, IconShape[]>

export type IconName = keyof typeof icons

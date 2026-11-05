import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { fileURLToPath } from 'node:url'
import { screens } from './screens'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Screenshots every screen in light and dark at the board's phone size (430×932, iPhone safe areas
 * emulated, diffed against design/frames) and at desktop size (1440×900, saved for review).
 * Output goes to e2e/__diff__. A test fails only on a broken render (blank page), since fonts and
 * antialiasing make exact pixel equality unrealistic.
 */
const OUT = path.join(__dirname, '__diff__')
fs.mkdirSync(OUT, { recursive: true })

const readyUser = {
  id: '01JCA0ZB7K3V9QH2X5M8N4P6RT', first_name: 'Ada', last_name: 'Obi', email: 'ada@example.com', phone: '+2348031234567',
  email_verified: true, phone_verified: false, has_transaction_pin: true, is_frozen: false, withdrawals_held_until: null, created_at: '2026-07-01T09:00:00Z',
}

for (const device of ['phone', 'desktop'] as const)
for (const scheme of ['light', 'dark'] as const) {
  for (const s of screens) {
    test(`${s.n} ${s.name} (${device}, ${scheme})`, async ({ page }) => {
      if (device === 'desktop') await page.setViewportSize({ width: 1440, height: 900 })
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await page.addInitScript(
        ([guest, user]) => {
          localStorage.setItem('kolofi.session.v2', JSON.stringify({ state: guest ? { token: null, user: null, introSeen: true } : { token: 'mock', user, introSeen: true }, version: 0 }))
          localStorage.setItem('kolofi.theme', JSON.stringify({ state: { preference: 'system' }, version: 0 }))
        },
        ['guest' in s && s.guest, readyUser] as const,
      )
      await page.goto(s.path)
      if (device === 'phone') await page.addStyleTag({ content: ':root{--safe-top:54px !important;--safe-bottom:34px !important}' })
      await page.addStyleTag({ content: 'input{caret-color:transparent !important}' })
      await page.waitForTimeout(1400)
      const shot = await page.screenshot({ fullPage: device === 'desktop' })
      fs.writeFileSync(path.join(OUT, `${s.n}-${s.name}-${device}-${scheme}.app.png`), shot)
      if (device === 'desktop') {
        expect(shot.length).toBeGreaterThan(10_000)
        return
      }

      const framePath = path.join(__dirname, '..', 'design', 'frames', `${s.n}-${s.name}-${scheme}.png`)
      if (fs.existsSync(framePath)) {
        const a = PNG.sync.read(shot)
        const b = PNG.sync.read(fs.readFileSync(framePath))
        const w = Math.min(a.width, b.width)
        const h = Math.min(a.height, b.height)
        const crop = (img: PNG) => {
          const o = new PNG({ width: w, height: h })
          PNG.bitblt(img, o, 0, 0, w, h, 0, 0)
          return o
        }
        const diff = new PNG({ width: w, height: h })
        const px = pixelmatch(crop(a).data, crop(b).data, diff.data, w, h, { threshold: 0.2 })
        fs.writeFileSync(path.join(OUT, `${s.n}-${s.name}-${scheme}.diff.png`), PNG.sync.write(diff))
        test.info().annotations.push({ type: 'diff', description: `${((px / (w * h)) * 100).toFixed(1)}% pixels differ` })
      }
      expect(shot.length).toBeGreaterThan(10_000)
    })
  }
}

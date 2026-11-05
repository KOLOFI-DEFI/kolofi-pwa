import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { fileURLToPath } from 'node:url'
import { screens } from './screens'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Screenshots every screen at the board's 430×932 size in light and dark, with the iPhone
 * safe areas emulated, then diffs against design/frames. Diffs are written to e2e/__diff__ for review;
 * the test fails only on a broken render (blank page), since fonts/antialiasing make exact pixel equality unrealistic.
 */
const OUT = path.join(__dirname, '__diff__')
fs.mkdirSync(OUT, { recursive: true })

for (const scheme of ['light', 'dark'] as const) {
  for (const s of screens) {
    test(`${s.n} ${s.name} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await page.addInitScript(() => {
        localStorage.setItem(
          'kolofi.session',
          JSON.stringify({ state: { stage: 'ready', token: 't', phone: '8034127790', whatsappReminders: true, otpRequestId: 'otp_1' }, version: 0 }),
        )
        localStorage.setItem('kolofi.theme', JSON.stringify({ state: { preference: 'system' }, version: 0 }))
      })
      await page.goto(s.path)
      await page.addStyleTag({ content: ':root{--safe-top:54px !important;--safe-bottom:34px !important} input{caret-color:transparent !important}' })
      await page.waitForTimeout(1400)
      const shot = await page.screenshot()
      fs.writeFileSync(path.join(OUT, `${s.n}-${s.name}-${scheme}.app.png`), shot)

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

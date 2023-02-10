import { test, expect } from '@playwright/test'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { chromium } from 'playwright-extra'

chromium.use(StealthPlugin())

test('Test', async ({}) => {
  let blockCount = 0
  let browser: any = null
  let page: any = null

  while (true) {
    try {
      if (!browser) {
        browser = await chromium.launch({
          headless: false,
          devtools: true,
        })
      }

      if (!page) {
        page = await browser!.newPage()
        await page?.goto(`https://www.crunchbase.com/browser-extension`)
      }

      console.log('start!')

      // await page?.goto('https://bot.sannysoft.com/')

      const isBlocked = () =>
        page?.evaluate(() => {
          const isBlocked = () =>
            !!document.querySelector(
              'body > section > div.page-title-wrapper > div > h1',
            )
          return isBlocked()
        })

      // if blocked twice, close browser
      if (await isBlocked()) {
        blockCount++
        await page?.waitForTimeout(2000)
        if (blockCount === 2) {
          await browser?.close()
          browser = null
          page = null
          blockCount = 0
        }
        await page?.reload()
        await page?.waitForTimeout(2000)
        continue
      } else {
        blockCount = 0
        console.log('not blocked', blockCount)
        const cookie = await getCookie(page)

        if(cookie === false){
          await page?.reload()
          continue
        }

        console.log(cookie)
        saveCookie(cookie)
        if (!!cookie) {
          break
        }
        await page?.waitForTimeout(1 * 5 * 1000)
        await page?.reload()
      }
    } catch (e) {
      console.log('Error! ->', e)
      await browser?.close()
      browser = null
    }
  }
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Crunchbase/)
})

const getCookie = async (page: any) => {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(false), 1000 * 20)
      ;(window as any).cookieStore?.addEventListener(
        'change',
        async (e: any) => {
          const cookie = e.changed[0]
          if (cookie?.name === '_px3') {
            resolve({
              token: document.cookie,
              agent: navigator.userAgent,
              expires: new Date(cookie.expires).toISOString(),
            })
          }
        },
      )
    })
  })
}

export const setDO = async (key: string, value: any) => {
  const res = await fetch(
    `https://api.rayst.workers.dev/do/${encodeURIComponent(key)}`,
    {
      method: 'POST',
      body: JSON.stringify(value),
    },
  )

  if (res.status !== 200) {
    throw new Error(`Failed to set DO: ${res.status}`)
  }

  return res.json()
}

export async function getDO<T = any>(key: string) {
  const res = await fetch(
    `https://api.rayst.workers.dev/do/${encodeURIComponent(key)}`,
  )

  if (res.status > 399) {
    return null
  }

  return res.json() as Promise<T>
}

const getData = () => getDO('ec321f3e-d0ec-496f-abc9-4a214ce6e5fc')

const setData = (data: any) =>
  setDO('ec321f3e-d0ec-496f-abc9-4a214ce6e5fc', data)

const saveCookie = async (newData: any) => {
  try {
    const data: object[] = await getData()

    await setData([newData, ...data])
  } catch (e) {
    console.log(e)
  }

  return newData
}

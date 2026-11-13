import math, unittest
from playwright.sync_api import sync_playwright

class ProcessCard(unittest.TestCase):
 def test_one_wheel_from_last_step_to_card_and_back(self):
  with sync_playwright() as p:
   browser=p.chromium.launch()
   for width,height in [(1440,900),(1920,993),(390,844)]:
    with self.subTest(width=width):
     page=browser.new_page(viewport={'width':width,'height':height})
     errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
     page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded')
     page.wait_for_function('window.PraxisProcessSection&&window.__praxisHero?.state?.drawn>=0')
     page.evaluate('document.fonts.ready');page.wait_for_timeout(300)
     targets=page.evaluate('window.PraxisProcessSection.getState().snapTargets')
     self.assertEqual(len(targets),7)
     page.evaluate('(y)=>scrollTo({top:y,behavior:"instant"})',math.ceil(targets[5]))
     page.wait_for_timeout(200)
     self.assertEqual(page.locator(".cta-banner-card").evaluate("e=>getComputedStyle(e).visibility"),"hidden")
     page.mouse.wheel(0,100)
     page.wait_for_function('(y)=>Math.abs(scrollY-Math.ceil(y))<=1&&!window.PraxisProcessSection.getState().snap.snapping',arg=targets[6],timeout=4000)
     page.wait_for_timeout(350)
     self.assertEqual(page.locator(".cta-banner-card").evaluate("e=>getComputedStyle(e).visibility"),"visible")
     self.assertEqual(page.locator(".cta-banner-card").evaluate("e=>getComputedStyle(e).opacity"),"1")
     geometry=page.evaluate("""()=>{const r=document.querySelector('.cta-banner-card').getBoundingClientRect(),h=document.querySelector('header').getBoundingClientRect().bottom;return {top:r.top,expected:h+Math.max(16,(innerHeight-h-r.height)/2)}}""")
     self.assertAlmostEqual(geometry['top'],geometry['expected'],delta=2)
     self.assertEqual(page.evaluate('window.PraxisProcessSection.getActiveStep()'),5)
     page.wait_for_timeout(250);page.mouse.wheel(0,-100)
     page.wait_for_function('(y)=>Math.abs(scrollY-Math.ceil(y))<=1&&!window.PraxisProcessSection.getState().snap.snapping',arg=targets[5],timeout=4000)
     page.wait_for_timeout(250)
     self.assertEqual(page.locator(".cta-banner-card").evaluate("e=>getComputedStyle(e).visibility"),"hidden")
     page.mouse.wheel(0,100)
     page.wait_for_function('(y)=>Math.abs(scrollY-Math.ceil(y))<=1&&!window.PraxisProcessSection.getState().snap.snapping',arg=targets[6],timeout=4000)
     page.wait_for_timeout(250);page.mouse.wheel(0,150);page.wait_for_timeout(700)
     self.assertGreater(page.evaluate('scrollY'),targets[6]+40)
     self.assertEqual(errors,[]);page.close()
   browser.close()
if __name__=='__main__':unittest.main()

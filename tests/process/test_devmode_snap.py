import unittest
from playwright.sync_api import sync_playwright
class DevmodeSnap(unittest.TestCase):
 def test_auto_alignment_and_one_wheel_to_first_process(self):
  with sync_playwright() as p:
   browser=p.chromium.launch()
   for width,height in [(1440,900),(1920,993)]:
    with self.subTest(width=width):
     page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded');page.wait_for_function('window.PraxisProcessSection&&window.__praxisHero?.intro?.state==="completed"');page.evaluate('document.fonts.ready');page.wait_for_timeout(200)
     page.evaluate("""()=>{const r=document.querySelector('.sec-devmode').getBoundingClientRect(),h=document.querySelector('header').getBoundingClientRect().bottom;document.getElementById('inicio').praxisHero.trigger.smoother.scrollTo(scrollY+r.top-h-50,{immediate:true})}""")
     page.wait_for_function('document.querySelector(".sec-devmode").dataset.snap==="settled"')
     delta=page.evaluate("document.querySelector('.sec-devmode').getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom")
     self.assertAlmostEqual(delta,0,delta=1.5)
     page.wait_for_timeout(200);page.mouse.wheel(0,100)
     page.wait_for_function('Math.abs(scrollY-window.PraxisProcessSection.getState().start)<2&&!window.PraxisProcessSection.getState().snap.snapping',timeout=4000)
     self.assertEqual(page.evaluate('window.PraxisProcessSection.getActiveStep()'),0)
     page.wait_for_timeout(250);page.mouse.wheel(0,100)
     page.wait_for_function('window.PraxisProcessSection.getActiveStep()===1&&!window.PraxisProcessSection.getState().snap.snapping',timeout=4000)
     self.assertEqual(errors,[]);page.close()
   browser.close()
if __name__=='__main__':unittest.main()

import unittest
from playwright.sync_api import sync_playwright

class OneWheelHero(unittest.TestCase):
 def test_forward_reverse_and_release(self):
  with sync_playwright() as p:
   browser=p.chromium.launch()
   page=browser.new_page(viewport={'width':1440,'height':900})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto('http://127.0.0.1:5173',wait_until='domcontentloaded')
   page.wait_for_function('window.__praxisHero?.intro.state==="completed"')
   page.mouse.move(720,450)
   self.assertEqual(page.evaluate('window.__praxisHero.state.drawn'),0)
   page.mouse.wheel(0,100)
   page.wait_for_function('window.__praxisHero.progress>.99',timeout=4000)
   page.wait_for_function('window.__praxisHero.state.drawn===88',timeout=5000)
   page.wait_for_timeout(300)
   self.assertLess(abs(page.evaluate('scrollY-window.__praxisHero.trigger.end')),2)
   page.mouse.wheel(0,-100)
   page.wait_for_function('window.__praxisHero.progress<.001',timeout=4000)
   page.wait_for_function('window.__praxisHero.state.drawn===0',timeout=5000)
   page.wait_for_timeout(300)
   # A burst represents one gesture and must not queue multiple transitions.
   for _ in range(5):page.mouse.wheel(0,100);page.wait_for_timeout(40)
   page.wait_for_function('window.__praxisHero.progress===1',timeout=4000)
   page.wait_for_timeout(300)
   page.mouse.wheel(0,400)
   page.wait_for_function('scrollY>window.__praxisHero.trigger.end+20',timeout=4000)
   self.assertEqual(errors,[])
   browser.close()

if __name__=='__main__':unittest.main()

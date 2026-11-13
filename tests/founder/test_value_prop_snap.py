import unittest
from playwright.sync_api import sync_playwright

class ValuePropSnap(unittest.TestCase):
 def test_snap_release_reverse_and_reduced_motion(self):
  with sync_playwright() as p:
   b=p.chromium.launch()
   for w,h in [(1920,993),(1440,900)]:
    page=b.new_page(viewport={'width':w,'height':h});page.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');page.wait_for_function('window.__praxisHero?.intro.state==="completed"');page.wait_for_timeout(250)
    target=page.locator('.sec-value-prop').evaluate('e=>e.valuePropSnap.getState().target')
    page.evaluate('(y)=>window.__praxisHero.trigger.smoother.scrollTo(y,{immediate:true,force:true})',target-70)
    page.wait_for_function('document.querySelector(".sec-value-prop").dataset.snap==="settled"')
    self.assertLess(abs(page.evaluate('scrollY')-target),1.5)
    page.mouse.move(750,450);page.mouse.wheel(0,400);page.wait_for_timeout(750)
    self.assertGreater(page.evaluate('scrollY'),target+130)
    # Re-arm outside the capture region, then approach from below.
    page.evaluate('(y)=>window.__praxisHero.trigger.smoother.scrollTo(y,{immediate:true,force:true})',target+300);page.wait_for_timeout(100)
    page.evaluate('(y)=>window.__praxisHero.trigger.smoother.scrollTo(y,{immediate:true,force:true})',target+60)
    page.wait_for_function('!document.querySelector(".sec-value-prop").valuePropSnap.getState().running&&Math.abs(document.querySelector(".sec-value-prop").valuePropSnap.getState().target-scrollY)<1.5')
    page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(350)
    new_target=page.locator('.sec-value-prop').evaluate('e=>e.valuePropSnap.getState().target')
    page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',new_target-60);page.wait_for_timeout(850)
    self.assertLess(abs(page.evaluate('scrollY')-(new_target-60)),2)
    page.close()
   b.close()

if __name__=='__main__':unittest.main()

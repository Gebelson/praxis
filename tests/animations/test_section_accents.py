import unittest
from playwright.sync_api import sync_playwright

class SectionAccents(unittest.TestCase):
 def test_reveals_reentry_and_stable_layout(self):
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');page.wait_for_function('window.__praxisHero?.intro.state==="completed"&&window.PraxisSectionAccents')
   self.assertTrue(page.evaluate('window.PraxisSectionAccents.getState().every(s=>s.runs===0&&!s.running)'))
   for selector,kind in [('.testimonial-card','card'),('.aff-step','affiliate'),('.footer-link-column','footer')]:
    node=page.locator(selector).first
    before=node.evaluate('e=>({width:e.offsetWidth,height:e.offsetHeight})')
    node.evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})')
    page.wait_for_function('(kind)=>window.PraxisSectionAccents.getState().some(s=>s.type===kind&&s.runs>0)',arg=kind)
    page.wait_for_timeout(1350)
    self.assertEqual(before,node.evaluate('e=>({width:e.offsetWidth,height:e.offsetHeight})'))
    self.assertEqual(node.get_attribute('data-accent-state'),'done')
    self.assertTrue(node.evaluate('e=>[...e.querySelectorAll(".section-accent-label")].every(n=>n.lastElementChild.textContent===n.querySelector(".visually-hidden").textContent)'))
   old_runs=page.evaluate('window.PraxisSectionAccents.getState().filter(s=>s.type==="card").reduce((n,s)=>n+s.runs,0)')
   page.evaluate('window.scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(150)
   page.locator('.testimonial-card').first.evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})')
   page.wait_for_function('(old)=>window.PraxisSectionAccents.getState().filter(s=>s.type==="card").reduce((n,s)=>n+s.runs,0)>old',arg=old_runs)
   self.assertEqual(errors,[]);b.close()
 def test_mobile_reduced_motion_remains_visible(self):
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
   page.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');page.wait_for_function('window.PraxisSectionAccents')
   for selector in ['.testimonial-card','.aff-step','.footer-about']:
    node=page.locator(selector).first;node.evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})');page.wait_for_timeout(100)
    self.assertEqual(node.evaluate('e=>getComputedStyle(e).opacity'),'1')
   self.assertTrue(page.evaluate('window.PraxisSectionAccents.getState().every(s=>s.runs===0&&!s.running)'))
   self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   b.close()

if __name__=='__main__':unittest.main()

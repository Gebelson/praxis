import unittest
from playwright.sync_api import sync_playwright

class SectionNavigation(unittest.TestCase):
 def test_header_links_cross_snaps_without_being_captured(self):
  with sync_playwright() as p:
   b=p.chromium.launch()
   for width,height in [(1440,900),(1920,993)]:
    page=b.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');page.wait_for_function('window.__praxisHero?.intro.state==="completed"')
    for target in ['contato','portfolio','orcamento','afiliados','faq','inicio']:
     page.locator(f'.main-nav a[href="#{target}"]').click()
     page.wait_for_function('(id)=>{const s=window.PraxisSectionNavigation.getState();return s.phase==="arrived"&&s.target===id}',arg=target,timeout=5000)
     page.wait_for_timeout(180)
     state=page.evaluate('window.PraxisSectionNavigation.getState()')
     self.assertLess(abs(page.evaluate('scrollY')-state['scrollTarget']),2,(target,state))
     self.assertEqual(page.evaluate('location.hash'),'#'+target)
    # A second link replaces the in-flight destination immediately.
    page.locator('.main-nav a[href="#faq"]').click();page.wait_for_timeout(100)
    page.locator('.main-nav a[href="#portfolio"]').click()
    page.wait_for_function('window.PraxisSectionNavigation.getState().phase==="arrived"&&window.PraxisSectionNavigation.getState().target==="portfolio"')
    self.assertEqual(page.evaluate('location.hash'),'#portfolio')
    page.mouse.move(650,450);page.mouse.wheel(0,120);page.wait_for_timeout(100)
    self.assertFalse(page.evaluate('window.PraxisSectionNavigation.getState().active'))
    self.assertEqual(errors,[]);page.close()
   b.close()
 def test_keyboard_and_reduced_motion(self):
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce')
   page.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');page.wait_for_function('window.PraxisSectionNavigation&&window.__praxisHero?.intro.state==="completed"')
   page.locator('.main-nav a[href="#faq"]').focus();page.keyboard.press('Enter')
   page.wait_for_function('window.PraxisSectionNavigation.getState().phase==="arrived"')
   state=page.evaluate('window.PraxisSectionNavigation.getState()');self.assertEqual(state['target'],'faq');self.assertLess(abs(page.evaluate('scrollY')-state['scrollTarget']),2)
   b.close()

if __name__=='__main__':unittest.main()

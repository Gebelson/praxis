import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/afiliados')
CENTER="""()=>{const e=document.querySelector('.affiliates-top'),r=e.getBoundingClientRect(),h=document.querySelector('header').getBoundingClientRect().bottom;return r.top+r.height/2-(h+(innerHeight-h)/2)}"""
class AffiliatesIntro(unittest.TestCase):
 def test_snap_center_equal_margins_and_exit(self):
  with sync_playwright() as p:
   browser=p.chromium.launch()
   for width,height in [(1920,993),(1440,900),(1366,768),(768,1024)]:
    with self.subTest(width=width):
     page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded');page.wait_for_function('window.__praxisHero?.intro?.state==="completed"');page.evaluate('document.fonts.ready')
     page.evaluate("""()=>{const e=document.querySelector('.affiliates-top'),r=e.getBoundingClientRect(),h=document.querySelector('header').getBoundingClientRect().bottom,y=scrollY+r.top+r.height/2-(h+(innerHeight-h)/2)-55,s=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;if(s)s.scrollTo(y,{immediate:true});else scrollTo({top:y,behavior:'instant'})}""")
     page.wait_for_function("document.querySelector('.affiliates-top').dataset.snap==='settled'",timeout=4000)
     self.assertAlmostEqual(page.evaluate(CENTER),0,delta=1.5)
     layout=page.locator('.affiliates-top').evaluate("""e=>{const r=e.getBoundingClientRect(),c=[...e.children].map(n=>n.getBoundingClientRect());return {top:Math.min(...c.map(r=>r.top))-r.top,bottom:r.bottom-Math.max(...c.map(r=>r.bottom)),left:r.left,right:r.right}}""")
     self.assertAlmostEqual(layout['top'],layout['bottom'],delta=1.5)
     self.assertAlmostEqual((layout['left']+layout['right'])/2,width/2,delta=1.5)
     self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
     page.screenshot(path=str(OUT/f'auto-encaixe-afiliados-{width}.png'))
     before=page.evaluate('scrollY');page.wait_for_timeout(150);page.mouse.wheel(0,200);page.wait_for_timeout(650)
     self.assertGreater(page.evaluate('scrollY'),before+100,'The snap must release rather than trap the next scroll')
     self.assertEqual(errors,[]);page.close()
   browser.close()
 def test_mobile_content_remains_accessible_and_balanced(self):
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded');page.evaluate('document.fonts.ready')
   e=page.locator('.affiliates-top');e.scroll_into_view_if_needed()
   d=e.evaluate("""e=>{const r=e.getBoundingClientRect(),c=[...e.children].map(n=>n.getBoundingClientRect());return {top:Math.min(...c.map(r=>r.top))-r.top,bottom:r.bottom-Math.max(...c.map(r=>r.bottom)),n:e.querySelectorAll('.aff-step').length}}""")
   self.assertAlmostEqual(d['top'],d['bottom'],delta=1.5);self.assertEqual(d['n'],3)
   self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   browser.close()
if __name__=='__main__':unittest.main()

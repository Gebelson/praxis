import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/feedbacks')
class Testimonials(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,width,height,reduced=False):
  page=self.browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference');self.addCleanup(page.close)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]))
  page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded');page.wait_for_function('window.PraxisProcessSection&&window.__praxisHero?.state?.drawn>=0');page.evaluate('document.fonts.ready')
  page.locator('.sec-testimonials').scroll_into_view_if_needed();page.wait_for_timeout(200);return page
 def test_responsive_glass_margins_and_content(self):
  OUT.mkdir(parents=True,exist_ok=True)
  for width,height in [(1920,1080),(1440,1000),(1024,768),(768,1024),(390,844),(375,812)]:
   with self.subTest(width=width):
    page=self.open(width,height,True);section=page.locator('.sec-testimonials')
    self.assertEqual(section.locator('.testimonial-card').count(),4)
    self.assertEqual(section.locator('.testimonial-blur').count(),4)
    self.assertEqual(section.locator('img').evaluate_all('es=>es.every(e=>e.complete&&e.naturalWidth>0)'),True)
    geometry=section.evaluate("""e=>{const bounds=e.getBoundingClientRect();return [...e.querySelectorAll('.testimonial-card')].map(card=>{const r=card.getBoundingClientRect(),quote=card.querySelector('blockquote').getBoundingClientRect(),author=card.querySelector('.testimonial-author').getBoundingClientRect();return {left:r.left-bounds.left,right:bounds.right-r.right,top:r.top,bottom:r.bottom,quoteBottom:quote.bottom,authorTop:author.top,authorBottom:author.bottom,blur:getComputedStyle(card).backdropFilter}})}""")
    for card in geometry:
     self.assertGreaterEqual(card['left'],width*.075);self.assertGreaterEqual(card['right'],width*.075)
     self.assertLessEqual(card['quoteBottom'],card['authorTop']-15)
     self.assertLessEqual(card['authorBottom'],card['bottom']-20)
     self.assertIn('blur(28px)',card['blur'])
    self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    self.assertEqual(section.locator('.testimonial-blur').first.evaluate('e=>getComputedStyle(e).animationName'),'none')
    section.screenshot(path=str(OUT/f'feedbacks-{width}.png'),style='.site-header,.page-scrollbar,.bottom-progressive-blur{visibility:hidden!important}')
 def test_four_animated_color_points_pause_outside_and_reduce_motion(self):
  page=self.open(1440,1000);page.wait_for_function('document.querySelector(".sec-testimonials").dataset.atmosphere==="running"')
  values=page.locator('.testimonial-blur').evaluate_all("""es=>es.map(e=>{const a=e.getAnimations()[0],s=getComputedStyle(e);a.pause();a.currentTime=0;const initial=getComputedStyle(e).transform;a.currentTime=a.effect.getTiming().duration*.45;return {initial,moved:getComputedStyle(e).transform,color:s.backgroundColor,duration:a.effect.getTiming().duration,pointer:getComputedStyle(e.parentElement).pointerEvents}})""")
  self.assertEqual(len(values),4)
  for value in values:
   self.assertEqual(value['color'],'rgb(13, 27, 43)');self.assertNotEqual(value['initial'],value['moved']);self.assertGreaterEqual(value['duration'],32000);self.assertEqual(value['pointer'],'none')
  page.evaluate("()=>{const s=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;if(s)s.scrollTo(0,{immediate:true});else scrollTo(0,0)}")
  page.wait_for_function('document.querySelector(".sec-testimonials").dataset.atmosphere==="paused"')
  self.assertTrue(page.locator('.testimonial-blur').evaluate_all('es=>es.every(e=>getComputedStyle(e).animationPlayState==="paused")'))
  page.emulate_media(reduced_motion='reduce');page.wait_for_function('[...document.querySelectorAll(".testimonial-blur")].every(e=>e.getAnimations().length===0)')
if __name__=='__main__':unittest.main()

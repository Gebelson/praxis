import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/quadro-orcamento');OUT.mkdir(parents=True,exist_ok=True)
class CtaLogosBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,width=1440,height=1000,reduced=False,touch=False):
  c=self.browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference',has_touch=touch,is_mobile=touch);self.addCleanup(c.close);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]))
  page.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');page.evaluate('document.fonts.ready');card=page.locator('.cta-banner-card');card.scroll_into_view_if_needed();page.wait_for_function('Number(getComputedStyle(document.querySelector(".cta-banner-card")).opacity)>.999');return page,card
 def test_effects_asset_and_layout(self):
  page,card=self.open(reduced=True)
  self.assertEqual(card.locator('.cta-logo-piece').count(),2)
  self.assertEqual(card.locator('.cta-logo-decoration').get_attribute('aria-hidden'),'true')
  props=card.evaluate('e=>{const s=getComputedStyle(e),d=getComputedStyle(e.querySelector(".cta-logo-decoration")),p=getComputedStyle(e.querySelector(".cta-logo-piece"));return {color:s.backgroundColor,noise:s.backgroundImage,isolation:s.isolation,blend:d.mixBlendMode,pointer:d.pointerEvents,filter:p.filter}}')
  self.assertEqual(props['color'],'rgb(30, 30, 28)');self.assertIn('section-noise.png',props['noise']);self.assertEqual(props['isolation'],'isolate');self.assertEqual(props['blend'],'color-dodge');self.assertEqual(props['pointer'],'none')
  for effect in ['grayscale(1)','blur(3px)','invert(1)']:self.assertIn(effect,props['filter'])
  self.assertEqual(card.locator('.cta-pill-button').get_attribute('href'),'#orcamento');card.screenshot(path=str(OUT/'logos-desktop.png'))
 def test_logos_loop_without_mouse_and_pause_outside_view(self):
  for width,height,touch in [(1440,1000,False),(390,844,True)]:
   page,card=self.open(width,height,touch=touch)
   page.wait_for_function("document.querySelector('.cta-logo-piece').getAnimations().some(a=>a.playState==='running')")
   data=card.locator('.cta-logo-piece').evaluate_all("""es=>es.map(e=>{const a=e.getAnimations()[0];a.pause();a.currentTime=0;const initial=getComputedStyle(e).transform;a.currentTime=3000;const moved=getComputedStyle(e).transform;a.currentTime=a.effect.getTiming().duration;const end=getComputedStyle(e).transform;return {initial,moved,end,timing:a.effect.getTiming()}})""")
   for item in data:
    self.assertNotEqual(item['initial'],item['moved']);self.assertEqual(item['initial'],item['end'])
    self.assertGreaterEqual(item['timing']['duration'],12000)
   before=card.locator('.cta-logo-piece').evaluate_all('es=>es.map(e=>getComputedStyle(e).transform)')
   card.dispatch_event('pointermove',{'clientX':0,'clientY':0,'pointerType':'mouse'})
   self.assertEqual(before,card.locator('.cta-logo-piece').evaluate_all('es=>es.map(e=>getComputedStyle(e).transform)'))
   page.emulate_media(reduced_motion='reduce')
   page.wait_for_function("[...document.querySelectorAll('.cta-logo-piece')].every(e=>e.getAnimations().length===0)")
   self.assertEqual(card.locator('.cta-logo-piece').evaluate_all('es=>es.flatMap(e=>e.getAnimations()).length'),0)
   page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(100)
   page.evaluate("()=>{const s=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;if(s)s.scrollTo(0,{immediate:true});else scrollTo(0,0)}")
   page.wait_for_function("[...document.querySelectorAll('.cta-logo-piece')].every(e=>e.getAnimations().every(a=>a.playState==='paused'))")
 def test_entry_and_reverse_never_dissolve_card_or_content(self):
  page,_=self.open()
  page.wait_for_function('window.PraxisProcessSection&&window.__praxisHero?.state?.drawn>=0')
  for fraction in [.8,.4,.8]:
   page.evaluate("""fraction=>{const card=document.querySelector('.cta-banner-card'),section=document.querySelector('.sec-process'),ratio=section.getBoundingClientRect().width/section.offsetWidth;const y=scrollY+section.getBoundingClientRect().top+card.offsetTop*ratio-innerHeight*fraction;const smoother=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;if(smoother)smoother.scrollTo(y,{immediate:true});else scrollTo({top:y,behavior:'instant'});} """,fraction)
   for _ in range(6):
    page.wait_for_timeout(40)
    opacity=page.locator('.cta-banner-card,.cta-banner-heading,.cta-banner-subtitle,.cta-pill-button').evaluate_all('es=>es.map(e=>Number(getComputedStyle(e).opacity))')
    self.assertEqual(opacity,[1,1,1,1])
 def test_mobile_and_reduced_motion_stay_static(self):
  for width,height,touch in [(390,844,True),(768,1024,True),(1440,1000,False)]:
   page,card=self.open(width,height,True,touch);box=card.bounding_box();page.mouse.move(box['x']+box['width']*.8,box['y']+box['height']*.4);page.wait_for_timeout(100)
   self.assertEqual(card.locator('.cta-logo-top-left').evaluate('e=>e.style.getPropertyValue("--logo-x")'),'')
   self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'));card.screenshot(path=str(OUT/f'logos-{width}.png'))
if __name__=='__main__':unittest.main(verbosity=2)

import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/carrossel');OUT.mkdir(parents=True,exist_ok=True)
class CarouselDotsBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,reduced=False,width=1920,height=993):
  c=self.browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference');self.addCleanup(c.close);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]));p.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');p.wait_for_function('window.PraxisProjectCarousel&&document.getElementById("inicio")?.praxisHero?.state?.drawn>=0');p.evaluate('document.fonts.ready');return p
 def move(self,p,offset):
  p.evaluate('(offset)=>{const e=document.querySelector(".carousel-slide.is-active"),head=document.querySelector("header").getBoundingClientRect().bottom,scale=innerWidth>1024?document.documentElement.clientWidth/1440:1,top=scrollY+e.getBoundingClientRect().top-head-14*scale-offset,sm=document.getElementById("inicio")?.praxisHero?.trigger?.smoother;if(sm)sm.scrollTo(top,{immediate:true});else window.scrollTo({top,behavior:"instant"})}',offset)
 def snap(self,p):
  self.move(p,65);p.wait_for_function('document.querySelector("#carouselDots").dataset.dotsState==="visible"')
 def test_only_snap_reveals_and_stagger_order(self):
  p=self.open();self.assertEqual(p.locator('.carousel-dot-morph').count(),0);dots=p.locator('#carouselDots');self.move(p,250);p.locator('#carouselNext').click();p.wait_for_timeout(150);self.assertTrue(dots.evaluate('e=>e.hidden'))
  self.move(p,65);p.wait_for_function('document.querySelector("#carouselDots").dataset.dotsState==="entering"');self.assertEqual(p.locator('#projectCarousel').get_attribute('data-carousel-snap'),'settled')
  delays=dots.evaluate('e=>[...e.querySelectorAll(".carousel-dot")].map(d=>d.getAnimations().find(a=>!(a instanceof CSSTransition))?.effect.getTiming().delay)');self.assertEqual(delays,[i*55 for i in range(7)])
  p.wait_for_function('document.querySelector("#carouselDots").dataset.dotsState==="visible"');self.assertEqual(dots.locator('.is-active').get_attribute('data-slide'),'1')
  p.locator('#carouselNext').click();self.assertEqual(p.evaluate('window.PraxisProjectCarousel.getActiveIndex()'),2);self.assertEqual(dots.evaluate('e=>e.getAnimations({subtree:true}).filter(a=>!(a instanceof CSSTransition)).length'),0)
 def test_above_blur_and_resize_tracking(self):
  p=self.open();self.snap(p)
  state=p.locator('#carouselDots').evaluate('e=>({body:e.parentElement===document.body,z:Number(getComputedStyle(e).zIndex),blurZ:Number(getComputedStyle(document.querySelector("#bottomProgressiveBlur")).zIndex),position:getComputedStyle(e).position,filter:getComputedStyle(e).filter})')
  self.assertTrue(state['body']);self.assertGreater(state['z'],state['blurZ']);self.assertEqual(state['position'],'fixed');self.assertEqual(state['filter'],'none');p.screenshot(path=str(OUT/'bolinhas-no-auto-encaixe.png'))
  p.set_viewport_size({'width':1440,'height':900});p.wait_for_function('document.querySelector("#carouselDots").hidden||Math.abs(document.querySelector("#carouselDots").getBoundingClientRect().top-document.querySelector(".carousel-dots-anchor").getBoundingClientRect().top)<1')
  p.wait_for_function('document.documentElement.scrollWidth<=innerWidth');self.assertTrue(p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 def test_reverse_exit_and_reentry_requires_another_snap(self):
  p=self.open();self.snap(p)
  for ratio in [.1,.29]:
   p.evaluate('(ratio)=>{const r=document.querySelector(".sec-devmode").getBoundingClientRect();window.scrollTo({top:scrollY+r.top-innerHeight+r.height*ratio,behavior:"instant"})}',ratio)
   p.wait_for_timeout(120);self.assertEqual(p.locator('#carouselDots').get_attribute('data-dots-state'),'visible')
  p.evaluate('()=>{const r=document.querySelector(".sec-devmode").getBoundingClientRect();window.scrollTo({top:scrollY+r.top-innerHeight+r.height*.31,behavior:"instant"})}')
  p.wait_for_function('document.querySelector("#carouselDots").dataset.dotsState==="exiting"')
  delays=p.locator('#carouselDots').evaluate('e=>[...e.querySelectorAll(".carousel-dot")].map(d=>d.getAnimations().find(a=>!(a instanceof CSSTransition))?.effect.getTiming().delay)');self.assertEqual(delays,[(6-i)*55 for i in range(7)])
  p.wait_for_function('document.querySelector("#carouselDots").hidden');p.screenshot(path=str(OUT/'bolinhas-ocultas-proxima-secao.png'))
  self.move(p,300);p.wait_for_timeout(200);self.assertTrue(p.locator('#carouselDots').evaluate('e=>e.hidden'));self.snap(p)
 def test_reduced_motion_manual_alignment_and_keyboard(self):
  p=self.open(True,390,600);self.move(p,0);p.wait_for_function('document.querySelector("#carouselDots").dataset.dotsState==="visible"');dots=p.locator('#carouselDots');self.assertEqual(dots.evaluate('e=>e.getAnimations({subtree:true}).length'),0)
  dots.locator('.is-active').focus();p.keyboard.press('ArrowRight');self.assertEqual(p.evaluate('window.PraxisProjectCarousel.getActiveIndex()'),1)
  p.evaluate('()=>{const r=document.querySelector(".sec-devmode").getBoundingClientRect();window.scrollTo({top:scrollY+r.top-innerHeight+r.height*.31,behavior:"instant"})}');p.wait_for_function('document.querySelector("#carouselDots").hidden')
if __name__=='__main__':unittest.main(verbosity=2)

import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/carrossel')
class CarouselSnapBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,width=1440,height=900,reduced=False):
  c=self.browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference');self.addCleanup(c.close);p=c.new_page();p.set_default_timeout(8000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]));p.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');p.wait_for_function('document.querySelector("#projectCarousel")?.carouselSnap');p.evaluate('document.fonts.ready');p.wait_for_function('document.getElementById("inicio")?.praxisHero?.state?.drawn>=0');p.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');return p
 def near(self,p,delta=65):
  p.evaluate('(delta)=>{const s=document.querySelector(".carousel-slide.is-active"),header=document.querySelector("header").getBoundingClientRect().bottom,scale=innerWidth>1024?document.documentElement.clientWidth/1440:1;const top=scrollY+s.getBoundingClientRect().top-header-14*scale-delta,smoother=document.getElementById("inicio")?.praxisHero?.trigger?.smoother;if(smoother)smoother.scrollTo(top,{immediate:true});else window.scrollTo({top,behavior:"instant"})}',delta)
 def distance(self,p):return p.evaluate('()=>{const header=document.querySelector("header").getBoundingClientRect().bottom,scale=innerWidth>1024?document.documentElement.clientWidth/1440:1;return document.querySelector(".carousel-slide.is-active").getBoundingClientRect().top-header-14*scale}')
 def test_nearby_alignment_in_both_directions_and_viewports(self):
  for width,height in [(1440,900),(1920,1080),(390,844)]:
   p=self.open(width,height);self.near(p);p.wait_for_function('document.querySelector("#projectCarousel").dataset.carouselSnap==="settled"');self.assertAlmostEqual(self.distance(p),0,delta=2)
   if width==1920:p.screenshot(path=str(OUT/'auto-encaixe-1920.png'))
   self.near(p,300);p.wait_for_function('document.querySelector("#projectCarousel").dataset.carouselSnap==="idle"');self.near(p,-65);p.wait_for_function('Math.abs(document.querySelector(".carousel-slide.is-active").getBoundingClientRect().top-document.querySelector("header").getBoundingClientRect().bottom-14*(innerWidth>1024?document.documentElement.clientWidth/1440:1))<2');self.assertAlmostEqual(self.distance(p),0,delta=2)
 def test_does_not_trap_scroll_and_new_input_interrupts(self):
  p=self.open();self.near(p);p.wait_for_function('document.querySelector("#projectCarousel").dataset.carouselSnap==="snapping"',polling=10);p.mouse.wheel(0,500);p.wait_for_timeout(900)
  self.assertGreater(abs(self.distance(p)),150);self.assertNotEqual(p.locator('#projectCarousel').get_attribute('data-carousel-snap'),'snapping')
 def test_reduced_motion_has_no_snap(self):
  p=self.open(reduced=True);self.near(p);p.wait_for_timeout(500);self.assertAlmostEqual(self.distance(p),65,delta=2);self.assertEqual(p.locator('#projectCarousel').get_attribute('data-carousel-snap'),'disabled')
if __name__=='__main__':unittest.main(verbosity=2)

import unittest
from playwright.sync_api import sync_playwright
class GalleryLoop(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,width=1440,height=1000,reduced=False):
  page=self.browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference');self.addCleanup(page.close)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]))
  page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded');page.wait_for_function('window.PraxisProjectsGallery&&window.__praxisHero?.state?.drawn>=0');page.evaluate('document.fonts.ready')
  page.evaluate("""()=>{const e=document.getElementById('projectsGallery'),r=e.getBoundingClientRect(),y=scrollY+r.top+r.height/2-innerHeight/2,s=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;if(s)s.scrollTo(y,{immediate:true});else scrollTo({top:y,behavior:'instant'})}""");return page
 def test_moves_without_scroll_opposite_directions_and_pauses_outside(self):
  page=self.open();page.wait_for_function('document.getElementById("projectsGallery").dataset.galleryState==="running"')
  def state():return page.evaluate('()=>{const a=window.PraxisProjectsGallery;return {y:scrollY,p:a.getProgress(),top:new DOMMatrix(getComputedStyle(a.topTrack).transform).m41,bottom:new DOMMatrix(getComputedStyle(a.bottomTrack).transform).m41}}')
  before=state();page.wait_for_timeout(350);after=state()
  self.assertEqual(before['y'],after['y']);self.assertLess(after['top'],before['top']-2);self.assertGreater(after['bottom'],before['bottom']+2)
  self.assertTrue(page.evaluate('!window.PraxisProjectsGallery.timeline().scrollTrigger'))
  page.evaluate("()=>{const s=document.getElementById('inicio')?.praxisHero?.trigger?.smoother;if(s)s.scrollTo(scrollY+35,{immediate:true});else scrollBy(0,35)}");page.wait_for_timeout(100)
  self.assertLess(abs(state()['p']-after['p']),.02)
  page.evaluate("()=>document.getElementById('inicio').praxisHero.trigger.smoother.scrollTo(0,{immediate:true})")
  page.wait_for_function('document.getElementById("projectsGallery").dataset.galleryState==="paused"');held=state();page.wait_for_timeout(150);self.assertEqual(state()['top'],held['top'])
 def test_seam_coverage_mobile_and_reduced_motion(self):
  for width,height in [(1440,1000),(390,844)]:
   with self.subTest(width=width):
    page=self.open(width,height);page.wait_for_function('document.getElementById("projectsGallery").dataset.galleryState==="running"')
    self.assertEqual(page.locator('#projectsGallery .project-card').count(),32)
    def visible():return page.evaluate("""()=>{const g=document.getElementById('projectsGallery').getBoundingClientRect();return ['top','bottom'].map(row=>[...document.querySelectorAll('.projects-gallery__row-track--'+row+' .project-card')].map(e=>e.getBoundingClientRect()).filter(r=>r.right>g.left&&r.left<g.right).map(r=>({left:r.left,right:r.right,top:r.top})).sort((a,b)=>a.left-b.left))}""")
    page.evaluate('()=>{const t=window.PraxisProjectsGallery.timeline();t.pause();t.totalTime(t.duration()-.00001)}');before=visible()
    page.evaluate('()=>{const t=window.PraxisProjectsGallery.timeline();t.totalTime(t.duration()+.00001)}');after=visible()
    for a,b in zip(before,after):
     self.assertEqual(len(a),len(b));self.assertGreaterEqual(len(a),3)
     for x,y in zip(a,b):
      self.assertAlmostEqual(x['left'],y['left'],delta=.1);self.assertAlmostEqual(x['right'],y['right'],delta=.1)
    page.evaluate('()=>window.PraxisProjectsGallery.setCardImage("project-top-01","/assets/client-portraits/portrait-01.jpg","Exemplo")')
    self.assertEqual(page.locator('[data-project-id="project-top-01"] img[src]').count(),2)
    self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.emulate_media(reduced_motion='reduce');page.wait_for_function('document.getElementById("projectsGallery").dataset.galleryState==="static"')
    self.assertEqual(page.evaluate('window.PraxisProjectsGallery.getProgress()'),0)
    page.emulate_media(reduced_motion='no-preference');page.wait_for_function('document.getElementById("projectsGallery").dataset.galleryState==="running"')
if __name__=='__main__':unittest.main()

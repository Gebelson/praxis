import unittest,io,json
from pathlib import Path
from PIL import Image,ImageChops
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'validation/founder-experience';OUT.mkdir(parents=True,exist_ok=True)
class FounderExperienceBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,width=1440,height=900,reduced=False):
  context=self.browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference');self.addCleanup(context.close);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]))
  page.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');page.wait_for_function('document.querySelector(".sec2-right-portrait")?.dataset.experienceState');return page
 def test_static_sora_text_dimensions_and_reentry(self):
  page=self.open();host=page.locator('.sec2-right-portrait');self.assertEqual(host.get_attribute('data-experience-current'),'12')
  page.evaluate("""()=>{window.__count=[];const e=document.querySelector('.sec2-right-portrait');new MutationObserver(()=>window.__count.push(e.dataset.experienceCurrent)).observe(e,{attributes:true,attributeFilter:['data-experience-current']})}""")
  host.scroll_into_view_if_needed();page.wait_for_timeout(700)
  self.assertEqual(host.get_attribute('data-experience-state'),'completed');self.assertEqual(page.evaluate('window.__count'),[])
  box=host.bounding_box();self.assertEqual(round(box['width']),625);self.assertAlmostEqual(box['height'],647.777778,delta=.02)
  self.assertEqual(page.locator('.founder-experience-number').text_content(),'12');self.assertEqual(page.locator('.founder-experience-caption').text_content(),'ANOS DE EXPERIÊNCIA')
  self.assertEqual(page.locator('.founder-experience-number').evaluate('e=>getComputedStyle(e).fontFamily'),'Sora, sans-serif');self.assertTrue(page.evaluate('document.fonts.check("800 600px Sora")'))
  self.assertTrue(page.locator('.founder-experience-visual image').get_attribute('href').endswith('founder-portrait-rim-light.webp'));self.assertEqual(page.locator('img[src*="founder-portrait-12"]').count(),0)
  host.screenshot(path=str(OUT/'desktop-12.png'));page.screenshot(path=str(OUT/'desktop-section.png'))
  page.evaluate('window.scrollTo({top:0,behavior:"instant"})');host.scroll_into_view_if_needed();self.assertEqual(host.get_attribute('data-experience-current'),'12')
 def test_original_png_and_three_layers_for_other_numbers(self):
  import hashlib
  self.assertEqual(hashlib.sha256((ROOT/'public/assets/founder-portrait.png').read_bytes()).hexdigest(),hashlib.sha256(Path('C:/Users/gebel/Downloads/eu 2.png').read_bytes()).hexdigest())
  image=Image.open(ROOT/'public/assets/founder-portrait.png');self.assertEqual(image.mode,'RGBA');self.assertEqual(image.size,(1080,1390));self.assertEqual(image.getchannel('A').getextrema(),(0,255))
  page=self.open();host=page.locator('.sec2-right-portrait');host.scroll_into_view_if_needed();page.wait_for_function('document.querySelector(".sec2-right-portrait").dataset.experienceState==="completed"')
  self.assertEqual(page.locator('.founder-experience-visual filter').count(),0);self.assertEqual(page.locator('.founder-experience-visual clipPath').count(),0);self.assertEqual(page.locator('.founder-experience-visual mask').count(),1)
  self.assertEqual(page.locator('.founder-experience-visual image').get_attribute('mask'),None)
  order=page.locator('.founder-experience-visual').evaluate('e=>[...e.children].filter(c=>["g","image"].includes(c.tagName)).map(c=>c.tagName)');self.assertEqual(order,['g','image','g'])
  self.assertEqual(page.locator('.founder-experience-solid-layer use').count(),2);self.assertEqual(page.locator('.founder-experience-outline-layer use').count(),2)
  for value in [0,12,34,88,125]:
   page.evaluate('(n)=>document.querySelector(".sec2-right-portrait").founderExperience.setValue(n)',value)
   self.assertEqual(page.locator('.founder-experience-number').text_content(),str(value).zfill(2))
   outline=page.locator('.founder-experience-outline-layer');outline.evaluate('e=>e.style.visibility="visible"');shown=Image.open(io.BytesIO(host.screenshot())).convert('RGB')
   outline.evaluate('e=>e.style.visibility="hidden"');hidden=Image.open(io.BytesIO(host.screenshot())).convert('RGB');outline.evaluate('e=>e.style.visibility="visible"')
   self.assertIsNone(ImageChops.difference(shown.crop((0,0,625,270)),hidden.crop((0,0,625,270))).getbbox(),'Outline must not cross the upper face or crown')
   self.assertIsNone(ImageChops.difference(shown.crop((335,285,455,320)),hidden.crop((335,285,455,320))).getbbox(),'Outline must not leave a fragment across the neck above the collar')
   host.screenshot(path=str(OUT/f'number-{value:03d}.png'))
 def test_caption_matches_number_visible_width_and_edges(self):
  page=self.open(reduced=True);host=page.locator('.sec2-right-portrait');host.scroll_into_view_if_needed()
  page.locator('#bottomProgressiveBlur').evaluate('e=>e.style.display="none"')
  page.locator('.founder-experience-visual image,.founder-experience-outline-layer').evaluate_all('es=>es.forEach(e=>e.style.visibility="hidden")')
  shot=Image.open(io.BytesIO(host.screenshot())).convert('RGB')
  for top,bottom in [(60,516),(516,585)]:
   crop=shot.crop((0,top,625,bottom));ink=crop.point(lambda x:255 if x>220 else 0).convert('L').point(lambda x:255 if x>240 else 0);box=ink.getbbox()
   self.assertIsNotNone(box)
   if top==60:number=box
   else:
    self.assertLessEqual(abs(box[0]-number[0]),2);self.assertLessEqual(abs(box[2]-number[2]),2)
 def test_responsive_and_reduced_motion(self):
  for width,height in [(768,1024),(390,844)]:
   page=self.open(width,height,True);host=page.locator('.sec2-right-portrait');host.scroll_into_view_if_needed();self.assertEqual(host.get_attribute('data-experience-current'),'12');self.assertEqual(host.get_attribute('data-experience-state'),'completed')
   box=host.bounding_box();self.assertAlmostEqual(box['width']/box['height'],625/647.777778,delta=.002);self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   host.screenshot(path=str(OUT/f'portrait-{width}.png'))
 def test_section_bottom_touches_photo_bottom(self):
  for width,height in [(1440,900),(1920,1080),(768,1024),(390,844)]:
   page=self.open(width,height,True);host=page.locator('.sec2-right-portrait');host.scroll_into_view_if_needed()
   edges=page.evaluate("""()=>{const s=document.querySelector('.sec-value-prop').getBoundingClientRect(),p=document.querySelector('.founder-experience-visual image').getBoundingClientRect();return {section:s.bottom,photo:p.bottom}}""")
   self.assertAlmostEqual(edges['section'],edges['photo'],delta=1)
   if width==1440:page.screenshot(path=str(OUT/'section-bottom-aligned.png'))
if __name__=='__main__':unittest.main(verbosity=2)

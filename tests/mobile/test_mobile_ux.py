import json,os,tempfile,unittest
from pathlib import Path
from playwright.sync_api import sync_playwright

URL=os.environ.get('PRAXIS_TEST_URL','http://127.0.0.1:5173')
OUT=Path(os.environ.get('PRAXIS_QA_OUT',str(Path(tempfile.gettempdir())/'praxis-mobile-qa')))
MATRIX=[(320,740),(360,800),(375,812),(390,844),(414,896),(430,932),(768,1024),(1024,768),(1440,900),(844,390)]

class MobileUX(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  OUT.mkdir(parents=True,exist_ok=True);cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open_page(self,width=390,height=844,motion='reduce'):
  page=self.browser.new_page(viewport={'width':width,'height':height},is_mobile=width<=1024,has_touch=width<=1024,reduced_motion=motion,device_scale_factor=2 if width<=1024 else 1)
  page.goto(URL,wait_until='networkidle');page.evaluate('document.fonts.ready')
  if width<=1024 and width>height:page.locator('.praxis-ascii-sentinel').evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})')
  page.wait_for_function('document.getElementById("inicio")?.praxisHero?.intro.state==="completed"')
  return page
 def test_layout_matrix_and_touch_targets(self):
  records=[]
  for width,height in MATRIX:
   with self.subTest(width=width):
    page=self.open_page(width,height)
    self.assertEqual(page.evaluate('document.documentElement.scrollWidth-innerWidth'),0)
    if width<=1024:
     self.assertLessEqual(page.locator('header').bounding_box()['height'],80)
     self.assertTrue(page.locator('.main-nav').evaluate('e=>e.inert'))
     for selector in ['.sec2-heading','.devmode-description','.contact-form-card','.contact-info-card','.affiliates-heading','.faq-accordion-list']:
      bounds=page.locator(selector).first.bounding_box();self.assertGreaterEqual(bounds['x'],-1,selector);self.assertLessEqual(bounds['x']+bounds['width'],width+1,selector)
     for selector in ['.mobile-nav-toggle','#langBtn','.carousel-arrow','.form-submit-btn','.partner-tabs button','#affiliateProjectRange']:
      for element in page.locator(selector).all():
       bounds=element.bounding_box();self.assertGreaterEqual(bounds['width'],44,selector);self.assertGreaterEqual(bounds['height'],44,selector)
     hero=page.locator('#inicio').evaluate('e=>({frames:e.praxisHero.loader.blobs.size,cache:e.praxisHero.loader.decoded.size,mode:e.praxisHero.staticMode,dpr:e.praxisHero.surface.dpr,copy:parseFloat(getComputedStyle(e.querySelector(".hero-intro-copy")).fontSize)})')
     self.assertEqual(hero['frames'],1);self.assertTrue(hero['mode']);self.assertLessEqual(hero['dpr'],2);self.assertGreaterEqual(hero['copy'],14)
     copy_bounds=page.locator('.hero-intro-copy').bounding_box();frame_bottom=page.locator('#inicio').evaluate('e=>{const h=e.praxisHero;return h.viewport.getBoundingClientRect().top+h.mobileLayout.y+832*h.mobileLayout.scale}')
     self.assertGreater(copy_bounds['y'],frame_bottom)
    self.assertEqual(page.locator('.form-submit-btn').evaluate('e=>getComputedStyle(e).position'),'relative' if width<=1024 else 'absolute')
    records.append({'width':width,'height':height,'overflow':0,'header':page.locator('header').bounding_box()['height']});page.close();print(f'  Layout {width}x{height}: OK',flush=True)
  (OUT/'matrix.json').write_text(json.dumps(records,indent=2))
 def test_reference_hero_monitor_fills_mobile_width(self):
  for width,height in [(320,740),(390,844),(430,932),(768,1024)]:
   with self.subTest(width=width):
    page=self.open_page(width,height)
    hero=page.locator('#inicio').evaluate('''e=>{const h=e.praxisHero,q=h.state.screenCorners;return {frame:h.state.drawn,width:Math.max(...q.map(p=>p[0]))-Math.min(...q.map(p=>p[0])),top:Math.min(...q.map(p=>p[1])),left:Math.min(...q.map(p=>p[0])),right:Math.max(...q.map(p=>p[0])),bottom:Math.max(...q.map(p=>p[1])),font:parseFloat(getComputedStyle(e.querySelector('.hero-intro-copy')).fontSize)}}''')
    self.assertEqual(hero['frame'],0)
    self.assertGreater(hero['width']/width,.76)
    self.assertGreaterEqual(hero['left'],16)
    self.assertLessEqual(hero['right'],width-16)
    self.assertLess(hero['bottom'],height if width<600 else 1200)
    self.assertGreaterEqual(hero['font'],16)
    self.assertIsNone(page.locator('#inicio').evaluate('e=>e.praxisHero.trigger'))
    page.close()
 def test_mobile_navigation_keyboard_and_language(self):
  page=self.open_page()
  for target in ['portfolio','contato','orcamento','afiliados','faq','inicio']:
   page.locator('.mobile-nav-toggle').tap();self.assertFalse(page.locator('.main-nav').evaluate('e=>e.inert'))
   page.locator(f'.main-nav a[href="#{target}"]').tap();page.wait_for_function('(id)=>window.PraxisSectionNavigation.getState().phase==="arrived"&&window.PraxisSectionNavigation.getState().target===id',arg=target)
   state=page.evaluate('window.PraxisSectionNavigation.getState()');self.assertLess(abs(page.evaluate('scrollY')-state['scrollTarget']),2)
   self.assertEqual(page.locator('.mobile-nav-toggle').get_attribute('aria-expanded'),'false')
  page.locator('.mobile-nav-toggle').tap();page.keyboard.press('Escape');self.assertTrue(page.locator('.mobile-nav-toggle').evaluate('e=>e===document.activeElement'))
  page.locator('#langBtn').tap();page.locator('#lang-opt-en').tap();self.assertEqual(page.locator('#langBtn').get_attribute('data-short-label'),'EN')
  page.close()
 def swipe(self,page,dx,dy):
  stage=page.locator('.carousel-3d-stage');stage.evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})');page.wait_for_timeout(150)
  box=stage.bounding_box();x=box['x']+box['width']*.65;y=max(100,min(page.viewport_size['height']-80,box['y']+box['height']*.65));cdp=page.context.new_cdp_session(page)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for i in range(1,9):
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*i/8,'y':y+dy*i/8}]});page.wait_for_timeout(20)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach();page.wait_for_timeout(150)
 def test_carousel_touch_and_vertical_scroll(self):
  page=self.open_page();page.locator('.carousel-arrow-next').tap();self.assertEqual(page.evaluate('window.PraxisProjectCarousel.getActiveIndex()'),1)
  self.swipe(page,-100,0);self.assertEqual(page.evaluate('window.PraxisProjectCarousel.getActiveIndex()'),2)
  self.swipe(page,100,0);self.assertEqual(page.evaluate('window.PraxisProjectCarousel.getActiveIndex()'),1)
  page.locator('.carousel-3d-stage').evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})');page.wait_for_timeout(100);before=page.evaluate('scrollY')
  self.swipe(page,0,-180);self.assertGreater(page.evaluate('scrollY'),before+30);self.assertEqual(page.evaluate('window.PraxisProjectCarousel.getActiveIndex()'),1)
  page.close()
 def test_forms_faq_and_keyboard_sized_viewport(self):
  page=self.open_page();page.locator('#inputNome').fill('Teste mobile');page.locator('#inputEmail').fill('teste@example.com');page.locator('#inputTelefone').fill('999999999')
  for id,index,value in [('selectTipo',2,'landing'),('selectPaginas',1,'1'),('selectDial',1,'+351')]:
   page.locator(f'#{id}-control').tap();page.locator(f'#{id}-option-{index}').tap();self.assertEqual(page.locator(f'#{id}').input_value(),value)
  page.set_viewport_size({'width':390,'height':430});page.locator('#textareaMensagem').fill('Teste de campo com viewport reduzida.');page.locator('#textareaMensagem').evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})')
  self.assertGreater(page.locator('#textareaMensagem').bounding_box()['y'],page.locator('header').bounding_box()['height'])
  page.locator('.form-submit-btn').tap();self.assertFalse(page.locator('#formFeedback').is_hidden())
  page.set_viewport_size({'width':390,'height':844});question=page.locator('#faq .faq-trigger').first;question.tap();page.wait_for_timeout(150);self.assertEqual(question.get_attribute('aria-expanded'),'true');question.tap();self.assertEqual(question.get_attribute('aria-expanded'),'false')
  page.close()
 def test_orientation_and_desktop_restore(self):
  page=self.open_page()
  for width,height in [(844,390),(375,812),(1024,768),(1440,900),(390,844)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(250)
   self.assertEqual(page.evaluate('document.documentElement.scrollWidth-innerWidth'),0)
   self.assertEqual(page.locator('.main-nav').evaluate('e=>e.inert'),width<=1024)
   self.assertEqual(page.locator('.mobile-nav-toggle').is_visible(),width<=1024)
   self.assertEqual(page.locator('.sec2-right-portrait image').get_attribute('href').endswith('-mobile.webp'),width<=1024)
  page.close()

if __name__=='__main__':unittest.main()

import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/header');OUT.mkdir(parents=True,exist_ok=True)
class NavDecodeBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,reduced=False,width=1440):
  context=self.browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce' if reduced else 'no-preference');self.addCleanup(context.close);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]));page.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');page.wait_for_function('document.querySelector(".main-nav")?.navSectionDecode');page.evaluate('document.fonts.ready');return page
 def section(self,page,id):
  page.evaluate('(id)=>{const e=document.getElementById(id),s=e.closest("section");window.scrollTo({top:scrollY+s.getBoundingClientRect().top+100,behavior:"instant"})}',id)
  page.wait_for_function('(id)=>document.querySelector(".main-nav").navSectionDecode.getState().activeHref==="#"+id',arg=id)
 def test_periodic_decode_only_active_label_and_fixed_layout(self):
  page=self.open();page.wait_for_function('document.querySelector(".main-nav").navSectionDecode.getState().activeHref==="#inicio"')
  self.assertEqual(page.evaluate('document.querySelector(".main-nav").navSectionDecode.getState().period'),6000)
  page.wait_for_function('document.querySelector(".nav-link-1 .nav-label").dataset.decodeState==="done"')
  original=page.locator('.nav-link-1').bounding_box();cycle=page.evaluate('document.querySelector(".main-nav").navSectionDecode.getState().cycles')
  page.wait_for_function('(n)=>document.querySelector(".main-nav").navSectionDecode.getState().cycles>n',arg=cycle,timeout=9000)
  self.assertEqual(page.locator('.nav-link-1 .nav-label').get_attribute('data-decode-state'),'decoding');self.assertEqual(page.locator('.nav-link-1').get_attribute('aria-label'),'Início');self.assertEqual(page.locator('.nav-link-1').bounding_box(),original)
  self.assertEqual(page.locator('.nav-label[data-decode-state="decoding"]').count(),1);page.locator('header').screenshot(path=str(OUT/'decodificacao-inicio.png'))
  self.section(page,'portfolio');page.wait_for_function('document.querySelector(".nav-link-2 .nav-label").dataset.decodeState==="decoding"');self.assertEqual(page.locator('.nav-link-1 .nav-label').inner_text(),'Início')
  page.wait_for_function('document.querySelector(".nav-link-2 .nav-label").dataset.decodeState==="done"');self.assertEqual(page.locator('.nav-link-2 .nav-label').inner_text(),'Portfólio')
 def test_sections_aliases_unmapped_and_cancellation(self):
  page=self.open()
  for id in ['portfolio','contato','afiliados','faq']:
   self.section(page,id);self.assertEqual(page.locator('.nav-link[aria-current="location"]').count(),1)
  page.evaluate('()=>{history.replaceState(null,"","#orcamento");dispatchEvent(new HashChangeEvent("hashchange"))}');self.section(page,'orcamento')
  page.wait_for_function('document.querySelector(".nav-link-4 .nav-label").dataset.decodeState==="decoding"')
  page.evaluate('()=>{const s=document.querySelector(".sec-devmode");window.scrollTo({top:scrollY+s.getBoundingClientRect().top+100,behavior:"instant"})}')
  page.wait_for_function('document.querySelector(".main-nav").navSectionDecode.getState().activeHref===null');self.assertEqual(page.locator('.nav-label[data-decode-state="decoding"]').count(),0)
  self.assertEqual(page.locator('.nav-link-4 .nav-label').inner_text(),'Orçamento')
 def test_reduced_motion_mobile_and_destroy(self):
  for width in [1440,390]:
   page=self.open(True,width);self.section(page,'portfolio');page.wait_for_timeout(800);self.assertEqual(page.locator('.nav-label[data-decode-state="decoding"]').count(),0)
   self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'));self.assertEqual(page.locator('.nav-link-2').get_attribute('href'),'#portfolio')
   page.evaluate('document.querySelector(".main-nav").navSectionDecode.destroy()');self.assertEqual(page.locator('.nav-link[aria-current]').count(),0);self.assertEqual(page.locator('.nav-link-2 .nav-label').inner_text(),'Portfólio')
if __name__=='__main__':unittest.main(verbosity=2)

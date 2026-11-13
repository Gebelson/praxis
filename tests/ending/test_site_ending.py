import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/final-do-site')
class SiteEnding(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,width=1440,height=1000):
  page=self.browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce');self.addCleanup(page.close)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]))
  page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded');page.wait_for_function('document.querySelector(".site-wrapper")?.siteEnding&&window.__praxisHero?.state?.drawn>=0');page.evaluate('document.fonts.ready');return page
 def test_partner_tabs_click_keyboard_and_example_labels(self):
  page=self.open();tabs=page.locator('[data-partner-tab]');self.assertEqual(tabs.count(),3)
  tabs.nth(1).click();self.assertEqual(tabs.nth(1).get_attribute('aria-selected'),'true');self.assertTrue(page.locator('#partner-referrals').is_visible());self.assertFalse(page.locator('#partner-overview').is_visible())
  page.keyboard.press('ArrowRight');self.assertTrue(page.locator('#partner-commissions').is_visible());page.keyboard.press('Home');self.assertTrue(page.locator('#partner-overview').is_visible());self.assertEqual(tabs.nth(0).get_attribute('tabindex'),'0')
  self.assertIn('ILUSTRATIVA',page.locator('.preview-label').inner_text());self.assertIn('exemplo',page.locator('.partner-preview-note').inner_text())
 def test_commission_calculation_range_bounds_and_invalid_input(self):
  page=self.open();number=page.locator('#affiliateProjectValue');output=page.locator('#affiliateCommission')
  self.assertIn('500,00',output.inner_text());number.fill('7500');self.assertIn('750,00',output.inner_text())
  number.fill('999.99');self.assertIn('100,00',output.inner_text())
  page.locator('#affiliateProjectRange').evaluate('e=>{e.value="25000";e.dispatchEvent(new Event("input",{bubbles:true}))}')
  self.assertEqual(number.input_value(),'25000');self.assertIn('2.500,00',output.inner_text())
  number.fill('0');self.assertIn('0,00',output.inner_text());number.fill('50000');self.assertIn('5.000,00',output.inner_text())
  number.fill('-1');self.assertEqual(output.inner_text(),'—');self.assertEqual(number.get_attribute('aria-invalid'),'true');number.fill('5000');self.assertEqual(number.get_attribute('aria-invalid'),'false')
 def test_faq_all_answers_expand_without_overlap_and_keyboard(self):
  page=self.open();cards=page.locator('.faq-card');self.assertEqual(cards.count(),10)
  for i in range(cards.count()):
   button=cards.nth(i).locator('button');button.click();self.assertEqual(button.get_attribute('aria-expanded'),'true');answer=cards.nth(i).locator('.faq-answer');self.assertTrue(answer.is_visible());self.assertEqual(button.get_attribute('aria-controls'),answer.get_attribute('id'))
  rects=cards.evaluate_all('es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})')
  for prev,next in zip(rects,rects[1:]):self.assertGreaterEqual(next['top'],prev['bottom']+10)
  self.assertGreaterEqual(page.locator('.site-footer').bounding_box()['y'],rects[-1]['bottom'])
  first=cards.first.locator('button');first.focus();page.keyboard.press('Enter');self.assertEqual(first.get_attribute('aria-expanded'),'false')
 def test_contact_prefill_preserves_existing_message_and_footer_links(self):
  page=self.open();message=page.locator('#textareaMensagem');page.locator('[data-affiliate-interest]').first.click();self.assertIn('programa de afiliados',message.input_value())
  message.fill('Minha mensagem original');page.locator('[data-affiliate-interest]').first.click();self.assertEqual(message.input_value(),'Minha mensagem original')
  self.assertEqual(page.locator('.footer-email').get_attribute('href'),'mailto:praxis.contato@gmail.com')
  targets=page.locator('.site-footer a[href^="#"]').evaluate_all('es=>es.map(e=>({href:e.getAttribute("href"),exists:!!document.getElementById(e.getAttribute("href").slice(1))}))');self.assertTrue(all(t['exists'] for t in targets),targets)
  page.locator('.footer-back-top').click();page.wait_for_function('scrollY<2')
 def test_responsive_complete_lower_page_and_screenshots(self):
  OUT.mkdir(parents=True,exist_ok=True)
  for width,height in [(1920,1080),(1440,1000),(1024,768),(768,1024),(390,844),(375,812)]:
   with self.subTest(width=width):
    page=self.open(width,height);self.assertEqual(page.locator('.aff-mint-card,.aff-dashboard-img').count(),0)
    self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    for sel in ['.affiliates-details','.sec-faq','.site-footer']:
     data=page.locator(sel).evaluate('e=>[...e.querySelectorAll("h2,h3,h4,p,button,table,input,output")].filter(n=>!n.closest("[hidden]")&&!n.classList.contains("visually-hidden")).map(n=>({text:n.textContent.slice(0,30),overflow:n.scrollWidth-n.clientWidth}))')
     self.assertTrue(all(d['overflow']<=2 for d in data),data)
    for name,sel in [('afiliados','.affiliates-details'),('faq','.sec-faq'),('rodape','.site-footer')]:
     page.locator(sel).scroll_into_view_if_needed();page.locator(sel).screenshot(path=str(OUT/f'{name}-{width}.png'),style='.site-header,.page-scrollbar,.bottom-progressive-blur{visibility:hidden!important}')
if __name__=='__main__':unittest.main()

import unittest,json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(r'F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/languages')
URL='http://127.0.0.1:5173/'
class Languages(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.b=cls.p.chromium.launch();OUT.mkdir(parents=True,exist_ok=True)
 @classmethod
 def tearDownClass(cls):cls.b.close();cls.p.stop()
 def ready(self,page):page.wait_for_function('document.getElementById("inicio")?.praxisHero?.intro.state==="completed"')
 def test_device_language_and_layout(self):
  for locale,code,label in [('pt-BR','pt-BR','Início'),('en-GB','en','Home'),('es-MX','es','Inicio'),('ja-JP','pt-BR','Início')]:
   for width,height in [(390,844),(1440,900)]:
    with self.subTest(locale=locale,width=width):
     c=self.b.new_context(locale=locale,viewport={'width':width,'height':height},has_touch=width==390,is_mobile=width==390,reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     page.goto(URL,wait_until='networkidle');self.ready(page)
     self.assertEqual(page.locator('html').get_attribute('lang'),code);self.assertIn(label,page.locator('.main-nav a').first.text_content());self.assertEqual(page.evaluate('document.documentElement.scrollWidth-innerWidth'),0)
     if locale in ['en-GB','es-MX']:
      self.assertNotIn('PROCURANDO',page.locator('#heroStickyTitle').get_attribute('aria-label'));
      bounds=page.locator('.hero-title-line1').bounding_box();self.assertLessEqual(bounds['x']+bounds['width'],width);
      self.assertNotIn('Por que contratar',page.locator('.faq-question').first.inner_text());self.assertNotIn('Nosso processo',page.locator('.process-title-bold').inner_text());self.assertNotIn('Muitas pessoas',page.locator('.hero-intro-copy .visually-hidden').inner_text())
      page.screenshot(path=str(OUT/f'{code}-{width}.png'))
     self.assertEqual(errors,[]);c.close()
 def test_mobile_title_lines_stay_inside_shared_margins(self):
  for width in [320,390,430,768]:
   for code in ['pt','en','es','fr','zh','pt-PT']:
    with self.subTest(width=width,language=code):
     c=self.b.new_context(viewport={'width':width,'height':900},reduced_motion='reduce');page=c.new_page();page.goto(URL+'?lang='+code,wait_until='networkidle');self.ready(page);page.evaluate('document.fonts.ready')
     boxes=page.locator('.hero-title-line1,.hero-title-line2').evaluate_all("""lines=>lines.map(e=>{const r=e.getBoundingClientRect();if(!document.documentElement.lang.startsWith('zh'))return {left:r.left,right:r.right};const slots=[...e.querySelectorAll('[data-char]')],first=slots[0],last=slots.at(-1),s=getComputedStyle(e),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;const ratio=first.getBoundingClientRect().width/first.offsetWidth;return {left:first.getBoundingClientRect().left-ctx.measureText(first.dataset.char).actualBoundingBoxLeft*ratio,right:last.getBoundingClientRect().left+ctx.measureText(last.dataset.char).actualBoundingBoxRight*ratio}})""")
     for box in boxes:
      self.assertAlmostEqual(box['left'],24,delta=1);self.assertAlmostEqual(box['right'],width-24,delta=1)
     c.close()
 def test_copy_gap_ignores_decoder_symbols(self):
  c=self.b.new_context(locale='en-US',viewport={'width':1920,'height':993},reduced_motion='reduce');page=c.new_page();page.goto(URL,wait_until='networkidle');self.ready(page);page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
  before=page.locator('.hero-intro-copy').evaluate('e=>parseFloat(e.style.top)')
  page.evaluate('''()=>{const h=document.getElementById('inicio').praxisHero;for(const glyph of document.querySelectorAll('.hero-char-glyph'))glyph.textContent='gp#';h.sizeKey='';h.configure();}''')
  after=page.locator('.hero-intro-copy').evaluate('e=>parseFloat(e.style.top)')
  self.assertAlmostEqual(before,after,delta=.1);c.close()
 def test_hero_vertical_rhythm_matches_portuguese(self):
  for width,height in [(390,844),(1440,900),(1920,993)]:
   c=self.b.new_context(viewport={'width':width,'height':height},reduced_motion='reduce');page=c.new_page();states=[]
   for code in ['pt','en','es']:
    page.goto(URL+'?lang='+code,wait_until='networkidle');self.ready(page);page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
    states.append(page.evaluate('''()=>['.hero-title-line1','.hero-title-line2','.hero-intro-copy'].map(selector=>{const e=document.querySelector(selector),s=getComputedStyle(e),r=e.getBoundingClientRect();return {y:r.y,font:parseFloat(s.fontSize),line:parseFloat(s.lineHeight)}})'''))
   for translated in states[1:]:
    for original,changed in zip(states[0],translated):
     for metric in ['y','font','line']:self.assertAlmostEqual(original[metric],changed[metric],delta=.8,msg=(width,metric,original,changed))
   c.close()
 def test_spanish_punctuation_and_portfolio(self):
  for width,height in [(390,844),(1440,900)]:
   c=self.b.new_context(locale='es-ES',viewport={'width':width,'height':height},reduced_motion='reduce');page=c.new_page();page.goto(URL,wait_until='networkidle');self.ready(page)
   self.assertEqual(page.locator('.portfolio-watermark').text_content(),'PORTAFOLIO')
   page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
   mark=page.locator('[data-char="¿"]')
   for selector in ['.hero-char-ghost','.hero-char-glyph']:
    value=mark.locator(selector).evaluate('e=>new DOMMatrix(e.style.transform).m42')
    self.assertLess(value,0)
   c.close()
 def test_new_languages_detection_translation_and_layout(self):
  for locale,code,html_lang,heading in [('zh-CN','zh','zh-CN','想要一个'),('fr-CA','fr','fr','VOUS CHERCHEZ UN SITE'),('pt-PT','pt-PT','pt-PT','À PROCURA DE UM')]:
   for width,height in [(390,844),(1440,900)]:
    with self.subTest(locale=locale,width=width):
     c=self.b.new_context(locale=locale,viewport={'width':width,'height':height},has_touch=width==390,is_mobile=width==390,reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL,wait_until='networkidle');self.ready(page);page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
     self.assertEqual(page.locator('html').get_attribute('lang'),html_lang);self.assertIn(heading,page.locator('#heroStickyTitle').get_attribute('aria-label'));self.assertEqual(page.locator('#lang-opt-'+code).get_attribute('aria-selected'),'true')
     self.assertEqual(page.evaluate('document.documentElement.scrollWidth-innerWidth'),0)
     copy=page.locator('.hero-intro-copy');self.assertLessEqual(copy.bounding_box()['x']+copy.bounding_box()['width'],width+1)
     if code=='zh':
      self.assertGreater(page.locator('.hero-copy-word').count(),40)
      self.assertLessEqual(page.locator('.hero-copy-word').evaluate_all('nodes=>Math.max(...nodes.map(e=>e.getBoundingClientRect().width))'),width-48)
      self.assertEqual(page.locator('.faq-question').first.text_content(),'为什么选择 Praxis，而不是其他服务商？')
     if code=='pt-PT':self.assertIn('Contacto',page.locator('.main-nav').text_content())
     page.screenshot(path=str(OUT/f'new-{code}-{width}.png'));self.assertEqual(errors,[]);c.close()
 def test_chinese_title_visible_edges_match(self):
  for width,height in [(390,844),(1920,993)]:
   c=self.b.new_context(locale='zh-CN',viewport={'width':width,'height':height},reduced_motion='reduce');page=c.new_page();page.goto(URL,wait_until='networkidle');self.ready(page);page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
   edges=page.evaluate('''()=>[...document.querySelectorAll('.hero-title-line1,.hero-title-line2')].map(line=>{const slots=[...line.querySelectorAll('[data-char]')],first=slots[0],last=slots.at(-1),s=getComputedStyle(line),c=document.createElement('canvas').getContext('2d');c.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;const ratio=first.getBoundingClientRect().width/first.offsetWidth;return {left:first.getBoundingClientRect().left-c.measureText(first.dataset.char).actualBoundingBoxLeft*ratio,right:last.getBoundingClientRect().left+c.measureText(last.dataset.char).actualBoundingBoxRight*ratio}})''')
   self.assertAlmostEqual(edges[0]['left'],edges[1]['left'],delta=1);self.assertAlmostEqual(edges[0]['right'],edges[1]['right'],delta=1);c.close()
 def test_new_language_choices_are_selectable_and_saved(self):
  c=self.b.new_context(locale='pt-BR',reduced_motion='reduce');page=c.new_page();page.goto(URL,wait_until='networkidle');self.ready(page)
  for code,html_lang in [('zh','zh-CN'),('fr','fr'),('pt-PT','pt-PT')]:
   page.locator('#langBtn').click();page.locator('#lang-opt-'+code).click();page.wait_for_url('**?lang='+code);self.ready(page);self.assertEqual(page.locator('html').get_attribute('lang'),html_lang);self.assertEqual(page.evaluate('localStorage.getItem("praxis-language")'),code)
  c.close()
 def test_language_button_width_is_constant(self):
  c=self.b.new_context(locale='pt-BR',viewport={'width':1440,'height':900},reduced_motion='reduce');page=c.new_page();widths=[]
  for code in ['pt','en','es','zh','fr','pt-PT']:
   page.goto(URL+'?lang='+code,wait_until='networkidle');self.ready(page)
   widths.append(page.locator('#langBtn').bounding_box()['width'])
   self.assertEqual(page.locator('#langBtn strong').evaluate('e=>getComputedStyle(e).transform'),'matrix(1, 0, 0, 1, 0, 1)')
  self.assertLess(max(widths)-min(widths),.01);c.close()
 def test_manual_choice_persists_and_keeps_form(self):
  c=self.b.new_context(locale='pt-BR',viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce');page=c.new_page();page.goto(URL,wait_until='networkidle');self.ready(page)
  page.locator('#inputNome').fill('Teste de idioma');page.locator('#inputEmail').fill('teste@example.com');page.locator('#textareaMensagem').fill('Manter esta mensagem')
  page.locator('#langBtn').tap();page.locator('#lang-opt-en').tap();page.wait_for_url('**?lang=en');self.ready(page)
  self.assertEqual(page.locator('html').get_attribute('lang'),'en');self.assertEqual(page.locator('#inputNome').input_value(),'Teste de idioma');self.assertEqual(page.locator('#textareaMensagem').input_value(),'Manter esta mensagem');self.assertEqual(page.evaluate('localStorage.getItem("praxis-language")'),'en')
  page.goto(URL,wait_until='networkidle');self.ready(page);self.assertEqual(page.locator('html').get_attribute('lang'),'en')
  page.locator('#langBtn').focus();page.keyboard.press('ArrowDown');page.locator('#lang-opt-es').focus();page.keyboard.press('Enter');page.wait_for_url('**?lang=es');self.ready(page);self.assertEqual(page.locator('html').get_attribute('lang'),'es');c.close()
 def test_blocked_storage_and_query_override(self):
  c=self.b.new_context(locale='es-ES',reduced_motion='reduce');c.add_init_script('Storage.prototype.getItem=function(){throw new Error("blocked")};Storage.prototype.setItem=function(){throw new Error("blocked")}');page=c.new_page();page.goto(URL+'?lang=en',wait_until='networkidle');self.ready(page);self.assertEqual(page.locator('html').get_attribute('lang'),'en');c.close()
if __name__=='__main__':unittest.main()

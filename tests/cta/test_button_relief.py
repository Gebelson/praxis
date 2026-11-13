import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/quadro-orcamento')
class ButtonRelief(unittest.TestCase):
 def test_surface_exists_before_and_during_hover(self):
  with sync_playwright() as p:
   browser=p.chromium.launch()
   for width,height in [(1440,1000),(390,844)]:
    page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce');page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded');page.wait_for_function('window.__praxisHero?.state?.drawn>=0');page.evaluate('document.fonts.ready')
    button=page.locator('.cta-pill-button');button.scroll_into_view_if_needed();page.wait_for_timeout(100)
    def text():return button.locator('span').first.evaluate('e=>{const s=getComputedStyle(e);return [s.fontWeight,s.fontSize,s.color,s.textShadow,s.filter]}')
    initial=text()
    for state in ['normal','hover']:
     if state=='hover':button.hover()
     layers=button.evaluate("""e=>['::before','::after'].map(p=>{const s=getComputedStyle(e,p);return {content:s.content,position:s.position,width:parseFloat(s.width),height:parseFloat(s.height),opacity:s.opacity,background:s.backgroundColor,shadow:s.boxShadow}})""")
     for layer in layers:
      self.assertEqual(layer['content'],'""');self.assertEqual(layer['position'],'absolute');self.assertGreater(layer['width'],200);self.assertGreater(layer['height'],40);self.assertNotEqual(layer['shadow'],'none')
     self.assertEqual(layers[0]['opacity'],'1');self.assertEqual(layers[1]['opacity'],'1' if state=='hover' else '0');self.assertEqual(text(),initial)
     r=button.bounding_box();x=max(0,r['x']-30)
     page.screenshot(path=str(OUT/f'botao-restaurado-{state}-{width}.png'),clip={'x':x,'y':r['y']-30,'width':min(width-x,r['width']+60),'height':r['height']+60})
    page.close()
   browser.close()
if __name__=='__main__':unittest.main()

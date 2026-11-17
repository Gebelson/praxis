import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(r'F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/languages')
class FrenchValueProp(unittest.TestCase):
 def test_french_text_stays_within_its_column(self):
  with sync_playwright() as p:
   b=p.chromium.launch()
   for width,height in [(390,844),(768,1024),(1440,900),(1920,993)]:
    page=b.new_page(viewport={'width':width,'height':height},locale='fr-FR',reduced_motion='reduce');page.goto('http://127.0.0.1:5173/?lang=fr',wait_until='networkidle');page.evaluate('document.fonts.ready');page.wait_for_timeout(150)
    data=page.locator('.sec2-left-content').evaluate('''e=>{const column=e.getBoundingClientRect(),heading=e.querySelector('.sec2-heading').getBoundingClientRect();return {right:column.right,lines:[...e.querySelectorAll('.sec2-h-line1,.sec2-h-line2,.sec2-h-line3,.rating-caption')].map(n=>{const range=document.createRange();range.selectNodeContents(n);return {text:n.textContent,right:range.getBoundingClientRect().right}})}}''')
    for line in data['lines']:self.assertLessEqual(line['right'],data['right']+2,(width,line))
    self.assertEqual(page.evaluate('document.documentElement.scrollWidth-innerWidth'),0)
    page.locator('.sec-value-prop').screenshot(path=str(OUT/f'french-value-prop-{width}.png'));page.close()
   b.close()
 def test_rating_row_matches_caption_width_in_all_languages(self):
  with sync_playwright() as p:
   b=p.chromium.launch()
   for width,height in [(390,844),(1440,900)]:
    page=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
    for code in ['pt','en','es','fr','zh','pt-PT']:
     page.goto('http://127.0.0.1:5173/?lang='+code,wait_until='networkidle');page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
     data=page.locator('.rating-block').evaluate('''e=>{const row=e.querySelector('.rating-top-row').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e.querySelector('.rating-caption'));const text=range.getBoundingClientRect();return {row:row.width,text:text.width,left:row.left-text.left}}''')
     self.assertAlmostEqual(data['row'],data['text'],delta=2,msg=(width,code,data));self.assertAlmostEqual(data['left'],0,delta=1)
    page.close()
   b.close()
 def test_checks_follow_title_width(self):
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce')
   for code in ['pt','en','es','fr','zh','pt-PT']:
    page.goto('http://127.0.0.1:5173/?lang='+code,wait_until='networkidle');page.evaluate('document.fonts.ready');page.wait_for_timeout(150)
    data=page.locator('.sec2-left-content').evaluate('''e=>{const rects=[...e.querySelectorAll('.sec2-heading>span')].map(n=>{const r=document.createRange();r.selectNodeContents(n);return r.getBoundingClientRect()}),items=[...e.querySelectorAll('.check-item')].map(n=>n.getBoundingClientRect());return {titleLeft:Math.min(...rects.map(r=>r.left)),titleRight:Math.max(...rects.map(r=>r.right)),first:items[0].left,last:items.at(-1).right}}''')
    self.assertAlmostEqual(data['titleLeft'],data['first'],delta=1,msg=(code,data));self.assertAlmostEqual(data['titleRight'],data['last'],delta=1,msg=(code,data))
   b.close()
if __name__=='__main__':unittest.main()

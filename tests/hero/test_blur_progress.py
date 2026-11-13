import unittest,json,os,math
from pathlib import Path
from PIL import Image,ImageStat
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'validation/blur-progress';OUT.mkdir(parents=True,exist_ok=True)
URL=os.getenv('HERO_URL','http://127.0.0.1:5173')
class BlurProgressBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def test_scroll_reversible_continuous_and_retained(self):
  context=self.browser.new_context(viewport={'width':1440,'height':900});self.addCleanup(context.close);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(URL,wait_until='domcontentloaded');page.wait_for_function('window.__praxisHero?.state?.drawn>=0')
  blur=page.locator('#bottomProgressiveBlur')
  self.assertEqual(float(blur.evaluate('e=>getComputedStyle(e.firstElementChild).opacity')),0,'Blur must start invisible independently of the ASCII intro')
  page.wait_for_function('window.__praxisHero.intro.state==="completed"');page.evaluate('document.fonts.ready');rows=[]
  for direction,points in [('down',[.8,.85,.9,.95,1]),('up',[1,.95,.9,.85,.8])]:
   for p in points:
    page.evaluate('(p)=>{const t=window.__praxisHero.trigger;window.scrollTo({top:t.start+(t.end-t.start)*p,behavior:"instant"})}',p)
    page.wait_for_function('(p)=>Math.abs(window.__praxisHero.progress-p)<.001',arg=p)
    target=math.floor(p*88+.5);page.wait_for_function('(i)=>window.__praxisHero.state.drawn===i',arg=target)
    data=blur.evaluate('e=>{const s=getComputedStyle(e),h=window.__praxisHero;return {progress:h.progress,expected:h.state.expected,drawn:h.state.drawn,opacity:Number(getComputedStyle(e.firstElementChild).opacity),layerOpacities:[...e.children].map(c=>Number(getComputedStyle(c).opacity)),position:s.position,pointerEvents:s.pointerEvents,layers:e.children.length,transition:s.transitionDuration}}')
    t=max(0,min(1,(p-.85)/.15));expected=.8*t+.2*t*t*(3-2*t)
    self.assertAlmostEqual(data['opacity'],expected,delta=.004)
    self.assertTrue(all(v==data['opacity'] for v in data['layerOpacities']))
    self.assertEqual(data['position'],'fixed');self.assertEqual(data['pointerEvents'],'none');self.assertEqual(data['layers'],8);self.assertEqual(data['transition'],'0s')
    data.update(direction=direction);rows.append(data);page.screenshot(path=str(OUT/f'{direction}-{round(p*100):03d}.png'))
  # Sub-frame progress must produce sub-frame opacity changes immediately.
  for p in [.901,.902,.899]:
   page.evaluate('(p)=>{const t=window.__praxisHero.trigger;window.scrollTo({top:t.start+(t.end-t.start)*p,behavior:"instant"})}',p)
   page.wait_for_function('(p)=>Math.abs(window.__praxisHero.progress-p)<.0005',arg=p)
   actual=blur.evaluate('e=>Number(getComputedStyle(e.firstElementChild).opacity)');t=(page.evaluate('window.__praxisHero.progress')-.85)/.15
   self.assertAlmostEqual(actual,.8*t+.2*t*t*(3-2*t),delta=.004)
  for offset in [.5,2]:
   page.evaluate('(offset)=>window.scrollTo({top:window.__praxisHero.trigger.end+innerHeight*offset,behavior:"instant"})',offset)
   page.wait_for_function('window.__praxisHero.progress===1');self.assertEqual(float(blur.evaluate('e=>getComputedStyle(e.firstElementChild).opacity')),1)
  self.assertEqual(page.evaluate('window.__praxisHero.intro.run'),1);self.assertEqual(errors,[])
  (OUT/'measurements.json').write_text(json.dumps(rows,indent=2))
 def test_intermediate_intensities_really_blur_pixels(self):
  context=self.browser.new_context(viewport={'width':1440,'height':900});self.addCleanup(context.close);page=context.new_page()
  page.goto(URL,wait_until='domcontentloaded');page.wait_for_function('window.__praxisHero?.intro?.state==="completed"')
  # High-frequency stripes expose backdrop isolation that opacity-only checks miss.
  page.evaluate("""()=>{const e=document.createElement('div');Object.assign(e.style,{position:'fixed',inset:'700px 0 0',background:'repeating-linear-gradient(90deg,#000 0 10px,#fff 10px 20px)',zIndex:39,pointerEvents:'none'});document.body.append(e)}""")
  contrast=[]
  for p in [.85,.9,.95,1]:
   page.evaluate('(p)=>{const t=window.__praxisHero.trigger;window.scrollTo({top:t.start+(t.end-t.start)*p,behavior:"instant"})}',p)
   page.wait_for_function('(p)=>Math.abs(window.__praxisHero.progress-p)<.001',arg=p)
   page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
   path=OUT/f'pixel-check-{round(p*100)}.png';page.screenshot(path=str(path))
   crop=Image.open(path).crop((200,875,1200,895)).convert('L');contrast.append(ImageStat.Stat(crop).stddev[0])
  self.assertGreater(contrast[0],120)
  self.assertTrue(all(a>b+1 for a,b in zip(contrast,contrast[1:])),contrast)
  self.assertLess(contrast[-1],2)
  (OUT/'pixel-contrast.json').write_text(json.dumps(contrast))
if __name__=='__main__':unittest.main(verbosity=2)

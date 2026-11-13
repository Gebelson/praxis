import json,math,os,unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'validation/process';OUT.mkdir(parents=True,exist_ok=True)
class ProcessBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def test_centered_behavior(self):
  reports=[]
  for width,height in [(1440,900),(1920,1080),(768,1024),(390,844)]:
   with self.subTest(width=width):
    page=self.browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.getenv('HERO_URL','http://127.0.0.1:5173/'),wait_until='domcontentloaded');page.wait_for_function('window.PraxisProcessSection&&window.__praxisHero?.state?.drawn>=0');page.evaluate('document.fonts.ready');page.wait_for_timeout(200)
    state=page.evaluate('window.PraxisProcessSection.getState()');start,end=state['start'],state['end'];positions=state['positions']
    # Visit all six stages forwards and back, at the viewport-center crossing of each content group.
    for index in [*range(6),*range(4,-1,-1)]:
     p=(positions[index]-positions[0])/(positions[-1]-positions[0]);y=start+(end-start)*p+(2 if index else 0)
     page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',y);page.wait_for_function('(i)=>window.PraxisProcessSection.getActiveStep()===i',arg=index)
     actual=page.evaluate('window.PraxisProcessSection.getState()');self.assertAlmostEqual(actual['progress'],max(0,min(1,(page.evaluate('scrollY')-start)/(end-start))),delta=.002)
     self.assertEqual(page.locator('.process-step-item.is-active').count(),1);self.assertEqual(page.locator('.process-dot.is-active').count(),index+1)
     units=page.locator('.process-unit-track').evaluate('e=>e.style.transform');unitHeight=page.locator('.process-unit-item').first.evaluate('e=>e.offsetHeight');self.assertAlmostEqual(float(units.removeprefix('translateY(').removesuffix('px)')),-unitHeight*index,delta=.1)
     centers=page.evaluate("""()=>[...document.querySelectorAll('.process-step-item')].map((step,index)=>{const d=document.querySelectorAll('.process-dot')[index].getBoundingClientRect(),t=step.querySelector('.process-step-title').getBoundingClientRect(),body=step.querySelector('.process-step-body').getBoundingClientRect();return {dot:d.top+d.height/2,content:(t.top+body.bottom)/2}})""")
     for center in centers:self.assertAlmostEqual(center['dot'],center['content'],delta=1)
     currentDot=page.locator('.process-dot').nth(index).bounding_box()
     self.assertAlmostEqual(currentDot['y']+currentDot['height']/2,height/2,delta=3)
     if width>=640:
      block=page.locator('.process-sticky-box').bounding_box()
      self.assertAlmostEqual(block['y']+block['height']/2,height/2,delta=3)
    middle=start+(end-start)*.45;page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',middle);page.wait_for_timeout(800)
    top=page.locator('.process-sticky-box').bounding_box()['y'];
    if width>=640:
     boxHeight=page.locator('.process-sticky-box').bounding_box()['height']
     anchor=(height-boxHeight)/2
     self.assertAlmostEqual(top,anchor,delta=1.5)
    page.screenshot(path=str(OUT/f'process-{width}-middle.png'))
    if width>=640:
     page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',end+5);page.wait_for_timeout(100)
     stopped=page.locator('.process-sticky-box').evaluate('e=>e.style.transform')
     page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',end+205);page.wait_for_timeout(100)
     self.assertEqual(page.locator('.process-sticky-box').evaluate('e=>e.style.transform'),stopped)

    # Resize in place: digit height, pinning and title markers remeasure.
    page.set_viewport_size({'width':390 if width>=640 else 1440,'height':844});page.wait_for_timeout(250)
    page.evaluate('window.PraxisProcessSection.layoutTimeline()');self.assertEqual(page.locator('.process-step-item').count(),6)
    self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.emulate_media(reduced_motion='reduce');self.assertEqual(page.locator('.process-unit-track').evaluate('e=>getComputedStyle(e).transitionDuration'),'0s')
    # It releases before the CTA rather than pinning into later sections.
    page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(250)
    page.locator('.process-main-grid').evaluate('(e)=>window.scrollTo({top:e.getBoundingClientRect().bottom+scrollY,behavior:"instant"})');page.wait_for_timeout(150)
    sticky=page.locator('.process-sticky-box').bounding_box();region=page.locator('.process-left-region').bounding_box();self.assertLessEqual(sticky['y']+sticky['height'],region['y']+region['height']+1)
    reports.append({'viewport':[width,height],'start':start,'end':end,'stickyMiddle':top,'steps':6,'errors':errors});self.assertEqual(errors,[]);page.close()
  (OUT/'behavior.json').write_text(json.dumps(reports,indent=2))
 def test_one_wheel_per_topic_and_boundary_exit(self):
  for width,height in [(1440,900),(390,844)]:
   with self.subTest(width=width):
    page=self.browser.new_page(viewport={'width':width,'height':height})
    page.goto(os.getenv('HERO_URL','http://127.0.0.1:5173/'),wait_until='domcontentloaded');page.wait_for_function('window.PraxisProcessSection&&window.__praxisHero?.state?.drawn>=0');page.wait_for_timeout(300)
    state=page.evaluate('window.PraxisProcessSection.getState()');positions=state['positions']
    targets=[state['start']+(state['end']-state['start'])*(p-positions[0])/(positions[-1]-positions[0]) for p in positions]
    page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',math.ceil(targets[0]));page.wait_for_timeout(100)
    # One modest wheel event must travel the full gap to the next content center.
    page.mouse.wheel(0,100);page.wait_for_function('window.PraxisProcessSection.getState().snap.snapping')
    page.wait_for_function('(y)=>Math.abs(scrollY-Math.ceil(y))<=1&&!window.PraxisProcessSection.getState().snap.snapping',arg=targets[1],timeout=2000)
    self.assertEqual(page.evaluate('window.PraxisProcessSection.getActiveStep()'),1)
    # Trackpad/wheel burst is one gesture, not six separate stage changes.
    page.wait_for_timeout(200)
    for _ in range(6):page.mouse.wheel(0,35);page.wait_for_timeout(25)
    page.wait_for_function('(y)=>Math.abs(scrollY-Math.ceil(y))<=1&&!window.PraxisProcessSection.getState().snap.snapping',arg=targets[2],timeout=2000)
    self.assertEqual(page.evaluate('window.PraxisProcessSection.getActiveStep()'),2)
    page.wait_for_timeout(200);page.mouse.wheel(0,-100)
    page.wait_for_function('(y)=>Math.abs(scrollY-Math.ceil(y))<=1&&!window.PraxisProcessSection.getState().snap.snapping',arg=targets[1],timeout=2000)
    page.wait_for_timeout(200)
    page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',math.ceil(targets[-1]));page.wait_for_timeout(200)
    page.mouse.wheel(0,150);page.wait_for_timeout(700)
    self.assertGreater(page.evaluate('scrollY'),targets[-1]+50)
    page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',math.ceil(targets[0]));page.wait_for_timeout(200)
    page.mouse.wheel(0,-150);page.wait_for_timeout(700)
    self.assertLess(page.evaluate('scrollY'),targets[0]-50)
    # Reduced motion keeps normal browser wheel behavior.
    page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(300)
    state=page.evaluate('window.PraxisProcessSection.getState()');page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',state['start']+2);page.wait_for_timeout(100)
    page.mouse.wheel(0,100);page.wait_for_timeout(500)
    self.assertFalse(page.evaluate('window.PraxisProcessSection.getState().snap.snapping'))
    page.close()
if __name__=='__main__':unittest.main(verbosity=2)

import json,math,os,unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'validation/ascii-intro';OUT.mkdir(parents=True,exist_ok=True)
URL=os.getenv('HERO_URL','http://127.0.0.1:5173')
INSTRUMENT='''window.__introSamples=[];window.__introPlays=[];window.__introUnhandled=[];
window.addEventListener('unhandledrejection',e=>window.__introUnhandled.push(String(e.reason)));
const originalPlay=HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play=function(...args){const h=document.querySelector('#inicio')?.praxisHero;window.__introPlays.push({phase:h?.intro?.state,allowed:h?.video?.gate?.allowed,time:this.currentTime,at:performance.now()});if(window.__blockVideo)return Promise.reject(Object.assign(new Error('test autoplay block'),{name:'NotAllowedError'}));return originalPlay.apply(this,args)};
function inspect(t){const h=document.querySelector('#inicio')?.praxisHero;if(h?.intro&&h.video){const i=h.intro.getState(),v=h.video.video;window.__introSamples.push({at:t,phase:i.state,progress:i.progress,run:i.run,reveal:i.reveal,paused:v.paused,time:v.currentTime,ready:v.readyState,allowed:h.video.gate.allowed,visibility:v.style.visibility});if(window.__introSamples.length>1800)window.__introSamples.shift()}requestAnimationFrame(inspect)}requestAnimationFrame(inspect);'''
class AsciiIntroBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def page(self,**kwargs):
  context=self.browser.new_context(**kwargs);self.addCleanup(context.close);page=context.new_page();page.add_init_script(INSTRUMENT);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]));return page
 def open(self,page):
  page.goto(URL,wait_until='domcontentloaded');page.wait_for_function('window.__praxisHero?.intro?.scene')
 def completed(self,page):page.wait_for_function('window.__praxisHero.intro.state==="completed"')
 def assert_gate(self,page):
  data=page.evaluate('({samples:window.__introSamples,plays:window.__introPlays,unhandled:window.__introUnhandled})')
  self.assertEqual(data['unhandled'],[])
  self.assertTrue(all(p['phase']=='completed' and p['allowed'] for p in data['plays']),data['plays'])
  self.assertTrue(all(s['paused'] and not s['allowed'] and s['visibility']=='hidden' for s in data['samples'] if s['phase']!='completed'))
  return data
 def test_01_entire_visual_timeline_gates_video(self):
  page=self.page(viewport={'width':1440,'height':900});self.open(page);self.completed(page);page.wait_for_timeout(250)
  data=self.assert_gate(page);phases={s['phase'] for s in data['samples']}
  self.assertTrue({'ascii-forming','ascii-resolving','revealing-monitor','completed'}<=phases,phases)
  self.assertTrue(all(s['time']==0 for s in data['samples'] if s['phase']!='completed'))
  self.assertTrue(any(s['phase']=='revealing-monitor' and s['reveal']==1 and s['paused'] for s in data['samples']))
  state=page.evaluate('window.__praxisHero.intro.getState()');self.assertGreater(state['left'],100);self.assertGreater(state['right'],100);self.assertFalse(state['rafActive']);self.assertIsNone(state['error'])
  self.assertTrue(page.locator('.praxis-ascii-overlay').evaluate('e=>e.hidden'));self.assertFalse(page.locator('video').first.evaluate('v=>v.autoplay'));self.assertGreater(page.locator('video').first.evaluate('v=>v.currentTime'),0)
  difference=page.evaluate("""()=>{const h=window.__praxisHero,s=h.state,c=document.createElement('canvas');c.width=h.surface.canvas.width;c.height=h.surface.canvas.height;const ctx=c.getContext('2d');ctx.setTransform(s.dpr,0,0,s.dpr,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(h.loader.decoded.get(s.drawn),s.offset[0],s.offset[1],1104*s.scale,832*s.scale);const a=h.surface.ctx.getImageData(0,0,c.width,c.height).data,b=ctx.getImageData(0,0,c.width,c.height).data;let different=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])different++;return different}""")
  self.assertEqual(difference,0,'The existing frame Canvas must remain pixel-identical')
  page.screenshot(path=str(OUT/'completed-desktop.png'));(OUT/'video-gating-timeline.json').write_text(json.dumps(data,indent=2))
  # Existing header, language picker and text decoder remain active.
  page.locator('#langBtn').click();self.assertEqual(page.locator('#langBtn').get_attribute('aria-expanded'),'true');page.keyboard.press('Escape')
  self.assertEqual(page.locator('.brand-wordmark').inner_text(),'PRAXIS');self.assertGreater(page.locator('.hero-char-slot').count(),20)
 def test_02_scroll_alignment_and_reentry_do_not_replay_intro(self):
  page=self.page(viewport={'width':1440,'height':900});self.open(page);page.wait_for_function('window.__praxisHero.intro.running')
  run=page.evaluate('window.__praxisHero.intro.run');page.evaluate('()=>{const h=window.__praxisHero;window.scrollTo({top:h.trigger.end*.33,behavior:"instant"})}')
  page.wait_for_function('window.__praxisHero.state.drawn===window.__praxisHero.state.expected&&window.__praxisHero.state.drawn>0')
  geometry=page.evaluate('()=>{const h=window.__praxisHero;return {a:h.state.screenCorners,b:h.intro.scene.corners,frame:h.state.drawn,ascii:h.intro.scene.frame,run:h.intro.run}}')
  self.assertEqual(geometry['a'],geometry['b']);self.assertEqual(geometry['frame'],geometry['ascii']);self.assertEqual(geometry['run'],run)
  self.completed(page);page.wait_for_timeout(200)
  page.evaluate('()=>window.scrollTo({top:window.__praxisHero.trigger.end+innerHeight*2,behavior:"instant"})');page.wait_for_function('window.__praxisHero.intro.state==="waiting"')
  saved=page.locator('video').first.evaluate('v=>v.currentTime');self.assertTrue(page.locator('video').first.evaluate('v=>v.paused'))
  count=len(page.evaluate('window.__introSamples'))
  page.evaluate('window.scrollTo({top:0,behavior:"instant"})');self.completed(page)
  self.assertEqual(page.evaluate('window.__praxisHero.intro.run'),run)
  self.assertTrue(page.locator('.praxis-ascii-overlay').evaluate('e=>e.hidden'))
  samples=page.evaluate('window.__introSamples')[count:]
  self.assertFalse(any(s['phase'] in ['ascii-forming','ascii-resolving'] for s in samples))
  self.assertGreaterEqual(page.locator('video').first.evaluate('v=>v.currentTime'),saved-.03)
  # Another return also keeps the one-entry latch and reuses the current scroll state.
  page.evaluate('()=>window.scrollTo({top:window.__praxisHero.trigger.end+innerHeight*2,behavior:"instant"})');page.wait_for_function('window.__praxisHero.intro.state==="waiting"');page.evaluate('window.scrollTo({top:0,behavior:"instant"})');self.completed(page)
  self.assertEqual(page.evaluate('window.__praxisHero.intro.run'),run)
  self.assert_gate(page)
 def test_03_mobile_tablet_resize_and_reduced_motion(self):
  for width,height in [(390,844),(768,1024),(1920,1080)]:
   with self.subTest(width=width):
    page=self.page(viewport={'width':width,'height':height});self.open(page)
    page.set_viewport_size({'width':width,'height':height-30});self.completed(page)
    self.assert_gate(page);self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    self.assertEqual(page.locator('.praxis-frame-canvas').count(),1);self.assertEqual(page.locator('.praxis-ascii-overlay').count(),1)
    page.screenshot(path=str(OUT/f'completed-{width}.png'))
  page=self.page(viewport={'width':390,'height':844},reduced_motion='reduce');self.open(page);self.completed(page)
  self.assertEqual(page.evaluate('window.__introPlays'),[]);self.assertTrue(page.locator('video').first.evaluate('v=>v.paused'));self.assertEqual(page.evaluate('window.__praxisHero.intro.points.length'),0)
  self.assertEqual(page.evaluate('window.__praxisHero.state.drawn'),44)
 def test_04_blocked_autoplay_has_accessible_retry(self):
  page=self.page(viewport={'width':1440,'height':900});page.add_init_script('window.__blockVideo=true');self.open(page);self.completed(page)
  button=page.get_by_role('button',name='Reproduzir vídeo',exact=True);button.wait_for(state='visible');self.assertTrue(page.locator('video').first.evaluate('v=>v.paused'))
  self.assertEqual(page.locator('video').first.evaluate('v=>v.currentTime'),0);page.evaluate('window.__blockVideo=false');button.click();page.wait_for_function('!window.__praxisHero.video.video.paused');button.wait_for(state='hidden');self.assert_gate(page)
 def test_05_destroy_during_formation_and_missing_frames_stay_paused(self):
  page=self.page(viewport={'width':1440,'height':900});self.open(page);page.evaluate('window.__praxisHero.destroy()');page.wait_for_timeout(3500)
  self.assertEqual(page.locator('.praxis-ascii-overlay,.praxis-ascii-sentinel,.praxis-video-layer').count(),0);self.assertEqual(page.evaluate('window.__introPlays'),[])
  page=self.page(viewport={'width':1440,'height':900});page.route('**/frames-hd-line-mask/*.webp',lambda r:r.abort());page.goto(URL,wait_until='domcontentloaded');page.wait_for_timeout(1600)
  self.assertEqual(page.evaluate('window.__introPlays'),[]);self.assertTrue(page.locator('video').first.evaluate('v=>v.paused'));self.assertEqual(page.evaluate('window.__praxisHero.intro.state'),'waiting')
 def test_06_bottom_blur_stays_visible_during_intro_and_scroll(self):
  page=self.page(viewport={'width':1440,'height':900});self.open(page);page.wait_for_function('window.__praxisHero.intro.running')
  page.evaluate("""()=>{window.__blurHidden=[];function check(){const e=document.querySelector('.bottom-progressive-blur');if(e&&getComputedStyle(e).display==='none')window.__blurHidden.push(performance.now());requestAnimationFrame(check)}check()}""")
  self.completed(page);page.mouse.wheel(0,300)
  page.wait_for_function('!window.__praxisHero.trigger.smoother.isScrolling');page.wait_for_timeout(180)
  self.assertEqual(page.evaluate('window.__blurHidden'),[],'Bottom blur must never toggle off during intro or scrolling')
  self.assertEqual(page.locator('.bottom-progressive-blur .blur-layer').count(),8)
  self.assert_gate(page)
 def test_07_monitor_remains_revealed_after_leaving_and_returning(self):
  page=self.page(viewport={'width':1440,'height':900});self.open(page);self.completed(page)
  for progress in [.3,.7,1.0]:
   page.evaluate('(p)=>window.scrollTo({top:window.__praxisHero.trigger.end*p,behavior:"instant"})',progress)
   page.wait_for_function('window.__praxisHero.state.drawn===window.__praxisHero.state.expected')
   self.assertEqual(page.evaluate('window.__praxisHero.surface.canvas.style.opacity'),'1')
  page.evaluate('()=>window.scrollTo({top:window.__praxisHero.trigger.end+innerHeight*2,behavior:"instant"})');page.wait_for_function('window.__praxisHero.intro.state==="waiting"')
  self.assertEqual(page.evaluate('window.__praxisHero.surface.canvas.style.opacity'),'1','Leaving the screen observer must not hide the original monitor')
  page.evaluate('window.scrollTo({top:0,behavior:"instant"})');self.completed(page)
  self.assertEqual(page.evaluate('window.__praxisHero.surface.canvas.style.opacity'),'1');self.assertEqual(page.evaluate('window.__praxisHero.intro.run'),1)
  page.screenshot(path=str(OUT/'scroll-return-monitor-visible.png'));self.assert_gate(page)

if __name__=='__main__':unittest.main(verbosity=2)

"""Run: python -m unittest discover -s tests/hero -p test_browser.py -v
Start Vite on 5186 first, or set HERO_URL. Requires playwright + Chromium.
Screenshots and machine-readable geometry metrics are written to validation/hero-v2.
"""
import os, json, math, unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'validation/hero-v2';OUT.mkdir(parents=True,exist_ok=True)
URL=os.getenv('HERO_URL','http://127.0.0.1:5186')

class HeroBrowser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
    @classmethod
    def tearDownClass(cls):cls.browser.close();cls.p.stop()
    def setUp(self):
        self.context=self.browser.new_context(viewport={'width':1440,'height':900})
        self.page=self.context.new_page();self.errors=[];self.page.on('pageerror',lambda e:self.errors.append(str(e)))
    def tearDown(self):
        self.assertEqual(self.errors,[]);self.context.close()
    def open(self,route='/'):
        self.page.goto(URL+route,wait_until='domcontentloaded');self.page.wait_for_function('window.__praxisHero?.state?.drawn>=0');self.page.wait_for_function('window.__praxisHero.intro.state==="completed"');self.page.evaluate('document.fonts.ready')
    def state(self):return self.page.evaluate('window.__praxisHero.state')
    def scroll(self,p,exact=True):
        self.page.evaluate('(p)=>{let t=window.__praxisHero.trigger;window.scrollTo({top:Math.max(0,t.start+(t.end-t.start)*p),behavior:"instant"})}',p)
        target=math.floor(p*88+.5)
        if exact:self.page.wait_for_function('(i)=>window.__praxisHero.state.drawn===i&&window.__praxisHero.state.expected===i',arg=target)
        else:self.page.wait_for_timeout(80)
        return self.state()
    def assert_projection(self,s):
        h=s['matrix']
        for (x,y),q in zip([(0,0),(1600,0),(1600,900),(0,900)],s['corners']):
            den=h[6]*x+h[7]*y+1
            self.assertLess(math.hypot((h[0]*x+h[1]*y+h[2])/den-q[0],(h[3]*x+h[4]*y+h[5])/den-q[1]),1e-6)
        self.assertLessEqual(s['decoded'],16)
    def test_01_isolated_then_integrated_11_states(self):
        self.open('/hero-preview.html');self.scroll(.5);self.assert_projection(self.state())
        self.open();rows=[]
        for i in range(11):
            s=self.scroll(i/10);self.assert_projection(s);rows.append(s)
            self.page.screenshot(path=str(OUT/f'composite-{i*10:03}.png'))
        (OUT/'scroll-states.json').write_text(json.dumps(rows,indent=2))
        self.assertEqual(self.page.locator('.praxis-frame-canvas').count(),1)
        self.assertEqual(self.page.locator('.praxis-video-layer video').count(),1)
        self.assertEqual(self.page.locator('#heroMonitorContainer,.hero-monitor-fallback').count(),0)
        self.assertEqual(self.page.locator('.praxis-debug').count(),0)
        self.assertTrue(self.page.locator('.hero-bg-layer').evaluate('(e)=>getComputedStyle(e).backgroundImage.includes("section-noise.png")'))
        t=self.state()['pin'];self.page.evaluate('(y)=>window.scrollTo({top:y,behavior:"instant"})',t['end']+300);self.page.wait_for_timeout(150)
        self.assertFalse(self.page.evaluate('window.__praxisHero.trigger.isActive'))
        self.assertLess(self.page.locator('.sec-value-prop').bounding_box()['y'],900)
        self.scroll(0);self.assertEqual(self.state()['drawn'],0)
        gap=self.page.evaluate('()=>{let w=document.querySelector(".site-wrapper"),f=w.lastElementChild;return w.getBoundingClientRect().bottom-f.getBoundingClientRect().bottom}')
        self.assertLessEqual(gap,1,'No inherited whole-page minimum blank region after FAQ')
    def test_02_all_89_reverse_and_fast(self):
        self.open()
        reached=[]
        for i in range(89):
            s=self.scroll(i/88);reached.append(s['drawn']);self.assert_projection(s)
        self.assertEqual(reached,list(range(89)))
        for p in [.8,.6,.4,.2,0]:self.scroll(p)
        self.page.evaluate('()=>{let t=window.__praxisHero.trigger;for(let p of [.9,.1,.8,.2,1])window.scrollTo({top:t.end*p,behavior:"instant"})}')
        self.page.wait_for_function('window.__praxisHero.state.drawn===88')
        self.assertLessEqual(self.state()['decoded'],16)
        self.assertGreaterEqual(self.state()['available'],80)
    def test_03_responsive_resize_orientation_and_dpr(self):
        self.open()
        for w,h in [(1920,1080),(1903,991),(1440,900),(1366,768),(1024,768),(768,1024),(390,844),(375,812),(844,390),(1440,900)]:
            self.page.set_viewport_size({'width':w,'height':h});self.page.wait_for_timeout(180)
            if w>=768:s=self.scroll(.5)
            else:
                self.page.wait_for_function('window.__praxisHero.state.staticMode&&window.__praxisHero.state.drawn===44');s=self.state()
                self.page.evaluate('window.scrollTo({top:0,behavior:"instant"})');self.page.wait_for_timeout(50)
            self.assert_projection(s)
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),w)
            self.assertEqual(self.page.locator('.praxis-hero-viewport').count(),1)
            self.assertEqual(self.page.locator('#inicio .pin-spacer').count(),0 if w<768 else 1)
            self.assertAlmostEqual(self.page.locator('.praxis-hero-viewport').bounding_box()['height'],h,delta=1)
            self.page.screenshot(path=str(OUT/f'responsive-{w}x{h}.png'))
        for dpr in [2,3]:
            ctx=self.browser.new_context(viewport={'width':1024,'height':768},device_scale_factor=dpr);pg=ctx.new_page();pg.goto(URL+'/hero-preview.html');pg.wait_for_function('window.__praxisHero?.state?.drawn>=0');s=pg.evaluate('window.__praxisHero.state');self.assertEqual(s['canvas'],[1024*dpr,768*dpr]);self.assert_projection(s);ctx.close()
    def test_04_failed_frame_and_incomplete_loading(self):
        self.page.route('**/frames-hd-line-mask/db-hero_00044.webp',lambda route:route.abort())
        self.open();s=self.scroll(.5,False)
        self.page.wait_for_function('window.__praxisHero.state.failed.includes(44)')
        s=self.state();self.assertEqual(s['expected'],44);self.assertNotEqual(s['drawn'],44);self.assert_projection(s)
        q=json.loads((ROOT/'public/assets/praxis-hero/screen-corners.json').read_text())['frames'][f"{s['drawn']:05}"]
        for key,actual in zip(['topLeft','topRight','bottomRight','bottomLeft'],s['screenCorners']):
            expected=[q[key][0]*s['scale']+s['offset'][0],q[key][1]*s['scale']+s['offset'][1]]
            self.assertLess(math.dist(expected,actual),1e-6)
        self.page.screenshot(path=str(OUT/'failed-frame-fallback.png'))
        self.scroll(.75)
        # Block most frames on a fresh browser context to verify a real
        # partially loaded sequence rather than an artificially filled cache.
        ctx=self.browser.new_context();pg=ctx.new_page()
        pg.route('**/frames-hd-line-mask/*.webp',lambda r:r.continue_() if r.request.url.endswith('00000.webp') else r.abort())
        pg.goto(URL+'/hero-preview.html');pg.wait_for_function('window.__praxisHero?.state?.drawn===0');pg.evaluate('window.scrollTo({top:500,behavior:"instant"})');pg.wait_for_timeout(200);s=pg.evaluate('window.__praxisHero.state');self.assertEqual(s['drawn'],0);self.assert_projection(s);ctx.close()
    def test_05_reload_cache_disabled_video_reduced_motion(self):
        self.open();cdp=self.context.new_cdp_session(self.page);cdp.send('Network.enable');cdp.send('Network.setCacheDisabled',{'cacheDisabled':True})
        self.scroll(.75);self.page.reload();self.page.wait_for_function('window.__praxisHero?.state?.drawn>=0&&window.__praxisHero.state.drawn===window.__praxisHero.state.expected');self.scroll(.5)
        self.page.wait_for_function('document.querySelector(".praxis-video-layer video").readyState>=2')
        a=self.page.locator('video').first.evaluate('(v)=>v.currentTime');self.page.wait_for_timeout(200);b=self.page.locator('video').first.evaluate('(v)=>v.currentTime');self.assertGreater(b,a)
        attrs=self.page.locator('.praxis-video-layer video').evaluate('(v)=>[v.muted,v.loop,v.playsInline,v.autoplay]');self.assertEqual(attrs,[True,True,True,False])
        self.page.emulate_media(reduced_motion='reduce');self.page.wait_for_function('window.__praxisHero.state.staticMode&&window.__praxisHero.state.drawn===44');self.assertTrue(self.page.locator('.praxis-video-layer video').evaluate('(v)=>v.paused'));self.assertIsNone(self.page.evaluate('window.__praxisHero.trigger'));self.page.evaluate('window.scrollTo({top:0,behavior:"instant"})');self.page.wait_for_timeout(50);self.page.screenshot(path=str(OUT/'reduced-motion.png'))
        self.page.emulate_media(reduced_motion='no-preference');self.page.wait_for_function('window.__praxisHero.trigger!==null');self.scroll(0)
        self.page.wait_for_function('!document.querySelector(".praxis-video-layer video").paused')
    def test_06_debug_slider_and_teardown(self):
        self.open('/hero-preview.html?debug=hero');self.assertEqual(self.page.locator('.praxis-debug').count(),1)
        slider=self.page.get_by_role('slider',name='Quadro manual');slider.fill('77');self.page.wait_for_function('window.__praxisHero.state.drawn===77');self.assertEqual(self.page.evaluate('scrollY'),0)
        self.page.get_by_role('button',name='Retomar scroll').click();self.page.wait_for_function('window.__praxisHero.state.drawn===0')
        self.page.evaluate('window.__praxisHero.destroy()');self.assertEqual(self.page.locator('.praxis-frame-canvas,.praxis-video-layer,.praxis-debug').count(),0)
        self.assertEqual(self.page.locator('.praxis-hero-viewport,.praxis-hero-artboard,.praxis-hero-status').count(),0)
        self.page.evaluate('async()=>{let m=await import("/src/components/PraxisHero/PraxisHero.js");m.initPraxisHero()}')
        self.page.wait_for_function('window.__praxisHero?.state?.drawn===0')
        self.assertEqual(self.page.locator('.praxis-hero-viewport').count(),1)

    def test_07_desk_button_and_reference_scroll_smoothing(self):
        self.open()
        self.assertTrue(self.page.evaluate('!!window.__praxisHero.trigger.smoother'),'Use the same Lenis smoothing as the reference')
        self.assertEqual(self.page.locator('.praxis-video-control').count(),0)
        self.scroll(1)
        sample=self.page.evaluate('''()=>{const h=window.__praxisHero,s=h.state,c=h.surface;return [...c.ctx.getImageData(Math.round((100*s.scale+s.offset[0])*c.dpr),Math.round((700*s.scale+s.offset[1])*c.dpr),1,1).data]}''')
        self.assertEqual(sample[3],255,'Original desk pixels must be present, not transparent')
        bounds=json.loads((ROOT/'public/assets/praxis-hero/desk-bounds.json').read_text())['frames'][88]
        s=self.state();self.assertLessEqual(bounds[0]*s['scale']+s['offset'][0],0);self.assertGreaterEqual(bounds[1]*s['scale']+s['offset'][0],s['viewport'][0])
        self.scroll(0)
        self.page.mouse.wheel(0,600)
        self.page.wait_for_timeout(100);early=self.page.evaluate('scrollY')
        self.assertGreater(early,0);self.assertLess(early,590,'Wheel must progress smoothly rather than jump 600px')
        self.page.wait_for_timeout(1300);late=self.page.evaluate('scrollY');self.assertAlmostEqual(late,600,delta=2)
        self.page.wait_for_function('window.__praxisHero.state.drawn===window.__praxisHero.state.expected')
        s=self.state();self.assertEqual(s['expected'],math.floor(s['progress']*88+.5));self.assert_projection(s)
        self.page.emulate_media(reduced_motion='reduce');self.page.wait_for_function('window.__praxisHero.trigger===null')

    def test_08_video_pixels_meet_inner_bezel(self):
        import base64,io
        from PIL import Image
        self.open();self.scroll(.5);s=self.state()
        buffer=io.BytesIO();Image.new('RGB',(32,18),(255,0,255)).save(buffer,format='PNG')
        poster='data:image/png;base64,'+base64.b64encode(buffer.getvalue()).decode()
        self.page.locator('.praxis-video-layer video').evaluate('(v,p)=>{v.pause();v.poster=p;v.removeAttribute("src");v.load()}',poster)
        self.page.wait_for_timeout(180)
        shot=Image.open(io.BytesIO(self.page.screenshot(path=str(OUT/'video-edge-magenta.png')))).convert('RGB')
        q=s['screenCorners'];samples=[]
        for i,a in enumerate(q):
            b=q[(i+1)%4];dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy);nx,ny=-dy/length,dx/length
            for t in [.25,.5,.75]:
                for distance in [.4,2]:
                    x=a[0]+dx*t+nx*distance*s['scale'];y=a[1]+dy*t+ny*distance*s['scale'];rgb=shot.getpixel((round(x),round(y)))
                    samples.append({'edge':i,'fraction':t,'sourceInset':distance,'pixel':rgb})
                    # The immediate subpixel boundary may contain black bezel
                    # coverage; two source pixels inside must be full video.
                    minimum=150 if distance<1 else 230
                    self.assertGreater(rgb[0],minimum);self.assertGreater(rgb[2],minimum);self.assertLess(rgb[1],60,'No exposed white line at video aperture')
        (OUT/'video-edge-pixels.json').write_text(json.dumps(samples,indent=2))

    def test_09_support_and_cable_gaps_are_transparent_in_all_frames(self):
        from PIL import Image,ImageFilter
        import numpy as np
        for i in range(89):
            rgba=np.array(Image.open(ROOT/f'public/assets/praxis-hero/frames-hd-line-mask/db-hero_{i:05}.webp').convert('RGBA'))
            self.assertEqual(rgba.shape[:2],(1664,2208))
            logo=np.array(Image.open(ROOT/f'public/assets/praxis-hero/masks/support-cutouts_{i:05}.png'))>0
            self.assertGreater(int(logo.sum()),50)
            core=np.array(Image.fromarray(logo.astype('uint8')*255).filter(ImageFilter.MinFilter(5)))>0
            self.assertEqual(int(rgba[1::2,1::2,3][core].max()),0)
        # The large white triangle bounded by stand, cable and tabletop in
        # frame 88 must show Praxis texture, rather than a white polygon.
        rgba=np.array(Image.open(ROOT/'public/assets/praxis-hero/frames-hd-line-mask/db-hero_00088.webp').convert('RGBA'))
        self.assertEqual(int(rgba[594*2+1,660*2+1,3]),0)

    def test_10_metallic_side_is_opaque(self):
        from PIL import Image
        audit=json.loads((OUT/'edge-quality-audit.json').read_text())
        corners=json.loads((ROOT/'public/assets/praxis-hero/screen-corners.json').read_text())['frames']
        for i,frame in enumerate(audit):
            q=corners[f'{i:05}'];vx,vy,x0,y0=frame['line'];y=(q['topLeft'][1]+q['bottomLeft'][1])/2
            left=x0+(y-y0)*vx/vy
            with Image.open(ROOT/f'public/assets/praxis-hero/frames-hd-line-mask/db-hero_{i:05}.webp') as im:
                alpha=im.convert('RGBA').getpixel((int((left+3)*2),int(y*2)))[3]
            self.assertGreaterEqual(alpha,254,f'Frame {i}: photographed bevel must not reveal background text')

    def test_11_no_opaque_background_beside_side_or_bottom_corner(self):
        from PIL import Image,ImageFilter
        import numpy as np
        corners=json.loads((ROOT/'public/assets/praxis-hero/screen-corners.json').read_text())['frames']
        for i in range(89):
            q=corners[f'{i:05}']
            silhouette=Image.open(ROOT/f'public/assets/praxis-hero/masks/silhouette_{i:05}.png').convert('L')
            exterior=Image.eval(silhouette,lambda v:255-v).filter(ImageFilter.MinFilter(5))
            with Image.open(ROOT/f'public/assets/praxis-hero/frames-hd-line-mask/db-hero_{i:05}.webp') as im:
                alpha=im.convert('RGBA').getchannel('A').resize((1104,832),Image.Resampling.BOX)
            x0=int(min(q['topLeft'][0],q['bottomLeft'][0])-35);x1=int(max(q['topLeft'][0],q['bottomLeft'][0])-1)
            y0=int(q['topLeft'][1]-18);y1=int(q['bottomLeft'][1]+18)
            safe=np.array(exterior)[y0:y1,x0:x1]>250
            repair=Image.open(ROOT/f'public/assets/praxis-hero/masks/lower-repair_{i:05}.png').resize((1104,832),Image.Resampling.BOX)
            safe &= np.array(repair)[y0:y1,x0:x1]==0
            values=np.array(alpha)[y0:y1,x0:x1][safe]
            self.assertEqual(int(values.max()),0,f'Frame {i}: original exterior must remain transparent')

    def test_12_lower_mask_preserves_original_png_pixels(self):
        from PIL import Image
        samples=json.loads((OUT/'line-mask-source-samples.json').read_text())
        self.assertEqual(len(samples),267)
        for sample in samples:
            with Image.open(ROOT/f"public/assets/praxis-hero/frames-hd-line-mask/db-hero_{sample['frame']}.webp") as im:
                pixel=im.convert('RGBA').getpixel(tuple(sample['point']))
            self.assertEqual(pixel[3],255,sample)
            self.assertEqual(list(pixel[:3]),sample['rgb'],sample)

    def test_13_accepted_upper_is_unchanged_and_lower_patch_is_local(self):
        from PIL import Image
        import numpy as np,hashlib
        audit=json.loads((OUT/'lower-repair-audit.json').read_text())
        for row in audit:
            key=row['frame'];cut=row['upperCutoff'];x0,y0,x1,y1=row['patch']
            with Image.open(ROOT/f'public/assets/praxis-hero/frames-hd-line-mask/db-hero_{key}.webp') as im:rgba=np.array(im.convert('RGBA'))
            self.assertEqual(hashlib.sha256(rgba[:cut].tobytes()).hexdigest(),row['acceptedUpperSha256'],key)
            changed=np.array(Image.open(ROOT/f'public/assets/praxis-hero/masks/lower-repair_{key}.png'))>0
            self.assertFalse(changed[:cut].any(),key)
            yy,xx=np.where(changed)
            if len(xx):
                self.assertGreaterEqual(int(xx.min()),x0);self.assertLess(int(xx.max()),x1)
                self.assertGreaterEqual(int(yy.min()),y0);self.assertLess(int(yy.max()),y1)

    def test_14_lower_mask_follows_straight_segment(self):
        from PIL import Image
        import numpy as np
        audit=json.loads((OUT/'lower-repair-audit.json').read_text())
        for row in audit:
            key=row['frame'];(sx,sy),(tx,ty)=row['straightMaskEdge']
            with Image.open(ROOT/f'public/assets/praxis-hero/frames-hd-line-mask/db-hero_{key}.webp') as im:
                alpha=im.convert('RGBA').getchannel('A')
                for py in np.linspace(row['nativeLowerStart'],int((ty-2)*2),5).astype(int):
                    yy=(py+.5)/2-.5;edge=sx+(tx-sx)*np.clip((yy-sy)/(ty-sy),0,1)
                    self.assertEqual(alpha.getpixel((int((edge-2)*2),int(py))),0,key)
                    self.assertEqual(alpha.getpixel((int((edge+2)*2),int(py))),255,key)

    def test_15_warmed_wheel_runway_stays_synchronized(self):
        self.open()
        self.page.wait_for_function('window.__praxisHero.loader.decoded.size>=13')
        self.page.wait_for_timeout(1500)
        self.page.evaluate('''()=>{window.__wheelSamples=[];let start;const sample=t=>{start??=t;const h=window.__praxisHero;window.__wheelSamples.push({y:scrollY,expected:h.state.expected,drawn:h.state.drawn,decoded:h.loader.decoded.size});if(t-start<1450)requestAnimationFrame(sample)};requestAnimationFrame(sample)}''')
        self.page.mouse.wheel(0,120);self.page.wait_for_timeout(1600)
        samples=self.page.evaluate('window.__wheelSamples')
        self.assertGreater(len(samples),10)
        self.assertTrue(any(0<s['y']<120 for s in samples))
        self.assertAlmostEqual(samples[-1]['y'],120,delta=1)
        self.assertTrue(all(s['expected']==s['drawn'] for s in samples))
        self.assertTrue(all(s['decoded']<=16 for s in samples))
        self.assert_projection(self.state())

if __name__=='__main__':unittest.main(verbosity=2)



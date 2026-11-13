import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/hero-ascii')
class AsciiDesk(unittest.TestCase):
 def test_complete_desk_sample_and_shared_geometry(self):
  OUT.mkdir(parents=True,exist_ok=True)
  with sync_playwright() as p:
   browser=p.chromium.launch()
   for width,height in [(1440,900),(390,844)]:
    with self.subTest(width=width):
     page=browser.new_page(viewport={'width':width,'height':height})
     page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded');page.wait_for_function('window.__praxisHero?.intro?.scene')
     result=page.evaluate("""()=>{const h=window.__praxisHero,i=h.intro;i.prepare();const image=i.scene.image,c=document.createElement('canvas');c.width=552;c.height=416;const x=c.getContext('2d');x.drawImage(image,0,0,552,416);const data=x.getImageData(0,0,552,416).data,corners=i.scene.sourceCorners;let desk=832;for(let y=Math.ceil((Math.max(corners.bottomLeft[1],corners.bottomRight[1])+12)/2);y<416;y++){let occupied=0;for(let px=0;px<552;px+=4)if(data[(y*552+px)*4+3]>180)occupied++;if(occupied/138>.8){desk=y*2;break;}}const deskPoints=i.points.filter(p=>p.y>desk+5);return {desk,points:i.points.length,deskPoints:deskPoints.length,left:deskPoints.filter(p=>p.x<400).length,right:deskPoints.filter(p=>p.x>700).length,monitor:i.points.filter(p=>p.y<desk).length};}""")
     self.assertLess(result['desk'],832)
     self.assertGreater(result['deskPoints'],50,result)
     self.assertGreater(result['left'],10);self.assertGreater(result['right'],10);self.assertGreater(result['monitor'],100)
     self.assertLessEqual(result['points'],1800 if width<600 else 6000)
     page.evaluate("""()=>{const i=window.__praxisHero.intro;i.cancelFrames();i.setState('ascii-resolving');i.present(0);i.canvas.hidden=false;i.progress=.68;i.drawStep=1;i.draw(.68)}""")
     self.assertTrue(page.locator('video').first.evaluate('v=>v.paused'))
     page.screenshot(path=str(OUT/f'monitor-e-mesa-ascii-{width}.png'));page.close()
   browser.close()
if __name__=='__main__':unittest.main()

import unittest
from playwright.sync_api import sync_playwright

URL='http://127.0.0.1:5173/'
SWIPE="""([a,z])=>{
 let prevented=false;
 for(const [type,y,done] of [['touchstart',a,false],['touchmove',z,false],['touchend',z,true]]){
  const e=new Event(type,{bubbles:true,cancelable:true});
  Object.defineProperty(e,'touches',{value:done?[]:[{clientX:200,clientY:y}]});
  document.body.dispatchEvent(e);if(type==='touchmove')prevented=e.defaultPrevented;
 }
 return prevented;
}"""

class FooterMobile(unittest.TestCase):
 def test_touch_reveal_return_and_tall_footer(self):
  with sync_playwright() as p:
   for name in ['chromium','webkit']:
    with self.subTest(browser=name):
     browser=getattr(p,name).launch();page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
     errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
     page.goto(URL,wait_until='domcontentloaded');page.wait_for_function('document.documentElement.dataset.praxisReady');page.evaluate('document.fonts.ready');page.wait_for_timeout(350)
     def approach():
      page.evaluate("()=>{const f=document.querySelector('.site-footer');scrollTo({top:f.getBoundingClientRect().top+scrollY-innerHeight-30,behavior:'instant'})}")
      page.wait_for_timeout(100)
     approach();self.assertTrue(page.evaluate(SWIPE,[600,570]));page.wait_for_timeout(700)
     footer=page.locator('.site-footer').bounding_box();header=page.locator('#siteHeader').bounding_box()
     self.assertAlmostEqual(footer['y'],header['height'],delta=3)
     self.assertAlmostEqual(footer['y']+footer['height'],844,delta=3)
     self.assertTrue(page.evaluate(SWIPE,[400,430]));page.wait_for_timeout(700)
     self.assertGreaterEqual(page.locator('.site-footer').bounding_box()['y'],844)
     page.set_viewport_size({'width':320,'height':568});page.wait_for_timeout(200)
     approach();self.assertTrue(page.evaluate(SWIPE,[500,470]));page.wait_for_timeout(700)
     self.assertAlmostEqual(page.locator('.site-footer').bounding_box()['y'],page.locator('#siteHeader').bounding_box()['height'],delta=3)
     page.evaluate('scrollTo({top:scrollY+80,behavior:"instant"})');page.wait_for_timeout(150)
     self.assertFalse(page.evaluate(SWIPE,[300,330]))
     page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(200)
     self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
     self.assertEqual(errors,[]);browser.close()

if __name__=='__main__':unittest.main()

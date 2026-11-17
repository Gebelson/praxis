import unittest
from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:5173/'
SWIPE = """([start,end])=>{
  for(const [type,y,done] of [['touchstart',start,false],['touchmove',end,false],['touchend',end,true]]){
    const event=new Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(event,'touches',{value:done?[]:[{clientX:200,clientY:y}]});
    document.body.dispatchEvent(event);
  }
}"""

class MobileProcessSnap(unittest.TestCase):
    def test_short_swipes_and_cached_geometry(self):
        with sync_playwright() as playwright:
            for name in ['chromium','webkit']:
                with self.subTest(browser=name):
                    browser=getattr(playwright,name).launch()
                    page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
                    page.goto(URL,wait_until='domcontentloaded')
                    page.wait_for_function('window.PraxisProcessSection')
                    page.wait_for_timeout(650)
                    page.evaluate('()=>scrollTo({top:window.PraxisProcessSection.getState().snapTargets[1],behavior:"instant"})')
                    page.wait_for_timeout(200)
                    page.evaluate("""()=>{
                      window.processRectReads=0;
                      const read=Element.prototype.getBoundingClientRect;
                      Element.prototype.getBoundingClientRect=function(){
                        if(this.closest('.sec-process'))window.processRectReads++;
                        return read.call(this);
                      };
                    }""")
                    page.evaluate(SWIPE,[600,580])
                    page.wait_for_timeout(650)
                    self.assertEqual(page.evaluate('window.PraxisProcessSection.getActiveStep()'),2)
                    self.assertLess(page.evaluate('window.processRectReads'),150)
                    page.evaluate(SWIPE,[580,600])
                    page.wait_for_timeout(600)
                    self.assertEqual(page.evaluate('window.PraxisProcessSection.getActiveStep()'),1)
                    anchor=page.locator('.process-sticky-box').bounding_box()['y']
                    page.set_viewport_size({'width':390,'height':920})
                    page.wait_for_timeout(200)
                    self.assertAlmostEqual(page.locator('.process-sticky-box').bounding_box()['y'],anchor,delta=2)
                    browser.close()

if __name__=='__main__':
    unittest.main()

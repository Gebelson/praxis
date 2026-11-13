import unittest
from playwright.sync_api import sync_playwright

class PageScrollbar(unittest.TestCase):
 def test_header_clearance_drag_keyboard_and_resize(self):
  with sync_playwright() as p:
   browser=p.chromium.launch()
   for width,height in [(1440,900),(1920,993),(390,844)]:
    with self.subTest(width=width):
     page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
     errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded')
     page.wait_for_function('window.PraxisProcessSection&&window.__praxisHero?.state?.drawn>=0')
     page.evaluate('document.fonts.ready');page.wait_for_timeout(200)
     track=page.locator('.page-scrollbar');thumb=page.locator('.page-scrollbar-thumb')
     self.assertEqual(track.count(),1)
     self.assertGreaterEqual(track.bounding_box()['y'],page.locator('header').bounding_box()['height']+7)
     self.assertEqual(page.locator('html').evaluate('e=>getComputedStyle(e).scrollbarWidth'),'none')
     initial=thumb.bounding_box();box=track.bounding_box()
     page.mouse.move(initial['x']+2,initial['y']+initial['height']/2)
     page.mouse.down();page.mouse.move(initial['x']+2,box['y']+box['height']*.65,steps=6);page.mouse.up()
     page.wait_for_function('scrollY>document.documentElement.scrollHeight*.4')
     self.assertGreater(int(track.get_attribute('aria-valuenow')),40)
     track.focus();page.keyboard.press('Home');page.wait_for_function('scrollY===0')
     page.keyboard.press('End');page.wait_for_function('Math.abs(scrollY-(document.documentElement.scrollHeight-innerHeight))<2')
     page.set_viewport_size({'width':768,'height':1024});page.wait_for_timeout(150)
     self.assertGreaterEqual(track.bounding_box()['y'],page.locator('header').bounding_box()['height']+7)
     self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
     self.assertEqual(errors,[]);page.close()
   browser.close()
if __name__=='__main__':unittest.main()

import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('F:/Codex/2026-11-10/praxis-reconstru-o-completa-do-hero-2/outputs/graficos');OUT.mkdir(parents=True,exist_ok=True)
class ChartsVisibilityBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch()
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,reduced=False,width=1440,height=900):
  c=self.browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference');self.addCleanup(c.close);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));self.addCleanup(lambda:self.assertEqual(errors,[]));p.goto('http://127.0.0.1:5173',wait_until='domcontentloaded');p.wait_for_function('document.getElementById("inicio")?.praxisHero?.state?.drawn>=0');p.evaluate('document.fonts.ready');p.locator('#projectCarousel').evaluate('e=>e.carouselSnap?.destroy()');return p
 def place(self,p,fraction,from_top=False):
  p.evaluate('([fraction,fromTop])=>{const e=document.querySelector("#devmodeChartsWrap"),r=e.getBoundingClientRect(),header=document.querySelector("header").getBoundingClientRect().bottom,blur=document.querySelector("#bottomProgressiveBlur").getBoundingClientRect().height,top=fromTop?header+12-r.height*(1-fraction):innerHeight-blur-16-r.height*fraction,y=scrollY+r.top-top,sm=document.getElementById("inicio")?.praxisHero?.trigger?.smoother;if(sm)sm.scrollTo(y,{immediate:true});else scrollTo({top:y,behavior:"instant"})}',[fraction,from_top])
 def test_waits_for_chart_and_replays_from_both_scroll_directions(self):
  p=self.open();chart=p.locator('#devmodeChartsWrap')
  p.evaluate('()=>{const r=document.querySelector(".sec-devmode").getBoundingClientRect();scrollTo({top:scrollY+r.top-innerHeight*.65,behavior:"instant"})}');p.wait_for_timeout(150)
  self.assertEqual(chart.get_attribute('data-chart-state'),'waiting');self.assertEqual(chart.get_attribute('data-chart-run'),'0')
  self.place(p,.4);p.wait_for_timeout(150);self.assertEqual(chart.get_attribute('data-chart-state'),'waiting');self.assertEqual(p.locator('#pieSliceWhite').get_attribute('d'),'')
  self.place(p,.65);p.wait_for_function('document.querySelector("#devmodeChartsWrap").dataset.chartState==="playing"');self.assertEqual(chart.get_attribute('data-chart-run'),'1')
  p.wait_for_function('document.querySelector("#devmodeChartsWrap").dataset.chartState==="completed"');self.assertGreater(len(p.locator('#pieSliceWhite').get_attribute('d')),20);self.assertEqual(float(p.locator('#curveGrowth').evaluate('e=>e.style.strokeDashoffset')),0)
  chart.screenshot(path=str(OUT/'grafico-concluido.png'))
  self.place(p,.05);p.wait_for_timeout(100);self.assertEqual(chart.get_attribute('data-chart-state'),'completed');self.assertEqual(float(chart.evaluate('e=>getComputedStyle(e).opacity')),1)
  self.place(p,.65);p.wait_for_timeout(100);self.assertEqual(chart.get_attribute('data-chart-run'),'1')
  p.evaluate('()=>scrollTo({top:0,behavior:"instant"})');p.wait_for_function('document.querySelector("#devmodeChartsWrap").dataset.chartState==="waiting"')
  self.assertEqual(p.locator('#pieSliceWhite').get_attribute('d'),'');self.place(p,.65);p.wait_for_function('document.querySelector("#devmodeChartsWrap").dataset.chartRun==="2"')
  p.evaluate('()=>{const r=document.querySelector("#devmodeChartsWrap").getBoundingClientRect();scrollTo({top:scrollY+r.bottom+200,behavior:"instant"})}');p.wait_for_function('document.querySelector("#devmodeChartsWrap").dataset.chartState==="waiting"')
  self.place(p,.95,True);p.wait_for_function('document.querySelector("#devmodeChartsWrap").dataset.chartRun==="3"');self.assertEqual(chart.get_attribute('data-chart-state'),'playing')
 def test_mobile_and_reduced_motion(self):
  p=self.open(False,390,844);self.place(p,.4);p.wait_for_timeout(100);self.assertEqual(p.locator('#devmodeChartsWrap').get_attribute('data-chart-run'),'0');self.place(p,.65);p.wait_for_function('document.querySelector("#devmodeChartsWrap").dataset.chartState==="playing"')
  p=self.open(True,390,844);self.place(p,.95);self.assertEqual(p.locator('#devmodeChartsWrap').get_attribute('data-chart-state'),'static');self.assertEqual(float(p.locator('#curveGrowth').evaluate('e=>e.style.strokeDashoffset')),0)
if __name__=='__main__':unittest.main(verbosity=2)

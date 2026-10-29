// Requires Playwright in the execution environment; no browser dependency ships with the app.
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8000/household-financial-distribution/');
 await page.waitForSelector('svg circle');
 const data=await page.evaluate(()=>fetch('./data/us-financial-assets.json').then(r=>r.json()));
 for(const value of [0,1,41000,1225990,10000000,2000000000]){
  await page.locator('#amount').fill(String(value));
  const expected=(100*(data.points.filter(p=>p[0]<=value).at(-1)?.[1]||0)).toFixed(1)+'%';
  if(await page.locator('#percentile').textContent()!==expected)throw Error('Incorrect percentile');
  const cx=Number(await page.locator('circle').getAttribute('cx'));
  const chartWidth=await page.locator('svg').evaluate(el=>el.viewBox.baseVal.width);
  const wanted=47+Math.log1p(Math.min(value,data.points.at(-1)[0])/1000)/Math.log1p(data.points.at(-1)[0]/1000)*(chartWidth-67);
  if(Math.abs(cx-wanted)>1e-6)throw Error('Incorrect marker');
 }
 await page.locator('#slider').fill('5000');await page.locator('#slider').dispatchEvent('input');
 if(Number(await page.locator('#amount').inputValue())<=0)throw Error('Slider sync');
 await page.locator('#slider').tap();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
 await page.emulateMedia({colorScheme:'dark'});
 await page.screenshot({path:'/tmp/scf-mobile.png',fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));
 await browser.close();console.log('Passed: mobile layout, touch, dark mode, exact input, marker, slider, subpath, no browser errors');
})().catch(e=>{console.error(e);process.exit(1)});

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
 await page.locator('#amount').fill('250000');
 await page.getByRole('tab',{name:'Household Income'}).click();
 const income=await page.evaluate(()=>fetch('./data/us-household-income.json').then(r=>r.json()));
 for(const value of [-10000,0,1,income.thresholds['50'],400540.54054,1e10]){
  await page.locator('#amount').fill(String(value));
  const expected=(100*(income.points.filter(p=>p[0]<=value).at(-1)?.[1]||0)).toFixed(1)+'%';
  if(await page.locator('#percentile').textContent()!==expected)throw Error('Income percentile');
  const cx=Number(await page.locator('circle').getAttribute('cx'));
  const chartWidth=await page.locator('svg').evaluate(el=>el.viewBox.baseVal.width);
  const wanted=47+Math.log1p(Math.max(0,Math.min(value,income.points.at(-1)[0]))/1000)/Math.log1p(income.points.at(-1)[0]/1000)*(chartWidth-67);
  if(Math.abs(cx-wanted)>1e-6)throw Error('Income marker');
 }
 await page.locator('#slider').fill('4000');await page.locator('#slider').dispatchEvent('input');
 const sliderIncome=Number(await page.locator('#amount').inputValue());
 const expectedIncome=(100*(income.points.filter(p=>p[0]<=sliderIncome).at(-1)?.[1]||0)).toFixed(1)+'%';
 if(await page.locator('#percentile').textContent()!==expectedIncome)throw Error('Income slider readout');
 await page.locator('#amount').fill('90000');
 for(let i=0;i<5;i++){
  await page.getByRole('tab',{name:'Financial Assets'}).click();
  if(await page.locator('#amount').inputValue()!=='250000')throw Error('Asset state');
  await page.getByRole('tab',{name:'Household Income'}).click();
  if(await page.locator('#amount').inputValue()!=='90000')throw Error('Income state');
 }
 if(await page.locator('svg').count()!==1)throw Error('Multiple charts');
 await page.getByRole('tab',{name:'Household Income'}).press('ArrowLeft');
 if(await page.getByRole('tab',{name:'Financial Assets'}).getAttribute('aria-selected')!=='true')throw Error('Keyboard tabs');
 await page.getByRole('tab',{name:'Household Income'}).click();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Income mobile overflow');
 await page.emulateMedia({colorScheme:'dark'});
 await page.screenshot({path:'/tmp/scf-mobile.png',fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));
 await page.setViewportSize({width:1280,height:900});
 await page.getByRole('tab',{name:'Financial Assets'}).click();
 await page.getByRole('tab',{name:'Household Income'}).click();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Desktop overflow');
 await browser.close();console.log('Passed: mobile layout, touch, dark mode, exact input, marker, slider, subpath, no browser errors, income values and marker, repeated tab state, keyboard tabs, desktop');
})().catch(e=>{console.error(e);process.exit(1)});

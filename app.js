import {mountDistribution} from './distribution.js';
const byId=id=>document.getElementById(id);
const tabs=[byId('tab-assets'),byId('tab-income')];
const values=[50000,75000];
let active=0,chart;
try {
  const datasets=await Promise.all(['us-financial-assets','us-household-income'].map(async name=>{
    const response=await fetch(new URL(`./data/${name}.json`,import.meta.url));
    if(!response.ok)throw new Error(`Data request failed: ${response.status}`);
    return response.json();
  }));
  function select(index){
    if(chart){const value=Number(byId('amount').value);if(byId('amount').value!=='' && Number.isFinite(value) && (active===1 || value>=0))values[active]=value;chart.destroy();}
    active=index;
    const data=datasets[index], income=index===1;
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});
    byId('explorer').setAttribute('aria-labelledby',tabs[index].id);
    byId('explorer').setAttribute('aria-label',data.title);
    byId('heading').textContent=income?'Where does your household income fall?':'Where do your financial assets fall?';
    byId('subtitle').textContent=income?'Explore annual U.S. household income. Calendar year 2024, expressed in 2025 dollars.':'Explore the distribution of U.S. household financial assets.';
    byId('amount-label').textContent=income?'Annual household income · USD':'Household financial assets · USD';
    byId('slider').setAttribute('aria-label',income?'Select annual household income':'Select household financial assets');
    byId('input-help').textContent=income?'Total annual household income before taxes, including the SCF’s specified retirement-account withdrawals. Enter a negative value with a minus sign.':'Include financial accounts and retirement assets. Exclude your home, vehicles and other nonfinancial assets.';
    byId('percentile-note').textContent=`The percentile is the share of households with ${income?'annual income':'financial assets'} at or below your amount. Households with the same value share the same percentile.`;
    byId('measure-note').textContent=income?data.definition:'These are gross financial assets: debts are not subtracted. This is a household comparison, not an individual comparison.';
    byId('method-note').textContent='All five SCF implicates are combined with the official survey weights. The curve is a weighted empirical cumulative distribution: it steps at observed values, without interpolation. The horizontal axis uses sign(value) × log(1 + |value| / $1,000), supporting negative values and compressing the upper tail.';
    byId('amount').value=String(values[index]);
    byId('amount').inputMode=income?'text':'decimal';
    chart=mountDistribution(byId('chart'),data,{amount:byId('amount'),slider:byId('slider'),readout:byId('percentile'),explanation:byId('explanation'),status:byId('status')});
    const link=document.createElement('a');link.href=data.source.url;link.textContent=`Federal Reserve · ${data.surveyYear} Survey of Consumer Finances`;
    byId('source').replaceChildren('Source: ',link,`. ${data.units}${income?'; income reference year 2024':''}; ${data.households.toLocaleString()} surveyed households, five implicates each.`);
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>select(index));
    tab.addEventListener('keydown',event=>{
      let next;
      if(['ArrowLeft','ArrowRight'].includes(event.key))next=1-index;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=1;
      if(next!==undefined){event.preventDefault();select(next);tabs[next].focus();}
    });
  });
  select(0);
} catch(error){byId('percentile').textContent='Data unavailable';byId('explanation').textContent='Please reload to retry loading the survey data.';console.error(error);}

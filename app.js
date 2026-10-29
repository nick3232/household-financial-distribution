import {mountDistribution} from './distribution.js';
const byId=id=>document.getElementById(id);
try {
  const response=await fetch(new URL('./data/us-financial-assets.json',import.meta.url));
  if(!response.ok)throw new Error(`Data request failed: ${response.status}`);
  const data=await response.json();
  mountDistribution(byId('chart'),data,{amount:byId('amount'),slider:byId('slider'),readout:byId('percentile'),explanation:byId('explanation'),status:byId('status')});
  const link=document.createElement('a');link.href=data.source.url;link.textContent=`Federal Reserve · ${data.surveyYear} Survey of Consumer Finances`;
  byId('source').append('Source: ',link,`. ${data.units}; ${data.households.toLocaleString()} surveyed households, five implicates each.`);
} catch(error){byId('percentile').textContent='Data unavailable';byId('explanation').textContent='Please reload to retry loading the survey data.';console.error(error);}

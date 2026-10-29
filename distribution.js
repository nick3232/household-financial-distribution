export function cumulative(points, value) {
  let lo=0, hi=points.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(points[mid][0]<=value)lo=mid+1;else hi=mid;}
  return lo ? points[lo-1][1] : 0;
}
export const transform = value => Math.log1p(Math.max(0,value)/1000);
export const inverse = value => 1000*Math.expm1(value);
export const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
export function mountDistribution(container, data, controls) {
  const {amount,slider,readout,explanation,status}=controls;
  const points=data.points, max=points.at(-1)[0], scale=transform(max);
  const W=Math.max(320,Math.min(720,container.clientWidth)),H=320,L=47,R=20,T=24,B=65, width=W-L-R,height=H-T-B;
  const x=v=>L+transform(v)/scale*width,y=p=>T+(1-p)*height;
  const ticks=(W<500?[0,100000,1000000000]:[0,1000,100000,10000000,1000000000]).filter(v=>v<=max);
  const compact=v=>v===0?'$0':v>=1e9?'$1B':v>=1e6?`$${v/1e6}M`:v>=1000?`$${v/1000}k`:`$${v}`;
  let path=`M${L},${y(0)}`;
  for(const [v,p] of points)path+=`H${x(v).toFixed(3)}V${y(p).toFixed(3)}`;
  container.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weighted cumulative distribution of household financial assets"><title>Percentage of households at or below each financial asset balance</title>${[0,.25,.5,.75,1].map(p=>`<line class="grid" x1="${L}" x2="${W-R}" y1="${y(p)}" y2="${y(p)}"/><text x="${L-9}" y="${y(p)+4}" text-anchor="end">${p*100}%</text>`).join('')}${ticks.map(v=>`<text x="${x(v)}" y="${H-B+24}" text-anchor="middle">${compact(v)}</text>`).join('')}<text x="${L}" y="12">Households at or below</text><text x="${L+width/2}" y="${H-8}" text-anchor="middle">Assets · ${data.surveyYear} USD · nonlinear scale</text><path class="curve" d="${path}"/><line class="reference"/><circle r="6"/></svg>`;
  const line=container.querySelector('.reference'), marker=container.querySelector('circle');
  function update(value, fromInput=false){
    if(!Number.isFinite(value)||value<0){status.textContent='Enter a nonnegative dollar amount.';return;}
    const p=cumulative(points,value), px=x(Math.min(value,max)),py=y(p);
    if(!fromInput)amount.value=String(Math.round(value*100)/100);
    slider.value=String(transform(Math.min(value,max))/scale*10000);
    slider.setAttribute('aria-valuetext',money(value));
    readout.textContent=`${(p*100).toFixed(1)}%`;
    explanation.textContent=`of U.S. households have ${money(value)} or less`;
    status.textContent=value>max?'Above the largest observed balance; 100% of sampled weighted observations are at or below this amount.':'';
    for(const [k,v] of Object.entries({x1:px,x2:px,y1:T,y2:H-B}))line.setAttribute(k,v);
    marker.setAttribute('cx',px);marker.setAttribute('cy',py);
  }
  amount.addEventListener('input',()=>update(amount.value===''?NaN:Number(amount.value),true));
  slider.addEventListener('input',()=>update(Math.round(inverse(Number(slider.value)/10000*scale))));
  update(Number(amount.value));
  return {update};
}

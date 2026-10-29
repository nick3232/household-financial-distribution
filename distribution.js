export function cumulative(points, value) {
  let lo=0, hi=points.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(points[mid][0]<=value)lo=mid+1;else hi=mid;}
  return lo ? points[lo-1][1] : 0;
}
export const transform = value => Math.sign(value)*Math.log1p(Math.abs(value)/1000);
export const inverse = value => Math.sign(value)*1000*Math.expm1(Math.abs(value));
export const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
export function mountDistribution(container, data, controls) {
  const {amount,slider,readout,explanation,status}=controls;
  const points=data.points, min=Math.min(0,points[0][0]), max=points.at(-1)[0], start=transform(min), scale=transform(max)-start;
  const clamp=value=>Math.max(min,Math.min(value,max));
  if(data.variable === "INCOME")amount.removeAttribute("min");else amount.min="0";
  const W=Math.max(320,Math.min(720,container.clientWidth)),H=320,L=47,R=20,T=24,B=65, width=W-L-R,height=H-T-B;
  const x=v=>L+(transform(v)-start)/scale*width,y=p=>T+(1-p)*height;
  const ticks=data.variable === "INCOME" ? [...(min<0?[min]:[]),0,10000,100000,1000000,100000000].filter(v=>v<=max && (W>=500 || ![10000,1000000].includes(v))) : (W<500?[0,100000,1000000000]:[0,1000,100000,10000000,1000000000]).filter(v=>v<=max);
  const compact=v=>v===0?'$0':v>=1e9?'$1B':v>=1e6?`$${v/1e6}M`:v>=1000?`$${v/1000}k`:`$${v}`;
  let path=`M${L},${y(0)}`;
  for(const [v,p] of points)path+=`H${x(v).toFixed(3)}V${y(p).toFixed(3)}`;
  container.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weighted cumulative distribution of ${data.title}"><title>Percentage of households at or below each selected amount</title>${[0,.25,.5,.75,1].map(p=>`<line class="grid" x1="${L}" x2="${W-R}" y1="${y(p)}" y2="${y(p)}"/><text x="${L-9}" y="${y(p)+4}" text-anchor="end">${p*100}%</text>`).join('')}${ticks.map(v=>`<text x="${x(v)}" y="${H-B+24}" text-anchor="middle">${compact(v)}</text>`).join('')}<text x="${L}" y="12">Households at or below</text><text x="${L+width/2}" y="${H-8}" text-anchor="middle">${data.variable === "INCOME" ? "Annual income" : "Assets"} · ${data.surveyYear} USD · nonlinear scale</text><path class="curve" d="${path}"/><line class="reference"/><circle r="6"/></svg>`;
  const line=container.querySelector('.reference'), marker=container.querySelector('circle');
  function update(value, fromInput=false){
    if(!Number.isFinite(value)||(data.variable !== "INCOME" && value<0)){status.textContent='Enter a valid dollar amount.';return;}
    const p=cumulative(points,value), px=x(clamp(value)),py=y(p);
    if(!fromInput)amount.value=String(Math.round(value*100)/100);
    slider.value=String((transform(clamp(value))-start)/scale*10000);
    slider.setAttribute('aria-valuetext',money(value));
    readout.textContent=`${(p*100).toFixed(1)}%`;
    explanation.textContent=`of U.S. households have ${money(value)} or less`;
    status.textContent=value<min?'Below the smallest observed value; 0% of weighted observations are at or below this amount.':value>max?'Above the largest observed balance; 100% of sampled weighted observations are at or below this amount.':'';
    for(const [k,v] of Object.entries({x1:px,x2:px,y1:T,y2:H-B}))line.setAttribute(k,v);
    marker.setAttribute('cx',px);marker.setAttribute('cy',py);
  }
  const onAmount=()=>update(amount.value===''?NaN:Number(amount.value),true);
  const onSlider=()=>update(Math.round(inverse(start+Number(slider.value)/10000*scale)));
  amount.addEventListener('input',onAmount);
  slider.addEventListener('input',onSlider);
  update(Number(amount.value));
  return {update,destroy(){amount.removeEventListener('input',onAmount);slider.removeEventListener('input',onSlider);}};
}

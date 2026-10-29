import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cumulative,transform,inverse} from '../distribution.js';
const d=JSON.parse(fs.readFileSync(new URL('../data/us-financial-assets.json',import.meta.url)));
assert.equal(cumulative([[0,.2],[10,.6],[100,1]],0),.2);
assert.equal(cumulative([[0,.2],[10,.6],[100,1]],5),.2);
assert.equal(cumulative(d.points,-1),0);
assert.equal(cumulative(d.points,Infinity),1);
for(let i=1;i<d.points.length;i++){assert(d.points[i][0]>d.points[i-1][0]);assert(d.points[i][1]>=d.points[i-1][1]);}
for(const [p,v] of Object.entries(d.thresholds)){assert(cumulative(d.points,v)>=p/100);assert(cumulative(d.points,v-.01)<p/100);}
for(const v of [0,1,100,41000,1e7,1e9])assert(Math.abs(inverse(transform(v))-v)<Math.max(1e-8,v*1e-12));
console.log('Passed: ties, gaps, boundaries, monotonicity, quantiles, scale roundtrip');
const income=JSON.parse(fs.readFileSync(new URL('../data/us-household-income.json',import.meta.url)));
for(const [p,v] of Object.entries(income.thresholds)){assert(cumulative(income.points,v)>=p/100);assert(cumulative(income.points,v-.01)<p/100);}
assert.equal(cumulative(income.points,-1),0);
assert(cumulative(income.points,0)>0);
assert.equal(cumulative([[-100,.1],[0,.3],[100,1]],-50),.1);
assert.equal(cumulative([[-100,.1],[0,.3],[100,1]],0),.3);
for(let i=1;i<income.points.length;i++){assert(income.points[i][0]>income.points[i-1][0]);assert(income.points[i][1]>=income.points[i-1][1]);}
for(const v of [-1e9,-1000,-1,0,1,1000,1e9])assert(Math.abs(inverse(transform(v))-v)<Math.max(1e-8,Math.abs(v)*1e-12));
console.log('Passed: income quantiles, monotonicity, negative/zero ties and signed scale');

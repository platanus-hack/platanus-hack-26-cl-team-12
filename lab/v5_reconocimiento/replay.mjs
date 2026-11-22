// Reproduce las corridas guardadas (data/reco/runs) sin cámara, con los mismos algoritmos de index.html, para ajustar parámetros.
// Uso: node lab/v5_reconocimiento/replay.mjs [--sens 0.55] [--dedupe 1500] [--cool 500] [--mov 0.006] [--verbose]
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),RECO=path.join(HERE,'../../data/reco');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:(process.argv[i+1]===undefined||process.argv[i+1].startsWith('--')?true:+process.argv[i+1])};
const CTX=arg('ctx',0),SENS=arg('sens',0.55),DEDUPE=arg('dedupe',0),COOL=arg('cool',500),MOV=arg('mov',0.006),MARGIN=arg('margin',0.85),V=process.argv.includes('--verbose'),FPS=30;
const MIN_FR=6,N_T=24,WIN=100,EVAL_EVERY=3,END_MS=600;
const FR={P1:'HOLA AMBULANCIA NECESITAR HIJO-A CAER-PERSONA CODO HUESO ROMPER',P2:'SI HIJO-A DESPERTAR-SE PERO BRAZO APOYAR NO-PODER CODO HINCHADO-A',P3:'SANGRE POCO-A PERO MANO BIEN URGENTE NECESITAR HOSPITAL IR'};
const DEMO=new Set(Object.values(FR).join(' ').split(' '));
const dist=(a,b)=>{let s=0;for(let k=0;k<a.length;k++){const x=a[k]-b[k];s+=x*x}return Math.sqrt(s)};
function resample(S,n){const o=[];for(let i=0;i<n;i++){const t=i*(S.length-1)/(n-1),a=Math.floor(t),b=Math.min(a+1,S.length-1),u=t-a;o.push(S[a].map((x,k)=>x*(1-u)+S[b][k]*u))}return o}
function subDtw(T,B){const n=T.length,m=B.length;let pc=new Float64Array(m+1),pl=new Float64Array(m+1);
 for(let i=1;i<=n;i++){const cc=new Float64Array(m+1).fill(1e9),cl=new Float64Array(m+1);
  for(let j=1;j<=m;j++){const d=dist(T[i-1],B[j-1]);let bc,bl;if(i===1){bc=0;bl=0}else{bc=pc[j-1];bl=pl[j-1]}
   if(i>1&&pc[j]<bc){bc=pc[j];bl=pl[j]}if(cc[j-1]<bc){bc=cc[j-1];bl=cl[j-1]}cc[j]=d+bc;cl[j]=bl+1}pc=cc;pl=cl}return pc[m]/pl[m]}
const hasHand=f=>{for(let i=8;i<48;i++)if(f[i]!==0)return true;for(let i=50;i<90;i++)if(f[i]!==0)return true;return false};
const samples=fs.readdirSync(RECO).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(RECO,f)))).filter(s=>DEMO.has(s.label)&&(!process.argv.includes('--sin-nuevas')||s.src)).map(s=>{const fr=s.frames.filter(hasHand);return fr.length<MIN_FR?null:{label:s.label,frames:fr,T:resample(fr,N_T)}}).filter(Boolean);
const thr={};for(const l of new Set(samples.map(s=>s.label))){const S=samples.filter(s=>s.label===l),O=samples.filter(s=>s.label!==l),step=Math.max(1,Math.floor(O.length/25)),picks=O.filter((_,i)=>i%step===0).slice(0,25);let c=0,n=0;
 for(const t of S.slice(0,3))for(const o of picks){c+=subDtw(t.T,o.frames.slice(-WIN));n++}thr[l]=n?c/n:1}
const motion=B=>{const n=Math.min(8,B.length-1);if(n<3)return 0;let t=0;for(let k=B.length-n;k<B.length;k++)for(const i of [4,5,6,7])t+=Math.abs(B[k][i]-B[k-1][i]);return t/(n*4)};
function align(E,D){const n=E.length,m=D.length,C=Array.from({length:n+1},()=>new Array(m+1).fill(0));for(let i=0;i<=n;i++)C[i][0]=i;for(let j=0;j<=m;j++)C[0][j]=j;
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)C[i][j]=Math.min(C[i-1][j]+1,C[i][j-1]+1,C[i-1][j-1]+(E[i-1]===D[j-1]?0:1));
 const ops=[];let i=n,j=m;while(i>0||j>0){if(i>0&&j>0&&C[i][j]===C[i-1][j-1]+(E[i-1]===D[j-1]?0:1)){ops.push(E[i-1]===D[j-1]?'ok '+E[i-1]:'sub '+E[i-1]+'→'+D[j-1]);i--;j--}else if(i>0&&C[i][j]===C[i-1][j]+1){ops.push('del '+E[i-1]);i--}else{ops.push('ins '+D[j-1]);j--}}return ops.reverse()}
const FSETS=Object.fromEntries(Object.entries(FR).map(([k,v])=>[k,new Set(v.split(' '))]));
function allowedSet(det){if(!CTX)return null;const votes={};for(const k in FSETS)votes[k]=det.filter(d=>FSETS[k].has(d.l)).length;
 const top=Object.entries(votes).sort((a,b)=>b[1]-a[1]);return top[0][1]>=CTX&&(top[0][1]>top[1][1])?FSETS[top[0][0]]:null}
function run(frames){let buf=[],nf=0,cand=null,lock=0,lastEmit='',lastAct=0,det=[];
 const emit=(l,t)=>{const p=det[det.length-1];if(DEDUPE&&p&&p.l===l&&t-p.t<DEDUPE)return;det.push({l,t})};
 frames.forEach((fr,k)=>{const now=k*1000/FPS,act=fr[0]===1,f=fr.slice(2);
  if(act){lastAct=now;buf.push(f);if(buf.length>WIN*2)buf=buf.slice(-WIN);if(++nf%EVAL_EVERY===0){
    const B=buf.slice(-WIN);if(B.length<MIN_FR)return;if(motion(B)<MOV){cand=null;lastEmit='';return}
    const al=allowedSet(det),best={};for(const s of samples){if(al&&!al.has(s.label))continue;const c=subDtw(s.T,B);if(!(s.label in best)||c<best[s.label])best[s.label]=c}
    const r=Object.entries(best).map(([l,c])=>({l,r:c/thr[l]})).sort((a,b)=>a.r-b.r),a=r[0],b=r[1],ok=a.r<=SENS&&(!b||a.r<b.r*MARGIN)&&now>lock&&a.l!==lastEmit;
    if(ok){if(!cand||cand.l!==a.l||a.r<cand.r)cand={l:a.l,r:a.r,n:0};else cand.n++}else if(cand)cand.n++;
    if(cand&&(cand.n>=3||(!ok&&cand.n>=1))){emit(cand.l,now);lastEmit=cand.l;cand=null;lock=now+COOL;buf=[]}}}
  else if(buf.length&&now-lastAct>END_MS){buf=[];cand=null}});
 return det.map(d=>d.l)}
let tH=0,tN=0,tI=0;
const DESDE=arg('desde',0);for(const f of fs.readdirSync(path.join(RECO,'runs')).sort().filter(f=>+f.split('_')[0]>DESDE)){const d=JSON.parse(fs.readFileSync(path.join(RECO,'runs',f)));
 const det=run(d.frames),ops=align(d.exp,det),H=ops.filter(o=>o.startsWith('ok')).length,I=ops.filter(o=>o.startsWith('ins')).length;tH+=H;tN+=d.exp.length;tI+=I;
 console.log(f.replace('.json',''),`${H}/${d.exp.length} bien, ${I} sobran`);if(V)console.log('  '+ops.join(' | '))}
console.log(`TOTAL ${tH}/${tN} = ${Math.round(100*tH/tN)}%  sobran ${tI}  (sens ${SENS}, dedupe ${DEDUPE}, cool ${COOL}, mov ${MOV}, margin ${MARGIN})`);

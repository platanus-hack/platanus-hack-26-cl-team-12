// Exporta las muestras de data/reco a apps/web/public/reco/templates.json (plantillas ya remuestreadas, con el nombre de glosa del agente).
// Uso: node lab/v5_reconocimiento/export_templates.mjs
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),RECO=path.join(ROOT,'data/reco'),OUT=path.join(ROOT,'apps/web/public/reco/templates.json');
const N_T=24,MIN_FR=6;
// etiqueta de la página de prueba → glosa del diccionario del agente (packages/glosses/data/glosses.json)
const A_GLOSA={'HIJO-A':'HIJO','DESPERTAR-SE':'DESPERTAR','HINCHADO-A':'HINCHADO','POCO-A':'POCO','SI':'SÍ'};
const DEMO='HOLA AMBULANCIA NECESITAR HIJO-A CAER-PERSONA CODO HUESO ROMPER SI DESPERTAR-SE PERO BRAZO APOYAR NO-PODER HINCHADO-A SANGRE POCO-A MANO BIEN URGENTE HOSPITAL IR'.split(' ');
const dic=new Set(JSON.parse(fs.readFileSync(path.join(ROOT,'packages/glosses/data/glosses.json'))).glosses.map(g=>g.gloss));
const hasHand=f=>{for(let i=8;i<48;i++)if(f[i]!==0)return true;for(let i=50;i<90;i++)if(f[i]!==0)return true;return false};
const resample=(S,n)=>{const o=[];for(let i=0;i<n;i++){const t=i*(S.length-1)/(n-1),a=Math.floor(t),b=Math.min(a+1,S.length-1),u=t-a;o.push(S[a].map((x,k)=>x*(1-u)+S[b][k]*u))}return o};
const templates=[],cuenta={};
for(const f of fs.readdirSync(RECO).filter(f=>/__\d+\.json$/.test(f)).sort()){
 const s=JSON.parse(fs.readFileSync(path.join(RECO,f)));if(!DEMO.includes(s.label))continue;
 const gloss=A_GLOSA[s.label]??s.label;if(!dic.has(gloss))throw new Error('glosa fuera del diccionario del agente: '+gloss);
 const fr=s.frames.filter(hasHand);if(fr.length<MIN_FR)continue;
 templates.push({gloss,t:resample(fr,N_T).flat().map(x=>+x.toFixed(3))});cuenta[gloss]=(cuenta[gloss]||0)+1}
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({version:1,nT:N_T,dim:92,aspect:16/9,margen:0.96,templates}));
console.log(templates.length,'plantillas,',Object.keys(cuenta).length,'glosas,',Math.round(fs.statSync(OUT).size/1024),'KB →',path.relative(ROOT,OUT));
console.log(Object.entries(cuenta).map(([g,n])=>g+':'+n).join(' '));

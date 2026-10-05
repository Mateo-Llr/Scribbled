const W=128,$=id=>document.getElementById(id);
const layer=$('layer'),actor=$('actor'),stage=$('stage'),box=$('sel'),pv=$('pv'),tabs=$('tabs'),edwrap=$('edwrap');
let parts=[],sel=null,n=0,tool='pen',color='#2b2b3a',playing=false,lastTool='pen';
let seed=1;setInterval(()=>{seed=seed%5+1;document.querySelectorAll('.t').forEach(t=>t.setAttribute('seed',seed))},125);

function addPart(name,x,y,px,py,anim,s=1.5){
  const c=document.createElement('canvas');c.width=c.height=W;
  const sc=document.createElement('canvas');sc.width=sc.height=W;sc.className='spr';actor.appendChild(sc);
  const p={name,c,sc,x,y,s,r:0,f:1,px,py,anim,undo:[],g:c.getContext('2d',{willReadFrequently:true})};
  parts.push(p);select(p);return p;
}
const sync=p=>{const g=p.sc.getContext('2d');g.clearRect(0,0,W,W);g.drawImage(p.c,0,0)};
const xf=(p,off=0,bob=0)=>`translate(${p.x}px,${p.y+bob}px) rotate(${p.r+off}deg) scale(${p.s*p.f},${p.s})`;
function style(el,p,off,bob){el.style.transform=xf(p,off,bob);el.style.transformOrigin=`${p.px}px ${p.py}px`}
function place(){
  parts.forEach((p,i)=>{style(p.sc,p);p.sc.style.zIndex=i});
  const show=sel&&!playing;
  box.style.display=pv.style.display=show?'block':'none';
  if(show){style(box,sel);box.style.zIndex=999;pv.style.left=sel.x+sel.px+'px';pv.style.top=sel.y+sel.py+'px'}
  const m=$('pm');if(m&&sel){m.style.left=sel.px/W*100+'%';m.style.top=sel.py/W*100+'%'}
}
function select(p){
  sel=p;edwrap.innerHTML='';
  if(p){edwrap.appendChild(p.c);const m=document.createElement('div');m.id='pm';edwrap.appendChild(m);
    $('sc').value=p.s;$('rot').value=p.r;$('anim').value=p.anim}
  renderTabs();place();
}
function renderTabs(){
  tabs.innerHTML='';
  parts.forEach(p=>{const b=document.createElement('button');b.textContent=p.name;if(p===sel)b.className='on';b.onclick=()=>select(p);tabs.appendChild(b)});
  const a=document.createElement('button');a.textContent='＋ Pièce';
  a.onclick=()=>addPart('Pièce '+(parts.length+1),stage.clientWidth/2-64,40,64,64,'none');tabs.appendChild(a);
}
// Géométrie (rotation/échelle autour de l'articulation)
function toLocal(p,X,Y){const dx=X-(p.x+p.px),dy=Y-(p.y+p.py),a=-p.r*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return[p.px+(dx*c-dy*s)/(p.s*p.f),p.py+(dx*s+dy*c)/p.s]}
function fwd(p,lx,ly){const sx=(lx-p.px)*p.s*p.f,sy=(ly-p.py)*p.s,a=p.r*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return[p.x+p.px+sx*c-sy*s,p.y+p.py+sx*s+sy*c]}
function setPivot(p,nx,ny){ // déplace l'articulation sans bouger le dessin
  nx=Math.max(0,Math.min(W,nx));ny=Math.max(0,Math.min(W,ny));
  const vx=nx-p.px,vy=ny-p.py,a=p.r*Math.PI/180,c=Math.cos(a),s=Math.sin(a),sx=vx*p.s*p.f,sy=vy*p.s;
  p.x+=-vx+sx*c-sy*s;p.y+=-vy+sx*s+sy*c;p.px=nx;p.py=ny;place();
}
// Dessin
const dot=(p,x,y)=>{const b=+$('brush').value,h=b>>1;if(tool==='pen'){p.g.fillStyle=color;p.g.fillRect(x-h,y-h,b,b)}else if(tool==='er')p.g.clearRect(x-h,y-h,b,b)};
function line(p,x0,y0,x1,y1){const st=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);
  for(let i=0;i<=st;i++)dot(p,Math.round(x0+(x1-x0)*i/st),Math.round(y0+(y1-y0)*i/st));sync(p)}
function fill(p,x,y){
  if(x<0||x>=W||y<0||y>=W)return;
  const image=p.g.getImageData(0,0,W,W),data=image.data,start=y*W+x,offset=start*4;
  const r=data[offset],g=data[offset+1],b=data[offset+2],a=data[offset+3];
  const target=color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if(!target)return;
  const nr=parseInt(target[1],16),ng=parseInt(target[2],16),nb=parseInt(target[3],16);
  if(a===255&&r===nr&&g===ng&&b===nb)return;
  const matches=i=>a===0?data[i+3]===0:data[i]===r&&data[i+1]===g&&data[i+2]===b&&data[i+3]===a;
  const visited=new Uint8Array(W*W),stack=new Uint16Array(W*W);
  let size=0;stack[size++]=start;visited[start]=1;
  while(size){
    const index=stack[--size],i=index*4;
    data[i]=nr;data[i+1]=ng;data[i+2]=nb;data[i+3]=255;
    const x=index%W;
    for(const next of [index-W,index+1,index+W,index-1]){
      if(next<0||next>=W*W||visited[next]||(next===index+1&&x===W-1)||(next===index-1&&x===0))continue;
      if(matches(next*4)){visited[next]=1;stack[size++]=next}
    }
  }
  p.g.putImageData(image,0,0);sync(p);
}
let last=null,pivMode=false;
const pos=(e,p)=>{const r=p.c.getBoundingClientRect();return[Math.floor((e.clientX-r.left)/r.width*W),Math.floor((e.clientY-r.top)/r.height*W)]};
edwrap.addEventListener('pointerdown',e=>{if(!sel)return;edwrap.setPointerCapture(e.pointerId);
  if(pivMode){last=1;setPivot(sel,...pos(e,sel));return}
  const [x,y]=pos(e,sel);
  if(tool==='pick'){
    if(x>=0&&x<W&&y>=0&&y<W){const data=sel.g.getImageData(x,y,1,1).data;if(data[3]){color='#'+[data[0],data[1],data[2]].map(v=>v.toString(16).padStart(2,'0')).join('');$('col').value=color}}
    mode(lastTool);return
  }
  sel.undo.push(sel.g.getImageData(0,0,W,W));if(sel.undo.length>25)sel.undo.shift();
  if(tool==='bucket'){fill(sel,x,y);return}
  last=[x,y];line(sel,...last,...last)});
edwrap.addEventListener('pointermove',e=>{if(!last)return;
  if(pivMode){setPivot(sel,...pos(e,sel));return}
  const q=pos(e,sel);line(sel,...last,...q);last=q});
['pointerup','pointercancel'].forEach(t=>edwrap.addEventListener(t,()=>last=null));
$('undo').onclick=()=>{if(sel&&sel.undo.length){sel.g.putImageData(sel.undo.pop(),0,0);sync(sel)}};
$('clear').onclick=()=>{if(!sel)return;sel.undo.push(sel.g.getImageData(0,0,W,W));sel.g.clearRect(0,0,W,W);sync(sel)};
['#2b2b3a','#ffffff','#e0453a','#f28c28','#f6d743','#5cb85c','#2f9e8f','#3b82d6','#7a4bc4','#e86fa8','#8b5a2b','#f2c9a0'].forEach(c=>{
  const b=document.createElement('button');b.className='sw';b.style.background=c;b.onclick=()=>{color=c;$('col').value=c};$('pal').appendChild(b)});
$('col').oninput=e=>{color=e.target.value};
function mode(m){if(m!=='pick')lastTool=m;pivMode=m==='piv';tool=m==='er'?'er':m==='pick'?'pick':m==='bucket'?'bucket':'pen';
  $('bPen').classList.toggle('on',m==='pen');$('bEr').classList.toggle('on',m==='er');$('bPick').classList.toggle('on',m==='pick');$('bBucket').classList.toggle('on',m==='bucket');$('bPiv').classList.toggle('on',pivMode)}
$('bPen').onclick=()=>mode('pen');$('bEr').onclick=()=>mode('er');$('bPick').onclick=()=>mode('pick');$('bBucket').onclick=()=>mode('bucket');$('bPiv').onclick=()=>mode('piv');
$('anim').onchange=e=>{if(sel)sel.anim=e.target.value};
// Placement
$('sc').oninput=e=>{if(sel){sel.s=+e.target.value;place()}};
$('rot').oninput=e=>{if(sel){sel.r=+e.target.value;place()}};
$('flip').onclick=()=>{if(sel){sel.f*=-1;place()}};
const reorder=top=>{if(!sel)return;parts.splice(parts.indexOf(sel),1);top?parts.push(sel):parts.unshift(sel);place();renderTabs()};
$('front').onclick=()=>reorder(true);$('back').onclick=()=>reorder(false);
$('del').onclick=()=>{if(!sel)return;sel.sc.remove();parts.splice(parts.indexOf(sel),1);select(parts[parts.length-1]||null)};
function hit(p,X,Y){const[l,m]=toLocal(p,X,Y);return l>=0&&m>=0&&l<W&&m<W&&p.g.getImageData(l|0,m|0,1,1).data[3]>0}
let drag=null;
stage.addEventListener('pointerdown',e=>{
  if(playing)return;
  const r=stage.getBoundingClientRect(),X=e.clientX-r.left,Y=e.clientY-r.top;
  let t=null,mode='move';
  if(sel&&Math.hypot(X-(sel.x+sel.px),Y-(sel.y+sel.py))<14){t=sel;mode='piv'}
  else{for(let i=parts.length-1;i>=0;i--)if(hit(parts[i],X,Y)){t=parts[i];break}
    if(!t&&sel){const[l,m]=toLocal(sel,X,Y);if(l>=0&&m>=0&&l<W&&m<W)t=sel} // zone vide de la pièce choisie
  }
  if(!t)return;if(t!==sel)select(t);
  drag={mode,dx:X-t.x,dy:Y-t.y};stage.setPointerCapture(e.pointerId);stage.style.cursor='grabbing';
});
stage.addEventListener('pointermove',e=>{
  if(!drag||!sel)return;const r=stage.getBoundingClientRect(),X=e.clientX-r.left,Y=e.clientY-r.top;
  if(drag.mode==='piv')setPivot(sel,...toLocal(sel,X,Y));else{sel.x=X-drag.dx;sel.y=Y-drag.dy;place()}
});
['pointerup','pointercancel'].forEach(t=>stage.addEventListener(t,()=>{drag=null;stage.style.cursor=playing?'default':'grab'}));

// ---------- Mode jeu (plateformer) ----------
const keys={l:0,r:0,d:0,run:0};let jumpReq=false,st=null,raf=0;
const KMAP={arrowleft:'l',q:'l',a:'l',arrowright:'r',d:'r',arrowdown:'d',s:'d',shift:'run'};
const isJump=k=>k===' '||k==='arrowup'||k==='z'||k==='w';
addEventListener('keydown',e=>{const k=e.key.toLowerCase();
  if(playing){if(KMAP[k]){keys[KMAP[k]]=1;e.preventDefault()}else if(isJump(k)){if(!e.repeat)jumpReq=true;keys.j=1;e.preventDefault()}return}
  if(['INPUT','SELECT'].includes(e.target.tagName)||!sel||!k.startsWith('arrow'))return;
  const d=e.shiftKey?10:1;
  if(k==='arrowleft')sel.x-=d;if(k==='arrowright')sel.x+=d;if(k==='arrowup')sel.y-=d;if(k==='arrowdown')sel.y+=d;
  e.preventDefault();place()});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(!playing)return;if(KMAP[k])keys[KMAP[k]]=0;if(isJump(k)){keys.j=0;e.preventDefault()}});
document.querySelectorAll('#pad button').forEach(b=>{const k=b.dataset.k;
  b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=1;if(k==='j')jumpReq=true});
  ['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,()=>{keys[k]=0}))});

function bounds(){ // boîte réelle (pixels non transparents) du perso au repos
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  parts.forEach(p=>{const d=p.g.getImageData(0,0,W,W).data;let a=W,b=W,c=-1,f=-1;
    for(let i=0;i<W;i++)for(let j=0;j<W;j++)if(d[(i*W+j)*4+3]){if(j<a)a=j;if(j>c)c=j;if(i<b)b=i;if(i>f)f=i}
    if(c<0)return;
    [[a,b],[c+1,b],[a,f+1],[c+1,f+1]].forEach(([u,v])=>{const[X,Y]=fwd(p,u,v);x0=Math.min(x0,X);x1=Math.max(x1,X);y0=Math.min(y0,Y);y1=Math.max(y1,Y)})});
  return x0>x1?{cx:stage.clientWidth/2,fy:300,h:200}:{cx:(x0+x1)/2,fy:y1,h:y1-y0};
}
const VW=1000,VH=660,G=580,HW=14,PU='#8a3fc7',voice=$('voice');
const T=(x,y,r,t)=>[x,y,r,t];
const Z={
'0,1':{p:[['p',0,1000,G],['p',300,430,480],['p',520,650,390],['p',700,820,330]],w:[[760,470,G]],nu:1,
 t:[T(110,G,90,"Bienvenue sur la page. Ne t’inquiète pas : c’est juste de l’encre."),T(690,G,60,"Un mur. Saute dessus. Tu en es capable."),T(900,G,70,"Rien au plafond. Va plutôt vers la droite.")]},
'0,0':{p:[['p',0,300,G],['r',300,430,G],['p',430,1000,G],['p',420,500,470],['p',680,760,460],['p',820,1000,400],['p',900,1000,490]],w:[[800,330,G]],
 t:[T(960,G,40,"Un mur. Grimpe sur les marches, puis saute par-dessus."),T(480,G,40,"Le rouge pique. Évite-le."),T(150,G,60,"Tu as traversé tout ça pour rien. Bravo.")]},
'1,0':{p:[['i',0,420,G],['b',420,520,G],['i',520,600,G],['i',700,1000,G],['p',380,640,250]],w:[],
 t:[T(60,G,60,"Ça glisse. La glace, c’est bleu."),T(470,G,50,"Le vert fait rebondir. Essaie !"),T(510,250,70,"Le coin secret. Il n’y a rien. Désolée."),T(650,G,45,"Un trou ? Il y a sûrement une page dessous…")]},
'2,0':{p:[['p',0,300,G],['r',300,430,G],['p',700,1000,G],
 ['p',480,650,G,true], // pont visible au-dessus du trou, traversable avec ↓ + Espace
 ['p',60,200,450],['p',300,440,360],['p',560,700,270],['p',800,940,180]],w:[],
 t:[T(60,G,60,"Cette page est plus haute que les autres."),T(560,G,90,"Une plateforme ! Pour redescendre : ↓ + Espace."),T(870,180,70,"Ce n’était pas la fin. La page continue vers la droite…")]},
'1,1':{p:[['p',0,150,G],['b',150,260,G],['p',260,560,G],['i',560,780,G],['r',780,880,G],['p',880,1000,G],['p',300,420,330]],w:[[500,430,G]],
 t:[T(60,G,60,"Tu es tombé ? Classique."),T(700,G,80,"Le bleu glisse. Le rouge pique. Le vert rebondit. Voilà, tu sais tout.")]},
'2,1':{p:[['p',0,1000,G],['p',150,260,470],['p',300,400,360],['b',440,560,300]],w:[],
 t:[T(60,G,70,"Fin du monde, côté droit. Un ressort vert, là-haut…"),T(500,300,60,"Boing !")],nr:1},
'3,0':{p:[['p',0,200,G],['r',200,800,G],['p',800,1000,G]],w:[],m:[[110,330,470,70,0,3.2],[110,520,400,0,60,3],[110,700,470,60,0,3.4]],
 t:[T(100,G,90,"Des plateformes qui bougent. Attends le bon moment pour sauter."),T(900,G,80,"Bien sauté. Ou bien tu as eu de la chance.")]},
'4,0':{p:[['p',0,880,G],['p',500,720,400],['p',380,470,490]],w:[],e:[[260,520,G,80],[620,840,G,100],[520,700,400,60]],
 t:[T(100,G,90,"Un ennemi ! Saute-lui dessus pour le battre."),T(880,G,40,"Un trou. Après tout ça, tu n’as qu’à sauter dedans.")]},
'3,1':{p:[['p',0,1000,G]],w:[],nu:1,nl:1,f:[[300,G,3,0],[620,G,3,1.5]],
 t:[T(60,G,60,"Salle secrète. Il n’y a toujours rien, mais il fait chaud.")]},
'4,1':{p:[['p',0,1000,G]],w:[],f:[[250,G,4,0],[520,G,4,1.3],[780,G,3.4,.5]],
 t:[T(930,G,60,"La page des flammes. Traverse vers la gauche quand elles s’éteignent."),T(130,G,70,"Fin de la page… pour de vrai, cette fois. Merci d’avoir joué !")]}};
let zx=0,zy=1,cp=null,plat=null;
const has=(dx,dy)=>Z[(zx+dx)+','+(zy+dy)];
function build(){
  const z=Z[zx+','+zy],C={p:'#2b2b3a',i:'#3b82d6',b:'#2faa4a'};const FC={p:'#a1693c',i:'#6fb0ee',b:'#4fb866',r:'#e0605a'};
  let h='<defs>'+Object.entries(FC).map(([k,c])=>`<pattern id="h${k}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="9" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/></pattern>`).join('')+'</defs>';
  const gs=z.p.filter(q=>q[3]===G&&!q[4]),bd=x=>`<line x1="${x}" x2="${x}" y1="${G}" y2="${VH}" stroke="#2b2b3a" stroke-width="5" stroke-linecap="round"/>`;
  gs.forEach(q=>{if(q[1]>0&&!gs.some(o=>o!==q&&o[2]===q[1]))h+=bd(q[1]);if(q[2]<VW&&!gs.some(o=>o!==q&&o[1]===q[2]))h+=bd(q[2])});
  z.p.forEach(([t,a,b,y,platform])=>{if(y===G&&!platform)h+=`<rect x="${a}" y="${y}" width="${b-a}" height="${VH-y}" fill="${FC[t]}" opacity=".13"/><rect x="${a}" y="${y+4}" width="${b-a}" height="${VH-y-4}" fill="url(#h${t})"/>`;
    if(t==='r'){let d=`M${a} ${y}`;for(let x=a+8,u=1;x<=b;x+=8,u^=1)d+=` L${x} ${y-u*12}`;
    h+=`<path d="${d}" fill="none" stroke="#e0453a" stroke-width="4" stroke-linejoin="round"/>`}
    else h+=`<line x1="${a}" x2="${b}" y1="${y}" y2="${y}" stroke="${C[t]}" stroke-width="${t==='p'?5:8}" stroke-linecap="round"/>`});
  z.w.forEach(([x,a,b])=>h+=`<line x1="${x}" x2="${x}" y1="${a}" y2="${b}" stroke="#2b2b3a" stroke-width="8" stroke-linecap="round"/>`);
  z.t.forEach(t=>h+=`<text x="${t[0]}" y="${t[1]-85}" fill="${PU}" font-size="32" font-family="Patrick Hand,cursive" text-anchor="middle">?</text>`);
  plat.innerHTML=h;
  st.pl=[...z.p,...z.w.map(([x,a])=>['p',x-HW,x+HW,a])];st.ign=null;st.cur=null;st.on=-1;st.noMp=0;
  const NS='http://www.w3.org/2000/svg',mk=h=>{const g=document.createElementNS(NS,'g');g.innerHTML=h;plat.appendChild(g);return g};
  st.mp=(z.m||[]).map(([w,x,y,dx,dy,T])=>({w,x,y,dx,dy,T,px:x,py:y,vx:0,vy:0,el:mk(`<line x1="${-w/2}" x2="${w/2}" y1="0" y2="0" stroke="#d98324" stroke-width="7" stroke-linecap="round"/>`)}));
  st.en=(z.e||[]).map(([a,b,y,v])=>({a,b,y,v,x:a,d:1,alive:1,el:mk('<circle cx="0" cy="-16" r="16" fill="#fbf8ee" stroke="#2b2b3a" stroke-width="3"/><path d="M-10 -25 L-3 -20 M10 -25 L3 -20 M-8 -8 L-4 -11 L0 -8 L4 -11 L8 -8" stroke="#e0453a" stroke-width="3" fill="none"/>')}));
  st.fl=(z.f||[]).map(([x,y,T,ph])=>{const el=mk('<rect x="-10" y="-8" width="20" height="8" fill="#2b2b3a"/><path fill="#f6b73c" stroke="#e0453a" stroke-width="2"/>');
    el.setAttribute('transform',`translate(${x} ${y})`);return{x,y,T,ph,p:el.querySelector('path')}});
}
const KW=[['#ff5a4d','rouge|piqu\\p{L}*|pointe\\p{L}*|aïe|mourir'],['#5ab0ff','glace|bleu|glisse\\p{L}*'],['#5fe07a','vert|rebond\\p{L}*|ressort|boing'],
 ['#ffa53d','plateforme\\p{L}*|flamme\\p{L}*|chaud|orange'],['#ffe45c','saut\\p{L}*|splat'],['#ff7ad9','ennemi\\p{L}*'],['#c9a0ff','mur|murs|marches|secrète|fin|encre']]
  .map(([c,w])=>[c,new RegExp('^(?:'+w+')$','iu'),w]);
const KRE=new RegExp('(?<!\\p{L})(?:'+KW.map(k=>k[2]).join('|')+')(?!\\p{L})','giu');
function segs(t){const o=[];let l=0;for(const m of t.matchAll(KRE)){if(m.index>l)o.push([t.slice(l,m.index),0]);o.push([m[0],KW.find(k=>k[1].test(m[0]))[0]]);l=m.index+m[0].length}
  if(l<t.length)o.push([t.slice(l),0]);return o}
function paint(n){let h='',r=n;for(const[t,c]of st.segs){if(r<=0)break;const u=t.slice(0,r);r-=u.length;h+=c?`<span style="color:${c}">${u}</span>`:u}voice.innerHTML=h}
function say(t,hide){st.segs=segs(t);st.msg=t;st.n=0;st.hide=hide;voice.style.opacity=1;st.vis=1;voice.textContent=''}
function tr(dx,dy,X,Y){zx+=dx;zy+=dy;st.X=X;st.Y=Y;build();cp={zx,zy,X,Y}}
function die(){say('Aïe ! On recommence.',2);zx=cp.zx;zy=cp.zy;st.X=cp.X;st.Y=cp.Y;st.vy=st.vx=0;build()}
function fit(){const k=Math.min(innerWidth/VW,innerHeight/VH);
  layer.style.cssText=`inset:auto;left:${(innerWidth-VW*k)/2}px;top:${(innerHeight-VH*k)/2}px;width:${VW}px;height:${VH}px;transform-origin:0 0;transform:scale(${k})`}
addEventListener('resize',()=>{if(playing)fit()});
function togglePlay(){
  if(!playing){
    if(!parts.length)return;
    document.activeElement.blur();
    const b=bounds(),gs=Math.max(.15,Math.min(1,110/b.h));$('gs').value=gs;
    plat=document.createElementNS('http://www.w3.org/2000/svg','svg');plat.id='plat';plat.setAttribute('viewBox',`0 0 ${VW} ${VH}`);
    layer.insertBefore(plat,actor);
    zx=0;zy=1;cp={zx,zy,X:100,Y:G};
    st={b,gs,X:100,Y:G,vx:0,vy:0,dir:1,ground:true,surf:'p',phase:0,amp:0,msg:'',n:0,hide:0,t:0,on:-1,noMp:0,mp:[],en:[],fl:[]};
    playing=true;document.body.classList.add('play');$('pad').style.display='flex';$('play').textContent='■ Éditer';
    build();fit();place();let t0=performance.now();
    const loop=t=>{step(Math.min(.033,(t-t0)/1000));t0=t;raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);
  }else{
    cancelAnimationFrame(raf);playing=false;document.body.classList.remove('play');$('pad').style.display='none';
    plat.remove();layer.style.cssText='';actor.style.transform='none';voice.style.opacity=0;keys.l=keys.r=keys.d=keys.run=keys.j=0;
    $('play').textContent='▶ Jouer';place();
  }
}
$('play').onclick=togglePlay;
$('gs').oninput=e=>{if(st)st.gs=+e.target.value};
function step(dt){
  const s=st,z=Z[zx+','+zy],ch=s.b.h*s.gs,ax=keys.r-keys.l,sp=keys.run?400:230,ice=s.ground&&s.surf==='i';
  s.t+=dt;
  for(const m of s.mp){const a=s.t*6.2832/m.T,nx=m.x+m.dx*Math.sin(a),ny=m.y+m.dy*Math.sin(a);m.vx=nx-m.px;m.vy=ny-m.py;m.px=nx;m.py=ny;m.el.setAttribute('transform',`translate(${nx} ${ny})`)}
  if(s.on>=0&&s.mp[s.on]){s.X+=s.mp[s.on].vx;s.Y+=s.mp[s.on].vy}
  s.vx=ice?s.vx+(ax*sp-s.vx)*Math.min(1,dt*1.5):ax*sp;if(ax)s.dir=ax;
  if(jumpReq){jumpReq=false;if(s.ground){const dropAtGround=s.pl.some(([t,a,b,y,drop])=>drop&&s.Y===y&&s.X>=a-6&&s.X<=b+6);
    if(keys.d&&(s.Y<G-1||dropAtGround)){s.ign=s.Y;s.noMp=.35;s.vy=60}else{s.vy=-790;s.jmp=1}s.ground=false}}
  s.vy+=(1900+(s.jmp&&!keys.j&&s.vy<0?3200:0))*dt;if(s.vy>=0)s.jmp=0;const py=s.Y;let nx=s.X+s.vx*dt;
  for(const[x,a,b]of z.w)if(Math.abs(nx-x)<HW&&s.Y>a&&s.Y-ch<b){nx=s.X<x?x-HW:x+HW;s.vx=0}
  s.X=nx;
  if(s.X<0){if(has(-1,0)&&!z.nl)tr(-1,0,VW-2,s.Y);else s.X=0}
  else if(s.X>VW){if(has(1,0)&&!z.nr)tr(1,0,2,s.Y);else s.X=VW}
  s.Y+=s.vy*dt;s.ground=false;
  if(s.vy>=0)for(const[t,a,b,y]of s.pl)if(t!=='r'&&y!==s.ign&&py<=y+.5&&s.Y>=y&&s.X>=a-6&&s.X<=b+6){
    s.Y=y;s.surf=t;if(t==='b')s.vy=-1150;else{s.vy=0;s.ground=true}break}
  let on=-1;if(s.vy>=0&&!s.ground&&s.noMp<=0)s.mp.forEach((m,i)=>{if(!s.ground&&py<=m.py+8&&s.Y>=m.py&&Math.abs(s.X-m.px)<=m.w/2+6){s.Y=m.py;s.vy=0;s.ground=true;s.surf='p';on=i}});
  s.on=on;s.noMp-=dt;
  for(const[t,a,b,y]of z.p)if(t==='r'&&s.Y>=y-14&&s.Y<=y+40&&s.X>=a&&s.X<=b){die();return}
  if(s.ign!==null&&s.Y>s.ign+8)s.ign=null;
  if(s.Y-ch<0){if(has(0,-1)&&!z.nu){tr(0,-1,s.X,G-5);s.vy=Math.min(s.vy,-750)}else{s.Y=ch;s.vy=Math.max(s.vy,0)}}
  else if(s.Y>VH+60){if(has(0,1))tr(0,1,s.X,ch+10);else{die();return}}
  for(const e of s.en){if(!e.alive)continue;e.x+=e.d*e.v*dt;if(e.x>e.b){e.x=e.b;e.d=-1}if(e.x<e.a){e.x=e.a;e.d=1}
    e.el.setAttribute('transform',`translate(${e.x} ${e.y})`);
    if(Math.abs(s.X-e.x)<24&&s.Y>e.y-32&&s.Y-ch<e.y){
      if(s.vy>0&&py<=e.y-20){e.alive=0;e.el.setAttribute('visibility','hidden');s.vy=-560;s.ground=false;say('Splat.',1.5)}else{die();return}}}
  for(const f of s.fl){const ph=(s.t+f.ph)%f.T,h=ph<1.5?180:ph>f.T-.7?22:0,q=h*(.93+Math.random()*.07);
    f.p.setAttribute('d',h?`M-10 -8 L-14 ${-8-q*.5} L-5 ${-8-q*.8} L0 ${-8-q} L6 ${-8-q*.7} L14 ${-8-q*.45} L10 -8 Z`:'');
    if(h>100&&Math.abs(s.X-f.x)<14&&s.Y>f.y-h-8&&s.Y-ch<f.y){die();return}}
  let cur=null;for(const t of z.t)if(Math.abs(s.X-t[0])<t[2]&&Math.abs(s.Y-t[1])<130){cur=t;break}
  if(cur!==s.cur){s.cur=cur;if(cur){if(cur[3]===s.msg&&s.vis)s.hide=0;else say(cur[3],0)}else s.hide=2.5}
  if(s.n<s.msg.length){s.n+=dt*45;paint(s.n|0)}
  if(s.hide>0){s.hide-=dt;if(s.hide<=0){voice.style.opacity=0;s.vis=0}}
  const moving=ax&&s.ground;if(moving)s.phase+=dt*(keys.run?15:10);
  s.amp+=((s.ground?(moving?1:0):.5)-s.amp)*Math.min(1,dt*15);
  const sw=Math.sin(s.phase)*34*s.amp,bob=-Math.abs(Math.sin(s.phase))*6*s.amp;
  parts.forEach(p=>style(p.sc,p,p.anim==='A'?sw:p.anim==='B'?-sw:0,p.anim==='bob'?bob:0));
  actor.style.transformOrigin=`${s.b.cx}px ${s.b.fy}px`;
  actor.style.transform=`translate(${s.X-s.b.cx}px,${s.Y-s.b.fy}px) scale(${s.dir*s.gs},${s.gs})`;
}

const CHARACTER_KEY='scribbled.characters.v1';
let characterStore={version:1,defaultId:null,characters:[]},activeCharacterId=null,activeCharacterName='',baselineParts='',characterRevision=0;
const characterStatus=(message,error=false)=>{$('characterStatus').textContent=message;$('characterStatus').dataset.error=error?'true':'false'};
function buildStarter(){
  actor.replaceChildren();parts=[];sel=null;
  const cx=Math.min(stage.clientWidth||600,700)/2-64;
  addPart('Bras D',cx+62,175,64,24,'B');addPart('Jambe D',cx+28,330,64,20,'A');
  addPart('Corps',cx,170,64,64,'bob');addPart('Jambe G',cx-28,330,64,20,'B');
  addPart('Bras G',cx-62,175,64,24,'A');addPart('Tête',cx,10,64,110,'bob');
  select(parts[5]);mode('pen');
}
function serializeParts(){
  return parts.map(p=>({name:p.name,x:p.x,y:p.y,px:p.px,py:p.py,s:p.s,r:p.r,f:p.f,anim:p.anim,image:p.c.toDataURL('image/png')}));
}
function validateStore(store){
  if(!store||store.version!==1||!Array.isArray(store.characters)||(store.defaultId!==null&&typeof store.defaultId!=='string'))throw Error('Format de sauvegarde invalide.');
  const ids=new Set();
  for(const character of store.characters){
    if(!character||typeof character.id!=='string'||!character.id||ids.has(character.id)||typeof character.name!=='string'||!character.name||!Array.isArray(character.parts)||!Number.isInteger(character.selected))throw Error('Une fiche de personnage enregistrée est invalide.');
    ids.add(character.id);
    for(const p of character.parts){
      if(!p||typeof p.name!=='string'||![p.x,p.y,p.px,p.py,p.s,p.r].every(Number.isFinite)||p.s<=0||(p.f!==1&&p.f!==-1)||!['none','A','B','bob'].includes(p.anim)||typeof p.image!=='string'||!p.image.startsWith('data:image/png;base64,'))throw Error('Les données d’une pièce enregistrée sont invalides.');
    }
    if(character.selected<0||character.selected>=Math.max(character.parts.length,1))throw Error('La pièce sélectionnée dans une sauvegarde est invalide.');
  }
  if(store.defaultId!==null&&!ids.has(store.defaultId))throw Error('Le personnage par défaut est introuvable dans les sauvegardes.');
  return store;
}
function readCharacterStore(){
  try{
    const raw=localStorage.getItem(CHARACTER_KEY);
    if(raw===null)return null;
    return validateStore(JSON.parse(raw));
  }catch(error){
    characterStatus(`Impossible de lire les personnages sauvegardés : ${error.message}`,true);
    return null;
  }
}
function writeCharacterStore(next){
  try{localStorage.setItem(CHARACTER_KEY,JSON.stringify(next));characterStore=next;return true}
  catch(error){characterStatus(`Impossible d’enregistrer le personnage dans ce navigateur : ${error.message}`,true);return false}
}
function isCharacterDirty(){return baselineParts!==JSON.stringify(serializeParts())}
function makeRecord(name,id){
  return{id,name,parts:serializeParts(),selected:Math.max(0,parts.indexOf(sel))};
}
function createCharacterId(){
  return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function decodeImages(character){
  return Promise.all(character.parts.map(part=>new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>image.naturalWidth===W&&image.naturalHeight===W?resolve(image):reject(Error(`L’image de la pièce « ${part.name} » n’a pas les dimensions attendues.`));
    image.onerror=()=>reject(Error(`Impossible de charger l’image de la pièce « ${part.name} ».`));
    image.src=part.image;
  })));
}
function restoreCharacter(character,images){
  actor.replaceChildren();parts=[];sel=null;
  character.parts.forEach((data,index)=>{
    const p=addPart(data.name,data.x,data.y,data.px,data.py,data.anim,data.s);
    p.r=data.r;p.f=data.f;p.g.drawImage(images[index],0,0);sync(p);p.undo=[];
  });
  select(parts[character.selected]||parts[0]||null);mode('pen');
  activeCharacterId=character.id;activeCharacterName=character.name;baselineParts=JSON.stringify(serializeParts());
}
function drawCharacterPreview(canvas,character,images){
  const width=112,height=92,padding=6,ctx=canvas.getContext('2d');
  canvas.width=width;canvas.height=height;
  ctx.imageSmoothingEnabled=false;
  const bounds=[];
  images.forEach((image,index)=>{
    const scratch=document.createElement('canvas');scratch.width=scratch.height=W;
    const scratchCtx=scratch.getContext('2d',{willReadFrequently:true});scratchCtx.drawImage(image,0,0);
    const pixels=scratchCtx.getImageData(0,0,W,W).data;
    let x0=W,y0=W,x1=-1,y1=-1;
    for(let y=0;y<W;y++)for(let x=0;x<W;x++)if(pixels[(y*W+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1)}
    if(x1<0)return;
    const part=character.parts[index],angle=part.r*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    for(const [x,y]of[[x0,y0],[x1,y0],[x0,y1],[x1,y1]]){
      const dx=(x-part.px)*part.s*part.f,dy=(y-part.py)*part.s;
      bounds.push([part.x+part.px+dx*c-dy*s,part.y+part.py+dx*s+dy*c]);
    }
  });
  if(!bounds.length){canvas.dataset.empty='true';return}
  const minX=Math.min(...bounds.map(point=>point[0])),maxX=Math.max(...bounds.map(point=>point[0]));
  const minY=Math.min(...bounds.map(point=>point[1])),maxY=Math.max(...bounds.map(point=>point[1]));
  const scale=Math.min((width-padding*2)/(maxX-minX||1),(height-padding*2)/(maxY-minY||1));
  ctx.setTransform(scale,0,0,scale,padding-minX*scale,padding-minY*scale);
  images.forEach((image,index)=>{
    const part=character.parts[index];
    ctx.save();ctx.translate(part.x+part.px,part.y+part.py);ctx.rotate(part.r*Math.PI/180);
    ctx.scale(part.s*part.f,part.s);ctx.translate(-part.px,-part.py);ctx.drawImage(image,0,0);ctx.restore();
  });
  canvas.dataset.empty='false';
}
function saveCharacter(entered){
  const name=entered.trim();
  if(!name){characterStatus('Le nom du personnage ne peut pas être vide.',true);return}
  if(name.length>60){characterStatus('Le nom du personnage ne peut pas dépasser 60 caractères.',true);return}
  try{
    const existing=characterStore.characters.find(item=>item.name.toLocaleLowerCase()===name.toLocaleLowerCase());
    if(existing&&existing.id!==activeCharacterId&&!window.confirm(`Remplacer le personnage « ${existing.name} » ?`))return;
    const id=existing?existing.id:activeCharacterId||createCharacterId();
    const record=makeRecord(name,id);
    const characters=characterStore.characters.filter(item=>item.id!==id);
    characters.push(record);
    if(!writeCharacterStore({version:1,defaultId:id,characters}))return false;
    characterRevision++;
    activeCharacterId=id;activeCharacterName=name;baselineParts=JSON.stringify(serializeParts());
    characterStatus(`« ${name} » est sauvegardé et défini comme personnage par défaut.`);
    return true;
  }catch(error){characterStatus(`Impossible de sauvegarder le personnage : ${error.message}`,true);return false}
}
async function chooseCharacter(character){
  if(isCharacterDirty()&&!window.confirm('Les modifications non sauvegardées seront perdues. Continuer ?'))return;
  try{
    const images=await decodeImages(character);
    const next={...characterStore,defaultId:character.id};
    if(!writeCharacterStore(next))return;
    restoreCharacter(character,images);
    $('charactersDialog').close();
    characterStatus(`« ${character.name} » est chargé et défini comme personnage par défaut.`);
  }catch(error){characterStatus(`Impossible de charger le personnage : ${error.message}`,true)}
}
function exportCharacter(character){
  try{
    const contents=JSON.stringify({format:'scribbled-character',version:1,character},null,2);
    const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));
    const link=document.createElement('a');
    const filename=character.name.normalize('NFKD').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').trim().slice(0,60)||'personnage';
    link.href=url;link.download=`${filename}.json`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    characterStatus(`« ${character.name} » a été exporté dans un fichier JSON.`);
  }catch(error){characterStatus(`Impossible d’exporter le personnage : ${error.message}`,true)}
}
async function importCharacterFile(file){
  try{
    if(file.size>10*1024*1024)throw Error('Le fichier dépasse la taille maximale de 10 Mo.');
    const data=JSON.parse(await file.text());
    if(!data||data.format!=='scribbled-character'||data.version!==1)throw Error('Ce fichier n’est pas un export de personnage Scribbled reconnu.');
    const character=validateStore({version:1,defaultId:null,characters:[data.character]}).characters[0];
    if(character.name.length>60)throw Error('Le nom du personnage importé dépasse 60 caractères.');
    await decodeImages(character);
    const existing=characterStore.characters.find(item=>item.name.toLocaleLowerCase()===character.name.toLocaleLowerCase());
    if(existing&&!window.confirm(`Un personnage nommé « ${existing.name} » existe déjà. Le remplacer ?`)){
      characterStatus('Import annulé : le personnage existant a été conservé.');
      return;
    }
    const id=existing?existing.id:createCharacterId();
    const imported={...character,id};
    const characters=[...characterStore.characters.filter(item=>item.id!==id),imported];
    if(!writeCharacterStore({...characterStore,characters}))return;
    renderSavedCharacters();
    characterStatus(`« ${character.name} » a été importé dans vos personnages sauvegardés.`);
  }catch(error){characterStatus(`Impossible d’importer le personnage : ${error.message}`,true)}
}
function renderSavedCharacters(){
  const list=$('savedCharacters');list.replaceChildren();
  const importRow=document.createElement('div');importRow.className='saved-character-row';
  const importButton=document.createElement('button');importButton.type='button';importButton.className='saved-character';
  const importPreview=document.createElement('span');importPreview.className='character-import-preview';importPreview.setAttribute('aria-hidden','true');importPreview.textContent='＋';
  const importName=document.createElement('span');importName.className='saved-character-name';importName.textContent='Importer un personnage';
  importButton.append(importPreview,importName);importButton.onclick=()=>$('importCharacterFile').click();importRow.appendChild(importButton);list.appendChild(importRow);
  if(!characterStore.characters.length){
    const message=document.createElement('p');message.textContent='Aucun personnage sauvegardé pour le moment.';list.appendChild(message);
    return;
  }
  characterStore.characters.forEach(character=>{
    const row=document.createElement('div');row.className='saved-character-row';
    const button=document.createElement('button');button.type='button';button.className='saved-character';
    const preview=document.createElement('canvas');preview.className='character-preview';preview.setAttribute('aria-hidden','true');
    const name=document.createElement('span');name.className='saved-character-name';
    name.textContent=character.name+(character.id===characterStore.defaultId?' (par défaut)':'');
    button.append(preview,name);
    button.onclick=()=>chooseCharacter(character);
    const exportButton=document.createElement('button');exportButton.type='button';exportButton.className='export-character';exportButton.textContent='Exporter';
    exportButton.setAttribute('aria-label',`Exporter « ${character.name} »`);exportButton.onclick=()=>exportCharacter(character);
    row.append(button,exportButton);list.appendChild(row);
    decodeImages(character).then(images=>drawCharacterPreview(preview,character,images))
      .catch(error=>{characterStatus(`Impossible de créer l’aperçu de « ${character.name} » : ${error.message}`,true)});
  });
}
function showCharacterPicker(){
  renderSavedCharacters();
  $('charactersDialog').showModal();
}
$('newCharacter').onclick=()=>{
  if(isCharacterDirty()&&!window.confirm('Les modifications non sauvegardées seront perdues. Créer un nouveau personnage ?'))return;
  characterRevision++;
  buildStarter();activeCharacterId=null;activeCharacterName='';baselineParts=JSON.stringify(serializeParts());
  characterStatus('Nouveau personnage vierge. Sauvegardez-le pour le retrouver plus tard.');
};
$('chooseCharacter').onclick=()=>{characterRevision++;showCharacterPicker()};
$('saveCharacter').onclick=()=>{$('characterName').value=activeCharacterName||'';$('saveCharacterDialog').showModal();$('characterName').focus()};
$('importCharacterFile').onchange=async e=>{
  const input=e.target,file=input.files[0];
  if(!file)return;
  characterRevision++;
  await importCharacterFile(file);
  input.value='';
};
$('saveCharacterForm').onsubmit=e=>{e.preventDefault();if(saveCharacter($('characterName').value))$('saveCharacterDialog').close()};
$('cancelSaveCharacter').onclick=()=>$('saveCharacterDialog').close();
$('closeCharacters').onclick=()=>$('charactersDialog').close();
buildStarter();
baselineParts=JSON.stringify(serializeParts());
const loadedStore=readCharacterStore();
if(loadedStore){
  characterStore=loadedStore;
  const defaultCharacter=characterStore.characters.find(item=>item.id===characterStore.defaultId);
  if(defaultCharacter){const revision=characterRevision;decodeImages(defaultCharacter).then(images=>{
    if(revision!==characterRevision){characterStatus('Le chargement automatique a été ignoré car vous avez déjà changé de personnage.');return}
    if(isCharacterDirty()&&!window.confirm('Charger le personnage par défaut ? Les modifications non sauvegardées seront perdues.'))return;
    restoreCharacter(defaultCharacter,images);characterStatus(`Personnage par défaut « ${defaultCharacter.name} » chargé.`);
  }).catch(error=>characterStatus(`Impossible de charger le personnage par défaut : ${error.message}`,true));
  }else characterStatus('Aucun personnage par défaut. Créez-en un ou choisissez une sauvegarde.');
}else if(!$('characterStatus').textContent)characterStatus('Personnage vierge. Sauvegardez-le pour le retrouver plus tard.');

const W=128,$=id=>document.getElementById(id);
const layer=$('layer'),actor=$('actor'),stage=$('stage'),box=$('sel'),pv=$('pv'),tabs=$('tabs'),edwrap=$('edwrap');
const rangeIds=['brush','gs','sc','rot'];
function syncRangeValue(id){const range=$(id),value=$(id+'Value');if(range&&value)value.value=range.value}
let parts=[],sel=null,n=0,tool='pen',color='#2b2b3a',playing=false,lastTool='pen';
let viewScale=1,viewX=0,viewY=0;
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
  if(!playing&&parts.length){
    layer.style.transform='none';
    const sr=stage.getBoundingClientRect(),originX=sr.left+stage.clientLeft,originY=sr.top+stage.clientTop;
    const rects=parts.map(p=>p.sc.getBoundingClientRect());
    const minX=Math.min(...rects.map(r=>r.left-originX)),maxX=Math.max(...rects.map(r=>r.right-originX));
    const minY=Math.min(...rects.map(r=>r.top-originY)),maxY=Math.max(...rects.map(r=>r.bottom-originY));
    viewScale=Math.min(1,stage.clientWidth/(maxX-minX),stage.clientHeight/(maxY-minY));
    viewX=(stage.clientWidth-(maxX-minX)*viewScale)/2-minX*viewScale;
    viewY=(stage.clientHeight-(maxY-minY)*viewScale)/2-minY*viewScale;
    layer.style.transformOrigin='0 0';
    layer.style.transform=`matrix(${viewScale},0,0,${viewScale},${viewX},${viewY})`;
  }else if(!playing){
    viewScale=1;viewX=viewY=0;layer.style.transform='none';
  }else{
    viewScale=1;viewX=viewY=0;
  }
  const show=sel&&!playing;
  box.style.display=pv.style.display=show?'block':'none';
  if(show){style(box,sel);box.style.zIndex=999;pv.style.left=sel.x+sel.px+'px';pv.style.top=sel.y+sel.py+'px'}
  const m=$('pm');if(m&&sel){m.style.left=sel.px/W*100+'%';m.style.top=sel.py/W*100+'%'}
}
new ResizeObserver(()=>place()).observe(stage);
function select(p){
  sel=p;edwrap.innerHTML='';
  if(p){edwrap.appendChild(p.c);const m=document.createElement('div');m.id='pm';edwrap.appendChild(m);
    $('sc').value=p.s;$('rot').value=p.r;syncRangeValue('sc');syncRangeValue('rot');$('anim').value=p.anim}
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
  const r=stage.getBoundingClientRect(),X=(e.clientX-r.left-viewX)/viewScale,Y=(e.clientY-r.top-viewY)/viewScale;
  let t=null,mode='move';
  if(sel&&Math.hypot(X-(sel.x+sel.px),Y-(sel.y+sel.py))<14){t=sel;mode='piv'}
  else{for(let i=parts.length-1;i>=0;i--)if(hit(parts[i],X,Y)){t=parts[i];break}
    if(!t&&sel){const[l,m]=toLocal(sel,X,Y);if(l>=0&&m>=0&&l<W&&m<W)t=sel} // zone vide de la pièce choisie
  }
  if(!t)return;if(t!==sel)select(t);
  drag={mode,dx:X-t.x,dy:Y-t.y};stage.setPointerCapture(e.pointerId);stage.style.cursor='grabbing';
});
stage.addEventListener('pointermove',e=>{
  if(!drag||!sel)return;const r=stage.getBoundingClientRect(),X=(e.clientX-r.left-viewX)/viewScale,Y=(e.clientY-r.top-viewY)/viewScale;
  if(drag.mode==='piv')setPivot(sel,...toLocal(sel,X,Y));else{sel.x=X-drag.dx;sel.y=Y-drag.dy;place()}
});
['pointerup','pointercancel'].forEach(t=>stage.addEventListener(t,()=>{drag=null;stage.style.cursor=playing?'default':'grab'}));

// ---------- Mode jeu (plateformer) ----------
const keys={l:0,r:0,d:0,run:0};let jumpReq=false,st=null,raf=0;
const KMAP={arrowleft:'l',q:'l',a:'l',arrowright:'r',d:'r',arrowdown:'d',s:'d',shift:'run'};
const isJump=k=>k===' '||k==='arrowup'||k==='z'||k==='w';
addEventListener('keydown',e=>{const k=e.key.toLowerCase();
  if(playing){
    if(k==='escape'){if(!e.repeat)toggleMenu();e.preventDefault();return}
    if(KMAP[k]){keys[KMAP[k]]=1;e.preventDefault()}else if(isJump(k)){if(!e.repeat)jumpReq=true;keys.j=1;e.preventDefault()}return}
  if(['INPUT','SELECT'].includes(e.target.tagName)||!sel||!k.startsWith('arrow'))return;
  const d=e.shiftKey?10:1;
  if(k==='arrowleft')sel.x-=d;if(k==='arrowright')sel.x+=d;if(k==='arrowup')sel.y-=d;if(k==='arrowdown')sel.y+=d;
  e.preventDefault();place()});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(!playing)return;if(KMAP[k])keys[KMAP[k]]=0;if(isJump(k)){keys.j=0;e.preventDefault()}});
document.querySelectorAll('#pad button').forEach(b=>{const k=b.dataset.k;
  b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=1;if(k==='j')jumpReq=true});
  ['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,()=>{keys[k]=0}))});
const releaseKeys=()=>{keys.l=keys.r=keys.d=keys.run=keys.j=0;jumpReq=false};

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
const CRUMBLE=.45,CRUMBLE_BACK=3;
// ---------- Niveaux ----------
// Une zone = { p:plateformes, w:murs, d:portes, k:clés, m:mouvantes, e:ennemis, v:mouches, f:flammes, t:voix off, g:sortie }
//  p : [type,x1,x2,y,(pont?)]  types : p normale · i glace · b ressort · r pointes · c planche fragile
//  w : [x,y1,y2]               d : [id,x,y1,y2]      k : [x,y,id,(texte)]
//  m : [largeur,x,y,ampX,ampY,période]               e : [x1,x2,y,vitesse,(1 = hérisson)]
//  v : [cx,cy,ampX,ampY,période,(1 = hérisson),(déphasage)]
//  f : [x,y,période,déphasage]    t : T(x,y,rayon,texte)    g : [x,y] la porte de sortie
const LEVELS=[
{name:'Premiers traits',tag:'Tutoriel',desc:'Marcher, sauter, courir, rebondir, glisser, éviter, écraser, attendre.',start:[0,0,100,G],zones:{
 '0,0':{p:[['p',0,1000,G]],
  t:[T(110,G,90,"Bienvenue sur la page. Ici, tout est dessiné à l’encre."),T(430,G,80,"Marche avec ← → (ou Q D). Va vers la droite."),T(880,G,80,"Parfait. Tu sais marcher. La page continue.")]},
 '1,0':{p:[['p',0,1000,G]],w:[[560,G-55,G]],
  t:[T(120,G,100,"Pour sauter : Espace (ou ↑ ou Z). Un appui bref donne un petit saut."),T(430,G,80,"Un mur ! Saute par-dessus."),T(830,G,100,"Bien joué. Plus tu restes appuyé, plus tu sautes haut.")]},
 '2,0':{p:[['p',0,400,G],['p',560,1000,G]],
  t:[T(150,G,100,"Un trou ! Maintiens Espace pour sauter plus loin."),T(850,G,100,"Si tu tombes, la page te remet juste avant. Pas de panique.")]},
 '3,0':{p:[['p',0,1000,G],['p',210,350,G-90],['p',370,480,G-180]],w:[[520,G-230,G]],
  t:[T(110,G,100,"Un grand mur ! Grimpe par les plateformes : elles se traversent par en dessous."),T(780,G,110,"Pour descendre à travers une plateforme : ↓ + Espace.")]},
 '4,0':{p:[['p',0,330,G],['p',580,1000,G]],
  t:[T(120,G,100,"Trop large pour marcher ! Maintiens Maj pour courir, puis saute."),T(830,G,100,"Courir, c’est quand même plus rapide.")]},
 '5,0':{p:[['p',0,300,G],['b',300,400,G],['p',400,1000,G]],w:[[470,G-250,G]],
  t:[T(120,G,100,"Un mur trop haut. Le vert fait rebondir ! Marche dessus, puis avance."),T(820,G,100,"Boing ! Les ressorts verts, c’est la vie.")]},
 '6,0':{p:[['p',0,60,G],['i',60,640,G],['p',740,1000,G]],
  t:[T(150,G,90,"La glace (en bleu) glisse. Anticipe tes arrêts."),T(560,G,70,"Saute avant le bord : en l’air, tu contrôles tout.")]},
 '7,0':{p:[['p',0,400,G],['r',400,520,G],['p',520,1000,G]],
  t:[T(170,G,100,"Le rouge pique ! Saute par-dessus."),T(800,G,100,"Pas une égratignure. Les pointes sont déçues.")]},
 '8,0':{p:[['p',0,1000,G]],e:[[380,700,G,70]],
  t:[T(150,G,100,"Un ennemi ! Saute-lui dessus pour l’écraser."),T(870,G,100,"De côté, c’est lui qui gagne. Retiens-le.")]},
 '9,0':{p:[['p',0,250,G],['p',750,1000,G]],m:[[110,380,540,70,0,4],[110,620,540,70,0,4]],
  t:[T(110,G,100,"Une plateforme orange bouge. Monte dessus, attends, puis saute."),T(880,G,90,"Bien sauté. Ou bien tu as eu de la chance.")]},
 '10,0':{p:[['p',0,1000,G]],f:[[500,G,4,0]],
  t:[T(190,G,110,"Un lance-flammes ! Attends qu’elle s’éteigne pour traverser."),T(850,G,100,"Tu n’as pas l’air cuit. Tant mieux.")]},
 '11,0':{p:[['p',0,1000,G]],g:[820,G],
  t:[T(150,G,100,"Tu sais tout faire. Presque tout."),T(620,G,100,"Passe la porte pour finir le tutoriel.")]}
}},

{name:'Trampolines',tag:'Ressorts',desc:'Rebondis de ressort en ressort, même au-dessus des pointes.',start:[0,1,100,G],zones:{
 '0,1':{p:[['p',0,120,G],['b',120,210,G],['p',210,1000,G],['p',220,330,280],['b',340,420,280]],
  t:[T(100,G,90,"Les ressorts verts te lancent bien plus haut que ton saut. Marche dessus."),T(330,280,90,"Encore un ressort ! Celui-là t’envoie à la page du dessus.")]},
 '0,0':{p:[['p',0,520,G],['b',640,730,470],['p',880,1000,G]],
  t:[T(430,G,100,"Un trou énorme. Même en courant, impossible. Un ressort flotte au milieu…"),T(940,G,60,"Si tu tombes, tu retrouves la page d’en dessous.")]},
 '1,0':{p:[['p',0,120,G],['r',120,880,G],['p',880,1000,G],['b',220,300,470],['b',480,560,470],['b',740,820,470]],
  t:[T(60,G,60,"Les pointes en bas, les ressorts en haut. Rebondis de l’un à l’autre."),T(930,G,60,"Bien rebondi.")]},
 '2,0':{p:[['p',0,440,G],['b',440,540,G],['p',540,1000,G]],w:[[620,G-300,G]],g:[860,G],
  t:[T(150,G,100,"Un mur beaucoup trop haut… mais tu as un ressort."),T(760,G,90,"Passe la porte. Sauter, c’est presque voler.")]}
}},

{name:'Bestioles',tag:'Ennemis',desc:'Écrase-les par le dessus. De côté, ce sont eux qui gagnent.',start:[0,0,100,G],zones:{
 '0,0':{p:[['p',0,1000,G]],e:[[300,520,G,70],[620,860,G,90]],
  t:[T(100,G,90,"Les ennemis patrouillent. Écrase-les en leur sautant dessus."),T(570,G,45,"Un ennemi écrasé ne fait plus de bruit.")]},
 '1,0':{p:[['p',0,1000,G],['p',180,400,G-140],['p',600,820,G-140]],e:[[100,900,G,100],[200,380,G-140,50],[620,800,G-140,50]],
  t:[T(60,G,50,"Il y en a aussi sur les plateformes. Garde un œil en haut.")]},
 '2,0':{p:[['p',0,160,G],['p',240,420,G],['p',500,680,G],['p',760,1000,G]],e:[[250,410,G,60],[510,670,G,60]],
  t:[T(80,G,80,"Plus de sol ? Saute sur les ennemis : ils font de bons tremplins.")]},
 '3,0':{p:[['p',0,1000,G],['p',560,680,G-90],['p',780,980,G-180]],e:[[140,520,G,150],[790,900,G-180,50]],g:[950,G-180],
  t:[T(100,G,90,"Le dernier ennemi garde la porte, là-haut."),T(480,G,50,"Celui-là court vite. Saute avant qu’il arrive !")]}
}},

{name:'Patinoire',tag:'Glace · précision',desc:'Tout glisse. Garde ton élan et pense à freiner à l’avance.',start:[0,0,100,G],zones:{
 '0,0':{p:[['p',0,160,G],['i',160,420,G],['r',420,500,G],['i',500,780,G],['r',780,860,G],['i',860,1000,G]],
  t:[T(100,G,60,"De la glace partout. Les pointes, elles, ne glissent pas.")]},
 '1,0':{p:[['p',0,100,G],['r',100,900,G],['p',900,1000,G],['i',140,260,470],['i',320,450,380],['i',510,640,290],['i',700,830,380]],
  t:[T(60,G,50,"Des îlots de glace au-dessus des pointes. Garde ton élan.")]},
 '2,0':{p:[['i',0,380,G],['r',380,440,G],['i',440,1000,G]],w:[[250,G-100,G],[560,G-140,G],[800,G-100,G]],
  t:[T(100,G,80,"Les murs ne glissent pas, eux. Saute avant de les toucher.")]},
 '3,0':{p:[['i',0,560,G],['r',560,680,G],['i',680,1000,G]],e:[[720,880,G,80,1]],g:[950,G],
  t:[T(120,G,100,"Dernier patinage : un hérisson sur la glace. Bonne chance."),T(620,G,45,"Tu as de l’élan ? Tant mieux.")]}
}},

{name:'Planches fragiles',tag:'Vitesse',desc:'Les planches s’effondrent sous tes pieds : ne t’arrête surtout pas.',start:[0,0,100,G],zones:{
 '0,0':{p:[['p',0,200,G],['r',200,920,G],['p',920,1000,G],['c',220,320,540],['c',360,460,540],['c',500,600,540],['c',640,740,540],['c',780,880,540]],
  t:[T(100,G,90,"Ces planches orange s’effondrent dès que tu les touches. Cours !")]},
 '1,0':{p:[['p',0,100,G],['r',100,830,G],['p',830,1000,G],['c',130,230,500],['c',270,370,430],['c',410,510,360],['c',550,650,430],['c',690,790,500]],
  t:[T(60,G,50,"Monte vite, et redescends encore plus vite.")]},
 '2,0':{p:[['p',0,100,G],['r',100,1000,G],['c',130,230,520],['c',280,380,450],['c',430,530,380],['c',580,680,310],['p',730,980,310]],g:[900,310],
  t:[T(60,G,50,"Dernière montée. Ne t’arrête pas.")]}
}},

{name:'Clé, serrure, porte',tag:'Réflexion',desc:'Deux portes fermées, deux clés cachées. Réfléchis au chemin.',start:[0,1,100,G],zones:{
 '0,1':{p:[['p',0,1000,G],['p',300,440,460],['p',500,640,330],['p',700,840,200]],d:[['a',930,G-420,G]],
  t:[T(150,G,110,"Une porte fermée à droite. Il te faut une clé : cherche-la en haut."),T(770,200,80,"Saute depuis le haut : la page du dessus t’attend.")]},
 '0,0':{p:[['p',0,300,G],['r',300,440,G],['p',440,560,G],['p',560,720,G,true],['p',720,1000,G]],k:[[120,G,'a']],
  t:[T(210,G,70,"Une clé ! Pour redescendre : ↓ + Espace sur le pont."),T(830,G,100,"La clé est au bout de la page, derrière les pointes.")]},
 '1,1':{p:[['p',0,1000,G],['p',150,290,470],['p',340,420,360],['b',420,480,360]],d:[['b',930,G-420,G]],
  t:[T(60,G,60,"Une deuxième porte… et un ressort qui monte haut."),T(790,G,100,"Reviens ici quand tu auras la deuxième clé.")]},
 '1,0':{p:[['p',0,520,G],['p',520,660,G,true],['p',660,1000,G]],f:[[760,G,4,0]],k:[[900,G,'b']],
  t:[T(590,G,50,"Une flamme garde la clé. Attends qu’elle s’éteigne."),T(300,G,60,"Pour redescendre : ↓ + Espace sur le pont, au milieu.")]},
 '2,1':{p:[['p',0,300,G],['r',300,400,G],['p',400,1000,G]],g:[820,G],
  t:[T(100,G,100,"Plus de portes. Juste des pointes… et la sortie.")]}
}},

{name:'Crache-feu',tag:'Timing',desc:'Flammes en rythme et plateformes qui bougent : observe, puis fonce.',start:[0,0,100,G],zones:{
 '0,0':{p:[['p',0,1000,G]],f:[[400,G,4,0],[700,G,4,2]],
  t:[T(150,G,100,"Un lance-flammes ! Observe son rythme avant de passer."),T(550,G,50,"Un refuge entre deux flammes. Profites-en.")]},
 '1,0':{p:[['p',0,120,G],['r',120,880,G],['p',880,1000,G]],m:[[110,250,470,80,0,4],[110,500,420,0,50,3.2],[110,740,470,80,0,3.6]],
  t:[T(60,G,50,"Monte sur les plateformes orange. Choisis le bon moment.")]},
 '2,0':{p:[['p',0,1000,G]],f:[[250,G,3.2,2.4],[420,G,3.2,1.6],[590,G,3.2,.8],[760,G,3.2,0]],
  t:[T(100,G,90,"Quatre flammes en vague. Avance de refuge en refuge.")]},
 '3,0':{p:[['p',0,140,G],['p',800,1000,G]],m:[[110,270,480,70,0,3.6],[110,470,400,0,60,3],[110,650,480,70,0,3.2]],f:[[880,G,4,1]],g:[950,G],
  t:[T(60,G,50,"Dernier pont mouvant. Et une flamme à l’arrivée.")]}
}},

{name:'Hérissons et mouches',tag:'Danger',desc:'Les hérissons piquent même par le dessus. Les mouches volent partout.',start:[0,0,100,G],zones:{
 '0,0':{p:[['p',0,1000,G]],e:[[250,450,G,80,1],[560,860,G,110,1]],
  t:[T(100,G,90,"Les hérissons piquent même quand tu leur sautes dessus. Passe par-dessus !")]},
 '1,0':{p:[['p',0,250,G],['p',350,600,G],['p',700,1000,G]],v:[[300,G-120,0,70,2.4,0],[650,G-120,0,70,2.8,0,1.2]],
  t:[T(100,G,100,"Les mouches volent. Écrase-les par le dessus, ou attends qu’elles s’écartent.")]},
 '2,0':{p:[['p',0,100,G],['r',100,900,G],['p',900,1000,G],['p',160,840,G-130]],e:[[200,500,G-130,110,1],[520,800,G-130,90,1]],
  t:[T(60,G,50,"Deux hérissons sur un pont étroit. Saute au bon moment.")]},
 '3,0':{p:[['p',0,1000,G],['p',380,520,G-120]],e:[[180,360,G,130,1],[640,880,G,90,1]],v:[[520,G-150,160,0,3.6,0]],g:[950,G],
  t:[T(60,G,50,"Tout ensemble, maintenant. Ne te précipite pas.")]}
}},

{name:'La Gomme',tag:'Course',desc:'Une gomme géante avance derrière toi. Ne t’arrête pas.',start:[0,0,100,G],chase:{v:200,delay:0},zones:{
 '0,0':{p:[['p',0,520,G],['r',520,580,G],['p',580,1000,G]],w:[[300,G-55,G]],
  t:[T(100,G,90,"La gomme avance derrière toi ! Cours (Maj) sans t’arrêter.")]},
 '1,0':{p:[['p',0,300,G],['p',420,700,G],['p',820,1000,G]],t:[]},
 '2,0':{p:[['i',0,520,G],['r',520,600,G],['i',600,1000,G]],t:[T(100,G,60,"De la glace, maintenant. Ça glisse, mais la gomme, elle, ne ralentit pas.")]},
 '3,0':{p:[['p',0,300,G],['b',300,400,G],['p',400,1000,G]],w:[[470,G-250,G],[800,G-60,G]],t:[]},
 '4,0':{p:[['p',0,120,G],['r',120,880,G],['p',880,1000,G],['c',140,240,540],['c',280,380,540],['c',420,520,540],['c',560,660,540],['c',700,800,540]],t:[]},
 '5,0':{p:[['p',0,100,G],['r',100,900,G],['p',900,1000,G],['p',130,250,480],['p',300,420,400],['p',470,590,320],['p',640,760,400],['p',810,890,480]],t:[]},
 '6,0':{p:[['p',0,700,G],['r',700,800,G],['p',800,1000,G]],g:[920,G],
  t:[T(100,G,90,"Plus qu’un saut ! La gomme est juste derrière.")]}
}},

{name:'Le Grand Gribouillage',tag:'Finale',desc:'Tout ce que tu as appris, en une seule page.',start:[0,0,100,G],zones:{
 '0,0':{p:[['p',0,260,G],['r',260,340,G],['p',340,600,G],['b',600,680,G],['p',680,1000,G]],w:[[780,G-250,G]],
  t:[T(100,G,90,"Dernière page ! Tout ce que tu as appris va servir.")]},
 '1,0':{p:[['p',0,100,G],['r',100,900,G],['p',900,1000,G],['c',130,230,520],['c',270,370,450],['c',410,510,380],['c',550,650,450],['c',690,790,520]],t:[]},
 '2,0':{p:[['i',0,1000,G]],e:[[450,700,G,90,1]],f:[[300,G,4,0]],t:[]},
 '3,0':{p:[['p',0,140,G],['r',140,860,G],['p',860,1000,G]],m:[[110,270,470,80,0,4],[110,470,400,0,60,3.2],[110,680,470,80,0,3.6]],t:[]},
 '4,0':{p:[['p',0,120,G],['p',120,260,G,true],['p',260,1000,G]],d:[['a',900,G-420,G]],
  t:[T(60,G,50,"Une porte fermée. La clé doit être en bas…"),T(180,G,60,"↓ + Espace pour descendre sur le pont.")]},
 '4,1':{p:[['p',0,1000,G],['p',760,880,470],['p',640,720,360],['b',560,640,360]],e:[[340,600,G,100,1]],k:[[930,G,'a']],
  t:[T(190,G,70,"Le hérisson garde la clé. Elle ouvre la porte du dessus."),T(700,360,60,"Le ressort te ramène en haut.")]},
 '5,0':{p:[['p',0,120,G],['r',120,880,G],['p',880,1000,G],['b',220,300,470],['b',480,560,470],['b',740,820,470]],t:[]},
 '6,0':{p:[['p',0,1000,G]],e:[[200,420,G,120,1],[520,740,G,90]],f:[[820,G,3.6,0]],g:[940,G],
  t:[T(100,G,90,"Dernier effort. La sortie est juste derrière la flamme.")]}
}}
];

let Z=LEVELS[0].zones,lvIdx=0,zx=0,zy=0,cp=null,plat=null;
const has=(dx,dy)=>Z[(zx+dx)+','+(zy+dy)];

// ----- Progression (sauvegardée dans ce navigateur) -----
const PROGRESS_KEY='scribbled.levels.v1',UNLOCK_ALL=/[?&]niveaux=tous\b/.test(location.search);
let progress={done:{},last:0};
try{const r=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null');
  if(r&&typeof r==='object'){
    if(r.done&&typeof r.done==='object')for(const k of Object.keys(r.done)){const d=r.done[k],i=+k;
      if(Number.isInteger(i)&&i>=0&&i<LEVELS.length&&d&&Number.isFinite(d.time))progress.done[i]={time:d.time,deaths:Number.isFinite(d.deaths)?d.deaths:0}}
    if(Number.isInteger(r.last)&&r.last>=0&&r.last<LEVELS.length)progress.last=r.last}}catch(e){}
const saveProgress=()=>{try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress))}catch(e){}};
const unlocked=i=>UNLOCK_ALL||i===0||!!progress.done[i-1];
const menuAvailable=()=>UNLOCK_ALL||!!progress.done[0];
const updateUnlock=()=>document.body.classList.toggle('unlocked',menuAvailable());
const fmt=t=>{const m=Math.floor(t/60),r=t-m*60;return(m?m+':'+(r<10?'0':''):'')+r.toFixed(1)+' s'};
updateUnlock();

// ----- Dessins SVG des éléments -----
const INK='#2b2b3a',DC={a:'#d98324',b:'#8a3fc7'};
const starPts=(()=>{let p='';for(let i=0;i<10;i++){const r=i%2?7:16,a=-Math.PI/2+i*Math.PI/5;p+=`${(Math.cos(a)*r).toFixed(1)},${(Math.sin(a)*r-160).toFixed(1)} `}return p})();
const GOAL_SVG=`<path d="M-34 0 V-96 Q0 -140 34 -96 V0" fill="#ffe46b" fill-opacity=".5" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M-20 0 V-88 Q0 -112 20 -88 V0" fill="none" stroke="#e0453a" stroke-width="3" stroke-dasharray="6 5"/><polygon points="${starPts}" fill="#ffe46b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
const BLOB_SVG='<circle cx="0" cy="-16" r="16" fill="#fbf8ee" stroke="#2b2b3a" stroke-width="3"/><path d="M-10 -25 L-3 -20 M10 -25 L3 -20 M-8 -8 L-4 -11 L0 -8 L4 -11 L8 -8" stroke="#e0453a" stroke-width="3" fill="none"/>';
const SPIKY_SVG=`<path d="${[...Array(8)].map((_,i)=>{const a=i*Math.PI/4,c=Math.cos(a),s=Math.sin(a);return`M${(c*13).toFixed(1)} ${(-16+s*13).toFixed(1)} L${(c*24).toFixed(1)} ${(-16+s*24).toFixed(1)}`}).join(' ')}" stroke="#e0453a" stroke-width="4" stroke-linecap="round"/><circle cx="0" cy="-16" r="14" fill="${INK}"/><path d="M-9 -23 L-3 -18 M9 -23 L3 -18" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const FLY_SVG='<ellipse cx="0" cy="-16" rx="12" ry="9" fill="#fbf8ee" stroke="#2b2b3a" stroke-width="3"/><path d="M-4 -24 C-18 -44 -32 -26 -8 -20 M4 -24 C18 -44 32 -26 8 -20" fill="#ffffff99" stroke="#2b2b3a" stroke-width="2.5"/><circle cx="-4" cy="-17" r="2.2" fill="#e0453a"/><circle cx="4" cy="-17" r="2.2" fill="#e0453a"/>';
const FLY_SPIKY_SVG=FLY_SVG.replace('fill="#fbf8ee"','fill="#2b2b3a"');
const keySvg=c=>`<circle cx="0" cy="-8" r="9" fill="none" stroke="${c}" stroke-width="4"/><path d="M0 1 V30 M0 20 H9 M0 28 H7" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
const doorSvg=(id,x,a,b)=>{const c=DC[id]||'#d98324',m=(a+b)/2;return`<line x1="${x}" x2="${x}" y1="${a}" y2="${b}" stroke="#8b5a2b" stroke-width="14" stroke-linecap="round"/><line x1="${x}" x2="${x}" y1="${a}" y2="${b}" stroke="${c}" stroke-width="4" stroke-dasharray="10 8"/><circle cx="${x}" cy="${m}" r="15" fill="${c}" stroke="${INK}" stroke-width="3"/><path d="M${x} ${m-4} v11" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`};
const crumbSvg=([,a,b,y])=>`<line x1="${a}" x2="${b}" y1="${y}" y2="${y}" stroke="#c4893a" stroke-width="8" stroke-dasharray="17 5" stroke-linecap="round"/><path d="M${a+(b-a)*.3} ${y-3} l6 7 -5 5 M${a+(b-a)*.65} ${y-3} l-5 7 6 5" stroke="${INK}" stroke-width="2" fill="none"/>`;
const ERASER_SVG=(()=>{let d='M-1400 0 L0 0';for(let y=0,i=0;y<VH+40;y+=40,i++)d+=` L${i%2?-12:10} ${y+20}`;d+=' L0 700 L-1400 700 Z';
  return`<defs><pattern id="herase" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="14" stroke="#e3607f" stroke-width="3"/></pattern></defs><path d="${d}" fill="#f6b3c3" fill-opacity=".8"/><path d="${d}" fill="url(#herase)" fill-opacity=".55"/><path d="M0 0 L10 40 L-12 80 L10 120 L-12 160 L10 200 L-12 240 L10 280 L-12 320 L10 360 L-12 400 L10 440 L-12 480 L10 520 L-12 560 L10 600 L-12 640 L0 700" fill="none" stroke="#c0405f" stroke-width="5" stroke-linejoin="round"/>`})();

function build(){
  const z=Z[zx+','+zy],L=LEVELS[lvIdx],C={p:'#2b2b3a',i:'#3b82d6',b:'#2faa4a'};const FC={p:'#a1693c',i:'#6fb0ee',b:'#4fb866',r:'#e0605a'};
  let h='<defs>'+Object.entries(FC).map(([k,c])=>`<pattern id="h${k}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="9" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/></pattern>`).join('')+'</defs>';
  const gs=z.p.filter(q=>q[3]===G&&!q[4]&&q[0]!=='c'),bd=x=>`<line x1="${x}" x2="${x}" y1="${G}" y2="${VH}" stroke="#2b2b3a" stroke-width="5" stroke-linecap="round"/>`;
  gs.forEach(q=>{if(q[1]>0&&!gs.some(o=>o!==q&&o[2]===q[1]))h+=bd(q[1]);if(q[2]<VW&&!gs.some(o=>o!==q&&o[1]===q[2]))h+=bd(q[2])});
  z.p.forEach(([t,a,b,y,platform])=>{if(t==='c')return;
    if(y===G&&!platform)h+=`<rect x="${a}" y="${y}" width="${b-a}" height="${VH-y}" fill="${FC[t]}" opacity=".13"/><rect x="${a}" y="${y+4}" width="${b-a}" height="${VH-y-4}" fill="url(#h${t})"/>`;
    if(t==='r'){let d=`M${a} ${y}`;for(let x=a+8,u=1;x<=b;x+=8,u^=1)d+=` L${x} ${y-u*12}`;
    h+=`<path d="${d}" fill="none" stroke="#e0453a" stroke-width="4" stroke-linejoin="round"/>`}
    else h+=`<line x1="${a}" x2="${b}" y1="${y}" y2="${y}" stroke="${C[t]}" stroke-width="${t==='p'?5:8}" stroke-linecap="round"/>`});
  (z.w||[]).forEach(([x,a,b])=>h+=`<line x1="${x}" x2="${x}" y1="${a}" y2="${b}" stroke="#2b2b3a" stroke-width="8" stroke-linecap="round"/>`);
  (z.t||[]).forEach(t=>h+=`<text x="${t[0]}" y="${t[1]-85}" fill="${PU}" font-size="32" font-family="Patrick Hand,cursive" text-anchor="middle">?</text>`);
  plat.innerHTML=h;
  const NS='http://www.w3.org/2000/svg',mk=h=>{const g=document.createElementNS(NS,'g');g.innerHTML=h;plat.appendChild(g);return g};
  const at=(el,x,y)=>{el.setAttribute('transform',`translate(${x} ${y})`);return el};
  st.doors=(z.d||[]).map(([id,x,a,b])=>({id,x,a,b,el:mk(doorSvg(id,x,a,b))}));
  st.doors.forEach(d=>{if(st.keys.has(d.id))d.el.setAttribute('visibility','hidden')});
  st.cr=[];
  st.pl0=z.p.map(q=>{if(q[0]!=='c')return q;const o={t:-1,gone:0,back:0,el:mk(crumbSvg(q))};st.cr.push(o);return[q[0],q[1],q[2],q[3],q[4],o]});
  rebuildWalls();
  st.cur=null;st.ign=null;st.on=-1;st.noMp=0;
  st.ks=(z.k||[]).filter(k=>!st.keys.has(k[2])).map(([x,y,id,text])=>({x,y,id,text,el:at(mk(keySvg(DC[id]||'#d98324')),x,y-70)}));
  if(z.g)at(mk(GOAL_SVG),z.g[0],z.g[1]);
  st.mp=(z.m||[]).map(([w,x,y,dx,dy,T])=>({w,x,y,dx,dy,T,px:x,py:y,vx:0,vy:0,el:at(mk(`<line x1="${-w/2}" x2="${w/2}" y1="0" y2="0" stroke="#d98324" stroke-width="7" stroke-linecap="round"/>`),x,y)}));
  st.en=(z.e||[]).map(([a,b,y,v,k])=>({a,b,y,v,k:k||0,x:a,d:1,alive:1,el:at(mk(k?SPIKY_SVG:BLOB_SVG),a,y)}))
    .concat((z.v||[]).map(([cx,cy,ax,ay,T,k,ph])=>({fly:1,cx,cy,ax,ay,T,k:k||0,ph:ph||0,x:cx,y:cy,alive:1,el:at(mk(k?FLY_SPIKY_SVG:FLY_SVG),cx,cy)})));
  st.fl=(z.f||[]).map(([x,y,T,ph])=>{const el=mk('<rect x="-10" y="-8" width="20" height="8" fill="#2b2b3a"/><path fill="#f6b73c" stroke="#e0453a" stroke-width="2"/>');
    at(el,x,y);return{x,y,T,ph,p:el.querySelector('path')}});
  st.erEl=L.chase?mk(ERASER_SVG):null;
}
function rebuildWalls(){
  st.walls=[...(Z[zx+','+zy].w||[]),...st.doors.filter(d=>!st.keys.has(d.id)).map(d=>[d.x,d.a,d.b])];
  st.pl=[...st.pl0,...st.walls.map(([x,a])=>['p',x-HW,x+HW,a])];
}
const KW=[['#ff5a4d','rouge|piqu\\p{L}*|pointe\\p{L}*|aïe|mourir|gomme|effac\\p{L}*'],['#5ab0ff','glace|bleu|glisse\\p{L}*'],['#5fe07a','vert|rebond\\p{L}*|ressort\\p{L}*|boing'],
 ['#ffa53d','plateforme\\p{L}*|flamme\\p{L}*|chaud|orange|planche\\p{L}*|effondr\\p{L}*|lance-flammes'],['#ffe45c','saut\\p{L}*|splat|clé\\p{L}*|porte\\p{L}*|sortie|tutoriel'],
 ['#ff7ad9','ennemi\\p{L}*|hérisson\\p{L}*|mouche\\p{L}*|bestiole\\p{L}*'],['#c9a0ff','mur|murs|marches|secrète|fin|encre'],['#6be3e3','cour\\p{L}*|vite|rapide\\p{L}*|maj']]
  .map(([c,w])=>[c,new RegExp('^(?:'+w+')$','iu'),w]);
const KRE=new RegExp('(?<!\\p{L})(?:'+KW.map(k=>k[2]).join('|')+')(?!\\p{L})','giu');
function segs(t){const o=[];let l=0;for(const m of t.matchAll(KRE)){if(m.index>l)o.push([t.slice(l,m.index),0]);o.push([m[0],KW.find(k=>k[1].test(m[0]))[0]]);l=m.index+m[0].length}
  if(l<t.length)o.push([t.slice(l),0]);return o}
function paint(n){let h='',r=n;for(const[t,c]of st.segs){if(r<=0)break;const u=t.slice(0,r);r-=u.length;h+=c?`<span style="color:${c}">${u}</span>`:u}voice.innerHTML=h}
function say(t,hide){st.segs=segs(t);st.msg=t;st.n=0;st.hide=hide;voice.style.opacity=1;st.vis=1;voice.textContent=''}
const absX=(zoneX,X)=>zoneX*VW+X;
function resetEraser(delay){const c=LEVELS[lvIdx].chase;st.er=c?{x:absX(cp.zx,cp.X)-260,delay}:null}
function tr(dx,dy,X,Y){zx+=dx;zy+=dy;st.X=X;st.Y=Y;build();cp={zx,zy,X,Y}}
function die(msg){st.deaths++;say(msg||'Aïe ! On recommence.',2);zx=cp.zx;zy=cp.zy;st.X=cp.X;st.Y=cp.Y;st.vy=st.vx=0;build();resetEraser(.5)}
function fit(){const k=Math.min(innerWidth/VW,innerHeight/VH);
  layer.style.cssText=`inset:auto;left:${(innerWidth-VW*k)/2}px;top:${(innerHeight-VH*k)/2}px;width:${VW}px;height:${VH}px;transform-origin:0 0;transform:scale(${k})`}
addEventListener('resize',()=>{if(playing)fit();else place()});

// ----- Niveaux : démarrage, victoire, menu -----
const hudEl=$('hud'),winEl=$('win'),menuEl=$('lvlMenu');
function startLevel(i){
  if(!(i>=0&&i<LEVELS.length)||!unlocked(i))i=0;
  lvIdx=i;progress.last=i;saveProgress();
  const L=LEVELS[i],[sx,sy,X,Y]=L.start;Z=L.zones;zx=sx;zy=sy;cp={zx,zy,X,Y};
  Object.assign(st,{X,Y,vx:0,vy:0,dir:1,ground:true,surf:'p',jmp:0,phase:0,amp:0,msg:'',n:0,hide:0,vis:0,t:0,lt:0,deaths:0,done:0,paused:0,keys:new Set(),hudText:''});
  releaseKeys();voice.style.opacity=0;voice.textContent='';
  hideWin();closeMenu(true);build();resetEraser(L.chase?L.chase.delay:0);updateHud();
}
function updateHud(){
  const L=LEVELS[lvIdx],txt=`Niveau ${lvIdx+1} · ${L.name}   ⏱ ${fmt(st.lt)}   ☠ ${st.deaths}`;
  if(txt!==st.hudText){st.hudText=txt;hudEl.textContent=txt}
}
function winLevel(){
  const s=st,L=LEVELS[lvIdx],prev=progress.done[lvIdx],first=!prev,record=!prev||s.lt<prev.time;
  s.done=1;releaseKeys();voice.style.opacity=0;
  progress.done[lvIdx]={time:record?s.lt:prev.time,deaths:record?s.deaths:prev.deaths};saveProgress();updateUnlock();
  const last=lvIdx===LEVELS.length-1;
  winEl.replaceChildren();
  const el=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt)e.textContent=txt;if(cls)e.className=cls;return e};
  const panel=el('div',null,'lvl-panel');
  panel.appendChild(el('h2',last?'Bravo, tu as tout fini !':'Niveau terminé !'));
  panel.appendChild(el('p',`${L.name} — ⏱ ${fmt(s.lt)} · ☠ ${s.deaths}${record&&!first?' · nouveau record !':''}`));
  if(lvIdx===0)panel.appendChild(el('p','Le menu des niveaux est débloqué : le bouton « ☰ Niveaux » est en haut à droite de l’écran.'));
  if(last)panel.appendChild(el('p','Merci d’avoir joué. La page est à toi : redessine ton personnage et recommence.'));
  const row=el('div',null,'row');
  if(!last){const b=el('button','Niveau suivant ▶');b.onclick=()=>playLevel(lvIdx+1);row.appendChild(b)}
  const r=el('button','↻ Rejouer');r.onclick=()=>playLevel(lvIdx);row.appendChild(r);
  const m=el('button','☰ Niveaux');m.onclick=()=>{hideWin();openMenu()};row.appendChild(m);
  panel.appendChild(row);winEl.appendChild(panel);winEl.hidden=false;
  const first_btn=row.querySelector('button');if(first_btn)first_btn.focus();
}
function hideWin(){winEl.hidden=true;winEl.replaceChildren()}
function renderMenu(){
  const grid=$('lvlGrid');grid.replaceChildren();
  LEVELS.forEach((L,i)=>{
    const b=document.createElement('button'),open=unlocked(i),d=progress.done[i];
    b.type='button';b.className='lvl-card'+(i===lvIdx&&playing?' on':'');b.disabled=!open;
    const add=(t,c)=>{const s=document.createElement('span');s.className=c;s.textContent=t;b.appendChild(s)};
    add((open?'':'🔒 ')+(i+1)+'. '+L.name,'lvl-num');add(L.tag,'lvl-tag');
    add(open?(d?`✓ ${fmt(d.time)} · ☠ ${d.deaths}`:L.desc):'Termine le niveau précédent.',d?'lvl-best':'lvl-desc');
    b.onclick=()=>playLevel(i);grid.appendChild(b);
  });
}
function openMenu(){
  if(!menuAvailable())return;
  if(st&&!st.done){st.paused=1;releaseKeys()}
  renderMenu();menuEl.hidden=false;
  const f=$('lvlGrid').querySelector('button:not([disabled])');if(f)f.focus();
}
function closeMenu(silent){
  menuEl.hidden=true;
  if(!silent&&st&&!st.done&&winEl.hidden){st.paused=0;releaseKeys()}
}
function toggleMenu(){if(!menuAvailable()||!winEl.hidden)return;menuEl.hidden?openMenu():closeMenu()}
function playLevel(i){
  if(!unlocked(i))return;
  progress.last=i;saveProgress();menuEl.hidden=true;hideWin();
  if(!playing)togglePlay();else startLevel(i);
}
$('lvlBtn').onclick=openMenu;$('lvlBtnEdit').onclick=openMenu;$('lvlClose').onclick=()=>closeMenu();
menuEl.addEventListener('pointerdown',e=>{if(e.target===menuEl)closeMenu()});

function togglePlay(){
  if(!playing){
    if(!parts.length)return;
    document.activeElement.blur();
    const b=bounds(),gs=Math.max(.15,Math.min(1,110/b.h));$('gs').value=gs;syncRangeValue('gs');
    plat=document.createElementNS('http://www.w3.org/2000/svg','svg');plat.id='plat';plat.setAttribute('viewBox',`0 0 ${VW} ${VH}`);
    layer.insertBefore(plat,actor);
    st={b,gs,X:100,Y:G,vx:0,vy:0,dir:1,ground:true,surf:'p',phase:0,amp:0,msg:'',n:0,hide:0,t:0,lt:0,deaths:0,on:-1,noMp:0,mp:[],en:[],fl:[],cr:[],ks:[],doors:[],pl:[],pl0:[],walls:[],keys:new Set()};
    playing=true;document.body.classList.add('play');$('pad').style.display='flex';$('play').textContent='■ Éditer';
    startLevel(progress.last);fit();place();let t0=performance.now();
    const loop=t=>{step(Math.min(.033,(t-t0)/1000));t0=t;raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);
  }else{
    cancelAnimationFrame(raf);playing=false;document.body.classList.remove('play');$('pad').style.display='none';
    plat.remove();layer.style.cssText='';actor.style.transform='none';voice.style.opacity=0;releaseKeys();
    hideWin();menuEl.hidden=true;
    $('play').textContent='▶ Jouer';place();
  }
}
$('play').onclick=togglePlay;
const activateHomeMenu=()=>{
  if($('homeScreen').classList.contains('expanded'))return;
  $('homeScreen').classList.add('expanded');
  $('homeChoices').hidden=false;
  $('homeLogo').setAttribute('aria-expanded','true');
};
$('homeScreen').addEventListener('click',activateHomeMenu);
$('homePlay').onclick=()=>{
  document.body.classList.remove('home');
  $('homeScreen').hidden=true;
  togglePlay();
};
$('homeCharacters').onclick=()=>{
  document.body.classList.remove('home');
  $('homeScreen').hidden=true;
  $('newCharacter').focus();
};
$('homeCreditsButton').onclick=()=>{
  $('homeChoices').hidden=true;
  $('homeCredits').hidden=false;
  $('homeCreditsBack').focus();
};
$('homeCreditsBack').onclick=()=>{
  $('homeCredits').hidden=true;
  $('homeChoices').hidden=false;
  $('homeCreditsButton').focus();
};
$('homeReturn').onclick=()=>{
  $('homeScreen').hidden=false;
  $('homeScreen').classList.remove('expanded');
  $('homeChoices').hidden=true;
  $('homeCredits').hidden=true;
  $('homeLogo').setAttribute('aria-expanded','false');
  document.body.classList.add('home');
};
$('gs').oninput=e=>{if(st)st.gs=+e.target.value};
rangeIds.forEach(id=>{
  const range=$(id),value=$(id+'Value');
  range.addEventListener('input',()=>syncRangeValue(id));
  value.addEventListener('input',()=>{
    const next=value.valueAsNumber;
    if(Number.isFinite(next)&&next>=range.min*1&&next<=range.max*1){
      range.value=String(next);
      range.dispatchEvent(new Event('input',{bubbles:true}));
    }
  });
  value.addEventListener('change',()=>{
    const next=value.valueAsNumber;
    range.value=String(Number.isFinite(next)?Math.max(+range.min,Math.min(+range.max,next)):+range.value);
    range.dispatchEvent(new Event('input',{bubbles:true}));
    syncRangeValue(id);
  });
  syncRangeValue(id);
});
function step(dt){
  const s=st;if(s.paused||s.done)return;
  const z=Z[zx+','+zy],L=LEVELS[lvIdx],ch=s.b.h*s.gs,ax=keys.r-keys.l,sp=keys.run?400:230,ice=s.ground&&s.surf==='i';
  s.t+=dt;s.lt+=dt;
  for(const m of s.mp){const a=s.t*6.2832/m.T,nx=m.x+m.dx*Math.sin(a),ny=m.y+m.dy*Math.sin(a);m.vx=nx-m.px;m.vy=ny-m.py;m.px=nx;m.py=ny;m.el.setAttribute('transform',`translate(${nx} ${ny})`)}
  for(const c of s.cr){
    if(c.gone){c.back-=dt;if(c.back<=0){c.gone=0;c.t=-1;c.el.setAttribute('visibility','visible');c.el.setAttribute('transform','translate(0 0)')}}
    else if(c.t>=0){c.t+=dt;c.el.setAttribute('transform',`translate(${((Math.random()-.5)*3).toFixed(1)} ${((Math.random()-.5)*3).toFixed(1)})`);
      if(c.t>=CRUMBLE){c.gone=1;c.back=CRUMBLE_BACK;c.el.setAttribute('visibility','hidden')}}}
  if(s.on>=0&&s.mp[s.on]){s.X+=s.mp[s.on].vx;s.Y+=s.mp[s.on].vy}
  s.vx=ice?s.vx+(ax*sp-s.vx)*Math.min(1,dt*1.5):ax*sp;if(ax)s.dir=ax;
  if(jumpReq){jumpReq=false;if(s.ground){const dropAtGround=s.pl.some(([t,a,b,y,drop])=>drop&&s.Y===y&&s.X>=a-6&&s.X<=b+6);
    if(keys.d&&(s.Y<G-1||dropAtGround)){s.ign=s.Y;s.noMp=.35;s.vy=60}else{s.vy=-790;s.jmp=1}s.ground=false}}
  s.vy+=(1900+(s.jmp&&!keys.j&&s.vy<0?3200:0))*dt;if(s.vy>=0)s.jmp=0;const py=s.Y;let nx=s.X+s.vx*dt;
  for(const[x,a,b]of s.walls)if(Math.abs(nx-x)<HW&&s.Y>a&&s.Y-ch<b){nx=s.X<x?x-HW:x+HW;s.vx=0}
  s.X=nx;
  if(s.X<0){if(has(-1,0)&&!z.nl)tr(-1,0,VW-2,s.Y);else s.X=0}
  else if(s.X>VW){if(has(1,0)&&!z.nr)tr(1,0,2,s.Y);else s.X=VW}
  s.Y+=s.vy*dt;s.ground=false;
  if(s.vy>=0)for(const[t,a,b,y,,o]of s.pl){
    if(t==='r'||y===s.ign||(o&&o.gone))continue;
    if(py<=y+.5&&s.Y>=y&&s.X>=a-6&&s.X<=b+6){
      s.Y=y;s.surf=t;if(t==='b')s.vy=-1150;else{s.vy=0;s.ground=true}
      if(o&&o.t<0)o.t=0;break}}
  let on=-1;if(s.vy>=0&&!s.ground&&s.noMp<=0)s.mp.forEach((m,i)=>{if(!s.ground&&py<=m.py+8&&s.Y>=m.py&&Math.abs(s.X-m.px)<=m.w/2+6){s.Y=m.py;s.vy=0;s.ground=true;s.surf='p';on=i}});
  s.on=on;s.noMp-=dt;
  for(const[t,a,b,y]of z.p)if(t==='r'&&s.Y>=y-14&&s.Y<=y+40&&s.X>=a&&s.X<=b){die();return}
  if(s.ign!==null&&s.Y>s.ign+8)s.ign=null;
  if(s.Y-ch<0){if(has(0,-1)&&!z.nu){tr(0,-1,s.X,G-5);s.vy=Math.min(s.vy,-750)}else{s.Y=ch;s.vy=Math.max(s.vy,0)}}
  else if(s.Y>VH+60){if(has(0,1))tr(0,1,s.X,ch+10);else{die();return}}
  for(const e of s.en){if(!e.alive)continue;
    if(e.fly){const a=(s.t+e.ph)*6.2832/e.T;e.x=e.cx+e.ax*Math.sin(a);e.y=e.cy+e.ay*Math.sin(e.ax&&e.ay?2*a:a)}
    else{e.x+=e.d*e.v*dt;if(e.x>e.b){e.x=e.b;e.d=-1}if(e.x<e.a){e.x=e.a;e.d=1}}
    e.el.setAttribute('transform',`translate(${e.x} ${e.y})`);
    if(Math.abs(s.X-e.x)<24&&s.Y>e.y-32&&s.Y-ch<e.y){
      if(!e.k&&s.vy>0&&py<=e.y-(e.fly?8:20)){e.alive=0;e.el.setAttribute('visibility','hidden');s.vy=-560;s.ground=false;say('Splat.',1.5)}else{die();return}}}
  for(const f of s.fl){const ph=(s.t+f.ph)%f.T,h=ph<1.5?180:ph>f.T-.7?22:0,q=h*(.93+Math.random()*.07);
    f.p.setAttribute('d',h?`M-10 -8 L-14 ${-8-q*.5} L-5 ${-8-q*.8} L0 ${-8-q} L6 ${-8-q*.7} L14 ${-8-q*.45} L10 -8 Z`:'');
    if(h>100&&Math.abs(s.X-f.x)<14&&s.Y>f.y-h-8&&s.Y-ch<f.y){die();return}}
  for(const k of s.ks){if(k.got)continue;
    k.el.setAttribute('transform',`translate(${k.x} ${k.y-70+Math.sin(s.t*3+k.x)*4})`);
    if(Math.abs(s.X-k.x)<30&&s.Y>k.y-87&&s.Y-ch<k.y-40){
      k.got=1;s.keys.add(k.id);k.el.setAttribute('visibility','hidden');
      s.doors.forEach(d=>{if(d.id===k.id)d.el.setAttribute('visibility','hidden')});rebuildWalls();
      say(k.text||'Clic ! Une porte vient de s’ouvrir quelque part.',2.5)}}
  if(L.chase&&s.er){
    if(s.er.delay>0)s.er.delay-=dt;else s.er.x+=L.chase.v*dt;
    const lx=s.er.x-zx*VW;
    if(s.erEl){s.erEl.setAttribute('transform',`translate(${lx.toFixed(1)} 0)`);s.erEl.setAttribute('visibility',lx>-30?'visible':'hidden')}
    if(absX(zx,s.X)<s.er.x){die('Effacé ! On recommence.');return}}
  if(z.g&&Math.abs(s.X-z.g[0])<26&&s.Y>z.g[1]-110&&s.Y<z.g[1]+24){winLevel();return}
  let cur=null;for(const t of z.t||[])if(Math.abs(s.X-t[0])<t[2]&&Math.abs(s.Y-t[1])<130){cur=t;break}
  if(cur!==s.cur){s.cur=cur;if(cur){if(cur[3]===s.msg&&s.vis)s.hide=0;else say(cur[3],0)}else s.hide=2.5}
  if(s.n<s.msg.length){s.n+=dt*45;paint(s.n|0)}
  if(s.hide>0){s.hide-=dt;if(s.hide<=0){voice.style.opacity=0;s.vis=0}}
  const moving=ax&&s.ground;if(moving)s.phase+=dt*(keys.run?15:10);
  s.amp+=((s.ground?(moving?1:0):.5)-s.amp)*Math.min(1,dt*15);
  const sw=Math.sin(s.phase)*34*s.amp,bob=-Math.abs(Math.sin(s.phase))*6*s.amp;
  parts.forEach(p=>style(p.sc,p,p.anim==='A'?sw:p.anim==='B'?-sw:0,p.anim==='bob'?bob:0));
  actor.style.transformOrigin=`${s.b.cx}px ${s.b.fy}px`;
  actor.style.transform=`translate(${s.X-s.b.cx}px,${s.Y-s.b.fy}px) scale(${s.dir*s.gs},${s.gs})`;
  updateHud();
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

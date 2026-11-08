import {RI,shuffle,el} from './util.js';
const DIFFS={EASY:41,MEDIUM:32,HARD:26};
function ok(g,i,v){const r=i/9|0,c=i%9;
  for(let k=0;k<9;k++){if(g[r*9+k]===v||g[k*9+c]===v)return false;}
  const br=(r/3|0)*3,bc=(c/3|0)*3;
  for(let a=0;a<3;a++)for(let b=0;b<3;b++)if(g[(br+a)*9+bc+b]===v)return false;
  return true;}
function genFull(){const g=Array(81).fill(0);
  const fill=i=>{if(i===81)return true;
    for(const v of shuffle([1,2,3,4,5,6,7,8,9]))
      if(ok(g,i,v)){g[i]=v;if(fill(i+1))return true;g[i]=0;}
    return false;};
  fill(0);return g;}
function countSol(g,cap){let n=0;
  const bt=()=>{if(n>=cap)return;let bi=-1,bc=null,bn=10;
    for(let i=0;i<81;i++)if(!g[i]){const c=[];for(let v=1;v<=9;v++)if(ok(g,i,v))c.push(v);
      if(c.length<bn){bn=c.length;bi=i;bc=c;if(bn<2)break;}}
    if(bi<0){n++;return;}
    for(const v of bc){g[bi]=v;bt();g[bi]=0;if(n>=cap)return;}};
  bt();return n;}
function generate(clues){const sol=genFull();const g=[...sol];
  const cells=shuffle([...Array(81).keys()]);let attempts=0;
  let have=81;
  for(const i of cells){if(have<=clues||attempts++>400)break;
    const bak=g[i];g[i]=0;
    if(countSol(g,2)!==1)g[i]=bak;else have--;}
  return{g,sol};}
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');wrap.appendChild(bar);
  const timerPill=el('span','pill','0:00');
  bar.appendChild(timerPill);
  const grid=el('div','su-grid');wrap.appendChild(grid);
  const tools=el('div','su-tools');wrap.appendChild(tools);
  const notesB=el('button','mini-btn','✎ NOTES'),errB=el('button','mini-btn on','ERRORS'),newB=el('button','mini-btn','NEW');
  tools.append(notesB,errB,newB);
  const pad=el('div','su-pad');wrap.appendChild(pad);
  let g,sol,notes,selIdx,notesMode,errOn,done,secs,timer;
  const cells=[];
  for(let i=0;i<81;i++){const c=el('div','su-c');
    if(i%9===2||i%9===5)c.classList.add('b3');
    if(i>=18&&i<=26||i>=45&&i<=53)c.classList.add('b9');
    if(i===27||i===35||i===44||i===52){} // borders handled above
    if(i%9===2||i%9===5){}
    c.addEventListener('click',()=>{select(i);});
    cells.push(c);grid.appendChild(c);}
  // 3x3 box right/bottom borders fix
  for(let i=0;i<81;i++){const r=i/9|0,c=i%9;
    cells[i].classList.toggle('b3',c===2||c===5);
    cells[i].classList.toggle('b9',r===2||r===5);}
  function startTimer(){clearInterval(timer);timer=setInterval(()=>{secs++;
    timerPill.textContent=`${secs/60|0}:${String(secs%60).padStart(2,'0')}`;},1000);
    api.tc(()=>clearInterval(timer));}
  function select(i){selIdx=i;render();api.snd('move');}
  function render(){
    for(let i=0;i<81;i++){const c=cells[i];
      c.classList.remove('sel','peer','same','bad','given');
      c.innerHTML='';
      if(!g[i]&&notes[i]){const nd=el('div','su-notes');
        for(let d=1;d<=9;d++){const s=el('span','',notes[i].has(d)?d:'');nd.appendChild(s);}
        c.appendChild(nd);}
      else c.textContent=g[i]||'';
      if(sol&&g[i]&&g[i]===sol[i]&&givenSet.has(i))c.classList.add('given');
      if(errOn&&g[i]&&g[i]!==sol[i])c.classList.add('bad');}
    if(selIdx!=null){const r=selIdx/9|0,cc=selIdx%9,br=(r/3|0)*3,bc=(cc/3|0)*3;
      for(let i=0;i<81;i++){const rr=i/9|0,c2=i%9;
        if(i===selIdx)cells[i].classList.add('sel');
        else if(rr===r||c2===cc||(rr>=br&&rr<br+3&&c2>=bc&&c2<bc+3))cells[i].classList.add('peer');
        if(g[selIdx]&&g[i]===g[selIdx]&&i!==selIdx)cells[i].classList.add('same');}}}
  let givenSet=new Set();
  function input(v){if(done||selIdx==null||givenSet.has(selIdx))return;
    if(notesMode&&v){if(!g[selIdx]){notes[selIdx].has(v)?notes[selIdx].delete(v):notes[selIdx].add(v);api.snd('move');}}
    else{
      if(g[selIdx]===v){g[selIdx]=0;}
      else{g[selIdx]=v;notes[selIdx].clear();
        // purge notes in peers
        const r=selIdx/9|0,c=selIdx%9,br=(r/3|0)*3,bc=(c/3|0)*3;
        for(let i=0;i<81;i++){const rr=i/9|0,c2=i%9;
          if(rr===r||c2===c||(rr>=br&&rr<br+3&&c2>=bc&&c2<bc+3))notes[i].delete(v);}
        api.snd(v===sol[selIdx]?'pop':'flip');}
      if(g.every((x,i)=>x===sol[i])){done=true;clearInterval(timer);
        setTimeout(()=>api.win(secs,'Perfect logic.'),350);}}
    render();}
  api.on(window,'keydown',e=>{if(!api.running||api.paused)return;
    if(e.key>='1'&&e.key<='9')input(+e.key);
    else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){if(selIdx!=null&&!givenSet.has(selIdx)){g[selIdx]=0;notes[selIdx].clear();render();}}
    else if(e.key==='n'||e.key==='N')notesB.click();
    else if(e.key.startsWith('Arrow')&&selIdx!=null){let r=selIdx/9|0,c=selIdx%9;
      if(e.key==='ArrowUp')r=Math.max(0,r-1);if(e.key==='ArrowDown')r=Math.min(8,r+1);
      if(e.key==='ArrowLeft')c=Math.max(0,c-1);if(e.key==='ArrowRight')c=Math.min(8,c+1);
      select(r*9+c);}});
  const padBtns=[];
  for(let d=1;d<=9;d++){const b=el('button','',d+'<em></em>');
    b.addEventListener('click',()=>input(d));padBtns.push(b);pad.appendChild(b);}
  const erB=el('button','','⌫');erB.addEventListener('click',()=>input(0));pad.appendChild(erB);
  function updPadCounts(){for(let d=1;d<=9;d++){
    const n=g.filter(v=>v===d).length;
    padBtns[d-1].querySelector('em').textContent=Math.max(0,9-n);}}
  const origRender=render;render=()=>{origRender();updPadCounts();};
  notesB.addEventListener('click',()=>{notesMode=!notesMode;notesB.classList.toggle('on',notesMode);});
  errB.addEventListener('click',()=>{errOn=!errOn;errB.classList.toggle('on',errOn);render();});
  newB.addEventListener('click',()=>{build(curDiff);api.snd('click');});
  let curDiff='EASY';
  const sel=el('div','gbar');
  Object.keys(DIFFS).forEach(k=>{const b=el('button','mini-btn',k);
    b.addEventListener('click',()=>{sel.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');curDiff=k;build(k);});sel.appendChild(b);});
  sel.firstChild.classList.add('on');
  wrap.insertBefore(sel,bar);
  function build(diff){clearInterval(timer);secs=0;timerPill.textContent='0:00';done=false;
    const{g:pg,sol:ps}=generate(DIFFS[diff]);g=pg;sol=ps;
    givenSet=new Set(g.map((v,i)=>v?i:-1).filter(i=>i>=0));
    notes=Array.from({length:81},()=>new Set());
    selIdx=g.indexOf(0);if(api.running)startTimer();render();}
  build('EASY');
  return {start(){if(!done)startTimer();},restart(){build(curDiff);},
    pause(){clearInterval(timer);},
    resume(){if(!done)startTimer();},
    destroy(){clearInterval(timer);}};
}};
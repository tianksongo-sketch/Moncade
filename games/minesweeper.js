import {RI,el} from './util.js';
const DIFFS={EASY:[9,9,10],MEDIUM:[12,12,24],HARD:[16,16,48]};
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');wrap.appendChild(bar);
  const minePill=el('span','pill'),timerPill=el('span','pill','0:00');
  const flagBtn=el('button','mini-btn','⚑ FLAG');
  bar.append(minePill,flagBtn,timerPill);
  const grid=el('div','ms-grid');wrap.appendChild(grid);
  let W,H,M,cells,flags,revCount,started,dead,won,timer,secs,flagMode;
  const idx=(x,y)=>y*W+x;
  function nbrs(x,y){const out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<W&&Y<H)out.push(idx(X,Y));}return out;}
  function plant(safe){const banned=new Set([safe,...nbrs(safe%W,safe/W|0)]);
    let placed=0;while(placed<M){const i=RI(0,W*H-1);
      if(!cells[i].mine&&!banned.has(i)){cells[i].mine=true;placed++;}}}
  function count(i){const x=i%W,y=i/W|0;let n=0;nbrs(x,y).forEach(j=>{if(cells[j].mine)n++;});cells[i].n=n;}
  function startTimer(){if(timer)return;timer=setInterval(()=>{secs++;
    timerPill.textContent=`${secs/60|0}:${String(secs%60).padStart(2,'0')}`;},1000);api.tc(()=>clearInterval(timer));}
  function render(c,i){const b=c.el;b.className='ms-c'+(c.rev?' rev':'');
    if(c.rev){b.textContent=c.mine?'✱':c.n||'';if(c.mine)b.classList.add('mine');}
    else b.textContent=c.flag?'⚑':'';}
  function reveal(i){const st=[i];
    while(st.length){const j=st.pop(),c=cells[j];
      if(c.rev||c.flag)continue;c.rev=true;revCount++;render(c,j);
      if(c.mine){lose(j);return;}
      if(!c.n)nbrs(j%W,j/W|0).forEach(k=>st.push(k));}}
  function lose(hit){dead=true;clearInterval(timer);api.snd('die');
    cells.forEach((c,i)=>{if(c.mine){c.rev=true;render(c,i);}
      else if(c.flag){c.el.classList.add('wrong');}});
    setTimeout(()=>api.over(null,'Boom. The numbers warned you.'),450);}
  function checkWin(){if(revCount===W*H-M){won=true;clearInterval(timer);
    cells.forEach((c,i)=>{if(c.mine){c.el.textContent='⚑';}});
    api.snd('win');setTimeout(()=>api.win(secs,`Cleared ${W}×${H} with ${M} mines.`),400);}}
  function chord(i){const c=cells[i];if(!c.rev||!c.n)return;
    const ns=nbrs(i%W,i/W|0);const fl=ns.filter(j=>cells[j].flag).length;
    if(fl===c.n)ns.forEach(j=>{if(!cells[j].flag&&!cells[j].rev)reveal(j);});
    checkWin();}
  function click(i){if(dead||won)return;const c=cells[i];
    if(flagMode&&!c.rev){c.flag=!c.flag;flags+=c.flag?1:-1;render(c,i);updateMine();api.snd('move');return;}
    if(c.flag)return;
    if(!started){started=true;plant(i);cells.forEach((_,j)=>count(j));startTimer();}
    if(c.rev){chord(i);return;}
    reveal(i);api.snd('flip');checkWin();}
  function updateMine(){minePill.textContent='✱ '+(M-flags);}
  function build(key){clearInterval(timer);timer=null;
    [W,H,M]=DIFFS[key];secs=0;flags=0;revCount=0;started=false;dead=false;won=false;flagMode=false;
    flagBtn.classList.remove('on');timerPill.textContent='0:00';updateMine();
    grid.innerHTML='';grid.style.setProperty('--ms',W>12?'min(26px,calc((100vw - 60px)/'+W+'))':'30px');
    grid.style.gridTemplateColumns=`repeat(${W},var(--ms,28px))`;
    cells=Array.from({length:W*H},()=>({mine:false,n:0,rev:false,flag:false,el:null}));
    cells.forEach((c,i)=>{const b=el('button','ms-c');
      b.addEventListener('click',()=>click(i));
      b.addEventListener('contextmenu',e=>{e.preventDefault();
        if(!c.rev&&!dead&&!won){c.flag=!c.flag;flags+=c.flag?1:-1;render(c,i);updateMine();}});
      c.el=b;grid.appendChild(b);});}
  const sel=el('div','gbar');
  Object.keys(DIFFS).forEach(k=>{const b=el('button','mini-btn',k);
    b.addEventListener('click',()=>{sel.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');build(k);api.snd('click');});
    sel.appendChild(b);});
  wrap.insertBefore(sel,bar);
  sel.firstChild.classList.add('on');
  flagBtn.addEventListener('click',()=>{flagMode=!flagMode;flagBtn.classList.toggle('on',flagMode);});
  build('EASY');
  function restart(){build(sel.querySelector('.on').textContent);}
  return {start(){},restart,pause(){clearInterval(timer);timer=null;},
    resume(){if(started&&!dead&&!won)startTimer();},destroy(){clearInterval(timer);}};
}};
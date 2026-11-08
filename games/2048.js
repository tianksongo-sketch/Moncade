import {RI,swipe,el} from './util.js';
const N=4;
const SHADES={2:['var(--k3)','var(--w)'],4:['var(--k4)','var(--w)'],8:['var(--g1)','var(--w)'],16:['var(--g2)','var(--k0)'],
  32:['var(--g3)','var(--k0)'],64:['var(--w)','var(--k0)'],128:['var(--w)','var(--k0)'],256:['var(--w)','var(--k0)'],
  512:['var(--k0)','var(--w)'],1024:['var(--k0)','var(--w)'],2048:['var(--w)','var(--k0)']};
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const tools=el('div','gbar');wrap.appendChild(tools);
  const undoB=el('button','mini-btn','↩ UNDO'),newB=el('button','mini-btn','NEW GAME');
  tools.append(undoB,newB);
  const size=Math.min(88,((Math.min(api.stage.clientWidth||420,460))-50)/4|0);
  const gap=10,BS=size*N+gap*(N+1);
  const board=el('div','b2048');board.style.width=BS+'px';board.style.height=BS+'px';
  wrap.appendChild(board);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=el('div','bgc');
    b.style.cssText=`left:${gap+x*(size+gap)}px;top:${gap+y*(size+gap)}px;width:${size}px;height:${size}px`;
    board.appendChild(b);}
  const layer=el('div');layer.style.cssText='position:absolute;inset:0';board.appendChild(layer);
  let grid,score,over,won2048,prev=null,busy=false,gen=0;
  const pos=(x,y)=>`translate(${gap+x*(size+gap)}px,${gap+y*(size+gap)}px)`;
  function tileEl(v,x,y,cls){const t=el('div','tile'+(cls?' '+cls:''));
    const s=SHADES[Math.min(v,2048)]||['var(--w)','var(--k0)'];
    t.style.cssText+=`;width:${size}px;height:${size}px;background:${s[0]};color:${s[1]};
      font-size:${v>=1024?size*.3:size*.42}px;border:1px solid ${v>=512&&v<2048?'var(--g1)':'var(--k4)'};transform:${pos(x,y)}`;
    t.textContent=v;layer.appendChild(t);return t;}
  function spawn(){const empt=[];grid.forEach((row,y)=>row.forEach((t,x)=>{if(!t)empt.push([x,y]);}));
    if(!empt.length)return;const[x,y]=empt[RI(0,empt.length-1)];
    const v=Math.random()<.9?2:4;
    grid[y][x]={v,x,y,el:tileEl(v,x,y,'new')};}
  function snapshot(){prev={score,g:grid.map(r=>r.map(t=>t?t.v:0))};}
  function undo(){if(!prev||busy)return;api.snd('move');
    grid.forEach(r=>r.forEach(t=>t&&t.el.remove()));
    grid=prev.g.map((row,y)=>row.map((v,x)=>v?{v,x,y,el:tileEl(v,x,y)}:null));
    score=prev.score;api.score(score);prev=null;over=false;}
  function slide(line){const ts=line.filter(Boolean),out=[];let gain=0;
    for(let i=0;i<ts.length;i++){
      if(ts[i+1]&&ts[i+1].v===ts[i].v){out.push({v:ts[i].v*2,a:ts[i],b:ts[i+1]});gain+=ts[i].v*2;i++;}
      else out.push({t:ts[i]});}
    return{out,gain};}
  function move(dir){ // 0 left 1 up 2 right 3 down
    if(busy||over)return;let moved=false,gain=0;const snap0={score,g:grid.map(r=>r.map(t=>t?t.v:0))};const mergedAnims=[];
    const horiz=dir%2===0,fwd=dir<2;
    for(let a=0;a<N;a++){
      const line=[];
      for(let b=0;b<N;b++){const idx=fwd?b:N-1-b;
        line.push(horiz?grid[a][idx]:grid[idx][a]);}
      const{out,gain:g}=slide(line);gain+=g;
      for(let b=0;b<N;b++){const idx=fwd?b:N-1-b;const o=out[b]||null;
        const x=horiz?idx:a,y=horiz?a:idx;
        if(o&&o.t){if(o.t.x!==x||o.t.y!==y)moved=true;
          o.t.x=x;o.t.y=y;o.t.el.style.transform=pos(x,y);grid[y][x]=o.t;}
        else if(o&&o.a){moved=true;mergedAnims.push({x,y,v:o.v,a:o.a,b:o.b});grid[y][x]=null;}
        else grid[y][x]=null;}}
    if(!moved)return;
    busy=true;prev=snap0;score+=gain;api.score(score);api.snd(gain?'pop':'move');
    const g0=gen;setTimeout(()=>{if(g0!==gen)return;mergedAnims.forEach(m=>{m.a.el.remove();m.b.el.remove();
      grid[m.y][m.x]={v:m.v,x:m.x,y:m.y,el:tileEl(m.v,m.x,m.y,'mpop')};
      if(m.v===2048&&!won2048){won2048=true;api.msg('2048!');api.snd('win');api.saveBest(score);}});
      spawn();busy=false;
      if(isDead()){over=true;setTimeout(()=>api.over(score,'No moves left.'),350);}},140);}
  function isDead(){for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const t=grid[y][x];if(!t)return false;
    if(x<N-1&&grid[y][x+1]?.v===t.v)return false;
    if(y<N-1&&grid[y+1][x]?.v===t.v)return false;}return true;}
  api.on(window,'keydown',e=>{if(!api.running||api.paused)return;const k=e.key;
    if(k==='ArrowLeft'||k==='a')move(0);else if(k==='ArrowUp'||k==='w')move(1);
    else if(k==='ArrowRight'||k==='d')move(2);else if(k==='ArrowDown'||k==='s')move(3);});
  api.tc(swipe(board,d=>{if(!api.running||api.paused)return;
    if(d==='left')move(0);if(d==='up')move(1);if(d==='right')move(2);if(d==='down')move(3);}));
  api.on(board,'touchmove',e=>e.preventDefault(),{passive:false});
  undoB.addEventListener('click',undo);
  newB.addEventListener('click',()=>{reset();api.snd('click');});
  function reset(){gen++;layer.innerHTML='';grid=Array.from({length:N},()=>Array(N).fill(null));
    score=0;over=false;won2048=false;prev=null;busy=false;api.score(0);spawn();spawn();}
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
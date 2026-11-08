import {RI,el,swipe} from './util.js';
const N=4;
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');
  const mvPill=el('span','pill','MOVES 0'),tPill=el('span','pill','0:00');
  bar.appendChild(mvPill);bar.appendChild(tPill);wrap.appendChild(bar);
  const TS=Math.max(48,Math.min(84,Math.floor((Math.min(api.stage.clientWidth||360,420)-40)/4)));
  const gap=6,BS=TS*N+gap*(N+1);
  const board=el('div','p15');board.style.width=BS+'px';board.style.height=BS+'px';
  wrap.appendChild(board);
  let b,moves,secs,timer=null,started=false,done=false;
  const tiles={};
  const pos=i=>{const x=i%N,y=(i/N)|0;return `translate(${gap+x*(TS+gap)}px,${gap+y*(TS+gap)}px)`;};
  function render(){for(let v=1;v<=15;v++)tiles[v].style.transform=pos(b.indexOf(v));}
  function startTimer(){if(timer)return;timer=setInterval(()=>{secs++;
    tPill.textContent=(secs/60|0)+':'+String(secs%60).padStart(2,'0');},1000);}
  function stopTimer(){clearInterval(timer);timer=null;}
  api.tc(()=>stopTimer());
  function tryMove(i){if(done||i<0||i>=16)return;
    const ex=b.indexOf(0);
    const x=i%N,y=(i/N)|0,X=ex%N,Y=(ex/N)|0;
    if(Math.abs(x-X)+Math.abs(y-Y)!==1)return;
    b[ex]=b[i];b[i]=0;
    if(!started){started=true;startTimer();}
    moves++;mvPill.textContent='MOVES '+moves;api.snd('move');render();
    if(b.every((v,i)=>v===(i+1)%16)){done=true;stopTimer();api.snd('win');
      setTimeout(()=>api.win(moves,'Solved in '+secs+'s.'),450);}}
  for(let v=1;v<=15;v++){const t=el('div','t');t.textContent=v;
    t.style.width=TS+'px';t.style.height=TS+'px';t.style.fontSize=Math.round(TS*.38)+'px';
    t.addEventListener('click',()=>{if(api.running&&!api.paused)tryMove(b.indexOf(v));});
    tiles[v]=t;board.appendChild(t);}
  api.on(window,'keydown',e=>{if(!api.running||api.paused||done)return;
    const ex=b.indexOf(0),X=ex%N,Y=(ex/N)|0;let i=-1;
    if(e.key==='ArrowUp'&&Y<N-1)i=ex+N;
    else if(e.key==='ArrowDown'&&Y>0)i=ex-N;
    else if(e.key==='ArrowLeft'&&X<N-1)i=ex+1;
    else if(e.key==='ArrowRight'&&X>0)i=ex-1;
    if(i>=0)tryMove(i);});
  api.tc(swipe(board,d=>{if(!api.running||api.paused||done)return;
    const ex=b.indexOf(0),X=ex%N,Y=(ex/N)|0;let i=-1;
    if(d==='up'&&Y<N-1)i=ex+N;else if(d==='down'&&Y>0)i=ex-N;
    else if(d==='left'&&X<N-1)i=ex+1;else if(d==='right'&&X>0)i=ex-1;
    if(i>=0)tryMove(i);}));
  function reset(){stopTimer();
    b=[];for(let v=1;v<=15;v++)b.push(v);b.push(0);
    let last=-1;
    for(let k=0;k<220;k++){const ex=b.indexOf(0),X=ex%N,Y=(ex/N)|0,opts=[];
      if(Y>0)opts.push(ex-N);if(Y<N-1)opts.push(ex+N);
      if(X>0)opts.push(ex-1);if(X<N-1)opts.push(ex+1);
      let pick=opts[RI(0,opts.length-1)];
      if(pick===last&&opts.length>1)pick=opts.find(o=>o!==last);
      b[ex]=b[pick];b[pick]=0;last=ex;}
    moves=0;secs=0;started=false;done=false;
    mvPill.textContent='MOVES 0';tPill.textContent='0:00';render();}
  reset();
  return {start(){},restart:reset,pause(){stopTimer();},
    resume(){if(started&&!done)startTimer();},destroy(){stopTimer();}};
}};
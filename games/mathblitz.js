import {RI,el,shuffle} from './util.js';
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');
  const tP=el('span','pill','45.0s'),sP=el('span','pill','STREAK 0');
  bar.append(tP,sP);wrap.appendChild(bar);
  const q=el('div','math-q');wrap.appendChild(q);
  const opts=el('div','math-opts');wrap.appendChild(opts);
  let t,pts,streak,over,cur;
  const buttons=[];
  for(let i=0;i<3;i++){const b=el('button','mini-btn big-opt');
    b.addEventListener('pointerdown',()=>answer(i));
    buttons.push(b);opts.appendChild(b);}
  function newQ(){const ops=['+','-','×'];const op=ops[RI(0,2)];
    let a,b,ans;
    if(op==='+'){a=RI(3,40);b=RI(3,40);ans=a+b;}
    else if(op==='-'){a=RI(10,60);b=RI(2,Math.max(3,a-1));ans=a-b;}
    else{a=RI(2,12);b=RI(2,12);ans=a*b;}
    cur=ans;q.textContent=`${a} ${op} ${b}`;
    const wrong=new Set();
    while(wrong.size<2){const d=ans+RI(-9,9);if(d!==ans&&d>=0)wrong.add(d);}
    const vals=shuffle([ans,...wrong]);
    buttons.forEach((btn,i)=>btn.textContent=vals[i]);
    buttons.forEach((btn,i)=>btn._v=vals[i]);}
  function answer(i){if(over||!api.running||api.paused)return;
    if(buttons[i]._v===cur){streak++;pts+=streak;api.score(pts);
      sP.textContent='STREAK '+streak;api.snd('score');newQ();}
    else{streak=0;sP.textContent='STREAK 0';api.snd('error');}}
  api.on(window,'keydown',e=>{
    if(e.key>='1'&&e.key<='3')answer(+e.key-1);});
  api.loop(dt=>{if(over)return;t-=dt;
    tP.textContent=Math.max(0,t).toFixed(1)+'s';
    if(t<=0){over=true;api.over(pts,'Brain: thoroughly warmed.');}});
  function reset(){t=45;pts=0;streak=0;over=false;
    sP.textContent='STREAK 0';api.score(0);newQ();}
  reset();
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
import {shuffle,el} from './util.js';
const SYMS=['▲','●','■','◆','★','♠','☾','✚'];
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');
  const mvPill=el('span','pill','MOVES 0'),tPill=el('span','pill','0:00');
  bar.append(mvPill,tPill);wrap.appendChild(bar);
  const grid=el('div','mem-grid');wrap.appendChild(grid);
  let open,lock,moves,matched,secs,timer,started;
  const cards=[];
  function startTimer(){clearInterval(timer);timer=setInterval(()=>{secs++;
    tPill.textContent=`${secs/60|0}:${String(secs%60).padStart(2,'0')}`;},1000);
    api.tc(()=>clearInterval(timer));}
  function flip(c){if(lock||c.done||c===open)return;
    if(!started){started=true;startTimer();}
    c.card.classList.add('flip');api.snd('flip');
    if(!open){open=c;return;}
    moves++;mvPill.textContent='MOVES '+moves;
    const a=open;open=null;
    if(a.sym===c.sym){a.done=c.done=true;
      a.card.classList.add('done');c.card.classList.add('done');
      matched+=2;api.snd('score');
      if(matched===16){clearInterval(timer);setTimeout(()=>api.win(moves,`Solved in ${secs}s.`),500);}}
    else{lock=true;
      setTimeout(()=>{a.card.classList.remove('flip');c.card.classList.remove('flip');
        lock=false;api.snd('move');},700);}}
  function reset(){clearInterval(timer);grid.innerHTML='';cards.length=0;
    open=null;lock=false;moves=0;matched=0;secs=0;started=false;
    mvPill.textContent='MOVES 0';tPill.textContent='0:00';
    shuffle([...SYMS,...SYMS]).forEach(sym=>{
      const card=el('div','mem-card',`<div class="mem-in"><div class="mem-f">?</div><div class="mem-b">${sym}</div></div>`);
      const c={card,sym,done:false};
      card.addEventListener('click',()=>flip(c));
      cards.push(c);grid.appendChild(card);});}
  reset();
  return {start(){},restart:reset,pause(){clearInterval(timer);},
    resume(){if(started)startTimer();},destroy(){clearInterval(timer);}};
}};
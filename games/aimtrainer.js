import {R,el} from './util.js';
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');
  const tPill=el('span','pill','30.0s'),hPill=el('span','pill','HITS 0');
  bar.append(tPill,hPill);wrap.appendChild(bar);
  const arena=el('div','aim-arena');wrap.appendChild(arena);
  let hits,misses,timeLeft,runningT,spawnAt;
  function spawn(){arena.querySelectorAll('.tgt').forEach(t=>t.remove());
    const s=R(26,54),ar=arena.getBoundingClientRect();
    const t=el('div','tgt');
    t.style.cssText=`width:${s}px;height:${s}px;left:${R(4,ar.width-s-4)}px;top:${R(4,ar.height-s-4)}px`;
    t.addEventListener('pointerdown',e=>{e.stopPropagation();
      if(!api.running||api.paused||timeLeft<=0)return;
      hits++;hPill.textContent='HITS '+hits;
      api.snd('hit');spawn();});
    spawnAt=performance.now();arena.appendChild(t);}
  arena.addEventListener('pointerdown',()=>{
    if(!api.running||api.paused||timeLeft<=0)return;
    misses++;api.snd('move');});
  api.loop(dt=>{if(timeLeft<=0)return;
    timeLeft-=dt;
    tPill.textContent=Math.max(0,timeLeft).toFixed(1)+'s';
    if(timeLeft<=0){runningT=false;
      const tot=hits+misses,acc=tot?Math.round(hits/tot*100):0;
      api.over(hits,`Accuracy ${acc}% · ${misses} misses`);}});
  function reset(){hits=0;misses=0;timeLeft=30;runningT=true;
    hPill.textContent='HITS 0';tPill.textContent='30.0s';spawn();}
  return {start:reset,restart:reset,pause(){},resume(){},
    destroy(){arena.querySelectorAll('.tgt').forEach(t=>t.remove());}};
}};
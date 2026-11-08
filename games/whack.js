import {el} from './util.js';
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');
  const tP=el('span','pill','30.0s'),hP=el('span','pill','HITS 0');
  bar.append(tP,hP);wrap.appendChild(bar);
  const grid=el('div','whack-grid');wrap.appendChild(grid);
  const holes=[];let hits,t,spawnT,over;
  for(let i=0;i<9;i++){const h=el('button','whack-hole');
    h.addEventListener('pointerdown',()=>{if(!api.running||api.paused||over)return;
      if(h.classList.contains('up')){h.classList.remove('up');
        hits++;hP.textContent='HITS '+hits;api.score(hits);api.snd('hit');}
      else api.snd('move');});
    holes.push(h);grid.appendChild(h);}
  api.loop(dt=>{if(over)return;
    t-=dt;tP.textContent=Math.max(0,t).toFixed(1)+'s';
    holes.forEach(h=>{if(h.classList.contains('up')){h._t-=dt;
      if(h._t<=0)h.classList.remove('up');}});
    spawnT-=dt;
    if(spawnT<=0){spawnT=Math.max(.32,.75-(30-t)/60);
      const idle=holes.filter(h=>!h.classList.contains('up'));
      if(idle.length){const h=idle[(Math.random()*idle.length)|0];
        h.classList.add('up');h._t=Math.max(.45,.95-(30-t)/45);}}
    if(t<=0){over=true;api.over(hits,'Reflexes: verified.');}});
  function reset(){hits=0;t=30;spawnT=.3;over=false;
    hP.textContent='HITS 0';api.score(0);
    holes.forEach(h=>{h.classList.remove('up');h._t=0;});}
  reset();
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
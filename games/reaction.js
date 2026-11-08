import {R,el} from './util.js';
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const zone=el('div','rx-zone','TAP TO START · 5 ROUNDS');wrap.appendChild(zone);
  const resP=el('p','dim small','');wrap.appendChild(resP);
  let state='idle',goAt,timerId,results;
  function paint(){zone.className='rx-zone'+(state==='wait'?' wait':state==='go'?' go':state==='false'?' bad':'');}
  function next(){if(results.length>=5){
      const avg=Math.round(results.reduce((a,b)=>a+b)/results.length);
      state='idle';paint();zone.textContent='DONE';
      setTimeout(()=>api.win(avg,`Rounds: ${results.join(' · ')} ms`),400);return;}
    state='wait';paint();zone.textContent=`ROUND ${results.length+1}/5 — WAIT FOR WHITE…`;
    timerId=setTimeout(()=>{state='go';goAt=performance.now();paint();zone.textContent='TAP!';},R(1200,3500));
    api.tc(()=>clearTimeout(timerId));}
  zone.addEventListener('pointerdown',()=>{if(!api.running||api.paused)return;
    if(state==='idle'){results=[];resP.textContent='';next();return;}
    if(state==='wait'){clearTimeout(timerId);state='false';paint();
      zone.textContent='TOO SOON! Tap to retry.';api.snd('die');return;}
    if(state==='false'){next();return;}
    if(state==='go'){const ms=Math.round(performance.now()-goAt);
      results.push(ms);api.snd('score');state='between';paint();
      zone.textContent=ms+' ms';resP.textContent='Rounds: '+results.join(' · ');
      setTimeout(()=>api.running&&!api.paused&&next(),800);}});
  function reset(){clearTimeout(timerId);state='idle';results=[];resP.textContent='';
    paint();zone.textContent='TAP TO START · 5 ROUNDS';}
  reset();
  return {start(){},restart:reset,pause(){clearTimeout(timerId);if(state==='wait'||state==='go'){state='idle';paint();zone.textContent='PAUSED — tap to restart round';}},
    resume(){},destroy(){clearTimeout(timerId);}};
}};
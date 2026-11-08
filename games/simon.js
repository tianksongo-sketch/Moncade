import {el} from './util.js';
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');const st=el('span','pill','ROUND 0');bar.appendChild(st);wrap.appendChild(bar);
  const grid=el('div','simon-grid');wrap.appendChild(grid);
  const TONES=['pad0','pad1','pad2','pad3'];
  const pads=[];
  for(let i=0;i<4;i++){const b=el('button','simon-pad p'+i);
    b.addEventListener('pointerdown',()=>press(i));pads.push(b);grid.appendChild(b);}
  let seq,idx,round,playing,alive,timers=[];
  const later=(f,ms)=>{const t=setTimeout(f,ms);timers.push(t);};
  function flash(i,ms=300){pads[i].classList.add('lit');api.snd(TONES[i]);
    later(()=>pads[i].classList.remove('lit'),ms);}
  function playSeq(){playing=true;idx=0;
    seq.forEach((s,k)=>later(()=>flash(s),k*430));
    later(()=>{playing=false;},seq.length*430+80);}
  function press(i){if(!api.running||api.paused||playing||!alive)return;
    flash(i,180);
    if(i===seq[idx]){idx++;
      if(idx===seq.length){round++;st.textContent='ROUND '+round;api.score(round);api.snd('score');
        later(()=>{seq.push((Math.random()*4)|0);playSeq();},650);}}
    else{alive=false;
      later(()=>api.over(round,'The pattern escaped you at round '+(round+1)+'.'),300);}}
  function reset(){timers.forEach(clearTimeout);timers=[];
    seq=[];idx=0;round=0;playing=false;alive=true;
    st.textContent='ROUND 0';api.score(0);
    later(()=>{seq.push((Math.random()*4)|0);playSeq();},600);}
  return {start:reset,restart:reset,pause(){},resume(){},
    destroy(){timers.forEach(clearTimeout);}};
}};
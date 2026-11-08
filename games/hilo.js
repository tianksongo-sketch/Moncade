import {RI,el} from './util.js';
const NAMES=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SUITS=['♠','♥','♦','♣'];
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');const st=el('span','pill','STREAK 0');bar.appendChild(st);wrap.appendChild(bar);
  const card=el('div','hl-card');wrap.appendChild(card);
  const btns=el('div','gbar');
  const lo=el('button','mini-btn on','▼ LOWER'),hi=el('button','mini-btn on','▲ HIGHER');
  btns.append(lo,hi);wrap.appendChild(btns);
  let cur,streak,alive;
  const show=v=>{card.innerHTML=`<span class="hl-v">${NAMES[v]}</span><span class="hl-s">${SUITS[RI(0,3)]}</span>`;
    card.classList.remove('flip');void card.offsetWidth;card.classList.add('flip');};
  function guess(hiG){if(!api.running||api.paused||!alive)return;
    const next=RI(0,12);
    if(next===cur){api.msg('TIE — SAFE');api.snd('move');show(next);cur=next;return;}
    const win=hiG?next>cur:next<cur;
    if(win){streak++;api.score(streak);st.textContent='STREAK '+streak;
      api.snd('score');show(next);cur=next;}
    else{alive=false;show(next);api.snd('die');
      setTimeout(()=>api.over(streak,'It was '+NAMES[next]+'. Ouch.'),450);}}
  hi.addEventListener('click',()=>guess(true));
  lo.addEventListener('click',()=>guess(false));
  api.on(window,'keydown',e=>{
    if(e.key==='ArrowUp')guess(true);
    if(e.key==='ArrowDown')guess(false);});
  function reset(){streak=0;alive=true;cur=RI(0,12);
    st.textContent='STREAK 0';api.score(0);show(cur);}
  reset();
  return {start(){},restart:reset,pause(){},resume(){},destroy(){}};
}};
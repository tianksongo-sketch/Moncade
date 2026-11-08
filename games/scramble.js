import {RI,el,shuffle} from './util.js';
const WORDS=['APPLE','HOUSE','MUSIC','TIGER','CLOUD','PLANT','GHOST','PIANO','RIVER','STONE',
'LIGHT','DREAM','BRAIN','CHAIR','DANCE','EAGLE','FLAME','GRAPE','HEART','JOKER',
'LEMON','MAGIC','NIGHT','OCEAN','PEARL','QUEEN','ROBOT','SHARK','TRAIN','VIVID',
'WATER','YOUTH','ZEBRA','STORM','SMILE','POWER','LUCKY','HONEY','GLOBE','QUILT'];
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');
  const tP=el('span','pill','60.0s'),wP=el('span','pill','WORDS 0');
  bar.append(tP,wP);wrap.appendChild(bar);
  const slots=el('div','scr-slots');wrap.appendChild(slots);
  const bank=el('div','scr-bank');wrap.appendChild(bank);
  let t,words,over,word,guess,pool;
  function renderSlots(){slots.innerHTML='';
    for(let i=0;i<5;i++){const s=el('div','scr-slot',guess[i]||'');
      if(guess[i])s.addEventListener('pointerdown',()=>{if(over)return;
        pool.push(guess[i]);guess.splice(i,1);renderBank();renderSlots();api.snd('move');});
      slots.appendChild(s);}}
  function renderBank(){bank.innerHTML='';
    pool.forEach((ch,i)=>{const b=el('button','scr-tile',ch);
      b.addEventListener('pointerdown',()=>pick(i));bank.appendChild(b);});}
  function pick(i){if(over||guess.length>=5)return;
    guess.push(pool[i]);pool.splice(i,1);renderBank();renderSlots();api.snd('flip');
    if(guess.length===5)check();}
  function check(){if(guess.join('')===word){words++;
      wP.textContent='WORDS '+words;api.score(words);api.snd('clear');api.msg(word+' ✓');
      newWord();}
    else{api.snd('error');slots.classList.add('shake');
      setTimeout(()=>{slots.classList.remove('shake');
        pool=pool.concat(guess);guess=[];renderBank();renderSlots();},420);}}
  function newWord(){word=WORDS[RI(0,WORDS.length-1)];
    let sh;do{sh=shuffle(word.split(''));}while(sh.join('')===word);
    pool=sh;guess=[];renderBank();renderSlots();}
  api.on(window,'keydown',e=>{if(over||!api.running||api.paused)return;
    const k=e.key.toUpperCase();
    if(k==='BACKSPACE'){if(guess.length){pool.push(guess.pop());renderBank();renderSlots();}}
    else if(/^[A-Z]$/.test(k)){const i=pool.indexOf(k);if(i>=0)pick(i);}});
  api.loop(dt=>{if(over)return;t-=dt;
    tP.textContent=Math.max(0,t).toFixed(1)+'s';
    if(t<=0){over=true;api.over(words,'Vocabulary exhausted.');}});
  function reset(){t=60;words=0;over=false;wP.textContent='WORDS 0';api.score(0);newWord();}
  reset();
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
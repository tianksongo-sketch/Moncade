import {RI,el} from './util.js';
const PUZZLES=[
['00100','01110','11111','01110','00100'],
['01010','11111','11111','01110','00100'],
['10001','01010','00100','01010','10001'],
['11111','10001','10101','10001','11111'],
['01110','10001','10101','10001','01110'],
['00111','01100','11111','01100','00111'],
['10101','10101','11111','01110','00100'],
['11110','10001','11110','10000','10000'],
['01110','10001','10001','01110','00010'],
['11011','11011','00000','11011','11011']];
const runs=row=>{const out=[];let n=0;
  (typeof row==='string'?row.split(''):row).forEach(c=>{if(c==='1')n++;else if(n){out.push(n);n=0;}});
  if(n)out.push(n);return out.length?out:[0];};
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');
  const tP=el('span','pill','0:00'),mP=el('span','pill','MOVES 0');
  bar.append(tP,mP);wrap.appendChild(bar);
  const grid=el('div','no-grid');wrap.appendChild(grid);
  let target,state,secs,moves,won,lastS=0;
  const cells=[];
  function build(){grid.innerHTML='';cells.length=0;
    grid.style.gridTemplateColumns='auto repeat(5,auto)';
    const corner=el('div','no-h');grid.appendChild(corner);
    for(let c=0;c<5;c++){const col=target.map(r=>r[c]);
      grid.appendChild(el('div','no-h',runs(col).join('<br>')));}
    for(let r=0;r<5;r++){
      grid.appendChild(el('div','no-h',runs(target[r]).join(' ')));
      for(let c=0;c<5;c++){const b=el('button','no-c');
        b.addEventListener('click',()=>cycle(r,c));
        cells.push(b);grid.appendChild(b);}}}
  function cycle(r,c){if(won||!api.running||api.paused)return;
    const i=r*5+c;state[i]=(state[i]+1)%3;
    moves++;mP.textContent='MOVES '+moves;api.snd('move');
    cells[i].className='no-c'+(state[i]===1?' f':state[i]===2?' m':'');
    cells[i].textContent=state[i]===2?'✕':'';
    let ok=true;
    for(let k=0;k<25;k++){const t=target[k/5|0][k%5]==='1';
      if((state[k]===1)!==t){ok=false;break;}}
    if(ok){won=true;api.snd('win');setTimeout(()=>api.win(secs,'Solved in '+moves+' moves.'),400);}}
  api.loop(dt=>{if(won)return;secs+=dt;
    const s=secs|0;if(s!==lastS){lastS=s;
      tP.textContent=(s/60|0)+':'+String(s%60).padStart(2,'0');}});
  function reset(){target=PUZZLES[RI(0,PUZZLES.length-1)];
    state=Array(25).fill(0);secs=0;moves=0;won=false;lastS=0;
    tP.textContent='0:00';mP.textContent='MOVES 0';build();}
  reset();
  return {start(){},restart:reset,pause(){},resume(){},destroy(){}};
}};
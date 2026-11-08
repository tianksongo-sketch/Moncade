import {RI,el} from './util.js';
const N=5;
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const bar=el('div','gbar');const mvPill=el('span','pill','MOVES 0');
  const newB=el('button','mini-btn','NEW PUZZLE');bar.append(mvPill,newB);wrap.appendChild(bar);
  const grid=el('div','lo-grid');wrap.appendChild(grid);
  let state,moves,done;const cells=[];
  for(let i=0;i<N*N;i++){const b=el('button','lo-c');
    b.addEventListener('click',()=>press(i%N,i/N|0,false));cells.push(b);grid.appendChild(b);}
  function render(){cells.forEach((b,i)=>b.classList.toggle('on',!!state[i]));}
  function toggle(x,y){if(x<0||y<0||x>=N||y>=N)return;const i=y*N+x;state[i]=!state[i];}
  function press(x,y,silent){if(done)return;
    toggle(x,y);toggle(x+1,y);toggle(x-1,y);toggle(x,y+1);toggle(x,y-1);
    if(!silent){moves++;mvPill.textContent='MOVES '+moves;api.snd('move');}
    render();
    if(!silent&&state.every(v=>!v)){done=true;api.snd('win');setTimeout(()=>api.win(moves,'All lights out.'),350);}}
  function reset(){done=false;moves=0;mvPill.textContent='MOVES 0';
    state=Array(N*N).fill(false);
    const n=RI(9,15);
    for(let i=0;i<n;i++)press(RI(0,N-1),RI(0,N-1),true);
    if(state.every(v=>!v))press(RI(0,N-1),RI(0,N-1),true);
    moves=0;mvPill.textContent='MOVES 0';render();}
  newB.addEventListener('click',()=>{reset();api.snd('click');});
  reset();
  return {start(){},restart:reset,pause(){},resume(){},destroy(){}};
}};
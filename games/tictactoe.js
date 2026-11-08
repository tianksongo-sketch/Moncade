import {RI,el} from './util.js';
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const modes=el('div','gbar');wrap.appendChild(modes);
  const scoreB=el('div','ttt-score');wrap.appendChild(scoreB);
  const grid=el('div','ttt-grid');wrap.appendChild(grid);
  const msgP=el('p','dim small');wrap.appendChild(msgP);
  let b,mode,turn,over,W=0,D=0,L=0,streak=0,aiT=null;
  const cells=[];
  for(let i=0;i<9;i++){const c=el('button','ttt-c');
    c.addEventListener('click',()=>human(i));cells.push(c);grid.appendChild(c);}
  ['PVP','EASY','MEDIUM','IMPOSSIBLE'].forEach((m,i)=>{const btn=el('button','mini-btn',m);
    btn.addEventListener('click',()=>{modes.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      btn.classList.add('on');mode=m;reset();});
    if(i===1)btn.classList.add('on');modes.appendChild(btn);});
  mode='EASY';
  const winner=bd=>{for(const[a,b2,c]of LINES)if(bd[a]&&bd[a]===bd[b2]&&bd[a]===bd[c])return{p:bd[a],l:[a,b2,c]};
    return bd.every(v=>v)?{p:'D'}:null;};
  function render(){cells.forEach((c,i)=>{c.textContent=b[i]||'';c.classList.remove('win');});}
  function updScore(){scoreB.innerHTML=`<span>W ${W}</span><span>D ${D}</span><span>L ${L}</span><span>STREAK ${streak}</span>`;}
  function end(w){over=true;
    if(w.p==='X'){W++;streak++;api.saveBest(streak);api.snd('win');msgP.textContent='X WINS';}
    else if(w.p==='O'){L++;streak=0;api.snd('die');msgP.textContent='O WINS';}
    else{D++;api.snd('move');msgP.textContent='DRAW';}
    if(w.l)w.l.forEach(i=>cells[i].classList.add('win'));
    updScore();
    const fin=(w.p==='X'||(mode==='PVP'&&w.p==='O'))?api.win:api.over;
    setTimeout(()=>fin(streak,(w.p==='X'?'Victory! ':'')+'Current streak: '+streak),900);}
  function place(i,p){b[i]=p;render();api.snd('flip');
    const w=winner(b);if(w){end(w);return false;}return true;}
  function human(i){if(!api.running||api.paused||over||b[i])return;
    if(mode!=='PVP'&&turn==='O')return;
    const pl=mode==='PVP'?turn:'X';if(!place(i,pl))return;
    turn=pl==='X'?'O':'X';if(mode==='PVP')msgP.textContent=turn+' to move';
    if(mode!=='PVP')aiMove();}
  function empty(bd){return bd.map((v,i)=>v?null:i).filter(v=>v!=null);}
  function minimax(bd,p,depth){const w=winner(bd);
    if(w){if(w.p==='O')return 10-depth;if(w.p==='X')return depth-10;return 0;}
    const es=empty(bd);let best=p==='O'?-99:99;
    for(const i of es){bd[i]=p;const s=minimax(bd,p==='O'?'X':'O',depth+1);bd[i]=0;
      best=p==='O'?Math.max(best,s):Math.min(best,s);}
    return best;}
  function aiMove(){aiT=setTimeout(()=>{if(over)return;let mv;
    const es=empty(b);
    const tryWin=p=>{for(const i of es){b[i]=p;const w=winner(b);b[i]=0;if(w&&w.p===p)return i;}return null;};
    if(mode==='EASY')mv=es[RI(0,es.length-1)];
    else if(mode==='MEDIUM'){mv=tryWin('O')??tryWin('X')??(b[4]==null?4:null)??es[RI(0,es.length-1)];}
    else{let bs=-99;for(const i of es){b[i]='O';const s=minimax(b,'X',0);b[i]=0;
      if(s>bs){bs=s;mv=i;}}}
    if(place(mv,'O'))turn='X';},320);}
  function reset(){clearTimeout(aiT);b=Array(9).fill(null);over=false;turn='X';
    msgP.textContent=mode==='PVP'?'X to move':'You are X — go.';render();updScore();}
  reset();
  return {start(){},restart:reset,pause(){},resume(){},destroy(){clearTimeout(aiT);}};
}};
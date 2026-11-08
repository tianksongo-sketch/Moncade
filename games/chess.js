import {RI,el} from './util.js';
const VAL={p:100,n:320,b:330,r:500,q:900,k:0};
const KN=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
const KD=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const BD=[[1,1],[1,-1],[-1,1],[-1,-1]],RD=[[1,0],[-1,0],[0,1],[0,-1]];
const GLY={w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},b:{k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}};
const sq=(r,c)=>r*8+c,inB=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
function startState(){const b=Array(64).fill(null);
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'.split('/').forEach((row,r)=>{let c=0;
    for(const ch of row){if(/\d/.test(ch))c+=+ch;
      else{b[r*8+c]={c:ch===ch.toUpperCase()?'w':'b',t:ch.toLowerCase()};c++;}}});
  return{b,turn:'w',castle:{K:true,Q:true,k:true,q:true},ep:-1};}
function attacked(st,s,by){const b=st.b,r=s>>3,c=s&7;
  const pd=by==='w'?1:-1;
  for(const dc of[-1,1]){if(inB(r+pd,c+dc)){const p=b[sq(r+pd,c+dc)];
    if(p&&p.c===by&&p.t==='p')return true;}}
  for(const[dr,dc]of KN){if(inB(r+dr,c+dc)){const p=b[sq(r+dr,c+dc)];
    if(p&&p.c===by&&p.t==='n')return true;}}
  for(const[dr,dc]of KD){if(inB(r+dr,c+dc)){const p=b[sq(r+dr,c+dc)];
    if(p&&p.c===by&&p.t==='k')return true;}}
  for(const[dr,dc]of RD){let r2=r+dr,c2=c+dc;while(inB(r2,c2)){const p=b[sq(r2,c2)];
    if(p){if(p.c===by&&(p.t==='r'||p.t==='q'))return true;break;}r2+=dr;c2+=dc;}}
  for(const[dr,dc]of BD){let r2=r+dr,c2=c+dc;while(inB(r2,c2)){const p=b[sq(r2,c2)];
    if(p){if(p.c===by&&(p.t==='b'||p.t==='q'))return true;break;}r2+=dr;c2+=dc;}}
  return false;}
function pseudo(st){const ms=[],b=st.b,side=st.turn,opp=side==='w'?'b':'w';
  for(let i=0;i<64;i++){const p=b[i];if(!p||p.c!==side)continue;
    const r=i>>3,c=i&7;
    if(p.t==='p'){const d=side==='w'?-1:1,sr=side==='w'?6:1,pr=side==='w'?0:7;
      const f1=sq(r+d,c);
      if(!b[f1]){ms.push({from:i,to:f1,promo:r+d===pr?'q':null});
        if(r===sr&&!b[sq(r+2*d,c)])ms.push({from:i,to:sq(r+2*d,c),dbl:true});}
      for(const dc of[-1,1]){if(!inB(r+d,c+dc))continue;const t=sq(r+d,c+dc);
        if(b[t]&&b[t].c===opp)ms.push({from:i,to:t,promo:r+d===pr?'q':null});
        else if(t===st.ep)ms.push({from:i,to:t,ep:true});}}
    else if(p.t==='n'){for(const[dr,dc]of KN){if(inB(r+dr,c+dc)){const t=sq(r+dr,c+dc);
      if(!b[t]||b[t].c===opp)ms.push({from:i,to:t});}}}
    else if(p.t==='k'){for(const[dr,dc]of KD){if(inB(r+dr,c+dc)){const t=sq(r+dr,c+dc);
        if(!b[t]||b[t].c===opp)ms.push({from:i,to:t});}}
      const home=side==='w'?56:0;
      if(i===home+4&&!inCheck(st,side)){
        if(st.castle[side==='w'?'K':'k']&&!b[home+5]&&!b[home+6]
          &&!attacked(st,home+5,opp)&&!attacked(st,home+6,opp))
          ms.push({from:i,to:home+6,castle:'K'});
        if(st.castle[side==='w'?'Q':'q']&&!b[home+1]&&!b[home+2]&&!b[home+3]
          &&!attacked(st,home+3,opp)&&!attacked(st,home+2,opp))
          ms.push({from:i,to:home+2,castle:'Q'});}}
    else{const dirs=p.t==='b'?BD:p.t==='r'?RD:[...BD,...RD];
      for(const[dr,dc]of dirs){let r2=r+dr,c2=c+dc;
        while(inB(r2,c2)){const t=sq(r2,c2);
          if(!b[t])ms.push({from:i,to:t});
          else{if(b[t].c===opp)ms.push({from:i,to:t});break;}
          r2+=dr;c2+=dc;}}}}
  return ms;}
function make(st,m){const b=st.b.slice();const p={...b[m.from]};
  b[m.to]=p;b[m.from]=null;
  const castle={...st.castle};let ep=-1;
  if(m.ep)b[p.c==='w'?m.to+8:m.to-8]=null;
  if(m.promo)p.t=m.promo;
  if(m.dbl)ep=(m.from+m.to)/2;
  if(p.t==='k'){castle[p.c==='w'?'K':'k']=false;castle[p.c==='w'?'Q':'q']=false;
    const home=p.c==='w'?56:0;
    if(m.castle==='K'){b[home+5]=b[home+7];b[home+7]=null;}
    if(m.castle==='Q'){b[home+3]=b[home];b[home]=null;}}
  if(m.from===63||m.to===63)castle.K=false;
  if(m.from===56||m.to===56)castle.Q=false;
  if(m.from===7||m.to===7)castle.k=false;
  if(m.from===0||m.to===0)castle.q=false;
  return{b,turn:st.turn==='w'?'b':'w',castle,ep};}
function inCheck(st,side){const k=st.b.findIndex(p=>p&&p.c===side&&p.t==='k');
  return k>=0&&attacked(st,k,side==='w'?'b':'w');}
function legal(st){return pseudo(st).filter(m=>!inCheck(make(st,m),st.turn));}
function evaluate(st){let s=0;
  for(let i=0;i<64;i++){const p=st.b[i];if(!p)continue;
    let v=VAL[p.t];const r=i>>3,c=i&7;
    if(p.t==='p'){v+=(p.c==='w'?6-r:r-1)*6;if(c>=2&&c<=5)v+=6;}
    if(p.t==='n'||p.t==='b'){if(c>=2&&c<=5&&r>=2&&r<=5)v+=14;}
    s+=p.c==='w'?v:-v;}
  return s;}
function search(ns,d,a,b){
  if(d===0){const e=evaluate(ns);return ns.turn==='w'?e:-e;}
  const ms=legal(ns);
  if(!ms.length)return inCheck(ns,ns.turn)?-99999-d:0;
  ms.sort((x,y)=>(ns.b[y.to]?VAL[ns.b[y.to].t]:0)-(ns.b[x.to]?VAL[ns.b[x.to].t]:0));
  let best=-1e9;
  for(const m of ms){const v=-search(make(ns,m),d-1,-b,-a);
    if(v>best)best=v;if(v>a)a=v;if(a>=b)break;}
  return best;}

export default {create(api){
  const wrap=el('div','gwrap');api.stage.appendChild(wrap);
  const modes=el('div','gbar');wrap.appendChild(modes);
  const boardEl=el('div','ch-board');wrap.appendChild(boardEl);
  const capWEl=el('div','ch-cap');const capBEl=el('div','ch-cap');
  wrap.append(capWEl,capBEl);
  const statusEl=el('p','dim small');wrap.appendChild(statusEl);
  let st,mode='med',sel=null,targets=[],lastM=null,over=false,botT=null,capW=0,caps;
  const botMode=()=>mode!=='pvp';
  const sqs=[];
  for(let i=0;i<64;i++){const s=el('button','ch-sq '+(((i>>3)+(i&7))%2?'d':'l'));
    s.addEventListener('click',()=>click(i));sqs.push(s);boardEl.appendChild(s);}
  [['PVP','pvp'],['EASY','easy'],['MEDIUM','med'],['HARD','hard']].forEach(([lab,val])=>{
    const b=el('button','mini-btn'+(val===mode?' on':''),lab);
    b.addEventListener('click',()=>{modes.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');mode=val;reset();api.snd('click');});
    modes.appendChild(b);});
  function render(){
    for(let i=0;i<64;i++){const s=sqs[i];const p=st.b[i];
      s.innerHTML=p?`<span class="ch-p ${p.c}">${GLY[p.c][p.t]}</span>`:'';
      s.classList.toggle('sel',sel===i);
      s.classList.toggle('last',!!lastM&&(lastM.from===i||lastM.to===i));
      const tgt=targets.find(m=>m.to===i);
      s.classList.toggle('dot',!!tgt);
      s.classList.toggle('cap',!!tgt&&!!(st.b[i]||tgt.ep));
      s.classList.remove('check');}
    if(!over&&inCheck(st,st.turn)){const k=st.b.findIndex(p=>p&&p.c===st.turn&&p.t==='k');
      if(k>=0)sqs[k].classList.add('check');}
    statusEl.textContent=over?'':(inCheck(st,st.turn)?'⚠ CHECK! — ':'')+
      (st.turn==='w'?'WHITE':'BLACK')+' TO MOVE'+(botMode()&&st.turn==='b'?' · BOT THINKING…':'');
    capWEl.textContent='WHITE ♡ '+caps.w.map(t=>GLY.b[t]).join(' ');
    capBEl.textContent='BLACK ♡ '+caps.b.map(t=>GLY.w[t]).join(' ');}
  function pick(depth,jitter){const ms=legal(st);if(!ms.length)return null;
    if(jitter&&Math.random()<.4)return ms[RI(0,ms.length-1)];
    ms.sort((x,y)=>(st.b[y.to]?VAL[st.b[y.to].t]:0)-(st.b[x.to]?VAL[st.b[x.to].t]:0));
    let best=[],bv=-1e9;
    for(const m of ms){const v=-search(make(st,m),depth-1,-1e9,-(bv-1));
      if(v>bv){bv=v;best=[m];}else if(v===bv)best.push(m);}
    return best[RI(0,best.length-1)];}
  function botTurn(){if(over)return;
    if(api.paused){botT=setTimeout(botTurn,250);return;}
    const d=mode==='easy'?1:mode==='med'?2:3;
    const m=pick(d,mode==='easy');
    if(m)doMove(m);}
  function doMove(m){
    const victim=st.b[m.to]||(m.ep?{t:'p',c:st.turn==='w'?'b':'w'}:null);
    if(victim){caps[st.turn].push(victim.t);if(st.turn==='w')capW+=VAL[victim.t]/100;}
    st=make(st,m);lastM=m;sel=null;targets=[];
    api.snd(victim?'hit':'move');
    api.score(Math.round(capW));
    const opp=legal(st);
    if(!opp.length){over=true;render();
      const chk=inCheck(st,st.turn),winner=st.turn==='w'?'b':'w';
      setTimeout(()=>{
        if(!chk)api.over(Math.round(capW),'Stalemate — draw.');
        else if(botMode())winner==='w'
          ?api.win(Math.round(capW),'Checkmate! The bot bows.')
          :api.over(Math.round(capW),'Checkmate — the bot wins.');
        else api.over(Math.round(capW),'CHECKMATE — '+(winner==='w'?'WHITE':'BLACK')+' WINS.');},420);
      return;}
    render();
    if(botMode()&&st.turn==='b')botT=setTimeout(botTurn,320);}
  function click(i){if(over||!api.running||api.paused)return;
    if(botMode()&&st.turn==='b')return;
    const tgt=targets.find(m=>m.to===i);
    if(sel!=null&&tgt){doMove(tgt);return;}
    const p=st.b[i];
    if(p&&p.c===st.turn){sel=i;targets=legal(st).filter(m=>m.from===i);api.snd('move');}
    else{sel=null;targets=[];}
    render();}
  function reset(){clearTimeout(botT);
    st=startState();over=false;sel=null;targets=[];lastM=null;capW=0;
    caps={w:[],b:[]};api.score(0);render();}
  reset();
  return {start(){},restart:reset,pause(){},resume(){},destroy(){clearTimeout(botT);}};
}};
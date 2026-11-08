import {shuffle,swipe} from './util.js';
const COLS=10,ROWS=20;
const SHAPES=[
 {m:[[1,1,1,1]],f:'#FFFFFF',p:0},
 {m:[[1,1],[1,1]],f:'#DDDDDD',p:1},
 {m:[[0,1,0],[1,1,1]],f:'#AAAAAA',p:2},
 {m:[[0,1,1],[1,1,0]],f:'#DDDDDD',p:3},
 {m:[[1,1,0],[0,1,1]],f:'#AAAAAA',p:5},
 {m:[[1,0,0],[1,1,1]],f:'#FFFFFF',p:6},
 {m:[[0,0,1],[1,1,1]],f:'#666666',p:4}];
const rot=(m,d)=>{let r=m;const n=((d%4)+4)%4;
  for(let i=0;i<n;i++){const h=r.length,w=r[0].length,t=Array.from({length:w},()=>Array(h).fill(0));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)t[x][h-1-y]=r[y][x];r=t;}return r;};

export default {create(api){
  const S=24,{cv,ctx}=api.canvas(COLS*S+120,ROWS*S);
  let board,piece,px,py,bag,score,lines,level,acc,dropI,alive,cur,next,pending;
  const gravMs=()=>Math.max(70,750-(level-1)*65);
  const nextP=()=>{if(!bag.length)bag=shuffle([0,1,2,3,4,5,6]);return bag.pop();};
  const ok=()=>api.running&&!api.paused&&alive&&!pending;
  const hit=(m,ox,oy)=>m.some((row,y)=>row.some((v,x)=>{if(!v)return false;
    const X=ox+x,Y=oy+y;return X<0||X>=COLS||Y>=ROWS||(Y>=0&&board[Y][X]>=0);}));
  function spawn(){cur=next;next=nextP();piece=SHAPES[cur].m.map(r=>[...r]);
    px=3;py=0;if(hit(piece,px,py)){alive=false;api.over(score);}}
  function lock(){let top=false;
    piece.forEach((row,y)=>row.forEach((v,x)=>{if(v){const Y=py+y;if(Y<0)top=true;else board[Y][px+x]=cur;}}));
    api.snd('place');
    if(top){alive=false;api.over(score);return;}
    const full=[];
    for(let y=0;y<ROWS;y++)if(board[y].every(v=>v>=0))full.push(y);
    if(full.length)pending={rows:full,t:180};
    else spawn();}
  function applyClear(){const full=pending.rows;
    board=board.filter((_,y)=>!full.includes(y));
    while(board.length<ROWS)board.unshift(Array(COLS).fill(-1));
    lines+=full.length;level=1+(lines/10|0);dropI=gravMs();
    score+=[0,100,300,500,800][full.length]*level;
    api.score(score);api.snd('clear');
    api.msg(['','SINGLE','DOUBLE','TRIPLE','TETRIS!'][full.length]);
    pending=null;spawn();}
  const tryMove=(dx,dy)=>{if(!hit(piece,px+dx,py+dy)){px+=dx;py+=dy;return true;}return false;};
  function tryRot(d){const r=rot(piece,d);
    for(const k of [0,-1,1,-2,2]){if(!hit(r,px+k,py)){piece=r;px+=k;api.snd('flip');return;}}}
  function hardDrop(){if(!ok())return;let n=0;while(tryMove(0,1))n++;
    score+=n*2;api.score(score);api.snd('hit');lock();acc=0;}
  function soft(){if(!ok())return;if(tryMove(0,1)){score++;api.score(score);}}
  function cell(x,y,s,pi,a=1){const p=SHAPES[pi];ctx.globalAlpha=a;
    ctx.fillStyle=p.f;ctx.fillRect(x,y,s,s);
    ctx.fillStyle='rgba(0,0,0,.55)';
    if(p.p===1)for(let i=4;i<s;i+=6)ctx.fillRect(x,y+i,s,2);
    if(p.p===2)for(let i=5;i<s;i+=8)for(let j=5;j<s;j+=8)ctx.fillRect(x+i-1,y+j-1,3,3);
    if(p.p===3){ctx.save();ctx.beginPath();ctx.rect(x,y,s,s);ctx.clip();ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=2;
      for(let i=-s;i<s;i+=7){ctx.beginPath();ctx.moveTo(x+i,y+s);ctx.lineTo(x+i+s,y);ctx.stroke();}ctx.restore();}
    if(p.p===4)for(let i=3;i<s-2;i+=6)ctx.fillRect(x+i,y+i,3,3);
    if(p.p===5)for(let i=4;i<s;i+=6)ctx.fillRect(x+i,y,2,s);
    if(p.p===6){ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=2;ctx.strokeRect(x+4,y+4,s-8,s-8);}
    ctx.globalAlpha=1;ctx.strokeStyle='rgba(0,0,0,.9)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,s-1,s-1);}
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,COLS*S+120,ROWS*S);
    ctx.strokeStyle='#1A1A1A';
    for(let i=1;i<COLS;i++){ctx.beginPath();ctx.moveTo(i*S,0);ctx.lineTo(i*S,ROWS*S);ctx.stroke();}
    for(let i=1;i<ROWS;i++){ctx.beginPath();ctx.moveTo(0,i*S);ctx.lineTo(COLS*S,i*S);ctx.stroke();}
    board.forEach((row,y)=>{
      if(pending&&pending.rows.includes(y)){
        const a=.45+.55*Math.abs(Math.sin(pending.t/28));
        ctx.fillStyle='rgba(255,255,255,'+a+')';ctx.fillRect(0,y*S,COLS*S,S);return;}
      row.forEach((v,x)=>{if(v>=0)cell(x*S,y*S,S,v);});});
    if(!alive)return;
    let gy=py;while(!hit(piece,px,gy+1))gy++;
    piece.forEach((row,y)=>row.forEach((v,x)=>{if(v&&gy+y>=0){
      ctx.strokeStyle='rgba(255,255,255,.3)';ctx.strokeRect((px+x)*S+1.5,(gy+y)*S+1.5,S-3,S-3);}}));
    piece.forEach((row,y)=>row.forEach((v,x)=>{if(v&&py+y>=0)cell((px+x)*S,(py+y)*S,S,cur);}));
    const ox=COLS*S+14;
    ctx.fillStyle='#AAAAAA';ctx.font='10px monospace';ctx.fillText('NEXT',ox,20);
    const nm=SHAPES[next].m,ns=18;
    nm.forEach((row,y)=>row.forEach((v,x)=>{if(v)cell(ox+x*ns,34+y*ns,ns,next);}));
    ctx.fillText('LEVEL '+level,ox,150);ctx.fillText('LINES '+lines,ox,168);}
  function step(dt){
    if(pending){pending.t-=dt*1000;if(pending.t<=0)applyClear();return;}
    acc+=dt*1000;
    while(acc>dropI){acc-=dropI;if(!tryMove(0,1)){lock();return;}}}
  api.loop(dt=>{if(!alive)return;step(dt);draw();});
  api.on(window,'keydown',e=>{if(!ok())return;const k=e.key;
    if(k==='ArrowLeft')tryMove(-1,0);
    else if(k==='ArrowRight')tryMove(1,0);
    else if(k==='ArrowDown')soft();
    else if(k==='ArrowUp'||k==='x'||k==='X')tryRot(1);
    else if(k==='z'||k==='Z')tryRot(-1);
    else if(k===' ')hardDrop();});
  api.tc(swipe(cv,d=>{if(!ok())return;
    if(d==='left')tryMove(-1,0);else if(d==='right')tryMove(1,0);
    else if(d==='down')hardDrop();else if(d==='tap')tryRot(1);}));
  api.pad([
    {i:'◀',rep:()=>{if(ok())tryMove(-1,0);}},
    {i:'▶',rep:()=>{if(ok())tryMove(1,0);}},
    {i:'⟳',big:true,d:()=>{if(ok())tryRot(1);}},
    {i:'▼',rep:soft},
    {i:'⤓',big:true,d:hardDrop}]);
  function reset(){board=Array.from({length:ROWS},()=>Array(COLS).fill(-1));
    bag=[];score=0;lines=0;level=1;acc=0;dropI=gravMs();alive=true;pending=null;
    next=nextP();spawn();api.score(0);draw();}
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
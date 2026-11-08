import {RI} from './util.js';
const N=8,S=32,BW=N*S,W=300,H=478,BX=(W-BW)/2,BY=16,TY=BY+BW+30,TS=20,TRAYH=86,LIFT=46;
const SH=[['#FFFFFF',0],['#DDDDDD',1],['#AAAAAA',5],['#FFFFFF',6],['#DDDDDD',3],['#AAAAAA',2]];
const P=[
 [[[1]],3],
 [[[1,1]],3],[[[1],[1]],3],
 [[[1,1,1]],3],[[[1],[1],[1]],3],
 [[[1,1,1,1]],2],[[[1],[1],[1],[1]],2],
 [[[1,1,1,1,1]],1],[[[1],[1],[1],[1],[1]],1],
 [[[1,1],[1,1]],3],
 [[[1,1,1],[1,1,1]],1],[[[1,1],[1,1],[1,1]],1],
 [[[1,1,1],[1,1,1],[1,1,1]],1],
 [[[1,0],[1,0],[1,1]],1],[[[0,1],[0,1],[1,1]],1],
 [[[1,1],[1,0],[1,0]],1],[[[1,1],[0,1],[0,1]],1],
 [[[1,0],[1,1]],2],[[[0,1],[1,1]],2],[[[1,1],[1,0]],2],[[[1,1],[0,1]],2],
 [[[1,1,1],[0,1,0]],1],[[[0,1,0],[1,1,1]],1],
 [[[1,1,0],[0,1,1]],1],[[[0,1,1],[1,1,0]],1]];
const BAG=[];P.forEach((e,i)=>{for(let k=0;k<e[1];k++)BAG.push(i);});
const newPiece=()=>{const i=BAG[RI(0,BAG.length-1)];return{m:P[i][0].map(r=>[...r]),s:i%SH.length};};

export default {create(api){
  const {cv,ctx}=api.canvas(W,H);
  let board,tray,score,combo,live,drag;
  function cell(px,py,s,si,a=1){const[f,p]=SH[si];ctx.globalAlpha=a;
    ctx.fillStyle=f;ctx.fillRect(px,py,s,s);
    ctx.fillStyle='rgba(0,0,0,.5)';
    if(p===1)for(let i=Math.floor(s/2)-1;i<s;i+=7)ctx.fillRect(px,py+i,s,2);
    if(p===2)for(let i=4;i<s;i+=9)for(let j=4;j<s;j+=9)ctx.fillRect(px+i-1,py+j-1,2,2);
    if(p===3)for(let i=4;i<s-3;i+=7)ctx.fillRect(px+i,py+i,2,2);
    if(p===5)for(let i=4;i<s;i+=7)ctx.fillRect(px+i,py,2,s);
    if(p===6){ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=2;ctx.strokeRect(px+4,py+4,s-8,s-8);}
    ctx.globalAlpha=1;ctx.strokeStyle='rgba(0,0,0,.9)';ctx.lineWidth=1;ctx.strokeRect(px+.5,py+.5,s-1,s-1);}
  const canPlace=(m,gx,gy)=>m.every((row,y)=>row.every((v,x)=>{if(!v)return true;
    const X=gx+x,Y=gy+y;return X>=0&&Y>=0&&X<N&&Y<N&&board[Y][X]<0;}));
  const anyFit=m=>{for(let gy=0;gy<=N-m.length;gy++)
    for(let gx=0;gx<=N-m[0].length;gx++)if(canPlace(m,gx,gy))return true;
    return false;};
  function refill(){let g=0;
    do{tray=[newPiece(),newPiece(),newPiece()];}
    while(!tray.some(p=>anyFit(p.m))&&++g<25);}
  function place(ti,gx,gy){const p=tray[ti];let n=0;
    p.m.forEach((row,y)=>row.forEach((v,x)=>{if(v){board[gy+y][gx+x]=p.s;n++;}}));
    score+=n;api.score(score);api.snd('place');tray[ti]=null;
    const rows=[],cols=[];
    for(let r=0;r<N;r++)if(board[r].every(v=>v>=0))rows.push(r);
    for(let c=0;c<N;c++){let f=true;for(let r=0;r<N;r++)if(board[r][c]<0){f=false;break;}if(f)cols.push(c);}
    if(rows.length||cols.length){combo++;
      const del=new Set();
      rows.forEach(r=>{for(let c=0;c<N;c++)del.add(r*N+c);});
      cols.forEach(c=>{for(let r=0;r<N;r++)del.add(r*N+c);});
      del.forEach(i=>board[(i/N)|0][i%N]=-1);
      const lines=rows.length+cols.length;
      score+=del.size*5*combo+lines*10;api.score(score);
      api.snd('clear');
      api.msg((lines>1?'BLAST ×'+lines:'BLAST!')+(combo>1?'  COMBO ×'+combo:''));}
    else combo=0;
    if(tray.every(t=>!t))refill();
    if(!tray.some(t=>t&&anyFit(t.m))){live=false;
      setTimeout(()=>api.over(score,'No room left for your pieces.'),350);}}
  function drawPieceM(m,px,py,s,si,a){m.forEach((row,y)=>row.forEach((v,x)=>{if(v)cell(px+x*s,py+y*s,s,si,a);}));}
  function trayPos(ti){const p=tray[ti];if(!p)return null;
    const pw=p.m[0].length*TS,ph=p.m.length*TS;
    return{px:ti*(W/3)+(W/3-pw)/2,py:TY+12+(TRAYH-24-ph)/2};}
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#111';ctx.fillRect(BX-6,BY-6,BW+12,BW+12);
    ctx.strokeStyle='#252525';ctx.strokeRect(BX-6.5,BY-6.5,BW+13,BW+13);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const v=board[y][x];
      if(v>=0)cell(BX+x*S,BY+y*S,S,v);
      else{ctx.fillStyle='#0f0f0f';ctx.fillRect(BX+x*S,BY+y*S,S,S);
        ctx.strokeStyle='#1A1A1A';ctx.strokeRect(BX+x*S+.5,BY+y*S+.5,S-1,S-1);}}
    ctx.strokeStyle='#252525';ctx.beginPath();ctx.moveTo(8,TY-8);ctx.lineTo(W-8,TY-8);ctx.stroke();
    for(let ti=0;ti<3;ti++){const pos=trayPos(ti);if(!pos)continue;
      if(drag&&drag.ti===ti)continue;
      drawPieceM(tray[ti].m,pos.px,pos.py,TS,tray[ti].s,1);}
    ctx.fillStyle='#666';ctx.font='10px monospace';ctx.textAlign='center';
    ctx.fillText(combo>1?('COMBO ×'+combo):'DRAG PIECES ONTO THE BOARD',W/2,H-10);
    ctx.textAlign='left';
    if(drag){const p=tray[drag.ti];
      const dx=drag.x-drag.gx*S,dy=(drag.y-LIFT)-drag.gy*S;
      const gx=Math.round((dx-BX)/S),gy=Math.round((dy-BY)/S);
      if(canPlace(p.m,gx,gy)){p.m.forEach((row,y)=>row.forEach((v,x)=>{if(v){
        ctx.strokeStyle='#fff';ctx.lineWidth=2;
        ctx.strokeRect(BX+(gx+x)*S+2,BY+(gy+y)*S+2,S-4,S-4);
        ctx.fillStyle='rgba(255,255,255,.18)';
        ctx.fillRect(BX+(gx+x)*S+2,BY+(gy+y)*S+2,S-4,S-4);}}));}
      drawPieceM(p.m,dx,dy,S,p.s,.92);}}
  api.loop(()=>draw());
  const pt=e=>{const r=cv.getBoundingClientRect();
    return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};};
  api.on(cv,'pointerdown',e=>{if(!api.running||api.paused||!live)return;
    const{x,y}=pt(e);
    if(y<TY-10||y>TY+TRAYH+18)return;
    for(let ti=0;ti<3;ti++){const pos=trayPos(ti);if(!pos)continue;
      const p=tray[ti],pw=p.m[0].length*TS,ph=p.m.length*TS;
      if(x>=pos.px-8&&x<=pos.px+pw+8&&y>=pos.py-8&&y<=pos.py+ph+8){
        drag={ti,gx:(x-pos.px)/TS,gy:(y-pos.py)/TS,x,y};
        try{cv.setPointerCapture(e.pointerId);}catch(err){}
        api.snd('pickup');return;}}});
  api.on(cv,'pointermove',e=>{if(!drag)return;
    if(!api.running||api.paused){drag=null;return;}
    const p=pt(e);drag.x=p.x;drag.y=p.y;});
  const drop=()=>{if(!drag)return;const d=drag;drag=null;
    if(!api.running||api.paused||!live)return;
    const p=tray[d.ti];
    const dx=d.x-d.gx*S,dy=(d.y-LIFT)-d.gy*S;
    const gx=Math.round((dx-BX)/S),gy=Math.round((dy-BY)/S);
    if(canPlace(p.m,gx,gy))place(d.ti,gx,gy);
    else if(d.y-LIFT>BY-30&&d.y<BY+BW+60)api.snd('error');};
  api.on(cv,'pointerup',drop);
  api.on(cv,'pointercancel',()=>{drag=null;});
  function reset(){board=Array.from({length:N},()=>Array(N).fill(-1));
    score=0;combo=0;live=true;drag=null;refill();api.score(0);draw();}
  return {start:reset,restart:reset,pause(){drag=null;},resume(){},destroy(){}};
}};
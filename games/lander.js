import {R} from './util.js';
export default {create(api){
  const W=300,H=420,{cv,ctx}=api.canvas(W,H);
  let x,y,vx,vy,fuel,terrain,pad,alive,done;
  const inp={t:false,l:false,r:false};
  function gen(){terrain=[];let h2=330;
    for(let i=0;i<=30;i++){h2=Math.max(270,Math.min(396,h2+R(-26,26)));terrain.push(h2);}
    const pi=4+((Math.random()*20)|0);
    const avg=(terrain[pi]+terrain[pi+2])/2;
    terrain[pi]=avg;terrain[pi+1]=avg;terrain[pi+2]=avg;
    pad={x0:pi*10,x1:(pi+2)*10,y:avg};}
  const groundAt=px=>{const i=Math.max(0,Math.min(29,px/10|0));
    const f=px/10-i;return terrain[i]*(1-f)+terrain[i+1]*f;};
  api.loop(dt=>{if(!alive||done)return;
    vy+=66*dt;
    if(inp.t&&fuel>0){vy-=150*dt;fuel-=26*dt;api.snd;}
    if(inp.l)vx-=110*dt; if(inp.r)vx+=110*dt;
    vx*=1-.25*dt;
    x+=vx*dt;y+=vy*dt;
    if(x<8){x=8;vx=Math.abs(vx)*.4;} if(x>W-8){x=W-8;vx=-Math.abs(vx)*.4;}
    if(y<10){y=10;vy=Math.max(vy,0);}
    fuel=Math.max(0,fuel);
    const gy=groundAt(x);
    if(y>=gy-9){
      const onPad=x>=pad.x0&&x<=pad.x1;
      if(onPad&&Math.abs(vy)<52&&Math.abs(vx)<28){done=true;y=gy-9;
        const sc=Math.round(fuel)+60;api.snd('land');
        setTimeout(()=>api.win(sc,'Touchdown. Fuel left: '+Math.round(fuel)),500);}
      else{alive=false;api.snd('die');
        setTimeout(()=>api.over(Math.round(fuel),onPad?'Too rough. Ease off.':'Missed the pad.'),300);}}
    draw();});
  function draw(){ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
    for(let i=0;i<24;i++){ctx.fillStyle='rgba(255,255,255,'+((i*7919)%10)/40+')';
      ctx.fillRect((i*131)%W,(i*97)%220,2,2);}
    ctx.beginPath();ctx.moveTo(0,H);
    terrain.forEach((t,i)=>ctx.lineTo(i*10,t));
    ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle='#1A1A1A';ctx.fill();
    ctx.strokeStyle='#666';ctx.beginPath();terrain.forEach((t,i)=>i?ctx.lineTo(i*10,t):ctx.moveTo(0,t));ctx.stroke();
    ctx.strokeStyle='#fff';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(pad.x0,pad.y);ctx.lineTo(pad.x1,pad.y);ctx.stroke();ctx.lineWidth=1;
    if(alive&&!done){
      if(inp.t&&fuel>0){ctx.fillStyle='#DDDDDD';ctx.beginPath();
        ctx.moveTo(x-4,y+9);ctx.lineTo(x,y+18+Math.random()*6);ctx.lineTo(x+4,y+9);ctx.fill();}
      ctx.fillStyle='#fff';ctx.beginPath();
      ctx.moveTo(x,y-9);ctx.lineTo(x-8,y+7);ctx.lineTo(x+8,y+7);ctx.closePath();ctx.fill();
      ctx.fillRect(x-11,y+7,22,3);}
    ctx.fillStyle='#252525';ctx.fillRect(10,10,120,10);
    ctx.fillStyle='#fff';ctx.fillRect(10,10,120*fuel/100,10);
    ctx.fillStyle='#AAA';ctx.font='9px monospace';ctx.fillText('FUEL',136,18);}
  api.on(window,'keydown',e=>{const k=e.key;
    if(k==='ArrowUp'||k===' ')inp.t=true;
    if(k==='ArrowLeft'||k==='a')inp.l=true;
    if(k==='ArrowRight'||k==='d')inp.r=true;});
  api.on(window,'keyup',e=>{const k=e.key;
    if(k==='ArrowUp'||k===' ')inp.t=false;
    if(k==='ArrowLeft'||k==='a')inp.l=false;
    if(k==='ArrowRight'||k==='d')inp.r=false;});
  api.pad([
    {i:'◀',d:()=>inp.l=true,u:()=>inp.l=false},
    {i:'▲',big:true,d:()=>inp.t=true,u:()=>inp.t=false},
    {i:'▶',d:()=>inp.r=true,u:()=>inp.r=false}]);
  function reset(){gen();x=W/2;y=40;vx=R(-16,16);vy=0;fuel=100;alive=true;done=false;}
  reset();
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
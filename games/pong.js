import {R,clamp} from './util.js';
export default {create(api){
  const W=480,H=300,{cv,ctx}=api.canvas(W,H);
  let py,ay,bx,by,vx,vy,score,alive,targetY=null;
  const PW=10,PH=60,speedBase=()=>260+score*9;
  function serve(dir){bx=W/2;by=H/2;const a=R(-0.9,0.9);const s=speedBase();
    vx=Math.cos(a)*s*dir;vy=Math.sin(a)*s;}
  const paddle=(x,y)=>{ctx.fillStyle='#fff';ctx.fillRect(x,y,PW,PH);};
  function draw(){ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#252525';ctx.setLineDash([8,10]);ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
    paddle(18,py);paddle(W-28,ay);
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx,by,6,0,7);ctx.fill();
    ctx.fillStyle='#666';ctx.font='12px monospace';ctx.fillText('CPU',W-58,20);}
  function update(dt){
    // player: keys or pointer target
    if(keys.up)py-=420*dt; if(keys.down)py+=420*dt;
    if(targetY!=null)py+=(targetY-PH/2-py)*Math.min(1,dt*14);
    py=clamp(py,0,H-PH);
    // AI
    const aiSp=Math.min(170+score*14,360);
    const err=Math.sin(performance.now()/300)*22*Math.max(.2,1-score/25);
    const ty=vx>0?by+err:H/2;
    ay+=clamp(ty-(ay+PH/2),-aiSp*dt,aiSp*dt);ay=clamp(ay,0,H-PH);
    // ball
    bx+=vx*dt;by+=vy*dt;
    if(by<6){by=6;vy=Math.abs(vy);} if(by>H-6){by=H-6;vy=-Math.abs(vy);}
    // player paddle
    if(vx<0&&bx-6<=28&&bx-6>=-14&&by>=py-6&&by<=py+PH+6){
      const rel=clamp((by-(py+PH/2))/(PH/2),-1,1);
      const sp=Math.min(Math.hypot(vx,vy)*1.045,620);
      vx=Math.cos(rel*1.05)*sp;vy=Math.sin(rel*1.05)*sp;bx=29+6;api.snd('hit');}
    // AI paddle
    if(vx>0&&bx+6>=W-28&&bx+6<=W+14&&by>=ay-6&&by<=ay+PH+6){
      const rel=clamp((by-(ay+PH/2))/(PH/2),-1,1);
      const sp=Math.hypot(vx,vy);
      vx=-Math.cos(rel*1.0)*sp;vy=Math.sin(rel*1.0)*sp;bx=W-29-6;api.snd('move');}
    if(bx<-10){alive=false;api.over(score,'The CPU got you. Rude.');}
    if(bx>W+10){score++;api.score(score);api.snd('score');api.msg('+1');serve(-1);}}
  const keys={up:false,down:false};
  api.on(window,'keydown',e=>{if(e.key==='w'||e.key==='W'||e.key==='ArrowUp')keys.up=true;
    if(e.key==='s'||e.key==='S'||e.key==='ArrowDown')keys.down=true;});
  api.on(window,'keyup',e=>{if(e.key==='w'||e.key==='W'||e.key==='ArrowUp')keys.up=false;
    if(e.key==='s'||e.key==='S'||e.key==='ArrowDown')keys.down=false;});
  const pY=e=>{const r=cv.getBoundingClientRect();targetY=(e.clientY-r.top)*H/r.height;};
  api.on(cv,'pointermove',pY);api.on(cv,'pointerdown',pY);
  api.loop(dt=>{if(alive)update(dt);draw();});
  function reset(){score=0;alive=true;py=H/2-PH/2;ay=H/2-PH/2;targetY=null;api.score(0);serve(Math.random()<.5?1:-1);}
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
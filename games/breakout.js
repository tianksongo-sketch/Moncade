import {R,clamp} from './util.js';
export default {create(api){
  const W=480,H=400,{cv,ctx}=api.canvas(W,H);
  let P,ball,bricks,pows,score,lives,level,stuck,wideT,slowT,alive,launch;
  const r=6;
  function buildBricks(){bricks=[];const rows=Math.min(3+level,7),cols=8,bw=(W-20-28)/cols;
    for(let q=0;q<rows;q++)for(let c=0;c<cols;c++)
      bricks.push({x:10+c*(bw+4),y:46+q*20,w:bw,h:16,hp:level>2&&q<2?2:1});}
  function resetBall(){stuck=true;launch=false;ball={x:W/2,y:H-40,vx:0,vy:0};}
  const padX=()=>P.x+P.w/2;
  function doLaunch(){if(!stuck)return;stuck=false;const a=R(-1.05,-2.1+1)+0;const ang=R(-2.4,-0.7);
    const sp=300+level*18;ball.vx=Math.cos(ang)*sp;ball.vy=Math.sin(ang)*sp;api.snd('hit');}
  function update(dt){
    wideT-=dt;slowT-=dt;
    P.w=wideT>0?132:80;
    if(keys.l)P.x-=440*dt; if(keys.r)P.x+=440*dt;
    if(P.target!=null)P.x+=(P.target-P.w/2-P.x)*Math.min(1,dt*16);
    P.x=clamp(P.x,4,W-P.w-4);
    if(stuck){ball.x=padX();ball.y=H-40-r;if(launch)doLaunch();}
    else{
      const f=slowT>0?.62:1;
      ball.x+=ball.vx*dt*f;ball.y+=ball.vy*dt*f;
      if(ball.x<r){ball.x=r;ball.vx=Math.abs(ball.vx);}
      if(ball.x>W-r){ball.x=W-r;ball.vx=-Math.abs(ball.vx);}
      if(ball.y<r){ball.y=r;ball.vy=Math.abs(ball.vy);}
      // paddle
      if(ball.vy>0&&ball.y+r>=H-26&&ball.y+r<=H-8&&ball.x>=P.x-r&&ball.x<=P.x+P.w+r){
        const rel=clamp((ball.x-padX())/(P.w/2),-1,1),ang=rel*1.05;
        const sp=Math.min(Math.hypot(ball.vx,ball.vy)*1.012,540);
        ball.vx=Math.sin(ang)*sp;ball.vy=-Math.abs(Math.cos(ang)*sp);ball.y=H-26-r;api.snd('hit');}
      // bricks
      for(const b of bricks){if(b.hp<=0)continue;
        const nx=clamp(ball.x,b.x,b.x+b.w),ny=clamp(ball.y,b.y,b.y+b.h);
        if((ball.x-nx)**2+(ball.y-ny)**2<=r*r){
          b.hp--;score+=b.hp<0?0:10;api.score(score);api.snd('pop');
          if(Math.abs(ball.x-(b.x+b.w/2))>Math.abs(ball.y-(b.y+b.h/2))*(b.w/b.h))ball.vx=-ball.vx;else ball.vy=-ball.vy;
          if(b.hp<=0&&Math.random()<.16)pows.push({x:b.x+b.w/2,y:b.y,t:['W','S','L'][Math.random()*3|0]});
          break;}}
      if(ball.y>H+r){lives--;api.snd('die');
        if(lives<=0){alive=false;api.over(score,'Out of lives.');}
        else{api.msg('LIVES '+lives);resetBall();}}
    }
    pows.forEach(p=>p.y+=130*dt);
    pows=pows.filter(p=>{
      if(p.y>H+20)return false;
      if(p.y>=H-30&&p.x>=P.x-10&&p.x<=P.x+P.w+10){
        if(p.t==='W'){wideT=10;api.msg('WIDE');}
        if(p.t==='S'){slowT=8;api.msg('SLOW');}
        if(p.t==='L'){lives=Math.min(5,lives+1);api.msg('+1 LIFE');}
        api.snd('score');score+=50;api.score(score);return false;}
      return true;});
    if(bricks.every(b=>b.hp<=0)){level++;api.snd('win');api.msg('LEVEL '+level);
      buildBricks();resetBall();}
  }
  function draw(){ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
    bricks.forEach(b=>{if(b.hp<=0)return;
      ctx.fillStyle=b.hp>1?'#FFFFFF':'#AAAAAA';
      ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.strokeStyle='#080808';ctx.strokeRect(b.x+.5,b.y+.5,b.w-1,b.h-1);});
    pows.forEach(p=>{ctx.fillStyle='#fff';ctx.fillRect(p.x-9,p.y-9,18,18);
      ctx.fillStyle='#000';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(p.t,p.x,p.y+4);ctx.textAlign='left';});
    ctx.fillStyle='#fff';ctx.fillRect(P.x,H-26,P.w,10);
    ctx.beginPath();ctx.arc(ball.x,ball.y,r,0,7);ctx.fill();
    ctx.fillStyle='#666';ctx.font='12px monospace';
    ctx.fillText('LVL '+level,10,H-8);ctx.fillText('♥'.repeat(Math.max(0,lives)),W-70,H-8);
    if(stuck){ctx.fillStyle='#AAA';ctx.font='11px monospace';ctx.textAlign='center';
      ctx.fillText('TAP / SPACE TO LAUNCH',W/2,H/2);ctx.textAlign='left';}}
  const keys={l:false,r:false};
  api.on(window,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.l=true;
    if(e.key==='ArrowRight'||e.key==='d')keys.r=true;
    if(e.key===' '&&api.running&&!api.paused)launch=true;});
  api.on(window,'keyup',e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.l=false;
    if(e.key==='ArrowRight'||e.key==='d')keys.r=false;});
  const pX=e=>{const rc=cv.getBoundingClientRect();P.target=(e.clientX-rc.left)*W/rc.width;};
  api.on(cv,'pointermove',pX);
  api.on(cv,'pointerdown',e=>{pX(e);if(stuck)launch=true;});
  api.loop(dt=>{if(alive)update(dt);draw();});
  function reset(){score=0;lives=3;level=1;wideT=0;slowT=0;alive=true;pows=[];
    P={x:W/2-40,w:80,target:null};buildBricks();resetBall();api.score(0);draw();}
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
import {R} from './util.js';
export default {create(api){
  const W=360,H=520,{cv,ctx}=api.canvas(W,H);
  let y,vy,pipes,score,alive,started;
  const x=90,r=11;
  const GRAV=950, FLAP=-310, MAXFALL=470; // gentler physics
  function flap(){if(!alive)return;vy=FLAP;api.snd('flap');}
  function update(dt){
    vy=Math.min(vy+GRAV*dt,MAXFALL);
    y+=vy*dt;
    const speed=Math.min(250,150+score*3);
    const gap=Math.max(118,155-score*.9);
    pipes.forEach(p=>p.x-=speed*dt);
    if(!pipes.length||pipes[pipes.length-1].x<W-220)
      pipes.push({x:W+20,g:R(50,H-50-gap),gap,passed:false});
    pipes=pipes.filter(p=>p.x>-60);
    for(const p of pipes){
      if(!p.passed&&p.x+52<x){p.passed=true;score++;api.score(score);api.snd('score');}
      if(x+r-2>p.x&&x-r+2<p.x+52&&(y-r+2<p.g||y+r-2>p.g+p.gap)){die();return;}}
    if(y>H-r){die();return;}
    if(y<r){y=r;vy=Math.max(vy,0);}}
  function die(){alive=false;api.snd('die');api.over(score,'The pillars remain undefeated.');}
  function draw(){ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff';
    pipes.forEach(p=>{ctx.fillRect(p.x,0,52,p.g);ctx.fillRect(p.x,p.g+p.gap,52,H);
      ctx.fillStyle='#080808';ctx.fillRect(p.x+4,p.g-6,52,6);ctx.fillRect(p.x+4,p.g+p.gap,52,6);
      ctx.fillStyle='#fff';});
    ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
    ctx.fillStyle='#080808';ctx.beginPath();ctx.arc(x+4,y-3,2.5,0,7);ctx.fill();}
  api.loop(dt=>{if(alive&&started)update(dt);draw();});
  const act=()=>{if(!api.running||api.paused)return;if(!started)started=true;flap();};
  api.on(cv,'pointerdown',act);
  api.on(window,'keydown',e=>{if(e.key===' ')act();});
  function reset(){y=H/2;vy=0;pipes=[];score=0;alive=true;started=true;api.score(0);}
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
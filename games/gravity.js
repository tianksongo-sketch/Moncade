import {R} from './util.js';
export default {create(api){
  const W=360,H=520,{cv,ctx}=api.canvas(W,H);
  const PX=90,PR=11;
  let y,vy,g,obs,dist,alive,spawnD;
  const flip=()=>{if(!alive)return;g=-g;api.snd('jump');};
  api.on(cv,'pointerdown',flip);
  api.on(window,'keydown',e=>{if(e.key===' '||e.key==='ArrowUp'||e.key==='ArrowDown')flip();});
  api.pad([{i:'⟳',big:true,d:flip}]);
  function reset(){y=H/2;vy=0;g=1;obs=[];dist=0;alive=true;spawnD=0;api.score(0);}
  function die(msg){alive=false;api.snd('die');api.over(Math.floor(dist/10),msg);}
  function update(dt){
    const sp=200+dist*0.04;
    vy=Math.max(-620,Math.min(620,vy+g*1500*dt));y+=vy*dt;
    if(y<PR||y>H-PR){die('Gravity wins.');return;}
    dist+=sp*dt;
    spawnD-=sp*dt;
    if(spawnD<=0){obs.push({x:W+10,top:Math.random()<.5,h:R(70,170)});spawnD=R(170,270);}
    for(const o of obs)o.x-=sp*dt;
    obs=obs.filter(o=>o.x>-40);
    for(const o of obs){
      const oy=o.top?0:H-o.h;
      if(PX+PR>o.x&&PX-PR<o.x+26&&y-PR<oy+o.h&&y+PR>oy){die('Spiked.');return;}
    }
    api.score(Math.floor(dist/10));
  }
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';
    for(const o of obs){const oy=o.top?0:H-o.h;ctx.fillRect(o.x,oy,26,o.h);}
    ctx.beginPath();ctx.arc(PX,y,PR,0,7);ctx.fill();
    ctx.fillStyle='#080808';ctx.beginPath();ctx.moveTo(PX-4,g>0?y-4:y+4);ctx.lineTo(PX+4,g>0?y-4:y+4);ctx.lineTo(PX,g>0?y+1:y-1);ctx.fill();
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

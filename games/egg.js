import {R} from './util.js';
export default {create(api){
  const W=340,H=520,{cv,ctx}=api.canvas(W,H);
  const k={l:false,r:false},BW=70,BY=H-46;
  let bx,eggs,lives,score,alive,spawnT,speed;
  const kd=e=>{if(e.key==='ArrowLeft'||e.key==='a')k.l=true;if(e.key==='ArrowRight'||e.key==='d')k.r=true;};
  const ku=e=>{if(e.key==='ArrowLeft'||e.key==='a')k.l=false;if(e.key==='ArrowRight'||e.key==='d')k.r=false;};
  api.on(window,'keydown',kd);api.on(window,'keyup',ku);
  api.pad([{i:'◀',d:()=>k.l=true,u:()=>k.l=false},{i:'▶',d:()=>k.r=true,u:()=>k.r=false}]);
  function reset(){bx=W/2;eggs=[];lives=3;score=0;alive=true;spawnT=0.5;speed=150;api.score(0);}
  function update(dt){
    bx=Math.max(BW/2,Math.min(W-BW/2,bx+((k.r?1:0)-(k.l?1:0))*430*dt));
    spawnT-=dt;
    if(spawnT<=0){eggs.push({x:R(20,W-20),y:-14,v:speed*R(.85,1.15)});spawnT=R(.7,1.2)*Math.max(.4,1-score*.015);}
    for(const e of eggs)e.y+=e.v*dt;
    eggs=eggs.filter(e=>{
      if(e.y>BY-12&&e.y<BY+10&&Math.abs(e.x-bx)<BW/2+6){score++;api.score(score);api.snd('pickup');speed=Math.min(340,150+score*4);return false;}
      if(e.y>H+12){lives--;api.snd('error');return false;}
      return true;});
    if(lives<=0){alive=false;api.snd('die');api.over(score,'Cracked. Try again.');}
  }
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';
    ctx.fillRect(bx-BW/2,BY,BW,10);ctx.fillRect(bx-BW/2,BY-12,6,12);ctx.fillRect(bx+BW/2-6,BY-12,6,12);
    for(const e of eggs){ctx.beginPath();ctx.ellipse(e.x,e.y,8,10,0,0,7);ctx.fill();}
    for(let i=0;i<3;i++){ctx.fillStyle=i<lives?'#fff':'#333';ctx.beginPath();ctx.arc(20+i*18,22,6,0,7);ctx.fill();}
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

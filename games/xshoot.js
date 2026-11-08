import {R} from './util.js';
export default {create(api){
  const W=360,H=520,{cv,ctx}=api.canvas(W,H);
  const k={u:false,d:false},SX=56;
  let sy,bullets,foes,lives,score,alive,spawnT,cool;
  const fire=()=>{if(!alive||cool>0)return;bullets.push({x:SX+14,y:sy});cool=.22;api.snd('flap');};
  api.on(cv,'pointerdown',fire);
  api.on(window,'keydown',e=>{if(e.key==='ArrowUp'||e.key==='w')k.u=true;if(e.key==='ArrowDown'||e.key==='s')k.d=true;if(e.key===' ')fire();});
  api.on(window,'keyup',e=>{if(e.key==='ArrowUp'||e.key==='w')k.u=false;if(e.key==='ArrowDown'||e.key==='s')k.d=false;});
  api.pad([{i:'▲',d:()=>k.u=true,u:()=>k.u=false},{i:'▼',d:()=>k.d=true,u:()=>k.d=false},{i:'FIRE',big:true,d:fire}]);
  function reset(){sy=H/2;bullets=[];foes=[];lives=3;score=0;alive=true;spawnT=.6;cool=0;k.u=k.d=false;api.score(0);}
  function update(dt){
    cool=Math.max(0,cool-dt);
    sy=Math.max(24,Math.min(H-24,sy+((k.d?1:0)-(k.u?1:0))*300*dt));
    for(const b of bullets)b.x+=520*dt;
    bullets=bullets.filter(b=>b.x<W+10);
    spawnT-=dt;
    if(spawnT<=0){foes.push({x:W+20,y:R(30,H-30),hp:1});spawnT=R(.5,1)*Math.max(.35,1-score*.01);}
    const spd=120+score*1.5;
    for(const f of foes)f.x-=spd*dt;
    for(const b of bullets)for(const f of foes){
      if(f.hp>0&&b.x>f.x-14&&b.x<f.x+14&&Math.abs(b.y-f.y)<14){f.hp=0;b.x=W+99;score+=10;api.score(score);api.snd('hit');}
    }
    bullets=bullets.filter(b=>b.x<W+10);
    foes=foes.filter(f=>{
      if(f.hp<=0)return false;
      if(f.x<SX+14&&Math.abs(f.y-sy)<22){lives--;api.snd('error');return false;}
      if(f.x<-20){lives--;api.snd('error');return false;}
      return true;});
    if(lives<=0){alive=false;api.snd('die');api.over(score,'Overrun.');}
  }
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';
    ctx.beginPath();ctx.moveTo(SX+28,sy);ctx.lineTo(SX-6,sy-14);ctx.lineTo(SX-6,sy+14);ctx.closePath();ctx.fill();
    for(const b of bullets)ctx.fillRect(b.x,b.y-1.5,10,3);
    for(const f of foes){ctx.fillRect(f.x-14,f.y-10,28,20);ctx.fillStyle='#080808';ctx.fillRect(f.x-6,f.y-4,4,4);ctx.fillRect(f.x+2,f.y-4,4,4);ctx.fillStyle='#fff';}
    for(let i=0;i<3;i++){ctx.fillStyle=i<lives?'#fff':'#333';ctx.beginPath();ctx.arc(20+i*18,22,6,0,7);ctx.fill();}
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

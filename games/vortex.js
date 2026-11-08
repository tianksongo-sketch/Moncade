import {R} from './util.js';
export default {create(api){
  const W=360,H=520,{cv,ctx}=api.canvas(W,H);
  const CX=W/2,CY=H/2,RAD=120;
  let ang,dirv,foes,score,alive,spawnT,spd;
  const flip=()=>{if(!alive)return;dirv=-dirv;api.snd('click');};
  api.on(cv,'pointerdown',flip);
  api.on(window,'keydown',e=>{if(e.key===' ')flip();});
  api.pad([{i:'⟳',big:true,d:flip}]);
  function reset(){ang=-Math.PI/2;dirv=1;foes=[];score=0;alive=true;spawnT=0.6;spd=130;api.score(0);}
  const angDiff=(a,b)=>{let d=(a-b)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return Math.abs(d);};
  function update(dt){
    ang+=dirv*2.6*dt;
    spawnT-=dt;
    if(spawnT<=0){foes.push({a:R(0,Math.PI*2),r:320});spawnT=R(.45,.85)*Math.max(.5,1-score*.02);}
    for(const f of foes)f.r-=(spd+score*2)*dt;
    foes=foes.filter(f=>{
      if(!alive)return true;
      if(f.r<=RAD+8){
        if(angDiff(f.a,ang)<0.28){alive=false;api.snd('die');api.over(score,'Swallowed.');return false;}
        score++;api.score(score);api.snd('pop');return false;}
      return true;});
  }
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.strokeStyle='#fff';
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(CX,CY,RAD,0,7);ctx.stroke();
    ctx.beginPath();ctx.arc(CX,CY,6,0,7);ctx.fill();
    for(const f of foes){ctx.beginPath();ctx.arc(CX+Math.cos(f.a)*f.r,CY+Math.sin(f.a)*f.r,7,0,7);ctx.fill();}
    ctx.beginPath();ctx.arc(CX+Math.cos(ang)*RAD,CY+Math.sin(ang)*RAD,11,0,7);ctx.fill();
    ctx.fillStyle='#080808';ctx.beginPath();ctx.arc(CX+Math.cos(ang)*RAD,CY+Math.sin(ang)*RAD,4,0,7);ctx.fill();
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

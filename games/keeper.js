import {R} from './util.js';
export default {create(api){
  const W=340,H=520,{cv,ctx}=api.canvas(W,H);
  const k={l:false,r:false},GY=H-90;
  let kx,shot,score,goals,alive;
  const kd=e=>{if(e.key==='ArrowLeft'||e.key==='a')k.l=true;if(e.key==='ArrowRight'||e.key==='d')k.r=true;};
  const ku=e=>{if(e.key==='ArrowLeft'||e.key==='a')k.l=false;if(e.key==='ArrowRight'||e.key==='d')k.r=false;};
  api.on(window,'keydown',kd);api.on(window,'keyup',ku);
  api.pad([{i:'◀',d:()=>k.l=true,u:()=>k.l=false},{i:'▶',d:()=>k.r=true,u:()=>k.r=false}]);
  function newShot(){const tx=[W*.2,W*.5,W*.8][Math.floor(Math.random()*3)];shot={tx,t:0,dur:shot?Math.max(.5,shot.dur*.95):1.1};}
  function reset(){kx=W/2;score=0;goals=0;alive=true;shot=null;newShot();api.score(0);}
  function update(dt){
    kx=Math.max(40,Math.min(W-40,kx+((k.r?1:0)-(k.l?1:0))*330*dt));
    shot.t+=dt/shot.dur;
    if(shot.t>=1){
      if(Math.abs(kx-shot.tx)<46){score++;api.score(score);api.snd('pickup');}
      else{goals++;api.snd('error');}
      if(goals>=3){alive=false;api.snd('die');api.over(score,'Three goals. Game over.');return;}
      newShot();
    }
  }
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#fff';ctx.lineWidth=3;
    ctx.strokeRect(30,60,W-60,GY-60);
    ctx.fillStyle='#fff';ctx.fillRect(kx-18,GY-44,36,44);
    ctx.beginPath();ctx.arc(kx,GY-52,9,0,7);ctx.fill();
    const t=Math.min(1,shot.t);
    const bx=W/2+(shot.tx-W/2)*t, by=90+(GY-90)*t;
    ctx.beginPath();ctx.arc(bx,by,9,0,7);ctx.fill();
    for(let i=0;i<3;i++){ctx.fillStyle=i<3-goals?'#fff':'#333';ctx.beginPath();ctx.arc(20+i*18,22,6,0,7);ctx.fill();}
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

export default {create(api){
  const W=340,H=520,{cv,ctx}=api.canvas(W,H);
  const k={l:false,r:false},PW=90,PY=H-40,PH=10;
  let bx,by,vx,vy,px,score,alive;
  const kd=e=>{if(e.key==='ArrowLeft'||e.key==='a')k.l=true;if(e.key==='ArrowRight'||e.key==='d')k.r=true;};
  const ku=e=>{if(e.key==='ArrowLeft'||e.key==='a')k.l=false;if(e.key==='ArrowRight'||e.key==='d')k.r=false;};
  api.on(window,'keydown',kd);api.on(window,'keyup',ku);
  api.pad([{i:'◀',d:()=>k.l=true,u:()=>k.l=false},{i:'▶',d:()=>k.r=true,u:()=>k.r=false}]);
  function reset(){bx=W/2;by=120;vx=140;vy=0;px=W/2;score=0;alive=true;api.score(0);}
  function update(dt){
    px=Math.max(PW/2,Math.min(W-PW/2,px+((k.r?1:0)-(k.l?1:0))*460*dt));
    vy+=900*dt;bx+=vx*dt;by+=vy*dt;
    if(bx<8){bx=8;vx=Math.abs(vx);} if(bx>W-8){bx=W-8;vx=-Math.abs(vx);}
    if(by<8){by=8;vy=Math.abs(vy);}
    if(vy>0&&by+8>=PY&&by<PY+PH+8&&Math.abs(bx-px)<PW/2+8){
      score++;api.score(score);api.snd('hit');
      vy=-(560+Math.min(260,score*6));vx=(bx-px)*5;
    }
    if(by>H+20){alive=false;api.snd('die');api.over(score,'Dropped.');}
  }
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';
    ctx.fillRect(px-PW/2,PY,PW,PH);
    ctx.beginPath();ctx.arc(bx,by,8,0,7);ctx.fill();
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

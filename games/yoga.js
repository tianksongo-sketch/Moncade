export default {create(api){
  const W=360,H=520,{cv,ctx}=api.canvas(W,H);
  const k={l:false,r:false},PL=170;
  let th,w,s,sv,t,alive;
  const kd=e=>{if(e.key==='ArrowLeft'||e.key==='a')k.l=true;if(e.key==='ArrowRight'||e.key==='d')k.r=true;};
  const ku=e=>{if(e.key==='ArrowLeft'||e.key==='a')k.l=false;if(e.key==='ArrowRight'||e.key==='d')k.r=false;};
  api.on(window,'keydown',kd);api.on(window,'keyup',ku);
  api.on(cv,'pointerdown',e=>{const r=cv.getBoundingClientRect();if(e.clientX<r.left+r.width/2)k.l=true;else k.r=true;});
  api.on(window,'pointerup',()=>{k.l=false;k.r=false;});
  api.pad([{i:'◀',d:()=>k.l=true,u:()=>k.l=false},{i:'▶',d:()=>k.r=true,u:()=>k.r=false}]);
  function reset(){th=0;w=0;s=0;sv=0;t=0;alive=true;k.l=k.r=false;api.score(0);}
  function update(dt){
    const push=((k.r?1:0)-(k.l?1:0))*2.2;
    const wind=Math.sin(t*0.9)*0.5+Math.sin(t*2.3)*0.25;
    w+=(-1.8*th+push+wind*0.6)*dt;
    w*=0.985;
    th=Math.max(-0.6,Math.min(0.6,th+w*dt));
    sv+=700*Math.sin(th)*dt;sv*=0.996;s+=sv*dt;
    t+=dt;
    if(Math.abs(s)>PL){alive=false;api.snd('die');api.over(Math.floor(t),'Off balance.');return;}
    api.score(Math.floor(t));
  }
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
    const cx=W/2,cy=H/2;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(th);
    ctx.fillStyle='#fff';ctx.fillRect(-PL,-4,PL*2,8);ctx.restore();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx,cy,6,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(cx+Math.cos(th)*s,cy+Math.sin(th)*s-12,10,0,7);ctx.fill();
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

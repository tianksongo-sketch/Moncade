export default {create(api){
  const W=300,H=420,{cv,ctx}=api.canvas(W,H);
  let stack,moving,camOff,score,alive,perfect,flash;
  function drop(){if(!alive||!api.running||api.paused)return;
    const top=stack[stack.length-1];
    const L=Math.max(top.x,moving.x),R2=Math.min(top.x+top.w,moving.x+moving.w);
    const w=R2-L;
    if(w<=0){alive=false;api.snd('die');api.over(score,'The tower falls.');return;}
    if(Math.abs(top.x-moving.x)<5){stack.push({x:top.x,w:top.w});perfect++;
      score+=perfect>1?3:1;api.msg('PERFECT');api.snd('pickup');flash=1;}
    else{perfect=0;stack.push({x:L,w});score++;api.snd('place');}
    api.score(score);
    moving={x:0,w:stack[stack.length-1].w,dir:1,sp:Math.min(360,170+score*7)};}
  api.loop(dt=>{if(!alive)return;
    moving.x+=moving.dir*moving.sp*dt;
    if(moving.x<0){moving.x=0;moving.dir=1;}
    if(moving.x+moving.w>W){moving.x=W-moving.w;moving.dir=-1;}
    flash=Math.max(0,flash-dt*3);
    const target=Math.max(0,stack.length*22-(H-170));
    camOff+=(target-camOff)*Math.min(1,dt*5);
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
    stack.forEach((b,i)=>{const y=H-40-(i+1)*22+camOff;
      if(y<-24||y>H)return;
      ctx.fillStyle=i%2?'#DDDDDD':'#AAAAAA';
      if(i===stack.length-1&&flash>0)ctx.fillStyle='#FFFFFF';
      ctx.fillRect(b.x,y,b.w,20);
      ctx.strokeStyle='rgba(0,0,0,.6)';ctx.strokeRect(b.x+.5,y+.5,b.w-1,19);});
    const my=H-40-(stack.length+1)*22+camOff;
    ctx.fillStyle='#FFFFFF';ctx.fillRect(moving.x,my,moving.w,20);
    ctx.strokeStyle='rgba(0,0,0,.6)';ctx.strokeRect(moving.x+.5,my+.5,moving.w-1,19);
    ctx.strokeStyle='rgba(255,255,255,.18)';ctx.setLineDash([4,5]);
    ctx.strokeRect(stack[stack.length-1].x+.5,my+.5,stack[stack.length-1].w-1,19);ctx.setLineDash([]);});
  api.on(cv,'pointerdown',drop);
  api.on(window,'keydown',e=>{if(e.key===' ')drop();});
  api.pad([{i:'⤓ DROP',big:true,d:drop}]);
  function reset(){stack=[{x:(W-180)/2,w:180}];
    moving={x:0,w:180,dir:1,sp:170};camOff=0;score=0;alive=true;perfect=0;flash=0;api.score(0);}
  reset();
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
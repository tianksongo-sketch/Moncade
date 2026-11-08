import {R} from './util.js';
export default {create(api){
  const W=300,H=420,{cv,ctx}=api.canvas(W,H);
  let px,blocks,t,alive,spawnT,targetX=null,lastScore=-1;
  const keys={l:false,r:false};
  api.loop(dt=>{if(!alive)return;
    t+=dt;
    const sc=Math.floor(t*10);
    if(sc!==lastScore){lastScore=sc;api.score(sc);}
    if(keys.l)px-=300*dt;if(keys.r)px+=300*dt;
    if(targetX!=null)px+=(targetX-px)*Math.min(1,dt*14);
    px=Math.max(10,Math.min(W-10,px));
    spawnT-=dt;
    if(spawnT<=0){spawnT=Math.max(.16,.55-t/45);
      blocks.push({x:R(14,W-14),y:-20,s:R(14,30),v:150+t*7});}
    blocks.forEach(b=>b.y+=b.v*dt);
    blocks=blocks.filter(b=>b.y<H+40);
    const py=H-40;
    for(const b of blocks){
      if(b.x+b.s/2>px-8&&b.x-b.s/2<px+8&&b.y+b.s/2>py-8&&b.y-b.s/2<py+8){
        alive=false;api.snd('die');
        api.over(Math.floor(t*10),'Survived '+t.toFixed(1)+'s.');break;}}
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
    blocks.forEach(b=>{ctx.fillStyle='#DDDDDD';
      ctx.fillRect(b.x-b.s/2,b.y-b.s/2,b.s,b.s);
      ctx.strokeStyle='rgba(0,0,0,.7)';ctx.strokeRect(b.x-b.s/2+.5,b.y-b.s/2+.5,b.s-1,b.s-1);});
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px,py,8,0,7);ctx.fill();
    ctx.fillStyle='#080808';ctx.beginPath();ctx.arc(px+2,py-2,2,0,7);ctx.fill();});
  const pX=e=>{const r=cv.getBoundingClientRect();targetX=(e.clientX-r.left)*W/r.width;};
  api.on(cv,'pointerdown',pX);api.on(cv,'pointermove',pX);
  api.on(window,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.l=true;
    if(e.key==='ArrowRight'||e.key==='d')keys.r=true;});
  api.on(window,'keyup',e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.l=false;
    if(e.key==='ArrowRight'||e.key==='d')keys.r=false;});
  api.pad([{i:'◀',d:()=>keys.l=true,u:()=>keys.l=false},{i:'▶',d:()=>keys.r=true,u:()=>keys.r=false}]);
  function reset(){px=W/2;blocks=[];t=0;alive=true;spawnT=.5;targetX=null;lastScore=-1;api.score(0);}
  reset();
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
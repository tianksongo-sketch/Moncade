import {R} from './util.js';
export default {create(api){
  const W=340,H=520,{cv,ctx}=api.canvas(W,H);
  const k={l:false,r:false};
  let sx,bullets,en,ox,oy,dir,spd,alive,score,wave,cool;
  const kd=e=>{if(e.key==='ArrowLeft'||e.key==='a')k.l=true;if(e.key==='ArrowRight'||e.key==='d')k.r=true;if(e.key===' ')fire();};
  const ku=e=>{if(e.key==='ArrowLeft'||e.key==='a')k.l=false;if(e.key==='ArrowRight'||e.key==='d')k.r=false;};
  api.on(window,'keydown',kd);api.on(window,'keyup',ku);
  api.on(cv,'pointerdown',()=>fire());
  api.pad([{i:'◀',d:()=>k.l=true,u:()=>k.l=false},{i:'▶',d:()=>k.r=true,u:()=>k.r=false},{i:'FIRE',big:true,d:()=>fire()}]);
  const ex=e=>ox+e.c*38, ey=e=>oy+e.r*32;
  function spawnWave(){en=[];for(let r=0;r<4;r++)for(let c=0;c<7;c++)en.push({c,r,a:true});ox=24;oy=60;dir=1;spd=26+wave*6;}
  function reset(){wave=0;score=0;alive=true;sx=W/2;bullets=[];cool=0;spawnWave();api.score(0);}
  function fire(){if(!alive||cool>0)return;bullets.push({x:sx,y:H-64});cool=.32;api.snd('flap');}
  function update(dt){
    cool=Math.max(0,cool-dt);
    sx=Math.max(18,Math.min(W-18,sx+((k.r?1:0)-(k.l?1:0))*260*dt));
    for(const b of bullets)b.y-=520*dt;
    bullets=bullets.filter(b=>b.y>-10);
    const live=en.filter(e=>e.a);
    ox+=dir*spd*dt;
    if(live.length){
      const minX=Math.min(...live.map(ex)),maxX=Math.max(...live.map(ex))+24;
      if(minX<8||maxX>W-8){dir=-dir;oy+=14;}
    }
    for(const b of bullets)for(const e of en){
      if(e.a&&b.x>ex(e)&&b.x<ex(e)+24&&b.y>ey(e)&&b.y<ey(e)+16){e.a=false;b.y=-99;score+=10;api.score(score);api.snd('hit');}
    }
    bullets=bullets.filter(b=>b.y>-10);
    if(en.some(e=>e.a&&ey(e)+16>H-80)){alive=false;api.snd('die');api.over(score,'They landed.');return;}
    if(!en.some(e=>e.a)){wave++;api.snd('win');spawnWave();}
  }
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';
    for(const e of en)if(e.a){ctx.fillRect(ex(e),ey(e),24,16);ctx.fillStyle='#080808';ctx.fillRect(ex(e)+5,ey(e)+4,4,4);ctx.fillRect(ex(e)+15,ey(e)+4,4,4);ctx.fillStyle='#fff';}
    ctx.beginPath();ctx.moveTo(sx,H-40);ctx.lineTo(sx-16,H-18);ctx.lineTo(sx+16,H-18);ctx.closePath();ctx.fill();
    for(const b of bullets)ctx.fillRect(b.x-1.5,b.y,3,10);
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

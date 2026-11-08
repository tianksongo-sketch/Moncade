import {R,el} from './util.js';
export default {create(api){
  const W=360,H=520,{cv,ctx}=api.canvas(W,H);
  let px,py,vx,vy,plats,score,alive,nextY;
  const keys={l:false,r:false};
  function addPlat(y){const mv=score>300&&Math.random()<.25;
    plats.push({x:R(10,W-70),y,w:60,mv:mv?(Math.random()<.5?60:-60):0});}
  function update(dt){
    if(keys.l)vx=-260;else if(keys.r)vx=260;else vx*=.8;
    px+=vx*dt;
    if(px<-14)px=W+12;if(px>W+14)px=-12;
    vy+=1400*dt;
    const prevY=py;py+=vy*dt;
    if(vy>0)for(const p of plats){
      if(px+11>p.x&&px-11<p.x+p.w&&prevY<=p.y&&py>=p.y-4){vy=-640;py=p.y;api.snd('jump');break;}}
    plats.forEach(p=>{if(p.mv){p.x+=p.mv*dt;if(p.x<0||p.x>W-p.w)p.mv*=-1;}});
    if(py<H*.42){const d=H*.42-py;py+=d;plats.forEach(p=>p.y+=d);nextY+=d;score+=d/10;api.score(score|0);}
    while(nextY>-30){addPlat();plats[plats.length-1].y=nextY;nextY-=R(46,Math.min(95,52+score/12));}
    plats=plats.filter(p=>p.y<H+30);
    if(py>H+40){alive=false;api.snd('die');api.over(score|0,'Gravity wins. Again.');}}
  function draw(){ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff';
    plats.forEach(p=>ctx.fillRect(p.x,p.y,p.w,9));
    ctx.fillRect(px-11,py-22,22,22);
    ctx.fillStyle='#080808';ctx.fillRect(px-6,py-16,4,4);ctx.fillRect(px+3,py-16,4,4);}
  api.loop(dt=>{if(alive)update(dt);draw();});
  api.on(window,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.l=true;
    if(e.key==='ArrowRight'||e.key==='d')keys.r=true;});
  api.on(window,'keyup',e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.l=false;
    if(e.key==='ArrowRight'||e.key==='d')keys.r=false;});
  api.on(cv,'touchstart',e=>{const rct=cv.getBoundingClientRect();
    keys[e.touches[0].clientX-rct.left<rct.width/2?'l':'r']=true;},{passive:true});
  api.on(cv,'touchend',()=>{keys.l=keys.r=false;},{passive:true});
  api.pad([{i:'◀',d:()=>keys.l=true,u:()=>keys.l=false},{i:'▶',d:()=>keys.r=true,u:()=>keys.r=false}]);
  function reset(){px=W/2;py=H-80;vx=0;vy=-640;score=0;alive=true;plats=[];
    plats.push({x:W/2-50,y:H-60,w:100,mv:0});nextY=H-110;
    while(nextY>-30){addPlat();plats[plats.length-1].y=nextY;nextY-=R(46,70);}
    api.score(0);}
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
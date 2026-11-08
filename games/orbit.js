import {R} from './util.js';
export default {create(api){
  const S=320,{cv,ctx}=api.canvas(S,S);
  const cx=S/2,cy=S/2,RING=112;
  let ang,score,alive,obs,pels,spd,spawnT;
  const mv={l:false,r:false};
  const dAng=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
  api.loop(dt=>{if(!alive)return;
    if(mv.l)ang-=2.7*dt;if(mv.r)ang+=2.7*dt;
    spd=Math.min(2.4,spd+dt*.022);
    obs.forEach(o=>o.a+=spd*dt*o.d);
    pels.forEach(p=>p.a+=spd*dt*p.d);
    spawnT-=dt;
    if(spawnT<=0){spawnT=Math.max(.65,1.5-score/30);
      const a=ang+Math.PI+R(-.7,.7);const d=Math.random()<.5?1:-1;
      if(Math.random()<.68)obs.push({a,d,s:R(.2,.34)});
      else pels.push({a,d});}
    for(const o of obs){if(dAng(o.a,ang)<o.s/2+.13){
      alive=false;api.snd('die');api.over(score,'The ring claims another.');break;}}
    pels=pels.filter(p=>{if(dAng(p.a,ang)<.17){
      score++;api.score(score);api.snd('pickup');return false;}return true;});
    ctx.fillStyle='#080808';ctx.fillRect(0,0,S,S);
    ctx.strokeStyle='#252525';ctx.lineWidth=14;
    ctx.beginPath();ctx.arc(cx,cy,RING,0,7);ctx.stroke();
    ctx.lineWidth=10;
    obs.forEach(o=>{ctx.strokeStyle='#FFFFFF';
      ctx.beginPath();ctx.arc(cx,cy,RING,o.a-o.s/2,o.a+o.s/2);ctx.stroke();});
    pels.forEach(p=>{ctx.fillStyle='#AAAAAA';
      ctx.beginPath();ctx.arc(cx+Math.cos(p.a)*RING,cy+Math.sin(p.a)*RING,6,0,7);ctx.fill();});
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(cx+Math.cos(ang)*RING,cy+Math.sin(ang)*RING,10,0,7);ctx.fill();
    ctx.fillStyle='#080808';
    ctx.beginPath();ctx.arc(cx+Math.cos(ang)*RING+2,cy+Math.sin(ang)*RING-2,2.5,0,7);ctx.fill();
    ctx.lineWidth=1;});
  const side=e=>{const r=cv.getBoundingClientRect();
    return(e.clientX-r.left)<r.width/2?'l':'r';};
  api.on(cv,'pointerdown',e=>{mv[side(e)]=true;});
  api.on(cv,'pointerup',()=>{mv.l=mv.r=false;});
  api.on(cv,'pointercancel',()=>{mv.l=mv.r=false;});
  api.on(window,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')mv.l=true;
    if(e.key==='ArrowRight'||e.key==='d')mv.r=true;});
  api.on(window,'keyup',e=>{if(e.key==='ArrowLeft'||e.key==='a')mv.l=false;
    if(e.key==='ArrowRight'||e.key==='d')mv.r=false;});
  api.pad([{i:'◀',d:()=>mv.l=true,u:()=>mv.l=false},{i:'▶',d:()=>mv.r=true,u:()=>mv.r=false}]);
  function reset(){ang=-Math.PI/2;score=0;alive=true;obs=[];pels=[];spd=.9;spawnT=1;api.score(0);}
  reset();
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
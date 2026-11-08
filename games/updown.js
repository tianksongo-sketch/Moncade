import {R} from './util.js';
export default {create(api){
  const W=360,H=520,{cv,ctx}=api.canvas(W,H);
  const PX=90,PR=9;
  let cols,py,vy,dist,alive,ct,cb,up;
  const on=()=>{up=true;},off=()=>{up=false;};
  api.on(cv,'pointerdown',on);api.on(window,'pointerup',off);api.on(cv,'pointerup',off);
  api.on(window,'keydown',e=>{if(e.key===' '||e.key==='ArrowUp'||e.key==='w')up=true;});
  api.on(window,'keyup',e=>{if(e.key===' '||e.key==='ArrowUp'||e.key==='w')up=false;});
  api.pad([{i:'▲',big:true,d:on,u:off}]);
  function nextCol(x){
    ct=Math.max(20,Math.min(200,ct+R(-16,16)));
    cb=Math.max(ct+150,Math.min(H-20,cb+R(-16,16)));
    if(cb-ct>260)cb=ct+260;
    return {x,t:ct,b:cb};
  }
  function reset(){
    ct=120;cb=340;cols=[];
    for(let x=0;x<=W+40;x+=8)cols.push(nextCol(x));
    py=H/2;vy=0;dist=0;alive=true;up=false;api.score(0);
  }
  function update(dt){
    const step=(180+dist*0.03)*dt;dist+=step;
    for(const c of cols)c.x-=step;
    while(cols.length&&cols[0].x<-10)cols.shift();
    while(cols[cols.length-1].x<W+40)cols.push(nextCol(cols[cols.length-1].x+8));
    vy=Math.max(-520,Math.min(520,vy+(up?-1500:1100)*dt));py+=vy*dt;
    const c=cols.find(q=>q.x<=PX&&q.x+8>PX)||cols[0];
    if(py-PR<c.t||py+PR>c.b){alive=false;api.snd('die');api.over(Math.floor(dist/30),'Wall.');return;}
    api.score(Math.floor(dist/30));
  }
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#262626';ctx.beginPath();ctx.moveTo(0,0);
    for(const c of cols)ctx.lineTo(c.x,c.t);ctx.lineTo(W+40,0);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(0,H);for(const c of cols)ctx.lineTo(c.x,c.b);ctx.lineTo(W+40,H);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=3;
    ctx.beginPath();cols.forEach((c,i)=>i?ctx.lineTo(c.x,c.t):ctx.moveTo(c.x,c.t));ctx.stroke();
    ctx.beginPath();cols.forEach((c,i)=>i?ctx.lineTo(c.x,c.b):ctx.moveTo(c.x,c.b));ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(PX,py,PR,0,7);ctx.fill();
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

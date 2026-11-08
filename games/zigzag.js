import {R} from './util.js';
export default {create(api){
  const W=340,H=520,{cv,ctx}=api.canvas(W,H);
  const BH=40,CORR=120,BX=W/2,BY=H*0.62,RB=9;
  let bands,dirx,dist,alive;
  const flip=()=>{if(!alive)return;dirx=-dirx;api.snd('click');};
  api.on(cv,'pointerdown',flip);
  api.on(window,'keydown',e=>{if(e.key===' ')flip();});
  api.pad([{i:'⟳',big:true,d:flip}]);
  let lastL;
  function nextBand(y){
    lastL=Math.max(10,Math.min(W-10-CORR,lastL+R(-46,46)));
    return {y,l:lastL,r:lastL+CORR};
  }
  function reset(){
    lastL=W/2-CORR/2;bands=[];let y=H;
    while(y>-BH*2){bands.push(nextBand(y));y-=BH;}
    bx=BX;dirx=1;dist=0;alive=true;api.score(0);
  }
  let bx;
  function update(dt){
    const sp=200+dist*0.02;const step=sp*dt;dist+=step;
    bx+=dirx*sp*0.9*dt;
    for(const b of bands)b.y+=step;
    bands=bands.filter(b=>b.y<H+BH*2);
    while(bands[bands.length-1]&&bands[bands.length-1].y>-BH*2){
      const top=bands[bands.length-1];bands.push(nextBand(top.y-BH));
    }
    const band=bands.find(b=>b.y<=BY&&b.y+BH>BY)||bands[0];
    if(bx-RB<band.l||bx+RB>band.r){alive=false;api.snd('die');api.over(Math.floor(dist/40),'Off the path.');return;}
    api.score(Math.floor(dist/40));
  }
  function draw(){
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';
    for(const b of bands){ctx.fillRect(0,b.y,b.l,BH-2);ctx.fillRect(b.r,b.y,W-b.r,BH-2);}
    ctx.beginPath();ctx.arc(bx,BY,RB,0,7);ctx.fill();
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

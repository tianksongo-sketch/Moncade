import {R} from './util.js';
export default {create(api){
  const W=340,H=520,{cv,ctx}=api.canvas(W,H);
  const ROUNDS=5;
  let st,timer,goAt,times,msg,alive;
  function wait(){st='wait';timer=R(1.2,3.8);msg='WAIT FOR IT…';}
  function reset(){times=[];alive=true;wait();api.score(0);}
  function tap(){
    if(!alive||!api.running||api.paused)return;
    if(st==='wait'){api.snd('error');msg='TOO EARLY';st='early';timer=1.0;return;}
    if(st==='go'){const ms=performance.now()-goAt;times.push(ms);api.snd('pickup');msg=Math.round(ms)+' MS';st='result';timer=1.1;}
  }
  function finish(){
    alive=false;const avg=Math.round(times.reduce((a,b)=>a+b,0)/times.length);
    api.snd('win');api.win(avg,'Average '+avg+' ms over '+ROUNDS+' rounds.');
  }
  function next(){if(times.length>=ROUNDS){finish();return;}wait();}
  api.on(cv,'pointerdown',tap);
  api.on(window,'keydown',e=>{if(e.key===' ')tap();});
  function update(dt){
    if(st==='wait'){timer-=dt;if(timer<=0){st='go';goAt=performance.now();msg='TAP!';}}
    else if(st==='early'){timer-=dt;if(timer<=0)wait();}
    else if(st==='result'){timer-=dt;if(timer<=0)next();}
  }
  function draw(){
    const go=st==='go';
    ctx.fillStyle=go?'#fff':'#080808';ctx.fillRect(0,0,W,H);
    ctx.fillStyle=go?'#080808':'#fff';ctx.font='900 30px system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillText(msg,W/2,H/2);
    ctx.font='700 14px system-ui,sans-serif';ctx.fillText('ROUND '+Math.min(ROUNDS,times.length+1)+' / '+ROUNDS,W/2,H/2+40);
  }
  reset();
  api.loop(dt=>{if(alive)update(dt);draw();});
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};

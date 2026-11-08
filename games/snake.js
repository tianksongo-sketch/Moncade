import {RI,swipe} from './util.js';
const N=21;
export default {create(api){
  const S=20,{cv,ctx}=api.canvas(N*S,N*S);
  let snake,dir,queue,food,score,speed,acc,alive;
  const DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  function place(){do{food={x:RI(0,N-1),y:RI(0,N-1)};}while(snake.some(s=>s.x===food.x&&s.y===food.y));}
  function step(){
    if(queue.length)dir=queue.shift();
    let h={x:snake[0].x+dir[0],y:snake[0].y+dir[1]};
    h.x=(h.x+N)%N; // wrap horizontally
    h.y=(h.y+N)%N; // wrap vertically
    if(snake.some(s=>s.x===h.x&&s.y===h.y)){
      alive=false;api.snd('die');api.over(score);return;}
    snake.unshift(h);
    if(h.x===food.x&&h.y===food.y){score+=10;api.score(score);api.snd('score');
      speed=Math.max(60,speed-3);place();}
    else snake.pop();}
  function draw(){ctx.fillStyle='#080808';ctx.fillRect(0,0,N*S,N*S);
    ctx.strokeStyle='#111';for(let i=1;i<N;i++){ctx.beginPath();ctx.moveTo(i*S,0);x_line(i);ctx.stroke();}
    function x_line(i){ctx.moveTo(i*S,0);ctx.lineTo(i*S,N*S);ctx.moveTo(0,i*S);ctx.lineTo(N*S,i*S);}
    for(let i=1;i<N;i++){ctx.beginPath();ctx.moveTo(i*S,0);ctx.lineTo(i*S,N*S);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,i*S);ctx.lineTo(N*S,i*S);ctx.stroke();}
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(food.x*S+S/2,food.y*S+S/2,4,0,7);ctx.fill();
    snake.forEach((s,i)=>{ctx.fillStyle=i===0?'#FFFFFF':'#DDDDDD';
      ctx.globalAlpha=Math.max(.35,1-i/snake.length*.7);
      ctx.fillRect(s.x*S+2,s.y*S+2,S-4,S-4);});
    ctx.globalAlpha=1;}
  api.loop(dt=>{if(!alive)return;acc+=dt*1000;while(acc>speed){acc-=speed;step();if(!alive)break;}draw();});
  const setDir=d=>{const v=DIRS[d];if(!v)return;
    const last=queue.length?queue[queue.length-1]:dir;
    if(v[0]===-last[0]&&v[1]===-last[1])return;
    if(queue.length<3)queue.push(v);};
  api.on(window,'keydown',e=>{if(!api.running||api.paused)return;const k=e.key.toLowerCase();
    if(k==='arrowup'||k==='w')setDir('up');else if(k==='arrowdown'||k==='s')setDir('down');
    else if(k==='arrowleft'||k==='a')setDir('left');else if(k==='arrowright'||k==='d')setDir('right');});
  api.tc(swipe(cv,d=>{if(d!=='tap')setDir(d);}));
  api.pad([{i:'◀',d:()=>setDir('left')},{i:'▲',d:()=>setDir('up')},{i:'▼',d:()=>setDir('down')},{i:'▶',d:()=>setDir('right')}]);
  function reset(){snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];dir=[1,0];queue=[];
    score=0;speed=140;acc=0;alive=true;place();api.score(0);draw();}
  return {start:reset,restart:reset,pause(){},resume(){},destroy(){}};
}};
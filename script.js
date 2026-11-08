/* MONCADE — core shell */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
try{['scores','plays','favs','recent','settings'].forEach(k=>{
const o='ma_'+k,n='mc_'+k;
if(localStorage.getItem(n)==null&&localStorage.getItem(o)!=null)
localStorage.setItem(n,localStorage.getItem(o));});}catch(e){}
const LS={get(k,d){try{const v=localStorage.getItem('mc_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
set(k,v){try{localStorage.setItem('mc_'+k,JSON.stringify(v))}catch(e){}}};
let settings=LS.get('settings',{sound:true,rm:matchMedia('(prefers-reduced-motion: reduce)').matches});
if(settings.vol==null)settings.vol=85;
if(settings.music==null)settings.music=true;
if(settings.theme==null)settings.theme='auto';
if(settings.lebay==null)settings.lebay=true;
let scores=LS.get('scores',{}), plays=LS.get('plays',{}), favs=LS.get('favs',[]), recent=LS.get('recent',[]);
const rm=()=>settings.rm;
const darkMQ=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(anim){
const t=settings.theme||'auto',mode=t==='auto'?(darkMQ.matches?'dark':'light'):t;
const go=()=>{document.documentElement.dataset.mode=mode;
document.querySelector('meta[name=theme-color]').content=mode==='dark'?'#05060a':'#e9edf5';};
if(anim&&document.startViewTransition&&!rm())document.startViewTransition(go);else go();}
darkMQ.addEventListener?.('change',()=>applyTheme(true));

/* ---------- HAPTICS: vibrate on taps, toggles and game events (Android; iOS ignores vibrate) ---------- */
const Haptic={last:0,
ok(){return settings.haptic!==false&&typeof navigator!=='undefined'&&typeof navigator.vibrate==='function';},
buzz(p){if(!this.ok())return;const n=performance.now();if(n-this.last<35)return;this.last=n;try{navigator.vibrate(p);}catch(e){}},
strong(p){if(settings.haptic===false||typeof navigator==='undefined'||typeof navigator.vibrate!=='function')return;try{navigator.vibrate(p);}catch(e){}},
sfx(n){const m={click:6,move:3,flip:4,pop:8,place:10,hit:18,score:8,clear:[20,30,20],pickup:6,error:[30,40,30],
  tick:2,flap:6,jump:10,die:[60,40,60,40,100],win:[20,40,20,40,80],land:12,pad0:4,pad1:4,pad2:4,pad3:4};
  if(m[n]!=null)this.buzz(m[n]);}};
const buzz=p=>Haptic.buzz(p);

/* ---------- SOUND ENGINE v6 (GAMEBOY STYLE: pulse + triangle + noise) ---------- */
const Snd={ctx:null,master:null,comp:null,waves:{},nz:null,nzc:null,held:false,
ensure(){try{
if(document.hidden||this.held)return null;               /* never wake audio while page is in background */
this.ctx=this.ctx||new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
if(this.ctx.state!=='running')this.ctx.resume();
if(!this.master){this.master=this.ctx.createGain();
this.comp=this.ctx.createDynamicsCompressor();
this.comp.threshold.value=-20;this.comp.knee.value=10;
this.comp.ratio.value=10;this.comp.attack.value=.002;this.comp.release.value=.12;
this.master.connect(this.comp);this.comp.connect(this.ctx.destination);
this.master.gain.value=settings.vol/100*1.8;
this.buildWaves();}
return this.ctx;}catch(e){return null;}},
setVol(v){settings.vol=v;LS.set('settings',settings);
if(this.master)this.master.gain.value=v/100*1.8;},
/* silence everything the moment the page loses focus / goes to background */
hush(){this.held=true;try{Bgm.stop();}catch(e){}
try{if(this.ctx&&this.ctx.state==='running')this.ctx.suspend();}catch(e){}},
wake(){this.held=false;},
buildWaves(){const c=this.ctx;
[.125,.25,.5].forEach(d=>{const N=32,re=new Float32Array(N),im=new Float32Array(N);
for(let n=1;n<N;n++)re[n]=2/(n*Math.PI)*Math.sin(n*Math.PI*d);
this.waves[d]=c.createPeriodicWave(re,im);});
const mk=hold=>{const n=c.sampleRate|0,b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);let v=0;
for(let i=0;i<n;i++){if(i%hold===0)v=Math.random()<.5?-1:1;a[i]=v;}return b;};
this.nz=mk(1);this.nzc=mk(5);},
/* pulse channel: stepped sweep like the real hardware */
pulse({f=440,f2=null,d=.08,duty=.5,v=.07,at=0,dest=null,steps=6}){
const c=this.ctx,t=c.currentTime+at,o=c.createOscillator(),g=c.createGain();
o.setPeriodicWave(this.waves[duty]||this.waves[.5]);
if(f2){for(let i=0;i<steps;i++)o.frequency.setValueAtTime(f+(f2-f)*(i/(steps-1)),t+d*i/steps);}
else o.frequency.setValueAtTime(f,t);
g.gain.setValueAtTime(v,t);g.gain.setValueAtTime(v,t+d*.55);g.gain.exponentialRampToValueAtTime(.0008,t+d);
o.connect(g);g.connect(dest||this.master);o.start(t);o.stop(t+d+.02);},
tri({f=110,f2=null,d=.1,v=.12,at=0,dest=null}){
const c=this.ctx,t=c.currentTime+at,o=c.createOscillator(),g=c.createGain();
o.type='triangle';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+d);
g.gain.setValueAtTime(v,t);g.gain.setValueAtTime(v,t+d*.7);g.gain.linearRampToValueAtTime(.0001,t+d);
o.connect(g);g.connect(dest||this.master);o.start(t);o.stop(t+d+.02);},
noise({d=.1,v=.05,at=0,rate=1,crunch=false,hp=0,lp=0,dest=null}){
const c=this.ctx,t=c.currentTime+at,s=c.createBufferSource(),g=c.createGain();
s.buffer=crunch?this.nzc:this.nz;s.playbackRate.value=rate;
g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0008,t+d);
let last=s;
if(hp){const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=hp;last.connect(f);last=f;}
if(lp){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;last.connect(f);last=f;}
last.connect(g);g.connect(dest||this.master);s.start(t,Math.random()*.5);s.stop(t+d+.02);},
perc(k,at,v,dest){const t=at-this.ctx.currentTime;
if(k==='k'){this.tri({f:170,f2:42,d:.09,v:v*3.2,at:t,dest});}
else if(k==='s'){this.noise({d:.09,v:v*2.2,at:t,crunch:true,hp:1400,dest});}
else if(k==='h'){this.noise({d:.025,v:v*1.6,at:t,hp:7000,dest});}},
play(n){Haptic.sfx(n);if(!settings.sound||document.hidden)return;const c=this.ensure();if(!c)return;
const P=o=>this.pulse(o);
switch(n){
case 'click':P({f:1568,d:.035,duty:.5,v:.06});break;
case 'move':P({f:392,d:.028,duty:.125,v:.05});break;
case 'flip':P({f:880,d:.04,duty:.25,v:.06});P({f:1319,d:.05,at:.045,duty:.25,v:.06});break;
case 'pop':P({f:600,f2:1250,d:.07,duty:.5,v:.07});break;
case 'place':this.tri({f:190,f2:80,d:.09,v:.16});this.noise({d:.04,v:.04,lp:1800,crunch:true});break;
case 'hit':P({f:330,f2:110,d:.09,duty:.25,v:.08});this.noise({d:.06,v:.05,crunch:true,at:.01});break;
case 'score':P({f:988,d:.06,duty:.5,v:.07});P({f:1319,d:.22,at:.06,duty:.5,v:.07});break;
case 'clear':[523,659,784,1047,1319,1568].forEach((f,i)=>P({f,d:.07,at:i*.05,duty:.25,v:.06}));break;
case 'pickup':P({f:1047,f2:1568,d:.1,duty:.5,v:.065,steps:4});break;
case 'error':P({f:156,f2:98,d:.2,duty:.125,v:.08,steps:4});this.noise({d:.1,v:.03,crunch:true,lp:1500});break;
case 'tick':P({f:1976,d:.02,duty:.125,v:.045});break;
case 'flap':P({f:330,f2:700,d:.08,duty:.5,v:.06,steps:4});break;
case 'jump':P({f:220,f2:880,d:.15,duty:.5,v:.065,steps:8});break;
case 'die':[392,330,262,208,165,123,82].forEach((f,i)=>P({f,d:.1,at:i*.085,duty:.25,v:.07}));this.noise({d:.3,v:.045,at:.45,crunch:true,lp:2200});break;
case 'win':[523,659,784,1047].forEach((f,i)=>P({f,d:.1,at:i*.09,duty:.5,v:.06}));
[784,1047].forEach((f,i)=>P({f,d:.34,at:.4+i*.01,duty:.25,v:.055}));break;
case 'land':[392,523,659].forEach((f,i)=>P({f,d:.08,at:i*.06,duty:.25,v:.065}));break;
case 'pad0':P({f:330,d:.28,duty:.5,v:.07});break;
case 'pad1':P({f:392,d:.28,duty:.5,v:.07});break;
case 'pad2':P({f:440,d:.28,duty:.5,v:.07});break;
case 'pad3':P({f:494,d:.28,duty:.5,v:.07});break;
default:P({f:500,d:.04,duty:.5,v:.05});}this.sleepSoon();},
sleepSoon(){clearTimeout(this._st);this._st=setTimeout(()=>{try{if(!Bgm.timer&&this.ctx&&this.ctx.state==='running')this.ctx.suspend();}catch(e){}},3500);}};

/* ---------- BGM: tiny chiptune tracker ---------- */
const SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const midi=s=>{const m=/^([A-G])([#b]?)(-?\d)$/.exec(s);if(!m)return 0;
return 12*(+m[3]+1)+SEMI[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);};
/* "E5:4 B4:2 -:2" => parallel arrays: start note per step + length in steps */
const seq=(str,len)=>{const n=[],l=[];
(str||'').trim().split(/\s+/).filter(Boolean).forEach(t=>{const[a,b='1']=t.split(':'),d=Math.max(1,+b|0);
n.push(a==='-'?0:midi(a));l.push(d);for(let i=1;i<d;i++){n.push(0);l.push(0);}});
while(n.length<len){n.push(0);l.push(0);}return{n:n.slice(0,len),l:l.slice(0,len)};};
const CH=name=>{const m=/^([A-G][#b]?)(m?)/.exec(name),r=12*3+SEMI[m[1][0]]+(m[1][1]==='#'?1:m[1][1]==='b'?-1:0);
return[r,r+(m[2]?3:4),r+7];};          /* root @ octave 2, third, fifth */
const nm=x=>{const N=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];return N[x%12]+(Math.floor(x/12)-1);};
const bassStr=(p,style)=>p.map(c=>{const[r]=CH(c),a=nm(r),b=nm(r+12),f=nm(r+7);
switch(style){
case 'oom':return `${a}:2 ${b}:2 ${a}:2 ${b}:2 ${a}:2 ${b}:2 ${a}:2 ${b}:2`;
case 'pump':return `${a}:2 ${a}:2 ${a}:2 ${a}:2 ${a}:2 ${a}:2 ${a}:2 ${a}:2`;
case 'walk':return `${a}:4 ${f}:4 ${b}:4 ${f}:4`;
case 'sub':return `${a}:8 ${a}:8`;
case 'off':return `${a}:3 -:1 ${a}:2 ${b}:2 ${a}:3 -:1 ${f}:2 ${b}:2`;
default:return `${a}:16`;}}).join(' ');
const arpStr=(p,style)=>p.map(c=>{const[r,t,f]=CH(c).map(x=>x+24),A=nm(r),T=nm(t),F=nm(f),O=nm(r+12);
switch(style){
case 'up':return `${A} ${T} ${F} ${O} ${A} ${T} ${F} ${O} ${A} ${T} ${F} ${O} ${A} ${T} ${F} ${O}`;
case 'bounce':return `${A} ${F} ${T} ${F} ${A} ${F} ${T} ${F} ${A} ${F} ${T} ${F} ${A} ${F} ${T} ${F}`;
case 'stab':return `-:2 ${T}:2 -:2 ${T}:2 -:2 ${T}:2 -:2 ${T}:2`;
case 'slow':return `${A}:4 ${T}:4 ${F}:4 ${T}:4`;
default:return '-:16';}}).join(' ');
const percStr=(pat,bars)=>{let o='';for(let i=0;i<bars;i++)o+=pat;return o;};
const buildTrack=d=>{const bars=d.prog.length,L=bars*16,ch=[];
const prog=d.prog;
ch.push({w:'p',duty:d.duty||.25,v:d.lv||.05,...seq(d.lead,L)});
if(d.arp&&d.arp!=='off')ch.push({w:'p',duty:.125,v:.024,...seq(arpStr(prog,d.arp),L)});
if(d.bass!=='none')ch.push({w:'t',v:.1,...seq(bassStr(prog,d.bass||'oom'),L)});
if(d.perc){const s=percStr(d.perc,bars).slice(0,L).padEnd(L,'.'),n=[];
for(const k of s)n.push(k==='.'||k==='-'?0:k);ch.push({w:'n',v:.03,n,l:n.map(()=>1)});}
return{step:60/d.bpm/4,len:L,ch};};

/* data: lead melody = notes, 16 steps per bar */
const TD={
/* Tetris = Korobeiniki (Type A), traditional folk tune, plain GameBoy-style */
tetris:{bpm:150,duty:.5,lv:.05,bass:'oom',arp:'stab',
prog:['Am','Am','E','Am','Dm','C','E','Am'],
lead:'E5:4 B4:2 C5:2 D5:4 C5:2 B4:2  A4:4 A4:2 C5:2 E5:4 D5:2 C5:2  B4:6 C5:2 D5:4 E5:4  C5:4 A4:4 A4:8  '+
'D5:6 F5:2 A5:4 G5:2 F5:2  E5:6 C5:2 E5:4 D5:2 C5:2  B4:4 B4:2 C5:2 D5:4 E5:4  C5:4 A4:4 A4:8'},
/* PONG: bleepy minimal */
pong:{bpm:132,duty:.5,lv:.045,bass:'pump',arp:'off',perc:'k.h.s.h.k.h.s.hh',
prog:['Am','Am','F','G'],
lead:'A4:2 -:2 E5:2 -:2 A4:2 -:2 C5:2 -:2  A4:2 -:2 E5:2 -:2 G5:2 -:2 E5:2 -:2  F5:2 -:2 C5:2 -:2 A4:2 -:2 C5:2 -:2  G4:2 B4:2 D5:2 B4:2 G5:4 D5:4'},
/* SNAKE: slithery minor */
snake:{bpm:116,duty:.25,lv:.05,bass:'walk',arp:'off',perc:'k...h...k...h.h.',
prog:['Dm','Dm','Bb','A'],
lead:'D5:2 F5:2 A5:2 F5:2 D5:2 E5:2 F5:2 G5:2  F5:2 A5:2 C6:2 A5:2 F5:2 G5:2 A5:2 Bb5:2  D5:2 F5:2 Bb5:2 F5:2 D5:2 F5:2 Bb5:4  C#5:2 E5:2 A5:2 E5:2 C#5:2 E5:2 A4:4'},
/* BREAKOUT: punchy arcade */
breakout:{bpm:152,duty:.25,lv:.05,bass:'pump',arp:'stab',perc:'k.h.s.h.k.hks.h.',
prog:['C','G','Am','F'],
lead:'C5:2 E5:2 G5:2 E5:2 C6:4 G5:4  B4:2 D5:2 G5:2 D5:2 B5:4 G5:4  A4:2 C5:2 E5:2 C5:2 A5:4 E5:4  F5:2 A5:2 C6:2 A5:2 F5:4 C5:4'},
/* MINESWEEPER: tense, sparse */
minesweeper:{bpm:84,duty:.125,lv:.045,bass:'sub',arp:'off',perc:'k.......h.......',
prog:['Dm','Bb','Gm','A'],
lead:'D5:4 -:4 F5:4 -:4  Bb4:4 -:4 D5:4 -:4  G4:4 -:4 Bb4:4 D5:4  C#5:4 -:4 E5:8'},
/* 2048: calm ambient arps */
'2048':{bpm:92,duty:.5,lv:.04,bass:'sub',arp:'up',
prog:['C','Am','F','G'],
lead:'E5:8 G5:8  C5:8 E5:8  A4:8 C5:8  B4:8 D5:8'},
/* BLOCK BLAST: bright & poppy */
blockblast:{bpm:128,duty:.25,lv:.05,bass:'oom',arp:'bounce',perc:'k...s...k.k.s...',
prog:['C','G','Am','F'],
lead:'G5:2 E5:2 C5:2 E5:2 G5:4 -:4  D5:2 G5:2 B5:2 G5:2 D6:4 -:4  E5:2 A5:2 C6:2 A5:2 E6:4 -:4  F5:2 A5:2 C6:2 A5:2 F5:8'},
/* CHESS: baroque harpsichord in D minor */
chess:{bpm:104,duty:.125,lv:.055,bass:'walk',arp:'off',
prog:['Dm','Gm','A','Dm'],
lead:'D5:2 E5:2 F5:2 G5:2 A5:4 F5:4  G5:2 F5:2 E5:2 D5:2 Bb4:4 D5:4  E5:2 G5:2 A5:2 G5:2 E5:4 C#5:4  D5:2 F5:2 A5:2 F5:2 D5:8'},
/* SUDOKU: thinking, tidy */
sudoku:{bpm:90,duty:.5,lv:.04,bass:'sub',arp:'slow',
prog:['C','Am','Dm','G'],
lead:'E5:4 -:4 G5:4 E5:4  C5:4 -:4 E5:4 C5:4  D5:4 F5:4 A5:4 F5:4  B4:4 D5:4 G5:8'},
/* MEMORY: music box */
memory:{bpm:104,duty:.5,lv:.045,bass:'sub',arp:'bounce',
prog:['C','F','C','G'],
lead:'G5:2 -:2 E5:2 -:2 C6:4 -:4  A5:2 -:2 F5:2 -:2 C6:4 -:4  G5:2 -:2 E5:2 -:2 C6:4 E6:4  D6:2 -:2 B5:2 -:2 G5:8'},
/* LIGHTS OUT: eerie */
lightsout:{bpm:96,duty:.125,lv:.045,bass:'sub',arp:'slow',perc:'k.......k...h...',
prog:['Am','F','Dm','E'],
lead:'A4:6 C5:2 E5:8  F4:6 A4:2 C5:8  D5:6 F5:2 A5:8  G#4:4 B4:4 E5:8'},
/* TIC TAC TOE: bouncy */
tictactoe:{bpm:120,duty:.5,lv:.05,bass:'oom',arp:'off',perc:'k...h...k...h...',
prog:['C','F','G','C'],
lead:'C5:2 E5:2 G5:2 E5:2 C5:2 E5:2 G5:4  A5:2 F5:2 C5:2 F5:2 A4:2 C5:2 F5:4  B5:2 G5:2 D5:2 G5:2 B4:2 D5:2 G5:4  C6:2 G5:2 E5:2 G5:2 C5:8'},
/* REACTION: tight pulse */
reaction:{bpm:140,duty:.125,lv:.045,bass:'pump',arp:'off',perc:'k.k.k.k.k.k.kkhh',
prog:['Am','Am','Am','E'],
lead:'A4:2 -:6 A4:2 -:2 C5:2 -:2  A4:2 -:6 E5:2 -:2 D5:2 -:2  A4:2 -:6 A4:2 -:2 C5:2 -:2  G#4:2 -:2 B4:2 -:2 E5:4 -:4'},
/* FLAPPY DOT: cheerful hop */
flappydot:{bpm:138,duty:.5,lv:.05,bass:'off',arp:'off',perc:'k...h...k...h...',
prog:['C','Am','F','G'],
lead:'E5:2 G5:2 E5:2 C5:2 E5:2 G5:2 C6:4  C5:2 E5:2 A5:2 E5:2 C5:2 E5:2 A5:4  A5:2 C6:2 A5:2 F5:2 A5:2 C6:2 F6:4  G5:2 B5:2 D6:2 B5:2 G5:8'},
/* DOODLE JUMP: bouncy up-and-down */
doodlejump:{bpm:144,duty:.25,lv:.05,bass:'off',arp:'off',perc:'k.h.k.h.k.h.k.hh',
prog:['G','Em','C','D'],
lead:'G4:2 B4:2 D5:2 G5:2 D5:2 B4:2 G4:4  E5:2 G5:2 B5:2 G5:2 E5:2 B4:2 E5:4  C5:2 E5:2 G5:2 C6:2 G5:2 E5:2 C5:4  D5:2 F#5:2 A5:2 F#5:2 D5:2 A4:2 D5:4'},
/* AIM TRAINER: fast techno */
aimtrainer:{bpm:162,duty:.125,lv:.045,bass:'pump',arp:'bounce',perc:'k.hhk.hhk.hhk.sh',
prog:['Am','Am','F','G'],
lead:'A5:2 -:2 E5:2 -:2 A5:2 -:2 C6:2 -:2  A5:2 -:2 E5:2 -:2 G5:2 -:2 E5:2 -:2  F5:2 -:2 C5:2 -:2 F5:2 -:2 A5:2 -:2  G5:2 -:2 D5:2 -:2 B4:2 D5:2 G5:2 -:2'},
/* 15 PUZZLE: quiet shuffle */
puzzle15:{bpm:88,duty:.5,lv:.04,bass:'sub',arp:'slow',
prog:['F','C','Dm','Bb'],
lead:'A4:6 C5:2 F5:8  G4:6 C5:2 E5:8  F4:6 A4:2 D5:8  D4:6 F4:2 Bb4:8'},
/* extras for the unregistered games */
egg:{bpm:120,duty:.5,lv:.05,bass:'oom',arp:'bounce',perc:'k...h...k...h...',prog:['C','Am','F','G'],lead:'E5:2 G5:2 C6:2 G5:2 E5:4 -:4  A4:2 C5:2 E5:2 C5:2 A5:4 -:4  F5:2 A5:2 C6:2 A5:2 F5:4 -:4  G5:2 B5:2 D6:2 B5:2 G5:4 -:4'},
gravity:{bpm:150,duty:.125,lv:.05,bass:'pump',arp:'stab',perc:'k.h.k.h.k.hkh.',prog:['Em','C','G','D'],lead:'E5:2 G5:2 B5:4 -:8  C5:2 E5:2 G5:4 -:8  D5:2 G5:2 B5:4 -:8  F#5:2 A5:2 D6:4 -:8'},
invaders:{bpm:140,duty:.25,lv:.05,bass:'oom',arp:'off',perc:'k.h.s.h.k.h.s.h.',prog:['Dm','Bb','F','C'],lead:'D5:2 F5:2 A5:2 F5:2 D6:4 -:4  Bb4:2 D5:2 F5:2 D5:2 Bb5:4 -:4  F5:2 A5:2 C6:2 A5:2 F5:4 -:4  C5:2 E5:2 G5:2 E5:2 C6:4 -:4'},
juggle:{bpm:132,duty:.5,lv:.05,bass:'walk',arp:'off',perc:'k.h.s.h.',prog:['C','G','Am','F'],lead:'C5:2 E5:2 G5:2 C6:2 G5:4 E5:2 -:2  G4:2 B4:2 D5:2 G5:2 D5:4 B4:2 -:2  A4:2 C5:2 E5:2 A5:2 E5:4 C5:2 -:2  F4:2 A4:2 C5:2 F5:2 C5:4 A4:2 -:2'},
keeper:{bpm:110,duty:.125,lv:.05,bass:'sub',arp:'slow',prog:['Am','F','C','G'],lead:'A4:4 C5:4 E5:8  F4:4 A4:4 C5:8  C5:4 E5:4 G5:8  G4:4 B4:4 D5:8'},
quickdraw:{bpm:160,duty:.25,lv:.05,bass:'pump',arp:'off',perc:'k.k.s.k.',prog:['G','G','C','D'],lead:'G5:1 D6:1 G5:1 B5:1 D6:2 G5:2 B5:2 D6:2 G6:4  C5:1 G5:1 C6:1 E6:1 G6:2 E6:2 C6:2 G5:2 C5:4  C5:4 E5:4 G5:8  D5:4 F#5:4 A5:8'},
updown:{bpm:138,duty:.25,lv:.05,bass:'oom',arp:'bounce',perc:'k.hh.k.hh',prog:['Dm','Gm','A','Dm'],lead:'D5:2 F5:2 A5:2 D6:2 C6:4 A5:2 F5:2  Bb4:2 D5:2 G5:4 Bb5:2 A5:2 G5:2 F5:2  A4:2 C#5:2 E5:2 A5:4 E5:2 C#5:2 A4:2  D5:2 F5:2 A5:2 D6:2 A5:4 F5:2 D5:2'},
vortex:{bpm:144,duty:.5,lv:.05,bass:'sub',arp:'up',perc:'k...s...',prog:['Em','C','D','Bm'],lead:'E5:2 G5:2 B5:2 E6:2 B5:4 G5:2 -:2  C5:2 E5:2 G5:2 C6:2 G5:4 E5:2 -:2  D5:2 F#5:2 A5:2 D6:2 A5:4 F#5:2 -:2  B4:2 D5:2 F#5:2 B5:2 F#5:4 D5:2 -:2'},
xshoot:{bpm:156,duty:.125,lv:.05,bass:'pump',arp:'stab',perc:'k.s.k.s.k.hs.',prog:['Am','Am','F','E'],lead:'A5:2 -:2 E5:2 -:2 A5:2 -:2 C6:2 -:2  A5:2 -:2 E5:2 -:2 G5:2 -:2 E5:2 -:2  F5:2 -:2 C5:2 -:2 F5:2 -:2 A5:2 -:2  G#5:2 -:2 B5:2 -:2 E6:4 -:4'},
yoga:{bpm:84,duty:.5,lv:.04,bass:'sub',arp:'slow',prog:['C','Am','F','G'],lead:'C5:4 E5:4 G5:8  A4:4 C5:4 E5:8  F4:4 A4:4 C5:8  G4:4 B4:4 D5:8'},
zigzag:{bpm:124,duty:.25,lv:.05,bass:'walk',arp:'off',perc:'k.hk.h.',prog:['F','Dm','Bb','C'],lead:'F5:2 A5:2 C6:2 A5:2 F5:4 C5:4  D5:2 F5:2 A5:2 F5:2 D6:4 A5:4  Bb4:2 D5:2 F5:2 Bb5:2 F5:4 D5:4  C5:2 E5:2 G5:2 C6:2 G5:4 E5:4'},
pacman:{bpm:156,duty:.25,lv:.05,bass:'oom',arp:'off',perc:'k.h.s.h.k.h.s.hh',
prog:['Am','Am','F','E'],
lead:'A4:1 A5:1 E5:1 C5:1 A5:1 E5:1 C5:1 A4:1 B4:1 B5:1 F#5:1 D#5:1 B5:1 F#5:1 D#5:1 B4:1  A4:2 C5:2 E5:2 C5:2 A5:4 E5:4  F5:2 A5:2 C6:2 A5:2 E5:4 G#5:4  E5:2 G#5:2 B5:2 G#5:2 A5:8'}
};
const TRACK={tetris:'tetris',pong:'pong',snake:'snake',breakout:'breakout',minesweeper:'minesweeper','2048':'2048',
blockblast:'blockblast',chess:'chess',sudoku:'sudoku',memory:'memory',lightsout:'lightsout',tictactoe:'tictactoe',
reaction:'reaction',flappydot:'flappydot',doodlejump:'doodlejump',aimtrainer:'aimtrainer',puzzle15:'puzzle15',
pacman:'pacman',dodge:'aimtrainer',stack:'blockblast',orbit:'2048',lander:'minesweeper',whack:'tictactoe',
rubik:'sudoku',egg:'egg',gravity:'gravity',invaders:'invaders',juggle:'juggle',keeper:'keeper',quickdraw:'quickdraw',updown:'updown',vortex:'vortex',xshoot:'xshoot',yoga:'yoga',zigzag:'zigzag',mathblitz:'reaction',hilo:'memory',nonogram:'puzzle15',scramble:'memory',simon:null};

const Bgm={name:null,timer:null,step:0,next:0,ducked:false,mgain:null,cache:{},
track(n){return this.cache[n]||(TD[n]?(this.cache[n]=buildTrack(TD[n])):null);},
ensureGain(){if(!this.mgain||this.mgain.context!==Snd.ctx){this.mgain=Snd.ctx.createGain();this.mgain.connect(Snd.master);}
this.mgain.gain.value=this.ducked?.0001:.6;},
start(name){this.stop();if(!settings.music||!settings.sound||!name||document.hidden)return;
if(!this.track(name))return;
const c=Snd.ensure();if(!c)return;this.ensureGain();
this.name=name;this.step=0;this.next=c.currentTime+.08;
this.timer=setInterval(()=>this.tick(),40);},
stop(){if(this.timer)clearInterval(this.timer);this.timer=null;this.name=null;Snd.sleepSoon();},
duck(on){this.ducked=on;if(this.mgain)this.mgain.gain.value=on?.0001:.6;},
tick(){const c=Snd.ctx,tr=this.track(this.name);
if(!tr||!c||document.hidden||Snd.held){this.stop();return;}
if(this.next<c.currentTime-.25)this.next=c.currentTime+.05;      /* don't burst-play after a stall */
while(this.next<c.currentTime+.18){const st=this.step;
for(const ch of tr.ch){const i=st%ch.n.length,m=ch.n[i];if(!m)continue;
if(ch.w==='n')Snd.perc(m,this.next,ch.v,this.mgain);
else this.note(m,ch.l[i]*tr.step,ch.w,ch.duty,ch.v,this.next);}
this.next+=tr.step;this.step++;}},
note(m,len,w,duty,v,at){const c=Snd.ctx,o=c.createOscillator(),g=c.createGain(),f=440*Math.pow(2,(m-69)/12);
const d=Math.max(.04,len*.94);
if(w==='t')o.type='triangle';else o.setPeriodicWave(Snd.waves[duty]||Snd.waves[.5]);
o.frequency.setValueAtTime(f,at);
g.gain.setValueAtTime(v,at);
if(w==='p'){g.gain.setValueAtTime(v,at+Math.min(.05,d*.3));g.gain.exponentialRampToValueAtTime(v*.55,at+d*.7);}
g.gain.linearRampToValueAtTime(.0001,at+d);
o.connect(g);g.connect(this.mgain);o.start(at);o.stop(at+d+.02);}};

/* ---------- GAME REGISTRY ---------- */
const GAMES=[
{id:'tetris',     f:'tetris.js',     name:'TETRIS',       cat:'Classic', lb:false,unit:'pts', tag:'Falling blocks. Timeless pain.',
help:'Move ← → · Rotate ↑ / X (Z counter) · Soft drop ↓ · Hard drop SPACE · P pause.',
ctl:'Touch: buttons below board. Hold ◀ ▶ ▼ for auto-repeat.'},
{id:'pong',       f:'pong.js',       name:'PONG',         cat:'Classic', lb:false,unit:'pts', tag:'The grandfather. Still hits.',
help:'Mouse / touch drag, or W/S · ↑/↓. Every AI miss scores +1 and speeds the ball up. You miss — game over.',
ctl:'Touch: drag finger on the field.'},
{id:'snake',      f:'snake.js',      name:'SNAKE',        cat:'Classic', lb:false,unit:'pts', tag:'Eat. Grow. Loop through walls.',
help:'Arrows / WASD to steer. Walls loop — slide through an edge, appear on the other side. Only YOU are lethal. Speed rises.',
ctl:'Touch: swipe anywhere on the board.'},
{id:'breakout',   f:'breakout.js',   name:'BREAKOUT',     cat:'Classic', lb:false,unit:'pts', tag:'Bricks fear you.',
help:'Mouse / touch / ← → to move. SPACE or tap to launch. 3 lives. Catch power-ups: W=wide, S=slow, L=life.',
ctl:'Touch: drag to move, tap to launch.'},
{id:'minesweeper',f:'minesweeper.js',name:'MINESWEEPER',  cat:'Classic', lb:true, unit:'time',tag:'Numbers are your friends. Mines are not.',
help:'Click to reveal · right-click (or FLAG mode) to flag · click a revealed number to chord. Clear every safe cell.',
ctl:'Touch: FLAG toggle then tap cells.'},
{id:'2048',       f:'2048.js',       name:'2048',         cat:'Puzzle',  lb:false,unit:'pts', tag:'Slide. Merge. Ascend.',
help:'Arrows / WASD / swipe to slide tiles. Equal tiles merge. Reach 2048. Undo available.',
ctl:'Touch: swipe on the board.'},
{id:'blockblast', f:'blockblast.js', name:'BLOCK BLAST',  cat:'Puzzle',  lb:false,unit:'pts', tag:'Drop. Fill. Blast lines.',
help:'Drag pieces from the tray onto the 8×8 board. Full rows AND columns blast away. Consecutive blasts build combo multipliers. No rotation — pure planning.',
ctl:'Touch or mouse: drag pieces from the bottom tray onto the board.'},
{id:'chess',      f:'chess.js',      name:'CHESS',        cat:'Puzzle',  lb:false,unit:'pts', tag:'Checkmate in black & white.',
help:'Modes: PVP (one screen, white moves first) or bot EASY / MEDIUM / HARD — vs bots you play WHITE. Tap a piece, then a highlighted square. Pawns promote to queens. Score = material you captured.',
ctl:'Touch: tap piece, then tap destination.'},
{id:'sudoku',     f:'sudoku.js',     name:'SUDOKU',       cat:'Puzzle',  lb:true, unit:'time',tag:'9×9 of pure logic.',
help:'Select a cell, type 1–9 (or tap the pad). N = notes mode. ERRORS toggle highlights mistakes against the solution.',
ctl:'Touch: tap cell, tap number pad.'},
{id:'memory',     f:'memory.js',     name:'MEMORY MATCH', cat:'Puzzle',  lb:true, unit:'moves',tag:'Flip. Remember. Win.',
help:'Flip two cards per move. Match all 8 pairs in as few moves as possible.',
ctl:'Touch: tap cards.'},
{id:'lightsout',  f:'lightsout.js',  name:'LIGHTS OUT',   cat:'Puzzle',  lb:true, unit:'moves',tag:'Turn everything off. Simple, right?',
help:'Tapping a cell toggles it and its orthogonal neighbors. Switch every light off. Always solvable.',
ctl:'Touch: tap cells.'},
{id:'tictactoe',  f:'tictactoe.js',  name:'TIC-TAC-TOE',  cat:'Puzzle',  lb:false,unit:'streak',tag:'X marks the win.',
help:'Pick a mode: PvP, EASY, MEDIUM or IMPOSSIBLE (minimax). You are X. Best = longest win streak.',
ctl:'Touch: tap cells.'},
{id:'reaction',   f:'reaction.js',   name:'REACTION TIME',cat:'Reaction',lb:true, unit:'ms',  tag:'How fast are you, really?',
help:'Wait for the panel to turn WHITE, then tap. 5 rounds — average time is your score. Tapping early is a false start.',
ctl:'Touch: tap the panel.'},
{id:'flappydot',  f:'flappydot.js',  name:'FLAPPY DOT',   cat:'Reaction',lb:false,unit:'pts', tag:'One dot. Zero mercy.',
help:'SPACE / click / tap to flap. Pass the pillars. The gap shrinks and speed rises.',
ctl:'Touch: tap anywhere on the field.'},
{id:'doodlejump', f:'doodlejump.js',  name:'DOODLE JUMP',  cat:'Reaction',lb:false,unit:'m',   tag:'Up is the only way.',
help:'← → to move (screen wraps). Land on platforms to bounce. Height is score. Moving platforms appear higher up.',
ctl:'Touch: hold left/right half, or use buttons.'},
{id:'aimtrainer', f:'aimtrainer.js', name:'AIM TRAINER',  cat:'Reaction',lb:false,unit:'hits',tag:'30 seconds. Pure precision.',
help:'Hit as many targets as possible in 30 seconds. Tracks accuracy and average reaction.',
ctl:'Touch: tap targets.'},
{id:'puzzle15',   f:'puzzle15.js',   name:'15 PUZZLE',    cat:'Puzzle',  lb:true, unit:'moves',tag:'Slide into perfection.',
help:'Click a tile next to the gap (or use arrows) to slide it. Restore 1–15 in order. Always solvable.',
ctl:'Touch: tap tiles / swipe.'},
{id:'dodge',f:'dodge.js',name:'DODGE',cat:'Reaction',lb:false,unit:'pts',tag:'Blocks fall. You do not.',
help:'← → or drag to move. Survive as long as you can; the blocks get faster and denser.',ctl:'Touch: drag your finger left and right.'},
{id:'stack',f:'stack.js',name:'STACK',cat:'Reaction',lb:false,unit:'pts',tag:'Drop on time. Keep it level.',
help:'Tap or SPACE to drop the moving block onto the tower. Miss the overlap and the tower falls. Perfect drops score bonus.',ctl:'Touch: tap anywhere on the field.'},
{id:'orbit',f:'orbit.js',name:'ORBIT',cat:'Reaction',lb:false,unit:'pts',tag:'Circle, dodge, repeat.',
help:'← → rotate your ship around the ring. Dodge incoming objects. Speed rises over time.',ctl:'Touch: hold left or right half of the screen.'},
{id:'lander',f:'lander.js',name:'LANDER',cat:'Classic',lb:false,unit:'pts',tag:'Gentle now. Gravity is watching.',
help:'Thrust with SPACE / ↑, steer with ← →. Land softly on the pad. Fuel is limited.',ctl:'Touch: hold the buttons to thrust and steer.'},
{id:'whack',f:'whack.js',name:'WHACK-A-MOLE',cat:'Reaction',lb:false,unit:'pts',tag:'Pop up. Smack down.',
help:'Tap the moles as they pop up in the 9 holes. You have 30 seconds.',ctl:'Touch: tap the holes.'},
{id:'mathblitz',f:'mathblitz.js',name:'MATH BLITZ',cat:'Puzzle',lb:false,unit:'pts',tag:'Quick sums. Quicker answers.',
help:'Pick the correct answer among 3 options before the 45 seconds run out. Streaks add bonus points. Keys 1–3 also work.',ctl:'Touch: tap an answer.'},
{id:'hilo',f:'hilo.js',name:'HI-LO',cat:'Puzzle',lb:false,unit:'streak',tag:'Higher or lower? Guess.',
help:'Guess whether the next card is HIGHER or LOWER than the one shown. Keep your streak alive.',ctl:'Touch: tap HIGHER or LOWER.'},
{id:'nonogram',f:'nonogram.js',name:'NONOGRAM',cat:'Puzzle',lb:true,unit:'time',tag:'Pixels from numbers.',
help:'Numbers show the runs of filled cells in each row and column. Fill the grid to match them.',ctl:'Touch: tap a cell to fill it.'},
{id:'scramble',f:'scramble.js',name:'SCRAMBLE',cat:'Puzzle',lb:false,unit:'pts',tag:'Unscramble the letters. Fast.',
help:'Type the word from the scrambled letters before the 60 seconds run out. Each word you finish adds to your count.',ctl:'Touch: tap the letters to build the word.'},
{id:'simon',f:'simon.js',name:'SIMON',cat:'Puzzle',lb:false,unit:'pts',tag:'Repeat the pattern. Keep going.',
help:'Watch the sequence of pads light up, then repeat it. Each round adds one more step.',ctl:'Touch: tap the pads.'}
,
{id:'egg',f:'egg.js',name:'EGG CATCH',cat:'Classic',lb:false,unit:'pts',tag:'Catch the eggs. Miss three, lose.',
help:'← → move the basket. Catch the falling eggs; miss three and the run is over.',ctl:'Touch: ◀ ▶ on the pad.'},
{id:'gravity',f:'gravity.js',name:'GRAVITY FLIP',cat:'Reaction',lb:false,unit:'pts',tag:'Tap to flip. Spikes everywhere.',
help:'Tap or SPACE flips gravity. Avoid the spikes on the floor and ceiling.',ctl:'Touch: tap anywhere or ROT.'},
{id:'invaders',f:'invaders.js',name:'INVADERS',cat:'Reaction',lb:false,unit:'pts',tag:'Hold the line. Clear the wave.',
help:'← → move, SPACE fires. Clear the wave before they land.',ctl:'Touch: ◀ ▶ and FIRE.'},
{id:'juggle',f:'juggle.js',name:'JUGGLE',cat:'Classic',lb:false,unit:'pts',tag:'Keep it up. Do not drop it.',
help:'← → move the paddle. Every bounce scores; miss the ball and it is over.',ctl:'Touch: ◀ ▶.'},
{id:'keeper',f:'keeper.js',name:'KEEPER',cat:'Reaction',lb:false,unit:'pts',tag:'Penalty shootout. Dive!',
help:'← → position the keeper. Three goals and the shootout is over.',ctl:'Touch: ◀ ▶.'},
{id:'quickdraw',f:'quickdraw.js',name:'QUICK DRAW',cat:'Reaction',lb:true,unit:'ms',tag:'Wait for it. Then tap.',
help:'Five rounds. Tap the moment the screen turns white. Tapping early just restarts that round.',ctl:'Touch: tap anywhere.'},
{id:'updown',f:'updown.js',name:'UP DOWN',cat:'Reaction',lb:false,unit:'pts',tag:'Hold to rise. Let go to sink.',
help:'Hold SPACE or the pad to rise. Stay inside the tunnel as it scrolls.',ctl:'Touch: hold ▲.'},
{id:'vortex',f:'vortex.js',name:'VORTEX',cat:'Reaction',lb:false,unit:'pts',tag:'Spin the ring. Dodge the dots.',
help:'Tap, SPACE or ROT reverses the spin. Dots fall inward; one hit and it is over.',ctl:'Touch: tap ROT.'},
{id:'xshoot',f:'xshoot.js',name:'X-SHOOT',cat:'Reaction',lb:false,unit:'pts',tag:'Shoot them down before they land.',
help:'↑ ↓ move, SPACE fires. Three hits and you are finished.',ctl:'Touch: ▲ ▼ and FIRE.'},
{id:'yoga',f:'yoga.js',name:'YOGA BALANCE',cat:'Classic',lb:false,unit:'time',tag:'Keep your balance. Breathe.',
help:'Hold ← → (or tap the left or right half) to tilt the plank. Stay on it as long as you can.',ctl:'Touch: tap left or right half.'},
{id:'zigzag',f:'zigzag.js',name:'ZIGZAG',cat:'Classic',lb:false,unit:'pts',tag:'Zig. Zag. Repeat.',
help:'Tap, SPACE or ROT switches direction. Stay on the path.',ctl:'Touch: tap anywhere.'}
];
const byId=id=>GAMES.find(g=>g.id===id);
const fmt=(meta,v)=>{if(v==null)return '—';
if(meta.unit==='time'){const s=Math.floor(v);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
if(meta.unit==='ms')return v+'ms'; return String(v);};

/* ---------- DOM refs ---------- */
const home=$('#home'),favView=$('#favView'),statView=$('#statView'),gameview=$('#gameview'),
stage=$('#stage'),tpad=$('#tpad'),grid=$('#grid'),toastEl=$('#toast');
const ov={start:$('#ovStart'),pause:$('#ovPause'),over:$('#ovOver'),help:$('#ovHelp')};
const ovShow=o=>o.classList.add('on'), ovHide=o=>o.classList.remove('on'), ovHideAll=()=>Object.values(ov).forEach(ovHide);
const isTouch=matchMedia('(pointer: coarse)').matches||'ontouchstart' in window;
let toastT;
function toast(t){toastEl.textContent=t;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove('on'),1800);}
function getBest(id){return scores[id]?.best??null;}
function saveBest(id,v,lower){if(v==null)return false;const b=scores[id]?.best;
const better=b==null||(lower?v<b:v>b);
if(better){scores[id]={best:v};LS.set('scores',scores);}return better;}
function addPlay(id){plays[id]={p:(plays[id]?.p||0)+1,t:Date.now()};LS.set('plays',plays);}
function addRecent(id){recent=[id,...recent.filter(x=>x!==id)].slice(0,6);LS.set('recent',recent);}
function isFav(id){return favs.includes(id);}
function toggleFav(id){favs=isFav(id)?favs.filter(x=>x!==id):[...favs,id];LS.set('favs',favs);renderHome();if(cur&&cur.meta.id===id)$('#gvFav').classList.toggle('on',isFav(id));}

/* ---------- thumbnails ---------- */
function drawThumb(id,cv){const w=cv.width=300,h=cv.height=180,x=cv.getContext('2d');
x.fillStyle='#080808';x.fillRect(0,0,w,h);x.strokeStyle='#1A1A1A';
for(let i=0;i<w;i+=20){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();}
x.fillStyle='#fff';x.strokeStyle='#fff';const cx=w/2,cy=h/2;
const rect=(a,b,c,d,f=true)=>{f?x.fillRect(a,b,c,d):x.strokeRect(a,b,c,d);};
switch(id){
case 'tetris':rect(cx-60,cy,20,20);rect(cx-40,cy,20,20);rect(cx-40,cy-20,20,20);rect(cx-20,cy,20,20,0);rect(cx+10,cy-20,20,20);rect(cx+10,cy,20,20);x.fillStyle='#666';rect(cx-60,cy+22,140,4);break;
case 'pong':rect(40,cy-30,8,60);rect(w-48,cy-30,8,60);x.beginPath();x.arc(cx,cy-10,7,0,7);x.fill();x.setLineDash([6,8]);x.beginPath();x.moveTo(cx,10);x.lineTo(cx,h-10);x.stroke();x.setLineDash([]);break;
case 'snake':for(let i=0;i<7;i++)rect(60+i*16,cy+Math.sin(i*1.2)*22-7,13,13);x.beginPath();x.arc(w-66,cy-34,5,0,7);x.fill();break;
case 'breakout':for(let r=0;r<3;r++)for(let c=0;c<6;c++){x.fillStyle=['#fff','#AAA','#666'][r];rect(46+c*36,26+r*16,30,11);}x.fillStyle='#fff';rect(cx-30,h-34,60,7);x.beginPath();x.arc(cx+40,h-70,6,0,7);x.fill();break;
case 'minesweeper':for(let r=0;r<3;r++)for(let c=0;c<5;c++)rect(72+c*34,cy-44+r*32,28,28,!(r===1&&c===2));x.fillStyle='#000';x.beginPath();x.arc(72+2*34+14,cy-44+32+14,8,0,7);x.fill();x.fillStyle='#fff';break;
case '2048':['2','4','8','16'].forEach((n,i)=>{x.fillStyle=['#1A1A1A','#252525','#666','#fff'][i];const a=cx-52+(i%2)*56,b=cy-52+((i/2)|0)*56;x.fillRect(a,b,48,48);x.fillStyle=i===3?'#000':'#fff';x.font='bold 18px monospace';x.textAlign='center';x.fillText(n,a+24,b+31);});break;
case 'blockblast':{const s=22,ox=cx-2*(s+3)-8,oy=cy-2*(s+3);
for(let r=0;r<4;r++)for(let c=0;c<4;c++){x.fillStyle=(r===3||c===0)?'#fff':'#252525';
x.fillRect(ox+c*(s+3),oy+r*(s+3),s,s);}
x.strokeStyle='#fff';x.lineWidth=2;
for(let i=0;i<3;i++){x.beginPath();x.moveTo(cx+52,cy-26+i*24);x.lineTo(cx+72,cy-32+i*24);x.stroke();}
x.lineWidth=1;break;}
case 'chess':{for(let r=0;r<4;r++)for(let c2=0;c2<4;c2++){x.fillStyle=(r+c2)%2?'#666':'#DDD';
x.fillRect(cx-78+c2*24,cy-46+r*24,24,24);}
x.font='70px serif';x.textAlign='center';x.fillText('♞',cx+38,cy+26);break;}
case 'sudoku':x.lineWidth=2;x.strokeRect(cx-54,cy-54,108,108);x.lineWidth=1;for(let i=1;i<3;i++){x.beginPath();x.moveTo(cx-54+i*36,cy-54);x.lineTo(cx-54+i*36,cy+54);x.moveTo(cx-54,cy-54+i*36);x.lineTo(cx+54,cy-54+i*36);x.stroke();}x.font='bold 22px serif';x.textAlign='center';x.fillText('5',cx-36,cy-28);x.fillText('9',cx+36,cy+44);break;
case 'memory':for(let i=0;i<4;i++){const a=cx-76+i*40;x.fillStyle=i===1?'#fff':'#252525';x.fillRect(a,cy-30,32,58);if(i===1){x.fillStyle='#000';x.font='20px serif';x.textAlign='center';x.fillText('★',a+16,cy+8);}}break;
case 'lightsout':for(let r=0;r<3;r++)for(let c=0;c<3;c++){x.fillStyle=(r===1&&c===1)||((r+c)%2===0)?'#fff':'#252525';x.beginPath();x.arc(cx-48+c*48,cy-48+r*48,15,0,7);x.fill();}break;
case 'tictactoe':x.lineWidth=3;for(let i=1;i<3;i++){x.beginPath();x.moveTo(cx-54+i*36,cy-54);x.lineTo(cx-54+i*36,cy+54);x.moveTo(cx-54,cy-54+i*36);x.lineTo(cx+54,cy-54+i*36);x.stroke();}x.font='bold 26px sans-serif';x.textAlign='center';x.fillText('X',cx-36,cy-24);x.fillText('O',cx+38,cy+48);x.lineWidth=1;break;
case 'reaction':x.font='bold 40px monospace';x.textAlign='center';x.fillText('⚡',cx,cy+2);x.strokeRect(cx-70,cy-40,140,80);break;
case 'flappydot':x.beginPath();x.arc(cx-40,cy,12,0,7);x.fill();x.fillRect(cx+20,0,26,cy-34);x.fillRect(cx+20,cy+26,26,h);break;
case 'doodlejump':for(let i=0;i<4;i++)rect(50+i*52+(i%2)*20,cy+40-i*26,44,8);rect(cx-10,cy-30,22,22);break;
case 'aimtrainer':[[cx-50,cy-20,26],[cx+44,cy+26,20],[cx+10,cy-44,14]].forEach(([a,b,r])=>{x.beginPath();x.arc(a,b,r,0,7);x.stroke();x.beginPath();x.arc(a,b,r*.45,0,7);x.fill();});break;
case 'pacman':for(let r=0;r<2;r++)for(let c=0;c<6;c++)rect(40+c*40,cy-22+r*44,8,8);x.beginPath();x.arc(cx-30,cy,20,.5,5.8);x.lineTo(cx-30,cy);x.fill();break;
case 'dodge':[[60,40,18],[150,80,26],[220,30,14],[110,130,22]].forEach(([a,b,r])=>rect(a,b,r*2,r*2));x.fillRect(cx-16,h-50,32,10);break;
case 'stack':for(let i=0;i<4;i++)rect(cx-70+(i%2?8:0),h-30-i*20,140-(i===3?40:0),16);x.fillStyle='#666';rect(cx+20,h-70,60,16);break;
case 'orbit':x.lineWidth=2;x.beginPath();x.arc(cx,cy,52,0,7);x.stroke();x.beginPath();x.arc(cx+52,cy,7,0,7);x.fill();x.lineWidth=1;break;
case 'lander':x.beginPath();x.moveTo(20,h-30);x.lineTo(80,h-50);x.lineTo(120,h-30);x.lineTo(170,h-60);x.lineTo(230,h-30);x.lineTo(w-20,h-30);x.stroke();x.beginPath();x.arc(cx,cy-30,8,0,7);x.fill();break;
case 'whack':for(let r=0;r<3;r++)for(let c=0;c<3;c++){x.beginPath();x.ellipse(cx-60+c*60,cy-40+r*40,14,8,0,0,7);x.fill();}break;
case 'rubik':x.lineWidth=2;for(let r=0;r<3;r++)for(let c=0;c<3;c++){x.fillStyle=['#fff','#FFD500','#D32F2F','#0051BA'][(r+c)%4];x.fillRect(cx-42+c*28,cy-42+r*28,24,24);}x.lineWidth=1;break;
case 'mathblitz':x.font='bold 24px monospace';x.textAlign='center';x.fillText('7 × 8 = ?',cx,cy+8);rect(cx-70,cy+28,44,22,false);rect(cx-22,cy+28,44,22,false);rect(cx+26,cy+28,44,22,false);break;
case 'hilo':x.fillRect(cx-40,cy-50,80,100);x.fillStyle='#000';x.font='bold 40px serif';x.textAlign='center';x.fillText('K',cx,cy+14);break;
case 'nonogram':for(let r=0;r<4;r++)for(let c=0;c<4;c++){if((r+c)%2===0||r===c)x.fillRect(cx-60+c*30,cy-60+r*30,26,26);else rect(cx-60+c*30,cy-60+r*30,26,26,false);}break;
case 'scramble':['S','C','R','A'].forEach((ch,i)=>{x.fillRect(cx-72+i*38,cy-18,30,36);x.fillStyle='#000';x.font='bold 20px monospace';x.textAlign='center';x.fillText(ch,cx-57+i*38,cy+6);x.fillStyle='#fff';});break;
case 'simon':x.beginPath();x.arc(cx-30,cy-30,36,0,7);x.fill();x.fillStyle='#666';x.beginPath();x.arc(cx+30,cy-30,36,0,7);x.fill();x.fillStyle='#AAA';x.beginPath();x.arc(cx-30,cy+30,36,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(cx+30,cy+30,36,0,7);x.fill();break;
case 'egg':x.fillRect(cx-60,cy+46,120,8);x.fillRect(cx-60,cy+34,6,12);x.fillRect(cx+54,cy+34,6,12);
  [[cx-40,cy-30],[cx+10,cy-6],[cx-16,cy+14]].forEach(([a,b])=>{x.beginPath();x.ellipse(a,b,8,10,0,0,7);x.fill();});break;
case 'gravity':x.beginPath();x.arc(cx-50,cy,12,0,7);x.fill();for(let i=0;i<5;i++){x.beginPath();x.moveTo(cx-10+i*30,0);x.lineTo(cx+4+i*30,38);x.lineTo(cx+18+i*30,0);x.fill();x.beginPath();x.moveTo(cx-10+i*30,h);x.lineTo(cx+4+i*30,h-38);x.lineTo(cx+18+i*30,h);x.fill();}break;
case 'invaders':for(let r=0;r<2;r++)for(let c=0;c<5;c++)rect(cx-80+c*34,cy-40+r*26,24,16);
  x.beginPath();x.moveTo(cx,h-40);x.lineTo(cx-14,h-22);x.lineTo(cx+14,h-22);x.fill();break;
case 'juggle':x.fillRect(cx-40,h-36,80,10);x.beginPath();x.arc(cx+10,cy-20,9,0,7);x.fill();x.lineWidth=2;x.beginPath();x.moveTo(cx-60,cy+30);x.quadraticCurveTo(cx,cy-40,cx+60,cy+30);x.stroke();break;
case 'keeper':x.lineWidth=3;x.strokeRect(cx-70,cy-50,140,90);x.fillRect(cx-12,cy+20,24,40);x.beginPath();x.arc(cx+30,cy+60,12,0,7);x.fill();break;
case 'quickdraw':x.fillRect(0,0,w,h);x.fillStyle='#080808';x.font='900 36px system-ui,sans-serif';x.textAlign='center';x.fillText('TAP!',cx,cy+12);x.fillStyle='#fff';break;
case 'updown':x.beginPath();x.moveTo(0,cy-50);for(let i=0;i<=10;i++)x.lineTo(i*30,cy-50+(i%2?20:0));x.lineTo(w,cy-50);x.lineTo(w,h);x.lineTo(0,h);x.closePath();x.fill();x.beginPath();x.arc(cx-30,cy,8,0,7);x.fill();break;
case 'vortex':x.lineWidth=3;x.beginPath();x.arc(cx,cy,50,0,7);x.stroke();x.beginPath();x.arc(cx+50,cy,9,0,7);x.fill();x.beginPath();x.arc(cx-70,cy-40,6,0,7);x.fill();break;
case 'xshoot':x.beginPath();x.moveTo(40,cy);x.lineTo(20,cy-14);x.lineTo(20,cy+14);x.fill();x.fillRect(cx+20,cy-2,40,4);for(let i=0;i<3;i++){x.fillRect(cx+30+i*40,cy-40+i*30,22,14);}break;
case 'yoga':x.save();x.translate(cx,cy);x.rotate(-0.25);x.fillRect(-120,-4,240,8);x.restore();x.beginPath();x.arc(cx+30,cy-22,9,0,7);x.fill();break;
case 'zigzag':for(let i=0;i<7;i++){const l=i%2?cx-50:cx-20;x.fillRect(0,i*26,l,20);x.fillRect(l+70,i*26,w-(l+70),20);}x.beginPath();x.arc(cx,cy,8,0,7);x.fill();break;
default:x.font='bold 28px monospace';x.textAlign='center';rect(cx-60,cy-40,120,80,false);x.fillText('?',cx,cy+10);break;
case 'puzzle15':for(let r=0;r<2;r++)for(let c=0;c<3;c++){if(r===1&&c===2)continue;rect(cx-66+c*46,cy-44+r*46,40,40,(r+c)%2===0);x.fillStyle='#000';x.font='bold 15px monospace';x.textAlign='center';x.fillText(String(r*3+c+1),cx-66+c*46+20,cy-44+r*46+26);x.fillStyle='#fff';}break;
}}

/* ---------- home rendering ---------- */
function cardHTML(g,i){const best=getBest(g.id);
return `<article class="card" style="--i:${i}" data-id="${g.id}">
<button class="fav-b ${isFav(g.id)?'on':''}" data-fav="${g.id}" title="Favorite">♥</button>
<canvas data-thumb="${g.id}"></canvas>
<span class="play-b">▶</span>
<div class="cb"><h3>${g.name}</h3><p>${g.tag}</p>
<div class="meta"><span class="cat">${g.cat.toUpperCase()}</span>
<span class="best">BEST ${fmt(g,best)}</span></div></div></article>`;}
function paintThumbs(root){root.querySelectorAll('canvas[data-thumb]').forEach(cv=>drawThumb(cv.dataset.thumb,cv));}
function renderGrid(){
const q=($('#search').value||'').toLowerCase().trim();
const cat=$('#chips .chip.active').dataset.cat;
const list=GAMES.filter(g=>(cat==='all'||g.cat===cat)&&(!q||g.name.toLowerCase().includes(q)||g.tag.toLowerCase().includes(q)));
grid.innerHTML=list.map((g,i)=>cardHTML(g,i)).join('');
$('#nores').classList.toggle('hidden',list.length>0);
paintThumbs(grid);
}
function renderRecent(){
const sec=$('#recentSec'),row=$('#recentRow');
const ids=recent.filter(id=>byId(id));
sec.classList.toggle('hidden',!ids.length);
row.innerHTML=ids.map(id=>{const g=byId(id);return `<button class="rchip" data-id="${id}"><i></i>${g.name}</button>`;}).join('');
}
function renderPopular(){
const list=[...GAMES].map(g=>({g,p:plays[g.id]?.p||0})).filter(x=>x.p>0).sort((a,b)=>b.p-a.p).slice(0,4);
$('#popSec').classList.toggle('hidden',!list.length);
$('#popRow').innerHTML=list.map((x,i)=>`<div class="pop-item" style="--i:${i}" data-id="${x.g.id}">
<span class="rank">${String(i+1).padStart(2,'0')}</span><div><b>${x.g.name}</b><span>${x.p} plays</span></div></div>`).join('');
}
function renderGlobalStats(){
const totalPlays=Object.values(plays).reduce((s,x)=>s+x.p,0);
const bests=Object.keys(scores).length;
const html=`<div class="stat-pill"><b>${GAMES.length}</b><span>GAMES</span></div>
<div class="stat-pill"><b>${totalPlays}</b><span>TOTAL PLAYS</span></div>
<div class="stat-pill"><b>${bests}</b><span>HIGH SCORES SET</span></div>
<div class="stat-pill"><b>${favs.length}</b><span>FAVORITES</span></div>`;
$('#gstats').innerHTML=html;$('#globalStats').innerHTML=html;
}
function renderFavs(){
const list=GAMES.filter(g=>isFav(g.id));
$('#favEmpty').classList.toggle('hidden',list.length>0);
$('#favGrid').innerHTML=list.map((g,i)=>cardHTML(g,i)).join('');
paintThumbs($('#favGrid'));
}
function renderStats(){
renderGlobalStats();
$('#statTable').innerHTML=`<div class="st-row head"><span>GAME</span><span class="num">PLAYS</span><span class="num">BEST</span><span class="hf">♥</span></div>`+
GAMES.map((g,i)=>`<div class="st-row" style="--i:${i}"><b>${g.name}</b>
<span class="num">${plays[g.id]?.p||0}</span>
<span class="num">${fmt(g,getBest(g.id))}</span>
<span class="hf ${isFav(g.id)?'on':''}">${isFav(g.id)?'♥':'·'}</span></div>`).join('');
}
function renderHome(){renderGrid();renderRecent();renderPopular();renderGlobalStats();}

/* ---------- view switching ---------- */
const VIEW_ORDER=['home','games','favs','stats'];let curView='home';
function slideIn(els,dir){
  if(rm()||document.documentElement.classList.contains('calm')||!document.body.animate)return;
  els.forEach((el,i)=>el.animate(
    [{transform:`translate3d(${dir*46}px,0,0)`,opacity:0},{transform:'translate3d(0,0,0)',opacity:1}],
    {duration:380,delay:i*30,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));
}
function setView(v){
  if(cur)closeGame(false);
  const dir=Math.sign(VIEW_ORDER.indexOf(v)-VIEW_ORDER.indexOf(curView))||1;curView=v;
  [home,allView,favView,statView].forEach(e=>e.classList.add('hidden'));
  let els=[];
  if(v==='home'){home.classList.remove('hidden');els=[...home.children].filter(c=>c.id!=='hero');}
  if(v==='games'){allView.classList.remove('hidden');renderAll();els=[allView];}
  if(v==='favs'){renderFavs();favView.classList.remove('hidden');els=[favView];}
  if(v==='stats'){renderStats();statView.classList.remove('hidden');els=[statView];}
  $$('#navlinks a').forEach(a=>a.classList.toggle('active',a.dataset.nav===v));
  azIndex.classList.toggle('hidden',v!=='games');
  window.scrollTo({top:0,behavior:'auto'});
  moveInd();
  slideIn(els,dir);
}

/* sliding nav pill */
function moveInd(){const a=$('#navlinks a.active'),i=$('#navInd');if(!a||!i)return;
i.style.setProperty('--ix',a.offsetLeft+'px');i.style.setProperty('--iw',a.offsetWidth+'px');}
addEventListener('resize',moveInd);document.fonts?.ready.then(moveInd);

/* glass sheen + 3D tilt on cards (mouse / pen only) */
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||rm())return;
const c=e.target.closest?.('.card');if(!c)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
c.style.setProperty('--mx',x*100+'%');c.style.setProperty('--my',y*100+'%');
c.style.setProperty('--ry',((x-.5)*14).toFixed(1)+'deg');c.style.setProperty('--rx',((.5-y)*14).toFixed(1)+'deg');});
document.addEventListener('pointerout',e=>{const c=e.target.closest?.('.card');
if(c&&!c.contains(e.relatedTarget)){c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg');}});

/* ---------- history / back button ---------- */
let histDepth=0, suppressPop=false;
window.addEventListener('popstate',()=>{
if(suppressPop){suppressPop=false;return;}
histDepth=Math.max(0,histDepth-1);
if($('#settings').classList.contains('on')){ovHide($('#settings'));return;}
if(cur)closeGame(true);
});

/* ---------- game shell ---------- */
let cur=null, teardowns=[];
const hudScore=$('#gvScore'), hudBest=$('#gvBest');
function tweenNum(el,to,dur=280){
const from=+(el.dataset.v||0);el.dataset.v=to;
if(from!==to&&!rm()){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
if(rm()||from===to){el.textContent=to;return;}
const t0=performance.now();
(function f(t){const k=Math.min(1,(t-t0)/dur);
el.textContent=Math.round(from+(to-from)*(1-Math.pow(1-k,3)));
if(k<1)requestAnimationFrame(f);})(t0);
}
function makeApi(meta){
const api={stage,tpad,touch:isTouch,best:getBest(meta.id),paused:false,running:false,alive:true};
api.on=(t,e,f,o)=>{t.addEventListener(e,f,o);teardowns.push(()=>t.removeEventListener(e,f,o));};
api.tc=f=>teardowns.push(f);
api.canvas=(w,h)=>{const cv=document.createElement('canvas');
const d=Math.min(2,window.devicePixelRatio||1);
cv.width=w*d;cv.height=h*d;const ctx=cv.getContext('2d');ctx.scale(d,d);
if(ctx.roundRect){const fr=ctx.fillRect.bind(ctx);
ctx.fillRect=(x,y,a,b)=>{const m=Math.min(Math.abs(a),Math.abs(b));
if(m>=8&&Math.max(Math.abs(a),Math.abs(b))<w*.9){ctx.beginPath();ctx.roundRect(x,y,a,b,Math.min(7,m*.26));ctx.fill();}
else fr(x,y,a,b);};}
stage.appendChild(cv);return{cv,ctx,W:w,H:h};};
api.loop=cb=>{let id,last=performance.now();
const step=t=>{id=requestAnimationFrame(step);const dt=Math.min(50,t-last);last=t;
if(api.running&&!api.paused&&api.alive)cb(dt/1000,t);};
id=requestAnimationFrame(step);teardowns.push(()=>cancelAnimationFrame(id));};
api.score=v=>tweenNum(hudScore,v);
api.scoreText=s=>{hudScore.dataset.v=0;hudScore.textContent=s;};
api.saveBest=v=>saveBest(meta.id,v,meta.lb);
api.msg=t=>{const d=document.createElement('div');
d.style.cssText='position:absolute;top:18%;left:50%;transform:translateX(-50%);font-weight:900;font-size:22px;letter-spacing:.3em;color:var(--w);text-shadow:0 4px 24px var(--sh);pointer-events:none;z-index:4;transition:all .9s';
d.textContent=t;gameview.appendChild(d);
requestAnimationFrame(()=>{d.style.opacity='0';d.style.transform='translateX(-50%) translateY(-26px)';});
setTimeout(()=>d.remove(),950);};
api.pad=defs=>{if(!isTouch)return;
const DIR={'◀':'l','◄':'l','←':'l','<':'l','▶':'r','►':'r','→':'r','>':'r','▲':'u','▴':'u','↑':'u','^':'u','▼':'d','▾':'d','↓':'d','v':'d'};
const ARW={l:'<svg viewBox="0 0 10 10"><path d="M2 5 L8 1 V9 Z" fill="currentColor"/></svg>',
r:'<svg viewBox="0 0 10 10"><path d="M8 5 L2 1 V9 Z" fill="currentColor"/></svg>',
u:'<svg viewBox="0 0 10 10"><path d="M5 2 L9 8 H1 Z" fill="currentColor"/></svg>',
d:'<svg viewBox="0 0 10 10"><path d="M5 8 L1 2 H9 Z" fill="currentColor"/></svg>'};
const root=document.createElement('div');root.className='pad-wrap';
const dp=document.createElement('div');dp.className='dpad';
const act=document.createElement('div');act.className='pad-act';
const bind=(b,d)=>{let t1=null,t2=null;
  const dn=e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(err){}
    b.classList.add('act');Haptic.buzz(b.className.includes('act-btn')?12:6);const first=d.d||d.rep;
    if(d.rep){first&&first();t1=setTimeout(()=>{t2=setInterval(()=>d.rep&&d.rep(),90);},230);}
    else first&&first();};
  const up=()=>{if(!b.classList.contains('act'))return;
    b.classList.remove('act');clearTimeout(t1);clearInterval(t2);t1=t2=null;d.u&&d.u();};
  b.addEventListener('pointerdown',dn);b.addEventListener('pointerup',up);
  b.addEventListener('pointercancel',up);b.addEventListener('contextmenu',e=>e.preventDefault());};
defs.forEach(d=>{const dir=DIR[d.i];const b=document.createElement('button');
  if(dir){b.className='dp-btn dp-'+dir;b.setAttribute('aria-label',dir);b.innerHTML=ARW[dir];dp.appendChild(b);}
  else{b.className='act-btn'+(d.big?' big':'');const lab=String(d.i).replace('⟳','ROT').replace('⤓','DROP').replace(/\s+/g,' ').trim();b.textContent=lab||'A';act.appendChild(b);}
  bind(b,d);});
const hub=document.createElement('i');hub.className='dp-hub';dp.appendChild(hub);
root.append(dp,act);tpad.appendChild(root);teardowns.push(()=>root.remove());};
api.over=(s,m)=>finish(false,s,m);
api.win=(s,m)=>finish(true,s,m);
api.snd=n=>Snd.play(n);
api.pauseToggle=()=>togglePause();
return api;
}
function finish(won,score,msg){
const a=cur?.api;if(!a||!a.alive)return;
a.running=false;
Bgm.stop();
let newBest=false;
if(score!=null)newBest=saveBest(cur.meta.id,score,cur.meta.lb);
hudBest.textContent=fmt(cur.meta,getBest(cur.meta.id));
$('#ovoTitle').textContent=won?'YOU WIN':'GAME OVER';
$('#ovoBadge').classList.toggle('hidden',!newBest);
$('#ovoScore').textContent=score!=null?fmt(cur.meta,score):'—';
$('#ovoMsg').textContent=msg||'';
$('#ovoBest').textContent='BEST: '+fmt(cur.meta,getBest(cur.meta.id));
Snd.play(won?'win':'die');
ovShow(ov.over);
}
async function openGame(id){
const meta=byId(id);if(!meta)return;
if(cur)closeGame(true);
addPlay(id);addRecent(id);renderRecent();renderPopular();
gameview.classList.remove('hidden');
requestAnimationFrame(()=>gameview.classList.add('on'));
try{history.pushState({mag:id},'');histDepth++;}catch(e){}
$('#gvName').textContent=meta.name;$('#gvTag').textContent=meta.tag;
$('#gvBest').textContent=fmt(meta,getBest(id));
hudScore.dataset.v=0;hudScore.textContent='0';
$('#gvFav').classList.toggle('on',isFav(id));
$('#ovsTitle').textContent=meta.name;
$('#ovsHelp').textContent=meta.tag;
$('#ovsCtl').textContent=meta.help;
stage.innerHTML='<p class="dim">LOADING…</p>';tpad.innerHTML='';
ovHideAll();ovShow(ov.start);
try{
const mod=await import('./games/'+meta.f);
stage.innerHTML='';tpad.innerHTML='';
const api=makeApi(meta);
const inst=mod.default.create(api);
cur={meta,inst,api};if(window.markPin)window.markPin(meta.id);
ovShow(ov.start);
}catch(e){
stage.innerHTML='<p class="dim" style="max-width:400px;text-align:center;line-height:1.7">LOAD ERROR — '+(e.message||e)+'<br><span style="font-size:11px">Check that /games/'+meta.f+' exists and was copied completely.</span></p>';
console.error(e);}
}
function startGame(){if(!cur)return;ovHideAll();cur.api.running=true;cur.api.paused=false;
Bgm.start(TRACK[cur.meta.id]);cur.inst.start();}
function restartGame(){if(!cur)return;ovHideAll();hudScore.dataset.v=0;hudScore.textContent='0';
cur.api.running=true;cur.api.paused=false;Bgm.start(TRACK[cur.meta.id]);cur.inst.restart();}
function togglePause(){if(!cur||(!cur.api.running&&!cur.api.paused))return;
if(ov.over.classList.contains('on')||ov.start.classList.contains('on'))return;
if(cur.api.paused){cur.api.paused=false;ovHide(ov.pause);if(!Bgm.timer)Bgm.start(TRACK[cur.meta.id]);Bgm.duck(false);try{cur.inst.resume&&cur.inst.resume();}catch(e){}Snd.play('click');}
else{cur.api.paused=true;ovShow(ov.pause);Bgm.duck(true);try{cur.inst.pause&&cur.inst.pause();}catch(e){}Snd.play('click');}}
function closeGame(fromPop){if(window.markPin)window.markPin(null);
if(!cur){gameview.classList.add('hidden');return;}
cur.api.alive=false;cur.api.running=false;
Bgm.stop();
try{cur.inst.destroy&&cur.inst.destroy();}catch(e){}
teardowns.forEach(f=>{try{f()}catch(e){}});teardowns=[];
stage.innerHTML='';tpad.innerHTML='';ovHideAll();
cur=null;
gameview.classList.remove('on');
setTimeout(()=>{if(!cur)gameview.classList.add('hidden');},300);
if(!fromPop&&histDepth>0){suppressPop=true;histDepth--;try{history.back();}catch(e){}}
}

/* ---------- global events ---------- */
document.addEventListener('click',e=>{
const fav=e.target.closest('[data-fav]');
if(fav){e.stopPropagation();toggleFav(fav.dataset.fav);Snd.play('pop');return;}
const play=e.target.closest('[data-id]');
if(play){buzz(12);fadeBlack(()=>openGame(play.dataset.id));return;}
const nav=e.target.closest('[data-nav]');
if(nav){e.preventDefault();buzz(8);setView(nav.dataset.nav);}
});
$('#ctaPlay').addEventListener('click',()=>{buzz(10);$('#games').scrollIntoView({behavior:rm()?'auto':'smooth'});});
$('#search').addEventListener('input',renderGrid);
$('#chips').addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;
$$('#chips .chip').forEach(x=>x.classList.remove('active'));c.classList.add('active');buzz(6);renderGrid();});
$('#gvBack').addEventListener('click',()=>closeGame(false));
$('#gvPause').addEventListener('click',togglePause);
$('#gvRestart').addEventListener('click',()=>{restartGame();Snd.play('click');});
$('#gvFav').addEventListener('click',()=>cur&&toggleFav(cur.meta.id));
$('#gvHelp').addEventListener('click',()=>{if(!cur)return;
$('#ovhTitle').textContent=cur.meta.name;$('#ovhBody').textContent=cur.meta.help+' '+(cur.meta.ctl||'');ovShow(ov.help);});
$('#ovhClose').addEventListener('click',()=>ovHide(ov.help));
$('#gvFull').addEventListener('click',()=>{
if(document.fullscreenElement)document.exitFullscreen();
else gameview.requestFullscreen?.().catch(()=>{});});
$('#ovsGo').addEventListener('click',()=>{startGame();Snd.play('click');});
$('#ovpResume').addEventListener('click',togglePause);
$('#ovpRestart').addEventListener('click',restartGame);
$('#ovpQuit').addEventListener('click',()=>closeGame(false));
$('#ovoAgain').addEventListener('click',()=>{restartGame();Snd.play('click');});
$('#ovoQuit').addEventListener('click',()=>closeGame(false));

/* settings */
function syncSettings(){$('#setHaptic').checked=settings.haptic!==false;$('#setSound').checked=settings.sound;$('#setRM').checked=settings.rm;
$('#setMusic').checked=settings.music;
$('#setVol').value=settings.vol;$('#volVal').textContent=settings.vol+'%';
$('#soundBtn').classList.toggle('off',!settings.sound);
document.documentElement.classList.toggle('rm',settings.rm);
$('#themeSeg').dataset.v=settings.theme;$$('#themeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.th===settings.theme));
$('#setLebay').checked=settings.lebay;document.documentElement.classList.toggle('calm',!settings.lebay);}
$('#themeSeg').addEventListener('click',e=>{const b=e.target.closest('[data-th]');if(!b)return;
settings.theme=b.dataset.th;LS.set('settings',settings);syncSettings();applyTheme(true);Snd.play('click');});
$('#setLebay').addEventListener('change',e=>{settings.lebay=e.target.checked;LS.set('settings',settings);syncSettings();});
$('#settingsBtn').addEventListener('click',()=>ovShow($('#settings')));
$('#setClose').addEventListener('click',()=>ovHide($('#settings')));
$('#setSound').addEventListener('change',e=>{settings.sound=e.target.checked;LS.set('settings',settings);
if(settings.sound){Snd.play('click');if(cur&&cur.api.running&&!cur.api.paused)Bgm.start(TRACK[cur.meta.id]);}
else Bgm.stop();});
$('#setMusic').addEventListener('change',e=>{settings.music=e.target.checked;LS.set('settings',settings);
if(settings.music&&cur&&cur.api.running&&!cur.api.paused)Bgm.start(TRACK[cur.meta.id]);
else Bgm.stop();});
$('#setVol').addEventListener('input',e=>{const v=+e.target.value;
$('#volVal').textContent=v+'%';Snd.setVol(v);});
$('#setRM').addEventListener('change',e=>{settings.rm=e.target.checked;LS.set('settings',settings);syncSettings();});
$('#soundBtn').addEventListener('click',()=>{settings.sound=!settings.sound;LS.set('settings',settings);syncSettings();
toast(settings.sound?'SOUND ON':'SOUND OFF');
if(settings.sound){Snd.play('click');if(cur&&cur.api.running&&!cur.api.paused)Bgm.start(TRACK[cur.meta.id]);}
else Bgm.stop();});
$('#setWipe').addEventListener('click',()=>{
if(!confirm('Erase all scores, favorites and stats?'))return;
Object.keys(localStorage).filter(k=>k.startsWith('mc_')||k.startsWith('ma_')).forEach(k=>localStorage.removeItem(k));
scores={};plays={};favs=[];recent=[];renderHome();ovHide($('#settings'));toast('DATA WIPED');});

/* keyboard */
addEventListener('keydown',e=>{
if(cur&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)&&!e.target.matches('input,textarea'))e.preventDefault();
if(e.key==='/'&&!cur&&!e.target.matches('input,textarea')){e.preventDefault();$('#search').focus();}
if(e.key==='Escape'){
if($('#settings').classList.contains('on'))return ovHide($('#settings'));
if(ov.help.classList.contains('on'))return ovHide(ov.help);
if(!cur)return;
if(ov.start.classList.contains('on')||ov.over.classList.contains('on'))closeGame(false);
else togglePause();
}
if((e.key==='p'||e.key==='P')&&cur)togglePause();
},{capture:true});
/* audio must never leak outside the page (background tab, app switch, lock screen) */
const hushAudio=()=>Snd.hush(), wakeAudio=()=>Snd.wake();
document.addEventListener('visibilitychange',()=>{
if(document.hidden){if(cur&&cur.api.running&&!cur.api.paused)togglePause();hushAudio();}
else wakeAudio();});
addEventListener('pagehide',hushAudio);
addEventListener('pageshow',wakeAudio);
document.addEventListener('freeze',hushAudio);
document.addEventListener('resume',wakeAudio);
if(document.hidden)hushAudio();

/* magnetic buttons */
if(!rm()){
document.addEventListener('mousemove',e=>{
const b=e.target.closest('.magnet');if(!b)return;
const r=b.getBoundingClientRect();
const dx=(e.clientX-r.left-r.width/2)/r.width, dy=(e.clientY-r.top-r.height/2)/r.height;
b.style.transform=`translate(${dx*8}px,${dy*6}px)`;});
document.addEventListener('mouseout',e=>{
const b=e.target.closest('.magnet');if(b&&!e.relatedTarget?.closest?.('.magnet'))b.style.transform='';});
}
syncSettings();applyTheme(false);renderHome();requestAnimationFrame(moveInd);
/* ---------- hero logo intro: icons fly in and line up -> smooth 3D turn to the left -> MOCA letters ---------- */
const HERO_T={arrive:150,stagger:120,arriveDur:900,turnAt:1650,turnStep:200,turnDur:680};
const LAYERS=8,DEPTH=1.4;
/* extrusion: stacked copies with depth; back layers are grey so the sides read as 3D thickness */
const stack=html=>{let o='';for(let i=0;i<LAYERS;i++){const z=(i-(LAYERS-1))*DEPTH;
  o+=`<div class="lt-l${i===LAYERS-1?' top':''}" style="transform:translateZ(${z.toFixed(2)}px)">${html}</div>`;}
  return `<div class="lt-stack">${o}</div>`;};
(function heroFlip(){
const logo=document.getElementById('logo');if(!logo)return;
const cells=[...logo.querySelectorAll('.lt')];
const icons=cells.map(c=>c.querySelector('.lt-in').innerHTML);
const letters=['M','O','C','A'].map(ch=>`<span class="lt-txt">${ch}</span>`);
const setFace=(c,html)=>{c.querySelector('.lt-in').innerHTML=stack(html);};
const reduced=rm()||document.documentElement.classList.contains('calm');
cells.forEach((c,i)=>setFace(c,icons[i]));
if(reduced){cells.forEach((c,i)=>setFace(c,letters[i]));return;}
/* 1. icons fly in from deep 3D space and snap into their slots */
cells.forEach((c,i)=>{
  const sx=(Math.random()*2-1)*240,sy=(Math.random()*2-1)*200,sz=-520-Math.random()*200;
  const rx=(Math.random()*2-1)*300,ry=(Math.random()*2-1)*300;
  c.animate([{transform:`translate3d(${sx}px,${sy}px,${sz}px) rotateX(${rx}deg) rotateY(${ry}deg)`,opacity:0},{transform:'none',opacity:1}],
    {duration:HERO_T.arriveDur,delay:HERO_T.arrive+i*HERO_T.stagger,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});
});
/* 2. once they are lined up, each icon turns left in 3D; the letter swaps at the edge-on moment, so it is seamless */
cells.forEach((c,i)=>{
  const el=c.querySelector('.lt-in');
  setTimeout(()=>{
    const out=el.animate([{transform:'rotateY(0deg)'},{transform:'rotateY(-90deg)'}],
      {duration:HERO_T.turnDur/2,easing:'cubic-bezier(.5,0,.9,.5)',fill:'forwards'});
    out.onfinish=()=>{
      setFace(c,letters[i]);
      el.animate([{transform:'rotateY(90deg)'},{transform:'rotateY(0deg)'}],
        {duration:HERO_T.turnDur/2,easing:'cubic-bezier(.1,.5,.4,1)',fill:'forwards'});
    };
  },HERO_T.turnAt+i*HERO_T.turnStep);
});
})();
/* ---------- fade to black: used when entering a game ---------- */
let blackBusy=false;
function fadeBlack(swap){
  if(blackBusy||rm()||document.documentElement.classList.contains('calm')||!document.body.animate){swap();return;}
  blackBusy=true;
  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;background:#000;z-index:200;pointer-events:none;opacity:0';
  document.body.appendChild(el);
  const inA=el.animate([{opacity:0},{opacity:1}],{duration:260,easing:'ease-in',fill:'forwards'});
  inA.onfinish=()=>{
    try{swap();}catch(e){console.error(e);}
    const gv=document.getElementById('gameview');
    const lift=()=>{const outA=el.animate([{opacity:1},{opacity:0}],{duration:360,easing:'ease-out',fill:'forwards'});
      outA.onfinish=()=>{el.remove();blackBusy=false;};};
    requestAnimationFrame(()=>{
      if(gv&&gv.classList.contains('on')){
        let done=false;const once=()=>{if(done)return;done=true;lift();};
        gv.addEventListener('transitionend',once,{once:true});
        setTimeout(once,650);
      }else lift();
    });
  };
}

/* ---------- ALL GAMES: full A-Z list, search, letter index with fisheye + bubble + haptic ---------- */
const allView=$('#allView'),allList=$('#allList'),allSearch=$('#allSearch'),azIndex=$('#azIndex'),allNores=$('#allNores');
const letterOf=g=>{const c=(g.name.trim().charAt(0)||'').toUpperCase();return /[A-Z]/.test(c)?c:'#';};
const azKeyId=L=>'az-'+(L==='#'?'num':L);
function renderAll(){
  const q=(allSearch.value||'').toLowerCase().trim();
  const list=GAMES.filter(g=>!q||g.name.toLowerCase().includes(q)||g.tag.toLowerCase().includes(q)||g.cat.toLowerCase().includes(q))
    .slice().sort((a,b)=>a.name.localeCompare(b.name));
  const groups={};list.forEach(g=>{(groups[letterOf(g)]=groups[letterOf(g)]||[]).push(g);});
  const order=Object.keys(groups).sort((a,b)=>a==='#'?-1:b==='#'?1:a.localeCompare(b));
  allList.innerHTML=order.map(L=>`<h3 class="az-h" id="${azKeyId(L)}">${L}</h3>`+
    groups[L].map(g=>`<button class="arow" data-id="${g.id}"><canvas data-thumb="${g.id}"></canvas>
      <span class="ar-t"><b>${g.name}</b><small>${g.tag}</small></span>
      <span class="ar-best">${fmt(g,getBest(g.id))}</span></button>`).join('')).join('');
  paintThumbs(allList);
  allNores.classList.toggle('hidden',list.length>0);
  azIndex.querySelectorAll('button').forEach(b=>b.classList.toggle('dis',!groups[b.dataset.l]));
}
const AZ_KEYS=['#',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
azIndex.innerHTML=AZ_KEYS.map(L=>`<button data-l="${L}">${L}</button>`).join('');
function azResolve(L){
  const i=AZ_KEYS.indexOf(L);
  for(let d=0;d<AZ_KEYS.length;d++){
    for(const k of [i+d,i-d]){const key=AZ_KEYS[k];if(key!==undefined&&document.getElementById(azKeyId(key)))return key;}
  }
  return null;
}
function azGoto(L,instant){
  const key=azResolve(L);if(!key)return null;
  const h=document.getElementById(azKeyId(key));
  h.scrollIntoView({behavior:instant||rm()?'auto':'smooth',block:'start'});
  return key;
}
let azDrag=false,azLastKey=null;
const azBtns=()=>[...azIndex.querySelectorAll('button')];
const azBubble=document.createElement('div');azBubble.id='azBubble';document.body.appendChild(azBubble);
function azAt(y){let best=-1,bd=1e9;azBtns().forEach((b,i)=>{const r=b.getBoundingClientRect();const d=Math.abs(y-(r.top+r.height/2));if(d<bd){bd=d;best=i;}});return best;}
function azFan(i){azBtns().forEach((b,k)=>{const d=k-i;const w=Math.exp(-(d*d)/(2*2.4*2.4));
  b.style.transform=`translateX(${(-24*w).toFixed(1)}px) scale(${(1+0.9*w).toFixed(3)})`;});}
function azRest(){azBtns().forEach(b=>{b.style.transform='';});azBubble.classList.remove('show');}
function azPick(y){
  const i=azAt(y);if(i<0)return;azFan(i);
  const key=azGoto(AZ_KEYS[i],true);if(!key)return;
  azBtns().forEach(x=>x.classList.remove('on'));
  const hit=azIndex.querySelector(`button[data-l="${key}"]`);if(hit)hit.classList.add('on');
  const r=azBtns()[i].getBoundingClientRect();
  azBubble.textContent=key;azBubble.style.top=(r.top+r.height/2)+'px';azBubble.classList.add('show');
  if(key!==azLastKey){azLastKey=key;Haptic.strong(45);}
}
azIndex.addEventListener('pointerdown',e=>{azDrag=true;azLastKey=null;try{azIndex.setPointerCapture(e.pointerId);}catch(err){}Haptic.strong(70);azPick(e.clientY);});
azIndex.addEventListener('pointermove',e=>{if(azDrag)azPick(e.clientY);});
const azEnd=()=>{if(!azDrag)return;azDrag=false;azLastKey=null;azRest();setTimeout(()=>{if(!azDrag)azBtns().forEach(x=>x.classList.remove('on'));},300);};
azIndex.addEventListener('pointerup',azEnd);azIndex.addEventListener('pointercancel',azEnd);
/* keep the index in sync while the list is scrolled by hand */
let azScrollRaf=0;
addEventListener('scroll',()=>{if(azScrollRaf||azDrag||curView!=='games')return;
  azScrollRaf=requestAnimationFrame(()=>{azScrollRaf=0;
    let cur=null;document.querySelectorAll('#allList .az-h').forEach(h=>{if(h.getBoundingClientRect().top<160)cur=h.id;});
    if(!cur)return;const key=cur==='az-num'?'#':cur.slice(3);
    azBtns().forEach(b=>b.classList.toggle('cur',b.dataset.l===key));});},{passive:true});
allSearch.addEventListener('input',renderAll);
allList.addEventListener('click',e=>{const r=e.target.closest('.arow');if(r)buzz(10);});

/* settings: haptic toggle + light tick on every checkbox */
$('#setHaptic').addEventListener('change',e=>{settings.haptic=e.target.checked;LS.set('settings',settings);syncSettings();if(settings.haptic)buzz(12);});
document.addEventListener('change',e=>{if(e.target.matches&&e.target.matches('input[type=checkbox]')&&e.target.id!=='setHaptic')buzz(6);});

document.querySelectorAll('.gcount').forEach(e=>{e.textContent=GAMES.length;});

/* ---------- feedback: sends to /api/feedback (same origin, Vercel function). Nothing sensitive lives on the client. ---------- */
const fbOv=$('#fbOv'),fbForm=$('#fbForm'),fbMsg=$('#fbMsg'),fbStatus=$('#fbStatus'),fbSend=$('#fbSend');
let fbCooldown=0;
const fbSetStatus=(t,ok)=>{fbStatus.textContent=t;fbStatus.style.color=ok?'var(--w)':'var(--g2)';};
$('#fbOpen').addEventListener('click',()=>{fbStatus.textContent='';fbStatus.style.color='';ovShow(fbOv);});
$('#fbClose').addEventListener('click',()=>ovHide(fbOv));
fbOv.addEventListener('click',e=>{if(e.target===fbOv)ovHide(fbOv);});
fbForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const now=Date.now();
  if(now<fbCooldown){fbSetStatus('Tunggu sebentar sebelum kirim lagi.');return;}
  const message=fbMsg.value.trim();
  if(message.length<3){fbSetStatus('Tulis minimal 3 karakter dulu ya.');return;}
  fbSend.disabled=true;fbSetStatus('Mengirim…');
  const payload={
    category:$('#fbCat').value,
    message,
    contact:$('#fbContact').value.trim(),
    game:cur?cur.meta.id:'',
    view:curView,
    website:$('#fbHp').value
  };
  try{
    const r=await fetch('/api/feedback',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin'
    });
    if(r.status===429){fbSetStatus('Terlalu banyak kiriman. Coba lagi nanti.');}
    else if(!r.ok){fbSetStatus('Gagal kirim, coba lagi.');}
    else{
      fbCooldown=Date.now()+15000;
      fbMsg.value='';$('#fbContact').value='';
      fbSetStatus('Terima kasih! Feedback kamu udah masuk.',true);
      buzz(12);
      setTimeout(()=>ovHide(fbOv),1400);
    }
  }catch(err){fbSetStatus('Koneksi bermasalah. Coba lagi.');}
  finally{fbSend.disabled=false;}
});

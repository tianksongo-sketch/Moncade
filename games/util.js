export const R=(a,b)=>a+Math.random()*(b-a);
export const RI=(a,b)=>Math.floor(R(a,b+1));
export const clamp=(v,a,b)=>v<a?a:v>b?b:v;
export const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
export function swipe(el,cb){ 
  let sx=null,sy=null,lastTouch=0;
  const dn=e=>{
    if(e.touches)lastTouch=performance.now();
    else if(performance.now()-lastTouch<700)return; 
    const p=e.touches?e.touches[0]:e;sx=p.clientX;sy=p.clientY;};
  const up=e=>{if(sx==null)return;
    if(!e.changedTouches&&performance.now()-lastTouch<700){sx=null;return;}
    const p=e.changedTouches?e.changedTouches[0]:e;
    const dx=p.clientX-sx,dy=p.clientY-sy,ax=Math.abs(dx),ay=Math.abs(dy);sx=null;
    if(Math.max(ax,ay)<24)return cb('tap');
    cb(ax>ay?(dx>0?'right':'left'):(dy>0?'down':'up'));};
  const o={passive:true};
  el.addEventListener('touchstart',dn,o);el.addEventListener('touchend',up,o);
  el.addEventListener('mousedown',dn);el.addEventListener('mouseup',up);
  return()=>{el.removeEventListener('touchstart',dn);el.removeEventListener('touchend',up);
    el.removeEventListener('mousedown',dn);el.removeEventListener('mouseup',up);};
}
export const el=(tag,cls,html)=>{const d=document.createElement(tag);if(cls)d.className=cls;if(html!=null)d.innerHTML=html;return d;};
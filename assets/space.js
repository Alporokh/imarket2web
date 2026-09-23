/* =========================================================================
   Cinematic space hero — per-frame work
   =========================================================================
   Original effect by Olena Porokh. Reviewed and adjusted:
     - Earth image self-hosted and resized (was a 1.24 MB hotlink to NASA at
       3718x3718; now 382 KB at 1600x1600, which is still more than the 1.6x
       zoom ever shows).
     - Guarded so it costs nothing on pages without the hero.

   Kept as-is because it was already right:
     - smoothstep easing per sub-range, so each beat eases independently
     - rAF-throttled scroll with passive listeners
     - devicePixelRatio capped at 2, and fewer stars under 700px
     - transform/opacity only
     - bails out entirely on prefers-reduced-motion (CSS has a static
       fallback layout for that case)
   ========================================================================= */

// Cinematic scroll-scrub: deep space -> light trails -> Earth approach.
(function(){
  var journey=document.getElementById('space-journey'), canvas=document.getElementById('space-canvas');
  var earth=document.getElementById('space-earth'), copy=document.querySelector('.space-copy');
  var message=document.querySelector('.space-message'), hint=document.querySelector('.space-scroll');
  if(!journey||!canvas||!earth||!copy||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var ctx=canvas.getContext('2d'), stars=[], w=0,h=0,dpr=1,ticking=false;
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function smooth(a,b,x){x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)}
  function resize(){dpr=Math.min(window.devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);stars=[];for(var i=0;i<(w<700?150:260);i++){var ang=Math.random()*Math.PI*2,r=Math.pow(Math.random(),.55)*Math.max(w,h)*.72;stars.push({x:Math.cos(ang)*r,y:Math.sin(ang)*r,z:.15+Math.random()*.85,s:.4+Math.random()*1.4})}draw(progress())}
  function progress(){var r=journey.getBoundingClientRect(),range=journey.offsetHeight-innerHeight;return clamp(-r.top/Math.max(1,range),0,1)}
  function draw(p){ctx.clearRect(0,0,w,h);ctx.fillStyle='#020306';ctx.fillRect(0,0,w,h);var cx=w*.5,cy=h*.48;var warp=smooth(.18,.58,p), fade=1-smooth(.72,.98,p);ctx.globalAlpha=fade;stars.forEach(function(st){var boost=1+p*1.5, x=cx+st.x*boost,y=cy+st.y*boost;var len=warp*(18+st.z*115);var dx=x-cx,dy=y-cy,mag=Math.sqrt(dx*dx+dy*dy)||1;ctx.beginPath();ctx.moveTo(x-dx/mag*len,y-dy/mag*len);ctx.lineTo(x,y);ctx.strokeStyle='rgba(190,218,255,'+(.28+st.z*.7)+')';ctx.lineWidth=st.s*(.65+warp*1.1);ctx.stroke();if(warp<.35){ctx.beginPath();ctx.arc(x,y,st.s,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(.35+st.z*.55)+')';ctx.fill()}});ctx.globalAlpha=1;
    var copyOut=smooth(.08,.31,p);copy.style.opacity=String(1-copyOut);copy.style.transform='translate3d(0,'+(-70*copyOut)+'px,0) scale('+(1-.035*copyOut)+')';
    hint.style.opacity=String(.8*(1-smooth(.02,.16,p)));
    var earthIn=smooth(.52,.68,p),earthGrow=smooth(.62,1,p);earth.style.opacity=String(earthIn);var scale=.055+earthGrow*1.55;earth.style.transform='translate3d(0,'+(18-20*earthGrow)+'%,0) scale('+scale+')';
    var msgIn=smooth(.66,.78,p),msgOut=smooth(.82,.94,p);message.style.opacity=String(msgIn*(1-msgOut));message.style.transform='translate(-50%,'+(-42-8*msgIn)+'%) scale('+(1+.04*msgIn)+')';
  }
  function update(){ticking=false;draw(progress())}
  function request(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
  addEventListener('resize',resize,{passive:true});addEventListener('scroll',request,{passive:true});resize();
})();

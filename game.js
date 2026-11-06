(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const intro = document.getElementById('introScreen');
  const result = document.getElementById('resultScreen');
  const hud = document.getElementById('hud');
  const scoreEl = document.getElementById('score');
  const bestLabel = document.getElementById('bestLabel');
  const finalScore = document.getElementById('finalScore');
  const resultBest = document.getElementById('resultBest');
  const prompt = document.getElementById('readyPrompt');
  const hookBtn = document.getElementById('hookBtn');
  const streakEl = document.getElementById('streak');
  let W = 960, H = 560, scale = 1, last = 0, mode = 'intro', score = 0, best = 0;
  let world = 0, speed = 160, spawnAt = 0, shake = 0, hookHeld = false, audio = null, soundOn = false;
  let bird, pipes = [], anchors = [], particles = [], clouds = [], hook = null, streakTime = 0, elapsed = 0;
  const rand = (a,b) => a + Math.random() * (b-a);
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const groundY = () => H - 55;
  try { best = +(localStorage.getItem('skybound-best') || 0); } catch (_) {}
  bestLabel.textContent = String(best).padStart(3,'0');
  function resize() {
    const r = stage.getBoundingClientRect(); W = 960; H = 560;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width*dpr); canvas.height = Math.round(r.height*dpr);
    ctx.setTransform(canvas.width/W, 0, 0, canvas.height/H, 0, 0);
  }
  new ResizeObserver(resize).observe(stage); resize();
  function newGame() {
    score = 0; world = 0; speed = 160; spawnAt = 560; elapsed = 0; shake = 0;
    bird = {x:235,wx:235,vx:190,y:H*.48,vy:0,rot:0,wing:0};
    pipes = []; anchors = []; particles = []; hook = null; hookHeld = false;
    clouds = Array.from({length:8},(_,i)=>({x:i*165+rand(-30,60),y:rand(65,360),s:rand(.55,1.3),p:rand(0,6.28)}));
    makeObstacle(spawnAt); spawnAt += rand(328,372);
    scoreEl.textContent = '000'; streakEl.classList.remove('show');
    mode = 'ready'; intro.classList.add('hidden'); result.classList.add('hidden'); hud.classList.add('visible');
    prompt.classList.remove('hidden'); hookBtn.classList.remove('active');
  }
  function startFlight() { if (mode === 'ready') { mode='play'; prompt.classList.add('hidden'); flap(); } }
  function flap() {
    if (mode === 'intro') { newGame(); startFlight(); return; }
    if (mode === 'ready') { startFlight(); return; }
    if (mode !== 'play') return;
    bird.vy = -270; bird.wing = 1; burst(bird.x-8,bird.y+6,'#ffe390',5); tone(520,.055,'triangle',.025);
  }
  function gameOver() {
    if (mode !== 'play') return;
    mode='over'; hookHeld=false; hook=null; hookBtn.classList.remove('active'); shake=12;
    burst(bird.x,bird.y,'#ffb96a',22); tone(130,.25,'sawtooth',.045);
    if(score>best){best=score;try{localStorage.setItem('skybound-best',best)}catch(_){}}
    bestLabel.textContent=String(best).padStart(3,'0');
    finalScore.textContent=String(score).padStart(3,'0');resultBest.textContent=String(best).padStart(3,'0');
    setTimeout(()=>{if(mode==='over')result.classList.remove('hidden')},450);
    setTimeout(()=>{if(mode==='over')hud.classList.remove('visible')},300);
  }
  function makeObstacle(x) {
    const gap = clamp(260 - Math.floor(score/10)*2, 220, 260);
    const cy = rand(245, groundY()-gap*.5-65), width = 72;
    pipes.push({x,w:width,top:cy-gap/2,bottom:cy+gap/2,passed:false});
    if(Math.random() < .9) anchors.push({x:x+rand(100,155),y:rand(105,groundY()-105),r:13,phase:rand(0,6.28),caught:false});
  }
  function beginHook() {
    if(mode!=='play' || hookHeld) return;
    hookHeld=true; hookBtn.classList.add('active');
    const target=anchors.filter(a=>!a.caught&&a.x>world+bird.x+24&&a.x<world+bird.x+520).sort((a,b)=>a.x-b.x)[0];
    hook = target ? {target,progress:0,connected:false} : {target:null,progress:0,connected:false};
    tone(340,.08,'sine',.018);
  }
  function endHook() {
    if(!hookHeld)return;
    hookHeld=false;hookBtn.classList.remove('active');
    if(hook&&hook.connected){hook.target.caught=false;burst(bird.x+14,bird.y,'#d8f36a',7);tone(680,.09,'triangle',.028)}
    hook=null;
  }
  function burst(x,y,color,n) { for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-130,130),vy:rand(-150,80),life:rand(.3,.75),max:.75,color,size:rand(1.5,4)}) }
  function tone(freq,duration,type='sine',vol=.025) {
    if(!soundOn)return;
    try { audio ||= new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==='suspended')audio.resume();
      const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
    } catch(_){}
  }
  function update(dt) {
    if(mode==='intro'){elapsed+=dt;return;}
    elapsed+=dt;
    if(mode==='ready'){bird.y=H*.48+Math.sin(elapsed*3)*6;bird.wing=Math.sin(elapsed*8);world+=dt*28;return;}
    if(mode!=='play'){
      if(mode==='over'){bird.vy+=950*dt;bird.y=Math.min(groundY()-18,bird.y+bird.vy*dt);bird.rot=Math.min(1.2,bird.rot+dt*2);}
      updateParticles(dt); return;
    }
    speed=Math.min(220,160+score*.55); world+=speed*dt;
    bird.vy+=900*dt;
    if(!hook||!hook.connected){bird.wx+=speed*dt;bird.x=bird.wx-world;}
    if(hookHeld&&hook){
      if(!hook.connected){
        hook.progress+=dt*5.2;
        if(hook.target){const a=hook.target, dx=a.x-bird.wx, dy=a.y-bird.y, reach=hook.progress*400;
          if(dx>0&&Math.hypot(dx,dy)<reach+22){hook.connected=true;a.caught=true;hook.len=clamp(Math.hypot(dx,dy),100,330);burst(a.x-world,a.y,'#d8f36a',12);streakTime=1.1;streakEl.classList.add('show');tone(790,.12,'sine',.04);tone(1120,.16,'triangle',.022)}
        } else if(hook.progress>1.3) hook=null;
      }
      if(hook&&hook.connected){
        const a=hook.target, dx=bird.wx-a.x, dy=bird.y-a.y, dist=Math.hypot(dx,dy)||1;
        const nx=dx/dist,ny=dy/dist, radial=bird.vx*nx+bird.vy*ny;
        bird.vx-=radial*nx;bird.vy-=radial*ny;
        const ndx=bird.wx-a.x,ndy=bird.y-a.y,nd=Math.hypot(ndx,ndy)||1;
        bird.wx=a.x+ndx/nd*hook.len;bird.y=a.y+ndy/nd*hook.len;bird.x=bird.wx-world;
      }
    }
    if(!hook||!hook.connected){bird.y+=bird.vy*dt}
    bird.wing=Math.max(0,bird.wing-dt*4.5);bird.rot=clamp(bird.vy/600,-.48,1.03);
    if(bird.y<19){bird.y=19;bird.vy=Math.max(30,bird.vy*.35);if(hook&&hook.connected)endHook();}
    if(bird.y>groundY()-20){bird.y=groundY()-20;gameOver();}
    if(world+W+120>spawnAt){makeObstacle(spawnAt);spawnAt+=rand(328,372);}
    for(const p of pipes){const x=p.x-world;
      if(!p.passed&&x+p.w<bird.x-17){p.passed=true;score++;scoreEl.textContent=String(score).padStart(3,'0');tone(920,.07,'sine',.022);}
      if(x<bird.x+18&&x+p.w>bird.x-18&&(bird.y-15<p.top||bird.y+15>p.bottom))gameOver();
    }
    if(bird.x<135||bird.x>340){bird.x=clamp(bird.x,135,340);bird.wx=world+bird.x;}
    pipes=pipes.filter(p=>p.x-world>-120);anchors=anchors.filter(a=>a.x-world>-80);
    if(hook&&hook.target&&hook.target.x-world<0){hook.target.caught=false;hook=null;hookHeld=false;hookBtn.classList.remove('active')}
    if(streakTime>0){streakTime-=dt;if(streakTime<=0)streakEl.classList.remove('show')}
    updateParticles(dt);
  }
  function updateParticles(dt){for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt}particles=particles.filter(p=>p.life>0)}
  function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
  function drawBackground() {
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1a5265');sky.addColorStop(.48,'#267587');sky.addColorStop(1,'#a4a76e');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const sunX=725-(world*.035%110),sunY=142;
    const glow=ctx.createRadialGradient(sunX,sunY,20,sunX,sunY,180);glow.addColorStop(0,'#f3d98255');glow.addColorStop(1,'#f3d98200');ctx.fillStyle=glow;ctx.fillRect(sunX-185,sunY-185,370,370);
    ctx.fillStyle='#f6d990';ctx.globalAlpha=.72;ctx.beginPath();ctx.arc(sunX,sunY,43,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle='#f5dfac48';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(sunX,sunY,92,19,-.12,0,Math.PI*2);ctx.stroke();
    for(const c of clouds){let x=((c.x-world*.10+1300)%1260)-100;let y=c.y+Math.sin(elapsed*.35+c.p)*4;cloudShape(x,y,c.s,'#d7e9d744')}
    hillLayer('#568b82',.13,390,38);hillLayer('#376f70',.24,434,30);
    const buildings=[34,48,29,62,38,53,31,45,67,36,51,28,58,40,32,63,45,30,54,38,60];
    for(let i=0;i<buildings.length;i++){
      const bw=36,gap=8,total=buildings.length*(bw+gap),x=((i*(bw+gap)-world*.38)%total+total)%total-20;
      const bh=buildings[i]*1.17+24;ctx.fillStyle=i%3===0?'#22545e':'#245963';ctx.fillRect(x,groundY()-bh,bw,bh);
      ctx.fillStyle='#e6d58a70';for(let wy=groundY()-bh+13;wy<groundY()-12;wy+=14)for(let wx=x+8;wx<x+bw-5;wx+=12)if(((wx+wy+i*7)|0)%3)ctx.fillRect(wx,wy,3,4);
    }
    hillLayer('#235861',.54,groundY()+12,17);
    const floor=ctx.createLinearGradient(0,groundY()-6,0,H);floor.addColorStop(0,'#255d59');floor.addColorStop(1,'#143c40');ctx.fillStyle=floor;ctx.fillRect(0,groundY(),W,H-groundY());
    ctx.fillStyle='#d2dc7a';ctx.fillRect(0,groundY(),W,3);
    for(let i=0;i<52;i++){let x=((i*43-world*.85)%1040+1040)%1040-40;let y=groundY()+12+(i*19%35);ctx.fillStyle=i%4?'#aac36d55':'#e5df8b70';ctx.fillRect(x,y,randSeed(i)*10+3,1)}
    for(let i=0;i<34;i++){let x=(i*173-world*.025)%W;if(x<0)x+=W;let y=(i*71)%250;ctx.fillStyle=`rgba(237,245,206,${.16+.2*Math.sin(elapsed+i)})`;ctx.fillRect(x,y,1.3,1.3)}
  }
  function randSeed(i){return ((i*9301+49297)%233)/233}
  function cloudShape(x,y,s,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,32*s,8*s,0,0,Math.PI*2);ctx.ellipse(x-14*s,y-5*s,15*s,10*s,0,0,Math.PI*2);ctx.ellipse(x+3*s,y-9*s,20*s,15*s,0,0,Math.PI*2);ctx.ellipse(x+20*s,y-3*s,15*s,10*s,0,0,Math.PI*2);ctx.fill()}
  function hillLayer(color,parallax,base,amp){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,base);for(let x=0;x<=W+20;x+=20){const wx=x+world*parallax;const y=base+Math.sin(wx*.008)*amp+Math.sin(wx*.021)*amp*.3;ctx.lineTo(x,y)}ctx.lineTo(W,H);ctx.fill()}
  function drawPipes(){
    for(const p of pipes){const x=p.x-world;if(x>W+100||x+p.w< -100)continue;
      pipeBody(x,-8,p.w,p.top+8,true);pipeBody(x,p.bottom,p.w,groundY()-p.bottom+8,false);
      ctx.fillStyle='#ecf4c51c';ctx.fillRect(x+12,0,4,p.top-12);ctx.fillRect(x+12,p.bottom+13,4,groundY()-p.bottom-16);
    }
  }
  function pipeBody(x,y,w,h,top){
    const grad=ctx.createLinearGradient(x,0,x+w,0);grad.addColorStop(0,'#12616b');grad.addColorStop(.18,'#23818a');grad.addColorStop(.52,'#2b8a8b');grad.addColorStop(1,'#125563');
    ctx.fillStyle=grad;ctx.fillRect(x+5,y,w-10,h);
    ctx.fillStyle='#0d4c59';ctx.fillRect(x,y+(top?Math.max(0,h-19):0),w,19);
    ctx.fillStyle='#48a49a';ctx.fillRect(x+1,y+(top?Math.max(0,h-18):0),w-2,4);
    ctx.fillStyle='#e5c777';ctx.fillRect(x+1,y+(top?Math.max(0,h-3):0),w-2,3);
    ctx.fillStyle='#173e4a';ctx.fillRect(x+5,y+(top?Math.max(0,h-1):0),w-10,2);
    ctx.fillStyle='#ffffff12';ctx.fillRect(x+10,y+(top?0:4),4,Math.max(0,h-25));
  }
  function drawAnchors(){
    for(const a of anchors){const x=a.x-world;if(x< -30||x>W+30)continue;const pulse=1+Math.sin(elapsed*3+a.phase)*.08;
      ctx.fillStyle='#d8f36a10';ctx.beginPath();ctx.arc(x,a.y,31*pulse,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#d9f47a65';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,a.y,20*pulse,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='#ecff9a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,a.y,a.r,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#fff9cb';ctx.beginPath();ctx.arc(x,a.y,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d8f36a';ctx.fillRect(x-2,a.y-1,4,2);
    }
  }
  function drawHook(){
    if(!hook)return;const bx=bird.x+4,by=bird.y-3;
    if(hook.connected){const tx=hook.target.x-world,ty=hook.target.y;
      ctx.strokeStyle='#ecf7d8';ctx.lineWidth=2;ctx.shadowColor='#d8f36a';ctx.shadowBlur=7;ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo((bx+tx)/2,Math.min(by,ty)-9,tx,ty);ctx.stroke();ctx.shadowBlur=0;
      ctx.fillStyle='#f3fac7';ctx.beginPath();ctx.arc(tx,ty,3,0,Math.PI*2);ctx.fill();
    }else{
      const target=hook.target;let tx=target?target.x-world:bx+hook.progress*310,ty=target?target.y:by-95;
      if(target){const t=Math.min(1,hook.progress);tx=bx+(tx-bx)*t;ty=by+(ty-by)*t}
      ctx.strokeStyle='#f1f3df';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(tx,ty);ctx.stroke();
      ctx.strokeStyle='#d8f36a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(tx,ty,5,Math.PI*.15,Math.PI*1.7);ctx.stroke();
    }
  }
  function drawBird(){
    const x=bird.x,y=bird.y;ctx.save();ctx.translate(x,y);ctx.rotate(bird.rot);
    ctx.fillStyle='#bb7741';roundedRect(-17,-8,14,20,5);ctx.fill();ctx.strokeStyle='#f6cc78';ctx.lineWidth=2;ctx.stroke();
    ctx.strokeStyle='#f6e8ac';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-14,-4);ctx.lineTo(-7,-4);ctx.moveTo(-14,0);ctx.lineTo(-8,0);ctx.stroke();
    ctx.fillStyle='#db8650';ctx.beginPath();ctx.moveTo(-13,4);ctx.lineTo(-24,-3);ctx.lineTo(-21,9);ctx.closePath();ctx.fill();
    ctx.save();ctx.translate(-2,6);ctx.rotate(-.25-bird.wing*.72+Math.sin(elapsed*15)*.08);ctx.fillStyle='#f3b84e';ctx.beginPath();ctx.ellipse(-1,1,10,6,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d9913b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5,1);ctx.lineTo(1,1);ctx.stroke();ctx.restore();
    const body=ctx.createLinearGradient(-5,-16,11,15);body.addColorStop(0,'#ffe68a');body.addColorStop(.6,'#f9c45d');body.addColorStop(1,'#e99a46');
    ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,0,17,14,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff0b0';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(0,0,16.3,13.3,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff9e8';ctx.beginPath();ctx.ellipse(8,-5,6.1,6.5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#172c31';ctx.beginPath();ctx.arc(10,-5,2.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(10.6,-6,.8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f08d48';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(27,3);ctx.lineTo(14,6);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffe2a0';ctx.lineWidth=1;ctx.stroke();ctx.restore();
  }
  function render(){
    ctx.save();if(shake>0){ctx.translate(rand(-shake,shake),rand(-shake,shake));shake=Math.max(0,shake-.65)}
    drawBackground();drawPipes();drawAnchors();drawHook();
    for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
    if(bird)drawBird();
    const v=ctx.createRadialGradient(W*.5,H*.42,150,W*.5,H*.48,650);v.addColorStop(0,'#00101b00');v.addColorStop(1,'#03141d49');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);ctx.restore();
  }
  function frame(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);render();requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
  function pointerFlap(e){if(e)e.preventDefault();if(mode==='over'){newGame();startFlight();return}if(mode==='ready'){startFlight();return}flap()}
  document.getElementById('playBtn').addEventListener('click',()=>{newGame();startFlight()});
  document.getElementById('retryBtn').addEventListener('click',()=>{newGame();startFlight()});
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointerFlap(e)});
  hookBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();hookBtn.setPointerCapture?.(e.pointerId);beginHook()});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])hookBtn.addEventListener(event,e=>{e.preventDefault();e.stopPropagation();endHook()});
  stage.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{
    if(['Space','ArrowUp'].includes(e.code)){e.preventDefault();if(!e.repeat)pointerFlap()}
    if(['ShiftLeft','ShiftRight','KeyX','ArrowDown'].includes(e.code)){e.preventDefault();if(!e.repeat)beginHook()}
    if(e.code==='Escape'&&mode==='play'){mode='paused';prompt.classList.remove('hidden');prompt.textContent='PAUSED · PRESS SPACE TO CONTINUE'}
    else if(e.code==='Space'&&mode==='paused'){mode='play';prompt.classList.add('hidden')}
  });
  window.addEventListener('keyup',e=>{if(['ShiftLeft','ShiftRight','KeyX','ArrowDown'].includes(e.code))endHook()});
  document.getElementById('soundToggle').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.innerHTML='♫ <span>SOUND '+(soundOn?'ON':'OFF')+'</span>';e.currentTarget.setAttribute('aria-label',soundOn?'Turn sound off':'Turn sound on');if(soundOn)tone(660,.1,'sine',.04)});
})();

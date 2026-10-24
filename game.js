const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const WORLD = { w: 2400, h: 1800 };
const NIGHT_AT = 45;
const keys = new Set();
const camera = { x: 1200, y: 1050, zoom: 1 };
const mouse = { x: 0, y: 0, active: false };
let width = 1200, height = 560, dpr = 1, state = 'menu', elapsed = 0, last = 0;
let player, enemies, supplies, particles, kills = 0, collected = 0, spawnTimer = 0;
let toastTime = 0, shake = 0, audio, soundOn = false, footstep = 0;
let seed = 104;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Fixed level geometry makes every run learnable; only enemy wander is random.
const buildings = [
  { x: 120, y: 130, w: 300, h: 270, label: 'WORKSHOP', type: 0 },
  { x: 550, y: 130, w: 310, h: 245, label: 'RESIDENCES', type: 1 },
  { x: 1020, y: 110, w: 280, h: 210, label: 'PHARMACY', type: 2 },
  { x: 1470, y: 100, w: 350, h: 280, label: 'NORTH BLOCK', type: 1 },
  { x: 2000, y: 140, w: 260, h: 340, label: 'SUBSTATION', type: 0 },
  { x: 110, y: 580, w: 285, h: 350, label: 'WAREHOUSE', type: 0 },
  { x: 610, y: 570, w: 255, h: 310, label: 'APARTMENTS', type: 1 },
  { x: 1040, y: 540, w: 290, h: 300, label: 'MARKET', type: 2 },
  { x: 1620, y: 570, w: 250, h: 355, label: 'RESIDENCES', type: 1 },
  { x: 2040, y: 680, w: 220, h: 310, label: 'GARAGE', type: 0 },
  { x: 140, y: 1170, w: 270, h: 360, label: 'WEST BLOCK', type: 1 },
  { x: 660, y: 1160, w: 300, h: 280, label: 'HARRISON CLINIC', type: 2 },
  { x: 1140, y: 1180, w: 270, h: 290, label: 'OLD TOWN', type: 1 },
  { x: 1610, y: 1370, w: 280, h: 200, label: 'SAFEHOUSE', type: 3 },
  { x: 2080, y: 1200, w: 210, h: 340, label: 'DEPOT', type: 0 },
];
const barriers = [
  { x: 912, y: 630, w: 90, h: 19 }, { x: 1360, y: 904, w: 145, h: 19 },
  { x: 440, y: 1110, w: 150, h: 20 }, { x: 1460, y: 380, w: 20, h: 140 },
  { x: 1050, y: 1040, w: 125, h: 20 }, { x: 1900, y: 1100, w: 120, h: 20 },
];
const cars = [
  { x: 461, y: 730, w: 37, h: 79, color: '#48584a', a: .1 },
  { x: 936, y: 275, w: 37, h: 74, color: '#70674c', a: -.13 },
  { x: 1240, y: 952, w: 78, h: 37, color: '#5a6660', a: .08 },
  { x: 1525, y: 655, w: 37, h: 78, color: '#705448', a: .12 },
  { x: 1517, y: 1120, w: 36, h: 75, color: '#575e43', a: -.15 },
  { x: 720, y: 1030, w: 79, h: 37, color: '#47595d', a: -.05 },
  { x: 1940, y: 730, w: 36, h: 75, color: '#655641', a: .1 },
];
const lamps = [ {x:440,y:440}, {x:910,y:480}, {x:1420,y:440}, {x:1950,y:530}, {x:450,y:1030}, {x:990,y:960}, {x:1460,y:1030}, {x:1990,y:1120}, {x:560,y:1570}, {x:1510,y:1570} ];
const exit = { x: 1745, y: 1290 };
const scenery = [];
for (let i = 0; i < 600; i++) scenery.push({ x: random() * WORLD.w, y: random() * WORLD.h, size: random() * 3 + 1, angle: random() * 6.28 });
const trees = [{x:70,y:480},{x:900,y:100},{x:1375,y:130},{x:2300,y:550},{x:73,y:1080},{x:450,y:1610},{x:1060,y:1580},{x:1540,y:1700},{x:1970,y:1600},{x:2320,y:1100},{x:530,y:570},{x:1400,y:720}];

function reset() {
  player = { x: 1130, y: 970, r: 13, hp: 100, stamina: 100, angle: -.5, medkits: 1, attack: 0, attackCooldown: 0, invulnerable: 0, vault: 0, vaultCooldown: 0, moving: false, sprinting: false, travel: 0 };
  enemies = [];
  const starts = [[500,900],[920,450],[1450,750],[1550,1050],[640,1020],[1050,430],[1410,350],[1940,1040],[1400,1570],[550,1500],[1950,450],[90,1000],[960,1580],[1910,1320]];
  starts.forEach(([x, y]) => addEnemy(x, y));
  supplies = [{ x: 550, y: 990, taken: false, name: 'Medical supplies' }, { x: 1460, y: 660, taken: false, name: 'Clean water' }, { x: 1115, y: 390, taken: false, name: 'Emergency rations' }];
  particles = []; kills = 0; collected = 0; elapsed = 0; spawnTimer = 0; shake = 0; toastTime = 0;
  camera.x = player.x; camera.y = player.y;
  keys.clear(); mouse.active = false;
  $('interaction').classList.add('hidden'); $('toast').classList.add('hidden');
  updateHud();
}
function addEnemy(x, y) { enemies.push({ x, y, r: 12, hp: 3, angle: random() * Math.PI * 2, cooldown: 0, stun: 0, flash: 0, wander: random() * 4, speed: 37 + random() * 15, dead: false, alerted: false }); }
function resize() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width; height = rect.height; dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  camera.zoom = clamp(width / 1170, .65, 1.15);
}
new ResizeObserver(resize).observe(canvas);
function worldPoint(x, y) { return { x: (x - width / 2) / camera.zoom + camera.x, y: (y - height / 2) / camera.zoom + camera.y }; }
function circleRect(x, y, r, b) { return Math.hypot(x - clamp(x, b.x, b.x + b.w), y - clamp(y, b.y, b.y + b.h)) < r; }
function blocked(x, y, r, vault = false) {
  if (x < r + 35 || y < r + 35 || x > WORLD.w - r - 35 || y > WORLD.h - r - 35) return true;
  if (buildings.some(b => circleRect(x, y, r, b))) return true;
  if (!vault && (barriers.some(b => circleRect(x, y, r, b)) || cars.some(b => circleRect(x, y, r, b)))) return true;
  return false;
}
function move(body, dx, dy, vault = false) {
  // Small substeps prevent tunneling through buildings during a vault or a slow frame.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 7));
  for (let i = 0; i < steps; i++) {
    if (!blocked(body.x + dx / steps, body.y, body.r, vault)) body.x += dx / steps;
    if (!blocked(body.x, body.y + dy / steps, body.r, vault)) body.y += dy / steps;
  }
}
function clearSight(a, b) {
  const steps = Math.ceil(dist(a, b) / 25);
  for (let i = 1; i < steps; i++) {
    const x = a.x + (b.x - a.x) * i / steps, y = a.y + (b.y - a.y) * i / steps;
    if (buildings.some(rect => x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h)) return false;
  }
  return true;
}
function sound(freq, duration, type = 'sine', volume = .04, endFreq = freq) {
  if (!soundOn || !audio) return;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(freq, audio.currentTime); oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), audio.currentTime + duration);
  gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
}
function toast(message, duration = 3) { $('toast').textContent = message; $('toast').classList.remove('hidden'); toastTime = duration; }
function burst(x, y, color, amount = 10) {
  for (let i = 0; i < amount; i++) { const a = random() * Math.PI * 2, v = 30 + random() * 100; particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .3 + random() * .4, max: .7, color, size: 1 + random() * 3 }); }
}
function attack(autoAim = false) {
  if (state !== 'playing' || player.attackCooldown > 0 || player.vault > 0) return;
  if (player.stamina < 12) { toast('Out of stamina. Catch your breath.', 1.4); return; }
  if (autoAim || !mouse.active) {
    const near = enemies.filter(e => !e.dead && dist(e, player) < 100 && clearSight(player, e)).sort((a,b) => dist(a,player) - dist(b,player))[0];
    if (near) player.angle = Math.atan2(near.y - player.y, near.x - player.x);
  }
  player.stamina -= 12; player.attack = .22; player.attackCooldown = .4;
  sound(190, .16, 'triangle', .035, 48);
  let hit = false;
  for (const e of enemies) {
    if (e.dead || dist(e, player) > 83 || !clearSight(player, e)) continue;
    const angle = Math.atan2(e.y - player.y, e.x - player.x);
    const delta = Math.atan2(Math.sin(angle - player.angle), Math.cos(angle - player.angle));
    if (Math.abs(delta) > 1.25) continue;
    e.hp--; e.stun = .35; e.flash = .16; hit = true;
    move(e, Math.cos(angle) * 24, Math.sin(angle) * 24);
    burst(e.x, e.y, '#a5a05f', 8);
    if (e.hp <= 0) { e.dead = true; kills++; burst(e.x, e.y, '#716b45', 12); }
  }
  if (hit) { shake = 3; sound(78, .12, 'sawtooth', .04, 26); }
  updateHud();
}
function vault() {
  if (state !== 'playing' || player.vaultCooldown > 0) return;
  if (player.stamina < 24) { toast('You need 24 stamina to vault.', 1.5); return; }
  player.stamina -= 24; player.vault = .3; player.vaultCooldown = .85;
  let x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  let y = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
  if (!x && !y) { x = Math.cos(player.angle); y = Math.sin(player.angle); }
  const length = Math.hypot(x, y); player.vaultX = x / length; player.vaultY = y / length;
  sound(170, .2, 'triangle', .025, 330);
}
function interact() {
  if (state !== 'playing') return;
  const cache = supplies.find(s => !s.taken && dist(s, player) < 70);
  if (cache) {
    cache.taken = true; collected++; player.medkits++;
    burst(cache.x, cache.y, '#dbf3a1', 18); sound(480, .25, 'sine', .055, 960);
    toast(`${cache.name} secured · +1 medkit${collected === 3 ? ' · Head to the safehouse!' : ''}`, 4);
    updateHud();
  } else if (dist(player, exit) < 85) {
    if (collected === 3) finish(true);
    else toast(`Find ${3 - collected} more supply ${collected === 2 ? 'cache' : 'caches'} before extraction.`, 2.5);
  }
}
function heal() {
  if (state !== 'playing') return;
  if (!player.medkits) { toast('No medkits left. Search a supply cache.', 2); return; }
  if (player.hp >= 100) { toast('Health is already full.', 1.5); return; }
  player.medkits--; player.hp = Math.min(100, player.hp + 45);
  sound(500, .3, 'sine', .04, 750); burst(player.x, player.y, '#b6e7a2', 14); toast('+45 health · Wounds patched.', 2); updateHud();
}
function begin() {
  reset(); state = 'playing'; $('start-screen').classList.add('hidden'); $('end-screen').classList.add('hidden'); $('pause-screen').classList.add('hidden'); canvas.focus();
  if (audio) audio.resume().catch(() => {});
  toast('Find the three green supply markers. E to search.', 5);
}
function pause() { if (state !== 'playing') return; state = 'paused'; keys.clear(); $('pause-screen').classList.remove('hidden'); }
function resume() { if (state !== 'paused') return; state = 'playing'; $('pause-screen').classList.add('hidden'); canvas.focus(); }
function finish(won) {
  state = won ? 'won' : 'lost'; keys.clear(); $('interaction').classList.add('hidden');
  $('result-kicker').textContent = won ? 'EXTRACTION COMPLETE' : 'SIGNAL LOST';
  $('result-title').innerHTML = won ? 'ONE MORE<br><span>SUNRISE.</span>' : 'THE CITY<br><span>CLAIMED YOU.</span>';
  $('result-description').textContent = won ? 'Supplies secured. The safehouse doors are open. You lived to see another day.' : 'Keep your distance, watch your stamina, and use Q to heal. There’s always another run.';
  $('result-stats').textContent = `${formatTime(elapsed)} SURVIVED   /   ${kills} INFECTED DOWN   /   ${collected}/3 CACHES`;
  $('end-screen').classList.remove('hidden'); sound(won ? 420 : 130, .7, 'triangle', .06, won ? 840 : 35);
  $('restart-button').focus();
}
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`; }
function updateHud() {
  $('health-number').textContent = Math.ceil(player.hp); $('health-bar').style.width = `${player.hp}%`;
  $('stamina-number').textContent = `${Math.ceil(player.stamina)}%`; $('stamina-bar').style.width = `${player.stamina}%`;
  $('health-bar').style.background = player.hp < 30 ? '#d97761' : '#d6e9a2';
  $('medkit-count').textContent = player.medkits; $('kill-count').textContent = String(kills).padStart(2,'0'); $('supply-count').textContent = `${collected} / 3`;
  const gameMinutes = Math.floor(elapsed * 1.78) + 18 * 60 + 40;
  $('clock-time').textContent = `${String(Math.floor(gameMinutes / 60) % 24).padStart(2,'0')}:${String(gameMinutes % 60).padStart(2,'0')}`;
  $('clock-caption').textContent = elapsed < NIGHT_AT ? `NIGHT IN ${formatTime(NIGHT_AT - elapsed)}` : 'THE INFECTED ARE HUNTING';
  $('phase-label').textContent = elapsed < NIGHT_AT ? 'DUSK APPROACHING ↗' : 'NIGHTFALL · HIGH THREAT';
  $('time-icon').textContent = elapsed < NIGHT_AT ? '◒' : '☾';
  $('objective-title').textContent = collected === 3 ? 'Reach the safehouse' : 'Find emergency supplies';
  $('objective-description').textContent = collected === 3 ? 'Follow the home marker. E to extract.' : 'Search the marked supply caches.';
}

function update(dt) {
  elapsed += dt;
  if (elapsed >= NIGHT_AT && elapsed - dt < NIGHT_AT) { toast('NIGHTFALL · The infected are faster. Keep moving.', 5); sound(100,.8,'sawtooth',.035,50); }
  player.attack = Math.max(0, player.attack - dt); player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt); player.vaultCooldown = Math.max(0, player.vaultCooldown - dt);
  let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  let dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
  const len = Math.hypot(dx, dy); player.moving = len > 0;
  if (len) { dx /= len; dy /= len; if (!mouse.active) player.angle = Math.atan2(dy, dx); }
  if (mouse.active && player.attack <= 0) { const aim = worldPoint(mouse.x, mouse.y); player.angle = Math.atan2(aim.y - player.y, aim.x - player.x); }
  player.sprinting = keys.has('shift') && len > 0 && player.stamina > 2 && player.vault <= 0;
  const old = { x: player.x, y: player.y };
  if (player.vault > 0) {
    player.vault = Math.max(0, player.vault - dt); move(player, player.vaultX * 590 * dt, player.vaultY * 590 * dt, true);
    // End a vault outside low geometry rather than leave the player inside a car or barrier.
    if (!blocked(player.x, player.y, player.r)) player.safeLanding = { x: player.x, y: player.y };
    if (player.vault === 0 && blocked(player.x, player.y, player.r) && player.safeLanding) Object.assign(player, player.safeLanding);
  } else {
    player.safeLanding = { x: player.x, y: player.y };
    const speed = player.sprinting ? 238 : 147;
    move(player, dx * speed * dt, dy * speed * dt);
  }
  player.travel += dist(old, player);
  if (player.sprinting) player.stamina = Math.max(0, player.stamina - 21 * dt);
  else if (player.attackCooldown === 0 && player.vault <= 0) player.stamina = Math.min(100, player.stamina + 21 * dt);
  if (player.moving) { footstep += dt; if (footstep > (player.sprinting ? .22 : .37)) { footstep = 0; sound(75 + random()*35,.055,'triangle',.012,45); } }
  if (keys.has('f')) attack(true);
  for (const e of enemies) {
    if (e.dead) continue;
    e.cooldown = Math.max(0, e.cooldown - dt); e.flash = Math.max(0, e.flash - dt); e.stun = Math.max(0, e.stun - dt);
    if (e.stun) continue;
    const distance = dist(e, player), range = elapsed >= NIGHT_AT ? 640 : player.sprinting ? 530 : 330;
    e.alerted = distance < range && clearSight(e, player);
    if (e.alerted) e.angle = Math.atan2(player.y - e.y, player.x - e.x);
    else { e.wander -= dt; if (e.wander < 0) { e.angle += (random()-.5)*2; e.wander = 1.5 + random()*3; } }
    const speed = e.alerted ? e.speed * (elapsed >= NIGHT_AT ? 2.15 : 1) : 12;
    if (distance > 23 || !e.alerted) move(e, Math.cos(e.angle)*speed*dt, Math.sin(e.angle)*speed*dt);
    if (distance < 32 && e.cooldown === 0 && player.invulnerable === 0 && player.vault <= 0) {
      player.hp = Math.max(0, player.hp - (elapsed >= NIGHT_AT ? 13 : 10)); player.invulnerable = .75; e.cooldown = 1.2;
      shake = 7; burst(player.x,player.y,'#b57450',8); sound(70,.18,'sawtooth',.05,30);
      if (player.hp === 0) { updateHud(); finish(false); return; }
    }
    // Gentle separation keeps a crowd legible and prevents a single stacked enemy blob.
    for (const other of enemies) {
      if (e === other || other.dead) continue;
      const d = dist(e, other);
      if (d > 0 && d < 23) move(e, (e.x-other.x)/d*16*dt, (e.y-other.y)/d*16*dt);
    }
  }
  spawnTimer += dt;
  if (spawnTimer > (elapsed >= NIGHT_AT ? 6 : 15) && enemies.filter(e=>!e.dead).length < 28) {
    spawnTimer = 0;
    for (let tries = 0; tries < 10; tries++) {
      const a = random()*6.28, x = player.x + Math.cos(a)*660, y = player.y+Math.sin(a)*660;
      if (!blocked(x,y,15)) { addEnemy(x,y); break; }
    }
  }
  for (const p of particles) { p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vx *= .96; p.vy *= .96; }
  particles = particles.filter(p=>p.life>0);
  shake = Math.max(0, shake - dt*22);
  if (toastTime > 0) { toastTime -= dt; if (toastTime <= 0) $('toast').classList.add('hidden'); }
  const cache = supplies.find(s=>!s.taken && dist(s,player)<70);
  const atExit = dist(player,exit)<85;
  $('interaction').classList.toggle('hidden', !cache && !atExit);
  $('interaction').lastElementChild.textContent = cache ? 'SEARCH SUPPLY CACHE' : collected===3 ? 'ENTER SAFEHOUSE' : 'SAFEHOUSE · SUPPLIES REQUIRED';
  camera.x += (player.x-camera.x)*Math.min(1,dt*7); camera.y += (player.y-camera.y)*Math.min(1,dt*7);
  updateHud();
}

function rect(x,y,w,h,color) { ctx.fillStyle=color; ctx.fillRect(x,y,w,h); }
function line(x1,y1,x2,y2,color,width=1) { ctx.strokeStyle=color; ctx.lineWidth=width; ctx.beginPath(); ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke(); }
function ellipse(x,y,rx,ry,color) { ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill(); }
function text(value,x,y,size,color,align='left') { ctx.font=`${size}px ui-monospace,monospace`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y); }
function glow(x,y,r,color) { const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2); }
function drawBuilding(b) {
  rect(b.x+17,b.y+22,b.w+10,b.h+10,'#070d0bc0');
  rect(b.x,b.y+9,b.w,b.h+9,'#151e1a');
  rect(b.x+b.w,b.y+6,8,b.h+12,'#101a15');
  const colors=['#3b4639','#40483c','#414c40','#344537'];
  rect(b.x,b.y,b.w,b.h,colors[b.type]);
  rect(b.x+5,b.y+5,b.w-10,b.h-10,'#29362d');
  rect(b.x+10,b.y+10,b.w-20,b.h-20,b.type===0?'#354034':'#303d32');
  // Roof seams and metal edging.
  for(let y=b.y+24;y<b.y+b.h-15;y+=29) line(b.x+10,y,b.x+b.w-10,y,'#76826713');
  line(b.x+3,b.y+1,b.x+b.w-2,b.y+1,'#88907555',2);
  line(b.x+1,b.y,b.x+1,b.y+b.h,'#7c87634a',2);
  for(let x=b.x+25;x<b.x+b.w-20;x+=46) {
    rect(x,b.y+b.h+4,22,5,'#080f0d');
    if ((Math.floor(x/46)+b.type)%3===0) rect(x+2,b.y+b.h+4,17,3,'#b0a16755');
  }
  const roofX=b.x+b.w*.58, roofY=b.y+b.h*.35;
  rect(roofX+4,roofY+5,46,32,'#17231b');rect(roofX,roofY,46,30,'#505b48');
  for(let i=0;i<5;i++) line(roofX+5,roofY+5+i*4,roofX+40,roofY+5+i*4,'#252f27',2);
  if(b.type===1) {
    rect(b.x+25,b.y+35,66,70,'#1f2d23');rect(b.x+27,b.y+33,62,68,'#3b4938');
    ellipse(b.x+58,b.y+65,22,22,'#27352a');ellipse(b.x+58,b.y+65,16,16,'#455340');
    line(b.x+43,b.y+65,b.x+73,b.y+65,'#243124',2);line(b.x+58,b.y+50,b.x+58,b.y+80,'#243124',2);
  } else if (b.type===0) {
    for(let i=0;i<3;i++) {rect(b.x+25,b.y+30+i*45,70,26,'#57604a');rect(b.x+28,b.y+32+i*45,64,21,'#727a5e33');}
  } else if(b.type===2) {
    rect(b.x+28,b.y+35,52,10,'#75806477');rect(b.x+49,b.y+14,10,52,'#75806477');
  }
  text(b.label,b.x+b.w/2,b.y+b.h-29,9,'#a6b19455','center');
  rect(b.x+b.w/2-17,b.y+b.h+4,34,14,'#111c15');
  if(b.type===3) { rect(b.x+b.w/2-17,b.y+b.h+3,34,5,'#bcdf82'); glow(b.x+b.w/2,b.y+b.h+15,100,'#b9db5d24'); }
}
function drawCar(c) {
  ctx.save();ctx.translate(c.x+c.w/2,c.y+c.h/2);ctx.rotate(c.a);
  const vertical=c.h>c.w; if(!vertical) ctx.rotate(Math.PI/2);
  const w=vertical?c.w:c.h,h=vertical?c.h:c.w;
  rect(-w/2+5,-h/2+7,w,h,'#080e0ab0');
  rect(-w/2-3,-h/2+12,5,14,'#0a100d');rect(w/2-2,-h/2+12,5,14,'#0a100d');
  rect(-w/2-3,h/2-24,5,14,'#0a100d');rect(w/2-2,h/2-24,5,14,'#0a100d');
  rect(-w/2,-h/2,w,h,c.color);rect(-w/2+4,-h/2+18,w-8,13,'#152821');
  rect(-w/2+4,h/2-22,w-8,9,'#182a22');rect(-w/2+5,-h/2+34,w-10,17,'#485440');
  line(-w/2+4,-h/2+5,w/2-4,-h/2+5,'#a4aa7a65',2);
  rect(-w/2+3,-h/2+1,7,3,'#d2cd8d');rect(w/2-10,-h/2+1,7,3,'#d2cd8d');
  rect(-w/2+3,h/2-4,6,3,'#865b43');rect(w/2-9,h/2-4,6,3,'#865b43');ctx.restore();
}
function drawPerson(body, isPlayer, time) {
  if(body.dead) {
    ctx.save();ctx.translate(body.x,body.y);ctx.rotate(body.angle);ellipse(0,0,19,10,'#1c251c');
    rect(-10,-7,19,13,'#444333');ellipse(12,0,6,6,'#737656');line(-8,-5,-23,-12,'#535542',5);line(-8,4,-24,11,'#535542',5);ctx.restore();return;
  }
  const jump=isPlayer&&body.vault>0?Math.sin(body.vault/.3*Math.PI)*15:0;
  ellipse(body.x+3,body.y+8,16-jump*.15,9-jump*.1,'#040c0990');
  ctx.save();ctx.translate(body.x,body.y-jump);ctx.rotate(body.angle);
  const walk=isPlayer?(body.moving?Math.sin(body.travel*.12)*5:0):Math.sin(time*(body.alerted?9:4)+body.x)*3;
  line(-6,-6,-12+walk,-7,isPlayer?'#394936':'#3b4533',6);line(-6,6,-12-walk,7,isPlayer?'#394936':'#3b4533',6);
  const coat=isPlayer?'#a9b383':body.flash>0?'#d4ca92':'#687054';
  ellipse(-1,0,11,12,coat);ellipse(-2,-7,6,6,isPlayer?'#858f65':'#5a6349');ellipse(-2,7,6,6,isPlayer?'#858f65':'#5a6349');
  if(isPlayer) {
    rect(-10,-7,7,14,'#47523b');line(-8,-7,2,5,'#c3bf8c',2);
    const swing=body.attack>0?(1-body.attack/.22)*2.8-1.4:.4;
    ctx.save();ctx.translate(5,8);ctx.rotate(swing);line(0,0,13,3,'#9aab7b',6);line(12,3,37,6,'#333c34',5);line(12,2,37,5,'#bdc5b4',3);ctx.restore();
    line(4,-8,12,-9,'#adb987',5);
  } else { line(3,-9,15,-13,'#747d58',5);line(3,9,16,12,'#747d58',5); }
  ellipse(4,0,7,7,isPlayer?'#c5bd92':'#93946a');ellipse(1,0,6,6,isPlayer?'#555c42':'#757b53');
  if(!isPlayer&&body.alerted){ellipse(9,-3,1.2,1.2,elapsed>=NIGHT_AT?'#e9ad69':'#b4b57c');}
  if(isPlayer&&body.attack>0) {
    ctx.beginPath();ctx.arc(0,0,64,-1.3+(1-body.attack/.22)*1.7,.4+(1-body.attack/.22)*1.7);
    ctx.strokeStyle=`rgba(224,235,172,${body.attack/.22*.7})`;ctx.lineWidth=4;ctx.stroke();
  }
  ctx.restore();
  if(isPlayer) {ctx.strokeStyle=body.invulnerable>0?'#e3aa76aa':'#d5ee9b77';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(body.x,body.y,21,0,Math.PI*2);ctx.stroke();}
}
function drawMarker(x,y,label,taken,time,isExit=false) {
  if(taken) {ellipse(x,y,18,18,'#18251a');text('✓',x,y+4,14,'#7a9460','center');return;}
  const available=!isExit||collected===3;
  const color=available?'#d4ee8c':'#81977a';
  glow(x,y,65,available?'#bde97820':'#92ac6a12');
  ctx.strokeStyle=available?'#c7e88655':'#80967944';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,31+Math.sin(time*2)*3,0,Math.PI*2);ctx.stroke();
  if(isExit) {
    ctx.beginPath();ctx.moveTo(x-17,y+4);ctx.lineTo(x,y-10);ctx.lineTo(x+17,y+4);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
    ctx.strokeRect(x-11,y+3,22,18);rect(x-3,y+12,6,9,color);
  } else {
    rect(x-16,y-11,32,25,'#253525');rect(x-14,y-13,28,23,'#809263');rect(x-10,y-9,20,15,'#495f3d');
    rect(x-2,y-8,4,14,'#d1e69b');rect(x-7,y-3,14,4,'#d1e69b');
  }
  const bob=Math.sin(time*2.5)*3;
  ctx.beginPath();ctx.moveTo(x,y-35+bob);ctx.lineTo(x-5,y-42+bob);ctx.lineTo(x+5,y-42+bob);ctx.closePath();ctx.fillStyle=color;ctx.fill();
  text(label,x,y+51,8,color,'center');
}
function drawMinimap() {
  if(width<700) return;
  const mw=142,mh=107,mx=width-mw-25,my=height-mh-86;
  rect(mx-6,my-21,mw+12,mh+27,'#0b140de8');text('DISTRICT MAP',mx,my-8,7,'#9eae8b');
  const sx=mw/WORLD.w,sy=mh/WORLD.h;
  rect(mx,my,mw,mh,'#243024');buildings.forEach(b=>rect(mx+b.x*sx,my+b.y*sy,b.w*sx,b.h*sy,'#4e5d42'));
  supplies.filter(s=>!s.taken).forEach(s=>rect(mx+s.x*sx-2,my+s.y*sy-2,4,4,'#d4ee8c'));
  rect(mx+exit.x*sx-3,my+exit.y*sy-3,6,6,collected===3?'#e7f5ae':'#7fae97');
  for(const e of enemies) if(!e.dead&&dist(e,player)<450) ellipse(mx+e.x*sx,my+e.y*sy,1.3,1.3,'#c88f68');
  ellipse(mx+player.x*sx,my+player.y*sy,2.7,2.7,'#ffffff');
  ctx.strokeStyle='#a6ba7655';ctx.lineWidth=1;ctx.strokeRect(mx+(camera.x-width/camera.zoom/2)*sx,my+(camera.y-height/camera.zoom/2)*sy,width/camera.zoom*sx,height/camera.zoom*sy);
}
function draw(time) {
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  ctx.save();ctx.translate(width/2+(shake?(random()-.5)*shake:0),height/2+(shake?(random()-.5)*shake:0));ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
  rect(0,0,WORLD.w,WORLD.h,'#28362b');
  // Asphalt blocks and irregular patches retain a hand-drawn, abandoned-city feel.
  for(const x of [445,900,1420,1915]) {rect(x,0,120,WORLD.h,'#303b32');rect(x+8,0,104,WORLD.h,'#2c3730');for(let y=20;y<WORLD.h;y+=65)rect(x+58,y,3,25,'#a0a17a22');}
  for(const y of [430,960,1550]) {rect(0,y,WORLD.w,130,'#303b32');rect(0,y+8,WORLD.w,114,'#2b3730');for(let x=10;x<WORLD.w;x+=65)rect(x,y+63,25,3,'#b0aa7b22');}
  for (const s of scenery) {
    line(s.x,s.y,s.x+Math.cos(s.angle)*s.size*3,s.y+Math.sin(s.angle)*s.size,'#a9af8320',s.size*.45);
  }
  // Crossing stripes, road paint, weeds, and little pools of standing water.
  for(const [x,y] of [[470,570],[930,855],[1460,1160],[1955,570]])for(let i=0;i<6;i++)rect(x+i*11,y,6,29,'#c0b98c20');
  for(const [x,y] of [[820,990],[1390,1090],[520,490],[1910,890]]){ellipse(x,y,42,13,'#35494177');line(x-25,y-3,x+15,y-3,'#81927a22');}
  text('H A R R I S O N   D I S T R I C T',1150,1106,15,'#abb28a25','center');
  text('KEEP MOVING',1505,520,11,'#a4a87544','center');
  buildings.forEach(drawBuilding);
  barriers.forEach(b=>{
    rect(b.x+4,b.y+6,b.w,b.h,'#0b160faa');rect(b.x,b.y,b.w,b.h,'#757858');
    ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h);ctx.clip();for(let x=b.x-20;x<b.x+b.w+20;x+=22)line(x,b.y,x+20,b.y+b.h,'#303b2b',9);ctx.restore();
    line(b.x,b.y,b.x+b.w,b.y,'#b2ad7b77',2);
  });
  cars.forEach(drawCar);
  for(const t of trees){rect(t.x-3,t.y,7,23,'#3e4933');ellipse(t.x+7,t.y+15,32,24,'#14231a77');ellipse(t.x,t.y-10,28,25,'#304a2b');ellipse(t.x-9,t.y-17,19,16,'#3b5430');ellipse(t.x+11,t.y-9,18,17,'#344b2d');}
  supplies.forEach((s,i)=>drawMarker(s.x,s.y,`CACHE 0${i+1}`,s.taken,time));drawMarker(exit.x,exit.y,collected===3?'SAFEHOUSE · EXTRACT':'SAFEHOUSE',false,time,true);
  const characters=[...enemies,player].sort((a,b)=>a.y-b.y);
  characters.forEach(body=>drawPerson(body,body===player,time));
  for(const p of particles){ctx.globalAlpha=p.life/p.max;rect(p.x,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
  for(const lamp of lamps){
    glow(lamp.x+12,lamp.y+14,105,'#c6c17d12');line(lamp.x,lamp.y+17,lamp.x,lamp.y-18,'#1a281c',4);line(lamp.x,lamp.y-18,lamp.x+17,lamp.y-18,'#5d6a49',3);ellipse(lamp.x+17,lamp.y-17,4,2,'#e2ddae');
  }
  // Night is a color grade, then local lights and a directional flashlight restore detail.
  const darkness=clamp((elapsed-28)/30,0,.58);
  if(darkness>0){
    const viewW=width/camera.zoom,viewH=height/camera.zoom;
    rect(camera.x-viewW/2-20,camera.y-viewH/2-20,viewW+40,viewH+40,`rgba(3,12,18,${darkness})`);
    ctx.globalCompositeOperation='screen';glow(player.x,player.y,150,'#9cba6d19');
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);
    const beam=ctx.createRadialGradient(0,0,5,0,0,275);beam.addColorStop(0,'#c9d9a947');beam.addColorStop(.5,'#bfc89522');beam.addColorStop(1,'transparent');
    ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,275,-.48,.48);ctx.closePath();ctx.fill();ctx.restore();
    for(const lamp of lamps)glow(lamp.x+17,lamp.y-10,110,'#d5c57b23');
    glow(exit.x,exit.y,105,'#a5d47e32');ctx.globalCompositeOperation='source-over';
  }
  // Dust in the last light.
  for(let i=0;i<27;i++){const x=(i*173+time*7)%WORLD.w,y=(i*229+Math.sin(time*.3+i)*15)%WORLD.h;ellipse(x,y,1,1,'#c5d39c44');}
  ctx.restore();
  if(state==='playing'||state==='paused'){
    drawMinimap();
    const remaining=supplies.filter(s=>!s.taken), target=collected===3?exit:remaining.sort((a,b)=>dist(a,player)-dist(b,player))[0];
    if(target){
      const screenX=(target.x-camera.x)*camera.zoom+width/2,screenY=(target.y-camera.y)*camera.zoom+height/2;
      if(screenX<35||screenX>width-35||screenY<50||screenY>height-80){
        const a=Math.atan2(screenY-height/2,screenX-width/2), scale=Math.min((width/2-35)/Math.max(.001,Math.abs(Math.cos(a))),(height/2-75)/Math.max(.001,Math.abs(Math.sin(a))));
        const x=width/2+Math.cos(a)*scale,y=height/2+Math.sin(a)*scale;
        ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#d4ee8c';ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-5,-5);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.restore();
        text(`${Math.round(dist(player,target)/10)}m`,x,y+20,8,'#d4ee8c','center');
      }
    }
    if(player.invulnerable>0){ctx.strokeStyle=`rgba(192,100,64,${player.invulnerable*.8})`;ctx.lineWidth=16;ctx.strokeRect(0,0,width,height);}
  }
  // Fine scan grain without an image dependency.
  ctx.fillStyle='#030c070d';for(let y=0;y<height;y+=4)ctx.fillRect(0,y,width,1);
}
function frame(now) { const dt=Math.min((now-last)/1000,.04);last=now;if(state==='playing')update(dt);draw(now/1000);requestAnimationFrame(frame); }

$('start-button').addEventListener('click',begin);$('restart-button').addEventListener('click',begin);$('resume-button').addEventListener('click',resume);
$('sound').addEventListener('click',()=>{
  soundOn=!soundOn;
  if(soundOn){try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});sound(580,.1);}catch{soundOn=false;}}
  $('sound').innerHTML=`SOUND ${soundOn?'ON':'OFF'} <span>◖</span>`;$('sound').setAttribute('aria-label',`${soundOn?'Disable':'Enable'} sound`);
});
window.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key)&&state==='playing')event.preventDefault();
  if(key==='escape'){if(state==='playing')pause();else if(state==='paused')resume();return;}
  if(state!=='playing')return;
  keys.add(key);
  if(event.repeat)return;
  if(key===' ')vault();if(key==='e')interact();if(key==='q')heal();if(key==='f')attack(true);
});
window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
canvas.addEventListener('mousemove',event=>{const r=canvas.getBoundingClientRect();mouse.x=event.clientX-r.left;mouse.y=event.clientY-r.top;mouse.active=true;});
canvas.addEventListener('mouseleave',()=>{mouse.active=false;});
canvas.addEventListener('mousedown',event=>{if(event.button===0){canvas.focus();attack();}});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
reset();resize();requestAnimationFrame(frame);

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.querySelector('#game-canvas');
const shell = document.querySelector('#game-shell');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a9e3ed');
scene.fog = new THREE.Fog('#b9e8dc', 25, 68);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.13;

scene.add(new THREE.HemisphereLight(0xe4faff, 0x75915b, 2.25));
const sun = new THREE.DirectionalLight(0xfff1cc, 2.6);
sun.position.set(-18, 30, 12);
sun.castShadow = false;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xbde7ff, 0.55);
fill.position.set(12, 8, -20); scene.add(fill);

const BLOCKS = [
  { id: 'grass', name: 'Grass block', label: 'GRASS', color: '#78b956', top: '#88c85d', side: '#795b3b' },
  { id: 'dirt', name: 'Dirt', label: 'DIRT', color: '#946a45' },
  { id: 'stone', name: 'Stone', label: 'STONE', color: '#929b9b' },
  { id: 'wood', name: 'Oak wood', label: 'WOOD', color: '#a97b46', top: '#c69a5e' },
  { id: 'leaves', name: 'Leaves', label: 'LEAVES', color: '#579b56' },
  { id: 'sand', name: 'Sand', label: 'SAND', color: '#dfca83' },
];
const inventory = { grass: 12, dirt: 12, stone: 8, wood: 8, leaves: 8, sand: 8 };
let selected = 0;
const world = new Map();
const renderGroups = [];
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const tempObject = new THREE.Object3D();
const coordKey = (x,y,z) => `${x},${y},${z}`;
const terrainHeight = (x,z) => {
  const broad = Math.sin(x * .24) * 1.05 + Math.cos(z * .21) * .92 + Math.sin((x + z) * .15) * .62 + Math.cos((x - z) * .12) * .42;
  const rounded = Math.round(broad);
  return Math.max(-1, Math.min(5, rounded));
};
function hash(x, z) { let n = (x * 374761393 + z * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
function addBlock(x,y,z,type, replace=false) {
  const key = coordKey(x,y,z);
  if (!replace && world.has(key)) return false;
  world.set(key, { x,y,z,type }); return true;
}
function makeWorld() {
  for (let x = -20; x < 20; x++) for (let z = -20; z < 20; z++) {
    let h = terrainHeight(x,z);
    if (Math.abs(x) < 3 && Math.abs(z) < 3) h = 2;
    for (let y = -3; y <= h; y++) {
      let type = y === h ? 'grass' : y >= h - 2 ? 'dirt' : 'stone';
      if ((x*x + z*z > 250 && h <= -1) && y === h) type = 'sand';
      addBlock(x,y,z,type);
    }
  }
  // Little groves, spaced away from the spawn clearing.
  for (let x = -17; x <= 17; x++) for (let z = -17; z <= 17; z++) {
    if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;
    if (hash(x,z) < .986 || Math.abs(x) > 18 || Math.abs(z) > 18) continue;
    const h = Math.abs(x) > 15 || Math.abs(z) > 15 ? terrainHeight(x,z) : terrainHeight(x,z);
    const trunk = 3 + Math.floor(hash(z*9,x*7)*2);
    for (let y = 1; y <= trunk; y++) addBlock(x,h + y,z,'wood');
    const crownY = h + trunk;
    for (let dy = -1; dy <= 2; dy++) {
      const radius = dy === 2 ? 1 : dy === -1 ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) === radius && Math.abs(dz) === radius && hash(x+dx*3,z+dz*3+dy) < .42) continue;
        if (dx === 0 && dz === 0 && dy < 1) continue;
        addBlock(x+dx,crownY+dy,z+dz,'leaves');
      }
    }
  }
}
function makePixelTexture(base, seed, topGrass=false, sideGrass=false) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0,0,16,16);
  let value = seed * 973;
  for (let i=0;i<60;i++) {
    value = (value * 9301 + 49297) % 233280;
    const shade = value / 233280;
    const x = Math.floor(shade*16); value = (value*9301+49297)%233280;
    const y = Math.floor(value/233280*16);
    ctx.fillStyle = shade > .5 ? 'rgba(255,255,255,.12)' : 'rgba(35,44,31,.13)';
    ctx.fillRect(x,y,1+(i%4===0?1:0),1);
  }
  if (topGrass) {
    ctx.fillStyle = '#7aa957'; ctx.fillRect(0,0,16,16);
    for(let i=0;i<38;i++){const x=Math.floor(Math.random()*16),y=Math.floor(Math.random()*16);ctx.fillStyle=i%2?'#8cc461':'#6da451';ctx.fillRect(x,y,1,1);}
  }
  if (sideGrass) {
    ctx.fillStyle='#779f4c';ctx.fillRect(0,0,16,3);
    ctx.fillStyle='#88b75b';ctx.fillRect(0,3,16,1);
    for(let i=0;i<30;i++){const x=Math.floor(Math.random()*16),y=4+Math.floor(Math.random()*12);ctx.fillStyle=i%2?'rgba(255,255,255,.1)':'rgba(35,30,22,.12)';ctx.fillRect(x,y,1,1);}
  }
  const texture = new THREE.CanvasTexture(c); texture.magFilter=THREE.NearestFilter; texture.minFilter=THREE.NearestFilter; texture.colorSpace=THREE.SRGBColorSpace; return texture;
}
const mats = {};
function makeMaterials() {
  const byId = Object.fromEntries(BLOCKS.map((b,i)=>[b.id,b]));
  for (let i=0;i<BLOCKS.length;i++) {
    const b=BLOCKS[i];
    const sides = makePixelTexture(b.side || b.color, i+2, false, b.id==='grass');
    const top = makePixelTexture(b.top || b.color, i+9, b.id==='grass');
    const sideMat = new THREE.MeshLambertMaterial({map:sides});
    if (b.id==='grass') mats[b.id]=[sideMat,sideMat,new THREE.MeshLambertMaterial({map:top}),sideMat,sideMat,sideMat];
    else if (b.id==='wood') mats[b.id]=[sideMat,sideMat,new THREE.MeshLambertMaterial({map:top}),new THREE.MeshLambertMaterial({map:top}),sideMat,sideMat];
    else mats[b.id]=new THREE.MeshLambertMaterial({map:sides});
  }
}
function rebuildMeshes() {
  for(const old of renderGroups) scene.remove(old);
  renderGroups.length=0;
  for(const b of BLOCKS) {
    const blocks=[...world.values()].filter(v=>v.type===b.id);
    if(!blocks.length) continue;
    const mesh=new THREE.InstancedMesh(blockGeometry,mats[b.id],blocks.length);
    mesh.userData.coords=blocks;
    mesh.frustumCulled=false;
    for(let i=0;i<blocks.length;i++) {
      const p=blocks[i]; tempObject.position.set(p.x,p.y,p.z); tempObject.updateMatrix(); mesh.setMatrixAt(i,tempObject.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true; mesh.computeBoundingSphere(); scene.add(mesh); renderGroups.push(mesh);
  }
  document.querySelector('#blocks-count').textContent=`${world.size.toLocaleString()} blocks`;
}
makeWorld(); makeMaterials(); rebuildMeshes();

// Soft, distant pixel-clouds add a little depth without obscuring the horizon.
const cloudMat=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:.9});
for(let i=0;i<12;i++) {
  const cloud=new THREE.Group(); const cx=(hash(i,8)-.5)*75, cz=(hash(i+41,9)-.5)*75, cy=16+hash(i,3)*5;
  for(let j=0;j<4;j++){const puff=new THREE.Mesh(new THREE.BoxGeometry(2.15+hash(i,j)*.7,.7,1.65),cloudMat);puff.position.set(j*1.35-2,0,j%2*.25);cloud.add(puff);}
  for(let j=0;j<2;j++){const puff=new THREE.Mesh(new THREE.BoxGeometry(1.7,.65,1.35),cloudMat);puff.position.set(j*1.9-.9,.53,0);cloud.add(puff);}
  cloud.position.set(cx,cy,cz);scene.add(cloud);
}

const highlight=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012,1.012,1.012)),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.8}));
highlight.visible=false;scene.add(highlight);
const raycaster=new THREE.Raycaster();raycaster.far=6;
let targetHit=null;
let yaw=Math.PI*.20,pitch=-.12;
const player={x:0,z:0,foot:2.5,vy:0,onGround:true};
const eyeHeight=1.62;
function groundAt(x,z) {
  const bx=Math.round(x),bz=Math.round(z);
  for(let y=24;y>=-4;y--) if(world.has(coordKey(bx,y,bz))) return y+.5;
  return -3.5;
}
function updateCamera(){camera.position.set(player.x,player.foot+eyeHeight,player.z);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);}
updateCamera();
const keys=new Set();let playing=false, inventoryOpen=false, lastTime=performance.now(), soundOn=false, audioCtx=null, toastTimer;
function showToast(message){const t=document.querySelector('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1600);}
function startGame(){
  document.querySelector('#start-overlay').classList.add('hidden');
  if(!playing){playing=true;shell.classList.add('playing');showToast('Welcome to your little world ✦');}
  try{canvas.requestPointerLock?.();}catch(e){}
}
function unlock(){if(document.pointerLockElement===canvas)document.exitPointerLock();}
document.querySelector('#play-button').addEventListener('click',startGame);
document.querySelector('#start-button').addEventListener('click',startGame);
document.querySelector('#back-button').addEventListener('click',()=>document.querySelector('#start-overlay').classList.add('hidden'));
canvas.addEventListener('click',()=>{if(playing&&innerWidth>700&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.();});
document.addEventListener('pointerlockchange',()=>{if(playing&&document.pointerLockElement!==canvas&&innerWidth>700)showToast('Click the world to look around again');});
document.querySelector('#help-button').addEventListener('click',()=>document.querySelector('#help-modal').classList.remove('hidden'));
document.querySelector('#close-help').addEventListener('click',()=>document.querySelector('#help-modal').classList.add('hidden'));
document.querySelector('#help-modal').addEventListener('click',e=>{if(e.target.id==='help-modal')e.currentTarget.classList.add('hidden');});
document.querySelector('#map-button').addEventListener('click',()=>{player.x=0;player.z=0;player.foot=groundAt(0,0);yaw=Math.PI*.2;pitch=-.12;updateCamera();showToast('Back at the meadow');});
document.querySelector('#sound-toggle').addEventListener('click',()=>{soundOn=!soundOn;document.querySelector('.sound-icon').textContent=soundOn?'♫':'♪';showToast(soundOn?'Block sounds on':'Block sounds off');});
function sound(freq=220,duration=.08){if(!soundOn)return;try{audioCtx ||= new AudioContext();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(e){}}

function updateHotbar(){
  const bar=document.querySelector('#hotbar');bar.innerHTML='';
  BLOCKS.forEach((b,i)=>{const slot=document.createElement('button');slot.className='slot'+(i===selected?' selected':'');slot.title=`${b.name} · ${inventory[b.id]} available`;slot.innerHTML=`<span class="slot-key">${i+1}</span><span class="block-icon" style="background:linear-gradient(145deg,${b.top||b.color} 0 42%,${b.color} 43% 72%,${b.side||b.color} 73%);box-shadow:inset -4px -4px 0 rgba(0,0,0,.12),inset 2px 2px 0 rgba(255,255,255,.2)"></span><span class="count">${inventory[b.id]}</span>`;slot.addEventListener('click',()=>{selected=i;updateHotbar();});bar.appendChild(slot);});
}
updateHotbar();
function createInventory(){
  let panel=document.querySelector('#inventory-panel');if(panel){panel.remove();return;}
  panel=document.createElement('div');panel.id='inventory-panel';panel.className='inventory-panel';
  panel.innerHTML=`<h3>Your blocks <span style="color:#8eaa94;font-size:12px;font-weight:600">· pick one to equip</span></h3><div class="inventory-grid"></div><p class="inventory-note">Mine blocks from the world, then place them wherever you like.</p>`;
  const grid=panel.querySelector('.inventory-grid');BLOCKS.forEach((b,i)=>{const slot=document.createElement('button');slot.className='slot'+(selected===i?' selected':'');slot.innerHTML=`<span class="slot-key">${i+1}</span><span class="block-icon" style="background:linear-gradient(145deg,${b.top||b.color} 0 42%,${b.color} 43% 72%,${b.side||b.color} 73%);box-shadow:inset -4px -4px 0 rgba(0,0,0,.12)"></span><span class="count">${inventory[b.id]}</span>`;slot.addEventListener('click',()=>{selected=i;updateHotbar();panel.remove();inventoryOpen=false;});grid.appendChild(slot);});shell.appendChild(panel);inventoryOpen=true;
}
function toggleInventory(){if(!playing)return;inventoryOpen=!inventoryOpen;if(inventoryOpen)createInventory();else document.querySelector('#inventory-panel')?.remove();}
document.querySelector('#inventory-button').addEventListener('click',toggleInventory);

function castTarget(){raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const hits=raycaster.intersectObjects(renderGroups,false);targetHit=hits.length?hits[0]:null;if(targetHit){const b=targetHit.object.userData.coords[targetHit.instanceId];highlight.position.set(b.x,b.y,b.z);highlight.visible=true;document.querySelector('#target-label').textContent=BLOCKS.find(v=>v.id===b.type)?.name||'';}else{highlight.visible=false;document.querySelector('#target-label').textContent='';}}
function mine(){if(!playing||inventoryOpen)return;castTarget();if(!targetHit){showToast('Nothing in reach');return;}const block=targetHit.object.userData.coords[targetHit.instanceId];world.delete(coordKey(block.x,block.y,block.z));inventory[block.type]=(inventory[block.type]||0)+1;rebuildMeshes();updateHotbar();sound(160,.11);showToast(`+1 ${BLOCKS.find(b=>b.id===block.type).name.toLowerCase()}`);}
function place(){if(!playing||inventoryOpen)return;const type=BLOCKS[selected].id;if(inventory[type]<=0){showToast(`No ${BLOCKS[selected].name.toLowerCase()} left`);return;}castTarget();if(!targetHit){showToast('Aim at a block to build');return;}const b=targetHit.object.userData.coords[targetHit.instanceId];const n=targetHit.face.normal;const x=b.x+Math.round(n.x),y=b.y+Math.round(n.y),z=b.z+Math.round(n.z);if(Math.abs(x-player.x)<.8&&Math.abs(z-player.z)<.8&&y>=player.foot-.1&&y<=player.foot+2.2){showToast('Too close to place a block');return;}if(!addBlock(x,y,z,type)){showToast('That space is occupied');return;}inventory[type]--;rebuildMeshes();updateHotbar();sound(320,.07);showToast(`${BLOCKS[selected].name} placed`);}
canvas.addEventListener('mousedown',e=>{if(e.button===0)mine();if(e.button===2){e.preventDefault();place();}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code.startsWith('Digit')){const n=Number(e.code.slice(5))-1;if(n>=0&&n<BLOCKS.length){selected=n;updateHotbar();}}if(e.code==='KeyE')toggleInventory();if(e.code==='Escape'&&inventoryOpen)toggleInventory();if(e.code==='Space'&&player.onGround){player.vy=7.1;player.onGround=false;}});
document.addEventListener('keyup',e=>keys.delete(e.code));
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&playing){yaw-=e.movementX*.0022;pitch-=e.movementY*.0022;pitch=Math.max(-1.48,Math.min(1.48,pitch));}});

// Mobile look and movement controls.
let touchMove={forward:false,back:false,left:false,right:false};
document.querySelectorAll('[data-move]').forEach(btn=>{const dir=btn.dataset.move;const down=e=>{e.preventDefault();touchMove[dir]=true;btn.setPointerCapture?.(e.pointerId);};const up=e=>{e.preventDefault();touchMove[dir]=false;};btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('lostpointercapture',up);});
let lookTouch=null;
document.querySelector('#look-zone').addEventListener('pointerdown',e=>{lookTouch={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);});
document.querySelector('#look-zone').addEventListener('pointermove',e=>{if(!lookTouch||lookTouch.id!==e.pointerId)return;const dx=e.clientX-lookTouch.x,dy=e.clientY-lookTouch.y;lookTouch.x=e.clientX;lookTouch.y=e.clientY;yaw-=dx*.006;pitch=Math.max(-1.45,Math.min(1.45,pitch-dy*.006));});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])document.querySelector('#look-zone').addEventListener(ev,()=>lookTouch=null);
document.querySelector('#mobile-jump').addEventListener('pointerdown',e=>{e.preventDefault();if(player.onGround){player.vy=7.1;player.onGround=false;}});
document.querySelector('#mobile-mine').addEventListener('pointerdown',e=>{e.preventDefault();mine();});
document.querySelector('#mobile-place').addEventListener('pointerdown',e=>{e.preventDefault();place();});

function tick(now){requestAnimationFrame(tick);const dt=Math.min(.04,(now-lastTime)/1000);lastTime=now;
  if(playing&&!inventoryOpen){
    const fwd=(keys.has('KeyW')||keys.has('ArrowUp')||touchMove.forward?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||touchMove.back?1:0);
    const side=(keys.has('KeyD')||keys.has('ArrowRight')||touchMove.right?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||touchMove.left?1:0);
    const mag=Math.hypot(fwd,side)||1;const speed=5.1;
    const dx=(-Math.sin(yaw)*fwd+Math.cos(yaw)*side)/mag*speed*dt;
    const dz=(-Math.cos(yaw)*fwd-Math.sin(yaw)*side)/mag*speed*dt;
    const nx=Math.max(-19,Math.min(19,player.x+dx)),nz=Math.max(-19,Math.min(19,player.z+dz));
    const gx=groundAt(nx,player.z),gz=groundAt(player.x,nz);
    if(gx-player.foot<.62)player.x=nx;
    if(gz-player.foot<.62)player.z=nz;
    player.vy-=19*dt;player.foot+=player.vy*dt;
    const ground=groundAt(player.x,player.z);
    if(player.foot<=ground){player.foot=ground;player.vy=0;player.onGround=true;}else player.onGround=false;
    updateCamera();castTarget();
    document.querySelector('#coords').textContent=`${Math.round(player.x)}, ${Math.round(player.z)}`;
  }
  renderer.render(scene,camera);
}
requestAnimationFrame(tick);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));});

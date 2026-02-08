// La Reine des Abeilles - jeu pixel art ! Guide ton essaim vers la ruche.

// État du jeu
let flock = [];
let predators = [];
let obstacles = [];
let portal;
let playerPos;
let playerVel;

// Lucioles en fond (petits pixels qui flottent)
let fireflies = [];
const NB_FIREFLIES = 120;

// Trainée du curseur
let cursorTrail = [];
const MAX_TRAIL = 20;

// Score et progression
let score = 0;
let level = 1;
let gameOver = false;
let gameOverReason = '';
let gameWon = false;
let waitingToStart = true;
let showingInstructions = true;
let showingPredators = false;
let lastPredatorSpawn = 0;

// Config générale
const INITIAL_BOIDS = 30;
const MAX_LEVEL = 15;
const PREDATOR_SPAWN_INTERVAL = 30000;

// Config par niveau - chaque prédateur est introduit progressivement
const LEVEL_CONFIG = [
  null,
  { wasps: 2, lizards: 0, dragonflies: 0, spiders: 0, obstacles: 3  }, // 1
  { wasps: 3, lizards: 0, dragonflies: 0, spiders: 0, obstacles: 4  }, // 2
  { wasps: 4, lizards: 0, dragonflies: 0, spiders: 0, obstacles: 5  }, // 3
  { wasps: 5, lizards: 0, dragonflies: 0, spiders: 0, obstacles: 6  }, // 4
  { wasps: 4, lizards: 1, dragonflies: 0, spiders: 0, obstacles: 6  }, // 5  - lézards !
  { wasps: 4, lizards: 2, dragonflies: 0, spiders: 0, obstacles: 7  }, // 6
  { wasps: 5, lizards: 2, dragonflies: 0, spiders: 0, obstacles: 7  }, // 7
  { wasps: 4, lizards: 2, dragonflies: 1, spiders: 0, obstacles: 8  }, // 8  - libellules !
  { wasps: 4, lizards: 2, dragonflies: 2, spiders: 0, obstacles: 9  }, // 9
  { wasps: 4, lizards: 3, dragonflies: 2, spiders: 0, obstacles: 10 }, // 10
  { wasps: 5, lizards: 3, dragonflies: 3, spiders: 0, obstacles: 10 }, // 11
  { wasps: 4, lizards: 2, dragonflies: 3, spiders: 1, obstacles: 11 }, // 12 - araignées !
  { wasps: 4, lizards: 3, dragonflies: 3, spiders: 1, obstacles: 12 }, // 13
  { wasps: 5, lizards: 3, dragonflies: 3, spiders: 2, obstacles: 13 }, // 14
  { wasps: 5, lizards: 3, dragonflies: 4, spiders: 2, obstacles: 14 }, // 15
];

// Particules d'animation
let saveParticles = [];

// Sprites
let beeImg;
let predatorImages = {};

// Sons
let sfxReachHive;
let sfxBeeDeath;
let sfxLevelComplete;
let sfxGameOver;
let sfxWin;

// Musique
let musicMenu;
let musicGameplay;

function preload() {
  beeImg = loadImage('assets/bee.png');
  predatorImages.wasp = loadImage('assets/wasp.png');
  predatorImages.lizard = loadImage('assets/lizard.png');
  predatorImages.dragonfly = loadImage('assets/dragonfly.png');
  predatorImages.spider = loadImage('assets/spiders.png');

  sfxReachHive = loadSound('assets/reach-hive.wav');
  sfxBeeDeath = loadSound('assets/bee-death.wav');
  sfxLevelComplete = loadSound('assets/level-complete.wav');
  sfxGameOver = loadSound('assets/game-over.wav');
  sfxWin = loadSound('assets/win.wav');

  musicMenu = loadSound('assets/menu-music.mp3');
  musicGameplay = loadSound('assets/gameplay-music.mp3');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // Rendu pixel - pas de lissage, pas de retina
  noSmooth();
  pixelDensity(1);

  // Volume des sfx
  sfxReachHive.setVolume(0.3);
  sfxBeeDeath.setVolume(0.3);
  sfxLevelComplete.setVolume(0.4);
  sfxGameOver.setVolume(0.4);
  sfxWin.setVolume(0.5);

  // Volume de la musique
  musicMenu.setVolume(0.4);
  musicGameplay.setVolume(0.2);

  startLevel();
}

function spawnPredatorsOfType(type, count) {
  let current = predators.filter(p => p.type === type).length;
  while (current < count) {
    predators.push(new Predator(
      random([random(50), random(width - 50, width)]),
      random(50, height - 50),
      type
    ));
    current++;
  }
}

function startLevel() {
  playerPos = createVector(width / 2, height / 2);
  playerVel = createVector(0, 0);

  let boidsToAdd = INITIAL_BOIDS - flock.length;
  for (let i = 0; i < boidsToAdd; i++) {
    flock.push(new Boid(random(50, width - 50), random(50, height - 50)));
  }

  let cfg = LEVEL_CONFIG[min(level, MAX_LEVEL)];

  spawnPredatorsOfType('wasp', cfg.wasps);
  spawnPredatorsOfType('lizard', cfg.lizards);
  spawnPredatorsOfType('dragonfly', cfg.dragonflies);
  spawnPredatorsOfType('spider', cfg.spiders);

  obstacles = [];
  let minSize = 35 + level * 2;
  let maxSize = 55 + level * 5;
  for (let i = 0; i < cfg.obstacles; i++) {
    obstacles.push(new Obstacle(
      random(130, width - 130),
      random(130, height - 130),
      random(minSize, maxSize)
    ));
  }

  // Déplacer les abeilles qui se retrouvent dans un obstacle
  for (let b of flock) {
    let safe = false;
    let attempts = 0;
    while (!safe && attempts < 50) {
      safe = true;
      for (let o of obstacles) {
        if (b.pos.dist(o.pos) < o.r) {
          b.pos.set(width / 2 + random(-80, 80), height / 2 + random(-80, 80));
          safe = false;
          break;
        }
      }
      attempts++;
    }
  }

  portal = new Portal(random(150, width - 150), random(150, height - 150));
  portal.relocate(obstacles);

  if (fireflies.length === 0) {
    for (let i = 0; i < NB_FIREFLIES; i++) {
      fireflies.push({
        x: floor(random(width)),
        y: floor(random(height)),
        size: floor(random(2, 5)),
        speed: random(0.1, 0.4),
        driftX: random(-0.2, 0.2),
        brightness: random(80, 200),
        phase: random(TWO_PI)
      });
    }
  }

  lastPredatorSpawn = millis();
  gameOver = false;
}

// --- BOUCLE PRINCIPALE ---

function draw() {
  background(10, 26, 10);

  if (showingInstructions) { drawFireflies(); drawInstructions(); return; }
  if (showingPredators) { drawFireflies(); drawPredatorsScreen(); return; }
  if (gameWon) { drawFireflies(); drawVictoryScreen(); return; }
  if (gameOver) { drawFireflies(); drawGameOver(); return; }

  if (waitingToStart) {
    drawFireflies();
    for (let o of obstacles) o.show();
    portal.show();
    drawLevelScreen();
    return;
  }

  updatePlayer();
  drawFireflies();

  for (let o of obstacles) o.show();
  portal.show();

  for (let i = flock.length - 1; i >= 0; i--) {
    let b = flock[i];
    b.applyBehaviors(playerPos, predators, obstacles, flock);
    b.update();
    b.show();

    if (portal.contains(b)) {
      score++;
      portal.savedCount++;
      spawnSaveParticles(b.pos.x, b.pos.y);
      sfxReachHive.play();
      flock.splice(i, 1);
      continue;
    }

    for (let o of obstacles) {
      if (b.pos.dist(o.pos) < o.r * 0.6) {
        spawnDestroyParticles(b.pos.x, b.pos.y);
        sfxBeeDeath.play();
        flock.splice(i, 1);
        break;
      }
    }
  }

  for (let i = predators.length - 1; i >= 0; i--) {
    let p = predators[i];
    p.applyBehaviors(playerPos, flock, obstacles);
    p.edges();
    p.update();
    p.show();

    for (let j = flock.length - 1; j >= 0; j--) {
      if (p.pos.dist(flock[j].pos) < p.r * 0.6) {
        spawnDestroyParticles(flock[j].pos.x, flock[j].pos.y);
        sfxBeeDeath.play();
        flock.splice(j, 1);
      }
    }

    for (let o of obstacles) {
      if (p.pos.dist(o.pos) < o.r * 0.5) {
        spawnDestroyParticles(p.pos.x, p.pos.y);
        predators.splice(i, 1);
        break;
      }
    }
  }

  if (portal.shouldRelocate()) portal.relocate(obstacles);

  let cfg = LEVEL_CONFIG[min(level, MAX_LEVEL)];
  let totalMax = cfg.wasps + cfg.lizards + cfg.dragonflies + cfg.spiders;
  if (millis() - lastPredatorSpawn > PREDATOR_SPAWN_INTERVAL && predators.length < totalMax + 2) {
    let types = ['wasp'];
    if (cfg.lizards > 0) types.push('lizard');
    if (cfg.dragonflies > 0) types.push('dragonfly');
    if (cfg.spiders > 0) types.push('spider');
    predators.push(new Predator(
      random([random(50), random(width - 50, width)]),
      random(50, height - 50),
      random(types)
    ));
    lastPredatorSpawn = millis();
  }

  if (score >= level * 10 && flock.length > 0) {
    let newLevel = floor(score / 10) + 1;
    if (newLevel > level) {
      if (level >= MAX_LEVEL) {
        gameWon = true;
        sfxWin.play();
        if (musicGameplay.isPlaying()) musicGameplay.stop();
        if (!musicMenu.isPlaying()) musicMenu.loop();
      }
      else { level = newLevel; sfxLevelComplete.play(); startLevel(); waitingToStart = true; }
    }
  }

  // Vérifier si le niveau est encore gagnable
  let savedThisLevel = score - (level - 1) * 10;
  let beesNeeded = 10 - savedThisLevel;
  if (flock.length === 0) {
    gameOver = true;
    gameOverReason = 'Toutes tes ouvrières ont péri...';
    sfxGameOver.play();
    if (musicGameplay.isPlaying()) musicGameplay.stop();
    if (!musicMenu.isPlaying()) musicMenu.loop();
  } else if (flock.length < beesNeeded) {
    gameOver = true;
    gameOverReason = 'Trop d\'ouvrières ont péri pour finir ce niveau.';
    sfxGameOver.play();
    if (musicGameplay.isPlaying()) musicGameplay.stop();
    if (!musicMenu.isPlaying()) musicMenu.loop();
  }

  drawPlayerCursor();
  updateParticles();
  drawHUD();
}

// --- La Reine (joueur) ---

function updatePlayer() {
  let target = createVector(mouseX, mouseY);
  let desired = p5.Vector.sub(target, playerPos);
  let d = desired.mag();
  let speed = 5;
  if (d < 80) speed = map(d, 0, 80, 0, 5);
  if (d > 1) {
    desired.setMag(speed);
    let steer = p5.Vector.sub(desired, playerVel);
    steer.limit(0.35);
    playerVel.add(steer);
    playerVel.limit(5);
  } else {
    playerVel.mult(0.9);
  }
  playerPos.add(playerVel);

  cursorTrail.push({ x: floor(playerPos.x), y: floor(playerPos.y) });
  if (cursorTrail.length > MAX_TRAIL) cursorTrail.shift();
}

function drawPlayerCursor() {
  let t = millis() / 1000;

  // Trainée pixel dorée - petits carrés qui s'estompent
  push();
  noStroke();
  rectMode(CENTER);
  for (let i = 0; i < cursorTrail.length; i++) {
    let frac = i / cursorTrail.length;
    let alpha = 50 + frac * 180;
    let size = 2 + frac * 6;
    fill(255, 200, 50, alpha);
    rect(cursorTrail[i].x, cursorTrail[i].y, size, size);
  }
  pop();

  // Cercle de phéromones pixel - tirets dorés en pointillés
  let protectionRadius = 120;
  if (predators.length > 0) {
    protectionRadius = predators.reduce((m, p) => p.fleePlayerRadius < m ? p.fleePlayerRadius : m, Infinity);
  }
  let shieldR = protectionRadius + floor(sin(t * 2) * 4);
  push();
  noFill();
  stroke(255, 200, 50, 70);
  strokeWeight(2);
  // Cercle en pointillés pixel
  let segments = 32;
  for (let i = 0; i < segments; i++) {
    if (i % 2 === 0) {
      let a1 = (TWO_PI / segments) * i;
      let a2 = (TWO_PI / segments) * (i + 1);
      let x1 = floor(playerPos.x + cos(a1) * shieldR);
      let y1 = floor(playerPos.y + sin(a1) * shieldR);
      let x2 = floor(playerPos.x + cos(a2) * shieldR);
      let y2 = floor(playerPos.y + sin(a2) * shieldR);
      line(x1, y1, x2, y2);
    }
  }

  // Petits pixels dorés qui orbitent sur le cercle
  noStroke();
  rectMode(CENTER);
  for (let i = 0; i < 6; i++) {
    let angle = t * 0.8 + i * (TWO_PI / 6);
    let px = floor(playerPos.x + cos(angle) * shieldR);
    let py = floor(playerPos.y + sin(angle) * shieldR);
    let blink = floor(t * 4 + i) % 2 === 0;
    if (blink) {
      fill(255, 220, 80, 180);
      rect(px, py, 3, 3);
    }
  }
  pop();

  // Curseur de la reine - carré doré pixel avec halo simple
  let px = floor(playerPos.x);
  let py = floor(playerPos.y);
  push();
  noStroke();
  rectMode(CENTER);

  // Halo - un seul carré semi-transparent
  let pulse = floor(sin(t * 3) * 2);
  fill(255, 200, 50, 30);
  rect(px, py, 28 + pulse, 28 + pulse);
  fill(255, 200, 50, 50);
  rect(px, py, 18 + pulse, 18 + pulse);

  // Noyau pixel doré
  fill(255, 230, 100);
  rect(px, py, 8, 8);
  fill(255, 250, 200);
  rect(px, py, 4, 4);
  pop();
}

// --- Lucioles pixel (fond de jardin nocturne) ---

function drawFireflies() {
  push();
  noStroke();
  rectMode(CENTER);
  let t = millis() / 1000;
  for (let f of fireflies) {
    // Clignotement pixel - on/off
    let on = sin(t * 2 + f.phase) > 0;
    if (on) {
      fill(200, 230, 50, f.brightness);
      rect(floor(f.x), floor(f.y), f.size, f.size);
    }

    f.y += f.speed * 0.2;
    f.x += f.driftX * 0.3;

    if (f.y > height + 5) { f.y = -5; f.x = random(width); }
    if (f.x < -5) f.x = width + 5;
    if (f.x > width + 5) f.x = -5;
  }
  pop();
}

// --- Particules pixel (carrés qui s'estompent) ---

function spawnSaveParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    saveParticles.push({
      x: floor(x), y: floor(y),
      vx: floor(random(-3, 4)), vy: floor(random(-3, 4)),
      life: 1.0, size: floor(random(2, 6)), type: 'save'
    });
  }
}

function spawnDestroyParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    saveParticles.push({
      x: floor(x), y: floor(y),
      vx: floor(random(-2, 3)), vy: floor(random(-2, 3)),
      life: 1.0, size: floor(random(2, 5)), type: 'destroy'
    });
  }
}

function updateParticles() {
  push();
  noStroke();
  rectMode(CENTER);
  for (let i = saveParticles.length - 1; i >= 0; i--) {
    let p = saveParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;
    if (p.life <= 0) { saveParticles.splice(i, 1); continue; }
    let alpha = p.life * 255;
    if (p.type === 'save') {
      fill(255, 210, 50, alpha);
    } else {
      fill(255, 50, 0, alpha);
    }
    rect(floor(p.x), floor(p.y), p.size, p.size);
  }
  pop();
}

// --- Compte les prédateurs par type ---

function countPredatorTypes() {
  let counts = { wasp: 0, lizard: 0, dragonfly: 0, spider: 0 };
  for (let p of predators) counts[p.type]++;
  return counts;
}

// --- Interface (HUD) ---

function drawHUD() {
  push();
  fill(255, 240, 180);
  noStroke();
  textSize(16);
  textFont('monospace');
  text(`Score: ${score}`, 20, 30);
  text(`Niveau: ${level} / ${MAX_LEVEL}`, 20, 52);
  text(`Essaim: ${flock.length}`, 20, 74);

  let counts = countPredatorTypes();
  let y = 96;
  if (counts.wasp > 0)      { text(`Frelons: ${counts.wasp}`, 20, y); y += 22; }
  if (counts.lizard > 0)    { text(`Lézards: ${counts.lizard}`, 20, y); y += 22; }
  if (counts.dragonfly > 0) { text(`Libellules: ${counts.dragonfly}`, 20, y); y += 22; }
  if (counts.spider > 0)    { text(`Araignées: ${counts.spider}`, 20, y); y += 22; }

  textSize(12);
  fill(255, 240, 180, 100);
  text('[D] Debug  |  [R] Recommencer', 20, height - 20);
  pop();
}

// --- Écran d'instructions ---

function drawInstructions() {
  push();
  textAlign(CENTER, CENTER);
  noStroke();
  textFont('monospace');

  fill(5, 15, 5, 200);
  rect(0, 0, width, height);

  // Titre
  fill(255, 210, 50);
  textSize(48);
  text('LA REINE DES ABEILLES', width / 2, height / 2 - 180);

  // Sous-titre
  fill(220, 200, 140);
  textSize(16);
  text('Un jeu créé par Mohamed Wahib ABKARI', width / 2, height / 2 - 140);

  // Instructions
  fill(255, 240, 180);
  textSize(18);
  let y = height / 2 - 80;
  let lines = [
    'Tu es la Reine. Déplace la souris pour guider ton essaim.',
    '',
    'Tes ouvrières te suivent, mène-les vers la ruche dorée.',
    'Évite les toiles d\'araignée, elles piègent les abeilles.',
    'Les prédateurs chassent ton essaim, ta présence les repousse.',
    '',
    'Sauve 10 ouvrières par niveau pour progresser.',
    '15 niveaux, de nouveaux dangers apparaissent au fil du jeu.',
  ];
  for (let l of lines) {
    text(l, width / 2, y);
    y += 28;
  }

  // Contrôles
  fill(180, 170, 130);
  textSize(14);
  text('[D] Debug  |  [R] Recommencer le niveau', width / 2, y + 20);

  // Prompt
  let blink = floor(millis() / 500) % 2 === 0;
  if (blink) {
    fill(255, 220, 80);
    textSize(22);
    text('Appuyez sur [U] pour COMPRIS', width / 2, y + 70);
  }

  pop();
}

// --- Écran des prédateurs ---

function drawPredatorsScreen() {
  push();
  textAlign(CENTER, CENTER);
  noStroke();
  textFont('monospace');

  fill(5, 15, 5, 200);
  rect(0, 0, width, height);

  // Titre
  fill(255, 80, 60);
  textSize(40);
  text('LES DANGERS DU JARDIN', width / 2, height / 2 - 200);

  // 4 predators ordered by danger level
  let entries = [
    { img: predatorImages.wasp, name: 'Frelon', levels: 'Niveaux 1-15', desc: 'Rapide et agile. Chasse en groupe.', color: [255, 150, 50] },
    { img: predatorImages.lizard, name: 'Lézard', levels: 'Niveaux 5+', desc: 'Endurant. Grande zone de détection.', color: [80, 200, 80] },
    { img: predatorImages.dragonfly, name: 'Libellule', levels: 'Niveaux 8+', desc: 'Très rapide. Difficile à semer.', color: [80, 150, 255] },
    { img: predatorImages.spider, name: 'Araignée', levels: 'Niveaux 12+', desc: 'Lente mais mortelle. Force de capture énorme.', color: [180, 80, 220] },
  ];

  let startY = height / 2 - 120;
  let spacing = 75;
  let imgSize = 50;

  for (let i = 0; i < entries.length; i++) {
    let e = entries[i];
    let y = startY + i * spacing;

    // Image
    imageMode(CENTER);
    image(e.img, width / 2 - 200, y, imgSize, imgSize);

    // Nom
    fill(e.color[0], e.color[1], e.color[2]);
    textSize(20);
    textAlign(LEFT, CENTER);
    text(e.name, width / 2 - 160, y - 12);

    // Niveaux
    fill(180, 170, 130);
    textSize(13);
    text(e.levels, width / 2 - 160, y + 12);

    // Description
    fill(220, 210, 180);
    textSize(14);
    text(e.desc, width / 2 - 20, y);

    textAlign(CENTER, CENTER);
  }

  // Prompt
  let blink = floor(millis() / 500) % 2 === 0;
  if (blink) {
    fill(255, 220, 80);
    textSize(22);
    text('Appuyez sur [U] pour COMPRIS', width / 2, height / 2 + 200);
  }

  pop();
}

// --- Écran de niveau ---

function drawLevelScreen() {
  push();
  textAlign(CENTER, CENTER);
  noStroke();
  textFont('monospace');

  fill(5, 15, 5, 180);
  rect(0, 0, width, height);

  fill(255, 210, 50);
  textSize(56);
  text(`NIVEAU ${level}`, width / 2, height / 2 - 70);

  fill(220, 200, 150);
  textSize(16);
  if (level <= 4) {
    text('Phase 1 - Les frelons attaquent', width / 2, height / 2 - 30);
  } else if (level <= 7) {
    text('Phase 2 - Les lézards rejoignent la chasse', width / 2, height / 2 - 30);
  } else if (level <= 11) {
    text('Phase 3 - Les libellules entrent en jeu', width / 2, height / 2 - 30);
  } else {
    text('Phase 4 - Les araignées géantes arrivent', width / 2, height / 2 - 30);
  }

  let cfg = LEVEL_CONFIG[min(level, MAX_LEVEL)];
  let parts = [`Essaim: ${flock.length}`];
  if (cfg.wasps > 0) parts.push(`Frelons: ${cfg.wasps}`);
  if (cfg.lizards > 0) parts.push(`Lézards: ${cfg.lizards}`);
  if (cfg.dragonflies > 0) parts.push(`Libellules: ${cfg.dragonflies}`);
  if (cfg.spiders > 0) parts.push(`Araignées: ${cfg.spiders}`);
  parts.push(`Toiles: ${cfg.obstacles}`);

  fill(180, 170, 130);
  textSize(15);
  text(parts.join('  |  '), width / 2, height / 2 + 5);

  if (score > 0) {
    fill(255, 220, 60);
    textSize(18);
    text(`Score: ${score}`, width / 2, height / 2 + 40);
  }

  let blink = floor(millis() / 500) % 2 === 0;
  if (blink) {
    fill(255, 240, 180);
    textSize(22);
    text('Appuyez sur [S] pour COMMENCER', width / 2, height / 2 + 90);
  }

  pop();
}

// --- Fin de partie ---

function drawGameOver() {
  push();
  textAlign(CENTER, CENTER);
  noStroke();
  textFont('monospace');

  fill(5, 10, 5, 180);
  rect(0, 0, width, height);

  fill(255, 80, 60);
  textSize(48);
  text('GAME OVER', width / 2, height / 2 - 70);

  fill(255, 180, 120);
  textSize(18);
  text(gameOverReason, width / 2, height / 2 - 25);

  fill(255, 230, 150);
  textSize(28);
  text(`Ouvrières sauvées: ${score}`, width / 2, height / 2 + 15);

  fill(200, 180, 130);
  textSize(22);
  text(`Niveau atteint: ${level} / ${MAX_LEVEL}`, width / 2, height / 2 + 40);

  let blink = floor(millis() / 500) % 2 === 0;
  if (blink) {
    fill(255, 240, 180);
    textSize(18);
    text('Appuyez sur [R] pour recommencer', width / 2, height / 2 + 100);
  }

  pop();
}

// --- Écran de victoire ---

function drawVictoryScreen() {
  push();
  textAlign(CENTER, CENTER);
  noStroke();
  textFont('monospace');

  fill(5, 15, 5, 180);
  rect(0, 0, width, height);

  let blink = floor(millis() / 300) % 2 === 0;
  fill(blink ? color(255, 220, 50) : color(255, 180, 30));
  textSize(52);
  text('VICTOIRE !', width / 2, height / 2 - 80);

  fill(255, 240, 180);
  textSize(24);
  text('La colonie est sauvée !', width / 2, height / 2 - 30);

  fill(255, 230, 100);
  textSize(28);
  text(`Ouvrières sauvées: ${score}`, width / 2, height / 2 + 15);

  fill(200, 180, 130);
  textSize(20);
  text('15 niveaux complétés', width / 2, height / 2 + 55);

  let blink2 = floor(millis() / 500) % 2 === 0;
  if (blink2) {
    fill(255, 240, 180);
    textSize(18);
    text('Appuyez sur [R] pour rejouer', width / 2, height / 2 + 110);
  }

  pop();
}

// --- Entrées clavier ---

function keyPressed() {
  if (key === 'u' && showingInstructions) {
    showingInstructions = false;
    showingPredators = true;
  } else if (key === 'u' && showingPredators) {
    showingPredators = false;
    if (!musicMenu.isPlaying()) musicMenu.loop();
  } else if (key === 's' && waitingToStart && !showingInstructions && !showingPredators) {
    waitingToStart = false;
    lastPredatorSpawn = millis();
    if (musicMenu.isPlaying()) musicMenu.stop();
    if (!musicGameplay.isPlaying()) musicGameplay.loop();
  } else if (key === 'd') {
    Boid.debug = !Boid.debug;
  } else if (key === 'r') {
    flock = [];
    predators = [];
    obstacles = [];
    portal = null;
    score = (level - 1) * 10;
    cursorTrail = [];
    saveParticles = [];
    gameOver = false;
    gameOverReason = '';
    gameWon = false;
    waitingToStart = true;
    if (musicGameplay.isPlaying()) musicGameplay.stop();
    if (!musicMenu.isPlaying()) musicMenu.loop();
    startLevel();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

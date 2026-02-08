// Predator - prédateur générique (frelon, lézard, libellule, araignée)
// Chaque type a ses propres stats : vitesse, détection, peur de la reine, taille...
class Predator {

  // Config par type - chaque prédateur a son propre caractère
  static TYPES = {
    wasp: {
      maxSpeed: 4.5, maxForce: 0.25, r: 14,
      detectionRadius: 150, fleePlayerRadius: 120,
      glowColor: [200, 60, 0], trailColor: [80, 30, 0],
      imgSize: 3.5, pursueStrength: 4
    },
    lizard: {
      maxSpeed: 3.5, maxForce: 0.2, r: 24,
      detectionRadius: 200, fleePlayerRadius: 80,
      glowColor: [30, 160, 30], trailColor: [20, 80, 10],
      imgSize: 4, pursueStrength: 5
    },
    dragonfly: {
      maxSpeed: 5.5, maxForce: 0.3, r: 22,
      detectionRadius: 180, fleePlayerRadius: 140,
      glowColor: [30, 100, 200], trailColor: [20, 60, 120],
      imgSize: 4, pursueStrength: 3.5
    },
    spider: {
      maxSpeed: 2.5, maxForce: 0.15, r: 32,
      detectionRadius: 250, fleePlayerRadius: 60,
      glowColor: [80, 0, 100], trailColor: [40, 0, 50],
      imgSize: 4.5, pursueStrength: 6
    }
  };

  constructor(x, y, type = 'wasp') {
    this.type = type;
    let cfg = Predator.TYPES[type];

    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 2));
    this.acc = createVector();
    // Les frelons commencent lents et accélèrent avec les niveaux
    if (type === 'wasp') {
      let speedScale = map(min(level, 3), 1, 8, 0.5, 1, true);
      this.maxSpeed = cfg.maxSpeed * speedScale;
      this.maxForce = cfg.maxForce * speedScale;
    } else {
      this.maxSpeed = cfg.maxSpeed;
      this.maxForce = cfg.maxForce;
    }
    this.r = cfg.r;

    // Portée de détection des ouvrières
    this.detectionRadius = cfg.detectionRadius;
    // Rayon de fuite face à la reine
    this.fleePlayerRadius = cfg.fleePlayerRadius;
    // Force de poursuite
    this.pursueStrength = cfg.pursueStrength;

    // Couleurs du halo et de la trainée
    this.glowColor = cfg.glowColor;
    this.trailColor = cfg.trailColor;
    this.imgSize = cfg.imgSize;

    // Évitement des toiles
    this.largeurZoneEvitement = this.r * 2;
    this.avoidWeight = 5;

    // Paramètres du wander - patrouille dans le jardin
    this.distanceCercle = 100;
    this.wanderRadius = 50;
    this.wanderTheta = 0;
    this.displaceRange = 0.15;

    // Référence au sprite (sera définie via la globale predatorImages)
    this.img = predatorImages[type];
  }

  applyBehaviors(playerPos, boids, obstacles) {
    this.debugPursueTarget = null;
    this.debugWanderCenter = null;
    this.debugWanderTarget = null;

    // 1. On fuit la reine si elle est trop proche
    let dPlayer = this.pos.dist(playerPos);
    if (dPlayer < this.fleePlayerRadius) {
      let fleeForce = this.flee(playerPos);
      let urgency = map(dPlayer, 0, this.fleePlayerRadius, 6, 0);
      fleeForce.mult(urgency);
      this.applyForce(fleeForce);
    }

    // 2. On chasse l'ouvrière la plus proche (sauf si la reine nous fait fuir)
    if (dPlayer >= this.fleePlayerRadius) {
      let closest = this.getClosestBoid(boids);
      if (closest) {
        let dBoid = this.pos.dist(closest.pos);
        if (dBoid < this.detectionRadius) {
          let pursueForce = this.pursue(closest);
          pursueForce.mult(this.pursueStrength);
          this.applyForce(pursueForce);
        } else {
          let wanderForce = this.wander();
          this.applyForce(wanderForce);
        }
      } else {
        let wanderForce = this.wander();
        this.applyForce(wanderForce);
      }
    }

    // 3. On évite les toiles d'araignée
    let avoidForce = this.avoid(obstacles);
    avoidForce.mult(this.avoidWeight);
    this.applyForce(avoidForce);
  }

  // Poursuite : on vise la position future de la proie
  pursue(target) {
    let prediction = target.vel.copy().mult(10);
    let futurePos = p5.Vector.add(target.pos, prediction);
    this.debugPursueTarget = futurePos.copy();
    return this.seek(futurePos);
  }

  seek(target) {
    let desired = p5.Vector.sub(target, this.pos);
    desired.setMag(this.maxSpeed);
    let force = p5.Vector.sub(desired, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  flee(target) {
    return this.seek(target).mult(-1);
  }

  // Errance - patrouille naturelle dans le jardin
  wander() {
    let centreCercle = this.vel.copy();
    centreCercle.setMag(this.distanceCercle);
    centreCercle.add(this.pos);

    let angle = this.vel.heading() + this.wanderTheta;
    let pointSurCercle = createVector(
      this.wanderRadius * cos(angle),
      this.wanderRadius * sin(angle)
    );
    pointSurCercle.add(centreCercle);

    let force = p5.Vector.sub(pointSurCercle, this.pos);
    force.setMag(this.maxForce);

    this.debugWanderCenter = centreCercle.copy();
    this.debugWanderTarget = pointSurCercle.copy();

    this.wanderTheta += random(-this.displaceRange, this.displaceRange);
    return force;
  }

  // Évitement des toiles avec deux points d'anticipation
  avoid(obstacles) {
    let ahead = this.vel.copy().mult(25);
    let ahead2 = ahead.copy().mult(0.5);

    let pointAhead = this.pos.copy().add(ahead);
    let pointAhead2 = this.pos.copy().add(ahead2);

    let closest = null;
    let closestDist = Infinity;
    for (let o of obstacles) {
      let d = this.pos.dist(o.pos);
      if (d < closestDist) {
        closestDist = d;
        closest = o;
      }
    }

    if (!closest) return createVector(0, 0);

    let d1 = pointAhead.dist(closest.pos);
    let d2 = pointAhead2.dist(closest.pos);
    let d = min(d1, d2);

    if (d < closest.r + this.largeurZoneEvitement) {
      let force;
      if (d1 < d2) {
        force = p5.Vector.sub(pointAhead, closest.pos);
      } else {
        force = p5.Vector.sub(pointAhead2, closest.pos);
      }
      force.setMag(this.maxSpeed);
      force.sub(this.vel);
      force.limit(this.maxForce);
      return force;
    }

    return createVector(0, 0);
  }

  // Trouver l'ouvrière la plus proche
  getClosestBoid(boids) {
    let closest = null;
    let closestDist = Infinity;
    for (let b of boids) {
      let d = this.pos.dist(b.pos);
      if (d < closestDist) {
        closestDist = d;
        closest = b;
      }
    }
    return closest;
  }

  // Wrap autour des bords du jardin
  edges() {
    if (this.pos.x > width + this.r) this.pos.x = -this.r;
    else if (this.pos.x < -this.r) this.pos.x = width + this.r;
    if (this.pos.y > height + this.r) this.pos.y = -this.r;
    else if (this.pos.y < -this.r) this.pos.y = height + this.r;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  // --- Rendu visuel pixel : sprite selon le type ---

  show() {
    let speed = this.vel.mag();
    let [gr, gg, gb] = this.glowColor;
    let [tr, tg, tb] = this.trailColor;
    let px = floor(this.pos.x);
    let py = floor(this.pos.y);

    // Halo pixel - carré semi-transparent coloré selon le type
    if (speed > 0.3) {
      let glowAlpha = map(speed, 0, this.maxSpeed, 0, 50);
      let glowSize = floor(map(speed, 0, this.maxSpeed, 0, 30));
      push();
      noStroke();
      rectMode(CENTER);
      fill(gr, gg, gb, glowAlpha);
      rect(px, py, this.r * 2 + glowSize, this.r * 2 + glowSize);
      pop();
    }

    // Trainée pixel - petit carré derrière le prédateur
    if (speed > 1) {
      push();
      translate(px, py);
      rotate(this.vel.heading());
      noStroke();
      rectMode(CENTER);
      let trailAlpha = map(speed, 0, this.maxSpeed, 0, 100);
      fill(tr, tg, tb, trailAlpha * 0.4);
      rect(floor(-this.r * 1.8), 0, floor(this.r * 1.5), floor(this.r * 0.6));
      pop();
    }

    // Sprite - affiché sans rotation, position pixel-snappée
    push();
    imageMode(CENTER);
    let imgSize = this.r * this.imgSize;
    image(this.img, px, py, imgSize, imgSize);
    pop();

    // Mode debug
    if (Boid.debug) {
      push();
      noFill();
      rectMode(CENTER);

      // Rayon de détection des proies
      stroke(gr, gg, gb, 60);
      rect(px, py, this.detectionRadius * 2, this.detectionRadius * 2);

      // Rayon de fuite de la reine
      stroke(0, 255, 0, 60);
      rect(px, py, this.fleePlayerRadius * 2, this.fleePlayerRadius * 2);

      // Vecteur vitesse (rouge)
      stroke(255, 60, 0, 180);
      strokeWeight(2);
      let vx = this.vel.copy().mult(8);
      line(px, py, px + vx.x, py + vx.y);

      // Point de direction
      noStroke();
      fill(255, 0, 0, 200);
      rect(px + vx.x, py + vx.y, 4, 4);

      // Cible de poursuite (position future de la proie)
      if (this.debugPursueTarget) {
        noFill();
        stroke(0, 255, 0, 150);
        strokeWeight(1);
        let tx = floor(this.debugPursueTarget.x);
        let ty = floor(this.debugPursueTarget.y);
        rect(tx, ty, 12, 12);
        stroke(0, 255, 0, 80);
        line(px, py, tx, ty);
      }

      // Cercle de wander et cible
      if (this.debugWanderCenter && this.debugWanderTarget) {
        let cx = floor(this.debugWanderCenter.x);
        let cy = floor(this.debugWanderCenter.y);
        let wx = floor(this.debugWanderTarget.x);
        let wy = floor(this.debugWanderTarget.y);

        // Centre du cercle
        noStroke();
        fill(255, 150, 0, 150);
        rect(cx, cy, 6, 6);

        // Cercle de wander
        noFill();
        stroke(255, 150, 0, 80);
        circle(cx, cy, this.wanderRadius * 2);

        // Cible sur le cercle
        noStroke();
        fill(0, 255, 100, 200);
        rect(wx, wy, 8, 8);

        // Ligne vers la cible
        stroke(255, 255, 0, 80);
        strokeWeight(1);
        line(px, py, wx, wy);
      }

      pop();
    }
  }
}

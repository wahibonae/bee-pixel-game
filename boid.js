// Boid - abeille ouvrière avec flocking, seek, flee, évitement de toiles et gestion des bords
class Boid {
  static debug = false;

  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 2));
    this.acc = createVector();
    this.maxSpeed = 4;
    this.maxForce = 0.25;
    this.r = 8;

    // Poids pour le flocking (Reynolds) - l'essaim se comporte naturellement
    this.alignWeight = 1.5;
    this.cohesionWeight = 1;
    this.separationWeight = 2;
    this.boundariesWeight = 10;

    // Rayon de perception des voisines
    this.perceptionRadius = 50;

    // Distance de réaction aux bords du jardin
    this.boundariesDistance = 40;

    // Évitement des toiles d'araignée
    this.largeurZoneEvitement = this.r * 2;
    this.avoidWeight = 5;

    // Attraction vers la reine (le joueur)
    this.seekPlayerWeight = 3;
    this.seekPlayerRadius = 400;

    // Fuite devant les frelons
    this.fleeWeight = 8;
    this.fleeRadius = 100;
  }

  // Comportement principal : flocking + suivi de la reine + fuite des frelons + évitement des toiles
  applyBehaviors(playerPos, predators, obstacles, boids) {
    // Flocking classique de Reynolds - l'essaim reste groupé
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);
    let separation = this.separation(boids);
    let boundaries = this.boundaries();

    alignment.mult(this.alignWeight);
    cohesion.mult(this.cohesionWeight);
    separation.mult(this.separationWeight);
    boundaries.mult(this.boundariesWeight);

    this.applyForce(alignment);
    this.applyForce(cohesion);
    this.applyForce(separation);
    this.applyForce(boundaries);

    // Seek vers la reine - plus on est loin, plus l'ouvrière veut la rejoindre
    let dPlayer = this.pos.dist(playerPos);
    if (dPlayer > 20) {
      let seekForce = this.seek(playerPos);
      let pull = map(dPlayer, 20, this.seekPlayerRadius, 1, this.seekPlayerWeight, true);
      seekForce.mult(pull);
      this.applyForce(seekForce);
    }

    // Fuite devant chaque frelon - instinct de survie
    for (let pred of predators) {
      let d = this.pos.dist(pred.pos);
      if (d < this.fleeRadius) {
        let fleeForce = this.flee(pred.pos);
        let urgency = map(d, 0, this.fleeRadius, this.fleeWeight, 0);
        fleeForce.mult(urgency);
        this.applyForce(fleeForce);
      }
    }

    // Évitement des toiles avec double point d'anticipation
    let avoidForce = this.avoid(obstacles);
    avoidForce.mult(this.avoidWeight);
    this.applyForce(avoidForce);
  }

  // --- Comportements de flocking ---

  align(boids) {
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = this.pos.dist(other.pos);
      if (other !== this && d < this.perceptionRadius) {
        steering.add(other.vel);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  cohesion(boids) {
    let steering = createVector();
    let total = 0;
    let percep = this.perceptionRadius * 1.5;
    for (let other of boids) {
      let d = this.pos.dist(other.pos);
      if (other !== this && d < percep) {
        steering.add(other.pos);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.sub(this.pos);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  separation(boids) {
    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = this.pos.dist(other.pos);
      if (other !== this && d < this.perceptionRadius) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.div(d * d);
        steering.add(diff);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  // --- Forces de base ---

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

  // Évitement avec deux points d'anticipation
  avoid(obstacles) {
    let ahead = this.vel.copy().mult(25);
    let ahead2 = ahead.copy().mult(0.5);

    let pointAhead = this.pos.copy().add(ahead);
    let pointAhead2 = this.pos.copy().add(ahead2);

    // On cherche la toile la plus proche
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

    if (Boid.debug) {
      push();
      stroke(255, 255, 0, 100);
      strokeWeight(this.largeurZoneEvitement);
      line(this.pos.x, this.pos.y, pointAhead.x, pointAhead.y);
      noStroke();
      fill(255, 0, 0, 150);
      circle(pointAhead.x, pointAhead.y, 6);
      fill(0, 0, 255, 150);
      circle(pointAhead2.x, pointAhead2.y, 6);
      pop();
    }

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

  // Gestion des bords du jardin - on rebondit doucement
  boundaries() {
    let desired = null;
    let d = this.boundariesDistance;

    if (this.pos.x < d) {
      desired = createVector(this.maxSpeed, this.vel.y);
    } else if (this.pos.x > width - d) {
      desired = createVector(-this.maxSpeed, this.vel.y);
    }

    if (this.pos.y < d) {
      desired = createVector(this.vel.x, this.maxSpeed);
    } else if (this.pos.y > height - d) {
      desired = createVector(this.vel.x, -this.maxSpeed);
    }

    if (desired !== null) {
      desired.setMag(this.maxSpeed);
      let force = p5.Vector.sub(desired, this.vel);
      force.limit(this.maxForce);
      return force;
    }

    return createVector(0, 0);
  }

  // --- Physique ---

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  // --- Rendu visuel pixel : sprite abeille (bee.png) ---

  show() {
    let speed = this.vel.mag();
    let px = floor(this.pos.x);
    let py = floor(this.pos.y);

    // Halo doré pixel - carré semi-transparent
    if (speed > 0.5) {
      let glowAlpha = map(speed, 0, this.maxSpeed, 0, 40);
      let glowSize = floor(map(speed, 0, this.maxSpeed, 0, 20));
      push();
      noStroke();
      rectMode(CENTER);
      fill(255, 200, 50, glowAlpha);
      rect(px, py, this.r * 2 + glowSize, this.r * 2 + glowSize);
      pop();
    }

    // Trainée de pollen pixel - petit carré derrière
    if (speed > 1) {
      push();
      translate(px, py);
      rotate(this.vel.heading());
      noStroke();
      rectMode(CENTER);
      let trailAlpha = map(speed, 0, this.maxSpeed, 0, 100);
      fill(255, 220, 50, trailAlpha * 0.3);
      rect(floor(-this.r * 1.5), 0, floor(this.r * 1.2), floor(this.r * 0.5));
      pop();
    }

    // Sprite de l'abeille - affiché sans rotation
    push();
    imageMode(CENTER);
    let imgSize = this.r * 2.8;
    image(beeImg, px, py, imgSize, imgSize);
    pop();

    // Mode debug : rayon de perception (carré pixel)
    if (Boid.debug) {
      push();
      noFill();
      stroke(255, 200, 50, 80);
      rectMode(CENTER);
      rect(px, py, this.perceptionRadius * 2, this.perceptionRadius * 2);
      pop();
    }
  }
}

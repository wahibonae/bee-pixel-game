// Portal - entrée de la ruche pixel art, alvéole dorée
class Portal {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.r = 45;
    this.savedCount = 0;
    this.spawnTime = millis();
  }

  contains(boid) {
    return this.pos.dist(boid.pos) < this.r;
  }

  relocate(obstacles) {
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 50) {
      this.pos.x = random(100, width - 100);
      this.pos.y = random(100, height - 100);
      valid = true;
      for (let o of obstacles) {
        if (this.pos.dist(o.pos) < o.r + this.r + 30) {
          valid = false;
          break;
        }
      }
      attempts++;
    }
    this.savedCount = 0;
    this.spawnTime = millis();
  }

  shouldRelocate() {
    return this.savedCount >= 5 || (millis() - this.spawnTime > 15000);
  }

  show() {
    let t = millis() / 1000;
    let px = floor(this.pos.x);
    let py = floor(this.pos.y);
    push();
    translate(px, py);

    // Halo pixel ambré - un seul carré
    noStroke();
    rectMode(CENTER);
    let pulse = floor(sin(t * 3) * 4);
    fill(255, 200, 30, 20);
    rect(0, 0, this.r * 2.4 + pulse, this.r * 2.4 + pulse);
    fill(255, 200, 30, 35);
    rect(0, 0, this.r * 1.6 + pulse, this.r * 1.6 + pulse);

    // Hexagone principal pixel (alvéole)
    stroke(220, 180, 40, 200);
    strokeWeight(2);
    fill(180, 140, 20, 60);
    this.drawHexagon(0, 0, this.r);

    // Hexagone intérieur pixel
    stroke(240, 200, 50, 120);
    strokeWeight(1);
    noFill();
    this.drawHexagon(0, 0, this.r * 0.6);

    // Pixels de pollen en orbite - carrés qui clignotent
    noStroke();
    rectMode(CENTER);
    for (let i = 0; i < 6; i++) {
      let angle = t * 1.5 + i * (TWO_PI / 6);
      let orbitR = this.r * 0.8;
      let ppx = floor(cos(angle) * orbitR);
      let ppy = floor(sin(angle) * orbitR);
      let on = floor(t * 3 + i) % 2 === 0;
      if (on) {
        fill(255, 220, 50, 200);
        rect(ppx, ppy, 3, 3);
      }
    }

    // Centre doré pixel
    fill(255, 230, 80, 120);
    rect(0, 0, floor(this.r * 0.5), floor(this.r * 0.5));

    // Noyau pixel
    fill(255, 250, 200);
    rect(0, 0, 4, 4);

    pop();
  }

  drawHexagon(cx, cy, r) {
    beginShape();
    for (let i = 0; i < 6; i++) {
      let angle = TWO_PI / 6 * i - PI / 6;
      vertex(floor(cx + cos(angle) * r), floor(cy + sin(angle) * r));
    }
    endShape(CLOSE);
  }
}

// Obstacle - toile d'araignée pixel art
class Obstacle {
  constructor(x, y, r) {
    this.pos = createVector(x, y);
    this.r = r || 50;
  }

  show() {
    let t = millis() / 1000;
    push();
    translate(floor(this.pos.x), floor(this.pos.y));

    // Halo de danger - carré semi-transparent
    noStroke();
    fill(255, 255, 255, 8);
    rectMode(CENTER);
    rect(0, 0, this.r * 2.2, this.r * 2.2);

    // Fils radiaux (8 branches) - lignes pixel
    let blink = floor(t * 2) % 2 === 0;
    stroke(255, 255, 255, blink ? 90 : 60);
    strokeWeight(1);
    for (let i = 0; i < 8; i++) {
      let angle = i * (TWO_PI / 8);
      let len = this.r * 0.95;
      line(0, 0, floor(cos(angle) * len), floor(sin(angle) * len));
    }

    // Anneaux concentriques en pixel (carrés au lieu de cercles lisses)
    noFill();
    stroke(255, 255, 255, 40);
    strokeWeight(1);
    rectMode(CENTER);
    let levels = 4;
    for (let s = 1; s <= levels; s++) {
      let ringR = (this.r * 0.9 * s) / levels;
      // On dessine un octogone pour garder le style pixel
      beginShape();
      for (let i = 0; i < 8; i++) {
        let a = i * (TWO_PI / 8);
        vertex(floor(cos(a) * ringR), floor(sin(a) * ringR));
      }
      endShape(CLOSE);
    }

    // Gouttes de rosée pixel - petits carrés qui clignotent
    noStroke();
    rectMode(CENTER);
    for (let i = 0; i < 10; i++) {
      let a = (i * 137.508) % TWO_PI;
      let dist = ((i * 7 + 13) % 90) / 90 * this.r * 0.8 + this.r * 0.1;
      let dx = floor(cos(a) * dist);
      let dy = floor(sin(a) * dist);
      let on = floor(t * 3 + i) % 3 !== 0;
      if (on) {
        fill(255, 255, 255, 150);
        rect(dx, dy, 2, 2);
      }
    }

    // Point central pixel
    fill(255, 255, 255, 80);
    rect(0, 0, 3, 3);

    pop();
  }
}

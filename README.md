# Queen Bee (La Reine des Abeilles)

A pixel-art browser game where you play as the Queen Bee, guiding your swarm to safety through a dangerous garden.

**Play the game:** [itch.io](https://wahibonae.itch.io/bee-pixel-game) - 
**Watch the video:** [YouTube](https://www.youtube.com/watch?v=odTDjEG52OY)

[![Queen Bee Gameplay](assets/screenshot.png)](https://www.youtube.com/watch?v=odTDjEG52OY)

## About

You control the Queen Bee with your mouse. Your worker bees follow you through a garden full of predators and spider webs. Guide them to the hive entrance to save them. Survive 15 levels of increasing difficulty.

Created by **Mohamed Wahib ABKARI**, thanks to Mr. Michel Buffa for his teaching, help, and support.

## How to Play

1. Open `index.html` in a browser
2. Read the instructions, press **[U]**
3. Review the predators, press **[U]**
4. Press **[S]** to start each level
5. Press **[R]** to restart a level

### Controls

| Key | Action |
|-----|--------|
| Mouse | Move the Queen |
| U | Dismiss instructions screens |
| S | Start the level |
| R | Restart current level |
| D | Toggle debug mode |

## Steering Behaviors (Craig Reynolds)

This game implements the following autonomous agent behaviors from Craig Reynolds' steering behaviors:

| Behavior | Implementation |
|----------|---------------|
| **Seek** | Worker bees are attracted toward the Queen (mouse cursor). The further they are, the stronger the pull. |
| **Flee** | Worker bees flee from nearby predators. Urgency scales with proximity. |
| **Pursue** | Predators predict the future position of the closest bee and steer toward it, rather than chasing where the bee currently is. |
| **Evade** | Predators flee from the Queen when she gets too close (pheromone protection circle). |
| **Wander** | Predators patrol the garden using a wander circle projected ahead of their velocity, with a random offset angle that shifts each frame. |
| **Flocking** | Worker bees exhibit Reynolds' three flocking rules: **Alignment** (match neighbors' heading), **Cohesion** (steer toward neighbors' center), **Separation** (avoid crowding nearby bees). |
| **Obstacle Avoidance** | All agents use two lookahead points projected along their velocity to detect and steer away from spider webs. |
| **Arrival** | The Queen cursor decelerates smoothly as it approaches the mouse position, using a braking zone that maps distance to speed. |
| **Boundaries** | Worker bees steer away from the edges of the garden to stay within the play area. |

## Project Structure

```
index.html        Entry point
sketch.js          Game loop, levels, HUD, screens, particles
boid.js            Worker bee (flocking, seek, flee, avoid, boundaries)
predator.js        Predators (pursue, evade, wander, avoid) - 4 types
obstacle.js        Spider web rendering
portal.js          Hive entrance rendering
style.css          Background styling
assets/            Sprites (.png), SFX (.wav), music (.mp3)
libraries/         p5.js, p5.sound
```

## Predator Types

| Type | Appears | Speed | Detection | Behavior |
|------|---------|-------|-----------|----------|
| Hornet | Level 1 | Medium (scales with level) | 150px | Fast, hunts in groups |
| Lizard | Level 5 | Slow | 200px | Enduring, large detection zone |
| Dragonfly | Level 8 | Fast | 180px | Very fast, hard to escape |
| Spider | Level 12 | Very slow | 250px | Slow but deadly, massive capture force |

## Tech

- **p5.js** for rendering and game loop
- **p5.sound** for SFX and music playback
- Pixel art style: `noSmooth()`, `pixelDensity(1)`, `floor()` snapping

## Difficulties Encountered

- **Predator speed balancing**: Getting the right speed for each predator type across 15 levels was tricky because hornets felt unfair when too fast in early levels, so we added level-based speed scaling (50% at level 1, ramping up to full speed by level 3).
- **Bees spawning inside obstacles**: When transitioning between levels, new obstacles would randomly land on existing bees, killing them instantly before the player could react. Fixed by moving any overlapping bees to a safe position near the queen after placing the obstacles.

## What I'm Most Proud Of

Successfully implementing Mr. Michel Buffa's suggestions, which elevated the game from a basic boids demo to a complete, polished game:
- **Progressive predator introduction** across 15 levels (4 distinct types with unique behaviors)
- **Sound design** with 8-bit SFX for every game event (bee saved, bee death, level complete, game over, victory)
- **Background music** that switches between menu and gameplay (AI-generated using Suno)
- The result is a game that feels complete and fun to play, not just a technical demo.

## AI Tools Used

### Claude Code (Anthropic)

The game was developed with the assistance of [Claude Code](https://claude.com/product/claude-code), Anthropic's AI coding assistant.

**What it was used for:**
- Code refactoring (steering behaviors, game loop, level system)
- Pixel art style conversion (replacing smooth rendering with pixel-snapped squares)
- Bug investigation and fixing (level transition bug, obstacle spawn overlap)
- Game design suggestions (predator type system, level progression, UX flow)

**Example prompts used:**

> "the current game is a cosmic game that combines the mechanisms shared by Craig Reynolds. Please make these small fixes: more obstacles as levels progress, add a protection circle around the mouse"

> "we should have 15 levels: 1 to 5 wasps and obstacles, 6 to 12 wasps and obstacles and new predators, 13 to 15 wasps and obstacles and lizards and dragonflies and big spiders"

> "there is still that issue of the game continuing to create hives even after the threshold has been reached. Please investigate what's happening and find exactly what causes this issue and think of the best solutions that are minimal and 100% working in all edge cases."

### Suno

[Suno](https://suno.com/) was used to generate the 8-bit chiptune menu and gameplay music using text prompts describing the desired style and mood.

## Credits

- Game created by: **Mohamed Wahib ABKARI**
- Special thanks to Mr. [Michel Buffa](https://users.polytech.unice.fr/~buffa/) for his teaching, guidance, and support.
- Built with [p5.js](https://p5js.org/)
- Steering behaviors by Craig Reynolds
- Menu and in-game music generated with [Suno](https://suno.com/)

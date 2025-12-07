// Modules alias
const { Engine, World, Bodies, Body, Mouse, MouseConstraint, Constraint, Composites, Composite, Events, Vector } = Matter;

let engine;
let world;
let ground;
let bird;
let slingshot;
let mConstraint;
let stack;
let boxes = [];
let score = 0;
let isFired = false;
let pendingReset = false;

function setup() {
    const canvas = createCanvas(800, 400);

    engine = Engine.create();
    world = engine.world;

    // Ground (Snow)
    ground = Bodies.rectangle(400, 380, 810, 60, { isStatic: true, label: 'Ground' });
    World.add(world, ground);

    setupLevel();

    // Mouse Setup
    const mouse = Mouse.create(canvas.elt);
    const options = {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: { visible: false }
        }
    };
    mConstraint = MouseConstraint.create(engine, options);
    World.add(world, mConstraint);
    mouse.pixelRatio = pixelDensity();

    // Events
    Events.on(mConstraint, 'enddrag', handleEndDrag);
    Events.on(engine, 'collisionStart', handleCollisions);
}

function setupLevel() {
    // Bird (Ornament)
    if (bird) World.remove(world, bird);
    bird = Bodies.circle(150, 200, 20, {
        restitution: 0.5,
        label: 'Bird',
        density: 0.002 // Slightly heavier
    });
    World.add(world, bird);

    // Slingshot
    if (slingshot) World.remove(world, slingshot);
    slingshot = Constraint.create({
        pointA: { x: 150, y: 200 },
        bodyB: bird,
        stiffness: 0.05,
        length: 1
    });
    World.add(world, slingshot);

    // Boxes (Gifts) - Only create if empty (first run) or if we want to reset level
    if (boxes.length === 0) {
        const composite = Composites.stack(500, 150, 4, 3, 0, 0, function(x, y) {
            return Bodies.rectangle(x, y, 40, 40, { label: 'Box' });
        });
        boxes = composite.bodies; // Reference to the array of bodies
        World.add(world, composite);
    }

    isFired = false;
    pendingReset = false;
}

function draw() {
    background(20, 20, 50); // Night sky

    // Update physics
    Engine.update(engine);

    // Draw Ground
    noStroke();
    fill(240); // White snow
    drawBody(ground);

    // Draw Boxes
    for (let i = boxes.length - 1; i >= 0; i--) {
        let box = boxes[i];
        if (box.label === 'Destroyed') {
            World.remove(world, box);
            boxes.splice(i, 1);
            score += 100;
            continue;
        }
        drawBox(box);
    }

    // Draw Bird
    drawBird(bird);

    // Draw Slingshot
    stroke(255);
    strokeWeight(3);
    if (slingshot.bodyB) {
        const posA = slingshot.pointA;
        const posB = slingshot.bodyB.position;
        line(posA.x, posA.y, posB.x, posB.y);

        // Firing Logic: Release when passing the center if fired
        if (isFired) {
             if (bird.position.x > 155) {
                 slingshot.bodyB = null;
                 // Trigger reset timer
                 setTimeout(() => { pendingReset = true; }, 1000); // Allow 1s of action before we start checking for rest
             }
        }
    } else {
        // Draw empty slingshot band (optional, just to show anchor)
        line(150, 200, 150, 230); // Simple post
    }

    // Reset Logic
    if (!slingshot.bodyB && pendingReset) {
        // If bird is off screen or stopped
        const speed = bird.speed;
        const isOffScreen = bird.position.x > width + 50 || bird.position.x < -50;
        const isStopped = speed < 0.2;

        if (isOffScreen || isStopped) {
            if (boxes.length > 0) {
                 setupLevel(); // Reset bird
            }
        }
    }

    // UI
    noStroke();
    fill(255, 215, 0);
    textSize(24);
    textAlign(LEFT);
    text("Score: " + score, 20, 40);

    if (boxes.length === 0) {
        fill(255);
        textSize(48);
        textAlign(CENTER, CENTER);
        text("HOLIDAY HAVOC!", width/2, height/2 - 50);
        textSize(32);
        text("All Presents Opened!", width/2, height/2 + 10);
        text("Score: " + score, width/2, height/2 + 50);

        textSize(20);
        text("Click to Restart", width/2, height/2 + 100);
    }
}

function mousePressed() {
    if (boxes.length === 0) {
        score = 0;
        // Remove old boxes (if any stragglers, though length is 0)
        // Rebuild stack
        const composite = Composites.stack(500, 150, 4, 3, 0, 0, function(x, y) {
            return Bodies.rectangle(x, y, 40, 40, { label: 'Box' });
        });
        boxes = composite.bodies;
        World.add(world, composite);
        setupLevel();
    }
}

function handleEndDrag(e) {
    if (e.body === bird) {
        isFired = true;
    }
}

function handleCollisions(event) {
    const pairs = event.pairs;
    for (let pair of pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Check for Box collisions
        checkDestruction(bodyA, bodyB);
        checkDestruction(bodyB, bodyA);
    }
}

function checkDestruction(target, other) {
    if (target.label === 'Box') {
        // Calculate impact speed
        // Simple approximation: use the speed of the other body, or relative velocity
        // For accurate impact, we need relative velocity normal
        // But simply checking if impact speed > threshold works for games
        const speed = Math.max(target.speed, other.speed);
        // Or better, relative speed
        // Since we are in collisionStart, speeds are pre-solver? No, usually current.

        if (speed > 3 || other.label === 'Bird') { // Threshold
             // Mark for destruction (don't remove immediately to avoid physics errors in loop)
             target.label = 'Destroyed';
        }
    }
}

// --- Drawing Helpers ---

function drawBody(body) {
    beginShape();
    for (let v of body.vertices) {
        vertex(v.x, v.y);
    }
    endShape(CLOSE);
}

function drawBox(body) {
    push();
    translate(body.position.x, body.position.y);
    rotate(body.angle);
    rectMode(CENTER);

    // Gift Box
    noStroke();
    fill(0, 150, 0); // Green
    rect(0, 0, 40, 40);

    // Ribbon
    fill(255, 215, 0); // Gold
    rect(0, 0, 40, 10);
    rect(0, 0, 10, 40);

    pop();
}

function drawBird(body) {
    push();
    translate(body.position.x, body.position.y);
    rotate(body.angle);

    // Ornament
    noStroke();
    fill(200, 0, 0); // Red
    ellipse(0, 0, 40, 40);

    // Shine
    fill(255, 200);
    ellipse(-10, -10, 10, 10);

    // Hanger part
    fill(218, 165, 32);
    rectMode(CENTER);
    rect(0, -20, 10, 10);

    pop();
}

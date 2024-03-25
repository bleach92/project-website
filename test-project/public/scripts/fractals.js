// Define variables for the fractals
let fractals = [];

// Setup function for p5.js
function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 0; i < 35; i++) {
    let fractal = new Fractal(random(width), random(height), random(20, 50), random(1, 3));
    fractals.push(fractal);
  }
}

// Draw function for p5.js
function draw() {
  background(0); // Dark background
  
  // Update and display each fractal
  for (let i = 0; i < fractals.length; i++) {
    fractals[i].update();
    fractals[i].display();
    // Check for collisions with other fractals
    for (let j = i + 1; j < fractals.length; j++) {
      if (fractals[i].intersects(fractals[j])) {
        fractals[i].avoid(fractals[j]);
      }
    }
  }
}

// Fractal class
class Fractal {
  constructor(x, y, size, speed) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.vx = random(-1, 1) * this.speed;
    this.vy = random(-1, 1) * this.speed;
    this.stickToCursor = false;
  }
  
  // Update function for fractal movement
  update() {
    if (this.stickToCursor) {
      // Move towards cursor
      let dx = mouseX - this.x;
      let dy = mouseY - this.y;
      let angle = atan2(dy, dx);
      this.vx = cos(angle) * this.speed;
      this.vy = sin(angle) * this.speed;
    } else {
      // Random movement
      this.vx += random(-0.1, 0.1);
      this.vy += random(-0.1, 0.1);
      
      // Limit speed
      this.vx = constrain(this.vx, -this.speed, this.speed);
      this.vy = constrain(this.vy, -this.speed, this.speed);
    }
    
    // Move fractal
    this.x += this.vx;
    this.y += this.vy;
    
    // Ensure fractal stays within canvas bounds
    this.x = constrain(this.x, 0, width);
    this.y = constrain(this.y, 0, height);
  }
  
  // Display function for fractal appearance
  display() {
    noFill();
    stroke(255, 0, 0); // Red color
    strokeWeight(2);
    ellipse(this.x, this.y, this.size);
  }
  
  // Function to check if the fractal intersects with another fractal
  intersects(other) {
    let d = dist(this.x, this.y, other.x, other.y);
    return d < (this.size + other.size) / 2;
  }
  
  // Function to avoid overlapping with another fractal
  avoid(other) {
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    let angle = atan2(dy, dx);
    let targetX = this.x + cos(angle) * this.speed;
    let targetY = this.y + sin(angle) * this.speed;
    this.x = constrain(targetX, 0, width);
    this.y = constrain(targetY, 0, height);
  }
}

// Function to move fractals towards cursor when canvas is clicked
function mouseClicked() {
  for (let fractal of fractals) {
    fractal.stickToCursor = !fractal.stickToCursor; // Toggle stickToCursor flag
  }
}

// Resize canvas when window is resized
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Smooth scroll to next/previous section when scrolling
window.addEventListener('wheel', function(event) {
    event.preventDefault();
    const currentSection = getCurrentSection();
    let nextSection;
    if (event.deltaY > 0) {
      // Scrolling down
      nextSection = currentSection.nextElementSibling;
    } else {
      // Scrolling up
      nextSection = currentSection.previousElementSibling;
    }
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
  
  // Function to get the currently visible section
  function getCurrentSection() {
    const sections = document.querySelectorAll('section');
    let currentSection = sections[0];
    let minDistance = Math.abs(window.scrollY - currentSection.offsetTop);
    sections.forEach(section => {
      const distance = Math.abs(window.scrollY - section.offsetTop);
      if (distance < minDistance) {
        minDistance = distance;
        currentSection = section;
      }
    });
    return currentSection;
  }
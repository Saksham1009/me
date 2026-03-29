---
layout: ../layouts/AboutLayout.astro
title: "About"
---

<div style="display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 2rem;">
  <img src="/about.JPG" alt="About" style="width: 300px; border-radius: 8px;" />
  <div>
    <p>Started working in the software industry in Sep '22 as an intern to now calling it my profession, I still get the same rush every time something I build actually works.</p>
    <p>Finding opportunities to learn and grow every day.</p>
    <p>Grew up loving and still LOVE to play sports.</p>
    <p>Based in Victoria, BC, Canada 📍</p>
  </div>
</div>

## Recent Projects

---

Some of the projects I have been working on recently:

<style>
.carousel-container {
  position: relative;
  max-width: 100%;
  margin: 1rem 0;
}
.carousel {
  display: flex;
  overflow: hidden;
  border-radius: 8px;
}
.carousel-track {
  display: flex;
  transition: transform 0.3s ease;
}
.carousel-slide {
  min-width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.carousel-slide img {
  border-radius: 8px;
  object-fit: contain;
}
.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  padding: 1rem;
  cursor: pointer;
  border-radius: 4px;
  font-size: 1.5rem;
  z-index: 10;
}
.carousel-arrow:hover {
  background: rgba(0, 0, 0, 0.7);
}
.carousel-arrow.left {
  left: 10px;
}
.carousel-arrow.right {
  right: 10px;
}
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}
.carousel-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ccc;
  cursor: pointer;
}
.carousel-dot.active {
  background: #333;
}
</style>

<div style="margin-top: 2rem;">

### MatchPlay

<div class="carousel-container">
  <div class="carousel">
    <div class="carousel-track" id="carousel-matchplay">
      <div class="carousel-slide"><img src="/MP0.png" alt="MatchPlay 1" style="width: 250px;" /></div>
      <div class="carousel-slide"><img src="/MP1.png" alt="MatchPlay 2" style="width: 250px;" /></div>
      <div class="carousel-slide"><img src="/MP2.png" alt="MatchPlay 3" style="width: 250px;" /></div>
    </div>
  </div>
  <button class="carousel-arrow left" onclick="moveCarousel('matchplay', -1)">‹</button>
  <button class="carousel-arrow right" onclick="moveCarousel('matchplay', 1)">›</button>
  <div class="carousel-dots" id="dots-matchplay"></div>
</div>

A sports matchmaking app that helps you find players, join games, and never miss a pickup session in your city.

---

### <a href="https://www.trailai.app" target="_blank" rel="noopener noreferrer">TrailAI →</a>

<div class="carousel-container">
  <div class="carousel">
    <div class="carousel-track" id="carousel-trailai">
      <div class="carousel-slide"><img src="/trail0.png" alt="TrailAI 1" style="width: 700px;" /></div>
      <div class="carousel-slide"><img src="/trail1.png" alt="TrailAI 2" style="width: 700px;" /></div>
      <div class="carousel-slide"><img src="/trail2.jpeg" alt="TrailAI 3" style="width: 700px;" /></div>
    </div>
  </div>
  <button class="carousel-arrow left" onclick="moveCarousel('trailai', -1)">‹</button>
  <button class="carousel-arrow right" onclick="moveCarousel('trailai', 1)">›</button>
  <div class="carousel-dots" id="dots-trailai"></div>
</div>

Minimal, distraction-free note-taking with AI-powered daily insights, summaries, and weekly recaps delivered to your inbox.

---

### <a href="https://www.doxxx.co" target="_blank" rel="noopener noreferrer">DOX →</a>

<div class="carousel-container">
  <div class="carousel">
    <div class="carousel-track" id="carousel-dox">
      <div class="carousel-slide"><img src="/dox0.png" alt="DOX 1" style="width: 700px;" /></div>
      <div class="carousel-slide"><img src="/dox1.png" alt="DOX 2" style="width: 700px;" /></div>
      <div class="carousel-slide"><img src="/dox2.png" alt="DOX 3" style="width: 700px;" /></div>
    </div>
  </div>
  <button class="carousel-arrow left" onclick="moveCarousel('dox', -1)">‹</button>
  <button class="carousel-arrow right" onclick="moveCarousel('dox', 1)">›</button>
  <div class="carousel-dots" id="dots-dox"></div>
</div>

Your digital identity hosted **24 X 7** in one link — shareable profile URLs, QR codes, and instant PDF exports.

</div>

<script>
const carouselState = {
  matchplay: 0,
  trailai: 0,
  dox: 0
};

function initCarousels() {
  ['matchplay', 'trailai', 'dox'].forEach(name => {
    const track = document.getElementById(`carousel-${name}`);
    const dotsContainer = document.getElementById(`dots-${name}`);
    const slideCount = track.children.length;

    for (let i = 0; i < slideCount; i++) {
      const dot = document.createElement('div');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.onclick = () => goToSlide(name, i);
      dotsContainer.appendChild(dot);
    }
  });
}

function moveCarousel(name, direction) {
  const track = document.getElementById(`carousel-${name}`);
  const slideCount = track.children.length;

  carouselState[name] = (carouselState[name] + direction + slideCount) % slideCount;
  updateCarousel(name);
}

function goToSlide(name, index) {
  carouselState[name] = index;
  updateCarousel(name);
}

function updateCarousel(name) {
  const track = document.getElementById(`carousel-${name}`);
  const dots = document.getElementById(`dots-${name}`).children;

  track.style.transform = `translateX(-${carouselState[name] * 100}%)`;

  Array.from(dots).forEach((dot, index) => {
    dot.className = 'carousel-dot' + (index === carouselState[name] ? ' active' : '');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCarousels);
} else {
  initCarousels();
}
</script>

## Career

---

<h3 style="margin-bottom: 0.25rem;"><img src="/helm.jpeg" alt="Helm Operations" width="36" height="36" style="display: inline; vertical-align: middle; margin: 0; padding: 0;" /> Helm Operations</h3>

**Software Engineer (Full Stack)**
`April 2025 – Present`

Came back as a full-time engineer after graduating, now owning features from design to deployment. Building and shipping across the full stack with TypeScript, C# (.NET), and MySQL/PostgreSQL — collaborating directly with product and QA to keep things scalable and maintainable.

<h3 style="margin-bottom: 0.25rem;"><img src="/helm.jpeg" alt="Helm Operations" width="36" height="36" style="display: inline; vertical-align: middle; margin: 0; padding: 0;" /> Helm Operations</h3>

**Software Engineer (Full Stack)**
`September 2023 – March 2025`

Joined back Helm part time along with studies + another coop term in summer '24. Led end-to-end design and development of 5+ production features across the platform.

<h3 style="margin-bottom: 0.25rem;"><img src="/noom.png" alt="Noom Inc." width="36" height="36" style="display: inline; vertical-align: middle; margin: 0; padding: 0;" /> Noom Inc.</h3>

**Software Engineering Intern (iOS)**
`May 2023 – Aug 2023`

Moved to New York for the summer. Designed and built a custom in-house video player using AVFoundation and SwiftUI to power an exercise library with 50+ videos. Got hands-on with The Composable Architecture (TCA) and shipped features that directly improved user engagement.


<h3 style="margin-bottom: 0.25rem;"><img src="/helm.jpeg" alt="Helm Operations" width="36" height="36" style="display: inline; vertical-align: middle; margin: 0; padding: 0;" /> Helm Operations</h3>

**Software Engineering Intern (Full Stack)**
`Sep 2022 – Apr 2023`

First step into the industry. Improved filtering and data querying by integrating new parameters into the central data context using .NET framework and C#.


<h3 style="margin-bottom: 0.25rem;"><img src="/uvic.jpeg" alt="University of Victoria" width="36" height="36" style="display: inline; vertical-align: middle; margin: 0; padding: 0;" /> University of Victoria</h3>

**BSc, Computer Science**
`Sep 2021 – Apr 2025`

## Reach Out

---

Shoot me an email at [sakshamdua103@gmail.com](mailto:sakshamdua103@gmail.com)
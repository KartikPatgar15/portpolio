const galaxy = document.getElementById('galaxy-bg');
window.addEventListener('mousemove', (e) => {
    const x = e.clientX - window.innerWidth / 2;
    const y = e.clientY - window.innerHeight / 2;
    galaxy.style.setProperty('--mouse-x', `${x}px`);
    galaxy.style.setProperty('--mouse-y', `${y}px`);
});

// Shooting stars spawner
function spawnShootingStar() {
    const host = document.getElementById('galaxy-bg');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'shooting-star';
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * (window.innerHeight * 0.6);
    const dx = 500 + Math.random() * 500;
    const dy = -200 - Math.random() * 200;
    const rot = -15 - Math.random() * 20;
    el.style.setProperty('--sx', `${startX}px`);
    el.style.setProperty('--sy', `${startY}px`);
    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);
    el.style.setProperty('--rot', `${rot}deg`);
    el.style.setProperty('--shoot-duration', `${1.1 + Math.random()*0.8}s`);
    host.appendChild(el);
    setTimeout(() => el.remove(), 2200);
}
setInterval(() => { if (Math.random() < 0.5) spawnShootingStar(); }, 2500);

// --- PRELOADER ---
window.addEventListener('load', () => {
    const pre = document.getElementById('preloader');
    if (pre) {
        pre.style.opacity = '0';
        setTimeout(() => pre.remove(), 400);
    }
});

// --- THREE.JS 3D ANIMATION & SHADER BACKGROUND ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#three-canvas'),
    alpha: true,
    antialias: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.set(0, 0, 5);

// Shader-based nebula background (fullscreen plane behind the scene)
const bgScene = new THREE.Scene();
const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const bgGeometry = new THREE.PlaneGeometry(2, 2);
const bgUniforms = {
    u_time: { value: 0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    u_mouse: { value: new THREE.Vector2(0.0, 0.0) }
};
const bgMaterial = new THREE.ShaderMaterial({
    uniforms: bgUniforms,
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_time;

        // Hash & noise helpers
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
        float noise(vec2 p){
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        vec3 palette(float t){
          vec3 a = vec3(0.05, 0.08, 0.13);
          vec3 b = vec3(0.20, 0.35, 0.65);
          vec3 c = vec3(1.0, 0.8, 0.6);
          vec3 d = vec3(0.35, 0.25, 0.75);
          return a + b * cos(6.28318*(c*t + d));
        }

        void main(){
          vec2 uv = vUv;
          vec2 st = (gl_FragCoord.xy / u_resolution.xy);
          vec2 p = (st - 0.5) * vec2(u_resolution.x/u_resolution.y, 1.0);

          // Parallax via mouse
          p += (u_mouse - 0.5) * 0.1;

          float t = u_time * 0.05;
          float n = 0.0;
          float amp = 0.5;
          float freq = 1.5;
          for(int i=0;i<5;i++){
            n += amp * noise(p * freq + t);
            freq *= 2.0;
            amp *= 0.5;
          }
          n = smoothstep(0.2, 0.9, n);

          // Nebula color blend
          vec3 col1 = vec3(0.05, 0.08, 0.15);
          vec3 col2 = vec3(0.15, 0.25, 0.55);
          vec3 col3 = vec3(0.45, 0.55, 0.95);
          vec3 col = mix(col1, col2, n);
          col = mix(col, col3, pow(n, 2.0));

          // Vignette
          float vign = smoothstep(0.9, 0.2, length(st - 0.5));
          col *= vign;

          gl_FragColor = vec4(col, 1.0);
        }
    `,
    depthWrite: false,
    depthTest: false
});
const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
bgScene.add(bgMesh);
// Lighting
const pointLight = new THREE.PointLight(0xffffff, 2);
pointLight.position.set(5, 5, 5);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(pointLight, ambientLight);

// Core icosahedron
const coreGeom = new THREE.IcosahedronGeometry(1.2, 2);
const coreMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.25, metalness: 0.6, envMapIntensity: 1 });
const core = new THREE.Mesh(coreGeom, coreMat);
scene.add(core);

// Wireframe overlay
const wireGeom = new THREE.IcosahedronGeometry(1.22, 1);
const wireMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true, transparent: true, opacity: 0.35 });
const wire = new THREE.Mesh(wireGeom, wireMat);
scene.add(wire);

// Galaxy particles
const particleCount = window.innerWidth > 1024 ? 2500 : 1400;
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
    const radius = 4 + Math.random() * 22;
    const angle = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 8;
    positions[i * 3 + 0] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    const c = 0.6 + Math.random() * 0.4;
    colors[i * 3 + 0] = 0.58 * c;
    colors[i * 3 + 1] = 0.72 * c;
    colors[i * 3 + 2] = 0.98 * c;
}
const starGeom = new THREE.BufferGeometry();
starGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
starGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const starMat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.9 });
const starField = new THREE.Points(starGeom, starMat);
scene.add(starField);

// Orbiting satellites
const orbitGroup = new THREE.Group();
scene.add(orbitGroup);
const orbiterSpecs = [
    { r: 2.4, s: 1.2, size: 0.12, color: 0x60a5fa },
    { r: 3.0, s: 0.9, size: 0.16, color: 0xa78bfa },
    { r: 3.6, s: 1.7, size: 0.1, color: 0xfff9c4 },
    { r: 2.9, s: 1.4, size: 0.13, color: 0x34d399 }
];
const orbiters = orbiterSpecs.map(({ r, s, size, color }) => {
    const g = new THREE.SphereGeometry(size, 16, 16);
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.3 });
    const mesh = new THREE.Mesh(g, m);
    mesh.userData = { radius: r, speed: s, phase: Math.random() * Math.PI * 2 };
    orbitGroup.add(mesh);
    return mesh;
});

let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    bgUniforms.u_mouse.value.set(event.clientX / window.innerWidth, 1.0 - event.clientY / window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    bgUniforms.u_time.value = t;

    // Core subtle rotations influenced by mouse
    const targetX = mouseY * 0.6;
    const targetY = mouseX * 0.8;
    core.rotation.x += (targetX - core.rotation.x) * 0.05 + 0.003;
    core.rotation.y += (targetY - core.rotation.y) * 0.05 + 0.005;
    wire.rotation.copy(core.rotation);

    // Stars slow drift
    starField.rotation.y = t * 0.02;
    starField.rotation.x = Math.sin(t * 0.1) * 0.02;

    // Orbiters
    orbiters.forEach((m, i) => {
        const speed = m.userData.speed;
        const radius = m.userData.radius;
        const phase = m.userData.phase;
        const a = t * speed + phase;
        m.position.set(Math.cos(a) * radius, Math.sin(a * 1.2) * 0.6, Math.sin(a) * radius);
    });

    // Camera parallax and scroll influence
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = Math.max(0, Math.min(1, window.scrollY / Math.max(1, max)));
    camera.position.z = 5 + pct * 1.6;
    camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.03;
    camera.position.y += (mouseY * 0.4 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    // Render background first
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(bgScene, bgCamera);
    // Then the main 3D scene
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    bgUniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
});

// Smooth scrolling via Lenis (temporarily disabled for testing)
function initLenis() {
    if (window.Lenis) {
        // Temporarily disable Lenis to test ScrollTrigger
        console.log('Lenis found but disabled for testing ScrollTrigger');
        
        // Uncomment below to re-enable Lenis:
        // window.lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1.1, smoothTouch: false });
        // function raf(time) {
        //     window.lenis.raf(time);
        //     requestAnimationFrame(raf);
        // }
        // requestAnimationFrame(raf);
        
        // Refresh ScrollTrigger after Lenis is loaded
        setTimeout(() => {
            if (window.ScrollTrigger) {
                ScrollTrigger.refresh();
                console.log('ScrollTrigger refreshed');
            }
        }, 500);
    } else {
        console.log('Lenis not loaded, retrying...');
        setTimeout(initLenis, 100);
    }
}
initLenis();

// --- SCROLL PROGRESS ---
const progress = document.querySelector('#scroll-progress span');
window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = Math.max(0, Math.min(1, window.scrollY / max));
    if (progress) progress.style.width = `${pct * 100}%`;
}, { passive: true });

// --- STAGGERED TEXT REVEAL ---
const textElements = document.querySelectorAll('.stagger-reveal');
textElements.forEach(element => {
    const text = element.textContent;
    const letters = text.split('');
    element.innerHTML = '';
    letters.forEach(letter => {
        const span = document.createElement('span');
        if (letter === ' ') {
            span.innerHTML = '&nbsp;';
        } else {
            span.textContent = letter;
        }
        span.style.display = 'inline-block';
        element.appendChild(span);
    });
});
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const spans = entry.target.querySelectorAll('span');
            spans.forEach((span, index) => {
                span.style.transitionDelay = `${index * 50}ms`;
            });
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });
textElements.forEach((element) => {
    observer.observe(element);
});

// --- 3D TILT & SHINE EFFECT FOR PROJECT CARDS (inner wrapper to avoid conflict with GSAP) ---
const cards = document.querySelectorAll('.project-card');
cards.forEach(card => {
    const inner = card.querySelector('.project-card-inner') || card; // fallback
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = -(y - centerY) / 15;
        const rotateY = (x - centerX) / 15;
        inner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
        const inner = card.querySelector('.project-card-inner') || card;
        inner.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
});

// --- CUSTOM CURSOR ---
const cursor = document.getElementById('cursor');
const cursorCore = cursor?.querySelector('.cursor-core');
const ring = cursor?.querySelector('.cursor-ring');
let cx = 0, cy = 0, tx = 0, ty = 0;
function moveCursor() {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;
    if (cursorCore) cursorCore.style.transform = `translate(${tx}px, ${ty}px)`;
    if (ring) ring.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(moveCursor);
}
window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
moveCursor();

// Magnetic buttons
document.querySelectorAll('.magnetic').forEach((el) => {
    const strength = 20;
    el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x/strength}px, ${y/strength}px)`;
    });
    el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
    });
});

// --- MOBILE NAV ---
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');
if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        const expanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!expanded));
        navMenu.classList.toggle('open', !expanded);
    });
    navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        navToggle.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('open');
    }));
}

// --- PARALLAX ON SECTIONS ---
document.querySelectorAll('.panel').forEach((panel) => {
    panel.addEventListener('mousemove', (e) => {
        const rect = panel.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        panel.style.setProperty('--mouse-x', `${x}px`);
        panel.style.setProperty('--mouse-y', `${y}px`);
    });
});

// --- GSAP Scroll Animations ---
function initGSAPAnimations() {
    if (window.gsap && window.ScrollTrigger && !window.gsapAnimationsInitialized) {
        window.gsapAnimationsInitialized = true;
        gsap.registerPlugin(ScrollTrigger);

        // Hero entrance
        gsap.from('#hero .hero-inner > *', {
            y: 30, opacity: 0, duration: 0.8, ease: 'power3.out',
            stagger: 0.12, delay: 0.2
        });

        // Sections fade+lift on enter
        document.querySelectorAll('section.panel').forEach((sec) => {
            gsap.from(sec, {
                scrollTrigger: { trigger: sec, start: 'top 70%' },
                y: 40, opacity: 0, duration: 0.8, ease: 'power3.out'
            });
        });

        // Featured Work: horizontal scroll-controlled carousel
        const track = document.querySelector('.gallery-track');
        const slides = gsap.utils.toArray('.gallery-track .project-card3d');
        if (track && slides.length) {
            const totalWidth = () => {
                const styleGap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0');
                const gap = isNaN(styleGap) ? 0 : styleGap;
                let w = 0;
                slides.forEach((el, i) => { w += el.offsetWidth; if (i < slides.length - 1) w += gap; });
                return w;
            };

            // Start slightly visible and to the right
            gsap.set(slides, { opacity: 0.7, scale: 0.92, y: 10 });

            const tl = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                    trigger: '#projects',
                    start: 'top top',
                    end: () => `+=${Math.max(1500, totalWidth())}`,
                    scrub: 0.8,
                    pin: '.featured-pin',
                    invalidateOnRefresh: true
                }
            });

            // Horizontal translate based on vertical scroll
            const startX = () => Math.round(window.innerWidth * 0.35); // a bit to the right but visible
            const endX = () => -Math.round(totalWidth() - window.innerWidth + (window.innerWidth * 0.1));
            tl.fromTo(track, { x: startX }, { x: endX, duration: 1 }, 0);

            // Per-card entrance
            slides.forEach((card, idx) => {
                const cardStart = idx / Math.max(1, slides.length - 1);
                tl.to(card, { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'power2.out' }, cardStart);
                // subtle un-tilt as it enters
                tl.fromTo(card, { rotateY: -16, z: -40 }, { rotateY: -8, z: 0, duration: 0.25, ease: 'power2.out' }, cardStart);
            });

            // Parallax tilt on mouse move within the pinned area
            const pin = document.querySelector('.featured-pin');
            if (pin) {
                pin.addEventListener('mousemove', (e) => {
                    const rect = pin.getBoundingClientRect();
                    const rx = (e.clientY - rect.top - rect.height / 2) / rect.height; // -0.5..0.5
                    const ry = (e.clientX - rect.left - rect.width / 2) / rect.width;
                    slides.forEach((card, i) => {
                        const depth = (i / slides.length) * 40; // staggered depth
                        card.style.transform = `translateZ(${depth * -1}px) rotateY(${(-10 + ry * -8)}deg) rotateX(${(rx * 6)}deg)`;
                    });
                });
                pin.addEventListener('mouseleave', () => {
                    slides.forEach((card) => {
                        card.style.transform = 'translateZ(0) rotateY(-14deg) rotateX(2deg)';
                    });
                });
            }

            // Animated PROJECTS title: moves from right to left as user scrolls
            const projTitle = document.querySelector('.projects-title-animated');
            if (projTitle) {
                // Start title invisible and positioned off-screen
                gsap.set(projTitle, { 
                    x: window.innerWidth * 0.6, // Start on right side but invisible
                    opacity: 0, // Start invisible
                    scale: 0.8
                });

                // Show title later
                ScrollTrigger.create({
                    trigger: '#resume',
                    start: 'bottom 20%',
                    end: () => `+=${Math.max(1500, totalWidth())}`,
                    onEnter: () => gsap.to(projTitle, { opacity: 1, duration: 0.5 }),
                    onLeave: () => gsap.to(projTitle, { opacity: 0, duration: 0.3 }),
                    onLeaveBack: () => gsap.to(projTitle, { opacity: 0, duration: 0.3 })
                });

                // Create scroll-triggered animation for the title (starts later and faster)
                ScrollTrigger.create({
                    trigger: '#resume',
                    start: 'bottom 10%',
                    end: () => `+=${Math.max(1500, totalWidth())}`,
                    scrub: 1, // Faster animation (was 4)
                    onUpdate: (self) => {
                        const progress = self.progress;
                        
                        // Move title from right side to left edge
                        const startX = window.innerWidth * 0.6; // Start on right side (visible)
                        const leftEdgeX = -window.innerWidth * 0.2; // Left edge position
                        
                        let currentX;
                        if (progress < 0.7) {
                            // Move from right side to left edge (first 70% of animation)
                            const moveProgress = progress / 0.7;
                            currentX = startX + (leftEdgeX - startX) * moveProgress;
                        } else {
                            // Stay at left edge (last 30% of animation)
                            currentX = leftEdgeX;
                        }
                        
                        // Move title upward as user scrolls (more subtle movement)
                        const startY = 0;
                        const endY = -window.innerHeight * 0.15;
                        const currentY = startY + (endY - startY) * progress;
                        
                        // Scale and opacity changes
                        const scale = 0.8 + (0.4 * progress);
                        
                        // Fade in during movement
                        let opacity;
                        if (progress < 0.3) {
                            // Fade in during first 30% of animation
                            opacity = Math.min(1, (progress / 0.3) * 2);
                        } else {
                            // Stay fully visible for rest of animation
                            opacity = 1;
                        }
                        
                        gsap.set(projTitle, {
                            x: currentX,
                            y: currentY,
                            scale: scale,
                            opacity: opacity
                        });
                    }
                });
            }

            // Animated SKILLS title: moves from right to left as user scrolls
            const skillsTitle = document.querySelector('.skills-title-animated');
            if (skillsTitle) {
                // Start title invisible and positioned off-screen
                gsap.set(skillsTitle, { 
                    x: window.innerWidth * 0.6, // Start on right side but invisible
                    opacity: 0, // Start invisible
                    scale: 0.8
                });

                // Show title when approaching skills section
                ScrollTrigger.create({
                    trigger: '#skills',
                    start: 'top 30%',
                    end: () => `+=${Math.max(800, 1000)}`,
                    onEnter: () => gsap.to(skillsTitle, { opacity: 1, duration: 0.5 }),
                    onLeave: () => gsap.to(skillsTitle, { opacity: 0, duration: 0.3 }),
                    onLeaveBack: () => gsap.to(skillsTitle, { opacity: 0, duration: 0.3 })
                });

                // Create scroll-triggered animation for the title
                ScrollTrigger.create({
                    trigger: '#skills',
                    start: 'top 20%',
                    end: () => `+=${Math.max(800, 1000)}`,
                    scrub: 1.5, // Medium speed animation
                    onUpdate: (self) => {
                        const progress = self.progress;
                        
                        // Move title from right side to left edge
                        const startX = window.innerWidth * 0.6; // Start on right side (visible)
                        const leftEdgeX = -window.innerWidth * 0.2; // Left edge position
                        
                        let currentX;
                        if (progress < 0.6) {
                            // Move from right side to left edge (first 60% of animation)
                            const moveProgress = progress / 0.6;
                            currentX = startX + (leftEdgeX - startX) * moveProgress;
                        } else {
                            // Stay at left edge (last 40% of animation)
                            currentX = leftEdgeX;
                        }
                        
                        // Move title upward as user scrolls
                        const startY = 0;
                        const endY = -window.innerHeight * 0.1;
                        const currentY = startY + (endY - startY) * progress;
                        
                        // Scale and opacity changes
                        const scale = 0.8 + (0.4 * progress);
                        
                        // Fade in during movement
                        let opacity;
                        if (progress < 0.3) {
                            // Fade in during first 30% of animation
                            opacity = Math.min(1, (progress / 0.3) * 2);
                        } else {
                            // Stay fully visible for rest of animation
                            opacity = 1;
                        }
                        
                        gsap.set(skillsTitle, {
                            x: currentX,
                            y: currentY,
                            scale: scale,
                            opacity: opacity
                        });
                    }
                });
            }
        }

        // Skills section - Simple 3D card flip animation
        $(document).on('click','.flip',function(){
            let card = $(this).closest('.card')
            if(card.hasClass('flip-it')) card.removeClass('flip-it')
            else card.addClass('flip-it')
        })

        $('.card').each(function(){
            let href = $(this).data('href')
            $(this).find('.image').css({
                backgroundImage:['url(',href,')'].join('')
            })
        })
    }
}

// Wait for GSAP to load, then initialize animations
function waitForGSAP() {
    if (window.gsap && window.ScrollTrigger) {
        console.log('GSAP and ScrollTrigger loaded successfully');
        initGSAPAnimations();
    } else {
        console.log('Waiting for GSAP to load...');
        setTimeout(waitForGSAP, 100);
    }
}

// Add error handling for GSAP loading
window.addEventListener('error', (e) => {
    if (e.message.includes('gsap') || e.message.includes('ScrollTrigger')) {
        console.error('GSAP loading error:', e.message);
    }
});

// Start checking for GSAP when DOM is ready
document.addEventListener('DOMContentLoaded', waitForGSAP);

// Fallback: Try again after a longer delay
setTimeout(() => {
    if (window.gsap && window.ScrollTrigger && !window.gsapAnimationsInitialized) {
        console.log('Fallback: Initializing GSAP animations');
        initGSAPAnimations();
        window.gsapAnimationsInitialized = true;
    }
}, 2000);

// --- Lazy loading placeholder (for future images) ---
const lazyImages = document.querySelectorAll('img[loading="lazy"], img[data-src]');
const lazyObs = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        const img = target;
        const src = img.getAttribute('data-src');
        if (src) { img.src = src; img.removeAttribute('data-src'); }
        lazyObs.unobserve(target);
    });
}, { rootMargin: '200px' });
lazyImages.forEach(img => lazyObs.observe(img));

// --- Contact form validation ---
const form = document.getElementById('contact-form');
if (form) {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const nameError = document.getElementById('name-error');
    const emailError = document.getElementById('email-error');

    function validateName() {
        const valid = nameInput.value.trim().length > 0;
        nameError.textContent = valid ? '' : 'Name is required.';
        return valid;
    }
    function validateEmail() {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
        const valid = re.test(emailInput.value.trim());
        emailError.textContent = valid ? '' : 'Enter a valid email address.';
        return valid;
    }
    nameInput.addEventListener('input', validateName);
    emailInput.addEventListener('input', validateEmail);

    form.addEventListener('submit', (e) => {
        const okName = validateName();
        const okEmail = validateEmail();
        if (!okName || !okEmail) {
            e.preventDefault();
        }
    });
}

// --- Skills deck interactions: hover tilt and click/keyboard flip ---
(function initSkillsInteractions(){
    const cards = document.querySelectorAll('.skills-stage .skill-card');
    if (!cards.length) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
        cards.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
        return;
    }

    function toggleFlip(btn) {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        btn.classList.toggle('is-flipped', !expanded);
    }

    cards.forEach((btn) => {
        // Click to flip
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFlip(btn);
        });
        // Keyboard accessibility
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFlip(btn);
            }
        });
        // Hover tilt feedback
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rx = -(y - rect.height / 2) / 18;
            const ry = (x - rect.width / 2) / 18;
            const inner = btn.querySelector('.card');
            if (inner && btn.getAttribute('aria-expanded') !== 'true') {
                inner.style.transform = `rotateY(${ry * 1.2}deg) rotateX(${rx * 1.2}deg)`;
            }
        });
        btn.addEventListener('mouseleave', () => {
            const inner = btn.querySelector('.card');
            if (inner && btn.getAttribute('aria-expanded') !== 'true') {
                inner.style.transform = '';
            }
        });
    });
})();

// --- Project button click feedback (adds a short-lived clicked state) ---
document.addEventListener('click', (e) => {
    const btn = e.target.closest('a.button');
    if (!btn) return;
    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 500);
});
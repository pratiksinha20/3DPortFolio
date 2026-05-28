document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------
    // 1. LOADER & INITIALIZATION
    // --------------------------------------------------
    const loader = document.getElementById('loader');
    const loaderProgress = document.querySelector('.loader-progress');

    // Simulate loading progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        loaderProgress.style.width = `${progress}%`;

        if (progress === 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
                loader.style.opacity = 0;
                loader.style.visibility = 'hidden';
                // Trigger reveal animations for hero section
                revealOnLoad();
            }, 500);
        }
    }, 80);

    // --------------------------------------------------
    // 2. CUSTOM CURSOR
    // --------------------------------------------------
    const cursor = document.querySelector('.custom-cursor');
    const cursorDot = document.querySelector('.custom-cursor-dot');
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let dotX = 0, dotY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Animate cursor frame with lerp (lag follow)
    function animateCursor() {
        // Outer ring (slower lag)
        cursorX += (mouseX - cursorX) * 0.12;
        cursorY += (mouseY - cursorY) * 0.12;
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;

        // Inner dot (faster follow)
        dotX += (mouseX - dotX) * 0.35;
        dotY += (mouseY - dotY) * 0.35;
        cursorDot.style.left = `${dotX}px`;
        cursorDot.style.top = `${dotY}px`;

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover states for cursor
    const interactiveElements = document.querySelectorAll('a, button, input, textarea, .project-card, .skill-category-card, .timeline-content, .metric-card');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });

    // --------------------------------------------------
    // 3. THREE.JS 3D CANVAS & ANTI-GRAVITY PHYSICS
    // --------------------------------------------------
    const container = document.getElementById('canvas-container');
    let scene, camera, renderer;
    let particleSystem, particlePositions, originalPositions, particleVelocities;
    let floatingMeshes = [];
    const particleCount = 1200;

    // Normalized Mouse Coordinates for Three.js
    let raycaster = new THREE.Raycaster();
    let threeMouse = new THREE.Vector2(-9999, -9999);
    let planeZ = 0; // The 3D plane particles lie near

    function init3D() {
        scene = new THREE.Scene();

        // Camera setup
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;

        // Renderer setup
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // 3D Particles setup (BufferGeometry)
        const geometry = new THREE.BufferGeometry();
        particlePositions = new Float32Array(particleCount * 3);
        originalPositions = new Float32Array(particleCount * 3);
        particleVelocities = new Float32Array(particleCount * 3);

        const spread = 60; // 3D spread range

        for (let i = 0; i < particleCount * 3; i += 3) {
            // Random point in spherical coordinates or cylinder to create a gorgeous dust nebula
            const radius = Math.random() * spread;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = (Math.random() - 0.5) * 20; // Keep depth thin for interaction layer

            particlePositions[i] = x;
            particlePositions[i + 1] = y;
            particlePositions[i + 2] = z;

            originalPositions[i] = x;
            originalPositions[i + 1] = y;
            originalPositions[i + 2] = z;

            particleVelocities[i] = 0;
            particleVelocities[i + 1] = 0;
            particleVelocities[i + 2] = 0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

        // Create glowing particle material using canvas texture (soft glowing circle)
        const material = new THREE.PointsMaterial({
            size: 0.28,
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Dynamic round canvas particle texture for glowing stars
        const canvasParticle = document.createElement('canvas');
        canvasParticle.width = 16;
        canvasParticle.height = 16;
        const ctx = canvasParticle.getContext('2d');
        const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(0, 240, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 16, 16);

        const texture = new THREE.CanvasTexture(canvasParticle);
        material.map = texture;

        particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);

        // Add floating geometric glassmorphic meshes
        const geomList = [
            new THREE.IcosahedronGeometry(1.8, 1),
            new THREE.TorusGeometry(1.2, 0.3, 8, 24),
            new THREE.OctahedronGeometry(1.5, 0),
            new THREE.TetrahedronGeometry(1.4, 0),
            new THREE.SphereGeometry(1.2, 16, 16)
        ];

        const meshColors = [0x4285F4, 0xEA4335, 0xFBBC05, 0x34A853, 0x8f00ff];

        for (let i = 0; i < 8; i++) {
            const geom = geomList[i % geomList.length];
            const mat = new THREE.MeshPhysicalMaterial({
                color: meshColors[i % meshColors.length],
                wireframe: true,
                transparent: true,
                opacity: 0.2,
                roughness: 0.1,
                metalness: 0.8,
                clearcoat: 1.0
            });

            const mesh = new THREE.Mesh(geom, mat);
            // Random positions
            mesh.position.x = (Math.random() - 0.5) * 40;
            mesh.position.y = (Math.random() - 0.5) * 20;
            mesh.position.z = (Math.random() - 0.5) * 10;

            // Random rotations & scale
            mesh.rotation.x = Math.random() * Math.PI;
            mesh.rotation.y = Math.random() * Math.PI;
            mesh.scale.setScalar(Math.random() * 0.6 + 0.8);

            // Add custom movement speeds
            mesh.userData = {
                speedX: (Math.random() - 0.5) * 0.005,
                speedY: (Math.random() - 0.5) * 0.005,
                rotSpeedX: (Math.random() - 0.5) * 0.01,
                rotSpeedY: (Math.random() - 0.5) * 0.01,
                originalX: mesh.position.x,
                originalY: mesh.position.y,
                originalZ: mesh.position.z
            };

            scene.add(mesh);
            floatingMeshes.push(mesh);
        }

        // Add subtle ambient and directional lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 0.8);
        dirLight1.position.set(10, 10, 10);
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x8f00ff, 0.6);
        dirLight2.position.set(-10, -10, 10);
        scene.add(dirLight2);

        // Listen for mousemove to project mouse into 3D Coordinates
        window.addEventListener('mousemove', onThreeMouseMove);
        window.addEventListener('resize', onWindowResize);

        animate3D();
    }

    function onThreeMouseMove(event) {
        threeMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        threeMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Animation Loop
    function animate3D() {
        requestAnimationFrame(animate3D);

        // Update projected mouse intersection on Z=0 plane
        raycaster.setFromCamera(threeMouse, camera);

        // Create virtual plane Z = 0
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const raycastResult = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, raycastResult);

        // 1. Particle physics loop (anti-gravity repulsion + return elastic force)
        const positions = particleSystem.geometry.attributes.position.array;
        const repelRadius = 6.0;
        const repelStrength = 0.45;
        const springStrength = 0.08;
        const damping = 0.88;

        for (let i = 0; i < particleCount * 3; i += 3) {
            const px = positions[i];
            const py = positions[i + 1];
            const pz = positions[i + 2];

            const ox = originalPositions[i];
            const oy = originalPositions[i + 1];
            const oz = originalPositions[i + 2];

            let vx = particleVelocities[i];
            let vy = particleVelocities[i + 1];
            let vz = particleVelocities[i + 2];

            // Distance to mouse in 3D
            const dx = px - raycastResult.x;
            const dy = py - raycastResult.y;
            const dz = pz - raycastResult.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            let fx = 0, fy = 0, fz = 0;

            // 1. Repulsion (Anti-Gravity push)
            if (dist < repelRadius && dist > 0.01) {
                const force = (1.0 - (dist / repelRadius)) * repelStrength;
                fx = (dx / dist) * force;
                fy = (dy / dist) * force;
                fz = (dz / dist) * force;
            }

            // 2. Spring force (Elastic return to base position)
            const sx = (ox - px) * springStrength;
            const sy = (oy - py) * springStrength;
            const sz = (oz - pz) * springStrength;

            // Apply forces to velocity
            vx = (vx + fx + sx) * damping;
            vy = (vy + fy + sy) * damping;
            vz = (vz + fz + sz) * damping;

            // Save velocity
            particleVelocities[i] = vx;
            particleVelocities[i + 1] = vy;
            particleVelocities[i + 2] = vz;

            // Update positions
            positions[i] = px + vx;
            positions[i + 1] = py + vy;
            positions[i + 2] = pz + vz;
        }

        particleSystem.geometry.attributes.position.needsUpdate = true;

        // 2. Animate and physics-offset floating geometric meshes
        floatingMeshes.forEach(mesh => {
            // Drift logic
            mesh.position.x += mesh.userData.speedX;
            mesh.position.y += mesh.userData.speedY;
            mesh.rotation.x += mesh.userData.rotSpeedX;
            mesh.rotation.y += mesh.userData.rotSpeedY;

            // Boundaries check
            const boundsX = 35, boundsY = 18;
            if (Math.abs(mesh.position.x) > boundsX) mesh.userData.speedX *= -1;
            if (Math.abs(mesh.position.y) > boundsY) mesh.userData.speedY *= -1;

            // Mouse interaction push for meshes
            const dx = mesh.position.x - raycastResult.x;
            const dy = mesh.position.y - raycastResult.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 8) {
                // Apply a gentle nudge away from mouse
                const nudgeStrength = 0.08 * (1.0 - dist / 8);
                mesh.position.x += (dx / dist) * nudgeStrength;
                mesh.position.y += (dy / dist) * nudgeStrength;
            }
        });

        renderer.render(scene, camera);
    }

    init3D();

    // --------------------------------------------------
    // 4. TYPING TEXT EFFECT (HERO SUBTITLE)
    // --------------------------------------------------
    const typingSpan = document.querySelector('.typing-text');
    const roles = [
        "Real-Time Systems.",
        "Scalable REST APIs.",
        "Computer Vision Applications.",
        "Full-Stack Web Interfaces."
    ];

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
        const currentRole = roles[roleIndex];

        if (isDeleting) {
            typingSpan.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50;
        } else {
            typingSpan.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100;
        }

        if (!isDeleting && charIndex === currentRole.length) {
            isDeleting = true;
            typingSpeed = 1500; // Pause at completion
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            typingSpeed = 500; // Pause before starting next role
        }

        setTimeout(type, typingSpeed);
    }

    // Start typing after initial delay
    setTimeout(type, 1500);

    // --------------------------------------------------
    // 5. 3D GLASS CARD TILT EFFECT & INTERACTIVE GLOW
    // --------------------------------------------------
    const cards = document.querySelectorAll('[data-tilt]');

    cards.forEach(card => {
        // Track the element containing the card glow background
        const glow = card.querySelector('.card-glow');

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            // Mouse coordinates relative to card
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate percentage values for rotation angles
            const midX = rect.width / 2;
            const midY = rect.height / 2;

            // Max tilt angle is 10 degrees
            const maxTilt = 10;
            const rotX = -((y - midY) / midY) * maxTilt;
            const rotY = ((x - midX) / midX) * maxTilt;

            // Apply card rotation transform
            card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`;
            card.style.boxShadow = `0 15px 35px rgba(0, 240, 255, 0.1)`;

            // Update variables for card glow positioning
            if (glow) {
                card.style.setProperty('--mx', `${x}px`);
                card.style.setProperty('--my', `${y}px`);
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            card.style.boxShadow = 'none';
        });
    });

    // --------------------------------------------------
    // 6. SCROLL DETECT NAV STATE & INTERSECTION REVEALS
    // --------------------------------------------------
    const header = document.querySelector('.header');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle active link and navbar header blur
    window.addEventListener('scroll', () => {
        // Nav background change
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Active link on scroll
        let currentSectionId = '';
        sections.forEach(sec => {
            const secTop = sec.offsetTop;
            const secHeight = sec.clientHeight;
            if (window.scrollY >= secTop - 300) {
                currentSectionId = sec.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });

    // Intersection Observer for Scroll Reveals
    const revealElements = document.querySelectorAll('[data-reveal]');
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Apply optional delay
                const delay = entry.target.getAttribute('data-reveal-delay') || 0;
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => revealObserver.observe(el));

    function revealOnLoad() {
        // Reveal initial hero items
        const heroReveals = document.querySelectorAll('#hero [data-reveal]');
        heroReveals.forEach(el => {
            const delay = el.getAttribute('data-reveal-delay') || 0;
            setTimeout(() => {
                el.classList.add('revealed');
            }, delay);
        });
    }

    // --------------------------------------------------
    // 7. MOBILE MENU DRAWER TOGGLE
    // --------------------------------------------------
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    function toggleMobileMenu() {
        mobileBtn.classList.toggle('active');
        mobileNav.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    }

    mobileBtn.addEventListener('click', toggleMobileMenu);

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileNav.classList.contains('active')) {
                toggleMobileMenu();
            }
        });
    });

    // --------------------------------------------------
    // 8. CONTACT FORM SUBMISSION (Web3Forms API Integration)
    // --------------------------------------------------
    const contactForm = document.getElementById('contact-form');
    const formResult = document.getElementById('form-result');

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Basic validation
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('msg-subject').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !subject || !message) {
                showFormMsg('Please fill in all required fields.', 'error');
                return;
            }

            // Web3Forms keys warning checker
            const accessKey = contactForm.querySelector('input[name="access_key"]').value;
            if (accessKey === 'YOUR_ACCESS_KEY_HERE') {
                // Fallback action: Open local mail window if API key is not configured
                showFormMsg('API Access key not configured. Opening your mail app...', 'success');
                setTimeout(() => {
                    const mailtoUrl = `mailto:sinhapratik198@gmail.com?subject=${encodeURIComponent(subject)}&body=Name: ${encodeURIComponent(name)}%0AEmail: ${encodeURIComponent(email)}%0AMessage: ${encodeURIComponent(message)}`;
                    window.location.href = mailtoUrl;
                }, 1000);
                return;
            }

            // Submit using fetch AJAX
            const formData = new FormData(contactForm);
            showFormMsg('Sending message...', 'success');

            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: formData
            })
                .then(async (response) => {
                    let json = await response.json();
                    if (response.status === 200) {
                        showFormMsg('Thank you! Your message has been sent successfully.', 'success');
                        contactForm.reset();
                    } else {
                        console.log(response);
                        showFormMsg(json.message || 'Something went wrong. Please try again.', 'error');
                    }
                })
                .catch(error => {
                    console.log(error);
                    showFormMsg('Form submission failed. Opening email agent...', 'error');
                    // Ultimate fallback
                    setTimeout(() => {
                        window.location.href = `mailto:sinhapratik198@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}%0A%0AFrom: ${encodeURIComponent(name)} (${encodeURIComponent(email)})`;
                    }, 1500);
                });
        });
    }

    function showFormMsg(msg, status) {
        formResult.textContent = msg;
        formResult.className = `form-result ${status}`;

        // Hide message after 5 seconds if success
        if (status === 'success') {
            setTimeout(() => {
                formResult.style.display = 'none';
            }, 6000);
        }
    }
});

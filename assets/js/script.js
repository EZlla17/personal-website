document.addEventListener('DOMContentLoaded', () => {
    const getCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000';
    
    const COLOR_CHARCOAL = getCssVar('--color-charcoal');
    const COLOR_ASH = getCssVar('--color-ash');
    const COLOR_ACCENT = getCssVar('--color-particle-accent');
    
    function parseColor(str) {
        const c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        const xCtx = c.getContext('2d', { willReadFrequently: true });
        xCtx.fillStyle = str;
        xCtx.fillRect(0, 0, 1, 1);
        const data = xCtx.getImageData(0, 0, 1, 1).data;
        return {r: data[0], g: data[1], b: data[2]};
    }
    
    const colorCharcoal = parseColor(COLOR_CHARCOAL);
    const colorAccent = parseColor(COLOR_ACCENT);
    const colorAsh = parseColor(COLOR_ASH);

    const roleInnovator = document.getElementById('role-innovator');
    const rolePrototyper = document.getElementById('role-prototyper');
    let isInnovatorActive = true;
    
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    
    let width, height;
    
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    }
    
    window.addEventListener('resize', () => {
        resizeCanvas();
        starTargetsCache = null; 
        bracketTargetsCache = null;
        generateShape(isInnovatorActive ? 'innovator' : 'prototyper');
    });
    resizeCanvas();

    const TOTAL_PARTICLES = 3000;
    
    let starTargetsCache = null;
    let bracketTargetsCache = null;
    let lastAnchorX = 0;
    
    function buildShapeCaches(anchorLeftX, anchorRightX, centerY, fontSize) {
        if (starTargetsCache && lastAnchorX === anchorLeftX) return;
        lastAnchorX = anchorLeftX;
        
        const w = width, h = height;
        const tmpCvs = document.createElement('canvas');
        const tCtx = tmpCvs.getContext('2d');
        tmpCvs.width = w; tmpCvs.height = h;
        
        const getPoints = (gap, fuzzy = 0) => {
            const data = tCtx.getImageData(0,0,w,h).data;
            const pts = [];
            for(let py=0; py<h; py+=gap) {
                for(let px=0; px<w; px+=gap) {
                    if (data[(py*w+px)*4+3] > 64) {
                        pts.push({
                            x: px + (Math.random()-0.5)*fuzzy,
                            y: py + (Math.random()-0.5)*fuzzy
                        });
                    }
                }
            }
            return pts;
        };

        // 1. Dual Sparkle Stars (Product Innovator)
        tCtx.clearRect(0,0,w,h);
        tCtx.fillStyle = 'black';
        const r = fontSize * 0.4; 
        
        [anchorLeftX, anchorRightX].forEach(x => {
            tCtx.beginPath();
            tCtx.moveTo(x, centerY - r);
            tCtx.quadraticCurveTo(x, centerY, x + r, centerY);
            tCtx.quadraticCurveTo(x, centerY, x, centerY + r);
            tCtx.quadraticCurveTo(x, centerY, x - r, centerY);
            tCtx.quadraticCurveTo(x, centerY, x, centerY - r);
            tCtx.fill();
        });
        starTargetsCache = getPoints(4, 3); 
        
        // 2. Pair of Brackets { } (AI Prototyper)
        tCtx.clearRect(0,0,w,h);
        tCtx.font = `700 ${fontSize * 0.7}px "Cormorant Garamond", Georgia, serif`;
        tCtx.textAlign = 'center'; tCtx.textBaseline = 'middle';
        
        // Pass A: Outline Reinforcement (Stroked)
        tCtx.lineWidth = 2.5;
        tCtx.strokeText('{', anchorLeftX, centerY);
        tCtx.strokeText('}', anchorRightX, centerY);
        const edgePts = getPoints(4, 2); 
        
        // Pass B: Standard Fill
        tCtx.clearRect(0,0,w,h);
        tCtx.fillText('{', anchorLeftX, centerY);
        tCtx.fillText('}', anchorRightX, centerY);
        const fillPts = getPoints(4, 3);
        
        // Combine: Edges will have double (or more) density
        bracketTargetsCache = edgePts.concat(fillPts);
    }

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            // Restrict initial Y to central 70% of screen to avoid busy UI areas
            this.y = (Math.random() * 0.7 + 0.15) * height;
            this.size = Math.random() * 0.8 + 0.6; 
            
            // Extreme reduction in drift for a very calm feel
            this.driftVx = (Math.random() - 0.5) * 0.05;
            this.driftVy = (Math.random() - 0.5) * 0.05;
            
            this.vx = 0;
            this.vy = 0;
            
            this.state = 'free'; 
            this.targetX = 0;
            this.targetY = 0;
            
            // Wobble
            this.wobbleSpeed = Math.random() * 0.002 + 0.001;
            this.wobbleOffset = Math.random() * Math.PI * 2;
            
            // Super-aggressive physics for 5s cycle compliance
            this.spring = Math.random() * 0.01 + 0.008; 
            this.friction = Math.random() * 0.05 + 0.88; 
            
            // Colors
            this.r = colorAsh.r;
            this.g = colorAsh.g;
            this.b = colorAsh.b;
            this.targetR = colorAsh.r;
            this.targetG = colorAsh.g;
            this.targetB = colorAsh.b;
            this.colorLerp = Math.random() * 0.03 + 0.06; // Faster color transitions
        }

        update(time) {
            if (this.state === 'free') {
                this.vx += (this.driftVx - this.vx) * 0.01;
                this.vy += (this.driftVy - this.vy) * 0.01;
                
                if (this.x < -20) this.x += width + 40;
                if (this.x > width + 20) this.x -= width + 40;
                if (this.y < -20) this.y += height + 40;
                if (this.y > height + 20) this.y -= height + 40;
                
            } else if (this.state === 'shape') {
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                
                this.vx += dx * this.spring;
                this.vy += dy * this.spring;
            }
            
            this.vx *= this.friction;
            this.vy *= this.friction;
            
            const speedSq = this.vx*this.vx + this.vy*this.vy;
            if (speedSq > 6.25) { // Increased max speed to 2.5 for snappier movement
                const speed = Math.sqrt(speedSq);
                this.vx = (this.vx / speed) * 2.5;
                this.vy = (this.vy / speed) * 2.5;
            }
            
            this.x += this.vx;
            this.y += this.vy;
            
            // Settling logic: Dampen movement even more once close to target
            if (this.state === 'shape') {
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                if (dx*dx + dy*dy < 1.5) { // Within 1.5px
                    this.vx *= 0.5;
                    this.vy *= 0.5;
                }
            }
            
            this.x += Math.sin(time * this.wobbleSpeed + this.wobbleOffset) * 0.05;
            this.y += Math.cos(time * this.wobbleSpeed + this.wobbleOffset) * 0.05;
            
            this.r += (this.targetR - this.r) * this.colorLerp;
            this.g += (this.targetG - this.g) * this.colorLerp;
            this.b += (this.targetB - this.b) * this.colorLerp;
        }

        draw() {
            let opacity = 1;
            if (this.state === 'free') {
                opacity = 0.25; // Drifting particles are now very subtle
                
                // Keep the bottom 25% and top 15% of the screen clean (UI safety zone)
                const bottomRange = height * 0.75;
                const topRange = height * 0.15;
                
                if (this.y > bottomRange) {
                    opacity *= Math.max(0, 1 - (this.y - bottomRange) / (height * 0.1));
                }
                if (this.y < topRange) {
                    opacity *= Math.max(0, this.y / topRange);
                }
            }
            
            if (opacity <= 0.02) return;
            
            ctx.fillStyle = `rgba(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)}, ${opacity})`;
            ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        }
    }

    const particles = [];
    for(let i=0; i < TOTAL_PARTICLES; i++) {
        particles.push(new Particle());
    }

    function generateShape(type) {
        // Place shapes on both sides of the center
        const centerX = width / 2;
        // Adjusted for perfect visual balance (midway between centered and high)
        const centerY = height / 2 - 20;
        
        // Offset from center based on screen width
        const offset = width > 900 ? 370 : width * 0.42;
        const anchorLeftX = centerX - offset;
        const anchorRightX = centerX + offset;
        
        let fontSize = Math.min(width, height) * 0.8;
        if(width < 768) fontSize = Math.min(width, height) * 0.5;
        
        buildShapeCaches(anchorLeftX, anchorRightX, centerY, fontSize);
        
        // Release ALL active shape particles first
        particles.forEach(p => {
            if (p.state === 'shape') {
                p.state = 'free';
                p.driftVx = (Math.random() - 0.5) * 0.2;
                p.driftVy = (Math.random() - 0.5) * 0.2;
                const isDark = Math.random() < 0.3;
                p.targetR = isDark ? colorCharcoal.r : colorAsh.r;
                p.targetG = isDark ? colorCharcoal.g : colorAsh.g;
                p.targetB = isDark ? colorCharcoal.b : colorAsh.b;
            }
        });

        // Determine targets based on state
        const shapeTargets = type === 'innovator' ? starTargetsCache.slice() : bracketTargetsCache.slice();
        
        // 1. Split targets into Left and Right groups
        const leftTargets = [];
        const rightTargets = [];
        shapeTargets.forEach(t => {
            if (t.x < centerX) leftTargets.push(t);
            else rightTargets.push(t);
        });

        // 2. Prepare random target distributions for more particles than points
        const generateActiveTargets = (sourceTargets, count) => {
            const result = [];
            if (sourceTargets.length === 0) return result;
            for(let i=0; i < count; i++) {
                let base = sourceTargets[Math.floor(Math.random() * sourceTargets.length)];
                result.push({
                    x: base.x + (Math.random()-0.5)*3,
                    y: base.y + (Math.random()-0.5)*3
                });
            }
            return result;
        };

        const leftActiveTargets = generateActiveTargets(leftTargets, TOTAL_PARTICLES / 2);
        const rightActiveTargets = generateActiveTargets(rightTargets, TOTAL_PARTICLES / 2);
        
        // 3. Split free particles into Left and Right pools
        const freePool = particles.filter(p => p.state === 'free');
        const leftFreePool = freePool.filter(p => p.x < centerX);
        const rightFreePool = freePool.filter(p => p.x >= centerX);

        // 4. Assign particles within their respective zones only
        const assignPool = (targets, pool) => {
            targets.forEach(t => {
                if (pool.length === 0) return;
                
                let bestDistSq = Infinity;
                let bestIdx = -1;
                const samples = Math.min(pool.length, 30);
                for (let i = 0; i < samples; i++) {
                    const randIdx = Math.floor(Math.random() * pool.length);
                    const p = pool[randIdx];
                    const dx = p.x - t.x;
                    const dy = p.y - t.y;
                    const distSq = dx*dx + dy*dy;
                    if (distSq < bestDistSq) {
                        bestDistSq = distSq;
                        bestIdx = randIdx;
                    }
                }

                if (bestIdx !== -1) {
                    const bestP = pool[bestIdx];
                    bestP.state = 'shape';
                    bestP.targetX = t.x;
                    bestP.targetY = t.y;
                    bestP.targetR = colorAccent.r;
                    bestP.targetG = colorAccent.g;
                    bestP.targetB = colorAccent.b;
                    
                    pool[bestIdx] = pool[pool.length - 1];
                    pool.pop();
                }
            });
        };

        assignPool(leftActiveTargets, leftFreePool);
        assignPool(rightActiveTargets, rightFreePool);
    }

    const animate = (time) => {
        ctx.clearRect(0, 0, width, height);
        
        particles.forEach(p => {
            p.update(time);
            p.draw();
        });
        
        requestAnimationFrame(animate);
    };

    function toggleRole() {
        isInnovatorActive = !isInnovatorActive;
        
        if (isInnovatorActive) {
            roleInnovator.classList.add('active');
            rolePrototyper.classList.remove('active');
            generateShape('innovator');
        } else {
            roleInnovator.classList.remove('active');
            rolePrototyper.classList.add('active');
            generateShape('prototyper');
        }
    }
    
    roleInnovator.classList.add('active');
    rolePrototyper.classList.remove('active');
    
    setTimeout(() => {
        generateShape('innovator');
        particles.forEach(p => {
            if(p.state === 'shape') {
                p.x = p.targetX;
                p.y = p.targetY;
                p.r = p.targetR;
                p.g = p.targetG;
                p.b = p.targetB;
            }
        });
        requestAnimationFrame(animate);
    }, 150); 
    // --- Pattern Switching Timing ---
    // Start the first pattern change after 2s, then every 5s thereafter
    setTimeout(() => {
        toggleRole();
        setInterval(toggleRole, 5000);
    }, 2000); 

    // Intersection Observer for projects
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const projectObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    const projectItems = document.querySelectorAll('.project-item');
    projectItems.forEach(item => {
        projectObserver.observe(item);
    });
});

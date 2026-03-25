document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('footer-particle-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const getCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000';
    const COLOR_ACCENT = getCssVar('--color-accent');
    
    function parseToRgb(str) {
        const c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        const xCtx = c.getContext('2d', { willReadFrequently: true });
        xCtx.fillStyle = str;
        xCtx.fillRect(0, 0, 1, 1);
        const data = xCtx.getImageData(0, 0, 1, 1).data;
        return {r: data[0], g: data[1], b: data[2]};
    }
    
    const colorAccent = parseToRgb(COLOR_ACCENT);
    let width = 0, height = 0;
    const WORDS = ["DISCOVER", "INNOVATE"];
    let currentWordIndex = 0;
    let wordCaches = [];
    
    let globalFontSize = 50;
    
    function buildShapeCaches() {
        if (width <= 0 || height <= 0) return;
        wordCaches = [];
        const w = width, h = height;
        const tmpCvs = document.createElement('canvas');
        const tCtx = tmpCvs.getContext('2d');
        tmpCvs.width = w; tmpCvs.height = h;

        WORDS.forEach(word => {
            tCtx.clearRect(0, 0, w, h);
            tCtx.font = `800 ${globalFontSize}px "Cormorant Garamond", Georgia, serif`;
            tCtx.textAlign = 'center'; 
            tCtx.textBaseline = 'middle';
            tCtx.letterSpacing = "0.15em";
            tCtx.fillStyle = 'black';
            tCtx.fillText(word, w / 2, h / 2);
            
            const gap = 2; 
            const data = tCtx.getImageData(0, 0, w, h).data;
            const pts = [];
            for (let py = 0; py < h; py += gap) {
                for (let px = 0; px < w; px += gap) {
                    if (data[(py * w + px) * 4 + 3] > 64) {
                        pts.push({ x: px, y: py });
                    }
                }
            }
            pts.sort((a,b) => (a.x - b.x) || (a.y - b.y));
            wordCaches.push(pts);
        });
    }

    const TOTAL_PARTICLES = window.innerWidth < 768 ? 3000 : 5000;
    
    class Particle {
        constructor() {
            this.x = Math.random() * (width || window.innerWidth);
            this.y = Math.random() * (height || 400);
            // Ultra-fine particles for absolute precision
            this.size = Math.random() * 0.35 + 0.4; 
            this.vx = 0;
            this.vy = 0;
            this.targetX = this.x;
            this.targetY = this.y;
            this.spring = 0.008; // Significantly increased for high-speed morphing
            this.friction = 0.88; // Snappier arrival logic
            this.wobbleSpeed = Math.random() * 0.002 + 0.001;
            this.wobbleOffset = Math.random() * Math.PI * 2;
            this.opacity = 0;
        }

        update(time) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            this.vx += dx * this.spring;
            this.vy += dy * this.spring;
            this.vx *= this.friction;
            this.vy *= this.friction;
            this.x += this.vx;
            this.y += this.vy;
            // Persistent organic movement keeps the pattern feeling 'alive' (Matched exactly with hero Section)
            this.x += Math.sin(time * this.wobbleSpeed + this.wobbleOffset) * 0.05;
            this.y += Math.cos(time * this.wobbleSpeed + this.wobbleOffset) * 0.05;
            // Smoothly reach target opacity for a softer fade-in feel
            if (this.opacity < 0.95) this.opacity += 0.05; // Much faster fade-in
        }

        draw() {
            if (this.opacity < 0.1) return;
            ctx.fillStyle = `rgba(${colorAccent.r}, ${colorAccent.g}, ${colorAccent.b}, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const particles = Array.from({ length: TOTAL_PARTICLES }, () => new Particle());
    particles.sort((a,b) => (a.x - b.x) || (a.y - b.y));

    function assignTargets(immediate = false) {
        if (!wordCaches || !wordCaches[currentWordIndex]) return;
        const targets = wordCaches[currentWordIndex];
        if (!targets || !targets.length) return;
        
        // Recalculate horizontal rank to ensure nearest-neighbor morphing
        // This prevents particles from crossing over each other during long-distance shifts
        if (!immediate) {
            particles.sort((a, b) => a.x - b.x);
        }
        
        particles.forEach((p, i) => {
            const targetIdx = Math.floor((i / particles.length) * targets.length);
            const t = targets[targetIdx];
            p.targetX = t.x;
            p.targetY = t.y;
            
            p.opacity = immediate ? 0.95 : 0.65; // Soften the start of the morph
            
            if (immediate) {
                p.x = t.x;
                p.y = t.y;
            }
        });
    }

    const animate = (time) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        particles.forEach(p => {
            p.update(time);
            p.draw();
        });
        requestAnimationFrame(animate);
    };

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        if (rect.width <= 0) return;
        width = rect.width;
        
        // 1. Calculate original text sizing logic based strictly on horizontal width
        const tCtx = document.createElement('canvas').getContext('2d');
        const longestWord = WORDS.reduce((a, b) => a.length > b.length ? a : b);
        let testSize = 100;
        tCtx.font = `800 ${testSize}px "Cormorant Garamond", Georgia, serif`;
        tCtx.letterSpacing = "0.15em";
        const longestTextWidth = tCtx.measureText(longestWord).width;
        
        globalFontSize = ( (width * 0.9) / longestTextWidth ) * testSize;
        // Restore exact original limits: Desktop was 350px * 0.65 = 227.5px. Mobile was 250px * 0.65 = 162.5px.
        const maxFont = width < 768 ? 162.5 : 227.5;
        globalFontSize = Math.min(globalFontSize, maxFont);
        
        // 2. Ultra-tight shrink box for All-Caps (trims invisible font descender space)
        height = globalFontSize * 0.8; 
        canvas.parentElement.style.height = `${height}px`;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 
        buildShapeCaches();
        assignTargets(true); // Jump to position on resize/init
    }
    
    window.addEventListener('resize', resizeCanvas);

    if (window.footerParticleInterval) clearInterval(window.footerParticleInterval);
    window.footerParticleInterval = setInterval(() => {
        currentWordIndex = (currentWordIndex + 1) % WORDS.length;
        assignTargets();
    }, 5000); // Synchronized with hero section at 5s

    document.fonts.ready.then(() => {
        resizeCanvas();
        animate(0);
    });
});

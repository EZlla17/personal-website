document.addEventListener('DOMContentLoaded', () => {
    // --- Header Scroll Show/Hide Logic ---
    let lastScrollY = window.scrollY;
    const siteHeader = document.querySelector('.site-header');

    if (siteHeader) {
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                siteHeader.classList.add('hidden');
            } else {
                siteHeader.classList.remove('hidden');
            }
            lastScrollY = currentScrollY;
        }, { passive: true });
    }

    // --- Sidebar Scroll-Spy Logic ---
    const sideLinks = document.querySelectorAll('.side-nav-link');

    const spyTargets = Array.from(sideLinks)
        .map(link => ({ link, target: document.querySelector(link.getAttribute('href')) }))
        .filter(({ target }) => target !== null);

    if (spyTargets.length === 0) return;

    function setActive(link) {
        sideLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    }

    function updateActiveLink() {
        const scrollY = window.scrollY;
        const viewportH = window.innerHeight;
        const pageH = document.documentElement.scrollHeight;

        // Special case: if scrolled to within 20px of the bottom, activate the last link
        if (scrollY + viewportH >= pageH - 20) {
            setActive(spyTargets[spyTargets.length - 1].link);
            return;
        }

        // Trigger zone: top 30% of viewport
        const triggerOffset = viewportH * 0.30;

        let activeTarget = spyTargets[0];
        for (const pair of spyTargets) {
            const sectionTop = pair.target.getBoundingClientRect().top + scrollY;
            if (sectionTop - triggerOffset <= scrollY) {
                activeTarget = pair;
            }
        }

        setActive(activeTarget.link);
    }

    // Also activate immediately on click, before scroll settles
    sideLinks.forEach(link => {
        link.addEventListener('click', () => {
            setActive(link);
        });
    });

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink(); // Run once on load
});

// --- Image Zoom Logic ---
function openZoomModal(imageSrc, altText) {
    const modal = document.getElementById('imageZoomModal');
    const modalImg = document.getElementById('imageZoomSrc');
    if (!modal || !modalImg) return;
    
    modalImg.src = imageSrc;
    modalImg.alt = altText || 'Zoomed Image';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeZoomModal(event, forceClose = false) {
    // Only close if clicking the background overlay, the close button, or the image itself
    if (forceClose || event.target.id === 'imageZoomModal' || event.target.id === 'imageZoomSrc') {
        const modal = document.getElementById('imageZoomModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Restore background scrolling
            
            // Clear source after animation to prevent flashing old image on next open
            setTimeout(() => {
                document.getElementById('imageZoomSrc').src = '';
            }, 300);
        }
    }
}

// --- Image Switcher Logic ---
function switchLayer(targetId) {
    const targetLayer = document.getElementById(targetId);
    if (!targetLayer) return;
    
    const parent = targetLayer.closest('.cs-image-switcher');
    if (!parent) return;

    // Update Layers
    const layers = parent.querySelectorAll('.switcher-layer');
    layers.forEach(l => l.classList.remove('active'));
    targetLayer.classList.add('active');

    // Update Tabs
    const tabs = parent.querySelectorAll('.switcher-tab');
    tabs.forEach(t => {
        if (t.dataset.target === targetId) t.classList.add('active');
        else t.classList.remove('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Shared listener for any image switcher on the page
    document.querySelectorAll('.cs-image-switcher').forEach(switcher => {
        switcher.querySelectorAll('.switcher-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                switchLayer(tab.dataset.target);
            });
        });
    });

    // --- Play GIF on Visible Logic ---
    const gifObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                if (src && !img.src.includes(src)) {
                    // Re-set src to the data-src to start or restart animation
                    img.src = src;
                }
            }
        });
    }, { threshold: 0.8 }); // Trigger when 80% visible


    document.querySelectorAll('.js-play-on-visible').forEach(img => {
        gifObserver.observe(img);
    });

    // --- Hover GIF Reset Logic ---
    document.querySelectorAll('.cs-hover-gif').forEach(container => {
        const gif = container.querySelector('.gif-overlay');
        if (!gif) return;

        container.addEventListener('mouseenter', () => {
            const currentSrc = gif.src.split('?')[0];
            gif.src = `${currentSrc}?t=${new Date().getTime()}`;
        });
    });
});


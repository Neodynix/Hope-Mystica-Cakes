document.addEventListener('DOMContentLoaded', () => {
    
    // 1. UPDATE YEAR
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // 2. HAMBURGER MENU
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('nav ul');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('open');
        });

        // Close menu when a link is clicked
        document.querySelectorAll('nav ul li a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('open');
            });
        });
    }

    // 3. SCROLL REVEAL (FADE-IN)
    const fadeElements = document.querySelectorAll('.fade-in');
    
    const appearanceOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearanceObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop watching once visible
            }
        });
    }, appearanceOptions);

    fadeElements.forEach(element => {
        appearanceObserver.observe(element);
    });
});
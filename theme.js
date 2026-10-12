/**
 * MEDI-PASS Dark / Light Theme Manager
 * Persistent theme switching with top-right corner toggle button.
 */

(function () {
    const THEME_KEY = 'mediPassTheme';

    function getSavedTheme() {
        try {
            const saved = localStorage.getItem(THEME_KEY);
            if (saved === 'dark' || saved === 'light') return saved;
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        } catch (_) {}
        return 'light';
    }

    function ensureThemeStylesheet() {
        if (!document.querySelector('link[href*="theme.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'theme.css';
            (document.head || document.documentElement).appendChild(link);
        }
    }

    function applyTheme(theme) {
        const isDark = theme === 'dark';
        if (isDark) {
            document.documentElement.classList.add('dark-theme');
            if (document.body) document.body.classList.add('dark-theme');
        } else {
            document.documentElement.classList.remove('dark-theme');
            if (document.body) document.body.classList.remove('dark-theme');
        }
        updateToggleButtons(theme);
        try {
            window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
        } catch (_) {}
    }

    function toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark-theme');
        const nextTheme = isDark ? 'light' : 'dark';
        try {
            localStorage.setItem(THEME_KEY, nextTheme);
        } catch (_) {}
        applyTheme(nextTheme);
    }

    function updateToggleButtons(theme) {
        const isDark = theme === 'dark';
        const btns = document.querySelectorAll('.theme-toggle-btn');
        btns.forEach(btn => {
            if (isDark) {
                btn.innerHTML = '<span class="theme-icon">☀️</span><span class="theme-text">Light</span>';
                btn.setAttribute('aria-label', 'Switch to light mode');
                btn.setAttribute('title', 'Switch to light mode');
                btn.classList.add('is-dark');
            } else {
                btn.innerHTML = '<span class="theme-icon">🌙</span><span class="theme-text">Dark</span>';
                btn.setAttribute('aria-label', 'Switch to dark mode');
                btn.setAttribute('title', 'Switch to dark mode');
                btn.classList.remove('is-dark');
            }
        });
    }

    // 1. Immediately apply saved theme to eliminate flash of unstyled content (FOUC)
    const initialTheme = getSavedTheme();
    if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
    }
    ensureThemeStylesheet();

    // 2. Mount the toggle button into DOM once ready
    function mountThemeToggle() {
        applyTheme(getSavedTheme());

        if (!document.getElementById('mediPassThemeToggle')) {
            const btn = document.createElement('button');
            btn.id = 'mediPassThemeToggle';
            btn.className = 'theme-toggle-btn top-right-toggle';
            btn.type = 'button';
            btn.setAttribute('aria-label', 'Toggle dark and light theme');
            btn.onclick = toggleTheme;
            document.body.appendChild(btn);
            updateToggleButtons(getSavedTheme());
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountThemeToggle);
    } else {
        mountThemeToggle();
    }

    // Global helper
    window.toggleMediPassTheme = toggleTheme;
    window.getCurrentTheme = () => document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
})();

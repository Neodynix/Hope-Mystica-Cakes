// scripts/admin.js - Robust version with forced persistence & refresh

// ==================== CONFIG ====================
const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co'; // ← your project URL from log
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';           // ← double-check this!

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,        // ← This is critical for browser storage
        storage: localStorage        // ← Explicitly use localStorage
    }
});

// DOM elements
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const authMessage = document.getElementById('auth-message');
const userEmailDisplay = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// ==================== AUTH STATE LISTENER ====================
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth Event]', event, session ? 'Session exists' : 'No session');

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || (event === 'INITIAL_SESSION' && session)) {
        // Force refresh session to make sure it's current
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        
        if (freshSession) {
            loginScreen.classList.add('hidden');
            dashboard.classList.remove('hidden');
            userEmailDisplay.textContent = freshSession.user.email || 'Admin';
            await loadCakes();
        }
    } else if (event === 'SIGNED_OUT') {
        dashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

// ==================== INITIAL CHECK + REFRESH ====================
async function init() {
    try {
        // Get & refresh session explicitly on load
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.warn('Initial session error:', error);
        
        // If session exists → show dashboard immediately
        if (session) {
            loginScreen.classList.add('hidden');
            dashboard.classList.remove('hidden');
            userEmailDisplay.textContent = session.user.email;
            await loadCakes();
        }
    } catch (err) {
        console.error('Init auth failed:', err);
    }
}

init();

// ==================== LOGIN HANDLER ====================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    authMessage.textContent = 'Authenticating...';
    authMessage.className = '';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        console.log('[Login Success]', data.user?.email);

        // Force a session refresh right after sign-in (fixes many timing issues)
        await supabase.auth.refreshSession();

        // The listener should catch this, but as fallback:
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            loginScreen.classList.add('hidden');
            dashboard.classList.remove('hidden');
            userEmailDisplay.textContent = session.user.email;
            loginForm.reset();
            await loadCakes();
        }

    } catch (error) {
        console.error('[Login Error]', error);
        authMessage.textContent = error.message || 'Login failed - check credentials or network';
        authMessage.className = 'error-message';
    }
});

// ==================== LOGOUT ====================
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut({ scope: 'global' });
    // Listener will handle UI change
});

// ==================== Your existing loadCakes() and add-cake-form handler go here ====================
// (keep them as they were - just make sure loadCakes() is defined below this block)

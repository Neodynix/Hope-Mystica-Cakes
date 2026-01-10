// scripts/admin.js - Complete working version (tested pattern for vanilla JS + Supabase Auth)

// ==================== CONFIGURATION ====================
const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';      // Your project URL
const SUPABASE_ANON_KEY = 'your-anon-public-key-here';                // ← Replace with your real anon public key!

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: localStorage,
        storageKey: 'sb-admin-session'  // Custom key to avoid conflicts with other apps
    }
});

// ==================== DOM REFERENCES ====================
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const authMessage = document.getElementById('auth-message');
const userEmailDisplay = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// ==================== AUTH STATE LISTENER ====================
supabase.auth.onAuthStateChange((event, session) => {
    console.log('[AUTH EVENT] Event:', event);
    console.log('[AUTH SESSION]', session ? 'Active' : 'None', session?.user?.email);

    if (session) {
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        userEmailDisplay.textContent = session.user.email || 'Admin';
        loadCakes();
    } else {
        dashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

// ==================== INITIAL SESSION CHECK ====================
async function checkInitialSession() {
    console.log('[INIT] Checking for existing session...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('[INIT ERROR]', error);
        return;
    }
    
    if (session) {
        console.log('[INIT] Found session → showing dashboard');
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        userEmailDisplay.textContent = session.user.email;
        loadCakes();
    } else {
        console.log('[INIT] No existing session');
    }
}

checkInitialSession();

// ==================== LOGIN HANDLER ====================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    authMessage.textContent = 'Authenticating...';
    authMessage.className = '';

    try {
        console.log('[LOGIN] Attempting login with:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        console.log('[LOGIN SUCCESS]', data.user?.email, data.session ? 'Session created' : 'No session?!');

        // Critical fixes: Force refresh session and get fresh one
        await supabase.auth.refreshSession();
        const { data: freshData } = await supabase.auth.getSession();

        if (freshData.session) {
            console.log('[REFRESH SUCCESS] Session is now active');
            loginScreen.classList.add('hidden');
            dashboard.classList.remove('hidden');
            userEmailDisplay.textContent = freshData.session.user.email;
            loginForm.reset();
            await loadCakes();
        } else {
            throw new Error('Session missing after successful login - check persistence config');
        }

    } catch (err) {
        console.error('[LOGIN ERROR]', err.message, err);
        authMessage.textContent = err.message || 'Login failed. Check credentials or console.';
        authMessage.className = 'error-message';
    }
});

// ==================== LOGOUT ====================
logoutBtn.addEventListener('click', async () => {
    console.log('[LOGOUT] Signing out...');
    await supabase.auth.signOut({ scope: 'global' });
    // The listener will handle showing the login screen
});

// ==================== LOAD EXISTING CAKES ====================
async function loadCakes() {
    const cakesList = document.getElementById('cakes-list');
    cakesList.innerHTML = '<p class="loading">Loading cakes...</p>';

    try {
        const { data: cakes, error } = await supabase
            .from('cakes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (cakes.length === 0) {
            cakesList.innerHTML = '<p>No cakes added yet.</p>';
            return;
        }

        let html = '';
        const imageBase = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

        cakes.forEach(cake => {
            html += `
                <div class="cake-card">
                    <img src="${imageBase}${cake.image_path}" alt="${cake.title}" 
                         onerror="this.src='https://via.placeholder.com/300x250?text=Image+Error'">
                    <div class="cake-info">
                        <h3>${cake.title}</h3>
                        <p><strong>Category:</strong> ${cake.category}</p>
                        ${cake.weight ? `<p><strong>Weight:</strong> ${cake.weight}</p>` : ''}
                        ${cake.price ? `<p><strong>Price:</strong> UGX ${Number(cake.price).toLocaleString()}/-</p>` : ''}
                        ${cake.description ? `<p>${cake.description}</p>` : ''}
                        <button class="delete-btn" data-id="${cake.id}" data-path="${cake.image_path}">Delete</button>
                    </div>
                </div>`;
        });

        cakesList.innerHTML = html;

        // Attach delete listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });

    } catch (err) {
        console.error('[LOAD CAKES ERROR]', err);
        cakesList.innerHTML = '<p style="color:red;">Failed to load cakes. See console.</p>';
    }
}

// ==================== HANDLE DELETE ====================
async function handleDelete(e) {
    if (!confirm('Delete this cake permanently?')) return;

    const btn = e.target;
    const id = btn.dataset.id;
    const path = btn.dataset.path;

    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
        // Delete image
        await supabase.storage.from('cakes').remove([path]);

        // Delete record
        await supabase.from('cakes').delete().eq('id', id);

        loadCakes();
    } catch (err) {
        console.error('[DELETE ERROR]', err);
        alert('Delete failed: ' + (err.message || 'Unknown error'));
    } finally {
        btn.disabled = false;
        btn.textContent = 'Delete';
    }
}

// ==================== ADD NEW CAKE FORM ====================
document.getElementById('add-cake-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = document.getElementById('message');
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    const weight = document.getElementById('weight').value.trim() || null;
    const price = document.getElementById('price').value ? Number(document.getElementById('price').value) : null;
    const description = document.getElementById('description').value.trim() || null;
    const file = document.getElementById('image').files[0];

    if (!title || !category || !file) {
        message.textContent = 'Please fill required fields and select an image';
        return;
    }

    message.textContent = 'Uploading...';
    progressContainer.classList.remove('hidden');

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload image
        const { error: uploadError } = await supabase.storage
            .from('cakes')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save cake data
        const { error: insertError } = await supabase
            .from('cakes')
            .insert({
                title,
                category,
                weight,
                price,
                description,
                image_path: fileName
            });

        if (insertError) throw insertError;

        message.textContent = 'Cake added successfully!';
        message.className = 'success-message';
        document.getElementById('add-cake-form').reset();
        loadCakes();

    } catch (err) {
        console.error('[UPLOAD ERROR]', err);
        message.textContent = 'Failed: ' + (err.message || 'Unknown error');
        message.className = 'error-message';
    } finally {
        progressContainer.classList.add('hidden');
    }
});

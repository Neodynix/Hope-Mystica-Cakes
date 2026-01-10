// scripts/admin.js

// ==================== CONFIGURATION ====================
const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';           // ← Replace with your project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';             // ← Replace with your anon key

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== DOM ELEMENTS ====================
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const authMessage = document.getElementById('auth-message');
const userEmailDisplay = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// ==================== AUTH STATE LISTENER (Main control) ====================
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session ? 'User present' : 'No user');

    if (session) {
        // User is logged in → show dashboard
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        userEmailDisplay.textContent = session.user.email || 'Admin';
        
        // Load cakes after successful auth
        loadCakes();
    } else {
        // No session → show login
        dashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

// ==================== INITIAL SESSION CHECK ====================
async function initializeAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error checking initial session:', error);
        }
        
        // The listener above will handle showing the correct screen
    } catch (err) {
        console.error('Initialization error:', err);
    }
}

initializeAuth();

// ==================== LOGIN FORM HANDLER ====================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    authMessage.textContent = 'Logging in...';
    authMessage.className = ''; // reset styling

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        console.log('Login successful:', data.user?.email);
        
        // The auth state listener will automatically show dashboard
        // We just need to clear form
        loginForm.reset();
        
    } catch (error) {
        console.error('Login failed:', error);
        authMessage.textContent = error.message || 'Login failed. Please check your credentials.';
        authMessage.className = 'error-message';
    }
});

// ==================== LOGOUT ====================
logoutBtn.addEventListener('click', async () => {
    try {
        await supabase.auth.signOut();
        // The auth listener will handle showing login screen
        console.log('Logged out successfully');
    } catch (err) {
        console.error('Logout error:', err);
    }
});

// ==================== CAKE MANAGEMENT FUNCTIONS ====================

// Load and display existing cakes
async function loadCakes() {
    const cakesList = document.getElementById('cakes-list');
    cakesList.innerHTML = '<p class="loading">Loading cakes...</p>';

    try {
        const { data: cakes, error } = await supabase
            .from('cakes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        let html = '';
        const imageBase = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

        if (cakes.length === 0) {
            cakesList.innerHTML = '<p>No cakes added yet.</p>';
            return;
        }

        cakes.forEach(cake => {
            html += `
                <div class="cake-card">
                    <img src="${imageBase}${cake.image_path}" alt="${cake.title}" onerror="this.src='https://via.placeholder.com/300x250?text=Image+Not+Found'">
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

        // Add delete functionality
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });

    } catch (err) {
        console.error('Error loading cakes:', err);
        cakesList.innerHTML = '<p style="color: red;">Failed to load cakes. Please try again.</p>';
    }
}

// Handle cake deletion
async function handleDelete(e) {
    if (!confirm('Are you sure you want to delete this cake?')) return;

    const btn = e.target;
    const id = btn.dataset.id;
    const path = btn.dataset.path;

    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
        // Delete image from storage
        const { error: storageError } = await supabase.storage
            .from('cakes')
            .remove([path]);

        if (storageError && storageError.message !== 'Object not found') {
            console.warn('Storage delete warning:', storageError);
        }

        // Delete database record
        const { error: dbError } = await supabase
            .from('cakes')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        // Refresh list
        loadCakes();

    } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete cake: ' + (err.message || 'Unknown error'));
    } finally {
        btn.disabled = false;
        btn.textContent = 'Delete';
    }
}

// ==================== FORM SUBMISSION - ADD NEW CAKE ====================
document.getElementById('add-cake-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = document.getElementById('message');
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    // Get form values
    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    const weight = document.getElementById('weight').value.trim() || null;
    const price = document.getElementById('price').value ? Number(document.getElementById('price').value) : null;
    const description = document.getElementById('description').value.trim() || null;
    const file = document.getElementById('image').files[0];

    if (!file) {
        message.textContent = 'Please select an image file';
        return;
    }

    message.textContent = 'Starting upload...';
    progressContainer.classList.remove('hidden');
    progressBar.value = 0;
    progressText.textContent = '0%';

    try {
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${fileExt}`;

        // Upload image
        const { error: uploadError } = await supabase.storage
            .from('cakes')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Save to database
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

        message.textContent = 'Cake successfully added!';
        message.className = 'success-message';
        
        // Reset form
        document.getElementById('add-cake-form').reset();
        
        // Refresh list
        loadCakes();

    } catch (err) {
        console.error('Upload error:', err);
        message.textContent = 'Error: ' + (err.message || 'Something went wrong');
        message.className = 'error-message';
    } finally {
        progressContainer.classList.add('hidden');
    }
});

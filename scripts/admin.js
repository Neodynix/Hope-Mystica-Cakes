// ==================== CONFIGURATION ====================

const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase client initialized");

// ==================== DOM REFERENCES ====================

// Auth
const loginForm       = document.getElementById('login-form');
const loginBtn        = document.getElementById('login-btn');
const loginMessage    = document.getElementById('login-message');
const loginOverlay    = document.getElementById('login-overlay');
const adminMain       = document.getElementById('admin-main');
const logoutBtn       = document.getElementById('logout-btn');
const currentUserEl   = document.getElementById('current-user-email');

// Cake management
const cakesList          = document.getElementById('cakes-list');
const addCakeForm        = document.getElementById('add-cake-form');
const imageInput         = document.getElementById('image');
const fileNameDisplay    = document.getElementById('file-name-display');
const previewContainer   = document.getElementById('image-preview-container');
const previewImg         = document.getElementById('image-preview');
const removeImgBtn       = document.getElementById('remove-img-btn');
const submitBtn          = document.getElementById('submit-btn');
const messageEl          = document.getElementById('message');

// ==================== AUTH STATE LISTENER ====================

supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
        // Logged in
        loginOverlay.classList.add('hidden');
        adminMain.classList.remove('hidden');
        currentUserEl.textContent = session.user.email || 'Admin';
        loadCakes();
    } else {
        // Logged out → show login
        loginOverlay.classList.remove('hidden');
        adminMain.classList.add('hidden');
        cakesList.innerHTML = '';
    }
});

// ==================== INITIAL SESSION CHECK ====================

async function initAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        loginOverlay.classList.add('hidden');
        adminMain.classList.remove('hidden');
        currentUserEl.textContent = session.user.email || 'Admin';
        loadCakes();
    }
}

initAuth();

// ==================== LOGIN HANDLER ====================

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';
        loginMessage.textContent = '';
        loginMessage.style.color = '';

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Success → auth listener will update UI
        } catch (err) {
            console.error("Login error:", err);
            loginMessage.style.color = 'red';
            loginMessage.textContent = err.message.includes('Invalid login credentials')
                ? 'Incorrect email or password'
                : err.message || 'Login failed. Please try again.';
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    });
}

// ==================== LOGOUT ====================

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (!confirm('Log out now?')) return;

        try {
            await supabase.auth.signOut();
            // auth listener will handle UI change
        } catch (err) {
            alert('Logout failed: ' + err.message);
        }
    });
}

// ==================== IMAGE PREVIEW ====================

if (imageInput) {
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        fileNameDisplay.textContent = file.name;

        const reader = new FileReader();
        reader.onload = (ev) => {
            previewImg.src = ev.target.result;
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });
}

if (removeImgBtn) {
    removeImgBtn.addEventListener('click', () => {
        imageInput.value = '';
        fileNameDisplay.textContent = 'Choose an image...';
        previewImg.src = '';
        previewContainer.classList.add('hidden');
    });
}

// ==================== LOAD CAKES ====================

async function loadCakes() {
    if (!cakesList) return;

    cakesList.innerHTML = '<p style="text-align:center; color:#666;">Loading cakes...</p>';

    try {
        const { data: cakes, error } = await supabase
            .from('cakes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!cakes || cakes.length === 0) {
            cakesList.innerHTML = '<p style="text-align:center; color:#888;">No cakes found in gallery.</p>';
            return;
        }

        const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

        cakesList.innerHTML = cakes.map(cake => `
            <div class="cake-card">
                <img src="${storageUrl}${cake.image_path}"
                     alt="${cake.title || 'Cake'}"
                     onerror="this.src='https://via.placeholder.com/300x220?text=No+Image'">

                <div class="cake-info">
                    <h3>${cake.title || 'Untitled'}</h3>
                    <p><strong>Category:</strong> ${cake.category || '—'}</p>
                    <p><strong>Weight:</strong> ${cake.weight || 'N/A'}</p>
                    <p><strong>Price:</strong> ${cake.price ? 'UGX ' + Number(cake.price).toLocaleString() : '—'}</p>

                    <button class="delete-btn"
                            onclick="deleteCake('${cake.id}', '${cake.image_path}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Load cakes error:", err);
        cakesList.innerHTML = `
            <p style="color:red; text-align:center;">
                Failed to load cakes<br>
                ${err.message || 'Unknown error'}
            </p>
        `;
    }
}

// ==================== ADD NEW CAKE ====================

if (addCakeForm) {
    addCakeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = imageInput.files[0];
        if (!file) {
            alert('Please select a cake image.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
        messageEl.textContent = '';
        messageEl.style.color = '';

        try {
            // Clean filename
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const fileName = `${Date.now()}_${cleanName}`;

            // 1. Upload image to storage
            const { error: uploadError } = await supabase.storage
                .from('cakes')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 2. Insert metadata to table
            const { error: insertError } = await supabase
                .from('cakes')
                .insert([{
                    title:       document.getElementById('title').value.trim(),
                    category:    document.getElementById('category').value,
                    weight:      document.getElementById('weight').value.trim() || null,
                    price:       document.getElementById('price').value ? Number(document.getElementById('price').value) : null,
                    description: document.getElementById('description').value.trim() || null,
                    image_path:  fileName
                }]);

            if (insertError) {
                // Rollback: remove uploaded image if DB insert fails
                await supabase.storage.from('cakes').remove([fileName]);
                throw insertError;
            }

            // Success
            messageEl.textContent = 'Cake added successfully!';
            messageEl.style.color = 'green';

            addCakeForm.reset();
            previewContainer.classList.add('hidden');
            fileNameDisplay.textContent = 'Choose an image...';

            loadCakes();

        } catch (err) {
            console.error("Add cake error:", err);
            messageEl.textContent = err.message || 'Failed to add cake.';
            messageEl.style.color = 'red';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload to Gallery';
        }
    });
}

// ==================== DELETE CAKE ====================

window.deleteCake = async (id, imagePath) => {
    if (!confirm('Delete this cake permanently?')) return;

    try {
        // 1. Delete from storage
        const { error: storageError } = await supabase.storage
            .from('cakes')
            .remove([imagePath]);

        if (storageError && storageError.message !== 'Object not found') {
            console.warn("Storage delete warning:", storageError);
        }

        // 2. Delete from table
        const { error: dbError } = await supabase
            .from('cakes')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        loadCakes();
    } catch (err) {
        console.error("Delete error:", err);
        alert('Could not delete cake: ' + (err.message || 'Unknown error'));
    }
};

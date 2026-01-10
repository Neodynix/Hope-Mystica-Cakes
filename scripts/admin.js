// === CONFIGURE YOUR SUPABASE DETAILS HERE ===
const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if already logged in on page load
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showDashboard(session.user.email);
        loadCakes();
    }
}

checkAuth();

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('auth-message');

    message.textContent = 'Logging in...';

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        message.textContent = error.message;
    } else {
        showDashboard(data.user.email);
        loadCakes();
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('auth-message').textContent = '';
});

// Show dashboard
function showDashboard(email) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    document.getElementById('user-email').textContent = email;
}

// Add cake
document.getElementById('add-cake-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = document.getElementById('message');
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    const weight = document.getElementById('weight').value || null;
    const price = document.getElementById('price').value ? Number(document.getElementById('price').value) : null;
    const description = document.getElementById('description').value || null;
    const file = document.getElementById('image').files[0];

    if (!file) {
        message.textContent = 'Please select an image';
        return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    message.textContent = 'Uploading image...';
    progressContainer.classList.remove('hidden');

    // Upload image (requires user to be authenticated)
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cakes')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        message.textContent = 'Upload failed: ' + uploadError.message;
        progressContainer.classList.add('hidden');
        return;
    }

    // Insert database record
    const { error: dbError } = await supabase
        .from('cakes')
        .insert({
            title,
            category,
            description,
            weight,
            price,
            image_path: fileName
        });

    if (dbError) {
        message.textContent = 'Failed to save cake: ' + dbError.message;
    } else {
        message.textContent = 'Cake added successfully!';
        document.getElementById('add-cake-form').reset();
        loadCakes();
    }

    progressContainer.classList.add('hidden');
});

// Load and display cakes
async function loadCakes() {
    const { data: cakes, error } = await supabase
        .from('cakes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        document.getElementById('cakes-list').innerHTML = '<p>Error loading cakes</p>';
        return;
    }

    let html = '';
    const imageBase = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

    cakes.forEach(cake => {
        html += `
            <div class="cake-card">
                <img src="${imageBase}${cake.image_path}" alt="${cake.title}">
                <div class="cake-info">
                    <h3>${cake.title}</h3>
                    <p><strong>Category:</strong> ${cake.category}</p>
                    ${cake.weight ? `<p><strong>Weight:</strong> ${cake.weight}</p>` : ''}
                    ${cake.price ? `<p><strong>Price:</strong> UGX ${cake.price.toLocaleString()}/-</p>` : ''}
                    ${cake.description ? `<p>${cake.description}</p>` : ''}
                    <button class="delete-btn" data-id="${cake.id}" data-path="${cake.image_path}">Delete</button>
                </div>
            </div>`;
    });

    document.getElementById('cakes-list').innerHTML = html || '<p>No cakes yet.</p>';

    // Delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Delete this cake permanently?')) return;

            const id = btn.dataset.id;
            const path = btn.dataset.path;

            // Delete image
            await supabase.storage.from('cakes').remove([path]);

            // Delete record
            await supabase.from('cakes').delete().eq('id', id);

            loadCakes();
        });
    });
                                                       }

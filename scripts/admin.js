// scripts/admin.js
const SUPABASE_URL = 'https://maotqbvahqunerrcjmnj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_I12go3As_fRPeyVofz7ulg_29_EMPjL';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simple client-side auth (for demo/admin use only - replace with proper auth in production)
const ADMIN_CREDENTIALS = {
    email: 'isaacsemwogerere37@gmail.com',    // Change this
    password: 'Izzonix@#18'        // Change this
};

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('auth-message');

    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        loadCakes();
    } else {
        message.textContent = 'Invalid email or password';
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('auth-message').textContent = '';
});

document.getElementById('add-cake-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = document.getElementById('message');
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    const weight = document.getElementById('weight').value || null;
    const price = document.getElementById('price').value || null;
    const description = document.getElementById('description').value || null;
    const file = document.getElementById('image').files[0];

    if (!file) {
        message.textContent = 'Please select an image';
        return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = fileName;

    message.textContent = 'Uploading...';
    progressContainer.classList.remove('hidden');

    // Upload image
    const { error: uploadError } = await supabase.storage
        .from('cakes')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        message.textContent = 'Upload failed: ' + uploadError.message;
        progressContainer.classList.add('hidden');
        return;
    }

    // Insert cake record
    const { error: dbError } = await supabase
        .from('cakes')
        .insert({
            title,
            category,
            description,
            weight,
            price: price ? Number(price) : null,
            image_path: filePath
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
                    <button class="delete-btn" data-id="${cake.id}">Delete Cake</button>
                </div>
            </div>`;
    });

    document.getElementById('cakes-list').innerHTML = html || '<p>No cakes yet.</p>';

    // Add delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (confirm('Delete this cake?')) {
                const { data: cake } = await supabase.from('cakes').select('image_path').eq('id', id).single();
                await supabase.storage.from('cakes').remove([cake.image_path]);
                await supabase.from('cakes').delete().eq('id', id);
                loadCakes();
            }
        });
    });
  }

// ==================== CONFIGURATION ====================
const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo'; 

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== DOM REFERENCES ====================
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('admin-dashboard');
const cakesList = document.getElementById('cakes-list');
const addCakeForm = document.getElementById('add-cake-form');

// ==================== BYPASS LOGIN ====================
// Force the dashboard to show immediately on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log("Login bypassed. Checking connection...");
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loadCakes();
});

// ==================== LOAD CAKES ====================
async function loadCakes() {
    cakesList.innerHTML = '<p class="loading">Fetching cakes from database...</p>';

    try {
        const { data: cakes, error } = await supabase
            .from('cakes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!cakes || cakes.length === 0) {
            cakesList.innerHTML = '<p>The database is empty. Add your first cake!</p>';
            return;
        }

        const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

        cakesList.innerHTML = cakes.map(cake => `
            <div class="cake-card">
                <img src="${storageUrl}${cake.image_path}" alt="${cake.title}" 
                     onerror="this.src='https://via.placeholder.com/300x250?text=Image+Missing'">
                <div class="cake-info">
                    <h3>${cake.title}</h3>
                    <p><strong>Category:</strong> ${cake.category}</p>
                    <p><strong>Price:</strong> UGX ${cake.price ? Number(cake.price).toLocaleString() : 'N/A'}</p>
                    <button class="delete-btn" onclick="deleteCake('${cake.id}', '${cake.image_path}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Fetch Error:', err);
        cakesList.innerHTML = `<div style="padding:20px; color:red; border:1px solid red;">
            <strong>Connection Error:</strong> ${err.message}<br>
            Check if your Supabase URL and Anon Key are correct.
        </div>`;
    }
}

// ==================== ADD CAKE HANDLER ====================
addCakeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = addCakeForm.querySelector('button[type="submit"]');
    const message = document.getElementById('message');
    const file = document.getElementById('image').files[0];
    
    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    const weight = document.getElementById('weight').value;
    const price = document.getElementById('price').value;
    const description = document.getElementById('description').value;

    if (!file) {
        alert("Please select an image file first.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading to Supabase...';

    try {
        // 1. Upload Image
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('cakes')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 2. Insert Data
        const { error: insertError } = await supabase
            .from('cakes')
            .insert([{
                title,
                category,
                weight,
                price: price ? parseInt(price) : null,
                description,
                image_path: fileName
            }]);

        if (insertError) throw insertError;

        message.textContent = 'Success! Cake added to gallery.';
        message.style.color = 'green';
        addCakeForm.reset();
        loadCakes();

    } catch (err) {
        console.error('Upload Error:', err);
        message.textContent = `Upload failed: ${err.message}`;
        message.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Cake';
    }
});

// ==================== DELETE CAKE HANDLER ====================
window.deleteCake = async (id, path) => {
    if (!confirm('Permanently delete this item?')) return;

    try {
        await supabase.storage.from('cakes').remove([path]);
        const { error } = await supabase.from('cakes').delete().eq('id', id);
        if (error) throw error;
        loadCakes();
    } catch (err) {
        alert(`Delete failed: ${err.message}`);
    }
};

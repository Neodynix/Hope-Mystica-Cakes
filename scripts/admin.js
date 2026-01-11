// scripts/admin.js

// ==================== CONFIGURATION ====================
// Replace with your actual Anon Key from Supabase Project Settings
const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY = 'your-actual-anon-key-here'; 

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: localStorage
    }
});

// ==================== DOM REFERENCES ====================
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const authMessage = document.getElementById('auth-message');
const userEmailDisplay = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const cakesList = document.getElementById('cakes-list');
const addCakeForm = document.getElementById('add-cake-form');

// ==================== AUTH STATE LISTENER ====================
// This is the brain of the script. It reacts whenever a user logs in or out.
supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[AUTH EVENT]: ${event}`);

    if (session) {
        // Logged In
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        userEmailDisplay.textContent = session.user.email;
        loadCakes();
    } else {
        // Logged Out
        dashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        userEmailDisplay.textContent = '';
        cakesList.innerHTML = ''; 
    }
});

// ==================== LOGIN HANDLER ====================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    authMessage.textContent = 'Verifying credentials...';
    authMessage.style.color = '#666';

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        console.error('Login Error:', error.message);
        authMessage.textContent = error.message;
        authMessage.style.color = 'red';
    } else {
        authMessage.textContent = '';
        loginForm.reset();
    }
});

// ==================== LOGOUT HANDLER ====================
logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout Error:', error.message);
});

// ==================== LOAD CAKES ====================
async function loadCakes() {
    cakesList.innerHTML = '<p>Loading cakes...</p>';

    try {
        const { data: cakes, error } = await supabase
            .from('cakes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!cakes || cakes.length === 0) {
            cakesList.innerHTML = '<p>No cakes found in the database.</p>';
            return;
        }

        // Supabase Storage Public URL structure
        const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

        cakesList.innerHTML = cakes.map(cake => `
            <div class="cake-card">
                <img src="${storageUrl}${cake.image_path}" alt="${cake.title}" 
                     onerror="this.src='https://via.placeholder.com/300x250?text=Image+Not+Found'">
                <div class="cake-info">
                    <h3>${cake.title}</h3>
                    <p><strong>Category:</strong> ${cake.category}</p>
                    <p><strong>Price:</strong> UGX ${cake.price ? Number(cake.price).toLocaleString() : 'N/A'}</p>
                    <button class="delete-btn" onclick="deleteCake('${cake.id}', '${cake.image_path}')">
                        <i class="fas fa-trash"></i> Delete Cake
                    </button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Fetch Error:', err);
        cakesList.innerHTML = `<p style="color:red;">Error loading cakes: ${err.message}</p>`;
    }
}

// ==================== ADD CAKE HANDLER ====================
addCakeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = addCakeForm.querySelector('button[type="submit"]');
    const message = document.getElementById('message');
    const file = document.getElementById('image').files[0];
    
    // Prepare data
    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    const weight = document.getElementById('weight').value;
    const price = document.getElementById('price').value;
    const description = document.getElementById('description').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    try {
        // 1. Upload Image to Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('cakes')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 2. Insert Record into Database
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

        // Success
        message.textContent = 'Cake added successfully!';
        message.style.color = 'green';
        addCakeForm.reset();
        loadCakes();

    } catch (err) {
        console.error('Upload Process Error:', err);
        message.textContent = `Error: ${err.message}`;
        message.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Cake';
    }
});

// ==================== DELETE CAKE HANDLER ====================
window.deleteCake = async (id, path) => {
    if (!confirm('Are you sure you want to delete this cake?')) return;

    try {
        // Delete from Storage
        await supabase.storage.from('cakes').remove([path]);
        
        // Delete from Database
        const { error } = await supabase.from('cakes').delete().eq('id', id);
        
        if (error) throw error;
        
        loadCakes();
    } catch (err) {
        alert(`Delete failed: ${err.message}`);
    }
};

// ==================== CONFIGURATION ====================

const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';

// ✅ FIX: use a DIFFERENT variable name
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase client initialized");

// ==================== DOM REFERENCES ====================

const loginForm     = document.getElementById('login-form');
const loginBtn      = document.getElementById('login-btn');
const loginMessage  = document.getElementById('login-message');
const loginOverlay  = document.getElementById('login-overlay');
const adminMain     = document.getElementById('admin-main');
const logoutBtn     = document.getElementById('logout-btn');
const currentUserEl = document.getElementById('current-user-email');

const cakesList        = document.getElementById('cakes-list');
const addCakeForm      = document.getElementById('add-cake-form');
const imageInput       = document.getElementById('image');
const fileNameDisplay  = document.getElementById('file-name-display');
const previewContainer = document.getElementById('image-preview-container');
const previewImg       = document.getElementById('image-preview');
const removeImgBtn     = document.getElementById('remove-img-btn');
const submitBtn        = document.getElementById('submit-btn');
const messageEl        = document.getElementById('message');

// ==================== AUTH STATE LISTENER ====================

sb.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    loginOverlay.classList.add('hidden');
    adminMain.classList.remove('hidden');
    currentUserEl.textContent = session.user.email;
    loadCakes();
  } else {
    loginOverlay.classList.remove('hidden');
    adminMain.classList.add('hidden');
    cakesList.innerHTML = '';
  }
});

// ==================== INITIAL SESSION CHECK ====================

async function initAuth() {
  const { data } = await sb.auth.getSession();
  if (data.session?.user) {
    loginOverlay.classList.add('hidden');
    adminMain.classList.remove('hidden');
    currentUserEl.textContent = data.session.user.email;
    loadCakes();
  }
}
initAuth();

// ==================== LOGIN ====================

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';
  loginMessage.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    loginMessage.style.color = 'red';
    loginMessage.textContent = 'Invalid email or password';
  }

  loginBtn.disabled = false;
  loginBtn.textContent = 'Sign In';
});

// ==================== LOGOUT ====================

logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
});
// ==================== INITIALIZE ====================
window.addEventListener('DOMContentLoaded', () => {
loadCakes();
});

// ==================== IMAGE PREVIEW ====================
imageInput.addEventListener('change', e => {
const file = e.target.files[0];
if (!file) return;

fileNameDisplay.textContent = file.name;    
const reader = new FileReader();    
reader.onload = ev => {    
    previewImg.src = ev.target.result;    
    previewContainer.classList.remove('hidden');    
};    
reader.readAsDataURL(file);

});

removeImgBtn.addEventListener('click', () => {
imageInput.value = "";
fileNameDisplay.textContent = "Choose an image...";
previewImg.src = "";
previewContainer.classList.add('hidden');
});

// ==================== LOAD CAKES ====================

async function loadCakes() {
  const { data, error } = await sb.from('cakes').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);

  const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

  cakesList.innerHTML = data.map(cake => `
    <div class="cake-card">
      <img src="${storageUrl}${cake.image_path}">
      <div class="cake-info">
        <h3>${cake.title}</h3>
        <p>UGX ${cake.price?.toLocaleString()}</p>
        <button class="delete-btn" onclick="deleteCake('${cake.id}','${cake.image_path}')">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}


// ==================== ADD CAKE ====================
addCakeForm.addEventListener('submit', async e => {
e.preventDefault();

const submitBtn = document.getElementById('submit-btn');    
const message = document.getElementById('message');    
const file = imageInput.files[0];    

if (!file) {    
    alert("Please select an image.");    
    return;    
}    

submitBtn.disabled = true;    
submitBtn.textContent = 'Uploading...';    
message.textContent = '';    

try {    
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');    
    const fileName = `${Date.now()}_${cleanName}`;    

    // 1️⃣ Upload image    
    const { error: uploadError } = await supabaseClient    
        .storage    
        .from('cakes')    
        .upload(fileName, file);    

    if (uploadError) throw uploadError;    

    // 2️⃣ Insert record    
    const { error: insertError } = await supabaseClient    
        .from('cakes')    
        .insert([{    
            title: document.getElementById('title').value,    
            category: document.getElementById('category').value,    
            weight: document.getElementById('weight').value,    
            price: document.getElementById('price').value || null,    
            description: document.getElementById('description').value,    
            image_path: fileName    
        }]);    

    if (insertError) {    
        await supabaseClient.storage.from('cakes').remove([fileName]);    
        throw insertError;    
    }    

    message.textContent = "Cake added successfully!";    
    message.style.color = "green";    

    addCakeForm.reset();    
    previewContainer.classList.add('hidden');    
    fileNameDisplay.textContent = "Choose an image...";    

    loadCakes();    

} catch (err) {    
    console.error(err);    
    message.textContent = err.message;    
    message.style.color = "red";    
} finally {    
    submitBtn.disabled = false;    
    submitBtn.textContent = 'Upload to Gallery';    
}

});
                 
// ==================== DELETE CAKE ====================
window.deleteCake = async (id, path) => {
if (!confirm("Delete this cake?")) return;

try {    
    await supabaseClient.storage.from('cakes').remove([path]);    

    const { error } = await supabaseClient    
        .from('cakes')    
        .delete()    
        .eq('id', id);    

    if (error) throw error;    

    loadCakes();    
} catch (err) {    
    alert("Delete failed: " + err.message);    
}

};
                                                                       

// ==================== MOBILE HAMBURGER MENU ====================

const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
const mobileUserEmail = document.getElementById('mobile-user-email');

// Toggle mobile menu
if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!hamburgerBtn?.contains(e.target) && !mobileMenu?.contains(e.target)) {
        mobileMenu?.classList.remove('active');
    }
});

// Sync user email to mobile version too
supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
        // ... your existing code ...

        if (mobileUserEmail) {
            mobileUserEmail.textContent = session.user.email || 'Admin';
        }
    }
});

// Mobile logout (same as desktop)
if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', async () => {
        if (!confirm('Log out now?')) return;
        await supabase.auth.signOut();
    });
    }

// ==================== CONFIGURATION ====================

const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';

// Use ONE consistent client name
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase client initialized");

// ==================== DOM REFERENCES ====================

const loginForm        = document.getElementById('login-form');
const loginBtn         = document.getElementById('login-btn');
const loginMessage     = document.getElementById('login-message');
const loginOverlay     = document.getElementById('login-overlay');
const adminMain        = document.getElementById('admin-main');
const logoutBtn        = document.getElementById('logout-btn');
const currentUserEl    = document.getElementById('current-user-email');
const cakesList        = document.getElementById('cakes-list');
const addCakeForm      = document.getElementById('add-cake-form');
const imageInput       = document.getElementById('image');
const fileNameDisplay  = document.getElementById('file-name-display');
const previewContainer = document.getElementById('image-preview-container');
const previewImg       = document.getElementById('image-preview');
const removeImgBtn     = document.getElementById('remove-img-btn');
const submitBtn        = document.getElementById('submit-btn');
const messageEl        = document.getElementById('message');

// Mobile menu elements
const hamburgerBtn     = document.getElementById('hamburger-btn');
const mobileMenu       = document.getElementById('mobile-menu');
const mobileLogoutBtn  = document.getElementById('mobile-logout-btn');
const mobileUserEmail  = document.getElementById('mobile-user-email');

// ==================== AUTH STATE LISTENER ====================

supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    loginOverlay.classList.add('hidden');
    adminMain.classList.remove('hidden');
    currentUserEl.textContent    = session.user.email || 'Admin';
    if (mobileUserEmail) mobileUserEmail.textContent = session.user.email || 'Admin';
    loadCakes();
  } else {
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
    if (mobileUserEmail) mobileUserEmail.textContent = session.user.email || 'Admin';
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

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    loginMessage.style.color = 'red';
    loginMessage.textContent = error.message || 'Invalid email or password';
  }

  loginBtn.disabled = false;
  loginBtn.textContent = 'Sign In';
});

// ==================== LOGOUT ====================

async function handleLogout() {
  if (!confirm('Log out now?')) return;
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert("Logout failed: " + error.message);
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', handleLogout);
}
if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener('click', handleLogout);
}

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
  if (!cakesList) return;

  cakesList.innerHTML = '<p style="text-align:center">Loading cakes...</p>';

  try {
    const { data, error } = await supabase
      .from('cakes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      cakesList.innerHTML = '<p style="text-align:center">No cakes found.</p>';
      return;
    }

    const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

    cakesList.innerHTML = data.map(cake => `
      <div class="cake-card">
        <img src="${storageUrl}${cake.image_path}"
             alt="${cake.title || 'Cake'}"
             onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">
        <div class="cake-info">
          <h3>${cake.title || 'Untitled'}</h3>
          <p>UGX ${cake.price ? Number(cake.price).toLocaleString() : '—'}</p>
          <button class="delete-btn" onclick="deleteCake('${cake.id}','${cake.image_path}')">
            Delete
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
    cakesList.innerHTML = `<p style="color:red; text-align:center">Error: ${err.message}</p>`;
  }
}

// ==================== ADD CAKE ====================

addCakeForm.addEventListener('submit', async e => {
  e.preventDefault();

  const file = imageInput.files[0];
  if (!file) {
    alert("Please select an image.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';
  messageEl.textContent = '';
  messageEl.style.color = '';

  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${Date.now()}_${cleanName}`;

    // 1. Upload image
    const { error: uploadError } = await supabase
      .storage
      .from('cakes')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // 2. Insert record
    const { error: insertError } = await supabase
      .from('cakes')
      .insert([{
        title:       document.getElementById('title').value.trim(),
        category:    document.getElementById('category').value,
        weight:      document.getElementById('weight').value.trim() || null,
        price:       Number(document.getElementById('price').value) || null,
        description: document.getElementById('description').value.trim(),
        image_path:  fileName
      }]);

    if (insertError) {
      // Cleanup uploaded file if DB insert fails
      await supabase.storage.from('cakes').remove([fileName]);
      throw insertError;
    }

    messageEl.textContent = "Cake added successfully!";
    messageEl.style.color = "green";

    addCakeForm.reset();
    previewContainer.classList.add('hidden');
    fileNameDisplay.textContent = "Choose an image...";

    loadCakes();

  } catch (err) {
    console.error(err);
    messageEl.textContent = err.message || "Failed to add cake";
    messageEl.style.color = "red";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload to Gallery';
  }
});

// ==================== DELETE CAKE ====================

window.deleteCake = async (id, path) => {
  if (!confirm("Delete this cake? This cannot be undone.")) return;

  try {
    // 1. Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from('cakes')
      .remove([path]);

    if (storageError) console.warn("Storage delete failed:", storageError);

    // 2. Delete from table
    const { error: dbError } = await supabase
      .from('cakes')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    loadCakes();
  } catch (err) {
    console.error(err);
    alert("Delete failed: " + (err.message || "Unknown error"));
  }
};

// ==================== MOBILE HAMBURGER MENU ====================

if (hamburgerBtn && mobileMenu) {
  hamburgerBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!hamburgerBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('active');
    }
  });
  }

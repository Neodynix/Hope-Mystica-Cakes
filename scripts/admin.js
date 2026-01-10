// scripts/admin.js
// ============================================
// STEP 1: Configure your Supabase credentials
// ============================================
const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';

// Initialize Supabase client
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// STEP 2: DOMContentLoaded - Main initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {

  // DOM elements
  const loginSection = document.getElementById('login-screen');
  const adminContainer = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('auth-message');
  const logoutBtn = document.getElementById('logout-btn');
  const addCakeForm = document.getElementById('add-cake-form');

  // ============================================
  // Utility: Show login error/status
  // ============================================
  function showLoginMessage(message, color = 'red') {
    loginError.style.display = 'block';
    loginError.style.color = color;
    loginError.textContent = message;
  }

  // ============================================
  // Initialize admin after login
  // ============================================
  const initAdmin = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error fetching user:', error);
      return;
    }

    if (user) {
      document.getElementById('user-email').textContent = user.email || 'Admin';
      await loadCakes();
    }
  };

  // ============================================
  // Check if user is already logged in
  // ============================================
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) console.error('Session check error:', sessionError);

  if (session) {
    // User is logged in
    loginSection.style.display = 'none';
    adminContainer.style.display = 'block';
    await initAdmin();
  } else {
    // User not logged in
    loginSection.style.display = 'flex';
    adminContainer.style.display = 'none';
  }

  // ============================================
  // LOGIN FORM SUBMIT
  // ============================================
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    showLoginMessage('🔄 Signing in...', '#555');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      showLoginMessage('✅ Login successful!', 'green');
      loginForm.reset();

    } catch (error) {
      console.error('Login error:', error);
      showLoginMessage(error.message || '❌ Login failed', 'red');
    }
  });

  // ============================================
  // LOGOUT
  // ============================================
  logoutBtn.addEventListener('click', async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
    }
  });

  // ============================================
  // ADD CAKE FORM
  // ============================================
  addCakeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    const weight = document.getElementById('weight').value.trim();
    const price = document.getElementById('price').value;
    const description = document.getElementById('description').value.trim();
    const imageFile = document.getElementById('image').files[0];

    const messageEl = document.getElementById('message');
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    // Validation
    if (!title || !category || !imageFile) {
      messageEl.textContent = 'Please fill in all required fields.';
      messageEl.style.color = 'red';
      return;
    }

    // File validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(imageFile.type)) {
      messageEl.textContent = 'Please upload a JPG or PNG image.';
      messageEl.style.color = 'red';
      return;
    }
    if (imageFile.size > maxSize) {
      messageEl.textContent = 'Image must be less than 5MB.';
      messageEl.style.color = 'red';
      return;
    }

    try {
      // Show progress
      progressDiv.classList.remove('hidden');
      messageEl.textContent = 'Uploading image...';
      messageEl.style.color = '#00C4B4';

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cakes')
        .upload(fileName, imageFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      progressBar.value = 50;
      progressText.textContent = '50%';

      // Insert into database
      const { data: insertData, error: insertError } = await supabase
        .from('cakes')
        .insert([{
          title,
          category,
          weight: weight || null,
          price: price ? parseFloat(price) : null,
          description: description || null,
          image_path: fileName
        }]);
      if (insertError) {
        // Remove uploaded image if DB insert fails
        await supabase.storage.from('cakes').remove([fileName]);
        throw insertError;
      }

      // Success
      progressBar.value = 100;
      progressText.textContent = '100%';
      messageEl.textContent = '✅ Cake added successfully!';
      messageEl.style.color = 'green';
      addCakeForm.reset();

      setTimeout(() => {
        progressDiv.classList.add('hidden');
        progressBar.value = 0;
        progressText.textContent = '0%';
        messageEl.textContent = '';
      }, 2000);

      await loadCakes();

    } catch (error) {
      console.error('Upload error:', error);
      messageEl.textContent = `❌ Error: ${error.message}`;
      messageEl.style.color = 'red';
      progressDiv.classList.add('hidden');
      progressBar.value = 0;
      progressText.textContent = '0%';
    }
  });

  // ============================================
  // LOAD CAKES
  // ============================================
  async function loadCakes() {
    const cakesList = document.getElementById('cakes-list');

    try {
      const { data: cakes, error } = await supabase
        .from('cakes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      if (!cakes || cakes.length === 0) {
        cakesList.innerHTML = '<p style="text-align:center; color:#666; padding:2rem;">No cakes added yet.</p>';
        return;
      }

      const imageBase = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;
      let html = '';
      cakes.forEach(cake => {
        html += `
          <div class="cake-card">
            <img src="${imageBase}${cake.image_path}" alt="${cake.title}" loading="lazy">
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

      // Delete functionality
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Are you sure you want to delete this cake?')) return;
          const cakeId = btn.dataset.id;
          const imagePath = btn.dataset.path;

          try {
            await supabase.storage.from('cakes').remove([imagePath]);
            const { error: dbError } = await supabase.from('cakes').delete().eq('id', cakeId);
            if (dbError) throw dbError;
            await loadCakes();
          } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete cake.');
          }
        };
      });

    } catch (error) {
      console.error('Load cakes error:', error);
      cakesList.innerHTML = '<p style="text-align:center; color:red; padding:2rem;">Error loading cakes. Refresh page.</p>';
    }
  }

  // ============================================
  // AUTH STATE CHANGE (SIGN IN / SIGN OUT)
  // ============================================
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');

    if (event === 'SIGNED_OUT') {
      loginSection.style.display = 'flex';
      adminContainer.style.display = 'none';
    } else if (event === 'SIGNED_IN' && session) {
      showLoginMessage('', 'green');
      loginSection.style.display = 'none';
      adminContainer.style.display = 'block';
      await initAdmin();
    }
  });

});

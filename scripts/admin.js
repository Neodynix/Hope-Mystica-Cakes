// scripts/admin.js - Updated to match your requested structure

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';        // ← Change this
const SUPABASE_ANON_KEY = 'your-public-anon-key';               // ← Change this

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  const loginSection = document.getElementById('login-screen');     // ← matches your ID
  const adminContainer = document.getElementById('admin-dashboard'); // ← matches your ID
  const loginForm = document.getElementById('login-form');          // ← form ID
  const loginError = document.getElementById('auth-message');       // ← error message ID
  const logoutBtn = document.getElementById('logout-btn');

  // Helper to initialize admin features (upload form, list cakes, etc.)
  const initAdmin = async () => {
    document.getElementById('user-email').textContent = supabase.auth.user()?.email || 'Admin';
    await loadCakes(); // Your existing loadCakes() function
    // Add any other admin init logic here if needed
  };

  // Check if user is already logged in
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Session check error:', sessionError);
  }

  if (session) {
    loginSection.style.display = 'none';
    adminContainer.style.display = 'block';
    await initAdmin();
  } else {
    loginSection.style.display = 'block';
    adminContainer.style.display = 'none';
  }

  // Login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    loginError.textContent = 'Logging in...';
    loginError.style.display = 'block';
    loginError.style.color = '#666';

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      loginError.textContent = error.message;
      loginError.style.color = 'red';
    } else {
      loginError.style.display = 'none';
      loginSection.style.display = 'none';
      adminContainer.style.display = 'block';
      await initAdmin();
    }
  });

  // Logout button
  logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
    } else {
      window.location.reload(); // Fresh start after logout
    }
  });

  // Optional: expose logout globally if needed
  window.logout = async () => {
    logoutBtn.click();
  };

  // Keep your existing loadCakes, add-cake-form logic below this point
  // (Just paste the rest of your previous admin.js code here: add-cake-form listener, loadCakes(), etc.)

  // Example placeholder for loadCakes (replace with your full version)
  async function loadCakes() {
    const { data: cakes, error } = await supabase
      .from('cakes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      document.getElementById('cakes-list').innerHTML = '<p>Error loading cakes.</p>';
      console.error(error);
      return;
    }

    const imageBase = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;
    let html = '';

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

    document.getElementById('cakes-list').innerHTML = html || '<p>No cakes added yet.</p>';

    // Delete functionality
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Delete this cake permanently?')) {
          const id = btn.dataset.id;
          const path = btn.dataset.path;
          await supabase.storage.from('cakes').remove([path]);
          await supabase.from('cakes').delete().eq('id', id);
          loadCakes();
        }
      };
    });
  }

  // Add your add-cake-form submission listener here (same as before)
  document.getElementById('add-cake-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // ... your existing upload logic
    // (copy-paste from previous version)
  });
});

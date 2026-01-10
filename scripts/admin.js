// scripts/admin.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ======== Supabase Config ========
const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======== DOM Elements ========
const loginSection = document.getElementById('login-section');
const adminContainer = document.getElementById('admin-container');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const loadingPopup = document.getElementById('loading-popup');

const addCakeForm = document.getElementById('add-cake-form');
const cakesList = document.getElementById('cakes-list');

const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

// ======== Utility Functions ========
function showLoading(show = true) {
  loadingPopup.style.display = show ? 'flex' : 'none';
}

function showError(msg) {
  loginError.style.display = 'block';
  loginError.textContent = msg;
}

function showConfirm(message, callback) {
  confirmMessage.textContent = message;
  confirmModal.style.display = 'flex';
  confirmYes.onclick = () => {
    callback();
    confirmModal.style.display = 'none';
  };
  confirmNo.onclick = () => {
    confirmModal.style.display = 'none';
  };
}

// ======== Auth Functions ========
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    loginSection.style.display = 'none';
    adminContainer.style.display = 'block';
    fetchCakes();
  } else {
    loginSection.style.display = 'block';
    adminContainer.style.display = 'none';
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;

  showLoading(true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  showLoading(false);

  if (error) {
    showError(error.message);
  } else {
    loginSection.style.display = 'none';
    adminContainer.style.display = 'block';
    fetchCakes();
  }
});

logoutBtn.addEventListener('click', async () => {
  showLoading(true);
  await supabase.auth.signOut();
  showLoading(false);
  loginSection.style.display = 'block';
  adminContainer.style.display = 'none';
});

// ======== Cake Functions ========
async function fetchCakes() {
  showLoading(true);
  const { data: cakes, error } = await supabase
    .from('cakes')
    .select('*')
    .order('created_at', { ascending: false });

  showLoading(false);

  if (error) {
    console.error(error);
    return;
  }

  cakesList.innerHTML = cakes.map(cake => `
    <div class="cake-card">
      <img src="${cake.image_url}" alt="${cake.title}" />
      <div class="cake-info">
        <h3>${cake.title}</h3>
        <p>Category: ${cake.category}</p>
        <p>Weight: ${cake.weight}</p>
        <p>Price: UGX ${cake.price}</p>
        <p>${cake.description || ''}</p>
        <button class="delete-btn" data-id="${cake.id}">Delete</button>
      </div>
    </div>
  `).join('');

  // Attach delete event listeners
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cakeId = btn.getAttribute('data-id');
      showConfirm('Are you sure you want to delete this cake?', () => deleteCake(cakeId));
    });
  });
}

async function deleteCake(cakeId) {
  showLoading(true);
  const { error } = await supabase
    .from('cakes')
    .delete()
    .eq('id', cakeId);
  showLoading(false);

  if (error) {
    alert('Failed to delete cake: ' + error.message);
  } else {
    fetchCakes();
  }
}

addCakeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = addCakeForm.title.value;
  const category = addCakeForm.category.value;
  const weight = addCakeForm.weight.value;
  const price = parseFloat(addCakeForm.price.value);
  const description = addCakeForm.description.value;
  const imageFile = addCakeForm.image.files[0];

  if (!imageFile) return alert('Please select an image');

  showLoading(true);

  // Upload image to Supabase Storage
  const fileName = `${Date.now()}_${imageFile.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('cakes')
    .upload(fileName, imageFile);

  if (uploadError) {
    showLoading(false);
    return alert('Image upload failed: ' + uploadError.message);
  }

  // Get public URL
  const { publicUrl } = supabase.storage.from('cakes').getPublicUrl(fileName);

  // Insert cake record
  const { error: insertError } = await supabase
    .from('cakes')
    .insert([{ title, category, weight, price, description, image_url: publicUrl }]);

  showLoading(false);

  if (insertError) {
    alert('Failed to add cake: ' + insertError.message);
  } else {
    addCakeForm.reset();
    fetchCakes();
  }
});

// ======== Initialize ========
checkAuth();

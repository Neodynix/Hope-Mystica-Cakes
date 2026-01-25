// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ==================== LOAD HOME GALLERY (6 IMAGES) ====================
async function loadHomeGallery() {
  const container = document.getElementById('home-gallery');
  if (!container) return;

  try {
    const { data: cakes, error } = await supabaseClient
      .from('cakes')
      .select('title, image_path')
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) throw error;

    if (!cakes || cakes.length === 0) {
      container.innerHTML = `
        <p style="text-align:center; padding:2rem; color:#666;">
          No cakes available yet.
        </p>`;
      return;
    }

    const storageBase =
      `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

    container.innerHTML = cakes.map(cake => `
      <div class="gallery-item">
        <img src="${storageBase}${cake.image_path}"
             alt="${cake.title || 'Cake'}"
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">

        <div class="testimonial-overlay">
          "${cake.title || 'Beautiful custom cake'}"
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <p style="text-align:center; padding:2rem; color:red;">
        Failed to load cakes.
      </p>`;
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', loadHomeGallery);

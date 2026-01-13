// ==================== CONFIGURATION ====================

// Safety check (Supabase v2 uses lowercase `supabase`)
if (typeof supabase === 'undefined') {
    console.error("Supabase library not loaded");
    throw new Error("supabase is not defined");
}

const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY =
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';

// ✅ Create client (correct v2 way)
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// ==================== LOAD GALLERY ====================
async function loadGallery() {
    const container = document.getElementById('gallery-container');

    try {
        const { data: cakes, error } = await supabaseClient
            .from('cakes')
            .select('id, category, title, description, weight, price, image_path')
            .order('category', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!cakes || cakes.length === 0) {
            container.innerHTML = `
                <p style="text-align:center; padding:4rem; color:#666;">
                    No cakes available at the moment. Check back soon!
                </p>`;
            return;
        }

        // Group by category
        const categories = {};
        cakes.forEach(cake => {
            const cat = cake.category || 'Uncategorized';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cake);
        });

        let html = '';

        Object.keys(categories).forEach(category => {
            html += `<h2>${category}</h2>`;
            html += `<div class="grid">`;

            categories[category].forEach(cake => {
                const imageUrl =
                    `${SUPABASE_URL}/storage/v1/object/public/cakes/${cake.image_path}`;

                html += `
                    <div class="gallery-item">
                        <img src="${imageUrl}"
                             alt="${cake.title}"
                             loading="lazy"
                             onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">

                        <div class="overlay">
                            <strong>${cake.title}</strong>
                            ${cake.weight ? `<br>Weight: ${cake.weight}` : ''}
                            ${cake.price ? `<br>Price: UGX ${Number(cake.price).toLocaleString()}/-` : ''}
                            ${cake.description ? `<br><em>${cake.description}</em>` : ''}
                        </div>
                    </div>`;
            });

            html += `</div>`;
        });

        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <p style="text-align:center; padding:4rem; color:red;">
                Failed to load gallery.
            </p>`;
    }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', loadGallery);

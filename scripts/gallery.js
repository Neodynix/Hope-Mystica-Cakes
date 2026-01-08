// === CONFIGURE YOUR SUPABASE DETAILS HERE ===
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';          // e.g., https://abcde.supabase.co
const SUPABASE_ANON_KEY = 'your-public-anon-key-here';            // Safe to expose with RLS enabled

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadGallery() {
    const container = document.getElementById('gallery-container');

    const { data: cakes, error } = await supabase
        .from('cakes')
        .select('id, category, title, description, weight, price, image_path')
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

    if (error || !cakes || cakes.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:4rem; color:#666;">No cakes available at the moment. Check back soon!</p>';
        console.error(error);
        return;
    }

    // Group cakes by category
    const categories = {};
    cakes.forEach(cake => {
        const cat = cake.category || 'Uncategorized';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cake);
    });

    let html = '';
    Object.keys(categories).forEach(category => {
        html += `<h2>${category}</h2>`;
        html += '<div class="grid">';

        categories[category].forEach(cake => {
            const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/cakes/${cake.image_path}`;

            html += `
                <div class="gallery-item">
                    <img src="${imageUrl}" alt="${cake.title}" loading="lazy">
                    <div class="overlay">
                        <strong>${cake.title}</strong>
                        ${cake.weight ? `<br>Weight: ${cake.weight}` : ''}
                        ${cake.price ? `<br>Price: UGX ${Number(cake.price).toLocaleString()}/-` : ''}
                        ${cake.description ? `<br><em>${cake.description}</em>` : ''}
                    </div>
                </div>`;
        });

        html += '</div>';
    });

    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', loadGallery);

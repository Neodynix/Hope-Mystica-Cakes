// ==================== CONFIGURATION ====================

// ✅ SAFETY CHECK (Supabase v2 UMD uses lowercase `supabase`)
if (typeof supabase === 'undefined') {
    alert("CRITICAL ERROR: Supabase library not found. Check CDN or internet.");
    throw new Error("supabase is not defined");
}

const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY =
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo';

// ✅ Create client (v2 correct)
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

console.log("✅ Supabase initialized successfully");

// ==================== DOM REFERENCES ====================
const cakesList = document.getElementById('cakes-list');
const addCakeForm = document.getElementById('add-cake-form');
const imageInput = document.getElementById('image');
const fileNameDisplay = document.getElementById('file-name-display');
const previewContainer = document.getElementById('image-preview-container');
const previewImg = document.getElementById('image-preview');
const removeImgBtn = document.getElementById('remove-img-btn');

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
    cakesList.innerHTML = '<p>Loading gallery...</p>';

    try {
        const { data: cakes, error } = await supabaseClient
            .from('cakes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!cakes || cakes.length === 0) {
            cakesList.innerHTML = '<p>No cakes found.</p>';
            return;
        }

        const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

        cakesList.innerHTML = cakes.map(cake => `
            <div class="cake-card">
                <img src="${storageUrl}${cake.image_path}"
                     alt="${cake.title}"
                     onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">

                <div class="cake-info">
                    <h3>${cake.title}</h3>
                    <p><strong>Category:</strong> ${cake.category}</p>
                    <p><strong>Weight:</strong> ${cake.weight || 'N/A'}</p>
                    <p><strong>Price:</strong> UGX ${cake.price ? Number(cake.price).toLocaleString() : 'N/A'}</p>

                    <button class="delete-btn"
                        onclick="deleteCake('${cake.id}','${cake.image_path}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
        cakesList.innerHTML = `
            <p style="color:red">
                Error loading cakes.<br>
                ${err.message}
            </p>
        `;
    }
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

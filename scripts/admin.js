// ==================== CONFIGURATION ====================
const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo'; 

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ==================== IMAGE PREVIEW LOGIC ====================
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

removeImgBtn.addEventListener('click', () => {
    imageInput.value = "";
    fileNameDisplay.textContent = "Choose an image...";
    previewContainer.classList.add('hidden');
});

// ==================== LOAD CAKES ====================
async function loadCakes() {
    cakesList.innerHTML = '<p>Updating gallery...</p>';
    try {
        const { data: cakes, error } = await supabase
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
                <img src="${storageUrl}${cake.image_path}" alt="${cake.title}" onerror="this.src='https://via.placeholder.com/300x250?text=Image+Missing'">
                <div class="cake-info">
                    <h3>${cake.title}</h3>
                    <p><strong>Category:</strong> ${cake.category}</p>
                    <p><strong>Price:</strong> UGX ${cake.price ? Number(cake.price).toLocaleString() : 'N/A'}</p>
                    <button class="delete-btn" onclick="deleteCake('${cake.id}', '${cake.image_path}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        cakesList.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
}

// ==================== ADD CAKE ====================
addCakeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const message = document.getElementById('message');
    const file = imageInput.files[0];

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    try {
        const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
        
        // 1. Storage Upload
        const { error: upError } = await supabase.storage.from('cakes').upload(fileName, file);
        if (upError) throw upError;

        // 2. Database Insert
        const { error: insError } = await supabase.from('cakes').insert([{
            title: document.getElementById('title').value,
            category: document.getElementById('category').value,
            weight: document.getElementById('weight').value,
            price: document.getElementById('price').value || null,
            description: document.getElementById('description').value,
            image_path: fileName
        }]);
        if (insError) throw insError;

        message.textContent = 'Cake added successfully!';
        message.style.color = 'green';
        addCakeForm.reset();
        previewContainer.classList.add('hidden');
        fileNameDisplay.textContent = "Choose an image...";
        loadCakes();
    } catch (err) {
        message.textContent = `Error: ${err.message}`;
        message.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload to Gallery';
    }
});

// ==================== DELETE CAKE ====================
window.deleteCake = async (id, path) => {
    if (!confirm('Delete this cake?')) return;
    try {
        await supabase.storage.from('cakes').remove([path]);
        await supabase.from('cakes').delete().eq('id', id);
        loadCakes();
    } catch (err) {
        alert(err.message);
    }
};

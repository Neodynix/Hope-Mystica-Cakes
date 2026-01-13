// ==================== CONFIGURATION ====================
// ✅ SAFETY CHECK: Ensure the library loaded
if (typeof Supabase === 'undefined') {
    alert("CRITICAL ERROR: Supabase library not found. Check your internet or ad-blocker.");
    throw new Error("Supabase is not defined");
}

const SUPABASE_URL = 'https://xfinpgndgdpbeltiyvub.supabase.co';
// Your key is correct, keep it as is
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo'; 

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase initialized successfully!"); // Check console for this

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
// This should now work because the script won't crash at line 10
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
    imageInput.value = ""; // Clear file input
    fileNameDisplay.textContent = "Choose an image...";
    previewContainer.classList.add('hidden');
    previewImg.src = "";
});

// ==================== LOAD CAKES ====================
async function loadCakes() {
    cakesList.innerHTML = '<p>Loading gallery...</p>';
    
    try {
        const { data: cakes, error } = await supabase
            .from('cakes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Load Error:", error);
            throw error;
        }

        if (!cakes || cakes.length === 0) {
            cakesList.innerHTML = '<p>No cakes found in database.</p>';
            return;
        }

        // Ensure this path matches your bucket structure exactly
        const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/cakes/`;

        cakesList.innerHTML = cakes.map(cake => `
            <div class="cake-card">
                <img src="${storageUrl}${cake.image_path}" alt="${cake.title}" onerror="this.src='https://via.placeholder.com/300x250?text=No+Image'">
                <div class="cake-info">
                    <h3>${cake.title}</h3>
                    <p><strong>Category:</strong> ${cake.category}</p>
                    <p><strong>Weight:</strong> ${cake.weight || 'N/A'}</p>
                    <p><strong>Price:</strong> UGX ${cake.price ? Number(cake.price).toLocaleString() : 'N/A'}</p>
                    <button class="delete-btn" onclick="deleteCake('${cake.id}', '${cake.image_path}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        cakesList.innerHTML = `<p style="color:red; padding: 20px;">
            <strong>Error Loading Cakes:</strong><br> ${err.message}<br>
            <em>(Check Console F12 for details)</em>
        </p>`;
    }
}

// ==================== ADD CAKE ====================
addCakeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const message = document.getElementById('message');
    const file = imageInput.files[0];

    // Basic Validation
    if (!file) {
        alert("Please select an image first.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    message.textContent = '';

    try {
        // Sanitize filename to avoid weird character issues
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${Date.now()}_${cleanFileName}`;
        
        console.log("Attempting upload:", fileName);

        // 1. Storage Upload
        const { data: uploadData, error: upError } = await supabase.storage
            .from('cakes')
            .upload(fileName, file);
            
        if (upError) throw new Error("Image Upload Failed: " + upError.message);

        // 2. Database Insert
        const { error: insError } = await supabase
            .from('cakes')
            .insert([{
                title: document.getElementById('title').value,
                category: document.getElementById('category').value,
                weight: document.getElementById('weight').value,
                price: document.getElementById('price').value || null,
                description: document.getElementById('description').value,
                image_path: fileName
            }]);
            
        if (insError) {
            // Cleanup: If DB fails, try to delete the uploaded image so we don't have orphans
            await supabase.storage.from('cakes').remove([fileName]);
            throw new Error("Database Save Failed: " + insError.message);
        }

        message.textContent = 'Cake added successfully!';
        message.style.color = 'green';
        
        // Reset Form
        addCakeForm.reset();
        previewContainer.classList.add('hidden');
        fileNameDisplay.textContent = "Choose an image...";
        
        // Refresh List
        loadCakes();

    } catch (err) {
        console.error(err);
        message.textContent = `Error: ${err.message}`;
        message.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload to Gallery';
    }
});

// ==================== DELETE CAKE ====================
window.deleteCake = async (id, path) => {
    if (!confirm('Are you sure you want to delete this cake?')) return;
    
    try {
        // 1. Delete Image
        const { error: storageError } = await supabase.storage
            .from('cakes')
            .remove([path]);
            
        if (storageError) console.warn("Could not delete image (might not exist):", storageError);

        // 2. Delete DB Record
        const { error: dbError } = await supabase
            .from('cakes')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        loadCakes();
    } catch (err) {
        alert("Delete Failed: " + err.message);
    }
};

// ======================= Supabase Setup =======================
const SUPABASE_URL = "https://YOUR_SUPABASE_URL.supabase.co";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ======================= DOM ELEMENTS =======================
const loginScreen = document.getElementById("login-screen");
const loginForm = document.getElementById("login-form");
const authMessage = document.getElementById("auth-message");

const dashboard = document.getElementById("admin-dashboard");
const userEmailDisplay = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

const addCakeForm = document.getElementById("add-cake-form");
const message = document.getElementById("message");
const uploadProgress = document.getElementById("upload-progress");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");

const cakesList = document.getElementById("cakes-list");

// ======================= AUTH =======================
async function checkSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        showDashboard(data.session.user.email);
        fetchCakes();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginScreen.style.display = "flex";
    dashboard.style.display = "none";
}

function showDashboard(email) {
    loginScreen.style.display = "none";
    dashboard.style.display = "block";
    userEmailDisplay.textContent = email;
}

// ======================= LOGIN =======================
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authMessage.textContent = "";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        authMessage.textContent = error.message;
    } else {
        showDashboard(data.user.email);
        fetchCakes();
    }
});

// ======================= LOGOUT =======================
logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    showLogin();
});

// ======================= ADD CAKE =======================
addCakeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "";

    const title = document.getElementById("title").value;
    const category = document.getElementById("category").value;
    const weight = document.getElementById("weight").value;
    const price = document.getElementById("price").value;
    const description = document.getElementById("description").value;
    const imageFile = document.getElementById("image").files[0];

    if (!imageFile) {
        message.textContent = "Please select an image!";
        return;
    }

    // ================= Upload Image to Supabase Storage =================
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `cakes-images/${fileName}`;

    uploadProgress.classList.remove("hidden");

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from("cakes-images")
        .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: false
        });

    if (uploadError) {
        message.textContent = `Image upload failed: ${uploadError.message}`;
        uploadProgress.classList.add("hidden");
        return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("cakes-images").getPublicUrl(filePath);
    const imageUrl = urlData.publicUrl;

    // ================= Insert Cake into Supabase Table =================
    const { error: insertError } = await supabase
        .from("cakes")
        .insert([{ title, category, weight, price, description, image_url: imageUrl }]);

    if (insertError) {
        message.textContent = `Failed to add cake: ${insertError.message}`;
    } else {
        message.textContent = "Cake added successfully!";
        addCakeForm.reset();
        uploadProgress.classList.add("hidden");
        progressBar.value = 0;
        progressText.textContent = "0%";
        fetchCakes();
    }
});

// ======================= FETCH CAKES =======================
async function fetchCakes() {
    const { data, error } = await supabase.from("cakes").select("*").order("id", { ascending: false });

    if (error) {
        cakesList.innerHTML = `<p>Error loading cakes: ${error.message}</p>`;
        return;
    }

    cakesList.innerHTML = "";
    data.forEach(cake => {
        const cakeCard = document.createElement("div");
        cakeCard.classList.add("cake-card");
        cakeCard.innerHTML = `
            <img src="${cake.image_url}" alt="${cake.title}">
            <div class="cake-info">
                <h3>${cake.title}</h3>
                <p><strong>Category:</strong> ${cake.category}</p>
                ${cake.weight ? `<p><strong>Weight:</strong> ${cake.weight}</p>` : ""}
                ${cake.price ? `<p><strong>Price:</strong> UGX ${cake.price}</p>` : ""}
                ${cake.description ? `<p>${cake.description}</p>` : ""}
                <button class="delete-btn" data-id="${cake.id}">Delete</button>
            </div>
        `;
        cakesList.appendChild(cakeCard);
    });

    // Attach delete listeners
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => deleteCake(btn.dataset.id));
    });
}

// ======================= DELETE CAKE =======================
async function deleteCake(id) {
    if (!confirm("Are you sure you want to delete this cake?")) return;

    const { error } = await supabase.from("cakes").delete().eq("id", id);
    if (error) {
        alert(`Failed to delete: ${error.message}`);
    } else {
        fetchCakes();
    }
}

// ======================= INITIALIZE =======================
checkSession();

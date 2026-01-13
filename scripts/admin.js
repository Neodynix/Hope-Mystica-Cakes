const SUPABASE_URL = "https://xfinpgndgdpbeltiyvub.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW5wZ25kZ2RwYmVsdGl5dnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzYzNzksImV4cCI6MjA4MzQ1MjM3OX0.Q26zDDFutnFFMi4XpJEgJYgzc5VkKl65XrQKgiCBiPo";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const loginOverlay = document.getElementById("login-overlay");
const loginBtn = document.getElementById("login-btn");
const loginMessage = document.getElementById("login-message");
const logoutBtn = document.getElementById("logout-btn");

const cakesList = document.getElementById("cakes-list");
const addCakeForm = document.getElementById("add-cake-form");
const imageInput = document.getElementById("image");

window.addEventListener("DOMContentLoaded", async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        loginOverlay.classList.remove("hidden");
    } else {
        loadCakes();
    }
});

loginBtn.onclick = async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email, password
    });

    if (error) {
        loginMessage.textContent = error.message;
        loginMessage.style.color = "red";
    } else {
        loginOverlay.classList.add("hidden");
        loadCakes();
    }
};

logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    location.reload();
};

async function loadCakes() {
    const { data } = await supabaseClient
        .from("cakes")
        .select("*")
        .order("created_at", { ascending: false });

    cakesList.innerHTML = data.map(cake => `
        <div class="cake-card">
            <img src="${SUPABASE_URL}/storage/v1/object/public/cakes/${cake.image_path}">
            <div style="padding:15px">
                <h3>${cake.title}</h3>
                <p>${cake.category}</p>
                <button onclick="deleteCake('${cake.id}','${cake.image_path}')">Delete</button>
            </div>
        </div>
    `).join("");
}

window.deleteCake = async (id, path) => {
    await supabaseClient.storage.from("cakes").remove([path]);
    await supabaseClient.from("cakes").delete().eq("id", id);
    loadCakes();
};

addCakeForm.onsubmit = async e => {
    e.preventDefault();

    const file = imageInput.files[0];
    const filename = `${Date.now()}_${file.name}`;

    await supabaseClient.storage.from("cakes").upload(filename, file);

    await supabaseClient.from("cakes").insert([{
        title: title.value,
        category: category.value,
        weight: weight.value,
        price: price.value,
        description: description.value,
        image_path: filename
    }]);

    addCakeForm.reset();
    loadCakes();
};

<script>
const API = "https://api-svs-production.up.railway.app";

// 🔐 LOGIN
async function login() {
    const user = document.getElementById("user").value;

    try {
        const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ user })
        });

        if (!res.ok) throw new Error("Erro na API");

        const data = await res.json();

        console.log("LOGIN:", data);

        document.getElementById("login").style.display = "none";
        document.getElementById("dashboard").style.display = "block";

        // 🔥 CHAMADA CORRETA
        carregarRanking();

    } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
    }
}

// 🏆 RANKING
async function carregarRanking() {
    try {
        const res = await fetch(`${API}/ranking`);
        const data = await res.json();

        let html = "";

        if (data.length === 0) {
            html = "<p>Sem dados hoje</p>";
        } else {
            data.forEach((p, i) => {
                html += `<p>${i + 1}º ${p.usuario} - ${p.total}M</p>`;
            });
        }

        document.getElementById("ranking").innerHTML = html;

    } catch (err) {
        console.error(err);
        alert("Erro ao carregar ranking");
    }
}
</script>

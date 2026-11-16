import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://jtvvlelisnuskqumjvxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dnZsZWxpc251c2txdW1qdnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MjQwMTQsImV4cCI6MjExMDQwMDAxNH0.XaUZeXVEKC5D3E6OOaDNqkMjHqHbebGYkBkhjFv6HME';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function carregarNavbar() {
    const { data: { user } } = await supabase.auth.getUser();
    const navMenu = document.getElementById('nav-acoes');
    if (!navMenu) return;

    if (!user) {
        navMenu.innerHTML = `
            <a href="transparencia.html" class="btn btn-outline-light btn-sm me-2">Transparência</a>
            <a href="login.html" class="btn btn-elo-amarelo btn-sm">Entrar / Cadastrar</a>
        `;
        return;
    }

    const { data: perfilData } = await supabase
        .from('usuario')
        .select('nome, perfil')
        .eq('id', user.id)
        .single();

    let linkPainel = 'painel-doador.html';
    let labelPainel = 'Minhas Doações';

    if (perfilData?.perfil === 'organizacao') {
        linkPainel = 'painel-org.html';
        labelPainel = 'Painel da Organização';
    } else if (perfilData?.perfil === 'admin') {
        linkPainel = 'painel-admin.html';
        labelPainel = 'Administração';
    }

    navMenu.innerHTML = `
        <a href="transparencia.html" class="btn btn-outline-light btn-sm me-2">Transparência</a>
        <a href="${linkPainel}" class="btn btn-light btn-sm me-2 fw-bold text-success">${labelPainel}</a>
        <button id="btn-sair" class="btn btn-outline-warning btn-sm">Sair</button>
    `;

    document.getElementById('btn-sair').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });
}

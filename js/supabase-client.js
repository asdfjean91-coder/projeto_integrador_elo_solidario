import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://jtvvlelisnuskqumjvxp.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_PUBLICA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function carregarNavbar() {
    const { data: { user } } = await supabase.auth.getUser();
    const navMenu = document.getElementById('nav-acoes');
    if (!navMenu) return;

    const linksPerfis = `
        <a href="index.html#quem-somos" class="btn btn-outline-light btn-sm">🎓 Quem Somos</a>
        <a href="transparencia.html" class="btn btn-outline-light btn-sm">📊 Transparência</a>
        <a href="painel-doador.html" class="btn btn-outline-light btn-sm">💛 Doador</a>
        <a href="painel-org.html" class="btn btn-outline-light btn-sm">🏢 Organização</a>
        <a href="painel-admin.html" class="btn btn-outline-light btn-sm">🛡️ Admin</a>
    `;

    if (!user) {
        navMenu.className = 'd-flex flex-wrap align-items-center gap-2';
        navMenu.innerHTML = `
            ${linksPerfis}
            <a href="login.html" class="btn btn-elo-amarelo btn-sm">Entrar / Cadastrar</a>
        `;
        return;
    }

    const { data: perfilData } = await supabase
        .from('usuario')
        .select('nome, perfil')
        .eq('id', user.id)
        .single();

    const badgePerfil = perfilData?.perfil ? `(${perfilData.perfil.toUpperCase()})` : '';

    navMenu.className = 'd-flex flex-wrap align-items-center gap-2';
    navMenu.innerHTML = `
        ${linksPerfis}
        <span class="badge bg-light text-success py-2 px-2 d-none d-md-inline">👤 ${badgePerfil}</span>
        <button id="btn-sair" class="btn btn-warning btn-sm fw-bold">Sair</button>
    `;

    document.getElementById('btn-sair').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });
}

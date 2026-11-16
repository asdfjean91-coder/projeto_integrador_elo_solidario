import { supabase, carregarNavbar } from './supabase-client.js';

async function carregarAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const { data: perfil } = await supabase.from('usuario').select('perfil').eq('id', user.id).single();
    if (perfil?.perfil !== 'admin') {
        document.body.innerHTML = '<div class="container my-5 alert alert-danger">Erro 403: Acesso restrito ao administrador.</div>';
        return;
    }

    const { data: orgs } = await supabase.from('organizacao').select('*').order('id', { ascending: false });
    document.getElementById('lista-orgs-admin').innerHTML = (orgs || []).map(o => `
        <div class="card p-3 mb-2 shadow-sm d-flex flex-row justify-content-between align-items-center">
            <div>
                <strong>${o.nome}</strong> (${o.tipo}) — <span class="badge bg-secondary">${o.status}</span><br>
                <small class="text-muted">${o.endereco}, ${o.bairro} - ${o.cidade}/${o.uf} | CNPJ: ${o.cnpj || 'Não informado'}</small>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-success btn-sm btn-status-org" data-id="${o.id}" data-status="aprovada">Aprovar</button>
                <button class="btn btn-outline-danger btn-sm btn-status-org" data-id="${o.id}" data-status="recusada">Recusar</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.btn-status-org').forEach(btn => {
        btn.addEventListener('click', async () => {
            await supabase.from('organizacao').update({ status: btn.dataset.status }).eq('id', btn.dataset.id);
            carregarAdmin();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    carregarNavbar();
    carregarAdmin();
});

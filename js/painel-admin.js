import { supabase, carregarNavbar } from './supabase-client.js';

async function carregarAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const { data: perfil } = await supabase.from('usuario').select('perfil').eq('id', user.id).single();
    if (perfil?.perfil !== 'admin') {
        document.querySelector('main').innerHTML = '<div class="alert alert-danger">Erro 403: Acesso restrito ao administrador.</div>';
        return;
    }

    // 1. Carrega Organizações
    const { data: orgs } = await supabase.from('organizacao').select('*').order('id', { ascending: false });
    document.getElementById('lista-orgs-admin').innerHTML = (orgs || []).map(o => {
        const corBadge = o.status === 'aprovada' ? 'bg-success' : (o.status === 'pendente' ? 'bg-warning text-dark' : 'bg-danger');
        return `
        <div class="border rounded-3 p-3 mb-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
                <strong>${o.nome}</strong> <span class="badge bg-light text-dark border">${o.tipo}</span>
                <span class="badge ${corBadge} text-uppercase ms-1">${o.status}</span><br>
                <small class="text-muted">📍 ${o.endereco}, ${o.bairro} - ${o.cidade}/${o.uf} • CNPJ: ${o.cnpj || 'Não informado'}</small>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-success btn-sm btn-status-org" data-id="${o.id}" data-status="aprovada">✓ Aprovar</button>
                <button class="btn btn-outline-danger btn-sm btn-status-org" data-id="${o.id}" data-status="recusada">✕ Recusar</button>
            </div>
        </div>`;
    }).join('') || '<p class="text-muted small">Nenhuma organização cadastrada.</p>';

    document.querySelectorAll('.btn-status-org').forEach(btn => {
        btn.addEventListener('click', async () => {
            await supabase.from('organizacao').update({ status: btn.dataset.status }).eq('id', btn.dataset.id);
            carregarAdmin();
        });
    });

    // 2. Carrega Categorias e Itens
    const { data: cats } = await supabase.from('categoria').select('*');
    document.getElementById('select-cat-admin').innerHTML = (cats || []).map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

    const { data: itens } = await supabase.from('item').select('id, nome, unidade, categoria(nome)').order('nome');
    document.getElementById('lista-itens-admin').innerHTML = (itens || []).map(i => `
        <div class="d-flex justify-content-between border-bottom py-1">
            <span><strong>${i.nome}</strong> (${i.unidade})</span>
            <span class="text-muted">${i.categoria?.nome || ''}</span>
        </div>
    `).join('');
}

document.getElementById('form-novo-item').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('item').insert({
        categoria_id: parseInt(document.getElementById('select-cat-admin').value, 10),
        nome: document.getElementById('novo-item-nome').value.trim(),
        unidade: document.getElementById('novo-item-unidade').value
    });
    if (error) { alert(error.message); return; }
    e.target.reset();
    carregarAdmin();
});

document.addEventListener('DOMContentLoaded', () => {
    carregarNavbar();
    carregarAdmin();
});
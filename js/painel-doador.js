import { supabase, carregarNavbar } from './supabase-client.js';

async function carregarDoacoes() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const { data: doacoes } = await supabase
        .from('doacao')
        .select(`
            codigo, data_prevista, status,
            campanha ( titulo, organizacao ( nome, endereco, bairro ) ),
            doacao_item ( quantidade, campanha_item ( item ( nome, unidade ) ) )
        `)
        .eq('doador_id', user.id)
        .order('criado_em', { ascending: false });

    const container = document.getElementById('lista-minhas-doacoes');
    if (!doacoes || doacoes.length === 0) {
        container.innerHTML = `<div class="alert alert-info">Você ainda não registrou nenhuma doação.</div>`;
        return;
    }

    container.innerHTML = doacoes.map(d => {
        const badge = d.status === 'entregue' ? 'bg-success' : (d.status === 'prometida' ? 'bg-warning text-dark' : 'bg-secondary');
        const itensTxt = d.doacao_item.map(di => `${di.quantidade} ${di.campanha_item.item.unidade} de ${di.campanha_item.item.nome}`).join(', ');
        return `
        <div class="card p-3 mb-3 shadow-sm">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge bg-dark fs-6">${d.codigo}</span>
                <span class="badge ${badge} text-uppercase">${d.status}</span>
            </div>
            <h2 class="h6 fw-bold mb-1">${d.campanha.titulo}</h2>
            <p class="small text-muted mb-1">Local: ${d.campanha.organizacao.nome} (${d.campanha.organizacao.endereco}, ${d.campanha.organizacao.bairro})</p>
            <p class="small mb-1"><strong>Itens:</strong> ${itensTxt}</p>
            <small class="text-muted">Entrega prevista: ${new Date(d.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
        </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    carregarNavbar();
    carregarDoacoes();
});

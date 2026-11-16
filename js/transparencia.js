import { supabase, carregarNavbar } from './supabase-client.js';

async function carregarTransparencia() {
    const { data: dists } = await supabase
        .from('distribuicao')
        .select('data, familias_atendidas, descricao, campanha(titulo, organizacao(nome, cidade, uf))')
        .order('data', { ascending: false });

    const { data: encerradas } = await supabase
        .from('campanha')
        .select('id, titulo, data_fim, organizacao(nome, cidade), campanha_item(quantidade_meta, quantidade_recebida, item(nome, unidade))')
        .eq('status', 'encerrada');

    const totalFamilias = (dists || []).reduce((acc, d) => acc + d.familias_atendidas, 0);

    document.getElementById('painel-transparencia').innerHTML = `
        <div class="row g-3 mb-4">
            <div class="col-md-6">
                <div class="step-card p-4 text-center">
                    <span class="display-5 fw-bold text-success">${totalFamilias}</span>
                    <p class="fw-semibold mb-0">Famílias atendidas registradas</p>
                </div>
            </div>
            <div class="col-md-6">
                <div class="step-card p-4 text-center">
                    <span class="display-5 fw-bold text-warning">${(encerradas || []).length}</span>
                    <p class="fw-semibold mb-0">Campanhas concluídas com prestação de contas</p>
                </div>
            </div>
        </div>

        <h2 class="h5 fw-bold mb-3">📦 Entregas Realizadas às Famílias</h2>
        <div class="mb-5">
            ${(dists || []).map(d => `
                <div class="card border-0 p-3 mb-3 shadow-sm" style="border-radius: 16px;">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong>${d.campanha?.titulo}</strong>
                        <span class="badge bg-success rounded-pill px-3">👨‍👩‍👧‍👦 ${d.familias_atendidas} famílias atendidas</span>
                    </div>
                    <small class="text-muted mb-2">🏛️ ${d.campanha?.organizacao?.nome} (${d.campanha?.organizacao?.cidade}/${d.campanha?.organizacao?.uf}) • 📅 ${new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
                    <p class="small mb-0 bg-light p-2 rounded">${d.descricao}</p>
                </div>
            `).join('') || '<div class="alert alert-light border">Nenhuma distribuição registrada ainda.</div>'}
        </div>

        <h2 class="h5 fw-bold mb-3">🏁 Relatório de Campanhas Encerradas (RN07)</h2>
        ${(encerradas || []).map(c => `
            <div class="card border-0 p-3 mb-3 shadow-sm" style="border-radius: 16px;">
                <h3 class="h6 fw-bold text-success mb-1">${c.titulo}</h3>
                <p class="small text-muted mb-2">${c.organizacao?.nome} (${c.organizacao?.cidade})</p>
                <ul class="small mb-0">
                    ${c.campanha_item.map(ci => `<li><strong>${ci.item.nome}:</strong> ${ci.quantidade_recebida} ${ci.item.unidade} arrecadados (Meta: ${ci.quantidade_meta} ${ci.item.unidade})</li>`).join('')}
                </ul>
            </div>
        `).join('') || '<div class="alert alert-light border">Nenhuma campanha encerrada até o momento.</div>'}
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    carregarNavbar();
    carregarTransparencia();
});
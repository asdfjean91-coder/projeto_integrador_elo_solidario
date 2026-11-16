import { supabase, carregarNavbar } from './supabase-client.js';

async function carregarTransparencia() {
    const { data: dists } = await supabase
        .from('distribuicao')
        .select('data, familias_atendidas, descricao, campanha(titulo, organizacao(nome, cidade))')
        .order('data', { ascending: false });

    const totalFamilias = (dists || []).reduce((acc, d) => acc + d.familias_atendidas, 0);

    document.getElementById('painel-transparencia').innerHTML = `
        <div class="hero-card p-3 mb-4 text-center">
            <span class="display-6 fw-bold text-success">${totalFamilias}</span>
            <p class="mb-0 fw-semibold">Famílias atendidas registradas na plataforma</p>
        </div>
        ${(dists || []).map(d => `
            <div class="card p-3 mb-2 shadow-sm">
                <div class="d-flex justify-content-between">
                    <strong>${d.campanha?.titulo}</strong>
                    <span class="badge bg-success">${d.familias_atendidas} famílias</span>
                </div>
                <small class="text-muted">${d.campanha?.organizacao?.nome} (${d.campanha?.organizacao?.cidade}) • ${new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
                <p class="small mb-0 mt-1">${d.descricao}</p>
            </div>
        `).join('') || '<p class="text-muted">Nenhuma distribuição registrada ainda.</p>'}
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    carregarNavbar();
    carregarTransparencia();
});

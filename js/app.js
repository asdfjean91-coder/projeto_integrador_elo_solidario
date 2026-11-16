import { supabase, carregarNavbar } from './supabase-client.js';

async function carregarCampanhas() {
    const busca = document.getElementById('filtro-busca').value.toLowerCase();
    const cidade = document.getElementById('filtro-cidade').value.toLowerCase();
    const status = document.getElementById('filtro-status').value;
    const container = document.getElementById('lista-campanhas');

    await supabase.rpc('expirar_doacoes_atrasadas');

    const { data: campanhas, error } = await supabase
        .from('campanha')
        .select(`
            id, titulo, descricao, data_fim, status,
            organizacao ( nome, cidade, uf, bairro ),
            campanha_item ( quantidade_meta, quantidade_recebida, item ( nome ) )
        `)
        .eq('status', status)
        .order('data_fim', { ascending: true });

    if (error) {
        container.innerHTML = `<div class="alert alert-danger">Erro ao carregar campanhas. Verifique a configuração do Supabase.</div>`;
        return;
    }

    const filtradas = campanhas.filter(c => {
        const matchCidade = !cidade || c.organizacao.cidade.toLowerCase().includes(cidade);
        const matchBusca = !busca || 
            c.titulo.toLowerCase().includes(busca) || 
            c.campanha_item.some(ci => ci.item.nome.toLowerCase().includes(busca));
        return matchCidade && matchBusca;
    });

    if (filtradas.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-4 text-muted">Nenhuma campanha encontrada.</div>`;
        return;
    }

    container.innerHTML = filtradas.map(c => {
        const totalMeta = c.campanha_item.reduce((acc, i) => acc + i.quantidade_meta, 0);
        const totalRec = c.campanha_item.reduce((acc, i) => acc + i.quantidade_recebida, 0);
        const pct = totalMeta > 0 ? Math.min(100, Math.round((totalRec / totalMeta) * 100)) : 0;

        return `
        <div class="col-md-6 col-lg-4">
            <article class="card card-campanha h-100 p-3">
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <span class="badge bg-success-subtle text-success">${c.organizacao.cidade}/${c.organizacao.uf}</span>
                    <small class="fw-bold text-success">${pct}%</small>
                </div>
                <h2 class="h5 fw-bold mb-1">${c.titulo}</h2>
                <p class="small text-muted mb-2">${c.organizacao.nome} • Bairro ${c.organizacao.bairro}</p>
                <div class="progress mb-3" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar progress-bar-elo" style="width: ${pct}%"></div>
                </div>
                <div class="mt-auto d-flex justify-content-between align-items-center">
                    <small class="text-muted">Até ${new Date(c.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
                    <a href="campanha.html?id=${c.id}" class="btn btn-elo btn-sm">Ver detalhes</a>
                </div>
            </article>
        </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    carregarNavbar();
    carregarCampanhas();
    document.getElementById('filtro-busca').addEventListener('input', carregarCampanhas);
    document.getElementById('filtro-cidade').addEventListener('input', carregarCampanhas);
    document.getElementById('filtro-status').addEventListener('change', carregarCampanhas);
});

import { supabase, carregarNavbar } from './supabase-client.js';

const IMAGENS_CAMPANHA = [
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1593113630400-ea4288922497?auto=format&fit=crop&w=600&q=80'
];

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
        container.innerHTML = `<div class="col-12"><div class="alert alert-danger">Erro ao carregar campanhas. Verifique a conexão com o Supabase.</div></div>`;
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
        container.innerHTML = `
            <div class="col-12 text-center py-5 bg-white rounded-4 border">
                <div class="fs-1 mb-2">🌻</div>
                <h3 class="h6 fw-bold">Nenhuma campanha encontrada no momento</h3>
                <p class="small text-muted mb-3">Organizações verificadas podem publicar novas metas a qualquer instante.</p>
                <a href="login.html" class="btn btn-elo btn-sm px-3">Cadastrar Organização</a>
            </div>`;
        return;
    }

    container.innerHTML = filtradas.map((c, idx) => {
        const totalMeta = c.campanha_item.reduce((acc, i) => acc + i.quantidade_meta, 0);
        const totalRec = c.campanha_item.reduce((acc, i) => acc + i.quantidade_recebida, 0);
        const pct = totalMeta > 0 ? Math.min(100, Math.round((totalRec / totalMeta) * 100)) : 0;
        const imgUrl = IMAGENS_CAMPANHA[idx % IMAGENS_CAMPANHA.length];

        return `
        <div class="col-md-6 col-lg-4">
            <article class="card card-campanha h-100">
                <img src="${imgUrl}" class="card-campanha-img" alt="Imagem ilustrativa da campanha ${c.titulo}">
                <div class="p-3 d-flex flex-column flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-success-subtle text-success rounded-pill px-3">📍 ${c.organizacao.cidade}/${c.organizacao.uf}</span>
                        <span class="fw-bold text-success small">${pct}% atingido</span>
                    </div>
                    <h3 class="h5 fw-bold mb-1">${c.titulo}</h3>
                    <p class="small text-muted mb-3">${c.organizacao.nome} • Bairro ${c.organizacao.bairro}</p>
                    <div class="progress mb-3" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-bar progress-bar-elo" style="width: ${pct}%"></div>
                    </div>
                    <div class="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
                        <small class="text-muted">📅 Até ${new Date(c.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
                        <a href="campanha.html?id=${c.id}" class="btn btn-elo btn-sm px-3">Doar agora →</a>
                    </div>
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

import { supabase, carregarNavbar } from './supabase-client.js';

let orgAtual = null;
let catalogoItens = [];
let doacoesCache = [];

function adicionarLinhaItem() {
    const container = document.getElementById('container-itens-campanha');
    const div = document.createElement('div');
    div.className = 'input-group mb-2 linha-item-camp';
    div.innerHTML = `
        <select class="form-select select-item-cat">
            ${catalogoItens.map(i => `<option value="${i.id}">${i.nome} (${i.unidade})</option>`).join('')}
        </select>
        <input type="number" class="form-control meta-item-cat" placeholder="Meta" min="1" style="max-width: 100px;" required>
        <button type="button" class="btn btn-outline-danger btn-rem-item" title="Remover">✕</button>
    `;
    div.querySelector('.btn-rem-item').addEventListener('click', () => {
        if (document.querySelectorAll('.linha-item-camp').length > 1) div.remove();
    });
    container.appendChild(div);
}

async function initPainelOrg() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const { data: perfil } = await supabase.from('usuario').select('perfil').eq('id', user.id).single();
    if (perfil?.perfil !== 'organizacao') {
        document.querySelector('main').innerHTML = '<div class="alert alert-danger">Erro 403: Acesso restrito a organizações receptoras.</div>';
        return;
    }

    const { data: org } = await supabase.from('organizacao').select('*').eq('usuario_id', user.id).single();
    orgAtual = org;

    const statusBox = document.getElementById('status-org-box');
    if (org.status !== 'aprovada') {
        statusBox.innerHTML = `<div class="alert alert-warning rounded-4 shadow-sm">⏳ Status da organização <strong>${org.nome}</strong>: <strong>${org.status.toUpperCase()}</strong>. Aguarde a aprovação do administrador para publicar campanhas (RN01).</div>`;
    } else {
        statusBox.innerHTML = `<div class="hero-card p-3 d-flex justify-content-between align-items-center"><span>✅ Organização Verificada: <strong>${org.nome}</strong> (${org.bairro}, ${org.cidade}/${org.uf})</span><span class="badge bg-success">Ativa</span></div>`;
    }

    const { data: itens } = await supabase.from('item').select('id, nome, unidade').order('nome');
    catalogoItens = itens || [];
    adicionarLinhaItem();

    await carregarCampanhasEDoacoes();
}

function renderizarDoacoesPendentes(filtro = '') {
    const filtradas = doacoesCache.filter(d => d.codigo.toLowerCase().includes(filtro.toLowerCase()));
    document.getElementById('lista-doacoes-pendentes').innerHTML = filtradas.map(d => {
        const resumo = d.doacao_item.map(di => `${di.quantidade} ${di.campanha_item.item.unidade} de ${di.campanha_item.item.nome}`).join(', ');
        return `
        <div class="d-flex justify-content-between align-items-center border rounded-3 p-3 mb-2 bg-light">
            <div>
                <span class="badge bg-dark me-1">${d.codigo}</span>
                <strong>${d.usuario?.nome || 'Doador'}</strong><br>
                <small class="text-muted">${resumo}</small>
            </div>
            <button class="btn btn-elo btn-sm btn-confirmar-rec" data-id="${d.id}">✓ Confirmar Recebimento</button>
        </div>`;
    }).join('') || '<p class="text-muted small mb-0">Nenhuma doação aguardando confirmação.</p>';

    document.querySelectorAll('.btn-confirmar-rec').forEach(btn => {
        btn.addEventListener('click', async () => {
            await supabase.from('doacao').update({ status: 'entregue' }).eq('id', btn.dataset.id);
            carregarCampanhasEDoacoes();
        });
    });
}

async function carregarCampanhasEDoacoes() {
    const { data: camps } = await supabase.from('campanha').select('*').eq('organizacao_id', orgAtual.id).order('id', { ascending: false });
    const selCamp = document.getElementById('select-camp-dist');
    const listaCamps = document.getElementById('lista-minhas-campanhas');

    const ativas = (camps || []).filter(c => c.status === 'ativa');
    document.getElementById('kpi-ativas').textContent = ativas.length;

    selCamp.innerHTML = (camps || []).map(c => `<option value="${c.id}">${c.titulo}</option>`).join('');
    listaCamps.innerHTML = (camps || []).map(c => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <div>
                <strong>${c.titulo}</strong>
                <span class="badge ${c.status === 'ativa' ? 'bg-success' : 'bg-secondary'} ms-1">${c.status}</span><br>
                <small class="text-muted">Encerra em: ${new Date(c.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
            </div>
            <div class="d-flex gap-2">
                <a href="campanha.html?id=${c.id}" class="btn btn-outline-secondary btn-sm">Ver</a>
                ${c.status === 'ativa' ? `<button class="btn btn-outline-danger btn-sm btn-encerrar" data-id="${c.id}">Encerrar</button>` : ''}
            </div>
        </div>
    `).join('') || '<p class="text-muted small mb-0">Nenhuma campanha cadastrada.</p>';

    document.querySelectorAll('.btn-encerrar').forEach(btn => {
        btn.addEventListener('click', async () => {
            await supabase.from('campanha').update({ status: 'encerrada' }).eq('id', btn.dataset.id);
            carregarCampanhasEDoacoes();
        });
    });

    const campIds = (camps || []).map(c => c.id);
    if (campIds.length === 0) {
        doacoesCache = [];
        renderizarDoacoesPendentes();
        return;
    }

    const { data: dists } = await supabase.from('distribuicao').select('familias_atendidas').in('campanha_id', campIds);
    const totalFam = (dists || []).reduce((acc, d) => acc + d.familias_atendidas, 0);
    document.getElementById('kpi-familias').textContent = totalFam;

    const { data: doacoes } = await supabase
        .from('doacao')
        .select('id, codigo, status, usuario(nome), doacao_item(quantidade, campanha_item(item(nome, unidade)))')
        .in('campanha_id', campIds)
        .eq('status', 'prometida');

    doacoesCache = doacoes || [];
    document.getElementById('kpi-prometidas').textContent = doacoesCache.length;
    renderizarDoacoesPendentes();
}

document.getElementById('btn-add-item-camp').addEventListener('click', adicionarLinhaItem);
document.getElementById('busca-codigo-doacao').addEventListener('input', (e) => renderizarDoacoesPendentes(e.target.value));

document.getElementById('form-nova-campanha').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: camp, error } = await supabase.from('campanha').insert({
        organizacao_id: orgAtual.id,
        titulo: document.getElementById('camp-titulo').value,
        descricao: document.getElementById('camp-desc').value,
        data_fim: document.getElementById('camp-fim').value
    }).select().single();

    if (error) { alert(error.message); return; }

    const linhas = [...document.querySelectorAll('.linha-item-camp')];
    const itensParaInserir = linhas.map(linha => ({
        campanha_id: camp.id,
        item_id: parseInt(linha.querySelector('.select-item-cat').value, 10),
        quantidade_meta: parseInt(linha.querySelector('.meta-item-cat').value, 10)
    }));

    await supabase.from('campanha_item').insert(itensParaInserir);

    e.target.reset();
    document.getElementById('container-itens-campanha').innerHTML = '';
    adicionarLinhaItem();
    carregarCampanhasEDoacoes();
});

document.getElementById('form-distribuicao').addEventListener('submit', async (e) => {
    e.preventDefault();
    await supabase.from('distribuicao').insert({
        campanha_id: parseInt(document.getElementById('select-camp-dist').value, 10),
        familias_atendidas: parseInt(document.getElementById('dist-familias').value, 10),
        descricao: document.getElementById('dist-desc').value
    });
    alert('Prestação de contas registrada no painel público de transparência!');
    e.target.reset();
    carregarCampanhasEDoacoes();
});

document.addEventListener('DOMContentLoaded', () => {
    carregarNavbar();
    initPainelOrg();
});
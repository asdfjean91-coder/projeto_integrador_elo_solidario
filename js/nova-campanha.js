import { supabase, carregarNavbar } from './supabase-client.js';

let orgAtual = null;
let catalogoItens = [];

function criarLinhaItem() {
    const container = document.getElementById('lista-itens-campanha');
    const div = document.createElement('div');
    div.className = 'row g-2 align-items-center mb-2 linha-item-nova';

    div.innerHTML = `
        <div class="col-7 col-sm-8">
            <select class="form-select select-item" required>
                ${catalogoItens.map(i => `<option value="${i.id}">${i.nome} (${i.unidade})</option>`).join('')}
            </select>
        </div>
        <div class="col-3 col-sm-3">
            <input type="number" class="form-control input-meta" placeholder="Meta" min="1" required>
        </div>
        <div class="col-2 col-sm-1 text-end">
            <button type="button" class="btn btn-outline-danger w-100 btn-remover" title="Remover item">✕</button>
        </div>
    `;

    div.querySelector('.btn-remover').addEventListener('click', () => {
        if (document.querySelectorAll('.linha-item-nova').length > 1) {
            div.remove();
        } else {
            alert('A campanha precisa de pelo menos um item (RN02).');
        }
    });

    container.appendChild(div);
}

async function inicializarPagina() {
    const alertaPermissao = document.getElementById('alerta-permissao');
    const cardForm = document.getElementById('card-formulario-campanha');

    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('camp-inicio').value = hoje;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const { data: perfil } = await supabase
        .from('usuario')
        .select('perfil')
        .eq('id', user.id)
        .single();

    if (perfil?.perfil !== 'organizacao') {
        cardForm.classList.add('d-none');
        alertaPermissao.innerHTML = `
            <div class="alert alert-warning rounded-4 shadow-sm">
                <h4 class="alert-heading h6 fw-bold">🔒 Área exclusiva de Organizações</h4>
                <p class="small mb-2">Sua conta atual está com perfil <strong>${(perfil?.perfil || 'doador').toUpperCase()}</strong>. Apenas instituições verificadas podem criar campanhas (RN01).</p>
                <a href="login.html?perfil=organizacao" class="btn btn-success btn-sm fw-bold">Cadastrar uma Organização</a>
            </div>`;
        return;
    }

    const { data: org } = await supabase
        .from('organizacao')
        .select('*')
        .eq('usuario_id', user.id)
        .single();

    if (!org || org.status !== 'aprovada') {
        cardForm.classList.add('d-none');
        alertaPermissao.innerHTML = `
            <div class="alert alert-warning rounded-4 shadow-sm">
                <h4 class="alert-heading h6 fw-bold">⏳ Organização aguardando aprovação (RN01)</h4>
                <p class="small mb-0">A instituição <strong>${org?.nome || 'cadastrada'}</strong> está com status <strong>${(org?.status || 'pendente').toUpperCase()}</strong>. Peça ao administrador para aprová-la no Painel Admin.</p>
            </div>`;
        return;
    }

    orgAtual = org;

    const { data: itens } = await supabase
        .from('item')
        .select('id, nome, unidade')
        .order('nome');

    catalogoItens = itens || [];
    criarLinhaItem();
}

document.getElementById('btn-adicionar-item').addEventListener('click', criarLinhaItem);

document.getElementById('form-criar-campanha').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('alerta-feedback');
    const btnPublicar = document.getElementById('btn-publicar');
    feedback.innerHTML = '';

    const titulo = document.getElementById('camp-titulo').value.trim();
    const descricao = document.getElementById('camp-desc').value.trim();
    const dataInicio = document.getElementById('camp-inicio').value;
    const dataFim = document.getElementById('camp-fim').value;

    if (dataFim <= dataInicio) {
        feedback.innerHTML = `<div class="alert alert-danger">A data de encerramento deve ser posterior à data de início (RN02).</div>`;
        return;
    }

    const linhas = [...document.querySelectorAll('.linha-item-nova')];
    const itensMap = new Map();

    for (const linha of linhas) {
        const itemId = parseInt(linha.querySelector('.select-item').value, 10);
        const meta = parseInt(linha.querySelector('.input-meta').value, 10);
        if (meta <= 0 || isNaN(meta)) {
            feedback.innerHTML = `<div class="alert alert-danger">Todas as metas devem ser maiores que zero (RN02).</div>`;
            return;
        }
        itensMap.set(itemId, (itensMap.get(itemId) || 0) + meta);
    }

    btnPublicar.disabled = true;
    btnPublicar.textContent = 'Publicando campanha...';

    const { data: novaCampanha, error: errCamp } = await supabase
        .from('campanha')
        .insert({
            organizacao_id: orgAtual.id,
            titulo,
            descricao,
            data_inicio: dataInicio,
            data_fim: dataFim,
            status: 'ativa'
        })
        .select()
        .single();

    if (errCamp) {
        btnPublicar.disabled = false;
        btnPublicar.textContent = '🚀 Publicar Campanha Agora';
        feedback.innerHTML = `<div class="alert alert-danger">Erro ao criar campanha: ${errCamp.message}</div>`;
        return;
    }

    const itensInsert = Array.from(itensMap.entries()).map(([item_id, quantidade_meta]) => ({
        campanha_id: novaCampanha.id,
        item_id,
        quantidade_meta
    }));

    const { error: errItens } = await supabase
        .from('campanha_item')
        .insert(itensInsert);

    btnPublicar.disabled = false;
    btnPublicar.textContent = '🚀 Publicar Campanha Agora';

    if (errItens) {
        feedback.innerHTML = `<div class="alert alert-danger">Campanha criada, mas houve erro ao salvar os itens: ${errItens.message}</div>`;
        return;
    }

    feedback.innerHTML = `
        <div class="alert alert-success shadow-sm">
            <h4 class="alert-heading h6 fw-bold">🎉 Campanha publicada com sucesso!</h4>
            <p class="small mb-2">A campanha <strong>${titulo}</strong> já está visível na página inicial.</p>
            <div class="d-flex flex-wrap gap-2">
                <a href="campanha.html?id=${novaCampanha.id}" class="btn btn-success btn-sm fw-bold">Ver Campanha Publicada</a>
                <a href="painel-org.html" class="btn btn-outline-success btn-sm">Ir para o Painel da Organização</a>
            </div>
        </div>
    `;
    e.target.reset();
    document.getElementById('lista-itens-campanha').innerHTML = '';
    criarLinhaItem();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.addEventListener('DOMContentLoaded', () => {
    carregarNavbar();
    inicializarPagina();
});

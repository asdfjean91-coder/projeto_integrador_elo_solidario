import { supabase, carregarNavbar } from './supabase-client.js';

let orgAtual = null;

async function initPainelOrg() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const { data: perfil } = await supabase.from('usuario').select('perfil').eq('id', user.id).single();
    if (perfil?.perfil !== 'organizacao') {
        document.body.innerHTML = '<div class="container my-5 alert alert-danger">Erro 403: Acesso restrito a organizações.</div>';
        return;
    }

    const { data: org } = await supabase.from('organizacao').select('*').eq('usuario_id', user.id).single();
    orgAtual = org;

    const statusBox = document.getElementById('status-org-box');
    if (org.status !== 'aprovada') {
        statusBox.innerHTML = `<div class="alert alert-warning">Status da organização: <strong>${org.status.toUpperCase()}</strong>. Aguarde aprovação do administrador para publicar campanhas (RN01).</div>`;
    } else {
        statusBox.innerHTML = `<div class="alert alert-success">Organização verificada: <strong>${org.nome}</strong></div>`;
    }

    const { data: itens } = await supabase.from('item').select('id, nome, unidade');
    document.getElementById('select-item-cat').innerHTML = itens.map(i => `<option value="${i.id}">${i.nome} (${i.unidade})</option>`).join('');

    await carregarCampanhasEDoacoes();
}

async function carregarCampanhasEDoacoes() {
    const { data: camps } = await supabase.from('campanha').select('*').eq('organizacao_id', orgAtual.id);
    const selCamp = document.getElementById('select-camp-dist');
    const listaCamps = document.getElementById('lista-minhas-campanhas');

    selCamp.innerHTML = (camps || []).map(c => `<option value="${c.id}">${c.titulo}</option>`).join('');
    listaCamps.innerHTML = (camps || []).map(c => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <div><strong>${c.titulo}</strong> <span class="badge bg-secondary">${c.status}</span></div>
            ${c.status === 'ativa' ? `<button class="btn btn-outline-danger btn-sm btn-encerrar" data-id="${c.id}">Encerrar</button>` : ''}
        </div>
    `).join('') || '<p class="text-muted small">Nenhuma campanha cadastrada.</p>';

    document.querySelectorAll('.btn-encerrar').forEach(btn => {
        btn.addEventListener('click', async () => {
            await supabase.from('campanha').update({ status: 'encerrada' }).eq('id', btn.dataset.id);
            carregarCampanhasEDoacoes();
        });
    });

    const campIds = (camps || []).map(c => c.id);
    if (campIds.length === 0) {
        document.getElementById('lista-doacoes-pendentes').innerHTML = '<p class="text-muted small">Nenhuma doação.</p>';
        return;
    }

    const { data: doacoes } = await supabase
        .from('doacao')
        .select('id, codigo, status, usuario(nome), doacao_item(quantidade, campanha_item(item(nome, unidade)))')
        .in('campanha_id', campIds)
        .eq('status', 'prometida');

    document.getElementById('lista-doacoes-pendentes').innerHTML = (doacoes || []).map(d => {
        const resumo = d.doacao_item.map(di => `${di.quantidade} ${di.campanha_item.item.unidade} ${di.campanha_item.item.nome}`).join(', ');
        return `
        <div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
            <div>
                <strong>${d.codigo}</strong> — ${d.usuario?.nome}<br>
                <small class="text-muted">${resumo}</small>
            </div>
            <button class="btn btn-elo btn-sm btn-confirmar-rec" data-id="${d.id}">Receber</button>
        </div>`;
    }).join('') || '<p class="text-muted small">Nenhuma doação pendente.</p>';

    document.querySelectorAll('.btn-confirmar-rec').forEach(btn => {
        btn.addEventListener('click', async () => {
            await supabase.from('doacao').update({ status: 'entregue' }).eq('id', btn.dataset.id);
            carregarCampanhasEDoacoes();
        });
    });
}

document.getElementById('form-nova-campanha').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: camp, error } = await supabase.from('campanha').insert({
        organizacao_id: orgAtual.id,
        titulo: document.getElementById('camp-titulo').value,
        descricao: document.getElementById('camp-desc').value,
        data_fim: document.getElementById('camp-fim').value
    }).select().single();

    if (error) { alert(error.message); return; }

    await supabase.from('campanha_item').insert({
        campanha_id: camp.id,
        item_id: parseInt(document.getElementById('select-item-cat').value, 10),
        quantidade_meta: parseInt(document.getElementById('meta-item-cat').value, 10)
    });

    e.target.reset();
    carregarCampanhasEDoacoes();
});

document.getElementById('form-distribuicao').addEventListener('submit', async (e) => {
    e.preventDefault();
    await supabase.from('distribuicao').insert({
        campanha_id: parseInt(document.getElementById('select-camp-dist').value, 10),
        familias_atendidas: parseInt(document.getElementById('dist-familias').value, 10),
        descricao: document.getElementById('dist-desc').value
    });
    alert('Distribuição registrada no painel público de transparência!');
    e.target.reset();
});

document.addEventListener('DOMContentLoaded', () => {
    carregarNavbar();
    initPainelOrg();
});

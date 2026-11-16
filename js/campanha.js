import { supabase, carregarNavbar } from './supabase-client.js';

const params = new URLSearchParams(window.location.search);
const campanhaId = params.get('id');
let itensDisponiveis = [];

async function carregarDetalhe() {
    itensDisponiveis = [];
    const { data: camp } = await supabase
        .from('campanha')
        .select(`
            *,
            organizacao ( nome, endereco, bairro, cidade, uf, horario_atendimento, usuario ( telefone ) ),
            campanha_item (
                id, quantidade_meta, quantidade_recebida,
                item ( nome, unidade ),
                doacao_item ( quantidade, doacao ( status ) )
            )
        `)
        .eq('id', campanhaId)
        .single();

    if (!camp) return;

    const tel = camp.organizacao.usuario?.telefone?.replace(/\D/g, '') || '';
    const msgWpp = encodeURIComponent(`Olá! Vi a campanha "${camp.titulo}" no Elo Solidário e gostaria de tirar uma dúvida.`);
    const linkWpp = tel ? `<a href="https://wa.me/55${tel}?text=${msgWpp}" target="_blank" class="btn btn-outline-success btn-sm mt-2">💬 Falar no WhatsApp</a>` : '';

    document.getElementById('detalhe-campanha').innerHTML = `
        <h1 class="h4 fw-bold text-success">${camp.titulo}</h1>
        <p class="text-muted mb-2">${camp.descricao}</p>
        <div class="hero-card p-3 small mb-3">
            <strong>Ponto de entrega:</strong> ${camp.organizacao.nome} — ${camp.organizacao.endereco}, ${camp.organizacao.bairro}, ${camp.organizacao.cidade}/${camp.organizacao.uf}<br>
            <strong>Horário:</strong> ${camp.organizacao.horario_atendimento}<br>
            ${linkWpp}
        </div>
        <h2 class="h6 fw-bold mb-2">Itens Necessários</h2>
        ${camp.campanha_item.map(ci => {
            const prometido = ci.doacao_item
                .filter(di => di.doacao?.status === 'prometida')
                .reduce((acc, di) => acc + di.quantidade, 0);
            const saldo = Math.max(0, ci.quantidade_meta - ci.quantidade_recebida - prometido);
            const pct = Math.min(100, Math.round((ci.quantidade_recebida / ci.quantidade_meta) * 100));

            itensDisponiveis.push({ id: ci.id, nome: ci.item.nome, unidade: ci.item.unidade, saldo });

            return `
            <div class="mb-3">
                <div class="d-flex justify-content-between small fw-semibold">
                    <span>${ci.item.nome} (${ci.item.unidade})</span>
                    <span>Recebido: ${ci.quantidade_recebida}/${ci.quantidade_meta} (Falta: ${saldo})</span>
                </div>
                <div class="progress">
                    <div class="progress-bar progress-bar-elo" style="width: ${pct}%"></div>
                </div>
            </div>`;
        }).join('')}
    `;

    document.getElementById('lista-itens-doar').innerHTML = itensDisponiveis.map(it => `
        <div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
            <div>
                <div class="fw-semibold">${it.nome}</div>
                <small class="text-muted">Saldo restante: ${it.saldo} ${it.unidade}</small>
            </div>
            <input type="number" class="form-control w-25 input-qtd-doacao" 
                   data-ci-id="${it.id}" data-saldo="${it.saldo}" 
                   min="0" max="${it.saldo}" value="0" ${it.saldo === 0 ? 'disabled' : ''}>
        </div>
    `).join('');
}

document.getElementById('form-doacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alerta = document.getElementById('alerta-doacao');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        alerta.innerHTML = `<div class="alert alert-warning">Faça <a href="login.html">login</a> para registrar sua doação.</div>`;
        return;
    }

    const inputs = [...document.querySelectorAll('.input-qtd-doacao')];
    const selecionados = [];

    for (const inp of inputs) {
        const qtd = parseInt(inp.value, 10) || 0;
        const saldo = parseInt(inp.dataset.saldo, 10);
        if (qtd > saldo) {
            alerta.innerHTML = `<div class="alert alert-danger">Quantidade informada excede o saldo disponível (${saldo}). (RN03)</div>`;
            return;
        }
        if (qtd > 0) {
            selecionados.push({ campanha_item_id: parseInt(inp.dataset.ciId, 10), quantidade: qtd });
        }
    }

    if (selecionados.length === 0) {
        alerta.innerHTML = `<div class="alert alert-warning">Selecione ao menos 1 item com quantidade maior que zero.</div>`;
        return;
    }

    const codigo = 'DOA-' + Math.floor(1000 + Math.random() * 9000);
    const dataPrevista = document.getElementById('data-prevista').value;

    const { data: doacao, error } = await supabase
        .from('doacao')
        .insert({ doador_id: user.id, campanha_id: campanhaId, codigo, data_prevista: dataPrevista })
        .select()
        .single();

    if (error) {
        alerta.innerHTML = `<div class="alert alert-danger">Erro ao registrar doação.</div>`;
        return;
    }

    const itensInsert = selecionados.map(s => ({ ...s, doacao_id: doacao.id }));
    await supabase.from('doacao_item').insert(itensInsert);

    alerta.innerHTML = `
        <div class="alert alert-success">
            <strong>Doação registrada com sucesso!</strong><br>
            Apresente o código <span class="badge bg-dark fs-6">${codigo}</span> no ponto de entrega.
        </div>`;
    e.target.reset();
    carregarDetalhe();
});

document.addEventListener('DOMContentLoaded', () => {
    carregarNavbar();
    carregarDetalhe();
});

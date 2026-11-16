import { supabase } from './supabase-client.js';

const alerta = document.getElementById('alerta-auth');
const selectPerfil = document.getElementById('cad-perfil');
const camposOrg = document.getElementById('campos-org');

selectPerfil.addEventListener('change', () => {
    camposOrg.classList.toggle('d-none', selectPerfil.value !== 'organizacao');
});

// LOGIN (CT02: mensagem genérica)
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    alerta.innerHTML = '';
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alerta.innerHTML = `<div class="alert alert-danger" role="alert">E-mail ou senha inválidos.</div>`;
        return;
    }
    window.location.href = 'index.html';
});

// CADASTRO (CT01: valida e-mail único + mensagem clara de sucesso)
document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    alerta.innerHTML = '';

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Cadastrando...';

    const perfil = selectPerfil.value;
    const nome = document.getElementById('cad-nome').value;
    const email = document.getElementById('cad-email').value;
    const telefone = document.getElementById('cad-telefone').value;
    const password = document.getElementById('cad-senha').value;

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error || !data.user) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Finalizar Cadastro';
        alerta.innerHTML = `<div class="alert alert-danger" role="alert">Não foi possível cadastrar: este e-mail já está em uso ou é inválido.</div>`;
        return;
    }

    const userId = data.user.id;

    // 1. Grava perfil na tabela usuario
    const { error: errUser } = await supabase
        .from('usuario')
        .insert({ id: userId, nome, email, telefone, perfil });

    if (errUser) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Finalizar Cadastro';
        alerta.innerHTML = `<div class="alert alert-danger" role="alert">Erro ao guardar dados do utilizador: ${errUser.message}</div>`;
        return;
    }

    // 2. Se for organização, cria registo pendente (RN01)
    if (perfil === 'organizacao') {
        const { error: errOrg } = await supabase.from('organizacao').insert({
            usuario_id: userId,
            nome: document.getElementById('org-nome').value,
            tipo: document.getElementById('org-tipo').value,
            cnpj: document.getElementById('org-cnpj').value,
            endereco: document.getElementById('org-endereco').value,
            bairro: document.getElementById('org-bairro').value,
            cidade: document.getElementById('org-cidade').value,
            horario_atendimento: document.getElementById('org-horario').value,
            status: 'pendente'
        });

        if (errOrg) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Finalizar Cadastro';
            alerta.innerHTML = `<div class="alert alert-danger" role="alert">Erro ao registar organização: ${errOrg.message}</div>`;
            return;
        }
    }

    // Limpa o formulário e exibe mensagem permanente de sucesso com botão de ação
    e.target.reset();
    camposOrg.classList.add('d-none');
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Finalizar Cadastro';

    const avisoExtra = perfil === 'organizacao'
        ? '<p class="mb-2 small">O cadastro da sua organização está <strong>pendente de aprovação</strong> pelo administrador (RN01).</p>'
        : '<p class="mb-2 small">Já pode escolher uma campanha e registar as suas doações.</p>';

    alerta.innerHTML = `
        <div class="alert alert-success shadow-sm" role="alert">
            <h4 class="alert-heading h6 fw-bold">✅ Cadastro realizado com sucesso!</h4>
            <p class="mb-1">Bem-vindo(a), <strong>${nome}</strong>! A sua conta foi criada e autenticada.</p>
            ${avisoExtra}
            <hr>
            <a href="index.html" class="btn btn-success btn-sm fw-bold">Ir para a Página Inicial</a>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

import { supabase } from './supabase-client.js';

const alerta = document.getElementById('alerta-auth');
const selectPerfil = document.getElementById('cad-perfil');
const camposOrg = document.getElementById('campos-org');

function alternarCamposOrg(isOrg) {
    camposOrg.classList.toggle('d-none', !isOrg);
    document.getElementById('org-nome').required = isOrg;
    document.getElementById('org-endereco').required = isOrg;
    document.getElementById('org-bairro').required = isOrg;
    document.getElementById('org-horario').required = isOrg;
}

selectPerfil.addEventListener('change', () => {
    alternarCamposOrg(selectPerfil.value === 'organizacao');
});

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const aba = urlParams.get('aba');
    const perfilUrl = urlParams.get('perfil');

    if (aba === 'cadastro' || perfilUrl === 'organizacao') {
        const tabCadastroBtn = document.querySelector('[data-bs-target="#tab-cadastro"]');
        if (tabCadastroBtn && window.bootstrap) {
            new window.bootstrap.Tab(tabCadastroBtn).show();
        }
    }

    if (perfilUrl === 'organizacao') {
        selectPerfil.value = 'organizacao';
        alternarCamposOrg(true);
    }
});

// LOGIN
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    alerta.innerHTML = '';

    const btnLogin = e.target.querySelector('button[type="submit"]');
    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-senha').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    btnLogin.disabled = false;
    btnLogin.textContent = 'Entrar';

    if (error) {
        let msgErro = 'E-mail ou senha inválidos.';
        if (error.message.includes('Email not confirmed')) {
            msgErro = 'E-mail ainda não confirmado no Supabase. Desative "Confirm email" em Authentication > Sign In / Providers.';
        }
        alerta.innerHTML = `<div class="alert alert-danger" role="alert">${msgErro}</div>`;
        return;
    }

    window.location.href = 'index.html';
});

// CADASTRO + LOGIN AUTOMÁTICO
document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    alerta.innerHTML = '';

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Criando conta...';

    const perfil = selectPerfil.value;
    const nome = document.getElementById('cad-nome').value.trim();
    const email = document.getElementById('cad-email').value.trim();
    const telefone = document.getElementById('cad-telefone').value.trim();
    const password = document.getElementById('cad-senha').value;

    const metadata = {
        nome,
        telefone,
        perfil,
        org_nome: document.getElementById('org-nome').value.trim(),
        org_tipo: document.getElementById('org-tipo').value,
        org_cnpj: document.getElementById('org-cnpj').value.trim(),
        org_endereco: document.getElementById('org-endereco').value.trim(),
        org_bairro: document.getElementById('org-bairro').value.trim(),
        org_cidade: document.getElementById('org-cidade').value.trim(),
        org_horario: document.getElementById('org-horario').value.trim()
    };

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
    });

    if (error || !data.user) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Finalizar Cadastro';
        alerta.innerHTML = `<div class="alert alert-danger" role="alert">Não foi possível cadastrar: ${error?.message || 'verifique os dados.'}</div>`;
        return;
    }

    await supabase.from('usuario').upsert({
        id: data.user.id,
        nome,
        email,
        telefone,
        perfil
    });

    if (perfil === 'organizacao') {
        await supabase.from('organizacao').upsert({
            usuario_id: data.user.id,
            nome: metadata.org_nome,
            tipo: metadata.org_tipo,
            cnpj: metadata.org_cnpj,
            endereco: metadata.org_endereco,
            bairro: metadata.org_bairro,
            cidade: metadata.org_cidade,
            horario_atendimento: metadata.org_horario,
            status: 'pendente'
        }, { onConflict: 'usuario_id' });
    }

    await supabase.auth.signInWithPassword({ email, password });

    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Finalizar Cadastro';
    e.target.reset();
    alternarCamposOrg(false);

    const destino = perfil === 'organizacao' ? 'painel-org.html' : 'index.html';
    const avisoExtra = perfil === 'organizacao'
        ? '<p class="mb-2 small">Sua organização foi cadastrada e está <strong>aguardando aprovação do administrador</strong> (RN01).</p>'
        : '<p class="mb-2 small">Você já está conectado e pronto para realizar suas doações!</p>';

    alerta.innerHTML = `
        <div class="alert alert-success shadow-sm" role="alert">
            <h4 class="alert-heading h6 fw-bold">🎉 Cadastro realizado com sucesso!</h4>
            <p class="mb-1">Seja muito bem-vindo(a), <strong>${nome}</strong>!</p>
            ${avisoExtra}
            <hr>
            <a href="${destino}" class="btn btn-success btn-sm fw-bold">Acessar Plataforma Agora →</a>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

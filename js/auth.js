import { supabase } from './supabase-client.js';

const alerta = document.getElementById('alerta-auth');
const selectPerfil = document.getElementById('cad-perfil');
const camposOrg = document.getElementById('campos-org');

selectPerfil.addEventListener('change', () => {
    camposOrg.classList.toggle('d-none', selectPerfil.value !== 'organizacao');
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
            msgErro = 'E-mail ainda não confirmado no Supabase. Desative "Confirm email" em Authentication > Providers > Email e exclua este usuário antigo para cadastrar de novo.';
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

    // 1. Cria a conta no Supabase Auth
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

    // 2. Garante gravação nas tabelas caso o trigger ainda não tenha sido criado
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

    // 3. Faz login automático imediatamente após o cadastro
    await supabase.auth.signInWithPassword({ email, password });

    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Finalizar Cadastro';
    e.target.reset();
    camposOrg.classList.add('d-none');

    const avisoExtra = perfil === 'organizacao'
        ? '<p class="mb-2 small">Sua organização foi cadastrada e está <strong>aguardando aprovação do administrador</strong> (RN01).</p>'
        : '<p class="mb-2 small">Você já está conectado e pronto para realizar suas doações!</p>';

    alerta.innerHTML = `
        <div class="alert alert-success shadow-sm" role="alert">
            <h4 class="alert-heading h6 fw-bold">🎉 Cadastro realizado com sucesso!</h4>
            <p class="mb-1">Seja muito bem-vindo(a), <strong>${nome}</strong>!</p>
            ${avisoExtra}
            <hr>
            <a href="index.html" class="btn btn-success btn-sm fw-bold">Entrar na Plataforma Agora →</a>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

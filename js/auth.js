import { supabase } from './supabase-client.js';

const alerta = document.getElementById('alerta-auth');
const selectPerfil = document.getElementById('cad-perfil');
const camposOrg = document.getElementById('campos-org');

selectPerfil.addEventListener('change', () => {
    camposOrg.classList.toggle('d-none', selectPerfil.value !== 'organizacao');
});

// LOGIN (CT02)
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

// CADASTRO (CT01 + gravação garantida via Trigger)
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

    const metadata = {
        nome,
        telefone,
        perfil,
        org_nome: document.getElementById('org-nome').value,
        org_tipo: document.getElementById('org-tipo').value,
        org_cnpj: document.getElementById('org-cnpj').value,
        org_endereco: document.getElementById('org-endereco').value,
        org_bairro: document.getElementById('org-bairro').value,
        org_cidade: document.getElementById('org-cidade').value,
        org_horario: document.getElementById('org-horario').value
    };

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
    });

    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Finalizar Cadastro';

    if (error || !data.user) {
        alerta.innerHTML = `<div class="alert alert-danger" role="alert">Erro ao cadastrar: ${error?.message || 'verifique os dados e tente novamente.'}</div>`;
        return;
    }

    e.target.reset();
    camposOrg.classList.add('d-none');

    const avisoExtra = perfil === 'organizacao'
        ? '<p class="mb-2 small">O cadastro da sua organização está <strong>pendente de aprovação</strong> pelo administrador (RN01).</p>'
        : '<p class="mb-2 small">Sua conta já está ativa para realizar doações.</p>';

    alerta.innerHTML = `
        <div class="alert alert-success shadow-sm" role="alert">
            <h4 class="alert-heading h6 fw-bold">✅ Cadastro realizado com sucesso!</h4>
            <p class="mb-1">Bem-vindo(a), <strong>${nome}</strong>!</p>
            ${avisoExtra}
            <hr>
            <a href="index.html" class="btn btn-success btn-sm fw-bold">Ir para a Página Inicial</a>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

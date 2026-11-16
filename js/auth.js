import { supabase } from './supabase-client.js';

const alerta = document.getElementById('alerta-auth');
const selectPerfil = document.getElementById('cad-perfil');
const camposOrg = document.getElementById('campos-org');

selectPerfil.addEventListener('change', () => {
    camposOrg.classList.toggle('d-none', selectPerfil.value !== 'organizacao');
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alerta.innerHTML = `<div class="alert alert-danger">E-mail ou senha inválidos.</div>`;
        return;
    }
    window.location.href = 'index.html';
});

document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const perfil = selectPerfil.value;
    const nome = document.getElementById('cad-nome').value;
    const email = document.getElementById('cad-email').value;
    const telefone = document.getElementById('cad-telefone').value;
    const password = document.getElementById('cad-senha').value;

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        alerta.innerHTML = `<div class="alert alert-danger">Não foi possível cadastrar: e-mail já em uso ou inválido.</div>`;
        return;
    }

    const userId = data.user.id;
    await supabase.from('usuario').insert({ id: userId, nome, email, telefone, perfil });

    if (perfil === 'organizacao') {
        await supabase.from('organizacao').insert({
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
    }

    alerta.innerHTML = `<div class="alert alert-success">Cadastro realizado! Redirecionando...</div>`;
    setTimeout(() => window.location.href = 'index.html', 1200);
});

# 🤝 Elo Solidário

Plataforma web para arrecadação e doação de alimentos e itens básicos a famílias em situação de vulnerabilidade.

**Curso Técnico em Análise e Desenvolvimento de Sistemas — CETI Malaquias Ribeiro Damasceno (São Lourenço do Piauí - PI)**

## Como publicar (GitHub Pages + Supabase)

1. Crie um projeto gratuito no [Supabase](https://supabase.com).
2. No **SQL Editor** do Supabase, execute o arquivo `sql/schema.sql`.
3. Em **Authentication -> Providers -> Email**, desative *Confirm email* para facilitar testes.
4. Copie a **Project URL** e a **anon public key** em **Project Settings -> API** e cole no arquivo `js/supabase-client.js`.
5. Suba os arquivos para um repositório no GitHub e ative o **GitHub Pages** na branch `main`.

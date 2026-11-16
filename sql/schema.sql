-- ==============================================================================
-- ELO SOLIDÁRIO - SCHEMA POSTGRESQL PARA SUPABASE
-- ==============================================================================

CREATE TABLE public.usuario (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT,
    perfil TEXT NOT NULL DEFAULT 'doador' CHECK (perfil IN ('doador', 'organizacao', 'admin')),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.organizacao (
    id SERIAL PRIMARY KEY,
    usuario_id UUID UNIQUE REFERENCES public.usuario(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cnpj TEXT,
    tipo TEXT NOT NULL,
    endereco TEXT NOT NULL,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL DEFAULT 'São Lourenço do Piauí',
    uf CHAR(2) NOT NULL DEFAULT 'PI',
    horario_atendimento TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada', 'suspensa'))
);

CREATE TABLE public.categoria (
    id SERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL
);

CREATE TABLE public.item (
    id SERIAL PRIMARY KEY,
    categoria_id INT REFERENCES public.categoria(id) ON DELETE RESTRICT,
    nome TEXT NOT NULL,
    unidade TEXT NOT NULL
);

CREATE TABLE public.campanha (
    id SERIAL PRIMARY KEY,
    organizacao_id INT REFERENCES public.organizacao(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE NOT NULL CHECK (data_fim > data_inicio),
    status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'encerrada', 'cancelada'))
);

CREATE TABLE public.campanha_item (
    id SERIAL PRIMARY KEY,
    campanha_id INT REFERENCES public.campanha(id) ON DELETE CASCADE,
    item_id INT REFERENCES public.item(id) ON DELETE RESTRICT,
    quantidade_meta INT NOT NULL CHECK (quantidade_meta > 0),
    quantidade_recebida INT NOT NULL DEFAULT 0 CHECK (quantidade_recebida >= 0),
    UNIQUE(campanha_id, item_id)
);

CREATE TABLE public.doacao (
    id SERIAL PRIMARY KEY,
    doador_id UUID REFERENCES public.usuario(id) ON DELETE CASCADE,
    campanha_id INT REFERENCES public.campanha(id) ON DELETE CASCADE,
    codigo TEXT UNIQUE NOT NULL,
    data_prevista DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'prometida' CHECK (status IN ('prometida', 'entregue', 'cancelada', 'expirada')),
    observacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.doacao_item (
    id SERIAL PRIMARY KEY,
    doacao_id INT REFERENCES public.doacao(id) ON DELETE CASCADE,
    campanha_item_id INT REFERENCES public.campanha_item(id) ON DELETE CASCADE,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    validade_minima DATE
);

CREATE TABLE public.distribuicao (
    id SERIAL PRIMARY KEY,
    campanha_id INT REFERENCES public.campanha(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    familias_atendidas INT NOT NULL CHECK (familias_atendidas > 0),
    descricao TEXT NOT NULL
);

CREATE OR REPLACE FUNCTION verificar_org_aprovada()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.organizacao 
        WHERE id = NEW.organizacao_id AND status = 'aprovada'
    ) THEN
        RAISE EXCEPTION 'RN01: Apenas organizações aprovadas pelo administrador podem criar campanhas.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rn01_org_aprovada
BEFORE INSERT ON public.campanha
FOR EACH ROW EXECUTE FUNCTION verificar_org_aprovada();

CREATE OR REPLACE FUNCTION atualizar_progresso_recebimento()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'entregue' AND OLD.status <> 'entregue' THEN
        UPDATE public.campanha_item ci
        SET quantidade_recebida = ci.quantidade_recebida + di.quantidade
        FROM public.doacao_item di
        WHERE di.doacao_id = NEW.id AND di.campanha_item_id = ci.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rn05_confirmar_doacao
AFTER UPDATE OF status ON public.doacao
FOR EACH ROW EXECUTE FUNCTION atualizar_progresso_recebimento();

CREATE OR REPLACE FUNCTION expirar_doacoes_atrasadas()
RETURNS VOID AS $$
BEGIN
    UPDATE public.doacao
    SET status = 'expirada'
    WHERE status = 'prometida' AND data_prevista < (CURRENT_DATE - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doacao_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribuicao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura publica organizacoes" ON public.organizacao FOR SELECT USING (true);
CREATE POLICY "Leitura publica categorias" ON public.categoria FOR SELECT USING (true);
CREATE POLICY "Leitura publica itens" ON public.item FOR SELECT USING (true);
CREATE POLICY "Leitura publica campanhas" ON public.campanha FOR SELECT USING (true);
CREATE POLICY "Leitura publica campanha_item" ON public.campanha_item FOR SELECT USING (true);
CREATE POLICY "Leitura publica distribuicao" ON public.distribuicao FOR SELECT USING (true);
CREATE POLICY "Leitura usuarios" ON public.usuario FOR SELECT USING (true);

CREATE POLICY "Usuario edita proprio perfil" ON public.usuario FOR ALL USING (auth.uid() = id);
CREATE POLICY "Org gerencia propria entidade" ON public.organizacao FOR ALL USING (auth.uid() = usuario_id);
CREATE POLICY "Admin gerencia orgs" ON public.organizacao FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.usuario WHERE id = auth.uid() AND perfil = 'admin')
);
CREATE POLICY "Admin gerencia catalogo" ON public.item FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuario WHERE id = auth.uid() AND perfil = 'admin')
);
CREATE POLICY "Org gerencia campanhas" ON public.campanha FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organizacao WHERE id = organizacao_id AND usuario_id = auth.uid())
);
CREATE POLICY "Org gerencia itens campanha" ON public.campanha_item FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.campanha c 
        JOIN public.organizacao o ON c.organizacao_id = o.id 
        WHERE c.id = campanha_id AND o.usuario_id = auth.uid()
    )
);
CREATE POLICY "Org registra distribuicao" ON public.distribuicao FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.campanha c 
        JOIN public.organizacao o ON c.organizacao_id = o.id 
        WHERE c.id = campanha_id AND o.usuario_id = auth.uid()
    )
);
CREATE POLICY "Doador e Org veem doacoes" ON public.doacao FOR SELECT USING (
    auth.uid() = doador_id OR EXISTS (
        SELECT 1 FROM public.campanha c 
        JOIN public.organizacao o ON c.organizacao_id = o.id 
        WHERE c.id = campanha_id AND o.usuario_id = auth.uid()
    )
);
CREATE POLICY "Doador cria doacao" ON public.doacao FOR INSERT WITH CHECK (auth.uid() = doador_id);
CREATE POLICY "Org confirma doacao" ON public.doacao FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.campanha c 
        JOIN public.organizacao o ON c.organizacao_id = o.id 
        WHERE c.id = campanha_id AND o.usuario_id = auth.uid()
    )
);
CREATE POLICY "Acesso itens doacao" ON public.doacao_item FOR ALL USING (true);

INSERT INTO public.categoria (nome) VALUES 
('Alimentos não perecíveis'),
('Higiene e limpeza'),
('Vestuário e agasalhos');

INSERT INTO public.item (categoria_id, nome, unidade) VALUES
(1, 'Arroz', 'kg'),
(1, 'Feijão', 'kg'),
(1, 'Óleo de soja', 'un'),
(1, 'Leite em pó', 'un'),
(1, 'Açúcar', 'kg'),
(1, 'Café em pó', 'pacote'),
(1, 'Macarrão', 'pacote'),
(2, 'Sabonete', 'un'),
(2, 'Água sanitária', 'L'),
(3, 'Cobertor / Agasalho', 'un');

-- 🚀 NOVA FEATURE: Suporte a múltiplos clusters da 3C Plus
-- Adicionar campo cluster_type para selecionar entre Cluster 1 e Cluster 2

-- Adicionar coluna cluster_type na tabela companies
ALTER TABLE companies 
ADD COLUMN cluster_type VARCHAR(20) DEFAULT 'cluster1' NOT NULL;

-- Adicionar constraint para validar valores
ALTER TABLE companies 
ADD CONSTRAINT companies_cluster_type_check 
CHECK (cluster_type IN ('cluster1', 'cluster2'));

-- Criar índice para performance
CREATE INDEX idx_companies_cluster_type ON companies(cluster_type);

-- Comentários explicativos
COMMENT ON COLUMN companies.cluster_type IS 'Tipo de cluster da 3C Plus: cluster1 (socket.3c.plus) ou cluster2 (new-socket.3cplus.com.br)';

-- Verificar empresas existentes (todas devem ter cluster1 por padrão)
-- SELECT name, cluster_type FROM companies ORDER BY created_at;


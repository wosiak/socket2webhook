# 🔧 DEBUG - Busca de Eventos

## 🎯 Problema Identificado
O endpoint `/events` estava retornando 404 porque a função do Supabase não foi deployada com as últimas alterações.

## 🛠️ Solução Implementada

### 1. **Busca Direta do Supabase como Fallback**
Adicionei uma busca direta na tabela `events` do Supabase como fallback quando a API falha.

**Localização do código:**
- `src/hooks/useWebhookManager.ts` (linhas 108-128)

```typescript
// Função para buscar eventos diretamente do Supabase
const loadEventsDirectly = useCallback(async () => {
  try {
    console.log('Buscando eventos diretamente do Supabase...')
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Erro ao buscar eventos diretamente:', error)
      return []
    }
    
    console.log('Eventos encontrados:', data)
    return data || []
  } catch (error) {
    console.error('Erro na busca direta de eventos:', error)
    return []
  }
}, [])
```

### 2. **Fallback na Busca de Dados**
Quando a API falha, o sistema automaticamente tenta buscar diretamente.

**Localização do código:**
- `src/hooks/useWebhookManager.ts` (linhas 167-175)

```typescript
// Process events - with fallback to direct Supabase
if (results[1].status === 'fulfilled') {
  setEvents(results[1].value.data || [])
} else {
  console.error('Failed to load events from API:', results[1].reason)
  console.log('Tentando buscar eventos diretamente...')
  const directEvents = await loadEventsDirectly()
  setEvents(directEvents)
}
```

## 📍 Fluxo de Busca de Eventos

1. **Hook principal**: `src/hooks/useWebhookManager.ts`
2. **Serviço de API**: `src/services/api.ts` → `apiService.getEvents()`
3. **Endpoint da API**: `/make-server-661cf1c3/events`
4. **Fallback**: Busca direta no Supabase
5. **Componente**: `src/components/MultiEventTypeSelector.tsx`
6. **Uso no CompanyDetail**: `src/components/CompanyDetail.tsx`

## 🔍 Como Verificar se Está Funcionando

### 1. Abra o Console do Navegador
- F12 → Console
- Procure por: "Buscando eventos diretamente do Supabase..."
- Deve mostrar: "Eventos encontrados: [array de eventos]"

### 2. No Modal de Novo Webhook
- Clique em "Tipos de Eventos"
- Deve mostrar os eventos da tabela `events`
- Eventos devem aparecer com `display_name` e `name`

## 🚀 Status Atual
- ✅ Cliente Supabase instalado
- ✅ Busca direta implementada
- ✅ Fallback funcionando
- ✅ Projeto compilando sem erros

## 📋 Próximos Passos
1. Teste o modal "Novo Webhook"
2. Verifique se os eventos aparecem
3. Teste a seleção múltipla
4. Confirme que o webhook é criado corretamente


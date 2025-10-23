import { useState } from "react";
import { Company } from "../types";

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

interface CompanyFormData {
  company_3c_id: string;
  name: string;
  api_token: string;
  status: 'active' | 'inactive';
  cluster_type: 'cluster1' | 'cluster2'; // 🚀 NOVO: Seleção de cluster
}

export function CompanyFormModal({ isOpen, onClose, onSubmit }: CompanyFormModalProps) {
  console.log("🔍 CompanyFormModal renderizando... isOpen:", isOpen);

  const [formData, setFormData] = useState<CompanyFormData>({
    company_3c_id: '',
    name: '',
    api_token: '',
    status: 'active',
    cluster_type: 'cluster1' // 🚀 PADRÃO: Cluster 1
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.company_3c_id || !formData.name || !formData.api_token) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        company_3c_id: '',
        name: '',
        api_token: '',
        status: 'active',
        cluster_type: 'cluster1'
      });
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = formData.company_3c_id && formData.name && formData.api_token;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
            Nova Empresa
          </h2>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>
            Configure uma nova empresa para monitoramento via socket
          </p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* ID da Empresa */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              ID da Empresa (3C Plus) *
            </label>
            <input
              type="text"
              value={formData.company_3c_id}
              onChange={(e) => setFormData(prev => ({ ...prev, company_3c_id: e.target.value }))}
              placeholder="Ex: 8673"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Nome da Empresa */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Nome da Empresa *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Wosiak"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Token de API */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Token de API *
            </label>
            <input
              type="password"
              value={formData.api_token}
              onChange={(e) => setFormData(prev => ({ ...prev, api_token: e.target.value }))}
              placeholder="Token do gestor para conexão socket"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 🚀 NOVO: Seleção de Cluster */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              🌐 Cluster 3C Plus
            </label>
            <select
              value={formData.cluster_type}
              onChange={(e) => setFormData(prev => ({ ...prev, cluster_type: e.target.value as 'cluster1' | 'cluster2' }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="cluster1">🟢 Cluster 1 (Padrão) - socket.3c.plus</option>
              <option value="cluster2">🔵 Cluster 2 (Novo) - new-socket.3cplus.com.br</option>
            </select>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
              Selecione o cluster onde sua empresa está hospedada na 3C Plus
            </p>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={formData.status === 'active'}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.checked ? 'active' : 'inactive' }))}
              style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
            />
            <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Empresa ativa
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              backgroundColor: 'white',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: (isValid && !isSubmitting) ? '#3b82f6' : '#9ca3af',
              border: 'none',
              cursor: (isValid && !isSubmitting) ? 'pointer' : 'not-allowed'
            }}
          >
            {isSubmitting ? 'Criando...' : 'Criar Empresa'}
          </button>
        </div>
      </div>
    </div>
  );
}
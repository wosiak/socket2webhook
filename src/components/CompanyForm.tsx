import { useState } from "react";
import { Company } from "../types";

interface CompanyFormProps {
  onBack: () => void;
  onSave: (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => Company;
  onCompanyCreated: (companyId: string) => void;
}

export function CompanyForm({ onBack, onSave, onCompanyCreated }: CompanyFormProps) {
  console.log("🔍 CompanyForm renderizando...");

  const [cluster, setCluster] = useState<'cluster1' | 'cluster2'>('cluster1');

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>TESTE - Nova Empresa</h1>
      
      <div style={{ marginTop: '20px' }}>
        <label>🌐 Cluster 3C Plus:</label>
        <br />
        <select 
          value={cluster} 
          onChange={(e) => setCluster(e.target.value as 'cluster1' | 'cluster2')}
          style={{ padding: '5px', marginTop: '5px', width: '300px' }}
        >
          <option value="cluster1">Cluster 1 - socket.3c.plus</option>
          <option value="cluster2">Cluster 2 - new-socket.3cplus.com.br</option>
        </select>
      </div>

      <div style={{ marginTop: '20px' }}>
        <p>Cluster selecionado: <strong>{cluster}</strong></p>
      </div>

      <button 
        onClick={onBack} 
        style={{ 
          marginTop: '20px', 
          padding: '10px 20px', 
          backgroundColor: '#ccc',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Voltar
      </button>
    </div>
  );
}
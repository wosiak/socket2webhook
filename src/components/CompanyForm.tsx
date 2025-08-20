import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Company } from "../types";
import { ArrowLeft, Building } from "lucide-react";

interface CompanyFormProps {
  onBack: () => void;
  onSave: (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => Company;
  onCompanyCreated: (companyId: string) => void;
}

interface CompanyFormData {
  company_3c_id: string;
  name: string;
  api_token: string;
  status: 'active' | 'inactive';
}

export function CompanyForm({ onBack, onSave, onCompanyCreated }: CompanyFormProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    company_3c_id: '',
    name: '',
    api_token: '',
    status: 'active'
  });

  const handleSubmit = () => {
    if (!formData.company_3c_id || !formData.name || !formData.api_token) return;

    const newCompany = onSave(formData);
    onCompanyCreated(newCompany.id);
  };

  const isValid = formData.company_3c_id && formData.name && formData.api_token;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1>Nova Empresa</h1>
          <p className="text-muted-foreground">
            Configure uma nova empresa para monitoramento via socket
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>
            Preencha as informações necessárias para conectar ao socket 3C Plus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="company_3c_id">ID da Empresa (3C Plus)</Label>
              <Input
                id="company_3c_id"
                value={formData.company_3c_id}
                onChange={(e) => setFormData(prev => ({ ...prev, company_3c_id: e.target.value }))}
                placeholder="Ex: 8673"
              />
              <p className="text-sm text-muted-foreground mt-1">
                ID único da empresa no sistema 3C Plus
              </p>
            </div>
            
            <div>
              <Label htmlFor="name">Nome da Empresa</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Wosiak"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Nome amigável para identificação da empresa
              </p>
            </div>
            
            <div>
              <Label htmlFor="api_token">Token de API</Label>
              <Input
                id="api_token"
                type="password"
                value={formData.api_token}
                onChange={(e) => setFormData(prev => ({ ...prev, api_token: e.target.value }))}
                placeholder="Token do gestor para conexão socket"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Token de autenticação para conexão ao socket da empresa
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={formData.status === 'active'}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))
                }
              />
              <Label htmlFor="status">Empresa ativa</Label>
              <p className="text-sm text-muted-foreground">
                Apenas empresas ativas receberão eventos via socket
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid}>
              Criar Empresa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
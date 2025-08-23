import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Company } from "../types";
import { Plus, Edit, Trash2, Building } from "lucide-react";

interface CompanyManagerProps {
  companies: Company[];
  onAddCompany: (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateCompany: (id: string, updates: Partial<Company>) => void;
  onDeleteCompany: (id: string) => void;
}

interface CompanyFormData {
  company_3c_id: string;
  name: string;
  api_token: string;
  status: 'active' | 'inactive';
}

export function CompanyManager({ 
  companies = [], 
  onAddCompany, 
  onUpdateCompany, 
  onDeleteCompany 
}: CompanyManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    company_3c_id: '',
    name: '',
    api_token: '',
    status: 'active'
  });

  const resetForm = () => {
    setFormData({
      company_3c_id: '',
      name: '',
      api_token: '',
      status: 'active'
    });
    setEditingCompany(null);
  };

  const handleSubmit = () => {
    if (!formData.company_3c_id || !formData.name || !formData.api_token) return;

    if (editingCompany) {
      onUpdateCompany(editingCompany.id, formData);
    } else {
      onAddCompany(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      company_3c_id: company.company_3c_id,
      name: company.name,
      api_token: company.api_token,
      status: company.status
    });
    setIsDialogOpen(true);
  };

  const handleStatusToggle = (company: Company) => {
    onUpdateCompany(company.id, {
      status: company.status === 'active' ? 'inactive' : 'active'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Gerenciamento de Empresas</h1>
          <p className="text-muted-foreground">
            Configure as empresas que serão monitoradas via socket
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </DialogTitle>
              <DialogDescription>
                Configure os dados da empresa para conexão ao socket 3C Plus
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="company_3c_id">ID da Empresa (3C Plus)</Label>
                <Input
                  id="company_3c_id"
                  value={formData.company_3c_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_3c_id: e.target.value }))}
                  placeholder="8673"
                />
              </div>
              
              <div>
                <Label htmlFor="name">Nome da Empresa</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Wosiak"
                />
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
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="status"
                      checked={formData.status === 'active'}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))
                      }
                      style={{
                        backgroundColor: formData.status === 'active' ? '#10b981' : '#ef4444'
                      }}
                    />
                    <div>
                      <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                        Status da Empresa
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.status === 'active' 
                          ? 'Empresa ativa e funcionando normalmente' 
                          : 'Empresa inativa - não receberá eventos'
                        }
                      </p>
                    </div>
                  </div>
                  <Badge 
                    className={`${
                      formData.status === 'active'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}
                  >
                    {formData.status === 'active' ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="text-[16px]">
                {editingCompany ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Empresas Configuradas
          </CardTitle>
          <CardDescription>
            {companies.length} empresa(s) cadastrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-8">
              <Building className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2">Nenhuma empresa cadastrada</h3>
              <p className="text-muted-foreground">
                Adicione uma empresa para começar a monitorar eventos
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID 3C</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>{company.company_3c_id}</TableCell>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                          {company.status === 'active' ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Switch
                          checked={company.status === 'active'}
                          onCheckedChange={() => handleStatusToggle(company)}
                          size="sm"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {company.api_token.substring(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {new Date(company.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(company)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteCompany(company.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
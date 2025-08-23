import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Alert, AlertDescription } from "./ui/alert";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Building,
  Key,
  Globe,
  Zap
} from "lucide-react";
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
}

export function CompanyFormModal({ isOpen, onClose, onSubmit }: CompanyFormModalProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    company_3c_id: '',
    name: '',
    api_token: '',
    status: 'active'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  const handleClose = () => {
    setFormData({
      company_3c_id: '',
      name: '',
      api_token: '',
      status: 'active'
    });
    setError(null);
    setValidationErrors({});
    setShowToken(false);
    setIsSubmitting(false);
    onClose();
  };

  // Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.company_3c_id.trim()) {
      errors.company_3c_id = 'ID da empresa é obrigatório';
    } else if (!/^\d+$/.test(formData.company_3c_id.trim())) {
      errors.company_3c_id = 'ID deve conter apenas números';
    }
    
    if (!formData.name.trim()) {
      errors.name = 'Nome da empresa é obrigatório';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.api_token.trim()) {
      errors.api_token = 'Token de API é obrigatório';
    } else if (formData.api_token.trim().length < 10) {
      errors.api_token = 'Token deve ter pelo menos 10 caracteres';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Por favor, corrija os erros nos campos');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Submitting form data:', formData);
      await onSubmit(formData);
      console.log('Company created successfully');
      handleClose();
    } catch (err) {
      console.error('Error creating company:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white/95 backdrop-blur-sm border-white/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Building className="h-5 w-5 text-blue-600" />
            Nova Empresa
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Configure uma nova empresa para monitoramento via socket 3C Plus
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_3c_id" className="text-sm font-medium text-gray-700">
                ID da Empresa (3C Plus)
              </Label>
              <Input
                id="company_3c_id"
                value={formData.company_3c_id}
                onChange={(e) => handleInputChange('company_3c_id', e.target.value)}
                placeholder="12345"
                className={`mt-1 bg-white/80 backdrop-blur-sm border-gray-200 ${
                  validationErrors.company_3c_id ? 'border-red-300' : ''
                }`}
              />
              {validationErrors.company_3c_id && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.company_3c_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Nome da Empresa
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome da empresa"
                className={`mt-1 bg-white/80 backdrop-blur-sm border-gray-200 ${
                  validationErrors.name ? 'border-red-300' : ''
                }`}
              />
              {validationErrors.name && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="api_token" className="text-sm font-medium text-gray-700">
              Token de API
            </Label>
            <div className="relative mt-1">
              <Input
                id="api_token"
                type={showToken ? 'text' : 'password'}
                value={formData.api_token}
                onChange={(e) => handleInputChange('api_token', e.target.value)}
                placeholder="Token de autenticação"
                className={`bg-white/80 backdrop-blur-sm border-gray-200 pr-10 ${
                  validationErrors.api_token ? 'border-red-300' : ''
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
            {validationErrors.api_token && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.api_token}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="status"
              checked={formData.status === 'active'}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))
              }
            />
            <Label htmlFor="status" className="text-sm font-medium text-gray-700">
              Empresa ativa
            </Label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Informações importantes</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Após criar a empresa, você poderá configurar webhooks para receber eventos automaticamente.
                  Certifique-se de que o ID da empresa e o token de API estão corretos.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="bg-white/80 backdrop-blur-sm">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Building className="h-4 w-4 mr-2" />
                Criar Empresa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
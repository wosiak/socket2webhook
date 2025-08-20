import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  Building, 
  Plus, 
  Calendar, 
  Activity, 
  Settings, 
  ArrowRight,
  Zap,
  Users,
  Globe,
  ExternalLink,
  Edit,
  Trash2
} from "lucide-react";
import { Company } from "../types";

interface CompanyListProps {
  companies: Company[];
  onViewCompany: (company: Company) => void;
  onUpdateCompany: (id: string, updates: Partial<Company>) => void;
  onDeleteCompany: (id: string) => void;
}

export function CompanyList({ companies, onViewCompany, onUpdateCompany, onDeleteCompany }: CompanyListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          style: {
            backgroundColor: '#dcfce7',
            color: '#15803d',
            border: '1px solid #bbf7d0'
          },
          icon: <Zap style={{ width: '12px', height: '12px' }} />,
          label: 'Ativo'
        };
      case 'inactive':
        return {
          style: {
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db'
          },
          icon: <Settings style={{ width: '12px', height: '12px' }} />,
          label: 'Inativo'
        };
      default:
        return {
          style: {
            backgroundColor: '#ececf0',
            color: '#717182'
          },
          icon: <Activity style={{ width: '12px', height: '12px' }} />,
          label: status
        };
    }
  };

  return (
    <div className="space-y-6">
      {companies.length === 0 ? (
        <div className="text-center py-12">
          <Building className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma empresa encontrada</h3>
          <p className="text-gray-600 mt-2">
            Crie sua primeira empresa para começar a configurar webhooks
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {companies.map((company) => {
            const statusConfig = getStatusConfig(company.status);
            
            return (
              <Card key={company.id} className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                          <Badge style={statusConfig.style}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>ID: {company.company_3c_id}</span>
                          <span>•</span>
                          <span>Criada em {formatDate(company.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewCompany(company)}
                        className="bg-white/80 backdrop-blur-sm"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewCompany(company)}
                        className="bg-white/80 backdrop-blur-sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteCompany(company.id)}
                        className="bg-white/80 backdrop-blur-sm text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
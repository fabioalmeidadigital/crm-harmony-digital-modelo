import { CRMLayout } from "@/components/CRMLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLeads } from "@/components/admin/AdminLeads";
import { AdminSources } from "@/components/admin/AdminSources";
import { AdminProcedures } from "@/components/admin/AdminProcedures";
import { AdminNotes } from "@/components/admin/AdminNotes";
import { AdminAgents } from "@/components/admin/AdminAgents";
import { AdminAvailability } from "@/components/admin/AdminAvailability";
import { AdminFornecedores } from "@/components/admin/AdminFornecedores";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminWhatsApp } from "@/components/admin/AdminWhatsApp";
import { AdminUTM } from "@/components/admin/AdminUTM";
import { AdminSheetOptions } from "@/components/admin/AdminSheetOptions";
import { useUserRole } from "@/hooks/useUserRole";
import { useSearchParams } from "react-router-dom";

export default function Admin() {
  const { isMestre } = useUserRole();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  return (
    <CRMLayout title="Painel Administrativo">
      <Tabs defaultValue={tabParam || (isMestre ? "users" : "leads")} className="space-y-4">
        <TabsList className="bg-card border flex-wrap h-auto">
          {isMestre && <TabsTrigger value="users">Usuários</TabsTrigger>}
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="sources">Origens</TabsTrigger>
          <TabsTrigger value="sheet">Listas do Atendimento</TabsTrigger>
          <TabsTrigger value="procedures">Procedimentos</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
          <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
          <TabsTrigger value="agents">Agentes IA</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="utm">Marketing / UTM</TabsTrigger>
        </TabsList>
        {isMestre && <TabsContent value="users"><AdminUsers /></TabsContent>}
        <TabsContent value="leads"><AdminLeads /></TabsContent>
        <TabsContent value="fornecedores"><AdminFornecedores /></TabsContent>
        <TabsContent value="sources"><AdminSources /></TabsContent>
        <TabsContent value="sheet"><AdminSheetOptions /></TabsContent>
        <TabsContent value="procedures"><AdminProcedures /></TabsContent>
        <TabsContent value="notes"><AdminNotes /></TabsContent>
        <TabsContent value="availability"><AdminAvailability /></TabsContent>
        <TabsContent value="agents"><AdminAgents /></TabsContent>
        <TabsContent value="whatsapp"><AdminWhatsApp /></TabsContent>
        <TabsContent value="utm"><AdminUTM /></TabsContent>
      </Tabs>
    </CRMLayout>
  );
}

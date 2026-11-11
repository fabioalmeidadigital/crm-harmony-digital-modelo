import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { NewLeadDialog } from "@/components/NewLeadDialog";
import { CrmAssistant } from "@/components/CrmAssistant";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WhatsAppConnectionAlert } from "@/components/WhatsAppConnectionAlert";

interface CRMLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function CRMLayout({ children, title }: CRMLayoutProps) {
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="h-screen min-h-0 flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <header className="h-16 flex items-center justify-between border-b bg-background px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            </div>
            <div className="flex items-center gap-2">
              <WhatsAppConnectionAlert />
              <ThemeToggle />
              <Button onClick={() => setNewLeadOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                <Plus className="h-4 w-4" />
                Novo Lead
              </Button>
            </div>
          </header>
          <main className="flex-1 min-h-0 overflow-auto p-6 bg-secondary/30">
            {children}
          </main>
        </div>
      </div>
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
      <CrmAssistant />
    </SidebarProvider>
  );
}

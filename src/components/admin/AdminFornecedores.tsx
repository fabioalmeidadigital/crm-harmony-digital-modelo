import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Upload, Search } from "lucide-react";
import { toast } from "sonner";

interface Fornecedor {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
}

// Mock data until connected to DB
const initialFornecedores: Fornecedor[] = [
  { id: "1", name: "João Materiais", phone: "5511999000111", email: "joao@materiais.com", company: "Materiais Cirúrgicos Ltda", notes: "Fornecedor de próteses" },
  { id: "2", name: "Maria Farmacêutica", phone: "5511988000222", email: "maria@farma.com", company: "Farmacêutica ABC", notes: "Medicamentos e anestésicos" },
];

export function AdminFornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(initialFornecedores);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", notes: "" });

  const filtered = fornecedores.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.company.toLowerCase().includes(search.toLowerCase()) ||
    f.phone.includes(search)
  );

  const handleAdd = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setFornecedores(prev => [...prev, { ...form, id: crypto.randomUUID() }]);
    setForm({ name: "", phone: "", email: "", company: "", notes: "" });
    setDialogOpen(false);
    toast.success("Fornecedor adicionado!");
  };

  const handleDelete = (id: string) => {
    setFornecedores(prev => prev.filter(f => f.id !== id));
    toast.success("Fornecedor removido!");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const header = lines[0].toLowerCase();
      const hasHeader = header.includes("nome") || header.includes("name") || header.includes("empresa");
      const dataLines = hasHeader ? lines.slice(1) : lines;
      
      const imported: Fornecedor[] = dataLines.map(line => {
        const cols = line.split(/[,;]/).map(c => c.trim().replace(/^["']|["']$/g, ""));
        return {
          id: crypto.randomUUID(),
          name: cols[0] || "",
          phone: cols[1] || "",
          email: cols[2] || "",
          company: cols[3] || "",
          notes: cols[4] || "",
        };
      }).filter(f => f.name);

      setFornecedores(prev => [...prev, ...imported]);
      toast.success(`${imported.length} fornecedores importados!`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Fornecedores Cadastrados</CardTitle>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleImportCSV} />
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <span><Upload className="h-3.5 w-3.5" /> Importar CSV</span>
            </Button>
          </label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar Fornecedor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do contato" /></div>
                <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="5511999000000" /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" /></div>
                <div><Label>Empresa</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Nome da empresa" /></div>
                <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas sobre o fornecedor" /></div>
                <Button onClick={handleAdd} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Cadastrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, empresa ou telefone..." className="pl-9" />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Fornecedores cadastrados aqui são usados pela IA para identificar automaticamente contatos que são fornecedores e movê-los para a etapa "Fornecedor" no pipeline.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(f => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell className="text-muted-foreground">{f.phone}</TableCell>
                <TableCell className="text-muted-foreground">{f.email}</TableCell>
                <TableCell className="text-muted-foreground">{f.company}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{f.notes}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(f.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum fornecedor encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

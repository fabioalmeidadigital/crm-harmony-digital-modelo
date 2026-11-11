import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Pencil, Camera, Loader2, Mail, Check, X, KeyRound } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  mestre: "Mestre",
  administrativo: "Administrativo",
  comercial: "Comercial",
};

const ROLE_COLORS: Record<string, string> = {
  mestre: "bg-primary text-primary-foreground",
  administrativo: "bg-accent text-accent-foreground",
  comercial: "bg-secondary text-secondary-foreground",
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function AdminUsers() {
  const { isMestre } = useUserRole();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<string>("comercial");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Inline edit state
  const [inlineId, setInlineId] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState("");
  const [inlinePhone, setInlinePhone] = useState("");
  const [inlineRole, setInlineRole] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { action: "list_full" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.users || [];
    },
    enabled: isMestre,
  });

  const createUserMutation = useMutation({
    mutationFn: async ({ email, role, display_name }: { email: string; role: string; display_name: string }) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email, role, display_name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast.success("Usuário criado!");
      setCreateOpen(false);
      setNewEmail(""); setNewName(""); setNewRole("comercial");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { action: "update_profile", ...payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast.success("Usuário atualizado!");
      setEditingUser(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { action: "delete", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast.success("Usuário removido.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (u: any) => {
    setEditingUser(u);
    setEditName(u.display_name || "");
    setEditPhone(u.phone || "");
    setEditRole(u.role);
    setEditAvatar(u.avatar_url || null);
    setEditPassword("");
  };

  const startInline = (u: any) => {
    setInlineId(u.user_id);
    setInlineName(u.display_name || "");
    setInlinePhone(u.phone || "");
    setInlineRole(u.role);
  };
  const cancelInline = () => setInlineId(null);
  const saveInline = (u: any) => {
    updateUserMutation.mutate({
      user_id: u.user_id,
      display_name: inlineName,
      phone: inlinePhone,
      role: u.role !== "mestre" ? inlineRole : undefined,
    }, { onSuccess: () => setInlineId(null) });
  };

  const handleAvatarUpload = async (file: File) => {
    if (!editingUser) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${editingUser.user_id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setUploadingAvatar(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setEditAvatar(urlData.publicUrl);
    setUploadingAvatar(false);
    toast.success("Foto carregada — clique em Salvar.");
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      user_id: editingUser.user_id,
      display_name: editName,
      phone: editPhone,
      avatar_url: editAvatar,
      role: editingUser.role !== "mestre" ? editRole : undefined,
      password: editPassword || undefined,
    });
  };

  if (!isMestre) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Apenas o usuário Mestre pode gerenciar usuários.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
          <CardDescription>Gerencie quem pode acessar o CRM, edite dados e foto</CardDescription>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <UserPlus className="h-4 w-4" /> Novo Usuário
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.user_id} className={inlineId === u.user_id ? "bg-muted/40" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {(u.display_name || u.email || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {inlineId === u.user_id ? (
                          <Input
                            value={inlineName}
                            onChange={(e) => setInlineName(e.target.value)}
                            className="h-8 max-w-[180px]"
                            placeholder="Nome"
                          />
                        ) : (
                          <span className="font-medium">{u.display_name || "—"}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{u.email}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {inlineId === u.user_id ? (
                        <Input
                          value={inlinePhone}
                          onChange={(e) => setInlinePhone(e.target.value)}
                          className="h-8 max-w-[150px]"
                          placeholder="(61) 99999-9999"
                        />
                      ) : (
                        u.phone || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {inlineId === u.user_id && u.role !== "mestre" ? (
                        <Select value={inlineRole} onValueChange={setInlineRole}>
                          <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrativo">Administrativo</SelectItem>
                            <SelectItem value="comercial">Comercial</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={ROLE_COLORS[u.role] || ""}>{ROLE_LABELS[u.role] || u.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(u.last_sign_in_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {inlineId === u.user_id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Salvar"
                              onClick={() => saveInline(u)}
                              disabled={updateUserMutation.isPending}
                            >
                              {updateUserMutation.isPending
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Check className="h-4 w-4 text-primary" />}
                            </Button>
                            <Button variant="ghost" size="icon" title="Cancelar" onClick={cancelInline}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => startInline(u)} title="Editar na linha">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Foto / senha / mais">
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            {u.role !== "mestre" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Remover"
                                onClick={() => { if (confirm("Remover este usuário?")) deleteUserMutation.mutate(u.user_id); }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Crie um acesso ao CRM. A senha pode ser definida depois ao editar.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate({ email: newEmail, role: newRole, display_name: newName }); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Papel *</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>{editingUser?.email}</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={editAvatar || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {(editName || editingUser.email || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground rounded-full p-1.5 shadow hover:bg-accent/90 disabled:opacity-50"
                  >
                    {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                  <input
                    type="file" ref={fileRef} accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">Clique no ícone para enviar uma foto</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>Nome completo</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(61) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label>Papel</Label>
                  {editingUser.role === "mestre" ? (
                    <Input value="Mestre" disabled />
                  ) : (
                    <Select value={editRole} onValueChange={setEditRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Nova senha (opcional)</Label>
                  <Input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Deixe em branco para manter" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={updateUserMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {updateUserMutation.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

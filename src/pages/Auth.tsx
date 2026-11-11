import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logoImg from "@/assets/logo-login.svg";

type LoginMode = "password" | "magiclink" | "reset";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [mode, setMode] = useState<LoginMode>("password");
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
      toast.success("Enviamos um link para redefinir sua senha!");
    }
    setLoading(false);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message);
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setMagicLinkSent(true);
      toast.success("Link de acesso enviado para seu email!");
    }
    setLoading(false);
  };

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md shadow-xl border-primary/10 text-center">
          <CardHeader className="space-y-4">
            <img src={logoImg} alt="CRM Harmony Digital" className="h-10 mx-auto object-contain" />
            <CardTitle className="text-xl font-['Montserrat']">Verifique seu email</CardTitle>
            <CardDescription className="text-base">
              Enviamos um link para redefinir a senha de <strong>{email}</strong>. Clique no link e cadastre uma nova senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setResetSent(false); setMode("password"); }}
            >
              Voltar para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md shadow-xl border-primary/10 text-center">
          <CardHeader className="space-y-4">
            <img src={logoImg} alt="CRM Harmony Digital" className="h-10 mx-auto object-contain" />
            <CardTitle className="text-xl font-['Montserrat']">Verifique seu email</CardTitle>
            <CardDescription className="text-base">
              Enviamos um link de acesso para <strong>{email}</strong>. Clique no link para entrar no CRM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setMagicLinkSent(false); setEmail(""); }}
            >
              Tentar outro email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10 min-h-[500px] flex flex-col justify-center">
        <CardHeader className="text-center space-y-6">
          <img src={logoImg} alt="CRM Harmony Digital" className="h-10 mx-auto object-contain mb-4" />
          <CardTitle className="text-xl font-['Montserrat']">Acessar o CRM</CardTitle>
          <CardDescription>
            {mode === "password"
              ? "Entre com seu email e senha"
              : mode === "reset"
              ? "Informe seu email para receber o link de redefinição de senha"
              : "Receba um link de acesso no seu email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={mode === "reset" ? handleResetPassword : handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={loading}
              >
                {loading
                  ? "Enviando..."
                  : mode === "reset"
                  ? "Enviar link para redefinir senha"
                  : "Enviar link de acesso"}
              </Button>
            </form>
          )}

          <div className="mt-4 flex flex-col items-center gap-2 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary underline"
              onClick={() => setMode(mode === "password" ? "magiclink" : "password")}
            >
              {mode === "password" ? "Entrar com link de acesso" : "Entrar com email e senha"}
            </button>
            {mode !== "reset" && (
              <button
                type="button"
                className="text-sm text-primary hover:underline font-medium"
                onClick={() => setMode("reset")}
              >
                Esqueci minha senha
              </button>
            )}
          </div>

          <p className="mt-3 text-xs text-center text-muted-foreground">
            Acesso restrito. Apenas usuários autorizados podem entrar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

function getAppOrigin(): string {
  if (typeof window === "undefined") return "https://www.caramelinho.com";
  return `${window.location.protocol}//${window.location.host}`;
}

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const type = (params.get("type") || "").toLowerCase();
    const hasToken = !!params.get("access_token");
    if (type === "recovery" || hasToken) {
      setIsRecoverySession(true);
    }
  }, []);

  const submitLabel = useMemo(() => {
    if (isLoading) return "Salvando...";
    return isRecoverySession ? "Salvar nova senha" : "Enviar link de redefinição";
  }, [isLoading, isRecoverySession]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }
    setIsLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${getAppOrigin()}/redefinir-senha`,
    });
    setIsLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo("Enviamos o link de redefinição para seu e-mail.");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!newPassword.trim() || !newPasswordConfirm.trim()) {
      setError("Preencha os dois campos de senha.");
      return;
    }
    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("As senhas não conferem.");
      return;
    }
    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setInfo("Senha atualizada com sucesso. Você já pode entrar.");
    setNewPassword("");
    setNewPasswordConfirm("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link to="/" className="flex items-center gap-3 mb-4">
            <div className="w-20 h-20 flex items-center justify-center">
              <img src="/logo.webp" alt="Caramelinho logo" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight text-left">
              <div className="font-extrabold text-[2rem] sm:text-[2.2rem] tracking-tight caramelo-text-gradient">Caramelinho</div>
              <div className="text-base sm:text-lg font-semibold text-foreground/75">O SEU FARO FORA DO BRASIL</div>
            </div>
          </Link>
        </div>

        <Card className="p-6 sm:p-8 border-border">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {isRecoverySession ? "Definir nova senha" : "Esqueci minha senha"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isRecoverySession
                ? "Digite sua nova senha para concluir a recuperação."
                : "Informe seu e-mail para receber o link de redefinição."}
            </p>
          </div>

          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4">{error}</div>}
          {info && <div className="bg-emerald-100 text-emerald-800 text-sm p-3 rounded-lg mb-4">{info}</div>}

          {!isRecoverySession ? (
            <form onSubmit={handleRequestReset} className="space-y-5">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full caramelo-gradient text-white" disabled={isLoading}>
                {submitLabel}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    className="pl-10"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="new-password-confirm">Confirmar nova senha</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password-confirm"
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="pl-10"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full caramelo-gradient text-white" disabled={isLoading}>
                {submitLabel}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/entrar" className="text-amber-600 hover:text-amber-700 font-medium">
              Voltar para entrar
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}


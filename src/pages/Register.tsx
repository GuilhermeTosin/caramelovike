import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { getSiteSlogan } from "@/lib/locales";

export default function Register() {
  const navigate = useNavigate();
  const locale = "pt-BR";

  const text = {
    required: "Preencha todos os campos.", passwordLength: "A senha deve ter pelo menos 6 caracteres.", mismatch: "As senhas não conferem.", emailExists: "Este email já está cadastrado.",
    confirmed: "Cadastro realizado!", confirmationSent: "Enviamos um email de confirmação para", confirmationHint: "Clique no link enviado para ativar sua conta e começar a usar o Caramelinho.", login: "Ir para o Login", home: "Voltar ao Início",
    title: "Criar Conta", welcome: "Junte-se ao Caramelinho!", name: "Nome", namePlaceholder: "Seu nome completo", password: "Senha", passwordPlaceholder: "Mínimo 6 caracteres", confirmPassword: "Confirmar Senha", confirmPlaceholder: "Repita a senha", loading: "Cadastrando...", submit: "Criar Conta", hasAccount: "Já tem conta?", signIn: "Faça login",
  };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError(text.required);
      return;
    }
    if (password.length < 6) {
      setError(text.passwordLength);
      return;
    }
    if (password !== confirmPassword) {
      setError(text.mismatch);
      return;
    }

    setIsLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    setIsLoading(false);

    if (signUpError) {
      if (signUpError.message.includes("already")) {
        setError(text.emailExists);
      } else {
        setError(signUpError.message);
      }
      return;
    }

    setStep("confirm");
  };

  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center border-border">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">{text.confirmed}</h1>
          <p className="text-muted-foreground mb-2">
            {text.confirmationSent} <strong>{email}</strong>.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {text.confirmationHint}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/entrar")}>
              {text.login}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              {text.home}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link to={"/"} className="flex items-center gap-3 mb-4">
            <div className="w-20 h-20 flex items-center justify-center">
                <img src="/logo.webp" alt="Caramelinho logo" className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110" />
              </div>
            <div className="leading-tight text-left">
                <div className="font-extrabold text-[2rem] sm:text-[2.2rem] tracking-tight caramelo-text-gradient">Caramelinho</div>
                <div className="text-base sm:text-lg font-semibold text-foreground/75">{getSiteSlogan(locale)}</div>
              </div>
          </Link>
        </div>

        <Card className="p-6 sm:p-8 border-border">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">{text.title}</h1>
            <p className="text-muted-foreground mt-1">{text.welcome}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="name">{text.name}</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={text.namePlaceholder}
                  className="pl-10"
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={"seu@email.com"}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">{text.password}</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={text.passwordPlaceholder}
                  className="pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">{text.confirmPassword}</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={text.confirmPlaceholder}
                  className="pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full caramelo-gradient text-white" disabled={isLoading}>
              {isLoading ? text.loading : text.submit}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              {text.hasAccount}{" "}
              <Link to={"/entrar"} className="text-amber-600 hover:text-amber-700 font-medium">
                {text.signIn}
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

















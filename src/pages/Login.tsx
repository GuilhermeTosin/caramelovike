import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const navigate = useNavigate();

  const text = {
    required: "Preencha email e senha.", invalid: "Email ou senha incorretos.", unconfirmed: "Seu email ainda não foi confirmado. Verifique sua caixa de entrada ou spam.",
    title: "Entrar", welcome: "Bem-vindo de volta ao Caramelinho!", password: "Senha", passwordPlaceholder: "Sua senha", forgot: "Esqueci minha senha", loading: "Entrando...", submit: "Entrar", noAccount: "Ainda não tem conta?", register: "Cadastre-se",
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(text.required);
      return;
    }

    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (signInError) {
      if (signInError.message.includes("Invalid login credentials")) {
        setError(text.invalid);
      } else if (signInError.message.includes("Email not confirmed")) {
        setError(text.unconfirmed);
      } else {
        setError(signInError.message);
      }
      return;
    }

    // O onAuthStateChange no AuthContext cuidará do redirecionamento e carregamento
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect") || "/perfil";
    navigate(redirect.startsWith("/") ? redirect : "/perfil");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
                  autoComplete="current-password"
                />
              </div>
              <div className="mt-2 text-right">
                <Link to={"/redefinir-senha"} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                  {text.forgot}
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full caramelo-gradient text-white" disabled={isLoading}>
              {isLoading ? text.loading : text.submit}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              {text.noAccount}{" "}
              <Link to={"/cadastro"} className="text-amber-600 hover:text-amber-700 font-medium">
                {text.register}
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}











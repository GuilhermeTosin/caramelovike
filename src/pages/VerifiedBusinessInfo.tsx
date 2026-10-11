import { useEffect } from "react";
import { BadgeCheck, CheckCircle2, ShieldCheck, Star, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import SiteFooter from "@/components/SiteFooter";
import { setSeoMeta } from "@/lib/seo";

export default function VerifiedBusinessInfo() {
  const text = {
    title: "Negócio Verificado | Caramelinho",
    description: "Saiba como conquistar o selo Negócio Verificado no Caramelinho, entender a validade de 12 meses e os critérios de renovação.",
    request: "Solicitar verificação",
    program: "Programa Negócio Verificado",
    hero: "Ganhe o selo de confiança no Caramelinho",
    heroDescription: <>O selo <strong>Negócio Verificado</strong> mostra para a comunidade que seu perfil passou por validação. Resultado: mais confiança, mais cliques e mais conversas com clientes.</>,
    benefits: "Vantagens de ser verificado",
    searchPriority: "Prioridade nas pesquisas",
    searchPriorityDescription: "Perfis verificados têm maior prioridade de exibição nos resultados de busca.",
    highlights: "Elegível para Destaques",
    highlightsDescription: "Apenas negócios verificados podem aparecer na seção de negócios em destaque.",
    trust: "Mais confiança do cliente",
    trustDescription: "O badge de verificação melhora a credibilidade e aumenta a taxa de contato.",
    requirements: "Requisitos atuais",
    requirementOne: <>Ter pelo menos <strong>5 avaliações</strong> na página do negócio.</>,
    requirementTwo: <>Ter o <strong>Instagram do negócio</strong> cadastrado no perfil.</>,
    requirementThree: <>Fazer um post sobre o Caramelinho e enviar o <strong>link do post marcando nosso perfil</strong>.</>,
    validity: "Validade da verificação",
    validityOne: <>A verificação tem validade de <strong>12 meses</strong>. Após esse período, solicitamos uma nova confirmação para garantir que o negócio continua ativo, operando normalmente e com atendimento real ao público.</>,
    validityTwo: "Também revalidamos para confirmar que os dados de contato, localização e canais oficiais continuam corretos. Isso reduz perfis desatualizados e protege a comunidade contra informações enganosas.",
    validityThree: "Em resumo, a renovação anual mantém o selo confiável, melhora a qualidade dos resultados de busca e reforça a segurança de quem usa o Caramelinho para encontrar serviços.",
    howItWorks: "Como funciona a análise",
    stepLabel: "PASSO",
    stepOne: "Solicitação",
    stepOneDescription: <>Você envia o link do post no painel <strong>Meus Negócios</strong>.</>,
    stepTwo: "Revisão",
    stepTwoDescription: "Nosso time valida os critérios e o conteúdo enviado.",
    stepThree: "Resultado",
    stepThreeDescription: "Aprovado: badge ativo por 12 meses. Rejeitado: você pode ajustar e reenviar.",
  };

  useEffect(() => {
    setSeoMeta(text.title, text.description);
  }, [text.description, text.title]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-8 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold mb-4">
              <BadgeCheck className="w-4 h-4" />
              {text.program}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              {text.hero}
            </h1>
            <p className="text-muted-foreground mt-4 max-w-3xl">
              {text.heroDescription}
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <h2 className="text-2xl font-bold mb-4">{text.benefits}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-5 border-border">
              <div className="flex items-center gap-2 font-semibold"><Star className="w-4 h-4 text-amber-500" /> {text.searchPriority}</div>
              <p className="text-sm text-muted-foreground mt-2">{text.searchPriorityDescription}</p>
            </Card>
            <Card className="p-5 border-border">
              <div className="flex items-center gap-2 font-semibold"><Trophy className="w-4 h-4 text-amber-500" /> {text.highlights}</div>
              <p className="text-sm text-muted-foreground mt-2">{text.highlightsDescription}</p>
            </Card>
            <Card className="p-5 border-border">
              <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="w-4 h-4 text-amber-500" /> {text.trust}</div>
              <p className="text-sm text-muted-foreground mt-2">{text.trustDescription}</p>
            </Card>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold mb-4">{text.requirements}</h2>
          <Card className="p-6 border-border">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                {text.requirementOne}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                {text.requirementTwo}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                {text.requirementThree}
              </li>
            </ul>
          </Card>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold mb-4">{text.validity}</h2>
          <Card className="p-6 border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {text.validityOne}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              {text.validityTwo}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              {text.validityThree}
            </p>
          </Card>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <h2 className="text-2xl font-bold mb-4">{text.howItWorks}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 border-border">
              <p className="text-xs font-bold text-muted-foreground">{text.stepLabel} 1</p>
              <p className="font-semibold mt-1">{text.stepOne}</p>
              <p className="text-sm text-muted-foreground mt-2">{text.stepOneDescription}</p>
            </Card>
            <Card className="p-5 border-border">
              <p className="text-xs font-bold text-muted-foreground">{text.stepLabel} 2</p>
              <p className="font-semibold mt-1">{text.stepTwo}</p>
              <p className="text-sm text-muted-foreground mt-2">{text.stepTwoDescription}</p>
            </Card>
            <Card className="p-5 border-border">
              <p className="text-xs font-bold text-muted-foreground">{text.stepLabel} 3</p>
              <p className="font-semibold mt-1">{text.stepThree}</p>
              <p className="text-sm text-muted-foreground mt-2">{text.stepThreeDescription}</p>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

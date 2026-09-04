import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { utf8Fetch } from "@/lib/http/utf8";
import { getGoogleAnalyticsMeasurementId } from "@/lib/googleAnalytics";
import { supabase } from "@/lib/supabase";

type GoogleAnalyticsSettingsTabProps = {
  enabled: boolean;
};

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

async function getAuthorizationHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function GoogleAnalyticsSettingsTab({ enabled }: GoogleAnalyticsSettingsTabProps) {
  const [measurementId, setMeasurementId] = useState("");
  const [snippet, setSnippet] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const response = await utf8Fetch("/api/google-analytics", {
        headers: await getAuthorizationHeader(),
      });
      const payload = (await response.json().catch(() => ({}))) as { measurementId?: unknown; error?: unknown };
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "N\u00e3o foi poss\u00edvel carregar a configura\u00e7\u00e3o do Google Analytics."));
      }
      const savedId = getGoogleAnalyticsMeasurementId(payload.measurementId);
      setMeasurementId(savedId);
      setSnippet(savedId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "N\u00e3o foi poss\u00edvel carregar a configura\u00e7\u00e3o do Google Analytics.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, [enabled]);

  const handleSave = async () => {
    const parsedMeasurementId = getGoogleAnalyticsMeasurementId(snippet);
    if (!parsedMeasurementId) {
      toast.error("Cole o c\u00f3digo do Google Analytics que contenha um \u00fanico ID de medi\u00e7\u00e3o no formato G-XXXXXXXXXX.");
      return;
    }

    setSaving(true);
    try {
      const response = await utf8Fetch("/api/google-analytics", {
        method: "PUT",
        headers: await getAuthorizationHeader(),
        body: JSON.stringify({ snippet }),
      });
      const payload = (await response.json().catch(() => ({}))) as { measurementId?: unknown; error?: unknown };
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Erro ao salvar."));
      setMeasurementId(getGoogleAnalyticsMeasurementId(payload.measurementId));
      setSnippet(parsedMeasurementId);
      toast.success("Google Analytics ativado. A altera\u00e7\u00e3o pode levar at\u00e9 um minuto para alcan\u00e7ar todas as p\u00e1ginas p\u00fablicas.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "N\u00e3o foi poss\u00edvel salvar o Google Analytics.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm("Desativar o Google Analytics no site inteiro?")) return;

    setSaving(true);
    try {
      const response = await utf8Fetch("/api/google-analytics", {
        method: "DELETE",
        headers: await getAuthorizationHeader(),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Erro ao desativar."));
      setMeasurementId("");
      setSnippet("");
      toast.success("Google Analytics desativado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "N\u00e3o foi poss\u00edvel desativar o Google Analytics.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TabsContent value="analytics">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Google Analytics</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Conecte uma propriedade GA4 sem alterar arquivos do projeto ou publicar uma nova vers\u00e3o."}
          </p>
        </div>

        <Card className="space-y-4 border-border p-6">
          <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
            <BarChart3 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              {"Voc\u00ea pode colar o c\u00f3digo completo fornecido pelo Google. Por seguran\u00e7a, o Caramelinho extrai e salva somente o ID p\u00fablico de medi\u00e7\u00e3o "}
              <code>G-...</code>
              {"; nenhum JavaScript arbitr\u00e1rio \u00e9 armazenado ou executado."}
            </p>
          </div>

          <div>
            <Label htmlFor="google-analytics-snippet">{"C\u00f3digo do Google Analytics"}</Label>
            <Textarea
              id="google-analytics-snippet"
              value={snippet}
              onChange={(event) => setSnippet(event.target.value)}
              disabled={loading || saving}
              className="mt-1.5 min-h-48 font-mono text-xs"
              placeholder={'<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>'}
            />
          </div>

          {measurementId ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Ativo com o ID <code>{measurementId}</code>.
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{"Nenhuma propriedade do Google Analytics est\u00e1 ativa."}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={loading || saving}>
              {saving ? "Salvando..." : "Salvar Google Analytics"}
            </Button>
            {measurementId ? (
              <Button type="button" variant="outline" onClick={() => void handleDisable()} disabled={saving}>
                <Trash2 className="mr-2 h-4 w-4" />
                Desativar
              </Button>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            {"O script \u00e9 carregado ap\u00f3s a primeira pintura da p\u00e1gina e de forma ass\u00edncrona, para n\u00e3o disputar o LCP. Para conformidade com a LGPD, mantenha a pol\u00edtica de privacidade e, se necess\u00e1rio, adicione consentimento de cookies."}
          </p>
        </Card>
      </div>
    </TabsContent>
  );
}

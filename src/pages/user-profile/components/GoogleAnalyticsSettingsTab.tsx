import { useEffect, useState } from "react";
import { AlertCircle, BarChart3, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { utf8Fetch } from "@/lib/http/utf8";
import {
  getGoogleAnalyticsMeasurementId,
  getGoogleAnalyticsRuntimeStatus,
  GOOGLE_ANALYTICS_STATUS_EVENT,
  notifyGoogleAnalyticsConfigChanged,
  sendGoogleAnalyticsDiagnosticEvent,
  type GoogleAnalyticsRuntimeStatus,
} from "@/lib/googleAnalytics";
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
  const [runtimeStatus, setRuntimeStatus] = useState<GoogleAnalyticsRuntimeStatus | null>(
    () => getGoogleAnalyticsRuntimeStatus(),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const refreshRuntimeStatus = () => setRuntimeStatus(getGoogleAnalyticsRuntimeStatus());
    refreshRuntimeStatus();
    window.addEventListener(GOOGLE_ANALYTICS_STATUS_EVENT, refreshRuntimeStatus);
    return () => window.removeEventListener(GOOGLE_ANALYTICS_STATUS_EVENT, refreshRuntimeStatus);
  }, []);

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
      const savedId = getGoogleAnalyticsMeasurementId(payload.measurementId);
      setMeasurementId(savedId);
      setSnippet(parsedMeasurementId);
      notifyGoogleAnalyticsConfigChanged(savedId);
      toast.success("ID salvo. Confira o status da tag neste navegador e valide o evento no DebugView do GA4.");
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
      notifyGoogleAnalyticsConfigChanged("");
      toast.success("Google Analytics desativado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "N\u00e3o foi poss\u00edvel desativar o Google Analytics.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiagnostic = () => {
    if (!sendGoogleAnalyticsDiagnosticEvent()) {
      toast.error("A tag ainda n\u00e3o est\u00e1 carregada neste navegador.");
      return;
    }
    toast.success("Evento analytics_diagnostic enfileirado. Confirme-o no DebugView do GA4.");
  };

  const runtimeStatusText = (() => {
    switch (runtimeStatus?.state) {
      case "checking":
        return "Consultando o ID configurado pelo servidor...";
      case "not_configured":
        return "A API respondeu, mas n\u00e3o encontrou um ID GA4 v\u00e1lido.";
      case "config_error":
        return "Falha ao consultar /api/google-analytics. A tag n\u00e3o foi inicializada.";
      case "loading_tag":
        return "ID recebido; aguardando o script do Google carregar. Pageviews est\u00e3o na fila.";
      case "ready":
        return "Script carregado neste navegador. Isso ainda n\u00e3o confirma que o GA4 recebeu os eventos.";
      case "tag_error":
        return "O script do Google falhou ou foi bloqueado pela rede, navegador, extens\u00e3o ou bloqueador de an\u00fancios.";
      default:
        return "Aguardando a verifica\u00e7\u00e3o da tag neste navegador.";
    }
  })();
  const runtimeStatusIsError = runtimeStatus?.state === "config_error" || runtimeStatus?.state === "tag_error";

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

          <div className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
            <div className="flex items-start gap-2">
              {runtimeStatus?.state === "ready" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              ) : runtimeStatusIsError ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              )}
              <div className="space-y-1 text-sm">
                <p className="font-semibold">Diagn\u00f3stico neste navegador</p>
                <p aria-live="polite" className={runtimeStatusIsError ? "text-destructive" : "text-muted-foreground"}>
                  {runtimeStatusText}
                </p>
                {runtimeStatus?.measurementId ? (
                  <p className="text-xs text-muted-foreground">
                    ID carregado: <code>{runtimeStatus.measurementId}</code>
                    {runtimeStatus.lastPageViewAt
                      ? ` \u00b7 \u00daltimo page_view enfileirado: ${new Date(runtimeStatus.lastPageViewAt).toLocaleTimeString()}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleDiagnostic}
              disabled={saving || runtimeStatus?.state !== "ready" || runtimeStatus.measurementId !== measurementId}
            >
              Enviar evento de diagn\u00f3stico
            </Button>
            <p className="text-xs text-muted-foreground">
              {measurementId ? (
                <>ID salvo: <code>{measurementId}</code>. Isso confirma apenas a configura\u00e7\u00e3o armazenada, n\u00e3o o recebimento pelo Google.</>
              ) : "Nenhum ID GA4 est\u00e1 salvo no servidor."}
              {" Ap\u00f3s o teste, procure "}<code>analytics_diagnostic</code>{" no DebugView e "}<code>page_view</code>{" no Realtime do GA4."}
            </p>
          </div>

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
            {"O site controla os pageviews da SPA manualmente. No stream GA4, desative pageviews autom\u00e1ticos por mudan\u00e7a no hist\u00f3rico do navegador para evitar duplicidade. Bloqueadores podem impedir a coleta; valide com Tag Assistant/DebugView e revise consentimento e privacidade conforme as regras aplic\u00e1veis."}
          </p>
        </Card>
      </div>
    </TabsContent>
  );
}

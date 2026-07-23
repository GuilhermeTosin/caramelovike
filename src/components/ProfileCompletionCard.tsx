import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  getBusinessProfileScore,
  getProfileScoreItems,
  getProfileScoreLabel,
  type ProfileCompletenessData,
} from "@/lib/profileCompleteness";

type ProfileCompletionCardProps = {
  data: ProfileCompletenessData;
  compact?: boolean;
};

export default function ProfileCompletionCard({ data, compact = false }: ProfileCompletionCardProps) {
  const score = getBusinessProfileScore(data);
  const items = getProfileScoreItems(data);
  const pendingItems = items
    .filter((item) => item.earned < item.points)
    .sort((a, b) => b.points - b.earned - (a.points - a.earned))
    .slice(0, compact ? 3 : 4);

  return (
    <Card className="border-amber-200 bg-amber-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-950">Perfil {getProfileScoreLabel(score)}</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            {"Perfis completos t\u00eam mais chances de aparecer em buscas relacionadas e ajudam o cliente a decidir com confian\u00e7a."}
          </p>
        </div>
        <strong className="text-2xl font-extrabold text-amber-700">{score}%</strong>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Completude do perfil">
        <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${score}%` }} />
      </div>
      {pendingItems.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-amber-950">{"Pr\u00f3ximas melhorias:"}</p>
          {pendingItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-xs text-amber-900/90">
              {item.earned > 0 ? <Circle className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0 opacity-50" />}
              <span>
                {item.label}
                {item.progress ? <span className="text-amber-800/70"> ({item.progress})</span> : null}
                {" "}(+{item.points - item.earned} pontos)
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Perfil completo.
        </p>
      )}
    </Card>
  );
}

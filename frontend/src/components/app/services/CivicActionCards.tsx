import { CivicActionCard } from "./CivicActionCard";
import { CIVIC_ACTIONS } from "@/lib/civicActions";
import type { CivicAction } from "@/lib/types";
import { useApp } from "@/lib/appContext";

interface CivicActionCardsProps {
  onNavigateToChat: (message: string) => void;
}

export function CivicActionCards({ onNavigateToChat }: CivicActionCardsProps) {
  const { state, dispatch } = useApp();

  const visibleActions = CIVIC_ACTIONS.filter((a) =>
    state.activeCategories.includes(a.category)
  );

  function handleShowOnMap(action: CivicAction) {
    if (!action.relatedPinId) return;
    const pin = state.servicePoints.find((p) => p.id === action.relatedPinId);
    if (pin) {
      dispatch({ type: "SET_SELECTED_PIN", pin });
    }
  }

  function handleHelpMePrepare(action: CivicAction) {
    dispatch({ type: "SET_CHAT_BUBBLE_OPEN", open: true });
    onNavigateToChat(`I want to: ${action.title}. ${action.description}`);
  }

  if (visibleActions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Select categories above to see civic actions
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Civic Actions For You
      </p>
      {visibleActions.map((action) => (
        <CivicActionCard
          key={action.id}
          action={action}
          onShowOnMap={handleShowOnMap}
          onHelpMePrepare={handleHelpMePrepare}
        />
      ))}
    </div>
  );
}

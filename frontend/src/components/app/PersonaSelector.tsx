import { useEffect, useState } from "react";
import { useApp } from "@/lib/appContext";
import {
  fetchCitizenProfiles,
  extractProfileData,
  type CitizenProfile,
} from "@/lib/citizenProfiles";
import { PersonaCard } from "./personas/PersonaCard";
import { PersonaDetail } from "./personas/PersonaDetail";

export default function PersonaSelector() {
  const { dispatch } = useApp();
  const [citizens, setCitizens] = useState<CitizenProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCitizenProfiles().then(setCitizens);
  }, []);

  const selected = citizens.find((c) => c.id === selectedId);

  function loadCitizen(citizen: CitizenProfile) {
    dispatch({ type: "SET_CV_DATA", data: citizen.cv });
    dispatch({ type: "SET_CV_FILE", fileName: `${citizen.persona}_resume.pdf` });
    dispatch({ type: "UPDATE_PROFILE", data: extractProfileData(citizen) });
    dispatch({
      type: "SET_CITIZEN_META",
      meta: {
        id: citizen.id,
        persona: citizen.persona,
        tagline: citizen.tagline,
        avatarInitials: citizen.avatarInitials,
        avatarColor: citizen.avatarColor,
        goals: citizen.goals,
        barriers: citizen.barriers,
        civicData: citizen.profile,
      },
    });
  }

  if (citizens.length === 0) return null;

  return (
    <div className="p-6 space-y-5">
      <div className="text-center space-y-1.5">
        <h2 className="text-lg font-bold text-foreground">Choose a Citizen</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Select a Montgomery resident to explore the platform through their eyes.
          Each persona has a unique background, needs, and goals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {citizens.map((citizen) => (
          <PersonaCard
            key={citizen.id}
            citizen={citizen}
            isSelected={selectedId === citizen.id}
            onSelect={() => setSelectedId(citizen.id)}
          />
        ))}
      </div>

      {selected && <PersonaDetail citizen={selected} onLoad={() => loadCitizen(selected)} />}
    </div>
  );
}

import { useState } from "react";
import { Sparkles, Plus, X, Link } from "lucide-react";
import type { GrowthIntakeForm as IntakeFormData } from "@/lib/types";

const TIMELINE_OPTIONS = ["3 months", "6 months", "1 year", "2+ years"];
const STYLE_OPTIONS = ["Self-paced online", "Bootcamp / intensive", "Part-time courses", "On-the-job learning"];

interface GrowthIntakeFormProps {
  onSubmit: (form: IntakeFormData) => void;
  isSubmitting: boolean;
}

export function GrowthIntakeForm({ onSubmit, isSubmitting }: GrowthIntakeFormProps) {
  const [careerGoal, setCareerGoal] = useState("");
  const [targetTimeline, setTargetTimeline] = useState("");
  const [learningStyle, setLearningStyle] = useState("");
  const [currentFrustrations, setCurrentFrustrations] = useState("");
  const [links, setLinks] = useState<string[]>([""]);

  const canSubmit =
    careerGoal.trim().length > 0 &&
    targetTimeline.length > 0 &&
    learningStyle.length > 0 &&
    currentFrustrations.trim().length > 0 &&
    !isSubmitting;

  function handleAddLink() {
    setLinks((prev) => [...prev, ""]);
  }

  function handleRemoveLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLinkChange(index: number, value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? value : l)));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const external_links = links.filter((l) => l.trim().startsWith("http"));
    onSubmit({
      career_goal: careerGoal,
      target_timeline: targetTimeline,
      learning_style: learningStyle,
      current_frustrations: currentFrustrations,
      external_links,
    });
  }

  return (
    <div className="space-y-4 p-4 pb-8">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Build your growth plan</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tell us where you want to go — we'll map the path.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">What's your career goal?</label>
        <textarea
          className="w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
          rows={2}
          placeholder="e.g. Become a senior backend engineer at a fintech company"
          value={careerGoal}
          onChange={(e) => setCareerGoal(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Target timeline</label>
        <div className="flex flex-wrap gap-2">
          {TIMELINE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setTargetTimeline(opt)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                targetTimeline === opt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-border/60 text-foreground hover:border-primary/40"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Preferred learning style</label>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setLearningStyle(opt)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                learningStyle === opt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-border/60 text-foreground hover:border-primary/40"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">
          What's holding you back right now?
        </label>
        <textarea
          className="w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
          rows={2}
          placeholder="e.g. I don't know which skills to focus on, and I struggle to find time"
          value={currentFrustrations}
          onChange={(e) => setCurrentFrustrations(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <Link className="w-3 h-3" />
          Your links{" "}
          <span className="text-muted-foreground font-normal">
            (optional — GitHub, LinkedIn, portfolio…)
          </span>
        </label>
        <div className="space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="url"
                className="flex-1 rounded-xl border border-border/60 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                placeholder="https://github.com/yourname"
                value={link}
                onChange={(e) => handleLinkChange(i, e.target.value)}
              />
              {links.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveLink(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {links.length < 5 && (
            <button
              type="button"
              onClick={handleAddLink}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add another link
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        {isSubmitting ? "Starting…" : "Build my growth plan"}
      </button>
    </div>
  );
}

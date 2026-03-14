import { useState } from "react";
import { Send } from "lucide-react";
import type { GapQuestion } from "@/lib/types";

const RATING_LABELS = ["Not at all", "A little", "Somewhat", "Quite a bit", "Very much"];

const RATING_KEYWORDS = [
  "comfortable", "confidence", "prefer", "enjoy",
  "familiar", "experience with", "how much",
];

function isRatingQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return RATING_KEYWORDS.some((kw) => lower.includes(kw));
}

// GapQuestion has no options field — use universal fallback choices for MC questions
function buildChoiceOptions(_question: GapQuestion): string[] {
  return ["Yes, definitely", "Somewhat", "Not really"];
}

interface GapQuestionCardsProps {
  questions: GapQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  isSubmitting: boolean;
}

export function GapQuestionCards({ questions, onSubmit, isSubmitting }: GapQuestionCardsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const allAnswered = questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== "");

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <div className="space-y-3 p-4 pb-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground">A few quick questions</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Help us refine your paths with {questions.length} short answer
          {questions.length !== 1 ? "s" : ""}.
        </p>
      </div>

      {questions.map((q) => {
        const isRating = isRatingQuestion(q.question);
        const currentAnswer = answers[q.id];

        return (
          <div
            key={q.id}
            className="rounded-xl border border-border/50 bg-white p-3.5 space-y-2.5"
          >
            <div>
              <p className="text-xs font-semibold text-foreground leading-snug">{q.question}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{q.context}</p>
            </div>

            {q.path_relevance.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {q.path_relevance.map((path) => (
                  <span
                    key={path}
                    className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                  >
                    {path}
                  </span>
                ))}
              </div>
            )}

            {isRating ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    title={RATING_LABELS[rating - 1]}
                    onClick={() => setAnswer(q.id, String(rating))}
                    className={`w-7 h-7 rounded-full text-xs font-bold border transition-all ${
                      currentAnswer === String(rating)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {rating}
                  </button>
                ))}
                {currentAnswer && (
                  <span className="text-[11px] text-muted-foreground ml-1">
                    {RATING_LABELS[parseInt(currentAnswer, 10) - 1]}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {buildChoiceOptions(q).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer(q.id, opt)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      currentAnswer === opt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border/60 text-foreground hover:border-primary/40"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onSubmit(answers)}
        disabled={!allAnswered || isSubmitting}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
      >
        <Send className="w-4 h-4" />
        {isSubmitting ? "Refining your plan…" : "Refine my growth plan"}
      </button>
    </div>
  );
}

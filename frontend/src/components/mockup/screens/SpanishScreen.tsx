import TopBar from "../TopBar";
import AiBubble from "../AiBubble";
import ChipButton from "../ChipButton";
import ChatInput from "../ChatInput";

const SpanishScreen = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <TopBar showProfile lang="ES" />
    <div className="flex-1 overflow-y-auto pb-2">
      <AiBubble>
        <p className="text-sm text-foreground leading-relaxed">
          ¡Hola! Estoy aquí para ayudarte con beneficios, empleos y servicios de la ciudad de Montgomery, AL. ¿Qué está pasando en tu vida ahora mismo?
        </p>
      </AiBubble>
      <div className="flex flex-wrap gap-2 px-4 pt-1 pb-2 ml-9">
        <ChipButton label="Revisar mis beneficios" />
        <ChipButton label="Buscar mejores empleos" />
        <ChipButton label="Necesito ayuda con un formulario" />
      </div>
    </div>
    <ChatInput placeholder="Escribe tu situación..." />
  </div>
);

export default SpanishScreen;

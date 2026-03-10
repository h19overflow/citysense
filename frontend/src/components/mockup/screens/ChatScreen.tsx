import TopBar from "../TopBar";
import AiBubble from "../AiBubble";
import ChipButton from "../ChipButton";
import ChatInput from "../ChatInput";

const ChatScreen = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <TopBar showProfile />
    <div className="flex-1 overflow-y-auto pb-2">
      <AiBubble>
        <p className="text-sm text-foreground leading-relaxed">
          Hello! I'm here to help you navigate benefits, jobs, and city services in Montgomery, AL. What's going on in your life right now?
        </p>
      </AiBubble>
      <div className="flex flex-wrap gap-2 px-4 pt-1 pb-2 ml-9">
        <ChipButton label="Check my benefits" />
        <ChipButton label="Find better jobs" />
        <ChipButton label="I need help with a form" />
      </div>
    </div>
    <ChatInput />
  </div>
);

export default ChatScreen;

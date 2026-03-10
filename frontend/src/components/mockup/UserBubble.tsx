interface UserBubbleProps {
  children: React.ReactNode;
}

const UserBubble = ({ children }: UserBubbleProps) => (
  <div className="flex justify-end px-4 py-2">
    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
      <p className="text-sm">{children}</p>
    </div>
  </div>
);

export default UserBubble;

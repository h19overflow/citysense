import { Target } from "lucide-react";

interface RolesCardProps {
  roles: string[];
}

const RolesCard = ({ roles }: RolesCardProps) => (
  <div className="rounded-xl border border-border/50 bg-white px-5 py-4">
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
      <Target className="w-4 h-4 text-primary" />
      Matched Roles
    </h3>
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => (
        <span
          key={role}
          className="px-3 py-1.5 rounded-lg bg-pine-green/10 text-pine-green text-sm font-medium border border-pine-green/20"
        >
          {role}
        </span>
      ))}
    </div>
  </div>
);

export default RolesCard;

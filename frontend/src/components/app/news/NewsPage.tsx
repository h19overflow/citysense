import { useState } from "react";
import { NewsMapTab } from "./NewsMapTab";
import { NewsletterTab } from "./NewsletterTab";

type NewsTab = "newsletter" | "map";

export function NewsPage() {
  const [activeTab, setActiveTab] = useState<NewsTab>("newsletter");

  if (activeTab === "map") {
    return <NewsMapTab onBack={() => setActiveTab("newsletter")} />;
  }

  return <NewsletterTab onShowMap={() => setActiveTab("map")} />;
}

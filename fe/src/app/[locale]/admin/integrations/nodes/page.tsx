"use client";

import { useTypedMsg } from "@/hooks/useTypedMsg";
import { NodesSection } from "../NodesSection";
import { IntegrationsMessages } from "../types";

export default function NodesPage() {
  const adminMsg = useTypedMsg<{ integrations: IntegrationsMessages }>("Admin");
  if (!adminMsg) return null;
  return <NodesSection t={adminMsg.integrations.nodes} />;
}

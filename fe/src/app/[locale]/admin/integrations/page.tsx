"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IntegrationsPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/integrations/nodes"); }, [router]);
  return null;
}

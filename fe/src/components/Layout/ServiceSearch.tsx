"use client";

import { useState, useRef, useEffect } from "react";
import { Link, useMsg } from "@/providers/MessagesProvider";
import { ROUTES } from "@/lib/routes";

interface ServiceSearchMessages {
  title: string;
  placeholder: string;
  notFound: string;
  categories: Record<string, string>;
  services: Record<string, string>;
}

interface ServiceDef {
  key: string;
  path: string;
  categoryKey: string;
  icon: React.ReactNode;
}

interface Service {
  label: string;
  path: string;
  category: string;
  icon: React.ReactNode;
}

const SERVICE_DEFS: ServiceDef[] = [
  {
    key: "Instances",
    path: ROUTES.instances,
    categoryKey: "Compute",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
      </svg>
    ),
  },
  {
    key: "Network",
    path: ROUTES.network,
    categoryKey: "Network",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    key: "Firewall",
    path: ROUTES.firewall,
    categoryKey: "Network",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    key: "Volumes",
    path: ROUTES.volumes,
    categoryKey: "Storage",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
  {
    key: "Backups",
    path: ROUTES.backups,
    categoryKey: "Storage",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4m4-4v4" />
      </svg>
    ),
  },
  {
    key: "IAM",
    path: ROUTES.iam,
    categoryKey: "IAM",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    key: "Monitoring",
    path: ROUTES.monitoring,
    categoryKey: "Monitoring",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: "Billing",
    path: ROUTES.billing,
    categoryKey: "Billing",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

export function ServiceSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useMsg("ServiceSearch") as unknown as ServiceSearchMessages | undefined;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const allServices: Service[] = (t ? SERVICE_DEFS.map((def) => ({
    label: t.services[def.key] ?? def.key,
    path: def.path,
    category: t.categories[def.categoryKey] ?? def.categoryKey,
    icon: def.icon,
  })) : []);

  const filtered = query.trim()
    ? allServices.filter(
        (s) =>
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.category.toLowerCase().includes(query.toLowerCase())
      )
    : allServices;

  const byCategory = filtered.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => { setOpen((o) => !o); if (open) setQuery(""); }}
        className={`p-1.5 rounded transition-colors ${
          open ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-500"
        }`}
        title={t?.title ?? "All Services"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-76 bg-white border border-gray-200 rounded-lg shadow-xl z-9999 p-4">
          {/* Search inside panel */}
          <div className="relative mb-4">
            <input
              ref={inputRef}
              type="text"
              placeholder={t?.placeholder ?? "Search services..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
            />
            {/* <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg> */}
          </div>

          {Object.keys(byCategory).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">{t?.notFound ?? "No services found"}</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(byCategory).map(([category, services]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    {category}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {services.map((s) => (
                      <Link
                        key={s.path}
                        href={s.path}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors"
                        onClick={() => { setOpen(false); setQuery(""); }}
                      >
                                        <div className="w-5 h-5 flex items-center justify-center shrink-0 text-gray-500">
                          {s.icon}
                        </div>
                        <span className="text-sm text-gray-700">{s.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Link } from "@/providers/MessagesProvider";

interface Service {
  label: string;
  path: string;
  category: string;
  icon: React.ReactNode;
}

const ALL_SERVICES: Service[] = [
  {
    label: "Instances",
    path: "/instances",
    category: "Compute",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
      </svg>
    ),
  },
];

export function ServiceSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const filtered = query.trim()
    ? ALL_SERVICES.filter(
        (s) =>
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.category.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_SERVICES;

  const byCategory = filtered.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (open) setQuery(""); }}
        className={`p-1.5 rounded transition-colors ${
          open ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-500"
        }`}
        title="All Services"
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
              placeholder="Search services..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
            />
            {/* <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg> */}
          </div>

          {Object.keys(byCategory).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No services found</p>
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

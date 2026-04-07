"use client";

import { ReactNode } from "react";
import { Spinner } from "@h001/ui";

interface AdminListPanelProps {
  title: string;
  actions?: ReactNode;
  searchValue?: string;
  onSearch?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
  className?: string;
}

/**
 * 어드민 목록 페이지에서 공통으로 사용하는 카드 패널.
 * 헤더(타이틀 + 검색 + 액션 버튼) + 로딩/콘텐츠 영역으로 구성된다.
 */
export default function AdminListPanel({
  title,
  actions,
  searchValue,
  onSearch,
  searchPlaceholder = "Search...",
  filters,
  loading = false,
  loadingText = "Loading...",
  children,
  className = "",
}: AdminListPanelProps) {
  return (
    <div className={`bg-white rounded-lg border overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap mr-1">{title}</span>
        {filters}
        {onSearch && (
          <input
            type="text"
            className="border rounded px-2 py-1 text-xs w-44"
            placeholder={searchPlaceholder}
            value={searchValue ?? ""}
            onChange={(e) => onSearch(e.target.value)}
          />
        )}
        <div className="flex items-center gap-2 ml-auto">{actions}</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <Spinner size="md" />
          <span className="text-sm text-gray-600">{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

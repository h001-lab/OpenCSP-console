
export default function AnnouncementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-6">
      {/* 페이지 전체 공통 영역 */}
      <div className="max-w-3xl mx-auto">
        {children}
      </div>
    </div>
  );
}
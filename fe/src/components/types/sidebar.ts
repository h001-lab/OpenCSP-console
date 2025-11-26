export interface SideBarItem {
  label: string;
  path: string;       // 이동할 URL
  icon?: React.ReactNode;
  active?: boolean;   // 선택 여부 (선택적)
}
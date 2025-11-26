
export interface Instance {
  name: string;
  type: string;
  status: string;
  created: string;
}

export interface Column<T> {
  key: keyof T;
  label: string;
  width?: string | number;
}

export interface DenseTableProps<T> {
  columns: Column<T>[];
  data: T[];
}
"use client";

import styles from "./DenseTable.module.css";

interface Column {
  key: string;
  label: string;
  width?: string | number;
}

interface DenseTableProps {
  columns: Column[];
  data: Record<string, any>[];
}

export function DenseTable({ columns, data }: DenseTableProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={styles.headerCell}
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className={styles.row}>
              {columns.map(col => (
                <td key={col.key} className={styles.cell}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
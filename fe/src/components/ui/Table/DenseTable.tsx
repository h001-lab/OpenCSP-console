"use client";

import { DenseTableProps } from "@/components/types";
import styles from "./DenseTable.module.css";

export function DenseTable<T>({ columns, data }: DenseTableProps<T>) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={String(col.key)}
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
                <td key={String(col.key)} className={styles.cell}>
                  {row[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
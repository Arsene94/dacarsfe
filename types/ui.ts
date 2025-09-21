import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'danger' | 'blue' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  onValueChange?: (value: string) => void;
}

export type ColumnValue = string | number | boolean | Date | null | undefined;

export interface Column<T, V extends ColumnValue = ColumnValue> {
  id: string;
  header: React.ReactNode;
  accessor: (row: T) => V;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface SortState<T, V extends ColumnValue = ColumnValue> {
  id: string;
  accessor: (row: T) => V;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  renderRowDetails?: (row: T) => React.ReactNode;
}

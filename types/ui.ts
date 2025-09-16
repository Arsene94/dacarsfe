import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'danger' | 'blue' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  onValueChange?: (value: string) => void;
}

export interface Column<T> {
  id: string;
  header: React.ReactNode;
  accessor: (row: T) => any;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface SortState<T> {
  id: string;
  accessor: (row: T) => any;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  renderRowDetails?: (row: T) => React.ReactNode;
}

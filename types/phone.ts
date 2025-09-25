export interface Country {
  code: string;
  name: string;
  prefix: string;
  flag: string;
  pattern?: RegExp;
}

export interface PhoneInputProps {
  value: string;
  onChange: (value: string, countryCode: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  label?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  invalidFormatMessage?: (countryName: string) => string;
  exampleLabel?: (countryPrefix: string) => string;
}

export interface Country {
  code: string;
  name: string;
  dialCode: string;
}

// TODO: Expand this list to cover all international dialing codes
export const countries: Country[] = [
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'RO', name: 'Romania', dialCode: '+40' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'BE', name: 'Belgium', dialCode: '+32' },
  { code: 'SE', name: 'Sweden', dialCode: '+46' },
  { code: 'NO', name: 'Norway', dialCode: '+47' },
  { code: 'DK', name: 'Denmark', dialCode: '+45' },
  { code: 'FI', name: 'Finland', dialCode: '+358' },
  { code: 'PL', name: 'Poland', dialCode: '+48' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420' },
  { code: 'SK', name: 'Slovakia', dialCode: '+421' },
  { code: 'HU', name: 'Hungary', dialCode: '+36' },
  { code: 'BG', name: 'Bulgaria', dialCode: '+359' },
  { code: 'GR', name: 'Greece', dialCode: '+30' }
];

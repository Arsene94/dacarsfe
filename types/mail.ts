export interface MailMenuLink {
  label: string;
  url: string;
}

export interface MailSiteDetails {
  title: string;
  url: string;
  logo_path: string;
  logo_max_height?: number | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_link?: string | null;
  support_phone?: string | null;
  support_phone_link?: string | null;
  address?: string | null;
  availability?: string | null;
  menu_items: MailMenuLink[];
  footer_links: MailMenuLink[];
  social_links: MailMenuLink[];
}

export interface MailBrandingColors {
  berkeley: string;
  jade: string;
  jadeLight: string;
  eefie: string;
  [key: string]: string;
}

export interface MailBrandingSettings {
  site: MailSiteDetails;
  colors: MailBrandingColors;
  resolved_site: MailSiteDetails;
  resolved_colors: MailBrandingColors;
}

export interface MailBrandingResponse {
  data: MailBrandingSettings;
}

export interface MailBrandingUpdatePayload {
  site?: Partial<Omit<MailSiteDetails, "menu_items" | "footer_links" | "social_links" | "logo_max_height">> & {
    logo_max_height?: number | null;
    menu_items?: MailMenuLink[];
    footer_links?: MailMenuLink[];
    social_links?: MailMenuLink[];
  };
  colors?: Partial<MailBrandingColors>;
}

export interface MailTemplateSummary {
  key: string;
  path: string;
  name: string;
  updated_at: string;
}

export interface MailTemplateDetail extends MailTemplateSummary {
  contents: string;
}

export interface MailTemplatesResponse {
  data: MailTemplateSummary[];
}

export interface MailTemplateDetailResponse {
  data: MailTemplateDetail;
}

export interface MailTemplateUpdatePayload {
  contents: string;
}

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
  title?: string | null;
  subject?: string | null;
  updated_at: string;
}

export interface MailTemplateAttachment {
  id: string;
  name?: string | null;
  filename?: string | null;
  original_name?: string | null;
  title?: string | null;
  size?: number | string | null;
  mime_type?: string | null;
  url?: string | null;
  [key: string]: unknown;
}

export interface MailTemplateVariableDetail {
  key: string;
  description?: string | null;
  [key: string]: unknown;
}

export interface MailTemplateDetail extends MailTemplateSummary {
  contents: string;
  attachments?: MailTemplateAttachment[];
  example_context?: Record<string, unknown> | null;
  available_variables?: string[] | null;
  available_variable_details?: MailTemplateVariableDetail[] | null;
}

export interface MailTemplatesResponse {
  data: MailTemplateSummary[];
}

export interface MailTemplateDetailResponse {
  data: MailTemplateDetail;
}

export type MailTemplateUpdatePayload = Partial<{
  contents: string;
  title: string | null;
  subject: string | null;
}>;

export interface MailTemplateAttachmentsResponse {
  data: {
    attachments: MailTemplateAttachment[];
    attachment?: MailTemplateAttachment;
  };
}

declare module "twig" {
  export interface TwigTemplate {
    render(context?: Record<string, unknown>): string;
  }

  export interface TwigModule {
    twig(options: {
      id?: string;
      data: string;
      allowInlineIncludes?: boolean;
    }): TwigTemplate;
    cache(enabled?: boolean): void;
  }

  const Twig: TwigModule;
  export default Twig;
}

import { loadClassicEditor } from "./loader";

type EditorConfig = Record<string, unknown> | undefined;

type ClassicEditorConstructor = {
  create: (element: HTMLElement, config?: EditorConfig) => Promise<any>;
  builtinPlugins?: unknown[];
  defaultConfig?: Record<string, unknown>;
};

const getGlobalClassicEditor = (): ClassicEditorConstructor | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return ((window as any).ClassicEditor ?? null) as ClassicEditorConstructor | null;
};

class ClassicEditor {
  static async create(element: HTMLElement, config?: EditorConfig): Promise<any> {
    const Editor = await loadClassicEditor();
    return Editor.create(element, config);
  }

  static get builtinPlugins(): unknown[] {
    const Editor = getGlobalClassicEditor();
    return Editor?.builtinPlugins ?? [];
  }

  static get defaultConfig(): Record<string, unknown> {
    const Editor = getGlobalClassicEditor();
    return Editor?.defaultConfig ?? {};
  }
}

export default ClassicEditor;

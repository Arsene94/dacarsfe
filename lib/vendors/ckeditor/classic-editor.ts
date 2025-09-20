import { loadClassicEditor, type ClassicEditorConstructor, type ClassicEditorInstance } from "./loader";

type EditorConfig = Record<string, unknown> | undefined;

const getGlobalClassicEditor = (): ClassicEditorConstructor | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return ((window as { ClassicEditor?: ClassicEditorConstructor }).ClassicEditor ?? null);
};

class ClassicEditor {
  static async create(element: HTMLElement, config?: EditorConfig): Promise<ClassicEditorInstance> {
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

const CLASSIC_SCRIPT_ID = "ckeditor-classic-build";
const CLASSIC_SCRIPT_SRC = "https://cdn.ckeditor.com/ckeditor5/41.4.2/classic/ckeditor.js";

export type ClassicEditorInstance = {
  destroy(): Promise<void>;
  [key: string]: unknown;
};

export type ClassicEditorConstructor = {
  create: (element: HTMLElement, config?: Record<string, unknown>) => Promise<ClassicEditorInstance>;
  builtinPlugins?: unknown[];
  defaultConfig?: Record<string, unknown>;
};

let classicEditorPromise: Promise<ClassicEditorConstructor> | null = null;

const resolveClassicEditor = (
  resolve: (value: ClassicEditorConstructor) => void,
  reject: (reason?: unknown) => void,
) => {
  const globalEditor =
    typeof window !== "undefined"
      ? ((window as { ClassicEditor?: ClassicEditorConstructor }).ClassicEditor ?? null)
      : null;
  if (globalEditor) {
    resolve(globalEditor);
    return true;
  }

  if (typeof window === "undefined") {
    reject(new Error("CKEditor can only be loaded in the browser."));
    return true;
  }

  return false;
};

export const loadClassicEditor = (): Promise<ClassicEditorConstructor> => {
  if (classicEditorPromise) {
    return classicEditorPromise;
  }

  classicEditorPromise = new Promise((resolve, reject) => {
    if (resolveClassicEditor(resolve, reject)) {
      return;
    }

    const existingScript = document.getElementById(CLASSIC_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => {
          if (!resolveClassicEditor(resolve, reject)) {
            reject(new Error("ClassicEditor failed to initialize after loading."));
          }
        },
        { once: true },
      );

      existingScript.addEventListener(
        "error",
        () => {
          reject(new Error("Nu am reușit să încarc scriptul CKEditor."));
        },
        { once: true },
      );

      return;
    }

    const script = document.createElement("script");
    script.id = CLASSIC_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = CLASSIC_SCRIPT_SRC;

    script.addEventListener(
      "load",
      () => {
        if (!resolveClassicEditor(resolve, reject)) {
          reject(new Error("ClassicEditor nu s-a expus corect în fereastra globală."));
        }
      },
      { once: true },
    );

    script.addEventListener(
      "error",
      () => {
        reject(new Error("Nu am reușit să încarc scriptul CKEditor."));
      },
      { once: true },
    );

    document.head.appendChild(script);
  });

  return classicEditorPromise;
};

export const resetClassicEditorLoaderForTests = () => {
  classicEditorPromise = null;
};

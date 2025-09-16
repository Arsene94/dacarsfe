"use client";

import React, { useEffect, useRef } from "react";

type EditorInstance = {
  setData: (data: string) => void;
  getData: () => string;
  destroy: () => Promise<void>;
  model: {
    document: {
      on: (event: string, callback: (evt: unknown) => void) => void;
      off: (event: string, callback: (evt: unknown) => void) => void;
    };
  };
  editing: {
    view: {
      document: {
        on: (event: string, callback: (evt: unknown) => void) => void;
        off: (event: string, callback: (evt: unknown) => void) => void;
      };
    };
  };
  enableReadOnlyMode?: (id: string) => void;
  disableReadOnlyMode?: (id: string) => void;
  isReadOnly?: boolean;
};

type EditorConstructor = {
  create: (element: HTMLElement, config?: Record<string, unknown>) => Promise<EditorInstance>;
};

type CKEditorProps = {
  editor: EditorConstructor;
  data?: string;
  config?: Record<string, unknown>;
  disabled?: boolean;
  onReady?: (editor: EditorInstance) => void;
  onChange?: (event: unknown, editor: EditorInstance) => void;
  onFocus?: (event: unknown, editor: EditorInstance) => void;
  onBlur?: (event: unknown, editor: EditorInstance) => void;
};

const READ_ONLY_SOURCE = "ck-react-wrapper";

const setReadOnly = (editor: EditorInstance, readOnly: boolean) => {
  if (readOnly) {
    if (typeof editor.enableReadOnlyMode === "function") {
      editor.enableReadOnlyMode(READ_ONLY_SOURCE);
    } else {
      editor.isReadOnly = true;
    }
  } else {
    if (typeof editor.disableReadOnlyMode === "function") {
      editor.disableReadOnlyMode(READ_ONLY_SOURCE);
    } else {
      editor.isReadOnly = false;
    }
  }
};

const CKEditor: React.FC<CKEditorProps> = ({
  editor,
  data = "",
  config,
  disabled = false,
  onReady,
  onChange,
  onFocus,
  onBlur,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const changeHandlerRef = useRef<((evt: unknown) => void) | null>(null);
  const focusHandlerRef = useRef<((evt: unknown) => void) | null>(null);
  const blurHandlerRef = useRef<((evt: unknown) => void) | null>(null);
  const dataRef = useRef<string>(data ?? "");
  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    let isMounted = true;
    const element = containerRef.current;

    if (!element) {
      return () => undefined;
    }

    editor
      .create(element, config)
      .then((createdEditor) => {
        if (!isMounted) {
          createdEditor.destroy().catch(() => undefined);
          return;
        }

        editorRef.current = createdEditor;

        if (dataRef.current) {
          createdEditor.setData(dataRef.current);
        } else {
          createdEditor.setData("");
        }

        if (disabledRef.current) {
          setReadOnly(createdEditor, true);
        }

        const handleChange = (evt: unknown) => {
          if (!editorRef.current) return;
          dataRef.current = editorRef.current.getData();
          onChangeRef.current?.(evt, editorRef.current);
        };

        createdEditor.model.document.on("change:data", handleChange);
        changeHandlerRef.current = handleChange;

        const handleFocus = (evt: unknown) => {
          if (!editorRef.current) return;
          onFocusRef.current?.(evt, editorRef.current);
        };
        createdEditor.editing.view.document.on("focus", handleFocus);
        focusHandlerRef.current = handleFocus;

        const handleBlur = (evt: unknown) => {
          if (!editorRef.current) return;
          onBlurRef.current?.(evt, editorRef.current);
        };
        createdEditor.editing.view.document.on("blur", handleBlur);
        blurHandlerRef.current = handleBlur;

        onReadyRef.current?.(createdEditor);
      })
      .catch((error) => {
        console.error("CKEditor initialization error", error);
      });

    return () => {
      isMounted = false;
      const instance = editorRef.current;
      if (!instance) {
        return;
      }

      if (changeHandlerRef.current) {
        instance.model.document.off("change:data", changeHandlerRef.current);
        changeHandlerRef.current = null;
      }

      if (focusHandlerRef.current) {
        instance.editing.view.document.off("focus", focusHandlerRef.current);
        focusHandlerRef.current = null;
      }

      if (blurHandlerRef.current) {
        instance.editing.view.document.off("blur", blurHandlerRef.current);
        blurHandlerRef.current = null;
      }

      instance
        .destroy()
        .catch((destroyError) => {
          console.error("CKEditor destroy error", destroyError);
        })
        .finally(() => {
          editorRef.current = null;
        });
    };
  }, [editor, config]);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance) {
      dataRef.current = data ?? "";
      return;
    }

    const normalizedData = data ?? "";
    if (normalizedData !== dataRef.current) {
      dataRef.current = normalizedData;
      if (instance.getData() !== normalizedData) {
        instance.setData(normalizedData);
      }
    }
  }, [data]);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance) {
      return;
    }

    setReadOnly(instance, Boolean(disabled));
  }, [disabled]);

  return <div ref={containerRef} />;
};

export { CKEditor };
export default CKEditor;

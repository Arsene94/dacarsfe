"use client";

import * as React from "react";
import { ScrollMode, Viewer, Worker } from "@react-pdf-viewer/core";
import type { ViewerProps } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { printPlugin } from "@react-pdf-viewer/print";
import { getFilePlugin } from "@react-pdf-viewer/get-file";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { scrollModePlugin } from "@react-pdf-viewer/scroll-mode";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import "@react-pdf-viewer/scroll-mode/lib/styles/index.css";

type PdfSource = ViewerProps["fileUrl"];

export type PdfViewerProps = {
  fileUrl: PdfSource;
  fileName?: string;
};

const PdfViewer: React.FC<PdfViewerProps> = ({ fileUrl, fileName }) => {
  const printPluginInstance = React.useMemo(() => printPlugin(), []);
  const getFilePluginInstance = React.useMemo(
    () =>
      getFilePlugin({
        fileNameGenerator: () => fileName ?? "document.pdf",
      }),
    [fileName],
  );

  const defaultLayoutPluginInstance = React.useMemo(() => defaultLayoutPlugin(), []);
  const pageNavigationPluginInstance = React.useMemo(
    () => pageNavigationPlugin({ enableShortcuts: true }),
    [],
  );
  const scrollModePluginInstance = React.useMemo(() => scrollModePlugin(), []);

  const {
    CurrentPageInput,
    GoToFirstPageButton,
    GoToLastPageButton,
    GoToNextPageButton,
    GoToPreviousPageButton,
    NumberOfPages,
  } = pageNavigationPluginInstance;

  const { SwitchScrollModeButton } = scrollModePluginInstance;

  const workerUrl = React.useMemo(() => {
    if (typeof window === "undefined") {
      return "/pdf.worker.min.js";
    }

    return new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();
  }, []);

  const viewerKey = React.useMemo(() => {
    if (typeof fileUrl === "string") {
      return fileUrl;
    }

    return `${fileName ?? "document"}-${Date.now()}`;
  }, [fileName, fileUrl]);

  return (
    <div className="flex h-full flex-col">
      <Worker workerUrl={workerUrl}>
        <div className="flex-1">
          <Viewer
            key={viewerKey}
            fileUrl={fileUrl}
            plugins={[
              defaultLayoutPluginInstance,
              printPluginInstance,
              getFilePluginInstance,
              pageNavigationPluginInstance,
              scrollModePluginInstance,
            ]}
            theme="light"
            style={{ height: "100%" }}
          />
        </div>
      </Worker>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <GoToFirstPageButton />
          <GoToPreviousPageButton />
          <div className="flex items-center gap-2">
            <CurrentPageInput />
            <span className="inline-flex items-center gap-2 text-slate-500">
              /
              <NumberOfPages>
                {({ numberOfPages }) => (
                  <span className="inline-flex min-w-[2ch] justify-center">
                    {numberOfPages}
                  </span>
                )}
              </NumberOfPages>
            </span>
          </div>
          <GoToNextPageButton />
          <GoToLastPageButton />
        </div>
        <div className="flex items-center gap-2">
          <SwitchScrollModeButton mode={ScrollMode.Vertical} />
          <SwitchScrollModeButton mode={ScrollMode.Horizontal} />
          <SwitchScrollModeButton mode={ScrollMode.Wrapped} />
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;

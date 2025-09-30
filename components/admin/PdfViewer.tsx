"use client";

import * as React from "react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import type { ViewerProps } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { printPlugin } from "@react-pdf-viewer/print";
import { getFilePlugin } from "@react-pdf-viewer/get-file";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

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
            plugins={[defaultLayoutPluginInstance, printPluginInstance, getFilePluginInstance]}
            theme="light"
            style={{ height: "100%" }}
          />
        </div>
      </Worker>
    </div>
  );
};

export default PdfViewer;

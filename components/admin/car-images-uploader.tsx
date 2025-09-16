"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { UploadCloud, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CarImageAsset {
  id: string;
  name: string;
  previewUrl: string;
  file?: File;
  existingPath?: string;
}

interface CarImagesUploaderProps {
  id?: string;
  images: CarImageAsset[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorder: (nextImages: CarImageAsset[]) => void;
  disabled?: boolean;
}

const isFileDragEvent = (event: React.DragEvent<HTMLElement>) =>
  Array.from(event.dataTransfer.types).includes("Files");

const CarImagesUploader: React.FC<CarImagesUploaderProps> = ({
  id,
  images,
  onAddFiles,
  onRemove,
  onReorder,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const triggerFileDialog = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleFileSelection = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const files = Array.from(event.target.files);
      if (files.length > 0) {
        onAddFiles(files);
      }
      event.target.value = "";
    },
    [onAddFiles],
  );

  const handleDropZoneDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!isFileDragEvent(event) || disabled) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsDraggingFiles(true);
    },
    [disabled],
  );

  const handleDropZoneDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!isFileDragEvent(event) || disabled) {
        return;
      }
      event.preventDefault();
      const related = event.relatedTarget as HTMLElement | null;
      if (!related || !event.currentTarget.contains(related)) {
        setIsDraggingFiles(false);
      }
    },
    [disabled],
  );

  const handleDropZoneDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      setIsDraggingFiles(false);
      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length > 0) {
        onAddFiles(files);
      }
    },
    [disabled, onAddFiles],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLLIElement>, id: string) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      setDraggingId(id);
      setDragOverId(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
    },
    [disabled],
  );

  const handleDragOverItem = useCallback(
    (event: React.DragEvent<HTMLLIElement>, id: string) => {
      if (disabled) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (draggingId && draggingId !== id) {
        setDragOverId(id);
      }
    },
    [disabled, draggingId],
  );

  const handleDropOnItem = useCallback(
    (event: React.DragEvent<HTMLLIElement>, id: string) => {
      if (disabled) return;
      event.preventDefault();
      const sourceId = draggingId ?? event.dataTransfer.getData("text/plain");
      setDraggingId(null);
      setDragOverId(null);
      if (!sourceId || sourceId === id) {
        return;
      }
      const sourceIndex = images.findIndex((image) => image.id === sourceId);
      const targetIndex = images.findIndex((image) => image.id === id);
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
        return;
      }
      const updated = [...images];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      onReorder(updated);
    },
    [disabled, draggingId, images, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  const handleRemove = useCallback(
    (id: string) => () => {
      onRemove(id);
    },
    [onRemove],
  );

  return (
    <div>
      <div
        id={id}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={`mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          isDraggingFiles
            ? "border-jade bg-jade/10"
            : "border-gray-300 bg-gray-50 hover:border-jade"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        onClick={triggerFileDialog}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            triggerFileDialog();
          }
        }}
        onDragOver={handleDropZoneDragOver}
        onDragEnter={handleDropZoneDragOver}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={handleDropZoneDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelection}
          disabled={disabled}
        />
        <UploadCloud className="h-10 w-10 text-jade" aria-hidden="true" />
        <p className="mt-3 font-dm-sans text-sm text-gray-600">
          Trage și plasează imaginile aici sau
          <span className="font-semibold text-jade"> selectează-le manual</span>
        </p>
        <p className="mt-1 font-dm-sans text-xs text-gray-400">
          Sunt acceptate fișiere JPG, PNG, WebP, HEIC sau AVIF.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={triggerFileDialog}
          disabled={disabled}
        >
          Alege imagini
        </Button>
      </div>

      {images.length > 0 ? (
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <li
              key={image.id}
              className={`group relative rounded-lg border border-gray-200 bg-white shadow-sm transition ${
                draggingId === image.id
                  ? "opacity-70"
                  : dragOverId === image.id
                  ? "ring-2 ring-jade"
                  : ""
              }`}
              draggable={!disabled}
              onDragStart={(event) => handleDragStart(event, image.id)}
              onDragOver={(event) => handleDragOverItem(event, image.id)}
              onDrop={(event) => handleDropOnItem(event, image.id)}
              onDragEnd={handleDragEnd}
            >
              <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                <Image
                  src={image.previewUrl || "/images/placeholder-car.svg"}
                  alt={image.name}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={handleRemove(image.id)}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-gray-600 transition hover:bg-red-500 hover:text-white"
                  aria-label="Șterge imaginea"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-xs font-dm-sans text-white">
                  <GripVertical className="h-3 w-3" aria-hidden="true" />
                  <span>{index + 1}</span>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-xs font-dm-sans text-gray-600">
                <span className="line-clamp-2 pr-2" title={image.name}>
                  {image.name}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 font-dm-sans text-sm text-gray-500">
          Nu au fost adăugate imagini momentan.
        </p>
      )}
    </div>
  );
};

export default CarImagesUploader;

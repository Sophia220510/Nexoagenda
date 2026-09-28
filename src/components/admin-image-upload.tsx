"use client";

import { useRef, useState } from "react";

type Props = {
  label: string;
  scope: "logos" | "profiles";
  value?: string;
  defaultValue?: string;
  name?: string;
  onChange?: (url: string) => void;
};

export function AdminImageUpload({
  label,
  scope,
  value,
  defaultValue = "",
  name,
  onChange,
}: Props) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const currentValue = value ?? internalValue;

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    body.set("scope", scope);
    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url)
        throw new Error(result.error || "Não foi possível enviar a imagem.");
      setInternalValue(result.url);
      onChange?.(result.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível enviar a imagem.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="admin-image-upload">
      {name && <input type="hidden" name={name} value={currentValue} />}
      <div className="admin-image-preview">
        {currentValue ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentValue} alt="Prévia do arquivo" />
        ) : (
          <span>Sem imagem</span>
        )}
      </div>
      <div>
        <strong>{label}</strong>
        <p className="muted">JPG, PNG ou WebP · máximo 5 MB</p>
        <label className="button-ghost upload-button">
          {busy ? "Enviando..." : currentValue ? "Trocar imagem" : "Escolher arquivo"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
        {currentValue && (
          <button
            type="button"
            className="text-link danger"
            onClick={() => {
              setInternalValue("");
              onChange?.("");
            }}
          >
            Remover
          </button>
        )}
        {error && <p className="notice notice-error">{error}</p>}
      </div>
    </div>
  );
}

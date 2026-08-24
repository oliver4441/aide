"use client";

import { useState, useCallback } from "react";

interface QRCodeProps {
  url: string;
  size?: number;
  label?: string;
}

export default function QRCode({ url, size = 200, label }: QRCodeProps) {
  const [error, setError] = useState(false);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000`;

  const handleError = useCallback(() => setError(true), []);

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-surface-container border border-outline-variant rounded-xl"
        style={{ width: size, height: size }}
      >
        <div className="text-center p-4">
          <svg className="w-8 h-8 text-on-surface-variant mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.914-1.242a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
          </svg>
          <p className="text-xs text-on-surface-variant">Offline — QR unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={qrUrl}
        alt={label || "QR Code"}
        width={size}
        height={size}
        className="rounded-lg border border-outline-variant bg-white"
        onError={handleError}
      />
      {label && (
        <p className="text-xs text-on-surface-variant text-center">{label}</p>
      )}
    </div>
  );
}

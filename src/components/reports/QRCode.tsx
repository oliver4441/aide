"use client";

import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  url: string;
  size?: number;
  label?: string;
}

export default function QRCode({ url, size = 200, label }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    QRCodeLib.toDataURL(url, {
      width: size * 2,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((d) => {
        if (alive) setDataUrl(d);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [url, size]);

  if (error || !dataUrl) {
    return (
      <div
        className="flex items-center justify-center bg-surface-container border border-outline-variant rounded-xl"
        style={{ width: size, height: size }}
      >
        <p className="text-xs text-on-surface-variant p-4 text-center">QR unavailable</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={dataUrl}
        alt={label || "QR Code"}
        width={size}
        height={size}
        className="rounded-lg border border-outline-variant bg-white"
      />
      {label && <p className="text-xs text-on-surface-variant text-center">{label}</p>}
    </div>
  );
}

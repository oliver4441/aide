"use client";

import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

export default function ReceiptQR({
  url,
  size = 96,
}: {
  url: string;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    QRCodeLib.toDataURL(url, {
      width: size * 2,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((d) => {
        if (alive) setDataUrl(d);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [url, size]);

  if (failed || !dataUrl) return null;

  return (
    <img
      src={dataUrl}
      alt="Scan for receipt"
      width={size}
      height={size}
      className="rounded bg-white p-1"
    />
  );
}

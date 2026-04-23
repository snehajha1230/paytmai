"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import paytmupi from "../images/paytmupi.png";
import googleplay from "../images/googleplay.png";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  onLogin: () => Promise<void>;
};

const steps = [
  "Open Paytm App",
  "Tap Scan option available at the bottom",
  "Point Paytm Scan at QR Code to login",
] as const;

export default function LoginModal({
  open,
  onClose,
  onLogin,
}: LoginModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQrActivate = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await onLogin();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, [onLogin, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close login"
        className="absolute inset-0 cursor-default border-0 bg-black/45 p-0 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="relative z-[210] w-full max-w-[min(100%,468px)] rounded-2xl bg-white px-5 pb-5 pt-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:px-7 sm:pb-6 sm:pt-7"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition hover:bg-[#222] sm:top-5 sm:right-5"
        >
          <span className="text-lg leading-none font-light">×</span>
        </button>

        <h2
          id="login-modal-title"
          className="pr-10 text-center text-[17px] font-bold text-black sm:text-lg"
        >
          Login with your Paytm account
        </h2>

        <div className="mt-5 rounded-xl bg-[#e8f6fc] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-[#002970]">
                Steps to scan QR Code
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-[13px] leading-snug text-[#1a3a5c] sm:text-[14px]">
                {steps.map((s) => (
                  <li key={s} className="pl-1">
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex shrink-0 flex-col items-center justify-center sm:w-[min(100%,200px)]">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleQrActivate()}
                className="group relative rounded-lg border-4 border-white bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition hover:ring-2 hover:ring-[#00baf2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00baf2] disabled:opacity-60"
                aria-label="Tap QR code to log in"
              >
                <div className="relative">
                  <QRCode
                    value="paytmai://login"
                    size={168}
                    level="H"
                    className="h-auto max-w-full"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded bg-white px-1.5 py-0.5 shadow-sm">
                      <Image
                        src={paytmupi}
                        alt=""
                        width={56}
                        height={16}
                        className="h-4 w-auto object-contain"
                      />
                    </span>
                  </div>
                </div>
              </button>
              <p className="mt-2 text-center text-[11px] text-[#555]">
                Tap the QR code to log in on this site
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-center text-[13px] text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <p className="mt-4 text-center text-[12px] leading-relaxed text-[#555] sm:text-[13px]">
          By signing in, you agree to our{" "}
          <a
            href="https://paytm.com/company/privacy-policy"
            className="font-medium text-[#00baf2] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            privacy policy
          </a>{" "}
          and{" "}
          <a
            href="https://paytm.com/company/terms-and-conditions"
            className="font-medium text-[#00baf2] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            terms of use
          </a>
        </p>

        <div className="my-4 h-px bg-[#e8e8e8]" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] font-medium text-[#333] sm:max-w-[200px] sm:text-[13px]">
            To create an account download Paytm App
          </p>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <a
              href="https://apps.apple.com/in/app/paytm-payments-bank-account/id473941634"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 min-w-[140px] items-center justify-center gap-1.5 rounded-md border border-[#ddd] bg-black px-3 text-[11px] font-semibold text-white hover:bg-[#222]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span className="text-left leading-tight">
                <span className="block text-[9px] font-normal opacity-90">
                  Download on the
                </span>
                App Store
              </span>
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=net.one97.paytm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md"
              aria-label="Get it on Google Play"
            >
              <Image
                src={googleplay}
                alt="Get it on Google Play"
                width={150}
                height={45}
                className="h-10 w-auto object-contain"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

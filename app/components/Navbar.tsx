"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/app/components/AuthProvider";
import LoginModal from "@/app/components/LoginModal";
import paytmupi from "../images/paytmupi.png";
import logoutImg from "../images/logoutImg.png";

const NAV_ITEMS = [
  {
    label: "Recharge & Bills" as const,
    links: [
      "Mobile Recharge",
      "Electricity bill",
      "DTH recharge",
      "Municipal bill",
      "Water bill",
      "Gas & Cylinder",
      "Loan EMI",
      "Insurance Premium",
      "Challan",
    ],
  },
  {
    label: "Ticket Booking" as const,
    links: [
      "Movie Tickets",
      "Flight Tickets",
      "Bus Tickets",
      "Train Tickets",
      "Events & Sports",
    ],
  },
  {
    label: "Payments & Services" as const,
    links: [
      "Credit Card Payment",
      "Rent Payment",
      "Book a Cylinder",
      "All Payment Services",
    ],
  },
  {
    label: "Paytm for Business" as const,
    links: [
      "Accept Payments",
      "Business Dashboard",
      "Advertise on Paytm",
      "Business Blog",
    ],
  },
  {
    label: "Company" as const,
    links: ["About Us", "CSR", "Blog", "Careers", "Contact Us"],
  },
] as const;

type NavLabel = (typeof NAV_ITEMS)[number]["label"];

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const { user, loading, login, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<NavLabel | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggersRef = useRef<Partial<Record<NavLabel, HTMLButtonElement>>>({});
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenMenu(null), 180);
  }, [clearCloseTimer]);

  const openFor = useCallback(
    (label: NavLabel) => {
      clearCloseTimer();
      setOpenMenu(label);
    },
    [clearCloseTimer],
  );

  const updateDropdownPosition = useCallback(() => {
    if (!openMenu) return;
    const el = triggersRef.current[openMenu];
    if (!el) return;
    const r = el.getBoundingClientRect();
    setDropdownPos({
      top: r.bottom + 6,
      left: r.left + r.width / 2,
    });
  }, [openMenu]);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    updateDropdownPosition();
  }, [openMenu, updateDropdownPosition]);

  useEffect(() => {
    if (!openMenu) return;
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [openMenu, updateDropdownPosition]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openMenu]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [profileMenuOpen]);

  const activeLinks =
    NAV_ITEMS.find((i) => i.label === openMenu)?.links ?? [];

  const portal =
    mounted &&
    openMenu &&
    typeof document !== "undefined" &&
    createPortal(
      <>
        <button
          type="button"
          aria-label="Close menu"
          className="fixed right-0 bottom-0 left-0 z-[140] cursor-default border-0 bg-black/50 p-0 top-[84px] md:top-[92px]"
          onClick={() => setOpenMenu(null)}
        />
        <div
          role="menu"
          className="fixed z-[150] w-max min-w-[248px] max-w-[min(92vw,320px)] -translate-x-1/2"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          <div className="relative rounded-[10px] border border-[#e3e3e3] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
            <div
              className="pointer-events-none absolute -top-[5px] left-1/2 -translate-x-1/2 drop-shadow-[0_-1px_0_#e3e3e3]"
              aria-hidden
            >
              <svg width="12" height="6" viewBox="0 0 12 6" fill="none">
                <path d="M6 0L12 6H0L6 0Z" fill="white" />
              </svg>
            </div>
            <ul className="relative m-0 list-none px-0 py-0">
              {activeLinks.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    role="menuitem"
                    className="block px-5 py-[11px] text-[14px] font-semibold leading-snug tracking-tight text-[#101010] hover:bg-[#f3f6f8]"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </>,
      document.body,
    );

  return (
    <>
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={login}
      />
      {portal}

      <header className="sticky top-0 z-[100] border-b border-[#e8e8e8] bg-white py-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] md:py-5">
        <div className="mx-auto flex min-h-[52px] max-w-[1180px] items-center gap-2 px-3 sm:gap-3 sm:px-5 md:gap-4 md:pl-6 md:pr-10 lg:pl-8 lg:pr-12">
          <a href="/" className="-ml-1 shrink-0 sm:-ml-1.5 md:-ml-2">
            <Image
              src={paytmupi}
              alt="Paytm UPI"
              width={122}
              height={34}
              className="h-[28px] w-auto object-contain md:h-[30px]"
              priority
            />
          </a>

          <nav className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-x-2 gap-y-2 overflow-visible md:flex-nowrap md:gap-x-2.5 lg:gap-x-3">
            {NAV_ITEMS.map((item) => {
              const isOpen = openMenu === item.label;
              return (
                <div
                  key={item.label}
                  className="relative flex shrink-0"
                  onMouseEnter={() => openFor(item.label)}
                >
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) triggersRef.current[item.label] = el;
                    }}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() =>
                      setOpenMenu((m) => (m === item.label ? null : item.label))
                    }
                    className={`flex max-w-full items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-2 text-[12px] font-bold tracking-tight transition-colors md:px-2 md:text-[13px] ${
                      isOpen
                        ? "text-[#00baf2]"
                        : "text-black hover:text-[#00baf2]"
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`shrink-0 ${
                        isOpen ? "text-[#00baf2]" : "text-[#6b6b6b]"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 pl-3 sm:gap-2.5 sm:pl-4 md:gap-3 md:pl-6 lg:pl-8">
            {user ? (
              <>
                <div className="relative shrink-0" ref={profileMenuRef}>
                  <button
                    type="button"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="true"
                    aria-label="Account menu"
                    onClick={() => setProfileMenuOpen((o) => !o)}
                    className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full bg-[#8ecfff] ring-2 ring-transparent transition hover:ring-[#00baf2]/40 md:h-8 md:w-8"
                  >
                    <Image
                      src={logoutImg}
                      alt=""
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </button>
                  {profileMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+8px)] z-[160] w-max min-w-[200px] rounded-[10px] border border-[#e3e3e3] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.15)]"
                    >
                      <a
                        href="#"
                        role="menuitem"
                        className="block px-5 py-[11px] text-[14px] font-semibold leading-snug tracking-tight text-[#101010] hover:bg-[#f3f6f8]"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        Paytm AI
                      </a>
                      <a
                        href="#"
                        role="menuitem"
                        className="block px-5 py-[11px] text-[14px] font-semibold leading-snug tracking-tight text-[#101010] hover:bg-[#f3f6f8]"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        Help and Support
                      </a>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex shrink-0 items-center rounded-full bg-[#002e6e] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#00265c] md:px-5"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => setLoginOpen(true)}
                className="flex shrink-0 items-center gap-2.5 rounded-full bg-[#002e6e] py-2 pl-2 pr-4 text-[13px] font-semibold text-white transition hover:bg-[#00265c] disabled:opacity-60 md:pr-5"
              >
                <span className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full bg-[#8ecfff] md:h-8 md:w-8">
                  <Image
                    src={logoutImg}
                    alt=""
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </span>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

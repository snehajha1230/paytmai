"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import LoginModal from "@/app/components/LoginModal";
import MobileRechargeFlow from "@/app/components/MobileRechargeFlow";
import UpiMoneyTransfer from "@/app/components/UpiMoneyTransfer";
import mobilerec from "./images/mobilerec.png";
import dth from "./images/dth.png";
import fastag from "./images/fastag.png";
import electricity from "./images/electricity.png";
import emi from "./images/emi.png";
import viewall from "./images/viewall.png";
import getupistat from "./images/getupistat.png";
import domobile from "./images/domobile.png";
import billboard from "./images/billboard.png";
import swipeleft from "./images/swipeleft.png";
import expensetra from "./images/expensetra.png";
import wedomath from "./images/wedomath.png";
import flights from "./images/flights.png";
import bus from "./images/bus.png";
import train from "./images/train.png";
import intflights from "./images/intflights.png";
import paytmtravel from "./images/paytmtravel.svg";
import returnIcon from "./images/return.png";
import extrasaving from "./images/extrasaving.png";
import Navbar from "@/app/components/Navbar";

function ServiceItem({
  icon,
  label,
  onClick,
}: {
  icon: StaticImageData;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl px-1.5 py-1.5 text-center transition-colors hover:bg-[#f0f9fc] sm:gap-1.5 sm:px-2 sm:py-2 md:px-2.5"
    >
      <span className="flex h-11 w-11 items-center justify-center sm:h-[3.2rem] sm:w-[3.2rem] md:h-[3.6rem] md:w-[3.6rem]">
        <Image
          src={icon}
          alt=""
          width={56}
          height={56}
          className="h-9 w-9 object-contain sm:h-11 sm:w-11 md:h-[2.6rem] md:w-[2.6rem]"
        />
      </span>
      <span className="max-w-[5.5rem] text-[10px] leading-tight font-medium text-[#555] sm:max-w-[5.75rem] sm:text-[11px] md:max-w-[6rem] md:text-xs">
        {label}
      </span>
    </button>
  );
}

const travelTabs = [
  { id: "flights" as const, label: "Flights", icon: flights },
  { id: "bus" as const, label: "Bus", icon: bus },
  { id: "trains" as const, label: "Trains", icon: train },
  { id: "intl" as const, label: "Intl. Flights", icon: intflights },
];

export default function Landing() {
  const { user, login } = useAuth();
  const [mobileRechargeOpen, setMobileRechargeOpen] = useState(false);
  const [mobileLoginOpen, setMobileLoginOpen] = useState(false);
  const [activeTravel, setActiveTravel] = useState<
    "flights" | "bus" | "trains" | "intl"
  >("flights");
  const [tripType, setTripType] = useState<"oneway" | "round">("oneway");

  return (
    <div className="min-h-screen bg-[#eef3f8] text-[#1a1a1a]">
      <LoginModal
        open={mobileLoginOpen}
        onClose={() => setMobileLoginOpen(false)}
        onLogin={async () => {
          await login();
          setMobileRechargeOpen(true);
        }}
      />
      <Navbar />
      <MobileRechargeFlow
        open={mobileRechargeOpen}
        onClose={() => setMobileRechargeOpen(false)}
        userPhone={user?.phone ?? null}
        userDisplayName={user?.displayName ?? "You"}
      />

      <main className="mx-auto max-w-[1180px] px-4 pb-16 pt-7 sm:px-6 md:pt-8 md:px-8 lg:px-10">
        {user ? (
          <div className="mb-5 md:mb-6">
            <UpiMoneyTransfer />
          </div>
        ) : null}
        <div className="grid grid-cols-1 items-stretch gap-1 lg:grid-cols-[minmax(0,7.15fr)_minmax(0,2.85fr)] lg:gap-x-1.5">
          <section className="flex min-h-[min(41.6vw,224px)] min-w-0 flex-col rounded-[18px] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sm:min-h-[208px] sm:p-[1.2rem] md:min-h-[224px] md:p-[1.4rem] lg:min-h-[240px] lg:p-6">
            <h1 className="shrink-0 text-left text-[15px] font-bold leading-snug text-black md:text-base">
              Recharges &amp; Bill Payments
            </h1>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-3 md:py-4">
              <div className="mx-auto grid w-max max-w-full grid-cols-3 place-items-center gap-x-2 gap-y-3 sm:gap-x-2.5 sm:gap-y-4 md:grid-cols-6 md:gap-x-4 md:gap-y-0 lg:gap-x-5">
                <ServiceItem
                  icon={mobilerec}
                  label="Mobile Recharge"
                  onClick={() => {
                    if (!user) setMobileLoginOpen(true);
                    else setMobileRechargeOpen(true);
                  }}
                />
                <ServiceItem icon={dth} label="DTH Recharge" />
                <ServiceItem icon={fastag} label="FasTag Recharge" />
                <ServiceItem icon={electricity} label="Electricity Bill" />
                <ServiceItem icon={emi} label="Loan EMI Payment" />
                <ServiceItem icon={viewall} label="View All Products" />
              </div>
            </div>
          </section>

          <div className="flex min-w-0 items-center justify-center lg:justify-end lg:self-stretch">
            <Image
              src={getupistat}
              alt="Paytm app statement"
              width={getupistat.width}
              height={getupistat.height}
              className="h-auto w-full max-w-[240px] object-contain sm:max-w-[280px] md:max-w-[320px] lg:w-auto lg:max-w-[min(100%,380px)]"
              sizes="(max-width: 1024px) 300px, 360px"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl">
            <Image
              src={domobile}
              alt="Do Mobile Recharge and Win cashback"
              width={domobile.width}
              height={domobile.height}
              className="h-auto w-full object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="overflow-hidden rounded-xl">
            <Image
              src={billboard}
              alt="Broadband Recharge"
              width={billboard.width}
              height={billboard.height}
              className="h-auto w-full object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { src: swipeleft, alt: "Hide your past payments with a left swipe" },
            {
              src: expensetra,
              alt: "Download your statement in Excel or PDF",
            },
            { src: wedomath, alt: "Check total balance of linked bank accounts" },
          ].map((b) => (
            <div
              key={b.alt}
              className="overflow-hidden rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            >
              <Image
                src={b.src}
                alt={b.alt}
                width={b.src.width}
                height={b.src.height}
                className="h-auto w-full object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
          ))}
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:p-8">
          <div className="flex flex-col gap-6 border-b border-[#eef1f5] pb-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap gap-6 md:gap-10">
              {travelTabs.map((tab) => {
                const active = activeTravel === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTravel(tab.id)}
                    className={`relative flex flex-col items-center gap-1 pb-2 text-[13px] font-semibold transition-colors ${
                      active
                        ? "text-[#00baf2]"
                        : "text-[#555] hover:text-[#002970]"
                    }`}
                  >
                    <Image
                      src={tab.icon}
                      alt=""
                      width={28}
                      height={28}
                      className="object-contain opacity-90"
                    />
                    {tab.label}
                    {active ? (
                      <span className="absolute bottom-0 left-0 right-0 mx-auto h-0.5 w-10 rounded-full bg-[#00baf2]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="shrink-0 self-start md:self-auto">
              <Image
                src={paytmtravel}
                alt="Paytm Travel"
                width={140}
                height={36}
                className="h-8 w-auto object-contain object-left"
              />
            </div>
          </div>

          {activeTravel === "flights" ? (
            <>
              <div className="mt-6 flex flex-wrap gap-6">
                <div className="flex gap-4 text-[14px] font-semibold">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="trip"
                      checked={tripType === "oneway"}
                      onChange={() => setTripType("oneway")}
                      className="h-4 w-4 accent-[#00baf2]"
                    />
                    One Way
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="trip"
                      checked={tripType === "round"}
                      onChange={() => setTripType("round")}
                      className="h-4 w-4 accent-[#00baf2]"
                    />
                    Round Trip
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-3">
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888]">
                      From
                    </label>
                    <div className="rounded-lg border border-[#dde3ea] bg-[#fafbfc] px-3 py-2.5 text-[15px] font-semibold text-[#002970]">
                      Delhi (DEL)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dde3ea] bg-white shadow-sm sm:mb-1"
                    aria-label="Swap cities"
                  >
                    <Image
                      src={returnIcon}
                      alt=""
                      width={22}
                      height={22}
                      className="object-contain"
                    />
                  </button>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888]">
                      To
                    </label>
                    <div className="rounded-lg border border-[#dde3ea] bg-[#fafbfc] px-3 py-2.5 text-[15px] font-semibold text-[#002970]">
                      Mumbai (BOM)
                    </div>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-md">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888]">
                      Depart
                    </label>
                    <div className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2.5 text-[14px] font-semibold">
                      Sat, 04 Apr 26
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888]">
                      Return
                    </label>
                    <div
                      className={`rounded-lg border px-3 py-2.5 text-[14px] ${
                        tripType === "round"
                          ? "border-[#dde3ea] bg-white font-semibold"
                          : "border-dashed border-[#ccc] bg-[#fafbfc] text-[#999]"
                      }`}
                    >
                      {tripType === "round" ? "Mon, 07 Apr 26" : "Add Return"}
                    </div>
                  </div>
                </div>
                <div className="lg:min-w-[200px]">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888]">
                    Passenger &amp; Class
                  </label>
                  <div className="rounded-lg border border-[#dde3ea] bg-white px-3 py-2.5 text-[14px]">
                    1 Traveller, Economy
                  </div>
                </div>
                <button
                  type="button"
                  className="h-12 shrink-0 rounded-lg bg-[#00baf2] px-8 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#00a8d9] lg:h-[46px] lg:self-end"
                >
                  Search Flights
                </button>
              </div>

              <div className="mt-8 flex flex-col gap-4 border-t border-[#eef1f5] pt-6 md:flex-row md:flex-wrap md:items-center">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-[#c8e6d0] bg-[#f3fbf5] px-3 py-2 text-[13px] font-semibold text-[#1b5e20]"
                >
                  <Image
                    src={extrasaving}
                    alt=""
                    width={22}
                    height={22}
                    className="object-contain"
                  />
                  Extra Savings
                </button>
                <div className="flex flex-wrap gap-3">
                  {[
                    { title: "Armed Forces", off: "Up to ₹600 off" },
                    { title: "Student", off: "Extra Baggage" },
                    { title: "Senior Citizen", off: "Up to ₹600 off" },
                  ].map((c) => (
                    <button
                      key={c.title}
                      type="button"
                      className="rounded-lg border border-[#dde3ea] bg-[#fafbfc] px-4 py-2 text-left text-[12px] transition hover:border-[#00baf2]"
                    >
                      <span className="font-bold text-[#002970]">{c.title}</span>
                      <span className="mt-0.5 block text-[#666]">{c.off}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="mt-8 py-12 text-center text-[15px] text-[#666]">
              {travelTabs.find((t) => t.id === activeTravel)?.label} booking —
              same Paytm Travel experience.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

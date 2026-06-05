import React from "react";
import { FiSettings } from "react-icons/fi";

export default function Settings() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FiSettings className="text-xl" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-base-content">Settings</h1>
            <p className="mt-1 text-sm text-base-content/60">
              Application settings will be configured here.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

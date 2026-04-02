import React from "react";
import { FiFilter } from "react-icons/fi";

export default function MissionsTablePanel({
  title = "Mission list",
  description = "Search, filter and manage available missions.",
  toolbar = null,
  children = null,
}) {
  return (
    <section className="rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <FiFilter className="shrink-0 text-[20px] text-primary" />
              <h2 className="text-lg font-semibold text-base-content sm:text-lg">
                {title}
              </h2>
            </div>

            <p className="mt-0.5 max-w-2xl text-sm leading-7 text-base-content/65">
              {description}
            </p>
          </div>

          {toolbar ? <div className="w-full xl:w-auto">{toolbar}</div> : null}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

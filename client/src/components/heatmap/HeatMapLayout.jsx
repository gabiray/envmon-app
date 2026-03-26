import React from "react";

export default function HeatMapLayout({ sidebar, map }) {
  return (
    <section className="flex h-full min-h-0 overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
      <div className="grid h-full min-h-0 flex-1 grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="h-full min-h-0 overflow-hidden border-b border-base-300 xl:border-b-0 xl:border-r">
          {sidebar}
        </aside>

        <div className="h-full min-h-0 overflow-hidden">
          {map}
        </div>
      </div>
    </section>
  );
}

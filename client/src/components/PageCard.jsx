import React from "react";

export default function PageCard({ title, children, right }) {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="card-title">{title}</h2>
          {right}
        </div>
        {children}
      </div>
    </div>
  );
}

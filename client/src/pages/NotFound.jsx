import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">404</h2>
        <p className="opacity-60">Pagina nu există.</p>
        <Link className="btn btn-primary btn-sm w-fit" to="/dashboard">
          Înapoi la Dashboard
        </Link>
      </div>
    </div>
  );
}

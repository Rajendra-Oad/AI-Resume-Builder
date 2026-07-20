import { Link } from "react-router-dom";
export const NotFoundPage = () => (
  <main className="not-found">
    <p className="eyebrow">404</p>
    <h1>This page has moved on.</h1>
    <Link className="text-link" to="/">
      Return home →
    </Link>
  </main>
);

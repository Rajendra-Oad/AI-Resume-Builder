import { Link } from "react-router-dom";
import { Button } from "../components/Button";

export const ForbiddenPage = () => (
  <main className="not-found">
    <p className="eyebrow">ACCESS DENIED</p>
    <h1>You do not have access to this page.</h1>
    <Link to="/dashboard">
      <Button>Return to dashboard</Button>
    </Link>
  </main>
);

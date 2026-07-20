import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { AppIcon } from "../components/AppIcon";

export const LandingPage = () => (
  <main className="landing">
    <nav className="landing-nav">
      <Link className="brand brand--dark" to="/">
        <AppIcon name="ai" size={19} /> resumé
      </Link>
      <div>
        <Link to="/login">Sign in</Link>
        <Link to="/register">
          <Button>
            Build my resume <span>→</span>
          </Button>
        </Link>
      </div>
    </nav>
    <section className="hero">
      <div>
        <p className="eyebrow">YOUR CAREER, CLEARLY TOLD</p>
        <h1>
          A resume that
          <br />
          <em>opens doors.</em>
        </h1>
        <p className="hero-copy">
          Create a beautifully structured, ATS-friendly resume with intelligent guidance at every
          step.
        </p>
        <Link to="/register">
          <Button className="hero-button">
            Create your resume <span>→</span>
          </Button>
        </Link>
        <p className="hero-note">Free to start · No credit card required</p>
      </div>
      <div className="hero-art" aria-hidden="true">
        <article>
          <span className="paper-mark">
            <AppIcon name="ai" />
          </span>
          <h2>Alex Morgan</h2>
          <p>Product Designer</p>
          <hr />
          <b>PROFILE</b>
          <i />
          <i />
          <b>EXPERIENCE</b>
          <i />
          <i />
          <i />
        </article>
        <div className="floating-score">
          <strong>92</strong>
          <span>ATS score</span>
          <small>Excellent match</small>
        </div>
      </div>
    </section>
    <section className="feature-strip">
      <p>
        <strong>01</strong> Guided writing
      </p>
      <p>
        <strong>02</strong> Smart suggestions
      </p>
      <p>
        <strong>03</strong> Ready to send
      </p>
    </section>
  </main>
);

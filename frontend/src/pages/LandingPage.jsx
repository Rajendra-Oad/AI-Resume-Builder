import {
  ArrowRight,
  Bot,
  Check,
  FileCheck2,
  FileText,
  Gauge,
  LayoutTemplate,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { scrollToPosition } from "../animations/scrollManager";
import {
  Accordion,
  Counter,
  DashboardMotion,
  HeroMotion,
  Magnetic,
  Reveal,
  Spotlight,
  TiltSurface,
} from "../components/landing/LandingPrimitives";
import PremiumTiltCard from "../components/landing/PremiumTiltCard";

const features = [
  [WandSparkles, "AI writing assistant", "Turn your experience into clear, credible achievements with guidance that keeps your voice intact."],
  [Target, "ATS match insights", "Compare your resume with a role, surface missing keywords, and improve relevance before you apply."],
  [LayoutTemplate, "Recruiter-ready design", "Build with refined templates engineered for readability, hierarchy, and reliable PDF export."],
];

const templates = [
  ["Modern", "Clean and confident", ""],
  ["Executive", "Structured and decisive", "template-preview--slate"],
  ["Editorial", "Warm and distinctive", "template-preview--sand"],
];

const aiFeatures = [
  [Bot, "Context-aware suggestions", "Get specific improvements based on your experience, target role, and the section you are writing."],
  [Gauge, "Instant resume scoring", "See completeness, clarity, impact, and ATS readiness in one actionable score."],
  [Target, "Job-tailored keywords", "Find important skills and language in a job description without awkward keyword stuffing."],
  [Zap, "Fast, focused revisions", "Rewrite summaries and bullet points in seconds, then review every change before accepting it."],
];

const testimonials = [
  ["“I rebuilt my resume in one evening and started getting callbacks the following week. The suggestions felt specific, not generic.”", "MK", "Maya K.", "Product designer"],
  ["“The ATS comparison showed exactly what my application was missing. It made tailoring each version dramatically faster.”", "JT", "Jordan T.", "Software engineer"],
  ["“Beautiful templates, excellent writing guidance, and no wrestling with formatting. It finally feels like a professional workflow.”", "AR", "Avery R.", "Marketing lead"],
];

const faqItems = [
  ["Is it free to create a resume?", "Yes. You can create your account, build a resume, and explore the core workflow for free. Upgrade only when the additional Pro features are useful to you."],
  ["Will my resume work with ATS software?", "The templates use clear structure and readable typography. The ATS checker also helps you identify missing role language and potential readability issues before exporting."],
  ["Does AI invent information about my experience?", "No. The assistant is designed to improve the information you provide. You remain in control and review every suggestion before it becomes part of your resume."],
  ["Can I create multiple versions?", "Yes. You can create tailored resume versions for different roles and keep your application materials organized in one workspace."],
  ["Is my personal data private?", "Your career information is treated as private account data. The product is designed around secure authentication and explicit user control."],
];

const landingLinks = [
  ["Features", "#features"],
  ["Templates", "#templates"],
  ["How it works", "#how-it-works"],
  ["Pricing", "#pricing"],
];

const Brand = () => (
  <Link className="landing-brand" to="/" aria-label="Resumé home">
    <img className="landing-brand__mark" src="/logo.svg" alt="" />
    <span>resumé</span>
  </Link>
);

const PrimaryLink = ({ children, to = "/register" }) => (
  <Magnetic>
    <Link to={to}>
      <button className="landing-primary-button" type="button">
        {children}
      </button>
    </Link>
  </Magnetic>
);

const ResumePreview = ({ className = "" }) => (
  <div className={`template-preview ${className}`.trim()}>
    <h3>Alex Morgan</h3>
    <small>Senior Product Designer</small>
    <hr />
    <b>PROFILE</b><i /><i />
    <b>EXPERIENCE</b><i /><i /><i />
    <b>SKILLS</b><i /><i />
  </div>
);

export const LandingPage = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => window.localStorage.getItem("landing-theme") || "dark");
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("features");

  const scrollToSection = useCallback((sectionId, { updateHistory = false } = {}) => {
    const section = document.getElementById(sectionId);
    if (!section) return false;

    const header = document.querySelector(".landing-header");
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
    const destination = Math.max(
      0,
      window.scrollY + section.getBoundingClientRect().top - headerBottom - 16,
    );
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (updateHistory && window.location.hash !== `#${sectionId}`) {
      window.history.pushState(null, "", `#${sectionId}`);
    }

    setActiveSection(sectionId);
    scrollToPosition(destination, {
      immediate: reduceMotion,
      onComplete: () => section.focus({ preventScroll: true }),
    });
    return true;
  }, []);

  const handleSectionNavigation = useCallback((event) => {
    const sectionId = event.currentTarget.hash.slice(1);
    if (!sectionId) return;
    event.preventDefault();
    setMobileOpen(false);
    scrollToSection(sectionId, { updateHistory: true });
  }, [scrollToSection]);

  useEffect(() => {
    window.localStorage.setItem("landing-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.add("landing-page-active");
    return () => document.body.classList.remove("landing-page-active");
  }, []);

  useEffect(() => {
    const restoreSection = () => {
      const sectionId = decodeURIComponent(window.location.hash.slice(1));
      if (sectionId) scrollToSection(sectionId);
    };

    restoreSection();
    window.addEventListener("hashchange", restoreSection);
    return () => window.removeEventListener("hashchange", restoreSection);
  }, [scrollToSection]);

  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    let frame;
    const updateNavigation = () => {
      frame = undefined;
      setScrolled(window.scrollY > 20);
      const sections = landingLinks.map(([, href]) => href.slice(1));
      let current;
      sections.forEach((id) => {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 160) current = id;
      });
      if (current) setActiveSection(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateNavigation);
    };
    updateNavigation();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className="landing-v2" data-landing-theme={theme}>
      <HeroMotion>
      <header className={`landing-header ${scrolled ? "is-scrolled" : ""}`}>
        <nav className="landing-navbar" aria-label="Main navigation">
          <Brand />
          <div className="landing-navlinks">
            {landingLinks.map(([label, href]) => (
              <Magnetic key={href}>
                <a
                  className={activeSection === href.slice(1) ? "is-active" : ""}
                  href={href}
                  aria-current={activeSection === href.slice(1) ? "location" : undefined}
                  onClick={handleSectionNavigation}
                >
                  {label}
                </a>
              </Magnetic>
            ))}
          </div>
          <div className="landing-nav-actions">
            <button
              className="landing-icon-button"
              type="button"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link to="/login" className="landing-secondary-button">Sign in</Link>
            <PrimaryLink>Build my resume <ArrowRight size={15} /></PrimaryLink>
            <button
              className="landing-icon-button landing-mobile-toggle"
              type="button"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              aria-controls="landing-mobile-menu"
              onClick={() => setMobileOpen((current) => !current)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
        {mobileOpen && (
          <div
            id="landing-mobile-menu"
            className="landing-mobile-menu"
          >
            {landingLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={handleSectionNavigation}>{label}</a>
            ))}
            <Link to="/login">Sign in</Link>
            <Link to="/register">Build my resume</Link>
          </div>
        )}
      </header>

      <section className="landing-hero" data-scroll="" data-scroll-css-progress="" data-scroll-repeat="">
        <Spotlight />
        <div className="landing-container landing-hero__inner">
          <div>
            <h1>A resume that <span className="landing-gradient-text">opens doors.</span></h1>
            <p className="landing-hero__copy">Create a polished, ATS-ready resume with intelligent guidance, beautiful templates, and every tool you need to apply with confidence.</p>
            <div className="landing-hero__actions">
              <PrimaryLink>Create your resume free <ArrowRight size={16} /></PrimaryLink>
              <a className="landing-secondary-button" href="#templates" onClick={handleSectionNavigation}>Explore templates <LayoutTemplate size={16} /></a>
            </div>
            <div className="landing-hero__note">
              <span><Check size={13} /> No credit card</span>
              <span><Check size={13} /> Free to start</span>
              <span><Check size={13} /> Export anytime</span>
            </div>
          </div>

          <div>
            <DashboardMotion>
            <TiltSurface className="product-window" maxTilt={3.5}>
              <div className="product-window__bar"><i /><i /><i /></div>
              <div className="product-window__body">
                <aside className="product-sidebar" aria-hidden="true">
                  <span className="product-logo-line" /><span className="product-nav-line" /><span className="product-nav-line" /><span className="product-nav-line" /><span className="product-nav-line" />
                </aside>
                <div className="product-canvas">
                  <div className="product-canvas__head"><strong>Resume editor</strong><span className="product-score">92% ready</span></div>
                  <div className="product-cards">
                    <div className="resume-sheet"><h3>Alex Morgan</h3><p>Senior Product Designer</p><b>EXPERIENCE</b><i /><i /><i /><b>SKILLS</b><i /><i /></div>
                    <div className="ai-panel"><span className="ai-panel__icon"><Sparkles size={15} /></span><strong>AI improvement</strong><p>Lead with the measurable impact of this project.</p><div className="ai-panel__meter"><i /></div></div>
                  </div>
                </div>
              </div>
            </TiltSurface>
            </DashboardMotion>
          </div>
        </div>
      </section>

      <div className="landing-container trust-row" aria-label="Product trust indicators">
        <div className="trust-pill"><FileText size={19} /><span><Counter value={10000} suffix="+">10,000+</Counter> resumes created</span></div>
        <div className="trust-pill"><FileCheck2 size={19} /><span><strong>ATS friendly</strong> by design</span></div>
        <div className="trust-pill"><Sparkles size={19} /><span><strong>AI powered</strong> guidance</span></div>
      </div>

      <section className="landing-section" id="features" tabIndex={-1} data-scroll="" data-scroll-css-progress="" data-scroll-repeat="">
        <div className="landing-container">
          <Reveal className="landing-section__head"><span className="landing-kicker"><Sparkles size={14} /> Built for better applications</span><h2>Everything between your experience and the interview.</h2><p>A focused career toolkit that helps you write clearly, tailor intelligently, and present your work beautifully.</p></Reveal>
          <div className="feature-grid">
            {features.map(([Icon, title, copy], index) => (
              <Reveal key={title} delay={index * 0.07}>
                <PremiumTiltCard className="feature-card" index={index}><span className="feature-card__icon premium-layer premium-layer--icon"><Icon size={20} /></span><h3 className="premium-layer premium-layer--title">{title}</h3><p className="premium-layer premium-layer--copy">{copy}</p><Link className="premium-layer premium-layer--action" to="/register">Explore feature <ArrowRight size={14} /></Link></PremiumTiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--muted" id="templates" tabIndex={-1} data-scroll="" data-scroll-css-progress="" data-scroll-repeat="">
        <div className="landing-container">
          <Reveal className="landing-section__head"><span className="landing-kicker"><LayoutTemplate size={14} /> Refined templates</span><h2>Designed to be read. Built to stand out.</h2><p>Professional layouts with strong hierarchy, clean typography, and ATS-safe structure.</p></Reveal>
          <div className="template-stage">
            {templates.map(([name, description, className], index) => (
              <Reveal key={name} delay={index * 0.07} variant="scale"><PremiumTiltCard className={`template-card ${index === 0 ? "is-selected" : ""}`} index={index}><div className="premium-layer premium-layer--preview"><ResumePreview className={className} /></div><div className="template-meta premium-layer premium-layer--badge"><strong>{name}</strong><span>{description}</span></div></PremiumTiltCard></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="how-it-works" tabIndex={-1} data-scroll="" data-scroll-css-progress="" data-scroll-repeat="">
        <div className="landing-container">
          <Reveal className="landing-section__head"><span className="landing-kicker"><Zap size={14} /> Simple workflow</span><h2>From blank page to application-ready.</h2><p>A guided process that keeps you moving without taking control away from you.</p></Reveal>
          <div className="timeline">
            {[
              ["Add your experience", "Start fresh or bring the career details you already have. Your content stays structured and easy to refine."],
              ["Improve with AI", "Turn responsibilities into strong achievements and tailor language to the roles you want."],
              ["Check and personalize", "Review ATS alignment, choose a template, and create focused versions for each opportunity."],
              ["Export and apply", "Download a polished PDF and send your clearest professional story with confidence."],
            ].map(([title, copy], index) => (
              <Reveal className="timeline-step" key={title} delay={index * 0.06}><span className="timeline-step__number">{index + 1}</span><div className="timeline-step__copy"><h3>{title}</h3><p>{copy}</p></div></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--muted" data-scroll="" data-scroll-css-progress="" data-scroll-repeat="">
        <div className="landing-container">
          <Reveal className="landing-section__head"><span className="landing-kicker"><Bot size={14} /> Practical intelligence</span><h2>AI that improves your work—not replaces it.</h2><p>Every suggestion is contextual, editable, and yours to accept. You stay in control of your story.</p></Reveal>
          <div className="ai-grid">
            {aiFeatures.map(([Icon, title, copy], index) => <Reveal key={title} delay={index * 0.05} variant="rotate"><PremiumTiltCard className="ai-feature" index={index}><span className="ai-feature__icon premium-layer premium-layer--icon"><Icon size={20} /></span><h3 className="premium-layer premium-layer--title">{title}</h3><p className="premium-layer premium-layer--copy">{copy}</p></PremiumTiltCard></Reveal>)}
          </div>
        </div>
      </section>

      <section className="landing-section" data-scroll="" data-scroll-css-progress="" data-scroll-repeat="">
        <div className="landing-container">
          <Reveal className="landing-section__head"><span className="landing-kicker">Candidate stories</span><h2>Built for the moment you decide to move forward.</h2></Reveal>
          <div className="testimonial-grid">
            {testimonials.map(([quote, initials, name, role], index) => <Reveal key={name} delay={index * 0.07}><PremiumTiltCard className="testimonial" index={index}><span className="testimonial-stars premium-layer premium-layer--badge" aria-label="5 out of 5 stars">★★★★★</span><blockquote className="premium-layer premium-layer--copy">{quote}</blockquote><footer className="premium-layer premium-layer--action"><span className="testimonial-avatar">{initials}</span><span className="testimonial-author"><strong>{name}</strong><span>{role}</span></span></footer></PremiumTiltCard></Reveal>)}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--muted" id="pricing" tabIndex={-1} data-scroll="" data-scroll-css-progress="" data-scroll-repeat="">
        <div className="landing-container">
          <Reveal className="landing-section__head"><span className="landing-kicker">Simple pricing</span><h2>Start free. Upgrade when you need more.</h2><p>No complicated tiers or hidden setup fees—just the tools you need for your next move.</p></Reveal>
          <div className="pricing-grid">
            {[
              ["Free", "$0", "Build a strong foundation at no cost.", ["Resume builder", "Professional templates", "Basic ATS review", "PDF export"], false],
              ["Pro", "$12", "Move faster with the complete AI toolkit.", ["Everything in Free", "Advanced AI suggestions", "Unlimited tailored versions", "Job match insights"], true],
            ].map(([name, price, copy, benefits, featured]) => (
              <Reveal key={name} variant="bottom"><PremiumTiltCard className={`price-card ${featured ? "price-card--featured" : ""}`} featured={featured} index={featured ? 1 : 0}><h3 className="premium-layer premium-layer--title">{name}</h3><div className="price premium-layer premium-layer--title">{price}<small>{featured ? " / month" : " forever"}</small></div><p className="premium-layer premium-layer--copy">{copy}</p><ul className="premium-layer premium-layer--copy">{benefits.map((benefit) => <li key={benefit}><Check size={15} />{benefit}</li>)}</ul><div className="premium-layer premium-layer--action"><PrimaryLink>{featured ? "Start Pro" : "Get started free"} <ArrowRight size={15} /></PrimaryLink></div></PremiumTiltCard></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" data-scroll="" data-scroll-css-progress="" data-scroll-repeat="">
        <div className="landing-container faq-wrap">
          <Reveal className="landing-section__head"><span className="landing-kicker">Questions, answered</span><h2>Everything you need to know.</h2></Reveal>
          <Reveal><Accordion items={faqItems} /></Reveal>
        </div>
      </section>

      <section className="landing-section" data-scroll="" data-scroll-css-progress="" data-scroll-repeat="">
        <div className="landing-container">
          <Reveal><TiltSurface className="landing-cta" maxTilt={2}><span className="landing-kicker"><Sparkles size={14} /> Your next chapter</span><h2>Your best work deserves a resume that makes it clear.</h2><p>Join thousands of candidates building sharper, more confident applications with intelligent guidance.</p><PrimaryLink>Create your resume free <ArrowRight size={16} /></PrimaryLink></TiltSurface></Reveal>
        </div>
      </section>

      <footer className="landing-footer-v2" data-scroll="" data-scroll-css-progress="" data-scroll-repeat="">
        <div className="landing-container">
          <div className="landing-footer__grid">
            <div className="landing-footer__intro"><Brand /><p>Thoughtful tools for clearer resumes, stronger applications, and meaningful careers.</p></div>
            <div className="landing-footer__column"><strong>Product</strong><a href="#features">Features</a><a href="#templates">Templates</a><a href="#pricing">Pricing</a></div>
            <div className="landing-footer__column"><strong>Get started</strong><Link to="/register">Create resume</Link><Link to="/login">Log in</Link><a href="#how-it-works">How it works</a></div>
            <div className="landing-footer__column"><strong>Built with care</strong><span><ShieldCheck size={15} /> Privacy-first</span></div>
          </div>
          <div className="landing-footer__bottom"><span>© {new Date().getFullYear()} resumé. All rights reserved.</span><span>Built for ambitious candidates everywhere.</span></div>
        </div>
      </footer>
      </HeroMotion>
    </main>
  );
};

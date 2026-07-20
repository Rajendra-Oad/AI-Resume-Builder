import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <main className="not-found">
          <p className="eyebrow">UNEXPECTED ERROR</p>
          <h1>Something went wrong.</h1>
          <p className="muted">Refresh the page to continue.</p>
        </main>
      );
    }
    return this.props.children;
  }
}

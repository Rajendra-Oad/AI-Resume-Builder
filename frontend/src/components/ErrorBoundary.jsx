import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({ reset: this.reset });
      }

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

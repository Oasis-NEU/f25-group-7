import { Component } from 'react';
import { RefreshCw } from 'lucide-react';
import { OFFICIAL_SITE } from '../data/dineoncampus';

/**
 * Last line of defence: a rendering bug shows a way out instead of a blank
 * white page.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-ink-muted">
          This page hit an unexpected problem. Reloading usually fixes it. Menus are also on the{' '}
          <a href={OFFICIAL_SITE} className="font-semibold text-brand-text">official dining site</a>.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 font-semibold text-brand-ink"
        >
          <RefreshCw className="size-4" aria-hidden="true" /> Reload
        </button>
      </div>
    );
  }
}

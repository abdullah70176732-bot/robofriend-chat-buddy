import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

/**
 * App-wide error boundary. Renders a friendly recovery UI instead of a
 * blank white screen when a render or lifecycle error escapes a component.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mb-3 text-4xl" aria-hidden="true">🤖⚠️</div>
          <h1 className="text-lg font-bold">Circuits short-circuited</h1>
          <p className="mt-2 text-sm text-slate-300">
            Nexus hit an unexpected error. You can safely retry.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-black/40 p-2 text-left text-[10px] text-rose-300">
            {this.state.error.message}
          </pre>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={this.reset}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Try again
            </button>
            <button
              onClick={() => (typeof window !== "undefined" ? window.location.reload() : null)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
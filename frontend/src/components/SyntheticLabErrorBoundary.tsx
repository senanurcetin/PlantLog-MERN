import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    label: string;
    onChooseAnother?: () => void;
}
interface State {
    failed: boolean;
}

/**
 * A failed dynamic import is cached by the JavaScript module loader.
 * Resetting React alone cannot safely retry that URL; a complete reload
 * is the only offered retry, explicitly discarding temporary scenario data.
 * Other laboratory selections can still render without a page reload.
 */
export class SyntheticLabErrorBoundary extends Component<Props, State> {
    state: State = { failed: false };

    static getDerivedStateFromError(): State {
        return { failed: true };
    }

    componentDidCatch(_error: Error, _info: ErrorInfo): void {
        // No analytics, error payload transmission, production telemetry, or
        // sensitive exception details in the read-only public demo.
    }

    render() {
        if (!this.state.failed) return this.props.children;

        return (
            <section className="nexus-card rounded-xl border border-amber-300
                bg-amber-50 p-5 text-amber-950"
                aria-labelledby="synthetic-lab-unavailable-title">
                <h3 id="synthetic-lab-unavailable-title"
                    className="text-base font-bold">
                    Fictional laboratory unavailable
                </h3>
                <p className="mt-2 max-w-2xl text-sm" role="alert">
                    The selected laboratory could not be displayed.
                    Your other read-only summaries are unaffected.
                    No analysis was completed and no maintenance record
                    was created or verified.
                </p>
                <p className="mt-2 text-xs">
                    Selected laboratory: {this.props.label}.
                    You can open another laboratory, or reload this
                    demonstration to retry. Reloading clears temporary
                    scenario entries and experiment selections.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                    {this.props.onChooseAnother && (
                        <button type="button" onClick={this.props.onChooseAnother}
                            className="rounded-lg border border-amber-700 bg-white px-4 py-2
                                text-sm font-semibold text-amber-950
                                focus-visible:outline focus-visible:outline-2
                                focus-visible:outline-blue-700">
                            Open controlled comparisons
                        </button>
                    )}
                    <button type="button" onClick={() => window.location.reload()}
                        className="rounded-lg border border-blue-900 bg-[#061524] px-4 py-2
                            text-sm font-semibold text-white
                            focus-visible:outline focus-visible:outline-2
                            focus-visible:outline-blue-700">
                        Reload demo and clear temporary cases
                    </button>
                </div>
            </section>
        );
    }
}

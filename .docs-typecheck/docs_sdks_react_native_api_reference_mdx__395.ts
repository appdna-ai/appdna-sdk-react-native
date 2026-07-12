
type StepAdvanceResult =
  /** Continue to the next step normally. */
  | { type: 'proceed' }
  /** Continue and merge additional data into the session. */
  | { type: 'proceedWithData'; data: Record<string, unknown> }
  /** Block advancement and show an error message (red banner). */
  | { type: 'block'; message: string }
  /** Stay on the current step without advancing. Pass a non-null `message` to render a green success banner. */
  | { type: 'stay'; message?: string }
  /** Skip to a specific step by ID. */
  | { type: 'skipTo'; stepId: string }
  /** Skip to a specific step and merge additional data. */
  | { type: 'skipToWithData'; stepId: string; data: Record<string, unknown> };

export {};

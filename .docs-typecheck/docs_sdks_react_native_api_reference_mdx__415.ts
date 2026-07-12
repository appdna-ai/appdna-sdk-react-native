
interface StepConfigOverride {
  /** Pre-fill form fields. Keys match the field IDs configured in the Console. */
  fieldDefaults?: Record<string, unknown>;
  /** Override the step's title. */
  title?: string;
  /** Override the step's subtitle. */
  subtitle?: string;
  /** Override the primary CTA label. */
  ctaText?: string;
  /** Override layout-level config (alignment, spacing, theme tokens). */
  layoutOverrides?: Record<string, unknown>;
}

export {};

/**
 * Shared Mongoose field-definition helpers. `*Paise` fields across every
 * model reuse `paiseField` so the integer-paise invariant (ADR-001) is
 * enforced once, as defense-in-depth alongside the Zod schema at the action
 * boundary. See docs/DECISIONS.md ADR-012.
 */
export interface PaiseFieldOptions {
  /** Whether the field must be present. Default true. */
  required?: boolean;
  /** Default value, used only when `required` is false. */
  default?: number;
  /** Inclusive lower bound. Defaults to 0 unless `allowNegative` is set. */
  min?: number;
  /** When true and `min` is not given, no lower bound is enforced. */
  allowNegative?: boolean;
}

/**
 * A `Number` field that only ever accepts a safe-integer paise amount.
 * Deliberately untyped return (not `SchemaDefinitionProperty<number>`):
 * Mongoose infers a different, incompatible `SchemaDefinitionProperty`
 * instantiation per call site (untyped `new Schema({...})` vs. `new
 * Schema<XDoc>({...})`), and a fixed generic here isn't assignable to both.
 */
export function paiseField(options: PaiseFieldOptions = {}) {
  const { required = true, default: defaultValue, min, allowNegative = false } = options;
  const resolvedMin = min ?? (allowNegative ? undefined : 0);

  return {
    type: Number,
    required,
    ...(required ? {} : { default: defaultValue }),
    validate: {
      validator: (value: number) =>
        value == null ||
        (Number.isSafeInteger(value) && (resolvedMin === undefined || value >= resolvedMin)),
      message: (props: { path: string; value: number }) =>
        `${props.path} must be a safe integer${
          resolvedMin !== undefined ? ` >= ${resolvedMin}` : ""
        } (got ${props.value})`,
    },
  };
}

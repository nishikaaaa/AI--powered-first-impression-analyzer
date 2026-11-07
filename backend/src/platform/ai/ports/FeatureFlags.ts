export interface FeatureFlags {
  isEnabled(flag: string, context?: { userId?: string }): boolean;
}

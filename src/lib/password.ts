export const passwordRules = [
  { label: "6 or more characters", test: (value: string) => value.length >= 6 },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One digit", test: (value: string) => /[0-9]/.test(value) },
  { label: "One special character", test: (value: string) => /[^a-zA-Z0-9\s]/.test(value) },
];

export function validPassword(value: string) {
  return passwordRules.every((rule) => rule.test(value));
}
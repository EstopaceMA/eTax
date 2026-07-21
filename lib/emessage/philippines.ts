export function normalizePhilippineMobileNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("639") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("09") && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }

  if (digits.startsWith("9") && digits.length === 10) {
    return `+63${digits}`;
  }

  return null;
}

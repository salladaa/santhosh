import type { PatientInput } from "./types";
export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function validatePatient(
  value: unknown,
  creating: boolean,
): PatientInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Enter valid patient information.");
  const data = value as Record<string, unknown>;
  function field(key: string, max: number, required = false) {
    const raw = data[key];
    if (typeof raw !== "string") throw new InputError(`Enter a valid ${key}.`);
    const text = raw.trim();
    if ((required && !text) || text.length > max)
      throw new InputError(`Check ${key}; maximum ${max} characters.`);
    return text;
  }
  const name = field("name", 100, true),
    email = field("email", 254, true).toLowerCase(),
    phone = field("phone", 30, true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new InputError("Enter a valid email address.");
  if (!/^[+\d() .-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7)
    throw new InputError("Enter a phone number with at least 7 digits.");
  if (
    typeof data.age !== "number" ||
    !Number.isInteger(data.age) ||
    data.age < 0 ||
    data.age > 120
  )
    throw new InputError("Age must be a whole number from 0 to 120.");
  if (
    typeof data.billAmount !== "number" ||
    !Number.isFinite(data.billAmount) ||
    data.billAmount < 0 ||
    data.billAmount > 10000000 ||
    Math.abs(data.billAmount * 100 - Math.round(data.billAmount * 100)) >
      0.00001
  )
    throw new InputError(
      "Enter an amount from 0 to 10,000,000 with up to two decimal places.",
    );
  if (data.billStatus !== "Paid" && data.billStatus !== "Pending")
    throw new InputError("Choose a valid payment status.");
  if (
    !["Scheduled", "Completed", "Cancelled"].includes(
      String(data.appointmentStatus),
    )
  )
    throw new InputError("Choose a valid appointment status.");
  const nextCheckup = field("nextCheckup", 10);
  if (
    nextCheckup &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(nextCheckup) ||
      !Number.isFinite(Date.parse(nextCheckup)) ||
      new Date(nextCheckup).toISOString().slice(0, 10) !== nextCheckup)
  )
    throw new InputError("Choose a valid checkup date.");
  function list(key: string) {
    const items = data[key];
    if (
      !Array.isArray(items) ||
      items.length > 50 ||
      items.some((v) => typeof v !== "string" || v.length > 200)
    )
      throw new InputError(`Use up to 50 ${key}, each under 200 characters.`);
    return [
      ...new Set((items as string[]).map((v) => v.trim()).filter(Boolean)),
    ];
  }
  const password = data.password;
  if (password !== undefined && typeof password !== "string")
    throw new InputError("Enter a valid password.");
  if (
    (creating || password) &&
    (typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128)
  )
    throw new InputError("Use a password between 12 and 128 characters.");
  if (
    !creating &&
    (!Number.isInteger(data.version) || Number(data.version) < 1)
  )
    throw new InputError("Reload this record before saving.");
  const optional = (key: string, max: number) =>
    data[key] === undefined ? "" : field(key, max);
  const dateOfBirth = optional("dateOfBirth", 10),
    address = optional("address", 1000),
    emergencyContact = optional("emergencyContact", 200),
    allergies = optional("allergies", 1000);
  if (
    dateOfBirth &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
      !Number.isFinite(Date.parse(dateOfBirth)) ||
      new Date(dateOfBirth).toISOString().slice(0, 10) !== dateOfBirth ||
      Date.parse(dateOfBirth) > Date.now())
  )
    throw new InputError("Enter a valid past date of birth.");
  return {
    dateOfBirth,
    address,
    emergencyContact,
    allergies,
    name,
    age: data.age,
    phone,
    email,
    medicines: list("medicines"),
    reports: list("reports"),
    billAmount: data.billAmount,
    billStatus: data.billStatus,
    treatment: field("treatment", 2000),
    nextCheckup,
    appointmentStatus:
      data.appointmentStatus as PatientInput["appointmentStatus"],
    password: password as string | undefined,
    version: data.version as number | undefined,
  };
}

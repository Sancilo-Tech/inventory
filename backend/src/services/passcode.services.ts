import crypto from "crypto";

interface PasswordOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

export function generatePassword({
  length = 8,
  uppercase = true,
  lowercase = true,
  numbers = true,
  symbols = true,
}: PasswordOptions = {}): string {
  let charset = "";

  if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
  if (numbers) charset += "0123456789";
  if (symbols) charset += "@$_";

  if (!charset) {
    throw new Error("At least one character type must be enabled");
  }

  const randomBytes = crypto.randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

export const vercelProtectionHeaders = (
  secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
) => {
  const value = secret?.trim();
  return value
    ? {
        "x-vercel-protection-bypass": value,
        "x-vercel-set-bypass-cookie": "true",
      }
    : undefined;
};

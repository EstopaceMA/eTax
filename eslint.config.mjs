import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  // macOS writes AppleDouble sidecars ("._foo.ts") on the ExFAT volume this
  // repo lives on. They are not source and are not parseable.
  { ignores: ["**/._*"] },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;

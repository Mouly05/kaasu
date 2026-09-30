import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// `vitest.config.mts` doesn't enable `test.globals`, so Testing Library's
// auto-cleanup (which relies on a global `afterEach`) never registers itself.
afterEach(() => {
  cleanup();
});

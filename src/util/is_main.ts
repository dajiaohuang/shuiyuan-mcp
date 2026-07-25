import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Determine whether an ES module is the process entrypoint.
 *
 * npm uses symlinks for package binaries on Unix. Comparing import.meta.url
 * directly with process.argv[1] therefore fails even when the module is the
 * entrypoint. Resolving both paths preserves direct execution on Windows while
 * also supporting Unix npm/pnpm bin links.
 */
export function isMainModule(moduleUrl: string, argv1 = process.argv[1]): boolean {
  if (!argv1) return false;

  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}

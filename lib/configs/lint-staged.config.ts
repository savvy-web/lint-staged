/**
 * lint-staged configuration - dogfooding our own package.
 *
 * @remarks
 * This file is excluded from typecheck in tsconfig.json because it imports
 * from dist/dev/ which only exists after build. The file works at runtime
 * when the pre-commit hook executes.
 */
import { Preset } from "../../dist/dev/index.js";

export default Preset.silk();

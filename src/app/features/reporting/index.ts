/**
 * Public API of the reusable reporting module.
 *
 * Import the viewer + `defineReport` from here to build a report:
 * ```ts
 * import { ReportViewerComponent, defineReport, ReportConfig } from '@app/features/reporting';
 * ```
 */
export * from './models';
export * from './services';
export * from './components';
// Utilities are exported for advanced/custom use (custom exporters, tests).
export * from './utilities';

import type { ViewId } from '../../shared/protocol.js';
import { glossaryView } from './glossary/glossary-view.js';
import type { DomainView } from './types.js';

export const views: Record<ViewId, DomainView> = {
  glossary: glossaryView,
};

export type { DomainView, ViewContext, DisplayMode } from './types.js';

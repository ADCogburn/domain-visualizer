import type { ViewId } from '../../shared/protocol.js';
import { adrView } from './adr/adr-view.js';
import { glossaryView } from './glossary/glossary-view.js';
import { homeView } from './home/home-view.js';
import type { DomainView } from './types.js';

export const views: Record<ViewId, DomainView> = {
  home: homeView,
  glossary: glossaryView,
  adr: adrView,
};

export type { DomainView, ViewContext, DisplayMode, Route, NavigateOptions } from './types.js';

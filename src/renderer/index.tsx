import { RendererConfig } from 'coulomb/config/renderer';
import { renderApp } from 'coulomb/app/renderer';
import { conf as appConf, availableLanguages, defaultLanguage } from '../app';


export const conf: RendererConfig<typeof appConf> = {
  app: appConf,

  windowComponents: {
    default: () => import('./home'),
    batchCommit: () => import('./batch-commit'),
    settings: () => import('coulomb/settings/renderer'),
  },

  databaseStatusComponents: {
    default: () => import('coulomb/db/isogit-yaml/renderer/status'),
  },

  contextProviders: [{
    cls: () => import('coulomb/localizer/renderer/context-provider'),
    getProps: () => ({
      available: availableLanguages,
      selected: defaultLanguage,
      default: defaultLanguage,
      // NOTE: Default language is treated as authoritative language.
      // TODO: Support more than one authoritative language.
    }),
  }],
};


export const app = renderApp(conf);
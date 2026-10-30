/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/../features/heritage-app/usePlayback`; params?: Router.UnknownInputParams; } | { pathname: `/../features/heritage-app/quizData`; params?: Router.UnknownInputParams; } | { pathname: `/../features/heritage-app/podcastApi`; params?: Router.UnknownInputParams; } | { pathname: `/../lib/session`; params?: Router.UnknownInputParams; } | { pathname: `/../lib/authStore`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/../features/heritage-app/usePlayback`; params?: Router.UnknownOutputParams; } | { pathname: `/../features/heritage-app/quizData`; params?: Router.UnknownOutputParams; } | { pathname: `/../features/heritage-app/podcastApi`; params?: Router.UnknownOutputParams; } | { pathname: `/../lib/session`; params?: Router.UnknownOutputParams; } | { pathname: `/../lib/authStore`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/${`?${string}` | `#${string}` | ''}` | `/../features/heritage-app/usePlayback${`?${string}` | `#${string}` | ''}` | `/../features/heritage-app/quizData${`?${string}` | `#${string}` | ''}` | `/../features/heritage-app/podcastApi${`?${string}` | `#${string}` | ''}` | `/../lib/session${`?${string}` | `#${string}` | ''}` | `/../lib/authStore${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString | Router.ExternalPathString | `/` | `/../features/heritage-app/usePlayback` | `/../features/heritage-app/quizData` | `/../features/heritage-app/podcastApi` | `/../lib/session` | `/../lib/authStore` | `/_sitemap`; params?: Router.UnknownInputParams; };
    }
  }
}

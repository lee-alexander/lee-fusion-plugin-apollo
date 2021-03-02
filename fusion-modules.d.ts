declare module 'fusion-core' {
  import {
    ParameterizedContext as KoaContext,
    DefaultState,
    DefaultContext,
  } from 'koa';
  import { ReactNode } from 'react';

  export type Token<T> = {
    (): T;
    optional: Token<void | T>;
    stacks: Array<{
      type:
        | 'token'
        | 'plugin'
        | 'register'
        | 'enhance'
        | 'alias-from'
        | 'alias-to';
      stack: string;
    }>;
  };

  export function assetUrl(path: string): string;

  type ExtendedKoaContext<TState> = KoaContext<TState, DefaultContext> & {
    memoized: Map<Record<string, any>, unknown>;
  };
  type SanitizedHTMLWrapper = Record<string, any>;

  export type SSRContext<TState = DefaultState> = {
    element: ReactNode | null;
    template: {
      htmlAttrs: Record<string, any>;
      title: string;
      head: Array<SanitizedHTMLWrapper>;
      body: Array<SanitizedHTMLWrapper>;
      bodyAttrs: {[attr: string]: string};
    };
  } & ExtendedKoaContext<TState>;

  export type Context<TState = DefaultState> =
    | SSRContext<TState>
    | ExtendedKoaContext<TState>;

  export type Render = any;

  type Middleware = (
    ctx: Context,
    next: () => Promise<void>
  ) => Promise<unknown>;

  type MapDeps<Deps> = {
    [P in keyof Deps]: Deps[P] extends Token<infer V> ? V : never;
  };

  export const html: any;
  export const unescape: any;
  export const RouteTagsToken: Token<any>;

  interface FusionPlugin<Deps, Service> {
    __plugin__: boolean;
    stack: string;
    deps?: Deps;
    provides: (Deps: MapDeps<Deps>) => Service;
    middleware?: (Deps: MapDeps<Deps & {}>, Service: Service) => Middleware;
    cleanup?: (service: Service) => Promise<void>;
  }

  export type TokenServiceType<TToken> = TToken extends Token<infer V>
    ? V
    : never;

  export type ServiceType<TPlugin> = TPlugin extends FusionPlugin<
    infer Deps,
    infer Service
  >
    ? Service
    : never;

  type FusionPluginNoHidden<TDeps, TService> = Omit<
    Omit<FusionPlugin<TDeps, TService>, '__plugin__'>,
    'stack'
  >;

  export function createPlugin<TDeps, TService>(
    opts: FusionPluginNoHidden<TDeps, TService>
  ): FusionPlugin<TDeps, TService>;

  export function createToken<TResolvedType>(
    name: string
  ): Token<TResolvedType>;

  export type SSRDecider = (ctx: Context) => boolean;
  export const SSRDeciderToken: Token<SSRDecider>;
  export const RenderToken: Token<any>;
}
declare module 'fusion-tokens' {
  import {Context, Token} from 'fusion-core';

  interface Session {
    set: <T>(key: string, value: T) => T;
    get: <T>(key: string) => T;
  }
  export const SessionToken: Token<{from: (ctx: Context) => Session}>;
  export const FetchToken: Token<any>;
  export const LoggerToken: Token<any>;
  export type Logger = any;
}
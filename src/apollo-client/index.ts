import {createPlugin, createToken} from 'fusion-core';
import {FetchToken} from 'fusion-tokens';
import {
  GraphQLSchemaToken,
  GraphQLEndpointToken,
  InitApolloClientType,
} from '../tokens';
import { ApolloClient, ApolloCache, ApolloClientOptions, InMemoryCache } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import { HttpLink } from '@apollo/client/link/http';
import { ApolloLink, from as apolloLinkFrom } from '@apollo/client/link/core';
import {DocumentNode} from 'graphql';
import {Context, FusionPlugin, Token} from 'fusion-core';

declare let __NODE__: boolean;
declare let __BROWSER__: boolean;
declare let __DEV__: boolean;

export const GetApolloClientCacheToken: Token<
  (ctx: Context) => ApolloCache<any>
> = createToken('GetApolloClientCacheToken');

export const ApolloClientCredentialsToken: Token<string> = createToken(
  'ApolloClientCredentialsToken'
);

export const ApolloClientDefaultOptionsToken: Token<
  Pick<ApolloClientOptions<any>, 'defaultOptions'>
> = createToken('ApolloClientDefaultOptionsToken');

export const GetApolloClientLinksToken: Token<
  (arr: ApolloLink[], ctx: Context) => ApolloLink[]
> = createToken('GetApolloClientLinksToken');

export const ApolloClientResolversToken: Token<
  ResolverMapType | ResolverMapType[]
> = createToken('ApolloClientResolversToken');

export const ApolloClientLocalSchemaToken: Token<
  string | string[] | DocumentNode | DocumentNode[]
> = createToken('ApolloClientLocalSchemaToken');

type ResolverMapType = {
  [key: string]: {
    [field: string]: (
      rootValue?: any,
      args?: any,
      context?: any,
      info?: any
    ) => any,
  },
};

type ApolloClientDepsType = {
  getCache: typeof GetApolloClientCacheToken.optional,
  endpoint: typeof GraphQLEndpointToken.optional,
  fetch: typeof FetchToken.optional,
  includeCredentials: typeof ApolloClientCredentialsToken.optional,
  getApolloLinks: typeof GetApolloClientLinksToken.optional,
  typeDefs: typeof ApolloClientLocalSchemaToken.optional,
  schema: typeof GraphQLSchemaToken.optional,
  resolvers: typeof ApolloClientResolversToken.optional,
  defaultOptions: typeof ApolloClientDefaultOptionsToken.optional,
};

function Container() {}

const ApolloClientPlugin: FusionPlugin<
  ApolloClientDepsType,
  InitApolloClientType<any>
> = createPlugin({
  deps: {
    getCache: GetApolloClientCacheToken.optional,
    endpoint: GraphQLEndpointToken.optional,
    fetch: __NODE__ ? FetchToken.optional : FetchToken,
    includeCredentials: ApolloClientCredentialsToken.optional,
    getApolloLinks: GetApolloClientLinksToken.optional,
    typeDefs: ApolloClientLocalSchemaToken.optional,
    schema: GraphQLSchemaToken.optional,
    resolvers: ApolloClientResolversToken.optional,
    defaultOptions: ApolloClientDefaultOptionsToken.optional,
  },
  provides({
    getCache = ctx =>
      // don't automatically add typename when handling POST requests via the executor. This saves size on the response
      new InMemoryCache({
        addTypename: ctx.method === 'POST' ? false : true,
      }),
    endpoint = '/graphql',
    fetch,
    includeCredentials = 'same-origin',
    getApolloLinks,
    typeDefs,
    schema,
    resolvers,
    defaultOptions,
  }) {
    function getClient(ctx, initialState) {
      const cache = getCache(ctx);
      const connectionLink =
        schema && __NODE__
          ? new SchemaLink({
              schema,
              context: ctx,
            })
          : new HttpLink({
              uri: endpoint,
              credentials: includeCredentials,
              fetch,
            });

      const links: ApolloLink[] = getApolloLinks
        ? getApolloLinks([connectionLink], ctx)
        : [connectionLink];

      const client = new ApolloClient({
        ssrMode: __NODE__,
        connectToDevTools: __BROWSER__ && __DEV__,
        link: apolloLinkFrom(links),
        cache: cache.restore(initialState),
        resolvers: resolvers as any,
        typeDefs: typeDefs as any,
        defaultOptions: defaultOptions as any,
      });
      return client;
    }

    return ((ctx: Context, initialState) => {
      if (ctx.memoized.has(Container)) {
        return ctx.memoized.get(Container);
      }
      const client = getClient(ctx, initialState);
      ctx.memoized.set(Container, client);
      return client;
    }) as InitApolloClientType<any>;
  },
});

export {ApolloClientPlugin};

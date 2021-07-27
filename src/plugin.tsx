import React from 'react';
import {createPlugin, html, unescape, RouteTagsToken} from 'fusion-core';
import {ApolloProvider} from '@apollo/client';
import {Context, Render} from 'fusion-core';
import serverRender from './server';
import {LoggerToken} from 'fusion-tokens';
import {ApolloServer} from 'apollo-server-koa';
import compose from 'koa-compose';
import {
  GetDataFromTreeToken,
  GraphQLSchemaToken,
  GraphQLEndpointToken,
  ApolloClientToken,
  ApolloBodyParserConfigToken,
  ApolloDefaultOptionsConfigToken,
} from './tokens';
import {graphqlUploadKoa} from 'graphql-upload';

export type DepsType = {
  RouteTags: typeof RouteTagsToken;
  logger: typeof LoggerToken.optional;
  schema: typeof GraphQLSchemaToken.optional;
  endpoint: typeof GraphQLEndpointToken.optional;
  getApolloClient: typeof ApolloClientToken;
  getDataFromTree: typeof GetDataFromTreeToken.optional;
  bodyParserConfig: typeof ApolloBodyParserConfigToken.optional;
  defaultOptionsConfig: typeof ApolloDefaultOptionsConfigToken.optional;
};

declare let __NODE__: boolean;
declare let __BROWSER__: boolean;

export type ProvidesType = (el: any, ctx: Context) => Promise<any>;

function getDeps(): DepsType {
  if (__NODE__) {
    return {
      RouteTags: RouteTagsToken,
      logger: LoggerToken.optional,
      schema: GraphQLSchemaToken.optional,
      endpoint: GraphQLEndpointToken.optional,
      getApolloClient: ApolloClientToken,
      getDataFromTree: GetDataFromTreeToken.optional,
      bodyParserConfig: ApolloBodyParserConfigToken.optional,
      defaultOptionsConfig: ApolloDefaultOptionsConfigToken.optional,
    };
  }
  return {
    getApolloClient: ApolloClientToken,
  } as any;
}

export default (renderFn: Render) =>
  createPlugin<DepsType, ProvidesType>({
    deps: getDeps(),
    provides(deps) {
      if (__BROWSER__) {
        return renderFn;
      }
      return (el, ctx) => {
        return serverRender(el, deps.logger, deps.getDataFromTree).then(() => {
          return renderFn(el, ctx);
        });
      };
    },
    middleware({
      RouteTags,
      logger,
      schema,
      endpoint = '/graphql',
      getApolloClient,
      bodyParserConfig = {},
      defaultOptionsConfig = {},
    }) {
      const renderMiddleware = async (ctx: Context, next: () => Promise<void>) => {
        if (!ctx.element) {
          return next();
        }
        let initialState = null;
        if (__BROWSER__) {
          // Deserialize initial state for the browser
          const apolloState = document.getElementById('__APOLLO_STATE__');
          if (apolloState) {
            initialState = JSON.parse(unescape(apolloState.textContent));
          }
        }
        // Create the client and apollo provider
        const client = getApolloClient(ctx, initialState);
        ctx.element = <ApolloProvider client={client}>{ctx.element}</ApolloProvider>;

        await next();

        if (__NODE__) {
          // Serialize state into html on server side render
          const initialState = client.cache && client.cache.extract();
          const serialized = JSON.stringify(initialState);
          // eslint-disable-next-line prettier/prettier
          const script = html`
            <script type="application/json" id="__APOLLO_STATE__">
              ${String(serialized)}
            </script>
          `;
          ctx.template.body.push(script);
        }
      };
      if (__NODE__ && schema) {
        async function createApolloMiddleware() {
          const server = new ApolloServer({
            formatError: error => {
              logger && logger.error(error.message, error);
              return error;
            },
            ...defaultOptionsConfig,
            schema,
            // investigate other options
            context: ({ctx}) => {
              return ctx as any;
            },
            executor: async requestContext => {
              const fusionCtx = requestContext.context as Context;
              const routeTags = RouteTags.from(fusionCtx);
              routeTags.name = 'graphql';
              const client = getApolloClient(fusionCtx, {});
              const queryObservable = (client as any).queryManager.getObservableFromLink(
                requestContext.document,
                fusionCtx,
                requestContext.request.variables
              );
              return new Promise((resolve, reject) => {
                queryObservable.subscribe({
                  next(x) {
                    resolve(x);
                  },
                  error(err) {
                    reject(err);
                  },
                });
              });
            },
          });
          await server.start();
          return server.getMiddleware({
            path: endpoint,
            bodyParserConfig: bodyParserConfig as any,
          });
        }

        let apolloMiddleware: (ctx: Context, next: () => Promise<void>) => Promise<void>;

        return compose([
          graphqlUploadKoa(),
          async (ctx: Context, next) => {
            apolloMiddleware = apolloMiddleware ?? (await createApolloMiddleware());
            return await apolloMiddleware(ctx, next);
          },
          renderMiddleware,
        ]) as any;
      } else {
        return renderMiddleware;
      }
    },
  });

import {createToken, Context, Token} from 'fusion-core';
import {ApolloClient} from '@apollo/client';
import { GraphQLOptions } from 'apollo-server-koa';

export type InitApolloClientType<TInitialState> = (
  ctx: Context,
  initialState: TInitialState
) => ApolloClient<TInitialState>;

export const GraphQLSchemaToken: Token<any> = createToken('GraphQlSchemaToken');

export type ApolloContext<T> = (ctx: Context) => T | T;

export const GraphQLEndpointToken: Token<string> = createToken(
  'GraphQLEndpointToken'
);

export const ApolloClientToken: Token<
  InitApolloClientType<any>
> = createToken('ApolloClientToken');

export const GetDataFromTreeToken: Token<any> = createToken(
  'GetDataFromTreeToken'
);

type BodyParserConfigType = {
  enableTypes?: Array<string>,
  encoding?: string,
  formLimit?: string,
  jsonLimit?: string,
  textLimit?: string,
  strict?: boolean,
  detectJSON?: (ctx: Context) => boolean,
  extendTypes?: any,
  onerror?: (err: any, ctx: Context) => any,
  disableBodyParser?: (ctx: Context, next: () => Promise<any>) => Promise<any>,
};
export const ApolloBodyParserConfigToken: Token<BodyParserConfigType> = createToken(
  'ApolloBodyParserConfigToken'
);

export const ApolloDefaultOptionsConfigToken: Token<GraphQLOptions> = createToken(
  'ApolloDefaultOptionsConfigToken'
);

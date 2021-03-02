import {DocumentNode} from 'graphql';
import ApolloRenderEnhancer from './plugin';

export * from './tokens.js';
export * from './apollo-client/index.js';

export {ApolloRenderEnhancer};

export function gql(path: string): DocumentNode {
  throw new Error('fusion-plugin-apollo/gql should be replaced at build time');
}

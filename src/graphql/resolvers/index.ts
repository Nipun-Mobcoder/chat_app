import messageResolver from './messageResolver.js';
import authResolver from './authResolver.js';
import { GraphQLUpload } from 'graphql-upload-ts';
import multiFileResolver from './multiFileResolver.js';
import curResolver from './curResolver.js';

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    ...messageResolver.Query,
    ...authResolver.Query,
    ...multiFileResolver.Query,
    ...curResolver.Query
  },
  Mutation: {
    ...messageResolver.Mutation,
    ...authResolver.Mutation
  },
  Subscription: {
    ...messageResolver.Subscription,
  },
};

export default resolvers;
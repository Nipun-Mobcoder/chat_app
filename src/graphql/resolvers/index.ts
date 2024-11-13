import messageResolver from './messageResolver.js';
import authResolver from './authResolver.js';
import { GraphQLUpload } from 'graphql-upload-ts';
import multiFileResolver from './multiFileResolver.js';
import curResolver from './curResolver.js';
import decryptResolver from './decryptResolver.js';
import statusResolver from './statusResolver.js';

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    ...messageResolver.Query,
    ...authResolver.Query,
    ...multiFileResolver.Query,
    ...curResolver.Query,
    ...decryptResolver.Query,
    ...statusResolver.Query
  },
  Mutation: {
    ...messageResolver.Mutation,
    ...authResolver.Mutation
  },
  Subscription: {
    ...messageResolver.Subscription,
    ...statusResolver.Subscription
  },
};

export default resolvers;
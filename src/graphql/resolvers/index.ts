import messageResolver from './messageResolver.js';
import authResolver from './authResolver.js';
import { GraphQLUpload } from 'graphql-upload-ts';

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    ...messageResolver.Query,
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

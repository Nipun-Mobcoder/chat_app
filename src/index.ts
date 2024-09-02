import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

let messages = [];

const typeDefs = `
        type Query {
            messages: [String]
        }

        type Mutation {
            sendMessage(nickname: String!, message: String!): Boolean
        }
`;

const resolvers = {
  Query: {
      messages: () => {
          return messages;
      },
  },
  Mutation: {
      sendMessage: (parent, { nickname, message }) => {
          messages.push(`${nickname}: ${message}`);
          return true;
      },
  },
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Server ready at: ${url}`);

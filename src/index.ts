import { ApolloServer } from '@apollo/server';
import { PubSub } from 'graphql-subscriptions';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';

const app = express();

const httpServer = http.createServer(app);

const pubsub = new PubSub();

let messages = [];

const typeDefs = `
        type Query {
            messages: [String]
        }

        type Mutation {
            sendMessage(nickname: String!, message: String!): Boolean
        }

        type Subscription {
            messageAdded: String
        }
    `
;

const resolvers = {
  Query: {
      messages: () => {
          return messages;
      },
  },
  Mutation: {
      sendMessage: (parent, { nickname, message }) => {
        const newMessage = `${nickname}: ${message}`;
        messages.push(newMessage);
        pubsub.publish('MESSAGE_ADDED', { messageAdded: newMessage });
        return true;
      },
  },
  Subscription: {
    messageAdded: {
        subscribe: () => pubsub.asyncIterator(['MESSAGE_ADDED']),
      },
  }
};

const schema = makeExecutableSchema({ typeDefs, resolvers })

const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

await server.start();

const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/',
    });
    
useServer({ schema }, wsServer);

app.use(
    '/',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.token }),
    }),
  );
  
httpServer.listen(4000, () => {
    console.log("Server ready at http://localhost:4000");
});

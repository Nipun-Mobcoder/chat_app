import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import dotenv from 'dotenv';
import { graphqlUploadExpress } from 'graphql-upload-ts';

import typeDefs from './graphql/typedef.js';
import resolvers from './graphql/resolvers/index.js';
import connectDB from './config/db.js';
import { getUserFromToken } from './utils/jwt.js';
import pubsub from './utils/pubsub.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
var activeUsers = [];

app.use(express.json());

const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer({
  typeDefs,
  resolvers,
  csrfPrevention: true,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await server.start();

app.use(
  '/graphql',
  cors<cors.CorsRequest>(),
  express.json(),
  graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
  expressMiddleware(server, {
    context: async ({ req }) => ({ token: req.headers.token }),
  }),
);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

useServer({
  schema,
  onDisconnect: async (context) => {
    const { connectionParams } = context;
    const token = connectionParams?.token as string;

    if(token) {
      try {
        const user = await getUserFromToken(token);
  
        const isActive = false;
        const existingUserIndex = activeUsers.findIndex((u) => u.to === user.id);
  
        if (existingUserIndex > -1) {
          activeUsers[existingUserIndex].isActive = isActive;
        } else {
          activeUsers.push({ to: user.id, isActive });
        }
  
        pubsub.publish('isActive', { showStatus: activeUsers });
      } catch (e) {
        throw new Error(e?.message ?? "Something went wrong.")
      }
    }
  },
}, wsServer);


connectDB();
httpServer.listen(5000, () => {
  console.log("Server ready at http://localhost:5000/graphql");
});

export default activeUsers;
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

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

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
useServer({ schema }, wsServer);

// Connect to the database and start the server
connectDB();
httpServer.listen(4000, () => {
  console.log("Server ready at http://localhost:4000");
});

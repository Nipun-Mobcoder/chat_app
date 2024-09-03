import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import mongoose from 'mongoose';
import jwt from "jsonwebtoken"
import User from "./models/User.js"
import resolvers from './resolver.js';
import typeDefs from './typedef.js';

const app = express();

const httpServer = http.createServer(app);

app.use(express.json())

const uri = "mongodb+srv://nipunbhardwaj:E4K1qtXWLFY4w117@chatcluster.cqlok.mongodb.net/?retryWrites=true&w=majority&appName=chatCluster";
const jwtSecret = "fasefraw4r5r3wq45wdfgw34twdfg";

const schema = makeExecutableSchema({ typeDefs, resolvers })

const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

await server.start();

const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
    });
    
useServer({ schema }, wsServer);

app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.token }),
    }),
  );

  app.post("/register", async (req,res) => {
    await mongoose.connect(uri);
    const {userName, email, password} = req.body;

    try {
        const userDoc = await User.create({
          userName,
          email,
          password
        });
        res.json(userDoc);
      } catch (e) {
        res.status(422).json(e);
      }
  })

  app.post("/login", async (req, res) => {
    mongoose.connect(uri);
    const { email, password } = req.body;
    const userDoc = await User.findOne({ email });
    if (userDoc) {
      if (password === userDoc.password) {
        jwt.sign(
          {
            email: userDoc.email,
            id: userDoc._id,
          },
          jwtSecret,
          {},
          (err, token) => {
            if (err) throw err;
            res.json(token);
            console.log(token);
          }
        );
      } else {
        res.status(422).json("pass not ok");
      }
    } else {
      res.status(404).json("not found");
    }
  });
  
httpServer.listen(4000, () => {
    console.log("Server ready at http://localhost:4000");
});
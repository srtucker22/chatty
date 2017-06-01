import { ApolloServer } from 'apollo-server';
import jwt from 'express-jwt';

import { typeDefs } from './data/schema';
import { mocks } from './data/mocks';
import { resolvers } from './data/resolvers';
import { JWT_SECRET } from './config';
import { User } from './data/connectors';

const PORT = 8080;

const server = new ApolloServer({
  resolvers,
  typeDefs,
  // mocks,
  context: ({ req, res, connection }) => {
    // web socket subscriptions will return a connection
    if (connection) {
      // check connection for metadata
      return {};
    }

    const user = new Promise((resolve, reject) => {
      jwt({
        secret: JWT_SECRET,
        credentialsRequired: false,
      })(req, res, (e) => {
        if (req.user) {
          resolve(User.findOne({ where: { id: req.user.id, version: req.user.version } }));
        } else {
          resolve(null);
        }
      });
    });
    return {
      user,
    };
  },
});

server.listen({ port: PORT }).then(({ url }) => console.log(`🚀 Server ready at ${url}`));

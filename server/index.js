import express from 'express';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import jwt from 'express-jwt';
import jsonwebtoken from 'jsonwebtoken';

import { JWT_SECRET } from './config';
import { User } from './data/connectors';
import { getSubscriptionDetails } from './subscriptions'; // make sure this imports before executableSchema!
import { executableSchema } from './data/schema';
import { subscriptionLogic } from './data/logic';

const GRAPHQL_PORT = 8080;
const GRAPHQL_PATH = '/graphql';
const SUBSCRIPTIONS_PATH = '/subscriptions';

const app = express();

// `context` must be an object and can't be undefined when using connectors
app.use('/graphql', bodyParser.json(), jwt({
  secret: JWT_SECRET,
  credentialsRequired: false,
}), graphqlExpress(req => ({
  schema: executableSchema,
  context: {
    user: req.user ?
      User.findOne({ where: { id: req.user.id, version: req.user.version } }) :
      Promise.resolve(null),
  },
})));

app.use('/graphiql', graphiqlExpress({
  endpointURL: GRAPHQL_PATH,
  subscriptionsEndpoint: `ws://localhost:${GRAPHQL_PORT}${SUBSCRIPTIONS_PATH}`,
}));

const graphQLServer = createServer(app);

graphQLServer.listen(GRAPHQL_PORT, () => {
  console.log(`GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}${GRAPHQL_PATH}`);
  console.log(`GraphQL Subscriptions are now running on ws://localhost:${GRAPHQL_PORT}${SUBSCRIPTIONS_PATH}`);
});

// eslint-disable-next-line no-unused-vars
const subscriptionServer = SubscriptionServer.create({
  schema: executableSchema,
  execute,
  subscribe,
  onConnect(connectionParams, webSocket) {
    const userPromise = new Promise((res, rej) => {
      if (connectionParams.jwt) {
        jsonwebtoken.verify(connectionParams.jwt, JWT_SECRET,
        (err, decoded) => {
          if (err) {
            rej('Invalid Token');
          }

          res(User.findOne({ where: { id: decoded.id, version: decoded.version } }));
        });
      } else {
        rej('No Token');
      }
    });

    return userPromise.then((user) => {
      if (user) {
        return { user: Promise.resolve(user) };
      }

      return Promise.reject('No User');
    });
  },
  onOperation(parsedMessage, baseParams) {
    // we need to implement this!!!
    const { subscriptionName, args } = getSubscriptionDetails({
      baseParams,
      schema: executableSchema,
    });

    // we need to implement this too!!!
    return subscriptionLogic[subscriptionName](baseParams, args, baseParams.context);
  },
}, {
  server: graphQLServer,
  path: SUBSCRIPTIONS_PATH,
});

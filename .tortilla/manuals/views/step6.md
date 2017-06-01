# Step 6: GraphQL Subscriptions

This is the fifth blog in a multipart series where we will be building Chatty, a WhatsApp clone, using [React Native](https://facebook.github.io/react-native/) and [Apollo](http://dev.apollodata.com/).

In this tutorial, we’ll focus on adding [GraphQL Subscriptions](http://graphql.org/blog/subscriptions-in-graphql-and-relay/), which will give our app real-time instant messaging capabilities!

Here’s what we will accomplish in this tutorial:
1. Introduce Event-based Subscriptions
2. Build server-side infrastructure to handle **GraphQL Subscriptions** via WebSockets
3. Design GraphQL Subscriptions and add them to our GraphQL Schemas and Resolvers
4. Build client-side infrastructure to handle GraphQL Subscriptions via WebSockets
5. Subscribe to GraphQL Subscriptions on our React Native client and handle real-time updates

# Event-based Subscriptions
Real-time capable apps need a way to be pushed data from the server. In some real-time architectures, all data is considered live data, and anytime data changes on the server, it’s pushed through a WebSocket or long-polling and updated on the client. While this sort of architecture means we can expect data to update on the client without writing extra code, it starts to get tricky and non-performant as apps scale. For one thing, you don’t need to keep track of every last bit of data if it’s not relevant to the user. Moreover, it’s not obvious what changes to data should trigger an event, what that event should look like, and how our clients should react.

With an event-based subscription model in GraphQL — much like with queries and mutations — a client can tell the server exactly what data it wants to be pushed and what that data should look like. This leads to fewer events tracked on the server and pushed to the client, and precise event handling on both ends!

# GraphQL Subscriptions on the Server
It’s probably easiest to think about our event based subscriptions setup from the client’s perspective. All queries and mutations will still get executed with standard HTTP requests. This will keep request execution more reliable and the WebSocket connection unclogged. We will only use WebSockets for subscriptions, and the client will only subscribe to events it cares about — the ones that affect stuff for the current user.

## Designing GraphQL Subscriptions
Let’s focus on the most important event that ever happens within a messaging app — getting a new message.

When someone creates a new message, we want all group members to be notified that a new message was created. We don’t want our users to know about every new message being created by everybody on Chatty, so we’ll create a system where users **subscribe** to new message events just for their own groups. We can build this subscription model right into our GraphQL Schema!

Let’s modify our GraphQL Schema in `server/data/schema.js` to include a **GraphQL Subscription** for when new messages are added to a group we care about:

[{]: <helper> (diffStep 6.1)

#### Step 6.1: Add Subscription to Schema

##### Changed server&#x2F;data&#x2F;schema.js
```diff
@@ -67,10 +67,17 @@
 ┊67┊67┊    leaveGroup(id: Int!, userId: Int!): Group # let user leave group
 ┊68┊68┊    updateGroup(id: Int!, name: String): Group
 ┊69┊69┊  }
+┊  ┊70┊
+┊  ┊71┊  type Subscription {
+┊  ┊72┊    # Subscription fires on every message added
+┊  ┊73┊    # for any of the groups with one of these groupIds
+┊  ┊74┊    messageAdded(userId: Int, groupIds: [Int]): Message
+┊  ┊75┊  }
 ┊70┊76┊  
 ┊71┊77┊  schema {
 ┊72┊78┊    query: Query
 ┊73┊79┊    mutation: Mutation
+┊  ┊80┊    subscription: Subscription
 ┊74┊81┊  }
 ┊75┊82┊`];
```

[}]: #

That’s it!

## GraphQL Subscription Infrastructure
Our Schema uses GraphQL Subscriptions, but our server infrastructure has no way to handle them.

We will use two excellent packages from the Apollo team  — [` subscription-transport-ws`](https://www.npmjs.com/package/subscriptions-transport-ws) and [`graphql-subscriptions`](https://www.npmjs.com/package/graphql-subscriptions)  —  to hook up our GraphQL server with subscription capabilities:
```
yarn add graphql-subscriptions subscriptions-transport-ws
```

First, we’ll use `graphql-subscriptions` to create a `PubSub` manager. `PubSub` is basically just event emitters wrapped with a function that filters messages. It can easily be replaced later with something more advanced like [`graphql-redis-subscriptions`](https://github.com/davidyaha/graphql-redis-subscriptions).

Let’s create a new file `server/subscriptions.js` where we’ll start fleshing out our subscription infrastructure:

[{]: <helper> (diffStep 6.2 files="server/subscriptions.js")

#### Step 6.2: Create subscriptions.js

##### Added server&#x2F;subscriptions.js
```diff
@@ -0,0 +1,5 @@
+┊ ┊1┊import { PubSub } from 'graphql-subscriptions';
+┊ ┊2┊
+┊ ┊3┊export const pubsub = new PubSub();
+┊ ┊4┊
+┊ ┊5┊export default pubsub;
```

[}]: #

We're going to need the same `executableSchema` we created in `server/index.js`, so let’s pull out executableSchema from `server/index.js` and put it inside `server/data/schema.js` so other files can use `executableSchema`.

[{]: <helper> (diffStep 6.3)

#### Step 6.3: Refactor schema.js to export executableSchema

##### Changed server&#x2F;data&#x2F;schema.js
```diff
@@ -1,3 +1,8 @@
+┊ ┊1┊import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';
+┊ ┊2┊
+┊ ┊3┊import { Mocks } from './mocks';
+┊ ┊4┊import { Resolvers } from './resolvers';
+┊ ┊5┊
 ┊1┊6┊export const Schema = [`
 ┊2┊7┊  # declare custom scalars
 ┊3┊8┊  scalar Date
```
```diff
@@ -81,4 +86,15 @@
 ┊ 81┊ 86┊  }
 ┊ 82┊ 87┊`];
 ┊ 83┊ 88┊
-┊ 84┊   ┊export default Schema;
+┊   ┊ 89┊export const executableSchema = makeExecutableSchema({
+┊   ┊ 90┊  typeDefs: Schema,
+┊   ┊ 91┊  resolvers: Resolvers,
+┊   ┊ 92┊});
+┊   ┊ 93┊
+┊   ┊ 94┊// addMockFunctionsToSchema({
+┊   ┊ 95┊//   schema: executableSchema,
+┊   ┊ 96┊//   mocks: Mocks,
+┊   ┊ 97┊//   preserveResolvers: true,
+┊   ┊ 98┊// });
+┊   ┊ 99┊
+┊   ┊100┊export default executableSchema;
```

##### Changed server&#x2F;index.js
```diff
@@ -1,29 +1,13 @@
 ┊ 1┊ 1┊import express from 'express';
 ┊ 2┊ 2┊import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
-┊ 3┊  ┊import { makeExecutableSchema, addMockFunctionsToSchema } from 'graphql-tools';
 ┊ 4┊ 3┊import bodyParser from 'body-parser';
 ┊ 5┊ 4┊import { createServer } from 'http';
 ┊ 6┊ 5┊
-┊ 7┊  ┊import { Resolvers } from './data/resolvers';
-┊ 8┊  ┊import { Schema } from './data/schema';
-┊ 9┊  ┊import { Mocks } from './data/mocks';
+┊  ┊ 6┊import { executableSchema } from './data/schema';
 ┊10┊ 7┊
 ┊11┊ 8┊const GRAPHQL_PORT = 8080;
 ┊12┊ 9┊const app = express();
 ┊13┊10┊
-┊14┊  ┊const executableSchema = makeExecutableSchema({
-┊15┊  ┊  typeDefs: Schema,
-┊16┊  ┊  resolvers: Resolvers,
-┊17┊  ┊});
-┊18┊  ┊
-┊19┊  ┊// we can comment out this code for mocking data
-┊20┊  ┊// we're using REAL DATA now!
-┊21┊  ┊// addMockFunctionsToSchema({
-┊22┊  ┊//   schema: executableSchema,
-┊23┊  ┊//   mocks: Mocks,
-┊24┊  ┊//   preserveResolvers: true,
-┊25┊  ┊// });
-┊26┊  ┊
 ┊27┊11┊// `context` must be an object and can't be undefined when using connectors
 ┊28┊12┊app.use('/graphql', bodyParser.json(), graphqlExpress({
 ┊29┊13┊  schema: executableSchema,
```

[}]: #

Now that we’ve created a `PubSub`, we can use this class to publish and subscribe to events as they occur in our Resolvers.

We can modify `server/data/resolvers.js` as follows:

[{]: <helper> (diffStep 6.4)

#### Step 6.4: Add Subscription to Resolvers

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -1,5 +1,8 @@
 ┊1┊1┊import GraphQLDate from 'graphql-date';
 ┊2┊2┊import { Group, Message, User } from './connectors';
+┊ ┊3┊import { pubsub } from '../subscriptions';
+┊ ┊4┊
+┊ ┊5┊const MESSAGE_ADDED_TOPIC = 'messageAdded';
 ┊3┊6┊
 ┊4┊7┊export const Resolvers = {
 ┊5┊8┊  Date: GraphQLDate,
```
```diff
@@ -32,6 +35,10 @@
 ┊32┊35┊        userId,
 ┊33┊36┊        text,
 ┊34┊37┊        groupId,
+┊  ┊38┊      }).then((message) => {
+┊  ┊39┊        // publish subscription notification with the whole message
+┊  ┊40┊        pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });
+┊  ┊41┊        return message;
 ┊35┊42┊      });
 ┊36┊43┊    },
 ┊37┊44┊    createGroup(_, { name, userIds, userId }) {
```
```diff
@@ -73,6 +80,12 @@
 ┊73┊80┊        .then(group => group.update({ name }));
 ┊74┊81┊    },
 ┊75┊82┊  },
+┊  ┊83┊  Subscription: {
+┊  ┊84┊    messageAdded: {
+┊  ┊85┊      // the subscription payload is the message.
+┊  ┊86┊      subscribe: () => pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),
+┊  ┊87┊    },
+┊  ┊88┊  },
 ┊76┊89┊  Group: {
 ┊77┊90┊    users(group) {
 ┊78┊91┊      return group.getUsers();
```

[}]: #

Whenever a user creates a message, we trigger `pubsub` to publish the `messageAdded` event along with the newly created message. `PubSub` will emit an event to any clients subscribed to `messageAdded` and pass them the new message.

But we only want to emit this event to clients who care about the message because it was sent to one of their user’s groups! We can modify our implementation to filter who gets the event emission:

[{]: <helper> (diffStep 6.5)

#### Step 6.5: Add withFilter to messageAdded

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -1,4 +1,6 @@
 ┊1┊1┊import GraphQLDate from 'graphql-date';
+┊ ┊2┊import { withFilter } from 'graphql-subscriptions';
+┊ ┊3┊
 ┊2┊4┊import { Group, Message, User } from './connectors';
 ┊3┊5┊import { pubsub } from '../subscriptions';
 ┊4┊6┊
```
```diff
@@ -82,8 +84,16 @@
 ┊82┊84┊  },
 ┊83┊85┊  Subscription: {
 ┊84┊86┊    messageAdded: {
-┊85┊  ┊      // the subscription payload is the message.
-┊86┊  ┊      subscribe: () => pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),
+┊  ┊87┊      subscribe: withFilter(
+┊  ┊88┊        () => pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),
+┊  ┊89┊        (payload, args) => {
+┊  ┊90┊          return Boolean(
+┊  ┊91┊            args.groupIds &&
+┊  ┊92┊            ~args.groupIds.indexOf(payload.messageAdded.groupId) &&
+┊  ┊93┊            args.userId !== payload.messageAdded.userId, // don't send to user creating message
+┊  ┊94┊          );
+┊  ┊95┊        },
+┊  ┊96┊      ),
 ┊87┊97┊    },
 ┊88┊98┊  },
 ┊89┊99┊  Group: {
```

[}]: #

Using `withFilter`, we create a `filter` which returns true when the `groupId` of a new message matches one of the `groupIds` passed into our `messageAdded` subscription. This filter will be applied whenever `pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message })` is triggered, and only clients whose subscriptions pass the filter will receive the message.

Our Resolvers are all set up. Time to hook our server up to WebSockets!

## Creating the SubscriptionServer
Our server will serve subscriptions via WebSockets, keeping an open connection with clients. `subscription-transport-ws` exposes a `SubscriptionServer` module that, when given a server, an endpoint, and the `execute` and `subscribe` modules from `graphql`, will tie everything together. The `SubscriptionServer` will rely on the Resolvers to manage emitting events to subscribed clients over the endpoint via WebSockets. How cool is that?!

Inside `server/index.js`, let’s attach a new `SubscriptionServer` to our current server and have it use `ws://localhost:8080/subscriptions` (`SUBSCRIPTIONS_PATH`) as our subscription endpoint:

[{]: <helper> (diffStep 6.6)

#### Step 6.6: Create SubscriptionServer

##### Changed server&#x2F;index.js
```diff
@@ -2,10 +2,15 @@
 ┊ 2┊ 2┊import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
 ┊ 3┊ 3┊import bodyParser from 'body-parser';
 ┊ 4┊ 4┊import { createServer } from 'http';
+┊  ┊ 5┊import { SubscriptionServer } from 'subscriptions-transport-ws';
+┊  ┊ 6┊import { execute, subscribe } from 'graphql';
 ┊ 5┊ 7┊
 ┊ 6┊ 8┊import { executableSchema } from './data/schema';
 ┊ 7┊ 9┊
 ┊ 8┊10┊const GRAPHQL_PORT = 8080;
+┊  ┊11┊const GRAPHQL_PATH = '/graphql';
+┊  ┊12┊const SUBSCRIPTIONS_PATH = '/subscriptions';
+┊  ┊13┊
 ┊ 9┊14┊const app = express();
 ┊10┊15┊
 ┊11┊16┊// `context` must be an object and can't be undefined when using connectors
```
```diff
@@ -15,9 +20,23 @@
 ┊15┊20┊}));
 ┊16┊21┊
 ┊17┊22┊app.use('/graphiql', graphiqlExpress({
-┊18┊  ┊  endpointURL: '/graphql',
+┊  ┊23┊  endpointURL: GRAPHQL_PATH,
+┊  ┊24┊  subscriptionsEndpoint: `ws://localhost:${GRAPHQL_PORT}${SUBSCRIPTIONS_PATH}`,
 ┊19┊25┊}));
 ┊20┊26┊
 ┊21┊27┊const graphQLServer = createServer(app);
 ┊22┊28┊
-┊23┊  ┊graphQLServer.listen(GRAPHQL_PORT, () => console.log(`GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}/graphql`));
+┊  ┊29┊graphQLServer.listen(GRAPHQL_PORT, () => {
+┊  ┊30┊  console.log(`GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}${GRAPHQL_PATH}`);
+┊  ┊31┊  console.log(`GraphQL Subscriptions are now running on ws://localhost:${GRAPHQL_PORT}${SUBSCRIPTIONS_PATH}`);
+┊  ┊32┊});
+┊  ┊33┊
+┊  ┊34┊// eslint-disable-next-line no-unused-vars
+┊  ┊35┊const subscriptionServer = SubscriptionServer.create({
+┊  ┊36┊  schema: executableSchema,
+┊  ┊37┊  execute,
+┊  ┊38┊  subscribe,
+┊  ┊39┊}, {
+┊  ┊40┊  server: graphQLServer,
+┊  ┊41┊  path: SUBSCRIPTIONS_PATH,
+┊  ┊42┊});
```

[}]: #

You might have noticed that we also updated our `/graphiql` endpoint to include a subscriptionsEndpoint. That’s right  —  we can track our subscriptions in GraphIQL!

A GraphQL Subscription is written on the client much like a query or mutation. For example, in GraphIQL, we could write the following GraphQL Subscription for `messageAdded`:
```
subscription messageAdded($groupIds: [Int]){
  messageAdded(groupIds: $groupIds) {
    id
    to {
      name
    }
    from {
      username
    }
    text
  }
}
```

Let’s check out GraphIQL and see if everything works: ![GraphIQL Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step6-6.gif)

## New Subscription Workflow
We’ve successfully set up GraphQL Subscriptions on our server.

Since we have the infrastructure in place, let’s add one more subscription for some extra practice. We can use the same methodology we used for subscribing to new `Messages` and apply it to new `Groups`. After all, it’s important that our users know right away that they’ve been added to a new group.

The steps are as follows:
1. Add the subscription to our Schema:

[{]: <helper> (diffStep 6.7)

#### Step 6.7: Add groupAdded to Schema

##### Changed server&#x2F;data&#x2F;schema.js
```diff
@@ -77,6 +77,7 @@
 ┊77┊77┊    # Subscription fires on every message added
 ┊78┊78┊    # for any of the groups with one of these groupIds
 ┊79┊79┊    messageAdded(userId: Int, groupIds: [Int]): Message
+┊  ┊80┊    groupAdded(userId: Int): Group
 ┊80┊81┊  }
 ┊81┊82┊  
 ┊82┊83┊  schema {
```

[}]: #

2. Publish to the subscription when a new `Group` is created and resolve the subscription in the Resolvers:

[{]: <helper> (diffStep 6.8)

#### Step 6.8: Add groupAdded to Resolvers

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -5,6 +5,7 @@
 ┊ 5┊ 5┊import { pubsub } from '../subscriptions';
 ┊ 6┊ 6┊
 ┊ 7┊ 7┊const MESSAGE_ADDED_TOPIC = 'messageAdded';
+┊  ┊ 8┊const GROUP_ADDED_TOPIC = 'groupAdded';
 ┊ 8┊ 9┊
 ┊ 9┊10┊export const Resolvers = {
 ┊10┊11┊  Date: GraphQLDate,
```
```diff
@@ -51,8 +52,13 @@
 ┊51┊52┊            users: [user, ...friends],
 ┊52┊53┊          })
 ┊53┊54┊            .then(group => group.addUsers([user, ...friends])
-┊54┊  ┊              .then(() => group),
-┊55┊  ┊            ),
+┊  ┊55┊              .then((res) => {
+┊  ┊56┊                // append the user list to the group object
+┊  ┊57┊                // to pass to pubsub so we can check members
+┊  ┊58┊                group.users = [user, ...friends];
+┊  ┊59┊                pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });
+┊  ┊60┊                return group;
+┊  ┊61┊              })),
 ┊56┊62┊          ),
 ┊57┊63┊        );
 ┊58┊64┊    },
```
```diff
@@ -95,6 +101,9 @@
 ┊ 95┊101┊        },
 ┊ 96┊102┊      ),
 ┊ 97┊103┊    },
+┊   ┊104┊    groupAdded: {
+┊   ┊105┊      subscribe: () => pubsub.asyncIterator(GROUP_ADDED_TOPIC),
+┊   ┊106┊    },
 ┊ 98┊107┊  },
 ┊ 99┊108┊  Group: {
 ┊100┊109┊    users(group) {
```

[}]: #

3. Filter the recipients of the emitted new group with `withFilter`:

[{]: <helper> (diffStep 6.9)

#### Step 6.9: Add withFilter to groupAdded

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -1,5 +1,6 @@
 ┊1┊1┊import GraphQLDate from 'graphql-date';
 ┊2┊2┊import { withFilter } from 'graphql-subscriptions';
+┊ ┊3┊import { map } from 'lodash';
 ┊3┊4┊
 ┊4┊5┊import { Group, Message, User } from './connectors';
 ┊5┊6┊import { pubsub } from '../subscriptions';
```
```diff
@@ -102,7 +103,16 @@
 ┊102┊103┊      ),
 ┊103┊104┊    },
 ┊104┊105┊    groupAdded: {
-┊105┊   ┊      subscribe: () => pubsub.asyncIterator(GROUP_ADDED_TOPIC),
+┊   ┊106┊      subscribe: withFilter(
+┊   ┊107┊        () => pubsub.asyncIterator(GROUP_ADDED_TOPIC),
+┊   ┊108┊        (payload, args) => {
+┊   ┊109┊          return Boolean(
+┊   ┊110┊            args.userId &&
+┊   ┊111┊            ~map(payload.groupAdded.users, 'id').indexOf(args.userId) &&
+┊   ┊112┊            args.userId !== payload.groupAdded.users[0].id, // don't send to user creating group
+┊   ┊113┊          );
+┊   ┊114┊        },
+┊   ┊115┊      ),
 ┊106┊116┊    },
 ┊107┊117┊  },
 ┊108┊118┊  Group: {
```

[}]: #

All set!

# GraphQL Subscriptions on the Client
Time to add subscriptions inside our React Native client. We’ll start by adding `subscriptions-transport-ws` to our client:
```
# make sure you're adding the package in the client!!!
cd client
yarn add subscriptions-transport-ws
```

We’ll use `subscription-transport-ws` on the client to connect to our WebSocket endpoint and extend the `networkInterface` we pass into `ApolloClient` to handle subscriptions on the endpoint:

[{]: <helper> (diffStep "6.10" files="client/src/app.js")

#### Step 6.10: Add wsClient to networkInterface

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -4,12 +4,28 @@
 ┊ 4┊ 4┊import { createStore, combineReducers, applyMiddleware } from 'redux';
 ┊ 5┊ 5┊import { composeWithDevTools } from 'redux-devtools-extension';
 ┊ 6┊ 6┊import ApolloClient, { createNetworkInterface } from 'apollo-client';
+┊  ┊ 7┊import { SubscriptionClient, addGraphQLSubscriptions } from 'subscriptions-transport-ws';
 ┊ 7┊ 8┊
 ┊ 8┊ 9┊import AppWithNavigationState, { navigationReducer } from './navigation';
 ┊ 9┊10┊
 ┊10┊11┊const networkInterface = createNetworkInterface({ uri: 'http://localhost:8080/graphql' });
-┊11┊  ┊const client = new ApolloClient({
+┊  ┊12┊
+┊  ┊13┊// Create WebSocket client
+┊  ┊14┊const wsClient = new SubscriptionClient('ws://localhost:8080/subscriptions', {
+┊  ┊15┊  reconnect: true,
+┊  ┊16┊  connectionParams: {
+┊  ┊17┊    // Pass any arguments you want for initialization
+┊  ┊18┊  },
+┊  ┊19┊});
+┊  ┊20┊
+┊  ┊21┊// Extend the network interface with the WebSocket
+┊  ┊22┊const networkInterfaceWithSubscriptions = addGraphQLSubscriptions(
 ┊12┊23┊  networkInterface,
+┊  ┊24┊  wsClient,
+┊  ┊25┊);
+┊  ┊26┊
+┊  ┊27┊const client = new ApolloClient({
+┊  ┊28┊  networkInterface: networkInterfaceWithSubscriptions,
 ┊13┊29┊});
 ┊14┊30┊
 ┊15┊31┊const store = createStore(
```

[}]: #

That’s it — we’re ready to start adding subscriptions!

# Designing GraphQL Subscriptions
Our GraphQL Subscriptions are going to be ridiculously easy to write now that we’ve had practice with queries and mutations. We’ll first write our `messageAdded` subscription in a new file `client/src/graphql/message-added.subscription.js`:

[{]: <helper> (diffStep 6.11)

#### Step 6.11: Create MESSAGE_ADDED_SUBSCRIPTION

##### Added client&#x2F;src&#x2F;graphql&#x2F;message-added.subscription.js
```diff
@@ -0,0 +1,14 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊import MESSAGE_FRAGMENT from './message.fragment';
+┊  ┊ 4┊
+┊  ┊ 5┊const MESSAGE_ADDED_SUBSCRIPTION = gql`
+┊  ┊ 6┊  subscription onMessageAdded($userId: Int, $groupIds: [Int]){
+┊  ┊ 7┊    messageAdded(userId: $userId, groupIds: $groupIds){
+┊  ┊ 8┊      ... MessageFragment
+┊  ┊ 9┊    }
+┊  ┊10┊  }
+┊  ┊11┊  ${MESSAGE_FRAGMENT}
+┊  ┊12┊`;
+┊  ┊13┊
+┊  ┊14┊export default MESSAGE_ADDED_SUBSCRIPTION;
```

[}]: #

I’ve retitled the subscription `onMessageAdded` to distinguish the name from the subscription itself.

The `groupAdded` component will look extremely similar:

[{]: <helper> (diffStep 6.12)

#### Step 6.12: Create GROUP_ADDED_SUBSCRIPTION

##### Added client&#x2F;src&#x2F;graphql&#x2F;group-added.subscription.js
```diff
@@ -0,0 +1,23 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊import MESSAGE_FRAGMENT from './message.fragment';
+┊  ┊ 4┊
+┊  ┊ 5┊const GROUP_ADDED_SUBSCRIPTION = gql`
+┊  ┊ 6┊  subscription onGroupAdded($userId: Int){
+┊  ┊ 7┊    groupAdded(userId: $userId){
+┊  ┊ 8┊      id
+┊  ┊ 9┊      name
+┊  ┊10┊      messages(first: 1) {
+┊  ┊11┊        edges {
+┊  ┊12┊          cursor
+┊  ┊13┊          node {
+┊  ┊14┊            ... MessageFragment
+┊  ┊15┊          }
+┊  ┊16┊        }
+┊  ┊17┊      }
+┊  ┊18┊    }
+┊  ┊19┊  }
+┊  ┊20┊  ${MESSAGE_FRAGMENT}
+┊  ┊21┊`;
+┊  ┊22┊
+┊  ┊23┊export default GROUP_ADDED_SUBSCRIPTION;
```

[}]: #

Our subscriptions are fired up and ready to go. We just need to add them to our UI/UX and we’re finished.

## Connecting Subscriptions to Components
Our final step is to connect our new subscriptions to our React Native components.

Let’s first apply `messageAdded` to the `Messages` component. When a user is looking at messages within a group thread, we want new messages to pop onto the thread as they’re created.

The `graphql` module in `react-apollo` exposes a `prop` function named `subscribeToMore` that can attach subscriptions to a component. Inside the `subscribeToMore` function, we pass the subscription, variables, and tell the component how to modify query data state with `updateQuery`.

Take a look at the updated code in our `Messages` component in `client/src/screens/messages.screen.js`:

[{]: <helper> (diffStep 6.13)

#### Step 6.13: Apply subscribeToMore to Messages

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -17,11 +17,13 @@
 ┊17┊17┊import _ from 'lodash';
 ┊18┊18┊import moment from 'moment';
 ┊19┊19┊
+┊  ┊20┊import { wsClient } from '../app';
 ┊20┊21┊import Message from '../components/message.component';
 ┊21┊22┊import MessageInput from '../components/message-input.component';
 ┊22┊23┊import GROUP_QUERY from '../graphql/group.query';
 ┊23┊24┊import CREATE_MESSAGE_MUTATION from '../graphql/create-message.mutation';
 ┊24┊25┊import USER_QUERY from '../graphql/user.query';
+┊  ┊26┊import MESSAGE_ADDED_SUBSCRIPTION from '../graphql/message-added.subscription';
 ┊25┊27┊
 ┊26┊28┊const styles = StyleSheet.create({
 ┊27┊29┊  container: {
```
```diff
@@ -107,6 +109,35 @@
 ┊107┊109┊        });
 ┊108┊110┊      }
 ┊109┊111┊
+┊   ┊112┊      // we don't resubscribe on changed props
+┊   ┊113┊      // because it never happens in our app
+┊   ┊114┊      if (!this.subscription) {
+┊   ┊115┊        this.subscription = nextProps.subscribeToMore({
+┊   ┊116┊          document: MESSAGE_ADDED_SUBSCRIPTION,
+┊   ┊117┊          variables: {
+┊   ┊118┊            userId: 1, // fake the user for now
+┊   ┊119┊            groupIds: [nextProps.navigation.state.params.groupId],
+┊   ┊120┊          },
+┊   ┊121┊          updateQuery: (previousResult, { subscriptionData }) => {
+┊   ┊122┊            const newMessage = subscriptionData.data.messageAdded;
+┊   ┊123┊
+┊   ┊124┊            return update(previousResult, {
+┊   ┊125┊              group: {
+┊   ┊126┊                messages: {
+┊   ┊127┊                  edges: {
+┊   ┊128┊                    $unshift: [{
+┊   ┊129┊                      __typename: 'MessageEdge',
+┊   ┊130┊                      node: newMessage,
+┊   ┊131┊                      cursor: Buffer.from(newMessage.id.toString()).toString('base64'),
+┊   ┊132┊                    }],
+┊   ┊133┊                  },
+┊   ┊134┊                },
+┊   ┊135┊              },
+┊   ┊136┊            });
+┊   ┊137┊          },
+┊   ┊138┊        });
+┊   ┊139┊      }
+┊   ┊140┊
 ┊110┊141┊      this.setState({
 ┊111┊142┊        usernameColors,
 ┊112┊143┊      });
```
```diff
@@ -211,6 +242,7 @@
 ┊211┊242┊  }),
 ┊212┊243┊  loading: PropTypes.bool,
 ┊213┊244┊  loadMoreEntries: PropTypes.func,
+┊   ┊245┊  subscribeToMore: PropTypes.func,
 ┊214┊246┊};
 ┊215┊247┊
 ┊216┊248┊const ITEMS_PER_PAGE = 10;
```
```diff
@@ -221,9 +253,10 @@
 ┊221┊253┊      first: ITEMS_PER_PAGE,
 ┊222┊254┊    },
 ┊223┊255┊  }),
-┊224┊   ┊  props: ({ data: { fetchMore, loading, group } }) => ({
+┊   ┊256┊  props: ({ data: { fetchMore, loading, group, subscribeToMore } }) => ({
 ┊225┊257┊    loading,
 ┊226┊258┊    group,
+┊   ┊259┊    subscribeToMore,
 ┊227┊260┊    loadMoreEntries() {
 ┊228┊261┊      return fetchMore({
 ┊229┊262┊        // query: ... (you can specify a different query.
```

[}]: #

After we connect `subscribeToMore` to the component’s props, we attach a subscription property on the component (so there’s only one) which initializes `subscribeToMore` with the required parameters. Inside `updateQuery`, when we receive a new message, we make sure its not a duplicate, and then unshift the message onto our collection of messages.

Does it work?! ![Working Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step6-13.gif)

We need to subscribe to new Groups and Messages so our Groups component will update in real time. The Groups component needs to subscribe to `groupAdded` and `messageAdded` because in addition to new groups popping up when they’re created, the latest messages should also show up in each group’s preview. 

However, instead of using `subscribeToMore` in our Groups screen, we should actually consider applying these subscriptions to a higher order component (HOC) for our application. If we navigate away from the Groups screen at any point, we will unsubscribe and won't receive real-time updates while we're away from the screen. We'd need to refetch queries from the network when returning to the Groups screen to guarantee that our data is up to date. 

If we attach our subscription to a higher order component, like `AppWithNavigationState`, we can stay subscribed to the subscriptions no matter where the user navigates and always keep our state up to date in real time! 

Let's apply the `USER_QUERY` to `AppWithNavigationState` in `client/src/navigation.js` and include two subscriptions using `subscribeToMore` for new `Messages` and `Groups`:

[{]: <helper> (diffStep 6.14)

#### Step 6.14: Apply subscribeToMore to AppWithNavigationState

##### Changed client&#x2F;src&#x2F;navigation.js
```diff
@@ -1,8 +1,12 @@
 ┊ 1┊ 1┊import PropTypes from 'prop-types';
-┊ 2┊  ┊import React from 'react';
+┊  ┊ 2┊import React, { Component } from 'react';
 ┊ 3┊ 3┊import { addNavigationHelpers, StackNavigator, TabNavigator } from 'react-navigation';
 ┊ 4┊ 4┊import { Text, View, StyleSheet } from 'react-native';
 ┊ 5┊ 5┊import { connect } from 'react-redux';
+┊  ┊ 6┊import { graphql, compose } from 'react-apollo';
+┊  ┊ 7┊import update from 'immutability-helper';
+┊  ┊ 8┊import { map } from 'lodash';
+┊  ┊ 9┊import { Buffer } from 'buffer';
 ┊ 6┊10┊
 ┊ 7┊11┊import Groups from './screens/groups.screen';
 ┊ 8┊12┊import Messages from './screens/messages.screen';
```
```diff
@@ -10,6 +14,10 @@
 ┊10┊14┊import GroupDetails from './screens/group-details.screen';
 ┊11┊15┊import NewGroup from './screens/new-group.screen';
 ┊12┊16┊
+┊  ┊17┊import { USER_QUERY } from './graphql/user.query';
+┊  ┊18┊import MESSAGE_ADDED_SUBSCRIPTION from './graphql/message-added.subscription';
+┊  ┊19┊import GROUP_ADDED_SUBSCRIPTION from './graphql/group-added.subscription';
+┊  ┊20┊
 ┊13┊21┊const styles = StyleSheet.create({
 ┊14┊22┊  container: {
 ┊15┊23┊    flex: 1,
```
```diff
@@ -71,17 +79,120 @@
 ┊ 71┊ 79┊  return nextState || state;
 ┊ 72┊ 80┊};
 ┊ 73┊ 81┊
-┊ 74┊   ┊const AppWithNavigationState = ({ dispatch, nav }) => (
-┊ 75┊   ┊  <AppNavigator navigation={addNavigationHelpers({ dispatch, state: nav })} />
-┊ 76┊   ┊);
+┊   ┊ 82┊class AppWithNavigationState extends Component {
+┊   ┊ 83┊  componentWillReceiveProps(nextProps) {
+┊   ┊ 84┊    if (!nextProps.user) {
+┊   ┊ 85┊      if (this.groupSubscription) {
+┊   ┊ 86┊        this.groupSubscription();
+┊   ┊ 87┊      }
+┊   ┊ 88┊
+┊   ┊ 89┊      if (this.messagesSubscription) {
+┊   ┊ 90┊        this.messagesSubscription();
+┊   ┊ 91┊      }
+┊   ┊ 92┊    }
+┊   ┊ 93┊
+┊   ┊ 94┊    if (nextProps.user &&
+┊   ┊ 95┊      (!this.props.user || nextProps.user.groups.length !== this.props.user.groups.length)) {
+┊   ┊ 96┊      // unsubscribe from old
+┊   ┊ 97┊
+┊   ┊ 98┊      if (typeof this.messagesSubscription === 'function') {
+┊   ┊ 99┊        this.messagesSubscription();
+┊   ┊100┊      }
+┊   ┊101┊      // subscribe to new
+┊   ┊102┊      if (nextProps.user.groups.length) {
+┊   ┊103┊        this.messagesSubscription = nextProps.subscribeToMessages();
+┊   ┊104┊      }
+┊   ┊105┊    }
+┊   ┊106┊
+┊   ┊107┊    if (!this.groupSubscription && nextProps.user) {
+┊   ┊108┊      this.groupSubscription = nextProps.subscribeToGroups();
+┊   ┊109┊    }
+┊   ┊110┊  }
+┊   ┊111┊
+┊   ┊112┊  render() {
+┊   ┊113┊    const { dispatch, nav } = this.props;
+┊   ┊114┊    return <AppNavigator navigation={addNavigationHelpers({ dispatch, state: nav })} />;
+┊   ┊115┊  }
+┊   ┊116┊}
 ┊ 77┊117┊
 ┊ 78┊118┊AppWithNavigationState.propTypes = {
 ┊ 79┊119┊  dispatch: PropTypes.func.isRequired,
 ┊ 80┊120┊  nav: PropTypes.object.isRequired,
+┊   ┊121┊  subscribeToGroups: PropTypes.func,
+┊   ┊122┊  subscribeToMessages: PropTypes.func,
+┊   ┊123┊  user: PropTypes.shape({
+┊   ┊124┊    id: PropTypes.number.isRequired,
+┊   ┊125┊    email: PropTypes.string.isRequired,
+┊   ┊126┊    groups: PropTypes.arrayOf(
+┊   ┊127┊      PropTypes.shape({
+┊   ┊128┊        id: PropTypes.number.isRequired,
+┊   ┊129┊        name: PropTypes.string.isRequired,
+┊   ┊130┊      }),
+┊   ┊131┊    ),
+┊   ┊132┊  }),
 ┊ 81┊133┊};
 ┊ 82┊134┊
 ┊ 83┊135┊const mapStateToProps = state => ({
 ┊ 84┊136┊  nav: state.nav,
 ┊ 85┊137┊});
 ┊ 86┊138┊
-┊ 87┊   ┊export default connect(mapStateToProps)(AppWithNavigationState);
+┊   ┊139┊const userQuery = graphql(USER_QUERY, {
+┊   ┊140┊  options: () => ({ variables: { id: 1 } }), // fake the user for now
+┊   ┊141┊  props: ({ data: { loading, user, subscribeToMore } }) => ({
+┊   ┊142┊    loading,
+┊   ┊143┊    user,
+┊   ┊144┊    subscribeToMessages() {
+┊   ┊145┊      return subscribeToMore({
+┊   ┊146┊        document: MESSAGE_ADDED_SUBSCRIPTION,
+┊   ┊147┊        variables: {
+┊   ┊148┊          userId: 1, // fake the user for now
+┊   ┊149┊          groupIds: map(user.groups, 'id'),
+┊   ┊150┊        },
+┊   ┊151┊        updateQuery: (previousResult, { subscriptionData }) => {
+┊   ┊152┊          const previousGroups = previousResult.user.groups;
+┊   ┊153┊          const newMessage = subscriptionData.data.messageAdded;
+┊   ┊154┊
+┊   ┊155┊          const groupIndex = map(previousGroups, 'id').indexOf(newMessage.to.id);
+┊   ┊156┊
+┊   ┊157┊          return update(previousResult, {
+┊   ┊158┊            user: {
+┊   ┊159┊              groups: {
+┊   ┊160┊                [groupIndex]: {
+┊   ┊161┊                  messages: {
+┊   ┊162┊                    edges: {
+┊   ┊163┊                      $set: [{
+┊   ┊164┊                        __typename: 'MessageEdge',
+┊   ┊165┊                        node: newMessage,
+┊   ┊166┊                        cursor: Buffer.from(newMessage.id.toString()).toString('base64'),
+┊   ┊167┊                      }],
+┊   ┊168┊                    },
+┊   ┊169┊                  },
+┊   ┊170┊                },
+┊   ┊171┊              },
+┊   ┊172┊            },
+┊   ┊173┊          });
+┊   ┊174┊        },
+┊   ┊175┊      });
+┊   ┊176┊    },
+┊   ┊177┊    subscribeToGroups() {
+┊   ┊178┊      return subscribeToMore({
+┊   ┊179┊        document: GROUP_ADDED_SUBSCRIPTION,
+┊   ┊180┊        variables: { userId: user.id },
+┊   ┊181┊        updateQuery: (previousResult, { subscriptionData }) => {
+┊   ┊182┊          const newGroup = subscriptionData.data.groupAdded;
+┊   ┊183┊
+┊   ┊184┊          return update(previousResult, {
+┊   ┊185┊            user: {
+┊   ┊186┊              groups: { $push: [newGroup] },
+┊   ┊187┊            },
+┊   ┊188┊          });
+┊   ┊189┊        },
+┊   ┊190┊      });
+┊   ┊191┊    },
+┊   ┊192┊  }),
+┊   ┊193┊});
+┊   ┊194┊
+┊   ┊195┊export default compose(
+┊   ┊196┊  connect(mapStateToProps),
+┊   ┊197┊  userQuery,
+┊   ┊198┊)(AppWithNavigationState);
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
```diff
@@ -191,7 +191,7 @@
 ┊191┊191┊    const { loading, user, networkStatus } = this.props;
 ┊192┊192┊
 ┊193┊193┊    // render loading placeholder while we fetch messages
-┊194┊   ┊    if (loading) {
+┊   ┊194┊    if (loading || !user) {
 ┊195┊195┊      return (
 ┊196┊196┊        <View style={[styles.loading, styles.container]}>
 ┊197┊197┊          <ActivityIndicator />
```

[}]: #

We have to do a little extra work to guarantee that our `messageSubscription` updates when we add or remove new groups. Otherwise, if a new group is created and someone sends a message, the user won’t be subscribed to receive that new message. When we need to update the subscription, we unsubscribe by calling the subscription as a function `messageSubscription()` and then reset `messageSubscription` to reflect the latest `nextProps.subscribeToMessages`.

One of the cooler things about Apollo is it caches all the queries and data that we've fetched and reuses data for the same query in the future instead of requesting it from the network (unless we specify otherwise). `USER_QUERY` will  make a request to the network and then data will be reused for subsequent executions. Our app setup tracks any data changes with subscriptions, so we only end up requesting the data we need from the server once!

## Handling broken connections
We need to do one more step to make sure our app stays updated in real-time. Sometimes users will lose internet connectivity or the WebSocket might disconnect temporarily. During these blackout periods, our client won't receive any subscription events, so our app won't receive new messages or groups. `subscriptions-transport-ws` has a built-in reconnecting mechanism, but it won't track any missed subscription events.

The simplest way to handle this issue is to refetch all relevant queries when our app reconnects. `wsClient` exposes an `onReconnected` function that will call the supplied callback function when the WebSocket reconnects. We can simply call `refetch` on our queries in the callback.

[{]: <helper> (diffStep 6.15)

#### Step 6.15: Apply onReconnected to refetch missed subscription events

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -11,7 +11,7 @@
 ┊11┊11┊const networkInterface = createNetworkInterface({ uri: 'http://localhost:8080/graphql' });
 ┊12┊12┊
 ┊13┊13┊// Create WebSocket client
-┊14┊  ┊const wsClient = new SubscriptionClient('ws://localhost:8080/subscriptions', {
+┊  ┊14┊export const wsClient = new SubscriptionClient('ws://localhost:8080/subscriptions', {
 ┊15┊15┊  reconnect: true,
 ┊16┊16┊  connectionParams: {
 ┊17┊17┊    // Pass any arguments you want for initialization
```

##### Changed client&#x2F;src&#x2F;navigation.js
```diff
@@ -18,6 +18,8 @@
 ┊18┊18┊import MESSAGE_ADDED_SUBSCRIPTION from './graphql/message-added.subscription';
 ┊19┊19┊import GROUP_ADDED_SUBSCRIPTION from './graphql/group-added.subscription';
 ┊20┊20┊
+┊  ┊21┊import { wsClient } from './app';
+┊  ┊22┊
 ┊21┊23┊const styles = StyleSheet.create({
 ┊22┊24┊  container: {
 ┊23┊25┊    flex: 1,
```
```diff
@@ -89,6 +91,15 @@
 ┊ 89┊ 91┊      if (this.messagesSubscription) {
 ┊ 90┊ 92┊        this.messagesSubscription();
 ┊ 91┊ 93┊      }
+┊   ┊ 94┊
+┊   ┊ 95┊      // clear the event subscription
+┊   ┊ 96┊      if (this.reconnected) {
+┊   ┊ 97┊        this.reconnected();
+┊   ┊ 98┊      }
+┊   ┊ 99┊    } else if (!this.reconnected) {
+┊   ┊100┊      this.reconnected = wsClient.onReconnected(() => {
+┊   ┊101┊        this.props.refetch(); // check for any data lost during disconnect
+┊   ┊102┊      }, this);
 ┊ 92┊103┊    }
 ┊ 93┊104┊
 ┊ 94┊105┊    if (nextProps.user &&
```
```diff
@@ -118,6 +129,7 @@
 ┊118┊129┊AppWithNavigationState.propTypes = {
 ┊119┊130┊  dispatch: PropTypes.func.isRequired,
 ┊120┊131┊  nav: PropTypes.object.isRequired,
+┊   ┊132┊  refetch: PropTypes.func,
 ┊121┊133┊  subscribeToGroups: PropTypes.func,
 ┊122┊134┊  subscribeToMessages: PropTypes.func,
 ┊123┊135┊  user: PropTypes.shape({
```
```diff
@@ -138,9 +150,10 @@
 ┊138┊150┊
 ┊139┊151┊const userQuery = graphql(USER_QUERY, {
 ┊140┊152┊  options: () => ({ variables: { id: 1 } }), // fake the user for now
-┊141┊   ┊  props: ({ data: { loading, user, subscribeToMore } }) => ({
+┊   ┊153┊  props: ({ data: { loading, user, refetch, subscribeToMore } }) => ({
 ┊142┊154┊    loading,
 ┊143┊155┊    user,
+┊   ┊156┊    refetch,
 ┊144┊157┊    subscribeToMessages() {
 ┊145┊158┊      return subscribeToMore({
 ┊146┊159┊        document: MESSAGE_ADDED_SUBSCRIPTION,
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -138,9 +138,18 @@
 ┊138┊138┊        });
 ┊139┊139┊      }
 ┊140┊140┊
+┊   ┊141┊      if (!this.reconnected) {
+┊   ┊142┊        this.reconnected = wsClient.onReconnected(() => {
+┊   ┊143┊          this.props.refetch(); // check for any data lost during disconnect
+┊   ┊144┊        }, this);
+┊   ┊145┊      }
+┊   ┊146┊
 ┊141┊147┊      this.setState({
 ┊142┊148┊        usernameColors,
 ┊143┊149┊      });
+┊   ┊150┊    } else if (this.reconnected) {
+┊   ┊151┊      // remove event subscription
+┊   ┊152┊      this.reconnected();
 ┊144┊153┊    }
 ┊145┊154┊  }
 ┊146┊155┊
```
```diff
@@ -242,6 +251,7 @@
 ┊242┊251┊  }),
 ┊243┊252┊  loading: PropTypes.bool,
 ┊244┊253┊  loadMoreEntries: PropTypes.func,
+┊   ┊254┊  refetch: PropTypes.func,
 ┊245┊255┊  subscribeToMore: PropTypes.func,
 ┊246┊256┊};
 ┊247┊257┊
```
```diff
@@ -253,9 +263,10 @@
 ┊253┊263┊      first: ITEMS_PER_PAGE,
 ┊254┊264┊    },
 ┊255┊265┊  }),
-┊256┊   ┊  props: ({ data: { fetchMore, loading, group, subscribeToMore } }) => ({
+┊   ┊266┊  props: ({ data: { fetchMore, loading, group, refetch, subscribeToMore } }) => ({
 ┊257┊267┊    loading,
 ┊258┊268┊    group,
+┊   ┊269┊    refetch,
 ┊259┊270┊    subscribeToMore,
 ┊260┊271┊    loadMoreEntries() {
 ┊261┊272┊      return fetchMore({
```

[}]: #

Final product: ![Final Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step6-14.gif)
[{]: <helper> (navStep)

| [< Previous Step](step5.md) | [Next Step >](step7.md) |
|:--------------------------------|--------------------------------:|

[}]: #

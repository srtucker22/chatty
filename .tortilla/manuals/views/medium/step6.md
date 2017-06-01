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
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊52┊52┊    leaveGroup(id: Int!, userId: Int!): Group # let user leave group
 ┊53┊53┊    updateGroup(id: Int!, name: String): Group
 ┊54┊54┊  }
<b>+┊  ┊55┊</b>
<b>+┊  ┊56┊  type Subscription {</b>
<b>+┊  ┊57┊    # Subscription fires on every message added</b>
<b>+┊  ┊58┊    # for any of the groups with one of these groupIds</b>
<b>+┊  ┊59┊    messageAdded(groupIds: [Int]): Message</b>
<b>+┊  ┊60┊  }</b>
 ┊55┊61┊  
 ┊56┊62┊  schema {
 ┊57┊63┊    query: Query
 ┊58┊64┊    mutation: Mutation
<b>+┊  ┊65┊    subscription: Subscription</b>
 ┊59┊66┊  }
 ┊60┊67┊&#x60;];
</pre>

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
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊import { PubSub } from &#x27;graphql-subscriptions&#x27;;</b>
<b>+┊ ┊2┊</b>
<b>+┊ ┊3┊export const pubsub &#x3D; new PubSub();</b>
<b>+┊ ┊4┊</b>
<b>+┊ ┊5┊export default pubsub;</b>
</pre>

[}]: #

We're going to need the same `executableSchema` we created in `server/index.js`, so let’s pull out executableSchema from `server/index.js` and put it inside `server/data/schema.js` so other files can use `executableSchema`.

[{]: <helper> (diffStep 6.3)

#### Step 6.3: Refactor schema.js to export executableSchema

##### Changed server&#x2F;data&#x2F;schema.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊import { addMockFunctionsToSchema, makeExecutableSchema } from &#x27;graphql-tools&#x27;;</b>
<b>+┊ ┊2┊</b>
<b>+┊ ┊3┊import { Mocks } from &#x27;./mocks&#x27;;</b>
<b>+┊ ┊4┊import { Resolvers } from &#x27;./resolvers&#x27;;</b>
<b>+┊ ┊5┊</b>
 ┊1┊6┊export const Schema &#x3D; [&#x60;
 ┊2┊7┊  # declare custom scalars
 ┊3┊8┊  scalar Date
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊66┊71┊  }
 ┊67┊72┊&#x60;];
 ┊68┊73┊
<b>+┊  ┊74┊export const executableSchema &#x3D; makeExecutableSchema({</b>
<b>+┊  ┊75┊  typeDefs: Schema,</b>
<b>+┊  ┊76┊  resolvers: Resolvers,</b>
<b>+┊  ┊77┊});</b>
<b>+┊  ┊78┊</b>
<b>+┊  ┊79┊// addMockFunctionsToSchema({</b>
<b>+┊  ┊80┊//   schema: executableSchema,</b>
<b>+┊  ┊81┊//   mocks: Mocks,</b>
<b>+┊  ┊82┊//   preserveResolvers: true,</b>
<b>+┊  ┊83┊// });</b>
<b>+┊  ┊84┊</b>
<b>+┊  ┊85┊export default executableSchema;</b>
</pre>

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import express from &#x27;express&#x27;;
 ┊ 2┊ 2┊import { graphqlExpress, graphiqlExpress } from &#x27;graphql-server-express&#x27;;
 ┊ 4┊ 3┊import bodyParser from &#x27;body-parser&#x27;;
 ┊ 5┊ 4┊import { createServer } from &#x27;http&#x27;;
 ┊ 6┊ 5┊
<b>+┊  ┊ 6┊import { executableSchema } from &#x27;./data/schema&#x27;;</b>
 ┊10┊ 7┊
 ┊11┊ 8┊const GRAPHQL_PORT &#x3D; 8080;
 ┊12┊ 9┊const app &#x3D; express();
 ┊13┊10┊
 ┊27┊11┊// &#x60;context&#x60; must be an object and can&#x27;t be undefined when using connectors
 ┊28┊12┊app.use(&#x27;/graphql&#x27;, bodyParser.json(), graphqlExpress({
 ┊29┊13┊  schema: executableSchema,
</pre>

[}]: #

Now that we’ve created a `PubSub`, we can use this class to publish and subscribe to events as they occur in our Resolvers.

We can modify `server/data/resolvers.js` as follows:

[{]: <helper> (diffStep 6.4)

#### Step 6.4: Add Subscription to Resolvers

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import GraphQLDate from &#x27;graphql-date&#x27;;
 ┊2┊2┊
 ┊3┊3┊import { Group, Message, User } from &#x27;./connectors&#x27;;
<b>+┊ ┊4┊import { pubsub } from &#x27;../subscriptions&#x27;;</b>
<b>+┊ ┊5┊</b>
<b>+┊ ┊6┊const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;</b>
 ┊4┊7┊
 ┊5┊8┊export const Resolvers &#x3D; {
 ┊6┊9┊  Date: GraphQLDate,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊24┊27┊        userId,
 ┊25┊28┊        text,
 ┊26┊29┊        groupId,
<b>+┊  ┊30┊      }).then((message) &#x3D;&gt; {</b>
<b>+┊  ┊31┊        // publish subscription notification with the whole message</b>
<b>+┊  ┊32┊        pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });</b>
<b>+┊  ┊33┊        return message;</b>
 ┊27┊34┊      });
 ┊28┊35┊    },
 ┊29┊36┊    createGroup(_, { name, userIds, userId }) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊59┊66┊        .then(group &#x3D;&gt; group.update({ name }));
 ┊60┊67┊    },
 ┊61┊68┊  },
<b>+┊  ┊69┊  Subscription: {</b>
<b>+┊  ┊70┊    messageAdded: {</b>
<b>+┊  ┊71┊      // the subscription payload is the message.</b>
<b>+┊  ┊72┊      subscribe: () &#x3D;&gt; pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),</b>
<b>+┊  ┊73┊    },</b>
<b>+┊  ┊74┊  },</b>
 ┊62┊75┊  Group: {
 ┊63┊76┊    users(group) {
 ┊64┊77┊      return group.getUsers();
</pre>

[}]: #

Whenever a user creates a message, we trigger `pubsub` to publish the `messageAdded` event along with the newly created message. `PubSub` will emit an event to any clients subscribed to `messageAdded` and pass them the new message.

But we only want to emit this event to clients who care about the message because it was sent to one of their user’s groups! We can modify our implementation to filter who gets the event emission:

[{]: <helper> (diffStep 6.5)

#### Step 6.5: Add withFilter to messageAdded

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import GraphQLDate from &#x27;graphql-date&#x27;;
<b>+┊ ┊2┊import { withFilter } from &#x27;graphql-subscriptions&#x27;;</b>
 ┊2┊3┊
 ┊3┊4┊import { Group, Message, User } from &#x27;./connectors&#x27;;
 ┊4┊5┊import { pubsub } from &#x27;../subscriptions&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊68┊69┊  },
 ┊69┊70┊  Subscription: {
 ┊70┊71┊    messageAdded: {
<b>+┊  ┊72┊      subscribe: withFilter(</b>
<b>+┊  ┊73┊        () &#x3D;&gt; pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),</b>
<b>+┊  ┊74┊        (payload, args) &#x3D;&gt; {</b>
<b>+┊  ┊75┊          return Boolean(args.groupIds &amp;&amp; ~args.groupIds.indexOf(payload.messageAdded.groupId));</b>
<b>+┊  ┊76┊        },</b>
<b>+┊  ┊77┊      ),</b>
 ┊73┊78┊    },
 ┊74┊79┊  },
 ┊75┊80┊  Group: {
</pre>

[}]: #

Using `withFilter`, we create a `filter` which returns true when the `groupId` of a new message matches one of the `groupIds` passed into our `messageAdded` subscription. This filter will be applied whenever `pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message })` is triggered, and only clients whose subscriptions pass the filter will receive the message.

Our Resolvers are all set up. Time to hook our server up to WebSockets!

## Creating the SubscriptionServer
Our server will serve subscriptions via WebSockets, keeping an open connection with clients. `subscription-transport-ws` exposes a `SubscriptionServer` module that, when given a server, an endpoint, and the `execute` and `subscribe` modules from `graphql`, will tie everything together. The `SubscriptionServer` will rely on the Resolvers to manage emitting events to subscribed clients over the endpoint via WebSockets. How cool is that?!

Inside `server/index.js`, let’s attach a new `SubscriptionServer` to our current server and have it use `ws://localhost:3000/subscriptions` (`SUBSCRIPTIONS_PATH`) as our subscription endpoint:

[{]: <helper> (diffStep 6.6)

#### Step 6.6: Create SubscriptionServer

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 2┊ 2┊import { graphqlExpress, graphiqlExpress } from &#x27;graphql-server-express&#x27;;
 ┊ 3┊ 3┊import bodyParser from &#x27;body-parser&#x27;;
 ┊ 4┊ 4┊import { createServer } from &#x27;http&#x27;;
<b>+┊  ┊ 5┊import { SubscriptionServer } from &#x27;subscriptions-transport-ws&#x27;;</b>
<b>+┊  ┊ 6┊import { execute, subscribe } from &#x27;graphql&#x27;;</b>
 ┊ 5┊ 7┊
 ┊ 6┊ 8┊import { executableSchema } from &#x27;./data/schema&#x27;;
 ┊ 7┊ 9┊
 ┊ 8┊10┊const GRAPHQL_PORT &#x3D; 8080;
<b>+┊  ┊11┊const GRAPHQL_PATH &#x3D; &#x27;/graphql&#x27;;</b>
<b>+┊  ┊12┊const SUBSCRIPTIONS_PATH &#x3D; &#x27;/subscriptions&#x27;;</b>
<b>+┊  ┊13┊</b>
 ┊ 9┊14┊const app &#x3D; express();
 ┊10┊15┊
 ┊11┊16┊// &#x60;context&#x60; must be an object and can&#x27;t be undefined when using connectors
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊15┊20┊}));
 ┊16┊21┊
 ┊17┊22┊app.use(&#x27;/graphiql&#x27;, graphiqlExpress({
<b>+┊  ┊23┊  endpointURL: GRAPHQL_PATH,</b>
<b>+┊  ┊24┊  subscriptionsEndpoint: &#x60;ws://localhost:${GRAPHQL_PORT}${SUBSCRIPTIONS_PATH}&#x60;,</b>
 ┊19┊25┊}));
 ┊20┊26┊
 ┊21┊27┊const graphQLServer &#x3D; createServer(app);
 ┊22┊28┊
<b>+┊  ┊29┊graphQLServer.listen(GRAPHQL_PORT, () &#x3D;&gt; {</b>
<b>+┊  ┊30┊  console.log(&#x60;GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}${GRAPHQL_PATH}&#x60;);</b>
<b>+┊  ┊31┊  console.log(&#x60;GraphQL Subscriptions are now running on ws://localhost:${GRAPHQL_PORT}${SUBSCRIPTIONS_PATH}&#x60;);</b>
<b>+┊  ┊32┊});</b>
<b>+┊  ┊33┊</b>
<b>+┊  ┊34┊// eslint-disable-next-line no-unused-vars</b>
<b>+┊  ┊35┊const subscriptionServer &#x3D; SubscriptionServer.create({</b>
<b>+┊  ┊36┊  schema: executableSchema,</b>
<b>+┊  ┊37┊  execute,</b>
<b>+┊  ┊38┊  subscribe,</b>
<b>+┊  ┊39┊}, {</b>
<b>+┊  ┊40┊  server: graphQLServer,</b>
<b>+┊  ┊41┊  path: SUBSCRIPTIONS_PATH,</b>
<b>+┊  ┊42┊});</b>
</pre>

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
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊62┊62┊    # Subscription fires on every message added
 ┊63┊63┊    # for any of the groups with one of these groupIds
 ┊64┊64┊    messageAdded(groupIds: [Int]): Message
<b>+┊  ┊65┊    groupAdded(userId: Int): Group</b>
 ┊65┊66┊  }
 ┊66┊67┊  
 ┊67┊68┊  schema {
</pre>

[}]: #

2. Publish to the subscription when a new `Group` is created and resolve the subscription in the Resolvers:

[{]: <helper> (diffStep 6.8)

#### Step 6.8: Add groupAdded to Resolvers

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 5┊ 5┊import { pubsub } from &#x27;../subscriptions&#x27;;
 ┊ 6┊ 6┊
 ┊ 7┊ 7┊const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;
<b>+┊  ┊ 8┊const GROUP_ADDED_TOPIC &#x3D; &#x27;groupAdded&#x27;;</b>
 ┊ 8┊ 9┊
 ┊ 9┊10┊export const Resolvers &#x3D; {
 ┊10┊11┊  Date: GraphQLDate,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊42┊43┊            users: [user, ...friends],
 ┊43┊44┊          })
 ┊44┊45┊            .then(group &#x3D;&gt; group.addUsers([user, ...friends])
<b>+┊  ┊46┊              .then((res) &#x3D;&gt; {</b>
<b>+┊  ┊47┊                // append the user list to the group object</b>
<b>+┊  ┊48┊                // to pass to pubsub so we can check members</b>
<b>+┊  ┊49┊                group.users &#x3D; [user, ...friends];</b>
<b>+┊  ┊50┊                pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });</b>
<b>+┊  ┊51┊                return group;</b>
<b>+┊  ┊52┊              })),</b>
 ┊47┊53┊          ),
 ┊48┊54┊        );
 ┊49┊55┊    },
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊76┊82┊        },
 ┊77┊83┊      ),
 ┊78┊84┊    },
<b>+┊  ┊85┊    groupAdded: {</b>
<b>+┊  ┊86┊      subscribe: () &#x3D;&gt; pubsub.asyncIterator(GROUP_ADDED_TOPIC),</b>
<b>+┊  ┊87┊    },</b>
 ┊79┊88┊  },
 ┊80┊89┊  Group: {
 ┊81┊90┊    users(group) {
</pre>

[}]: #

3. Filter the recipients of the emitted new group with `withFilter`:

[{]: <helper> (diffStep 6.9)

#### Step 6.9: Add withFilter to groupAdded

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import GraphQLDate from &#x27;graphql-date&#x27;;
 ┊2┊2┊import { withFilter } from &#x27;graphql-subscriptions&#x27;;
<b>+┊ ┊3┊import { map } from &#x27;lodash&#x27;;</b>
 ┊3┊4┊
 ┊4┊5┊import { Group, Message, User } from &#x27;./connectors&#x27;;
 ┊5┊6┊import { pubsub } from &#x27;../subscriptions&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊83┊84┊      ),
 ┊84┊85┊    },
 ┊85┊86┊    groupAdded: {
<b>+┊  ┊87┊      subscribe: withFilter(</b>
<b>+┊  ┊88┊        () &#x3D;&gt; pubsub.asyncIterator(GROUP_ADDED_TOPIC),</b>
<b>+┊  ┊89┊        (payload, args) &#x3D;&gt; {</b>
<b>+┊  ┊90┊          return Boolean(args.userId &amp;&amp; ~map(payload.groupAdded.users, &#x27;id&#x27;).indexOf(args.userId));</b>
<b>+┊  ┊91┊        },</b>
<b>+┊  ┊92┊      ),</b>
 ┊87┊93┊    },
 ┊88┊94┊  },
 ┊89┊95┊  Group: {
</pre>

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
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 4┊ 4┊import { createStore, combineReducers, applyMiddleware } from &#x27;redux&#x27;;
 ┊ 5┊ 5┊import { composeWithDevTools } from &#x27;redux-devtools-extension&#x27;;
 ┊ 6┊ 6┊import ApolloClient, { createNetworkInterface } from &#x27;apollo-client&#x27;;
<b>+┊  ┊ 7┊import { SubscriptionClient, addGraphQLSubscriptions } from &#x27;subscriptions-transport-ws&#x27;;</b>
 ┊ 7┊ 8┊
 ┊ 8┊ 9┊import AppWithNavigationState, { navigationReducer } from &#x27;./navigation&#x27;;
 ┊ 9┊10┊
 ┊10┊11┊const networkInterface &#x3D; createNetworkInterface({ uri: &#x27;http://localhost:8080/graphql&#x27; });
<b>+┊  ┊12┊</b>
<b>+┊  ┊13┊// Create WebSocket client</b>
<b>+┊  ┊14┊const wsClient &#x3D; new SubscriptionClient(&#x27;ws://localhost:8080/subscriptions&#x27;, {</b>
<b>+┊  ┊15┊  reconnect: true,</b>
<b>+┊  ┊16┊  connectionParams: {</b>
<b>+┊  ┊17┊    // Pass any arguments you want for initialization</b>
<b>+┊  ┊18┊  },</b>
<b>+┊  ┊19┊});</b>
<b>+┊  ┊20┊</b>
<b>+┊  ┊21┊// Extend the network interface with the WebSocket</b>
<b>+┊  ┊22┊const networkInterfaceWithSubscriptions &#x3D; addGraphQLSubscriptions(</b>
 ┊12┊23┊  networkInterface,
<b>+┊  ┊24┊  wsClient,</b>
<b>+┊  ┊25┊);</b>
<b>+┊  ┊26┊</b>
<b>+┊  ┊27┊const client &#x3D; new ApolloClient({</b>
<b>+┊  ┊28┊  networkInterface: networkInterfaceWithSubscriptions,</b>
 ┊13┊29┊});
 ┊14┊30┊
 ┊15┊31┊const store &#x3D; createStore(
</pre>

[}]: #

That’s it — we’re ready to start adding subscriptions!

# Designing GraphQL Subscriptions
Our GraphQL Subscriptions are going to be ridiculously easy to write now that we’ve had practice with queries and mutations. We’ll first write our `messageAdded` subscription in a new file `client/src/graphql/message-added.subscription.js`:

[{]: <helper> (diffStep 6.11)

#### Step 6.11: Create MESSAGE_ADDED_SUBSCRIPTION

##### Added client&#x2F;src&#x2F;graphql&#x2F;message-added.subscription.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import gql from &#x27;graphql-tag&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b>+┊  ┊ 4┊</b>
<b>+┊  ┊ 5┊const MESSAGE_ADDED_SUBSCRIPTION &#x3D; gql&#x60;</b>
<b>+┊  ┊ 6┊  subscription onMessageAdded($groupIds: [Int]){</b>
<b>+┊  ┊ 7┊    messageAdded(groupIds: $groupIds){</b>
<b>+┊  ┊ 8┊      ... MessageFragment</b>
<b>+┊  ┊ 9┊    }</b>
<b>+┊  ┊10┊  }</b>
<b>+┊  ┊11┊  ${MESSAGE_FRAGMENT}</b>
<b>+┊  ┊12┊&#x60;;</b>
<b>+┊  ┊13┊</b>
<b>+┊  ┊14┊export default MESSAGE_ADDED_SUBSCRIPTION;</b>
</pre>

[}]: #

I’ve retitled the subscription `onMessageAdded` to distinguish the name from the subscription itself.

The `groupAdded` component will look extremely similar:

[{]: <helper> (diffStep 6.12)

#### Step 6.12: Create GROUP_ADDED_SUBSCRIPTION

##### Added client&#x2F;src&#x2F;graphql&#x2F;group-added.subscription.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import gql from &#x27;graphql-tag&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b>+┊  ┊ 4┊</b>
<b>+┊  ┊ 5┊const GROUP_ADDED_SUBSCRIPTION &#x3D; gql&#x60;</b>
<b>+┊  ┊ 6┊  subscription onGroupAdded($userId: Int){</b>
<b>+┊  ┊ 7┊    groupAdded(userId: $userId){</b>
<b>+┊  ┊ 8┊      id</b>
<b>+┊  ┊ 9┊      name</b>
<b>+┊  ┊10┊      messages(limit: 1) {</b>
<b>+┊  ┊11┊        ... MessageFragment</b>
<b>+┊  ┊12┊      }</b>
<b>+┊  ┊13┊    }</b>
<b>+┊  ┊14┊  }</b>
<b>+┊  ┊15┊  ${MESSAGE_FRAGMENT}</b>
<b>+┊  ┊16┊&#x60;;</b>
<b>+┊  ┊17┊</b>
<b>+┊  ┊18┊export default GROUP_ADDED_SUBSCRIPTION;🚫↵</b>
</pre>

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
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊18┊18┊import MessageInput from &#x27;../components/message-input.component&#x27;;
 ┊19┊19┊import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;
 ┊20┊20┊import CREATE_MESSAGE_MUTATION from &#x27;../graphql/create-message.mutation&#x27;;
<b>+┊  ┊21┊import MESSAGE_ADDED_SUBSCRIPTION from &#x27;../graphql/message-added.subscription&#x27;;</b>
 ┊21┊22┊
 ┊22┊23┊const styles &#x3D; StyleSheet.create({
 ┊23┊24┊  container: {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊101┊102┊        });
 ┊102┊103┊      }
 ┊103┊104┊
<b>+┊   ┊105┊      // we don&#x27;t resubscribe on changed props</b>
<b>+┊   ┊106┊      // because it never happens in our app</b>
<b>+┊   ┊107┊      if (!this.subscription) {</b>
<b>+┊   ┊108┊        this.subscription &#x3D; nextProps.subscribeToMore({</b>
<b>+┊   ┊109┊          document: MESSAGE_ADDED_SUBSCRIPTION,</b>
<b>+┊   ┊110┊          variables: { groupIds: [nextProps.navigation.state.params.groupId] },</b>
<b>+┊   ┊111┊          updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {</b>
<b>+┊   ┊112┊            const newMessage &#x3D; subscriptionData.data.messageAdded;</b>
<b>+┊   ┊113┊            // if it&#x27;s our own mutation</b>
<b>+┊   ┊114┊            // we might get the subscription result</b>
<b>+┊   ┊115┊            // after the mutation result.</b>
<b>+┊   ┊116┊            if (isDuplicateMessage(</b>
<b>+┊   ┊117┊              newMessage, previousResult.group.messages)</b>
<b>+┊   ┊118┊            ) {</b>
<b>+┊   ┊119┊              return previousResult;</b>
<b>+┊   ┊120┊            }</b>
<b>+┊   ┊121┊            return update(previousResult, {</b>
<b>+┊   ┊122┊              group: {</b>
<b>+┊   ┊123┊                messages: {</b>
<b>+┊   ┊124┊                  $unshift: [newMessage],</b>
<b>+┊   ┊125┊                },</b>
<b>+┊   ┊126┊              },</b>
<b>+┊   ┊127┊            });</b>
<b>+┊   ┊128┊          },</b>
<b>+┊   ┊129┊        });</b>
<b>+┊   ┊130┊      }</b>
<b>+┊   ┊131┊</b>
 ┊104┊132┊      this.setState({
 ┊105┊133┊        usernameColors,
 ┊106┊134┊      });
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊180┊208┊  }),
 ┊181┊209┊  loading: PropTypes.bool,
 ┊182┊210┊  loadMoreEntries: PropTypes.func,
<b>+┊   ┊211┊  subscribeToMore: PropTypes.func,</b>
 ┊183┊212┊};
 ┊184┊213┊
 ┊185┊214┊const ITEMS_PER_PAGE &#x3D; 10;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊191┊220┊      limit: ITEMS_PER_PAGE,
 ┊192┊221┊    },
 ┊193┊222┊  }),
<b>+┊   ┊223┊  props: ({ data: { fetchMore, loading, group, subscribeToMore } }) &#x3D;&gt; ({</b>
 ┊195┊224┊    loading,
 ┊196┊225┊    group,
<b>+┊   ┊226┊    subscribeToMore,</b>
 ┊197┊227┊    loadMoreEntries() {
 ┊198┊228┊      return fetchMore({
 ┊199┊229┊        // query: ... (you can specify a different query.
</pre>

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
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import PropTypes from &#x27;prop-types&#x27;;
<b>+┊  ┊ 2┊import React, { Component } from &#x27;react&#x27;;</b>
 ┊ 3┊ 3┊import { addNavigationHelpers, StackNavigator, TabNavigator } from &#x27;react-navigation&#x27;;
 ┊ 4┊ 4┊import { Text, View, StyleSheet } from &#x27;react-native&#x27;;
 ┊ 5┊ 5┊import { connect } from &#x27;react-redux&#x27;;
<b>+┊  ┊ 6┊import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b>+┊  ┊ 7┊import update from &#x27;immutability-helper&#x27;;</b>
<b>+┊  ┊ 8┊import { map } from &#x27;lodash&#x27;;</b>
 ┊ 6┊ 9┊
 ┊ 7┊10┊import Groups from &#x27;./screens/groups.screen&#x27;;
 ┊ 8┊11┊import Messages from &#x27;./screens/messages.screen&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊10┊13┊import GroupDetails from &#x27;./screens/group-details.screen&#x27;;
 ┊11┊14┊import NewGroup from &#x27;./screens/new-group.screen&#x27;;
 ┊12┊15┊
<b>+┊  ┊16┊import { USER_QUERY } from &#x27;./graphql/user.query&#x27;;</b>
<b>+┊  ┊17┊import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;</b>
<b>+┊  ┊18┊import GROUP_ADDED_SUBSCRIPTION from &#x27;./graphql/group-added.subscription&#x27;;</b>
<b>+┊  ┊19┊</b>
<b>+┊  ┊20┊// helper function checks for duplicate documents</b>
<b>+┊  ┊21┊// TODO: it&#x27;s pretty inefficient to scan all the documents every time.</b>
<b>+┊  ┊22┊// maybe only scan the first 10, or up to a certain timestamp</b>
<b>+┊  ┊23┊function isDuplicateDocument(newDocument, existingDocuments) {</b>
<b>+┊  ┊24┊  return newDocument.id !&#x3D;&#x3D; null &amp;&amp; existingDocuments.some(doc &#x3D;&gt; newDocument.id &#x3D;&#x3D;&#x3D; doc.id);</b>
<b>+┊  ┊25┊}</b>
<b>+┊  ┊26┊</b>
 ┊13┊27┊const styles &#x3D; StyleSheet.create({
 ┊14┊28┊  container: {
 ┊15┊29┊    flex: 1,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 71┊ 85┊  return nextState || state;
 ┊ 72┊ 86┊};
 ┊ 73┊ 87┊
<b>+┊   ┊ 88┊class AppWithNavigationState extends Component {</b>
<b>+┊   ┊ 89┊  componentWillReceiveProps(nextProps) {</b>
<b>+┊   ┊ 90┊    if (!nextProps.user) {</b>
<b>+┊   ┊ 91┊      if (this.groupSubscription) {</b>
<b>+┊   ┊ 92┊        this.groupSubscription();</b>
<b>+┊   ┊ 93┊      }</b>
<b>+┊   ┊ 94┊</b>
<b>+┊   ┊ 95┊      if (this.messagesSubscription) {</b>
<b>+┊   ┊ 96┊        this.messagesSubscription();</b>
<b>+┊   ┊ 97┊      }</b>
<b>+┊   ┊ 98┊    }</b>
<b>+┊   ┊ 99┊</b>
<b>+┊   ┊100┊    if (nextProps.user &amp;&amp;</b>
<b>+┊   ┊101┊      (!this.props.user || nextProps.user.groups.length !&#x3D;&#x3D; this.props.user.groups.length)) {</b>
<b>+┊   ┊102┊      // unsubscribe from old</b>
<b>+┊   ┊103┊</b>
<b>+┊   ┊104┊      if (typeof this.messagesSubscription &#x3D;&#x3D;&#x3D; &#x27;function&#x27;) {</b>
<b>+┊   ┊105┊        this.messagesSubscription();</b>
<b>+┊   ┊106┊      }</b>
<b>+┊   ┊107┊      // subscribe to new</b>
<b>+┊   ┊108┊      if (nextProps.user.groups.length) {</b>
<b>+┊   ┊109┊        this.messagesSubscription &#x3D; nextProps.subscribeToMessages();</b>
<b>+┊   ┊110┊      }</b>
<b>+┊   ┊111┊    }</b>
<b>+┊   ┊112┊</b>
<b>+┊   ┊113┊    if (!this.groupSubscription &amp;&amp; nextProps.user) {</b>
<b>+┊   ┊114┊      this.groupSubscription &#x3D; nextProps.subscribeToGroups();</b>
<b>+┊   ┊115┊    }</b>
<b>+┊   ┊116┊  }</b>
<b>+┊   ┊117┊</b>
<b>+┊   ┊118┊  render() {</b>
<b>+┊   ┊119┊    const { dispatch, nav } &#x3D; this.props;</b>
<b>+┊   ┊120┊    return &lt;AppNavigator navigation&#x3D;{addNavigationHelpers({ dispatch, state: nav })} /&gt;;</b>
<b>+┊   ┊121┊  }</b>
<b>+┊   ┊122┊}</b>
 ┊ 77┊123┊
 ┊ 78┊124┊AppWithNavigationState.propTypes &#x3D; {
 ┊ 79┊125┊  dispatch: PropTypes.func.isRequired,
 ┊ 80┊126┊  nav: PropTypes.object.isRequired,
<b>+┊   ┊127┊  subscribeToGroups: PropTypes.func,</b>
<b>+┊   ┊128┊  subscribeToMessages: PropTypes.func,</b>
<b>+┊   ┊129┊  user: PropTypes.shape({</b>
<b>+┊   ┊130┊    id: PropTypes.number.isRequired,</b>
<b>+┊   ┊131┊    email: PropTypes.string.isRequired,</b>
<b>+┊   ┊132┊    groups: PropTypes.arrayOf(</b>
<b>+┊   ┊133┊      PropTypes.shape({</b>
<b>+┊   ┊134┊        id: PropTypes.number.isRequired,</b>
<b>+┊   ┊135┊        name: PropTypes.string.isRequired,</b>
<b>+┊   ┊136┊      }),</b>
<b>+┊   ┊137┊    ),</b>
<b>+┊   ┊138┊  }),</b>
 ┊ 81┊139┊};
 ┊ 82┊140┊
 ┊ 83┊141┊const mapStateToProps &#x3D; state &#x3D;&gt; ({
 ┊ 84┊142┊  nav: state.nav,
 ┊ 85┊143┊});
 ┊ 86┊144┊
<b>+┊   ┊145┊const userQuery &#x3D; graphql(USER_QUERY, {</b>
<b>+┊   ┊146┊  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now</b>
<b>+┊   ┊147┊  props: ({ data: { loading, user, subscribeToMore } }) &#x3D;&gt; ({</b>
<b>+┊   ┊148┊    loading,</b>
<b>+┊   ┊149┊    user,</b>
<b>+┊   ┊150┊    subscribeToMessages() {</b>
<b>+┊   ┊151┊      return subscribeToMore({</b>
<b>+┊   ┊152┊        document: MESSAGE_ADDED_SUBSCRIPTION,</b>
<b>+┊   ┊153┊        variables: { groupIds: map(user.groups, &#x27;id&#x27;) },</b>
<b>+┊   ┊154┊        updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {</b>
<b>+┊   ┊155┊          const previousGroups &#x3D; previousResult.user.groups;</b>
<b>+┊   ┊156┊          const newMessage &#x3D; subscriptionData.data.messageAdded;</b>
<b>+┊   ┊157┊</b>
<b>+┊   ┊158┊          const groupIndex &#x3D; map(previousGroups, &#x27;id&#x27;).indexOf(newMessage.to.id);</b>
<b>+┊   ┊159┊</b>
<b>+┊   ┊160┊          // if it&#x27;s our own mutation</b>
<b>+┊   ┊161┊          // we might get the subscription result</b>
<b>+┊   ┊162┊          // after the mutation result.</b>
<b>+┊   ┊163┊          if (isDuplicateDocument(newMessage, previousGroups[groupIndex].messages)) {</b>
<b>+┊   ┊164┊            return previousResult;</b>
<b>+┊   ┊165┊          }</b>
<b>+┊   ┊166┊</b>
<b>+┊   ┊167┊          return update(previousResult, {</b>
<b>+┊   ┊168┊            user: {</b>
<b>+┊   ┊169┊              groups: {</b>
<b>+┊   ┊170┊                [groupIndex]: {</b>
<b>+┊   ┊171┊                  messages: { $set: [newMessage] },</b>
<b>+┊   ┊172┊                },</b>
<b>+┊   ┊173┊              },</b>
<b>+┊   ┊174┊            },</b>
<b>+┊   ┊175┊          });</b>
<b>+┊   ┊176┊        },</b>
<b>+┊   ┊177┊      });</b>
<b>+┊   ┊178┊    },</b>
<b>+┊   ┊179┊    subscribeToGroups() {</b>
<b>+┊   ┊180┊      return subscribeToMore({</b>
<b>+┊   ┊181┊        document: GROUP_ADDED_SUBSCRIPTION,</b>
<b>+┊   ┊182┊        variables: { userId: user.id },</b>
<b>+┊   ┊183┊        updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {</b>
<b>+┊   ┊184┊          const previousGroups &#x3D; previousResult.user.groups;</b>
<b>+┊   ┊185┊          const newGroup &#x3D; subscriptionData.data.groupAdded;</b>
<b>+┊   ┊186┊</b>
<b>+┊   ┊187┊          // if it&#x27;s our own mutation</b>
<b>+┊   ┊188┊          // we might get the subscription result</b>
<b>+┊   ┊189┊          // after the mutation result.</b>
<b>+┊   ┊190┊          if (isDuplicateDocument(newGroup, previousGroups)) {</b>
<b>+┊   ┊191┊            return previousResult;</b>
<b>+┊   ┊192┊          }</b>
<b>+┊   ┊193┊</b>
<b>+┊   ┊194┊          return update(previousResult, {</b>
<b>+┊   ┊195┊            user: {</b>
<b>+┊   ┊196┊              groups: { $push: [newGroup] },</b>
<b>+┊   ┊197┊            },</b>
<b>+┊   ┊198┊          });</b>
<b>+┊   ┊199┊        },</b>
<b>+┊   ┊200┊      });</b>
<b>+┊   ┊201┊    },</b>
<b>+┊   ┊202┊  }),</b>
<b>+┊   ┊203┊});</b>
<b>+┊   ┊204┊</b>
<b>+┊   ┊205┊export default compose(</b>
<b>+┊   ┊206┊  connect(mapStateToProps),</b>
<b>+┊   ┊207┊  userQuery,</b>
<b>+┊   ┊208┊)(AppWithNavigationState);</b>
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊186┊186┊    const { loading, user, networkStatus } &#x3D; this.props;
 ┊187┊187┊
 ┊188┊188┊    // render loading placeholder while we fetch messages
<b>+┊   ┊189┊    if (loading || !user) {</b>
 ┊190┊190┊      return (
 ┊191┊191┊        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;
 ┊192┊192┊          &lt;ActivityIndicator /&gt;
</pre>

[}]: #

We have to do a little extra work to guarantee that our `messageSubscription` updates when we add or remove new groups. Otherwise, if a new group is created and someone sends a message, the user won’t be subscribed to receive that new message. When we need to update the subscription, we unsubscribe by calling the subscription as a function `messageSubscription()` and then reset `messageSubscription` to reflect the latest `nextProps.subscribeToMessages`.

One of the cooler things about Apollo is it caches all the queries and data that we've fetched and reuses data for the same query in the future instead of requesting it from the network (unless we specify otherwise). `USER_QUERY` will  make a request to the network and then data will be reused for subsequent executions. Our app setup tracks any data changes with subscriptions, so we only end up requesting the data we need from the server once!

Final product: ![Final Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step6-14.gif)
[{]: <helper> (navStep)

⟸ <a href="step5.md">PREVIOUS STEP</a> <b>║</b> <a href="step7.md">NEXT STEP</a> ⟹

[}]: #

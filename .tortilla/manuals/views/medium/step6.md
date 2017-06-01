# Step 6: GraphQL Subscriptions

[//]: # (head-end)


This is the sixth blog in a multipart series where we will be building Chatty, a WhatsApp clone, using [React Native](https://facebook.github.io/react-native/) and [Apollo](http://dev.apollodata.com/).

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
 ┊67┊67┊    leaveGroup(id: Int!, userId: Int!): Group # let user leave group
 ┊68┊68┊    updateGroup(id: Int!, name: String): Group
 ┊69┊69┊  }
<b>+┊  ┊70┊</b>
<b>+┊  ┊71┊  type Subscription {</b>
<b>+┊  ┊72┊    # Subscription fires on every message added</b>
<b>+┊  ┊73┊    # for any of the groups with one of these groupIds</b>
<b>+┊  ┊74┊    messageAdded(userId: Int, groupIds: [Int]): Message</b>
<b>+┊  ┊75┊  }</b>
 ┊70┊76┊  
 ┊71┊77┊  schema {
 ┊72┊78┊    query: Query
 ┊73┊79┊    mutation: Mutation
<b>+┊  ┊80┊    subscription: Subscription</b>
 ┊74┊81┊  }
 ┊75┊82┊&#x60;];
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
 ┊ 81┊ 86┊  }
 ┊ 82┊ 87┊&#x60;];
 ┊ 83┊ 88┊
<b>+┊   ┊ 89┊export const executableSchema &#x3D; makeExecutableSchema({</b>
<b>+┊   ┊ 90┊  typeDefs: Schema,</b>
<b>+┊   ┊ 91┊  resolvers: Resolvers,</b>
<b>+┊   ┊ 92┊});</b>
<b>+┊   ┊ 93┊</b>
<b>+┊   ┊ 94┊// addMockFunctionsToSchema({</b>
<b>+┊   ┊ 95┊//   schema: executableSchema,</b>
<b>+┊   ┊ 96┊//   mocks: Mocks,</b>
<b>+┊   ┊ 97┊//   preserveResolvers: true,</b>
<b>+┊   ┊ 98┊// });</b>
<b>+┊   ┊ 99┊</b>
<b>+┊   ┊100┊export default executableSchema;</b>
</pre>

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import express from &#x27;express&#x27;;
 ┊ 2┊ 2┊import { graphqlExpress, graphiqlExpress } from &#x27;apollo-server-express&#x27;;
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
 ┊2┊2┊import { Group, Message, User } from &#x27;./connectors&#x27;;
<b>+┊ ┊3┊import { pubsub } from &#x27;../subscriptions&#x27;;</b>
<b>+┊ ┊4┊</b>
<b>+┊ ┊5┊const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;</b>
 ┊3┊6┊
 ┊4┊7┊export const Resolvers &#x3D; {
 ┊5┊8┊  Date: GraphQLDate,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊32┊35┊        userId,
 ┊33┊36┊        text,
 ┊34┊37┊        groupId,
<b>+┊  ┊38┊      }).then((message) &#x3D;&gt; {</b>
<b>+┊  ┊39┊        // publish subscription notification with the whole message</b>
<b>+┊  ┊40┊        pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });</b>
<b>+┊  ┊41┊        return message;</b>
 ┊35┊42┊      });
 ┊36┊43┊    },
 ┊37┊44┊    createGroup(_, { name, userIds, userId }) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊73┊80┊        .then(group &#x3D;&gt; group.update({ name }));
 ┊74┊81┊    },
 ┊75┊82┊  },
<b>+┊  ┊83┊  Subscription: {</b>
<b>+┊  ┊84┊    messageAdded: {</b>
<b>+┊  ┊85┊      // the subscription payload is the message.</b>
<b>+┊  ┊86┊      subscribe: () &#x3D;&gt; pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),</b>
<b>+┊  ┊87┊    },</b>
<b>+┊  ┊88┊  },</b>
 ┊76┊89┊  Group: {
 ┊77┊90┊    users(group) {
 ┊78┊91┊      return group.getUsers();
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
<b>+┊ ┊3┊</b>
 ┊2┊4┊import { Group, Message, User } from &#x27;./connectors&#x27;;
 ┊3┊5┊import { pubsub } from &#x27;../subscriptions&#x27;;
 ┊4┊6┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊82┊84┊  },
 ┊83┊85┊  Subscription: {
 ┊84┊86┊    messageAdded: {
<b>+┊  ┊87┊      subscribe: withFilter(</b>
<b>+┊  ┊88┊        () &#x3D;&gt; pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),</b>
<b>+┊  ┊89┊        (payload, args) &#x3D;&gt; {</b>
<b>+┊  ┊90┊          return Boolean(</b>
<b>+┊  ┊91┊            args.groupIds &amp;&amp;</b>
<b>+┊  ┊92┊            ~args.groupIds.indexOf(payload.messageAdded.groupId) &amp;&amp;</b>
<b>+┊  ┊93┊            args.userId !&#x3D;&#x3D; payload.messageAdded.userId, // don&#x27;t send to user creating message</b>
<b>+┊  ┊94┊          );</b>
<b>+┊  ┊95┊        },</b>
<b>+┊  ┊96┊      ),</b>
 ┊87┊97┊    },
 ┊88┊98┊  },
 ┊89┊99┊  Group: {
</pre>

[}]: #

Using `withFilter`, we create a `filter` which returns true when the `groupId` of a new message matches one of the `groupIds` passed into our `messageAdded` subscription. This filter will be applied whenever `pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message })` is triggered, and only clients whose subscriptions pass the filter will receive the message.

Our Resolvers are all set up. Time to hook our server up to WebSockets!

## Creating the SubscriptionServer
Our server will serve subscriptions via WebSockets, keeping an open connection with clients. `subscription-transport-ws` exposes a `SubscriptionServer` module that, when given a server, an endpoint, and the `execute` and `subscribe` modules from `graphql`, will tie everything together. The `SubscriptionServer` will rely on the Resolvers to manage emitting events to subscribed clients over the endpoint via WebSockets. How cool is that?!

Inside `server/index.js`, let’s attach a new `SubscriptionServer` to our current server and have it use `ws://localhost:8080/subscriptions` (`SUBSCRIPTIONS_PATH`) as our subscription endpoint:

[{]: <helper> (diffStep 6.6)

#### Step 6.6: Create SubscriptionServer

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 2┊ 2┊import { graphqlExpress, graphiqlExpress } from &#x27;apollo-server-express&#x27;;
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
 ┊77┊77┊    # Subscription fires on every message added
 ┊78┊78┊    # for any of the groups with one of these groupIds
 ┊79┊79┊    messageAdded(userId: Int, groupIds: [Int]): Message
<b>+┊  ┊80┊    groupAdded(userId: Int): Group</b>
 ┊80┊81┊  }
 ┊81┊82┊  
 ┊82┊83┊  schema {
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
 ┊51┊52┊            users: [user, ...friends],
 ┊52┊53┊          })
 ┊53┊54┊            .then(group &#x3D;&gt; group.addUsers([user, ...friends])
<b>+┊  ┊55┊              .then((res) &#x3D;&gt; {</b>
<b>+┊  ┊56┊                // append the user list to the group object</b>
<b>+┊  ┊57┊                // to pass to pubsub so we can check members</b>
<b>+┊  ┊58┊                group.users &#x3D; [user, ...friends];</b>
<b>+┊  ┊59┊                pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });</b>
<b>+┊  ┊60┊                return group;</b>
<b>+┊  ┊61┊              })),</b>
 ┊56┊62┊          ),
 ┊57┊63┊        );
 ┊58┊64┊    },
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 95┊101┊        },
 ┊ 96┊102┊      ),
 ┊ 97┊103┊    },
<b>+┊   ┊104┊    groupAdded: {</b>
<b>+┊   ┊105┊      subscribe: () &#x3D;&gt; pubsub.asyncIterator(GROUP_ADDED_TOPIC),</b>
<b>+┊   ┊106┊    },</b>
 ┊ 98┊107┊  },
 ┊ 99┊108┊  Group: {
 ┊100┊109┊    users(group) {
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
 ┊102┊103┊      ),
 ┊103┊104┊    },
 ┊104┊105┊    groupAdded: {
<b>+┊   ┊106┊      subscribe: withFilter(</b>
<b>+┊   ┊107┊        () &#x3D;&gt; pubsub.asyncIterator(GROUP_ADDED_TOPIC),</b>
<b>+┊   ┊108┊        (payload, args) &#x3D;&gt; {</b>
<b>+┊   ┊109┊          return Boolean(</b>
<b>+┊   ┊110┊            args.userId &amp;&amp;</b>
<b>+┊   ┊111┊            ~map(payload.groupAdded.users, &#x27;id&#x27;).indexOf(args.userId) &amp;&amp;</b>
<b>+┊   ┊112┊            args.userId !&#x3D;&#x3D; payload.groupAdded.users[0].id, // don&#x27;t send to user creating group</b>
<b>+┊   ┊113┊          );</b>
<b>+┊   ┊114┊        },</b>
<b>+┊   ┊115┊      ),</b>
 ┊106┊116┊    },
 ┊107┊117┊  },
 ┊108┊118┊  Group: {
</pre>

[}]: #

All set!

# GraphQL Subscriptions on the Client
Time to add subscriptions inside our React Native client. We’ll start by adding a few packages to our client:
```
# make sure you're adding the package in the client!!!
cd client
yarn add apollo-link-ws apollo-utilities subscriptions-transport-ws
```

We’ll use `subscription-transport-ws` on the client to create a WebSocket client connected to our `/subscriptions` endpoint. We then add this client into our Apollo workflow via `apollo-link-ws`. We need to split the various operations that flow through Apollo into `subscription` operations and non-subscription (`query` and `mutation`) and handle them with the appropriate links:

[{]: <helper> (diffStep "6.10" files="client/src/app.js")

#### Step 6.10: Add wsClient to networkInterface

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 9┊ 9┊import { Provider } from &#x27;react-redux&#x27;;
 ┊10┊10┊import { ReduxCache, apolloReducer } from &#x27;apollo-cache-redux&#x27;;
 ┊11┊11┊import ReduxLink from &#x27;apollo-link-redux&#x27;;
<b>+┊  ┊12┊import { WebSocketLink } from &#x27;apollo-link-ws&#x27;;</b>
<b>+┊  ┊13┊import { getMainDefinition } from &#x27;apollo-utilities&#x27;;</b>
<b>+┊  ┊14┊import { SubscriptionClient } from &#x27;subscriptions-transport-ws&#x27;;</b>
 ┊12┊15┊
 ┊13┊16┊import AppWithNavigationState, {
 ┊14┊17┊  navigationReducer,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊34┊37┊
 ┊35┊38┊const httpLink &#x3D; createHttpLink({ uri: &#x60;http://${URL}/graphql&#x60; });
 ┊36┊39┊
<b>+┊  ┊40┊// Create WebSocket client</b>
<b>+┊  ┊41┊export const wsClient &#x3D; new SubscriptionClient(&#x60;ws://${URL}/subscriptions&#x60;, {</b>
<b>+┊  ┊42┊  reconnect: true,</b>
<b>+┊  ┊43┊  connectionParams: {</b>
<b>+┊  ┊44┊    // Pass any arguments you want for initialization</b>
<b>+┊  ┊45┊  },</b>
<b>+┊  ┊46┊});</b>
<b>+┊  ┊47┊</b>
<b>+┊  ┊48┊const webSocketLink &#x3D; new WebSocketLink(wsClient);</b>
<b>+┊  ┊49┊</b>
<b>+┊  ┊50┊const requestLink &#x3D; ({ queryOrMutationLink, subscriptionLink }) &#x3D;&gt;</b>
<b>+┊  ┊51┊  ApolloLink.split(</b>
<b>+┊  ┊52┊    ({ query }) &#x3D;&gt; {</b>
<b>+┊  ┊53┊      const { kind, operation } &#x3D; getMainDefinition(query);</b>
<b>+┊  ┊54┊      return kind &#x3D;&#x3D;&#x3D; &#x27;OperationDefinition&#x27; &amp;&amp; operation &#x3D;&#x3D;&#x3D; &#x27;subscription&#x27;;</b>
<b>+┊  ┊55┊    },</b>
<b>+┊  ┊56┊    subscriptionLink,</b>
<b>+┊  ┊57┊    queryOrMutationLink,</b>
<b>+┊  ┊58┊  );</b>
<b>+┊  ┊59┊</b>
 ┊37┊60┊const link &#x3D; ApolloLink.from([
 ┊38┊61┊  reduxLink,
<b>+┊  ┊62┊  requestLink({</b>
<b>+┊  ┊63┊    queryOrMutationLink: httpLink,</b>
<b>+┊  ┊64┊    subscriptionLink: webSocketLink,</b>
<b>+┊  ┊65┊  }),</b>
 ┊40┊66┊]);
 ┊41┊67┊
 ┊42┊68┊export const client &#x3D; new ApolloClient({
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
<b>+┊  ┊ 6┊  subscription onMessageAdded($userId: Int, $groupIds: [Int]){</b>
<b>+┊  ┊ 7┊    messageAdded(userId: $userId, groupIds: $groupIds){</b>
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
<b>+┊  ┊10┊      messages(first: 1) {</b>
<b>+┊  ┊11┊        edges {</b>
<b>+┊  ┊12┊          cursor</b>
<b>+┊  ┊13┊          node {</b>
<b>+┊  ┊14┊            ... MessageFragment</b>
<b>+┊  ┊15┊          }</b>
<b>+┊  ┊16┊        }</b>
<b>+┊  ┊17┊      }</b>
<b>+┊  ┊18┊    }</b>
<b>+┊  ┊19┊  }</b>
<b>+┊  ┊20┊  ${MESSAGE_FRAGMENT}</b>
<b>+┊  ┊21┊&#x60;;</b>
<b>+┊  ┊22┊</b>
<b>+┊  ┊23┊export default GROUP_ADDED_SUBSCRIPTION;</b>
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
 ┊17┊17┊import _ from &#x27;lodash&#x27;;
 ┊18┊18┊import moment from &#x27;moment&#x27;;
 ┊19┊19┊
<b>+┊  ┊20┊import { wsClient } from &#x27;../app&#x27;;</b>
 ┊20┊21┊import Message from &#x27;../components/message.component&#x27;;
 ┊21┊22┊import MessageInput from &#x27;../components/message-input.component&#x27;;
 ┊22┊23┊import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;
 ┊23┊24┊import CREATE_MESSAGE_MUTATION from &#x27;../graphql/create-message.mutation&#x27;;
 ┊24┊25┊import USER_QUERY from &#x27;../graphql/user.query&#x27;;
<b>+┊  ┊26┊import MESSAGE_ADDED_SUBSCRIPTION from &#x27;../graphql/message-added.subscription&#x27;;</b>
 ┊25┊27┊
 ┊26┊28┊const styles &#x3D; StyleSheet.create({
 ┊27┊29┊  container: {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊107┊109┊        });
 ┊108┊110┊      }
 ┊109┊111┊
<b>+┊   ┊112┊      // we don&#x27;t resubscribe on changed props</b>
<b>+┊   ┊113┊      // because it never happens in our app</b>
<b>+┊   ┊114┊      if (!this.subscription) {</b>
<b>+┊   ┊115┊        this.subscription &#x3D; nextProps.subscribeToMore({</b>
<b>+┊   ┊116┊          document: MESSAGE_ADDED_SUBSCRIPTION,</b>
<b>+┊   ┊117┊          variables: {</b>
<b>+┊   ┊118┊            userId: 1, // fake the user for now</b>
<b>+┊   ┊119┊            groupIds: [nextProps.navigation.state.params.groupId],</b>
<b>+┊   ┊120┊          },</b>
<b>+┊   ┊121┊          updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {</b>
<b>+┊   ┊122┊            const newMessage &#x3D; subscriptionData.data.messageAdded;</b>
<b>+┊   ┊123┊</b>
<b>+┊   ┊124┊            return update(previousResult, {</b>
<b>+┊   ┊125┊              group: {</b>
<b>+┊   ┊126┊                messages: {</b>
<b>+┊   ┊127┊                  edges: {</b>
<b>+┊   ┊128┊                    $unshift: [{</b>
<b>+┊   ┊129┊                      __typename: &#x27;MessageEdge&#x27;,</b>
<b>+┊   ┊130┊                      node: newMessage,</b>
<b>+┊   ┊131┊                      cursor: Buffer.from(newMessage.id.toString()).toString(&#x27;base64&#x27;),</b>
<b>+┊   ┊132┊                    }],</b>
<b>+┊   ┊133┊                  },</b>
<b>+┊   ┊134┊                },</b>
<b>+┊   ┊135┊              },</b>
<b>+┊   ┊136┊            });</b>
<b>+┊   ┊137┊          },</b>
<b>+┊   ┊138┊        });</b>
<b>+┊   ┊139┊      }</b>
<b>+┊   ┊140┊</b>
 ┊110┊141┊      this.setState({
 ┊111┊142┊        usernameColors,
 ┊112┊143┊      });
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊211┊242┊  }),
 ┊212┊243┊  loading: PropTypes.bool,
 ┊213┊244┊  loadMoreEntries: PropTypes.func,
<b>+┊   ┊245┊  subscribeToMore: PropTypes.func,</b>
 ┊214┊246┊};
 ┊215┊247┊
 ┊216┊248┊const ITEMS_PER_PAGE &#x3D; 10;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊221┊253┊      first: ITEMS_PER_PAGE,
 ┊222┊254┊    },
 ┊223┊255┊  }),
<b>+┊   ┊256┊  props: ({ data: { fetchMore, loading, group, subscribeToMore } }) &#x3D;&gt; ({</b>
 ┊225┊257┊    loading,
 ┊226┊258┊    group,
<b>+┊   ┊259┊    subscribeToMore,</b>
 ┊227┊260┊    loadMoreEntries() {
 ┊228┊261┊      return fetchMore({
 ┊229┊262┊        // query: ... (you can specify a different query.
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
 ┊ 7┊ 7┊} from &#x27;react-navigation-redux-helpers&#x27;;
 ┊ 8┊ 8┊import { Text, View, StyleSheet } from &#x27;react-native&#x27;;
 ┊ 9┊ 9┊import { connect } from &#x27;react-redux&#x27;;
<b>+┊  ┊10┊import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b>+┊  ┊11┊import update from &#x27;immutability-helper&#x27;;</b>
<b>+┊  ┊12┊import { map } from &#x27;lodash&#x27;;</b>
<b>+┊  ┊13┊import { Buffer } from &#x27;buffer&#x27;;</b>
 ┊10┊14┊
 ┊11┊15┊import Groups from &#x27;./screens/groups.screen&#x27;;
 ┊12┊16┊import Messages from &#x27;./screens/messages.screen&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊14┊18┊import GroupDetails from &#x27;./screens/group-details.screen&#x27;;
 ┊15┊19┊import NewGroup from &#x27;./screens/new-group.screen&#x27;;
 ┊16┊20┊
<b>+┊  ┊21┊import { USER_QUERY } from &#x27;./graphql/user.query&#x27;;</b>
<b>+┊  ┊22┊import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;</b>
<b>+┊  ┊23┊import GROUP_ADDED_SUBSCRIPTION from &#x27;./graphql/group-added.subscription&#x27;;</b>
<b>+┊  ┊24┊</b>
 ┊17┊25┊const styles &#x3D; StyleSheet.create({
 ┊18┊26┊  container: {
 ┊19┊27┊    flex: 1,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 82┊ 90┊const addListener &#x3D; createReduxBoundAddListener(&quot;root&quot;);
 ┊ 83┊ 91┊
 ┊ 84┊ 92┊class AppWithNavigationState extends Component {
<b>+┊   ┊ 93┊  componentWillReceiveProps(nextProps) {</b>
<b>+┊   ┊ 94┊    if (!nextProps.user) {</b>
<b>+┊   ┊ 95┊      if (this.groupSubscription) {</b>
<b>+┊   ┊ 96┊        this.groupSubscription();</b>
<b>+┊   ┊ 97┊      }</b>
<b>+┊   ┊ 98┊</b>
<b>+┊   ┊ 99┊      if (this.messagesSubscription) {</b>
<b>+┊   ┊100┊        this.messagesSubscription();</b>
<b>+┊   ┊101┊      }</b>
<b>+┊   ┊102┊    }</b>
<b>+┊   ┊103┊</b>
<b>+┊   ┊104┊    if (nextProps.user &amp;&amp;</b>
<b>+┊   ┊105┊      (!this.props.user || nextProps.user.groups.length !&#x3D;&#x3D; this.props.user.groups.length)) {</b>
<b>+┊   ┊106┊      // unsubscribe from old</b>
<b>+┊   ┊107┊</b>
<b>+┊   ┊108┊      if (typeof this.messagesSubscription &#x3D;&#x3D;&#x3D; &#x27;function&#x27;) {</b>
<b>+┊   ┊109┊        this.messagesSubscription();</b>
<b>+┊   ┊110┊      }</b>
<b>+┊   ┊111┊      // subscribe to new</b>
<b>+┊   ┊112┊      if (nextProps.user.groups.length) {</b>
<b>+┊   ┊113┊        this.messagesSubscription &#x3D; nextProps.subscribeToMessages();</b>
<b>+┊   ┊114┊      }</b>
<b>+┊   ┊115┊    }</b>
<b>+┊   ┊116┊</b>
<b>+┊   ┊117┊    if (!this.groupSubscription &amp;&amp; nextProps.user) {</b>
<b>+┊   ┊118┊      this.groupSubscription &#x3D; nextProps.subscribeToGroups();</b>
<b>+┊   ┊119┊    }</b>
<b>+┊   ┊120┊  }</b>
<b>+┊   ┊121┊</b>
 ┊ 85┊122┊  render() {
 ┊ 86┊123┊    return (
 ┊ 87┊124┊      &lt;AppNavigator navigation&#x3D;{addNavigationHelpers({
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 93┊130┊  }
 ┊ 94┊131┊}
 ┊ 95┊132┊
<b>+┊   ┊133┊AppWithNavigationState.propTypes &#x3D; {</b>
<b>+┊   ┊134┊  dispatch: PropTypes.func.isRequired,</b>
<b>+┊   ┊135┊  nav: PropTypes.object.isRequired,</b>
<b>+┊   ┊136┊  subscribeToGroups: PropTypes.func,</b>
<b>+┊   ┊137┊  subscribeToMessages: PropTypes.func,</b>
<b>+┊   ┊138┊  user: PropTypes.shape({</b>
<b>+┊   ┊139┊    id: PropTypes.number.isRequired,</b>
<b>+┊   ┊140┊    email: PropTypes.string.isRequired,</b>
<b>+┊   ┊141┊    groups: PropTypes.arrayOf(</b>
<b>+┊   ┊142┊      PropTypes.shape({</b>
<b>+┊   ┊143┊        id: PropTypes.number.isRequired,</b>
<b>+┊   ┊144┊        name: PropTypes.string.isRequired,</b>
<b>+┊   ┊145┊      }),</b>
<b>+┊   ┊146┊    ),</b>
<b>+┊   ┊147┊  }),</b>
<b>+┊   ┊148┊};</b>
<b>+┊   ┊149┊</b>
 ┊ 96┊150┊const mapStateToProps &#x3D; state &#x3D;&gt; ({
 ┊ 97┊151┊  nav: state.nav,
 ┊ 98┊152┊});
 ┊ 99┊153┊
<b>+┊   ┊154┊const userQuery &#x3D; graphql(USER_QUERY, {</b>
<b>+┊   ┊155┊  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now</b>
<b>+┊   ┊156┊  props: ({ data: { loading, user, subscribeToMore } }) &#x3D;&gt; ({</b>
<b>+┊   ┊157┊    loading,</b>
<b>+┊   ┊158┊    user,</b>
<b>+┊   ┊159┊    subscribeToMessages() {</b>
<b>+┊   ┊160┊      return subscribeToMore({</b>
<b>+┊   ┊161┊        document: MESSAGE_ADDED_SUBSCRIPTION,</b>
<b>+┊   ┊162┊        variables: {</b>
<b>+┊   ┊163┊          userId: 1, // fake the user for now</b>
<b>+┊   ┊164┊          groupIds: map(user.groups, &#x27;id&#x27;),</b>
<b>+┊   ┊165┊        },</b>
<b>+┊   ┊166┊        updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {</b>
<b>+┊   ┊167┊          const previousGroups &#x3D; previousResult.user.groups;</b>
<b>+┊   ┊168┊          const newMessage &#x3D; subscriptionData.data.messageAdded;</b>
<b>+┊   ┊169┊</b>
<b>+┊   ┊170┊          const groupIndex &#x3D; map(previousGroups, &#x27;id&#x27;).indexOf(newMessage.to.id);</b>
<b>+┊   ┊171┊</b>
<b>+┊   ┊172┊          return update(previousResult, {</b>
<b>+┊   ┊173┊            user: {</b>
<b>+┊   ┊174┊              groups: {</b>
<b>+┊   ┊175┊                [groupIndex]: {</b>
<b>+┊   ┊176┊                  messages: {</b>
<b>+┊   ┊177┊                    edges: {</b>
<b>+┊   ┊178┊                      $set: [{</b>
<b>+┊   ┊179┊                        __typename: &#x27;MessageEdge&#x27;,</b>
<b>+┊   ┊180┊                        node: newMessage,</b>
<b>+┊   ┊181┊                        cursor: Buffer.from(newMessage.id.toString()).toString(&#x27;base64&#x27;),</b>
<b>+┊   ┊182┊                      }],</b>
<b>+┊   ┊183┊                    },</b>
<b>+┊   ┊184┊                  },</b>
<b>+┊   ┊185┊                },</b>
<b>+┊   ┊186┊              },</b>
<b>+┊   ┊187┊            },</b>
<b>+┊   ┊188┊          });</b>
<b>+┊   ┊189┊        },</b>
<b>+┊   ┊190┊      });</b>
<b>+┊   ┊191┊    },</b>
<b>+┊   ┊192┊    subscribeToGroups() {</b>
<b>+┊   ┊193┊      return subscribeToMore({</b>
<b>+┊   ┊194┊        document: GROUP_ADDED_SUBSCRIPTION,</b>
<b>+┊   ┊195┊        variables: { userId: user.id },</b>
<b>+┊   ┊196┊        updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {</b>
<b>+┊   ┊197┊          const newGroup &#x3D; subscriptionData.data.groupAdded;</b>
<b>+┊   ┊198┊</b>
<b>+┊   ┊199┊          return update(previousResult, {</b>
<b>+┊   ┊200┊            user: {</b>
<b>+┊   ┊201┊              groups: { $push: [newGroup] },</b>
<b>+┊   ┊202┊            },</b>
<b>+┊   ┊203┊          });</b>
<b>+┊   ┊204┊        },</b>
<b>+┊   ┊205┊      });</b>
<b>+┊   ┊206┊    },</b>
<b>+┊   ┊207┊  }),</b>
<b>+┊   ┊208┊});</b>
<b>+┊   ┊209┊</b>
<b>+┊   ┊210┊export default compose(</b>
<b>+┊   ┊211┊  connect(mapStateToProps),</b>
<b>+┊   ┊212┊  userQuery,</b>
<b>+┊   ┊213┊)(AppWithNavigationState);</b>
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊191┊191┊    const { loading, user, networkStatus } &#x3D; this.props;
 ┊192┊192┊
 ┊193┊193┊    // render loading placeholder while we fetch messages
<b>+┊   ┊194┊    if (loading || !user) {</b>
 ┊195┊195┊      return (
 ┊196┊196┊        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;
 ┊197┊197┊          &lt;ActivityIndicator /&gt;
</pre>

[}]: #

We have to do a little extra work to guarantee that our `messageSubscription` updates when we add or remove new groups. Otherwise, if a new group is created and someone sends a message, the user won’t be subscribed to receive that new message. When we need to update the subscription, we unsubscribe by calling the subscription as a function `messageSubscription()` and then reset `messageSubscription` to reflect the latest `nextProps.subscribeToMessages`.

One of the cooler things about Apollo is it caches all the queries and data that we've fetched and reuses data for the same query in the future instead of requesting it from the network (unless we specify otherwise). `USER_QUERY` will  make a request to the network and then data will be reused for subsequent executions. Our app setup tracks any data changes with subscriptions, so we only end up requesting the data we need from the server once!

## Handling broken connections
We need to do one more step to make sure our app stays updated in real-time. Sometimes users will lose internet connectivity or the WebSocket might disconnect temporarily. During these blackout periods, our client won't receive any subscription events, so our app won't receive new messages or groups. `subscriptions-transport-ws` has a built-in reconnecting mechanism, but it won't track any missed subscription events.

The simplest way to handle this issue is to refetch all relevant queries when our app reconnects. `wsClient` exposes an `onReconnected` function that will call the supplied callback function when the WebSocket reconnects. We can simply call `refetch` on our queries in the callback.

[{]: <helper> (diffStep 6.15)

#### Step 6.15: Apply onReconnected to refetch missed subscription events

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊22┊22┊import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;
 ┊23┊23┊import GROUP_ADDED_SUBSCRIPTION from &#x27;./graphql/group-added.subscription&#x27;;
 ┊24┊24┊
<b>+┊  ┊25┊import { wsClient } from &#x27;./app&#x27;;</b>
<b>+┊  ┊26┊</b>
 ┊25┊27┊const styles &#x3D; StyleSheet.create({
 ┊26┊28┊  container: {
 ┊27┊29┊    flex: 1,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 99┊101┊      if (this.messagesSubscription) {
 ┊100┊102┊        this.messagesSubscription();
 ┊101┊103┊      }
<b>+┊   ┊104┊</b>
<b>+┊   ┊105┊      // clear the event subscription</b>
<b>+┊   ┊106┊      if (this.reconnected) {</b>
<b>+┊   ┊107┊        this.reconnected();</b>
<b>+┊   ┊108┊      }</b>
<b>+┊   ┊109┊    } else if (!this.reconnected) {</b>
<b>+┊   ┊110┊      this.reconnected &#x3D; wsClient.onReconnected(() &#x3D;&gt; {</b>
<b>+┊   ┊111┊        this.props.refetch(); // check for any data lost during disconnect</b>
<b>+┊   ┊112┊      }, this);</b>
 ┊102┊113┊    }
 ┊103┊114┊
 ┊104┊115┊    if (nextProps.user &amp;&amp;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊133┊144┊AppWithNavigationState.propTypes &#x3D; {
 ┊134┊145┊  dispatch: PropTypes.func.isRequired,
 ┊135┊146┊  nav: PropTypes.object.isRequired,
<b>+┊   ┊147┊  refetch: PropTypes.func,</b>
 ┊136┊148┊  subscribeToGroups: PropTypes.func,
 ┊137┊149┊  subscribeToMessages: PropTypes.func,
 ┊138┊150┊  user: PropTypes.shape({
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊153┊165┊
 ┊154┊166┊const userQuery &#x3D; graphql(USER_QUERY, {
 ┊155┊167┊  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
<b>+┊   ┊168┊  props: ({ data: { loading, user, refetch, subscribeToMore } }) &#x3D;&gt; ({</b>
 ┊157┊169┊    loading,
 ┊158┊170┊    user,
<b>+┊   ┊171┊    refetch,</b>
 ┊159┊172┊    subscribeToMessages() {
 ┊160┊173┊      return subscribeToMore({
 ┊161┊174┊        document: MESSAGE_ADDED_SUBSCRIPTION,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊138┊138┊        });
 ┊139┊139┊      }
 ┊140┊140┊
<b>+┊   ┊141┊      if (!this.reconnected) {</b>
<b>+┊   ┊142┊        this.reconnected &#x3D; wsClient.onReconnected(() &#x3D;&gt; {</b>
<b>+┊   ┊143┊          this.props.refetch(); // check for any data lost during disconnect</b>
<b>+┊   ┊144┊        }, this);</b>
<b>+┊   ┊145┊      }</b>
<b>+┊   ┊146┊</b>
 ┊141┊147┊      this.setState({
 ┊142┊148┊        usernameColors,
 ┊143┊149┊      });
<b>+┊   ┊150┊    } else if (this.reconnected) {</b>
<b>+┊   ┊151┊      // remove event subscription</b>
<b>+┊   ┊152┊      this.reconnected();</b>
 ┊144┊153┊    }
 ┊145┊154┊  }
 ┊146┊155┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊242┊251┊  }),
 ┊243┊252┊  loading: PropTypes.bool,
 ┊244┊253┊  loadMoreEntries: PropTypes.func,
<b>+┊   ┊254┊  refetch: PropTypes.func,</b>
 ┊245┊255┊  subscribeToMore: PropTypes.func,
 ┊246┊256┊};
 ┊247┊257┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊253┊263┊      first: ITEMS_PER_PAGE,
 ┊254┊264┊    },
 ┊255┊265┊  }),
<b>+┊   ┊266┊  props: ({ data: { fetchMore, loading, group, refetch, subscribeToMore } }) &#x3D;&gt; ({</b>
 ┊257┊267┊    loading,
 ┊258┊268┊    group,
<b>+┊   ┊269┊    refetch,</b>
 ┊259┊270┊    subscribeToMore,
 ┊260┊271┊    loadMoreEntries() {
 ┊261┊272┊      return fetchMore({
</pre>

[}]: #

Final product: ![Final Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step6-14.gif)


[//]: # (foot-start)

[{]: <helper> (navStep)

⟸ <a href="step5.md">PREVIOUS STEP</a> <b>║</b> <a href="step7.md">NEXT STEP</a> ⟹

[}]: #

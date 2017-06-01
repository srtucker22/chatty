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

#### [Step 6.1: Add Subscription to Schema](https://github.com/srtucker22/chatty/commit/cea4829)

##### Changed server&#x2F;data&#x2F;schema.js
<pre>

...

    leaveGroup(id: Int!, userId: Int!): Group # let user leave group
    updateGroup(id: Int!, name: String): Group
  }
<b></b>
<b>  type Subscription {</b>
<b>    # Subscription fires on every message added</b>
<b>    # for any of the groups with one of these groupIds</b>
<b>    messageAdded(userId: Int, groupIds: [Int]): Message</b>
<b>  }</b>
  
  schema {
    query: Query
    mutation: Mutation
<b>    subscription: Subscription</b>
  }
&#x60;;
</pre>

[}]: #

That’s it!

## GraphQL Subscription Infrastructure
Our Schema uses GraphQL Subscriptions, but our server has no way to handle them yet.

Fortunately, `apollo-server` comes prepacked with excellent tools to handle subscriptions right out the gate!

First, we’ll use `apollo-server` to create a `PubSub` manager. `PubSub` is basically just event emitters wrapped with a function that filters messages. It can easily be replaced later with something more scalable like [`graphql-redis-subscriptions`](https://github.com/davidyaha/graphql-redis-subscriptions).

Let’s create a new file `server/subscriptions.js` where we’ll keep any subscription infrastructure:

[{]: <helper> (diffStep 6.2 files="server/subscriptions.js")

#### [Step 6.2: Create subscriptions.js](https://github.com/srtucker22/chatty/commit/ecfb971)

##### Added server&#x2F;subscriptions.js
<pre>

...

<b>import { PubSub } from &#x27;apollo-server&#x27;;</b>
<b></b>
<b>export const pubsub &#x3D; new PubSub();</b>
<b></b>
<b>export default pubsub;</b>
</pre>

[}]: #

Now that we’ve created a `PubSub`, we can use this class to publish and subscribe to events as they occur in our Resolvers.

We can modify `server/data/resolvers.js` as follows:

[{]: <helper> (diffStep 6.3)

#### [Step 6.3: Add Subscription to Resolvers](https://github.com/srtucker22/chatty/commit/e39730d)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

import GraphQLDate from &#x27;graphql-date&#x27;;
import { Group, Message, User } from &#x27;./connectors&#x27;;
<b>import { pubsub } from &#x27;../subscriptions&#x27;;</b>
<b></b>
<b>const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;</b>

export const resolvers &#x3D; {
  Date: GraphQLDate,
</pre>
<pre>

...

        userId,
        text,
        groupId,
<b>      }).then((message) &#x3D;&gt; {</b>
<b>        // publish subscription notification with the whole message</b>
<b>        pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });</b>
<b>        return message;</b>
      });
    },
    createGroup(_, { name, userIds, userId }) {
</pre>
<pre>

...

        .then(group &#x3D;&gt; group.update({ name }));
    },
  },
<b>  Subscription: {</b>
<b>    messageAdded: {</b>
<b>      // the subscription payload is the message.</b>
<b>      subscribe: () &#x3D;&gt; pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),</b>
<b>    },</b>
<b>  },</b>
  Group: {
    users(group) {
      return group.getUsers();
</pre>

[}]: #

Whenever a user creates a message, we trigger `pubsub` to publish the `messageAdded` event along with the newly created message. `pubsub` will emit an event to any clients subscribed to `messageAdded` and pass them the new message.

But we only want to emit this event to clients who care about the message because it was sent to one of their user’s groups! We can modify our implementation to filter who gets the event emission:

[{]: <helper> (diffStep 6.4)

#### [Step 6.4: Add withFilter to messageAdded](https://github.com/srtucker22/chatty/commit/5a5d969)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

import GraphQLDate from &#x27;graphql-date&#x27;;
<b>import { withFilter } from &#x27;apollo-server&#x27;;</b>
<b></b>
import { Group, Message, User } from &#x27;./connectors&#x27;;
import { pubsub } from &#x27;../subscriptions&#x27;;

</pre>
<pre>

...

  },
  Subscription: {
    messageAdded: {
<b>      subscribe: withFilter(</b>
<b>        () &#x3D;&gt; pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),</b>
<b>        (payload, args) &#x3D;&gt; {</b>
<b>          return Boolean(</b>
<b>            args.groupIds &amp;&amp;</b>
<b>            ~args.groupIds.indexOf(payload.messageAdded.groupId) &amp;&amp;</b>
<b>            args.userId !&#x3D;&#x3D; payload.messageAdded.userId, // don&#x27;t send to user creating message</b>
<b>          );</b>
<b>        },</b>
<b>      ),</b>
    },
  },
  Group: {
</pre>

[}]: #

Using `withFilter`, we create a `filter` which returns true when the `groupId` of a new message matches one of the `groupIds` passed into our `messageAdded` subscription. This filter will be applied whenever `pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message })` is triggered, and only clients whose subscriptions pass the filter will receive the message.

Our Resolvers are all set up.

## Putting it all together
Our `apollo-server` will automatically attempt to serve subscriptions via WebSockets as soon as we define subscriptions in our Schema -- how cool is that?! Whenever the `pubsub` iterators in our subscription resolvers receive events, it will filter which subscribed clients will receive the data, and then the server will push GraphQL responses over WebSockets to those clients. There's a whole lot of magic happening here. Let's verify it's all working:

A GraphQL Subscription is written on the client much like a query or mutation. For example, in GraphQL Playground, we could write the following GraphQL Subscription for `messageAdded`:

```graphql
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

Let’s check out GraphQL Playground and see if everything works: ![Playground Gif](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step6-4.gif)

## New Subscription Workflow
We’ve successfully set up GraphQL Subscriptions on our server.

Since we have the infrastructure in place, let’s add one more subscription for some extra practice. We can use the same methodology we used for subscribing to new `Messages` and apply it to new `Groups`. After all, it’s important that our users know right away that they’ve been added to a new group.

The steps are as follows:
1. Add the subscription to our Schema:

[{]: <helper> (diffStep 6.5)

#### [Step 6.5: Add groupAdded to Schema](https://github.com/srtucker22/chatty/commit/d320339)

##### Changed server&#x2F;data&#x2F;schema.js
<pre>

...

    # Subscription fires on every message added
    # for any of the groups with one of these groupIds
    messageAdded(userId: Int, groupIds: [Int]): Message
<b>    groupAdded(userId: Int): Group</b>
  }
  
  schema {
</pre>

[}]: #

2. Publish to the subscription when a new `Group` is created and resolve the subscription in the Resolvers:

[{]: <helper> (diffStep 6.6)

#### [Step 6.6: Add groupAdded to Resolvers](https://github.com/srtucker22/chatty/commit/c5188eb)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

import { pubsub } from &#x27;../subscriptions&#x27;;

const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;
<b>const GROUP_ADDED_TOPIC &#x3D; &#x27;groupAdded&#x27;;</b>

export const resolvers &#x3D; {
  Date: GraphQLDate,
</pre>
<pre>

...

            users: [user, ...friends],
          })
            .then(group &#x3D;&gt; group.addUsers([user, ...friends])
<b>              .then((res) &#x3D;&gt; {</b>
<b>                // append the user list to the group object</b>
<b>                // to pass to pubsub so we can check members</b>
<b>                group.users &#x3D; [user, ...friends];</b>
<b>                pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });</b>
<b>                return group;</b>
<b>              })),</b>
          ),
        );
    },
</pre>
<pre>

...

        },
      ),
    },
<b>    groupAdded: {</b>
<b>      subscribe: () &#x3D;&gt; pubsub.asyncIterator(GROUP_ADDED_TOPIC),</b>
<b>    },</b>
  },
  Group: {
    users(group) {
</pre>

[}]: #

3. Filter the recipients of the emitted new group with `withFilter`:

[{]: <helper> (diffStep 6.7)

#### [Step 6.7: Add withFilter to groupAdded](https://github.com/srtucker22/chatty/commit/162adc8)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

import GraphQLDate from &#x27;graphql-date&#x27;;
import { withFilter } from &#x27;apollo-server&#x27;;
<b>import { map } from &#x27;lodash&#x27;;</b>

import { Group, Message, User } from &#x27;./connectors&#x27;;
import { pubsub } from &#x27;../subscriptions&#x27;;
</pre>
<pre>

...

      ),
    },
    groupAdded: {
<b>      subscribe: withFilter(</b>
<b>        () &#x3D;&gt; pubsub.asyncIterator(GROUP_ADDED_TOPIC),</b>
<b>        (payload, args) &#x3D;&gt; {</b>
<b>          return Boolean(</b>
<b>            args.userId &amp;&amp;</b>
<b>            ~map(payload.groupAdded.users, &#x27;id&#x27;).indexOf(args.userId) &amp;&amp;</b>
<b>            args.userId !&#x3D;&#x3D; payload.groupAdded.users[0].id, // don&#x27;t send to user creating group</b>
<b>          );</b>
<b>        },</b>
<b>      ),</b>
    },
  },
  Group: {
</pre>

[}]: #

All set!

# GraphQL Subscriptions on the Client
Time to add subscriptions inside our React Native client. We’ll start by adding a few packages to our client:

```sh
# make sure you're adding the package in the client!!!
cd client
npm i apollo-link-ws apollo-utilities subscriptions-transport-ws
```

We’ll use `subscription-transport-ws` on the client to create a WebSocket client connected to our WebSocket endpoint. `apollo-server` **serves this endpoint at `/graphql` by default.**

We then add this WebSocket client into our Apollo workflow via `apollo-link-ws`. We need to split the various operations that flow through Apollo into `subscription` operations and non-subscription (`query` and `mutation`) and handle them with the appropriate links:

[{]: <helper> (diffStep "6.8")

#### [Step 6.8: Add wsClient to networkInterface](https://github.com/srtucker22/chatty/commit/94106f2)

##### Changed client&#x2F;package.json
<pre>

...

		&quot;apollo-link-error&quot;: &quot;^1.0.7&quot;,
		&quot;apollo-link-http&quot;: &quot;^1.3.3&quot;,
		&quot;apollo-link-redux&quot;: &quot;^0.2.1&quot;,
<b>		&quot;apollo-link-ws&quot;: &quot;^1.0.5&quot;,</b>
<b>		&quot;apollo-utilities&quot;: &quot;^1.0.6&quot;,</b>
		&quot;buffer&quot;: &quot;^5.0.8&quot;,
		&quot;graphql&quot;: &quot;^0.12.3&quot;,
		&quot;graphql-tag&quot;: &quot;^2.4.2&quot;,
</pre>
<pre>

...

		&quot;react-navigation-redux-helpers&quot;: &quot;^1.1.2&quot;,
		&quot;react-redux&quot;: &quot;^5.0.5&quot;,
		&quot;redux&quot;: &quot;^3.7.2&quot;,
<b>		&quot;redux-devtools-extension&quot;: &quot;^2.13.2&quot;,</b>
<b>		&quot;subscriptions-transport-ws&quot;: &quot;^0.9.5&quot;</b>
	},
	&quot;devDependencies&quot;: {
		&quot;babel-jest&quot;: &quot;23.4.0&quot;,
</pre>

##### Changed client&#x2F;src&#x2F;app.js
<pre>

...

import { ReduxCache, apolloReducer } from &#x27;apollo-cache-redux&#x27;;
import ReduxLink from &#x27;apollo-link-redux&#x27;;
import { onError } from &#x27;apollo-link-error&#x27;;
<b>import { WebSocketLink } from &#x27;apollo-link-ws&#x27;;</b>
<b>import { getMainDefinition } from &#x27;apollo-utilities&#x27;;</b>
<b>import { SubscriptionClient } from &#x27;subscriptions-transport-ws&#x27;;</b>

import AppWithNavigationState, {
  navigationReducer,
</pre>
<pre>

...


const httpLink &#x3D; createHttpLink({ uri: &#x60;http://${URL}&#x60; });

<b>// Create WebSocket client</b>
<b>export const wsClient &#x3D; new SubscriptionClient(&#x60;ws://${URL}/graphql&#x60;, {</b>
<b>  reconnect: true,</b>
<b>  connectionParams: {</b>
<b>    // Pass any arguments you want for initialization</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>const webSocketLink &#x3D; new WebSocketLink(wsClient);</b>
<b></b>
<b>const requestLink &#x3D; ({ queryOrMutationLink, subscriptionLink }) &#x3D;&gt;</b>
<b>  ApolloLink.split(</b>
<b>    ({ query }) &#x3D;&gt; {</b>
<b>      const { kind, operation } &#x3D; getMainDefinition(query);</b>
<b>      return kind &#x3D;&#x3D;&#x3D; &#x27;OperationDefinition&#x27; &amp;&amp; operation &#x3D;&#x3D;&#x3D; &#x27;subscription&#x27;;</b>
<b>    },</b>
<b>    subscriptionLink,</b>
<b>    queryOrMutationLink,</b>
<b>  );</b>
<b></b>
const link &#x3D; ApolloLink.from([
  reduxLink,
  errorLink,
<b>  requestLink({</b>
<b>    queryOrMutationLink: httpLink,</b>
<b>    subscriptionLink: webSocketLink,</b>
<b>  }),</b>
]);

export const client &#x3D; new ApolloClient({
</pre>

[}]: #

That’s it — we’re ready to start adding subscriptions!

# Designing GraphQL Subscriptions
Our GraphQL Subscriptions are going to be ridiculously easy to write now that we’ve had practice with queries and mutations. We’ll first write our `messageAdded` subscription in a new file `client/src/graphql/message-added.subscription.js`:

[{]: <helper> (diffStep 6.9)

#### [Step 6.9: Create MESSAGE_ADDED_SUBSCRIPTION](https://github.com/srtucker22/chatty/commit/f544e57)

##### Added client&#x2F;src&#x2F;graphql&#x2F;message-added.subscription.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b></b>
<b>const MESSAGE_ADDED_SUBSCRIPTION &#x3D; gql&#x60;</b>
<b>  subscription onMessageAdded($userId: Int, $groupIds: [Int]){</b>
<b>    messageAdded(userId: $userId, groupIds: $groupIds){</b>
<b>      ... MessageFragment</b>
<b>    }</b>
<b>  }</b>
<b>  ${MESSAGE_FRAGMENT}</b>
<b>&#x60;;</b>
<b></b>
<b>export default MESSAGE_ADDED_SUBSCRIPTION;</b>
</pre>

[}]: #

I’ve retitled the subscription `onMessageAdded` to distinguish the name from the subscription itself.

The `groupAdded` component will look extremely similar:

[{]: <helper> (diffStep "6.10")

#### [Step 6.10: Create GROUP_ADDED_SUBSCRIPTION](https://github.com/srtucker22/chatty/commit/3855986)

##### Added client&#x2F;src&#x2F;graphql&#x2F;group-added.subscription.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b></b>
<b>const GROUP_ADDED_SUBSCRIPTION &#x3D; gql&#x60;</b>
<b>  subscription onGroupAdded($userId: Int){</b>
<b>    groupAdded(userId: $userId){</b>
<b>      id</b>
<b>      name</b>
<b>      messages(first: 1) {</b>
<b>        edges {</b>
<b>          cursor</b>
<b>          node {</b>
<b>            ... MessageFragment</b>
<b>          }</b>
<b>        }</b>
<b>      }</b>
<b>    }</b>
<b>  }</b>
<b>  ${MESSAGE_FRAGMENT}</b>
<b>&#x60;;</b>
<b></b>
<b>export default GROUP_ADDED_SUBSCRIPTION;</b>
</pre>

[}]: #

Our subscriptions are fired up and ready to go. We just need to add them to our UI/UX and we’re finished.

## Connecting Subscriptions to Components
Our final step is to connect our new subscriptions to our React Native components.

Let’s first apply `messageAdded` to the `Messages` component. When a user is looking at messages within a group thread, we want new messages to pop onto the thread as they’re created.

The `graphql` module in `react-apollo` exposes a `prop` function named `subscribeToMore` that can attach subscriptions to a component. Inside the `subscribeToMore` function, we pass the subscription, variables, and tell the component how to modify query data state with `updateQuery`.

Take a look at the updated code in our `Messages` component in `client/src/screens/messages.screen.js`:

[{]: <helper> (diffStep 6.11)

#### [Step 6.11: Apply subscribeToMore to Messages](https://github.com/srtucker22/chatty/commit/ea2875a)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;
import CREATE_MESSAGE_MUTATION from &#x27;../graphql/create-message.mutation&#x27;;
import USER_QUERY from &#x27;../graphql/user.query&#x27;;
<b>import MESSAGE_ADDED_SUBSCRIPTION from &#x27;../graphql/message-added.subscription&#x27;;</b>

const styles &#x3D; StyleSheet.create({
  container: {
</pre>
<pre>

...

        });
      }

<b>      // we don&#x27;t resubscribe on changed props</b>
<b>      // because it never happens in our app</b>
<b>      if (!this.subscription) {</b>
<b>        this.subscription &#x3D; nextProps.subscribeToMore({</b>
<b>          document: MESSAGE_ADDED_SUBSCRIPTION,</b>
<b>          variables: {</b>
<b>            userId: 1, // fake the user for now</b>
<b>            groupIds: [nextProps.navigation.state.params.groupId],</b>
<b>          },</b>
<b>          updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {</b>
<b>            const newMessage &#x3D; subscriptionData.data.messageAdded;</b>
<b></b>
<b>            return update(previousResult, {</b>
<b>              group: {</b>
<b>                messages: {</b>
<b>                  edges: {</b>
<b>                    $unshift: [{</b>
<b>                      __typename: &#x27;MessageEdge&#x27;,</b>
<b>                      node: newMessage,</b>
<b>                      cursor: Buffer.from(newMessage.id.toString()).toString(&#x27;base64&#x27;),</b>
<b>                    }],</b>
<b>                  },</b>
<b>                },</b>
<b>              },</b>
<b>            });</b>
<b>          },</b>
<b>        });</b>
<b>      }</b>
<b></b>
      this.setState({
        usernameColors,
      });
</pre>
<pre>

...

  }),
  loading: PropTypes.bool,
  loadMoreEntries: PropTypes.func,
<b>  subscribeToMore: PropTypes.func,</b>
};

const ITEMS_PER_PAGE &#x3D; 10;
</pre>
<pre>

...

      first: ITEMS_PER_PAGE,
    },
  }),
<b>  props: ({ data: { fetchMore, loading, group, subscribeToMore } }) &#x3D;&gt; ({</b>
    loading,
    group,
<b>    subscribeToMore,</b>
    loadMoreEntries() {
      return fetchMore({
        // query: ... (you can specify a different query.
</pre>

[}]: #

After we connect `subscribeToMore` to the component’s props, we attach a subscription property on the component (so there’s only one) which initializes `subscribeToMore` with the required parameters. Inside `updateQuery`, when we receive a new message, we make sure its not a duplicate, and then unshift the message onto our collection of messages.

Does it work?! ![Working Image](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step6-11.gif)

We need to subscribe to new Groups and Messages so our Groups component will update in real time. The Groups component needs to subscribe to `groupAdded` and `messageAdded` because in addition to new groups popping up when they’re created, the latest messages should also show up in each group’s preview.

However, instead of using `subscribeToMore` in our Groups screen, we should actually consider applying these subscriptions to a higher order component (HOC) for our application. If we navigate away from the Groups screen at any point, we will unsubscribe and won't receive real-time updates while we're away from the screen. We'd need to refetch queries from the network when returning to the Groups screen to guarantee that our data is up to date.

If we attach our subscription to a higher order component, like `AppWithNavigationState`, we can stay subscribed to the subscriptions no matter where the user navigates and always keep our state up to date in real time!

Let's apply the `USER_QUERY` to `AppWithNavigationState` in `client/src/navigation.js` and include two subscriptions using `subscribeToMore` for new `Messages` and `Groups`:

[{]: <helper> (diffStep 6.12)

#### [Step 6.12: Apply subscribeToMore to AppWithNavigationState](https://github.com/srtucker22/chatty/commit/312a8ee)

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>

...

} from &#x27;react-navigation-redux-helpers&#x27;;
import { Text, View, StyleSheet } from &#x27;react-native&#x27;;
import { connect } from &#x27;react-redux&#x27;;
<b>import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b>import update from &#x27;immutability-helper&#x27;;</b>
<b>import { map } from &#x27;lodash&#x27;;</b>
<b>import { Buffer } from &#x27;buffer&#x27;;</b>

import Groups from &#x27;./screens/groups.screen&#x27;;
import Messages from &#x27;./screens/messages.screen&#x27;;
</pre>
<pre>

...

import GroupDetails from &#x27;./screens/group-details.screen&#x27;;
import NewGroup from &#x27;./screens/new-group.screen&#x27;;

<b>import { USER_QUERY } from &#x27;./graphql/user.query&#x27;;</b>
<b>import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;</b>
<b>import GROUP_ADDED_SUBSCRIPTION from &#x27;./graphql/group-added.subscription&#x27;;</b>
<b></b>
const styles &#x3D; StyleSheet.create({
  container: {
    flex: 1,
</pre>
<pre>

...

const addListener &#x3D; createReduxBoundAddListener(&quot;root&quot;);

class AppWithNavigationState extends Component {
<b>  componentWillReceiveProps(nextProps) {</b>
<b>    if (!nextProps.user) {</b>
<b>      if (this.groupSubscription) {</b>
<b>        this.groupSubscription();</b>
<b>      }</b>
<b></b>
<b>      if (this.messagesSubscription) {</b>
<b>        this.messagesSubscription();</b>
<b>      }</b>
<b>    }</b>
<b></b>
<b>    if (nextProps.user &amp;&amp;</b>
<b>      (!this.props.user || nextProps.user.groups.length !&#x3D;&#x3D; this.props.user.groups.length)) {</b>
<b>      // unsubscribe from old</b>
<b></b>
<b>      if (typeof this.messagesSubscription &#x3D;&#x3D;&#x3D; &#x27;function&#x27;) {</b>
<b>        this.messagesSubscription();</b>
<b>      }</b>
<b>      // subscribe to new</b>
<b>      if (nextProps.user.groups.length) {</b>
<b>        this.messagesSubscription &#x3D; nextProps.subscribeToMessages();</b>
<b>      }</b>
<b>    }</b>
<b></b>
<b>    if (!this.groupSubscription &amp;&amp; nextProps.user) {</b>
<b>      this.groupSubscription &#x3D; nextProps.subscribeToGroups();</b>
<b>    }</b>
<b>  }</b>
<b></b>
  render() {
    return (
      &lt;AppNavigator navigation&#x3D;{addNavigationHelpers({
</pre>
<pre>

...

  }
}

<b>AppWithNavigationState.propTypes &#x3D; {</b>
<b>  dispatch: PropTypes.func.isRequired,</b>
<b>  nav: PropTypes.object.isRequired,</b>
<b>  subscribeToGroups: PropTypes.func,</b>
<b>  subscribeToMessages: PropTypes.func,</b>
<b>  user: PropTypes.shape({</b>
<b>    id: PropTypes.number.isRequired,</b>
<b>    email: PropTypes.string.isRequired,</b>
<b>    groups: PropTypes.arrayOf(</b>
<b>      PropTypes.shape({</b>
<b>        id: PropTypes.number.isRequired,</b>
<b>        name: PropTypes.string.isRequired,</b>
<b>      }),</b>
<b>    ),</b>
<b>  }),</b>
<b>};</b>
<b></b>
const mapStateToProps &#x3D; state &#x3D;&gt; ({
  nav: state.nav,
});

<b>const userQuery &#x3D; graphql(USER_QUERY, {</b>
<b>  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now</b>
<b>  props: ({ data: { loading, user, subscribeToMore } }) &#x3D;&gt; ({</b>
<b>    loading,</b>
<b>    user,</b>
<b>    subscribeToMessages() {</b>
<b>      return subscribeToMore({</b>
<b>        document: MESSAGE_ADDED_SUBSCRIPTION,</b>
<b>        variables: {</b>
<b>          userId: 1, // fake the user for now</b>
<b>          groupIds: map(user.groups, &#x27;id&#x27;),</b>
<b>        },</b>
<b>        updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {</b>
<b>          const previousGroups &#x3D; previousResult.user.groups;</b>
<b>          const newMessage &#x3D; subscriptionData.data.messageAdded;</b>
<b></b>
<b>          const groupIndex &#x3D; map(previousGroups, &#x27;id&#x27;).indexOf(newMessage.to.id);</b>
<b></b>
<b>          return update(previousResult, {</b>
<b>            user: {</b>
<b>              groups: {</b>
<b>                [groupIndex]: {</b>
<b>                  messages: {</b>
<b>                    edges: {</b>
<b>                      $set: [{</b>
<b>                        __typename: &#x27;MessageEdge&#x27;,</b>
<b>                        node: newMessage,</b>
<b>                        cursor: Buffer.from(newMessage.id.toString()).toString(&#x27;base64&#x27;),</b>
<b>                      }],</b>
<b>                    },</b>
<b>                  },</b>
<b>                },</b>
<b>              },</b>
<b>            },</b>
<b>          });</b>
<b>        },</b>
<b>      });</b>
<b>    },</b>
<b>    subscribeToGroups() {</b>
<b>      return subscribeToMore({</b>
<b>        document: GROUP_ADDED_SUBSCRIPTION,</b>
<b>        variables: { userId: user.id },</b>
<b>        updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {</b>
<b>          const newGroup &#x3D; subscriptionData.data.groupAdded;</b>
<b></b>
<b>          return update(previousResult, {</b>
<b>            user: {</b>
<b>              groups: { $push: [newGroup] },</b>
<b>            },</b>
<b>          });</b>
<b>        },</b>
<b>      });</b>
<b>    },</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>export default compose(</b>
<b>  connect(mapStateToProps),</b>
<b>  userQuery,</b>
<b>)(AppWithNavigationState);</b>
</pre>

[}]: #

We have to do a little extra work to guarantee that our `messageSubscription` updates when we add or remove new groups. Otherwise, if a new group is created and someone sends a message, the user won’t be subscribed to receive that new message. When we need to update the subscription, we unsubscribe by calling the subscription as a function `messageSubscription()` and then reset `messageSubscription` to reflect the latest `nextProps.subscribeToMessages`.

One of the cooler things about Apollo is it caches all the queries and data that we've fetched and reuses data for the same query in the future instead of requesting it from the network (unless we specify otherwise). `USER_QUERY` will  make a request to the network and then data will be reused for subsequent executions. Our app setup tracks any data changes with subscriptions, so we only end up requesting the data we need from the server once!

## Handling broken connections
We need to do one more step to make sure our app stays updated in real-time. Sometimes users will lose internet connectivity or the WebSocket might disconnect temporarily. During these blackout periods, our client won't receive any subscription events, so our app won't receive new messages or groups. `subscriptions-transport-ws` has a built-in reconnecting mechanism, but it won't track any missed subscription events.

The simplest way to handle this issue is to refetch all relevant queries when our app reconnects. `wsClient` exposes an `onReconnected` function that will call the supplied callback function when the WebSocket reconnects. We can simply call `refetch` on our queries in the callback.

[{]: <helper> (diffStep 6.13)

#### [Step 6.13: Apply onReconnected to refetch missed subscription events](https://github.com/srtucker22/chatty/commit/eb2638a)

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>

...

import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;
import GROUP_ADDED_SUBSCRIPTION from &#x27;./graphql/group-added.subscription&#x27;;

<b>import { wsClient } from &#x27;./app&#x27;;</b>
<b></b>
const styles &#x3D; StyleSheet.create({
  container: {
    flex: 1,
</pre>
<pre>

...

      if (this.messagesSubscription) {
        this.messagesSubscription();
      }
<b></b>
<b>      // clear the event subscription</b>
<b>      if (this.reconnected) {</b>
<b>        this.reconnected();</b>
<b>      }</b>
<b>    } else if (!this.reconnected) {</b>
<b>      this.reconnected &#x3D; wsClient.onReconnected(() &#x3D;&gt; {</b>
<b>        this.props.refetch(); // check for any data lost during disconnect</b>
<b>      }, this);</b>
    }

    if (nextProps.user &amp;&amp;
</pre>
<pre>

...

AppWithNavigationState.propTypes &#x3D; {
  dispatch: PropTypes.func.isRequired,
  nav: PropTypes.object.isRequired,
<b>  refetch: PropTypes.func,</b>
  subscribeToGroups: PropTypes.func,
  subscribeToMessages: PropTypes.func,
  user: PropTypes.shape({
</pre>
<pre>

...


const userQuery &#x3D; graphql(USER_QUERY, {
  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
<b>  props: ({ data: { loading, user, refetch, subscribeToMore } }) &#x3D;&gt; ({</b>
    loading,
    user,
<b>    refetch,</b>
    subscribeToMessages() {
      return subscribeToMore({
        document: MESSAGE_ADDED_SUBSCRIPTION,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

import _ from &#x27;lodash&#x27;;
import moment from &#x27;moment&#x27;;

<b>import { wsClient } from &#x27;../app&#x27;;</b>
<b></b>
import Message from &#x27;../components/message.component&#x27;;
import MessageInput from &#x27;../components/message-input.component&#x27;;
import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;
</pre>
<pre>

...

        });
      }

<b>      if (!this.reconnected) {</b>
<b>        this.reconnected &#x3D; wsClient.onReconnected(() &#x3D;&gt; {</b>
<b>          this.props.refetch(); // check for any data lost during disconnect</b>
<b>        }, this);</b>
<b>      }</b>
<b></b>
      this.setState({
        usernameColors,
      });
<b>    } else if (this.reconnected) {</b>
<b>      // remove event subscription</b>
<b>      this.reconnected();</b>
    }
  }

</pre>
<pre>

...

  }),
  loading: PropTypes.bool,
  loadMoreEntries: PropTypes.func,
<b>  refetch: PropTypes.func,</b>
  subscribeToMore: PropTypes.func,
};

</pre>
<pre>

...

      first: ITEMS_PER_PAGE,
    },
  }),
<b>  props: ({ data: { fetchMore, loading, group, refetch, subscribeToMore } }) &#x3D;&gt; ({</b>
    loading,
    group,
<b>    refetch,</b>
    subscribeToMore,
    loadMoreEntries() {
      return fetchMore({
</pre>

[}]: #

Final product: ![Final Image](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step6-13.gif)


[//]: # (foot-start)

[{]: <helper> (navStep)

| [< Previous Step](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/modified-medium/step5.md) | [Next Step >](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/modified-medium/step7.md) |
|:--------------------------------|--------------------------------:|

[}]: #

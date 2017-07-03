# Step 5: GraphQL Pagination

This is the fifth blog in a multipart series where we will be building Chatty, a WhatsApp clone, using [React Native](https://facebook.github.io/react-native/) and [Apollo](http://dev.apollodata.com/).

In this tutorial, we’ll take a brief look at how to paginate data with GraphQL. By progressively loading data instead of getting it all at once, we can greatly improve the performance of our app.

Here’s what we will accomplish in this tutorial:
1. Overview different pagination strategies
2. Identify the best pagination strategy to apply to Chatty
3. Incorporate pagination in the Schema and Resolvers on our server
4. Incorporate pagination in the queries and layout of our React Native client

# Pagination Strategies
Let’s look at 3 common strategies for pagination and their primary advantages and disadvantages:
1. Page Numbering
2. Cursors
3. Relay Cursor Connections
For a more in-depth reading on pagination strategies and when and how to use them, I highly suggest checking out [Understanding pagination: REST, GraphQL, and Relay](https://dev-blog.apollodata.com/understanding-pagination-rest-graphql-and-relay-b10f835549e7), by [Sashko Stubailo](https://medium.com/@stubailo).

## Page Numbering
Think the o’s in Goooooogle search results. Page numbering in its naive form is super easy to implement in SQL with `limit` and `offset`:
```
// load the 4th page of messages
SELECT * FROM messages ORDER BY created_at DESC LIMIT 100 OFFSET 300;
```
Page numbering’s strength is in its simplicity. It’s a great strategy for dealing with static content or ordered content that won’t likely change duration a user session.

Page numbering’s weakness is dealing with dynamic data. When items are added or removed from our dataset, we can end up skipping an element or showing the same element twice. For example, if we added a new element to our data set that belongs first in the paginated results, navigating to the next page will show the last element on the current page for a second time. Similarly, if the first element gets deleted, navigating to the next page would skip what would have been the first element on the new page.

However, if our paginated results are ordered by newest element and elements aren’t deletable, page numbering can be a great option for paginating our data, especially for infinite scrollers.

## Cursors
Cursors look to solve the very problem page numbering presents. Cursors are a lot like a bookmark — we can stick it where we left off, and even if we shove more papers randomly into our book and tear a bunch out, we can still find where we last left off.

Let’s say we’re trying to show a paginated list of books ordered by title. With the cursor $after which is the title of the last book shown on the current page, we could get the next page of results in SQL as follows:
```
SELECT * FROM books
WHERE title > $after
ORDER BY title LIMIT $page_size;
```
In GraphQL, we would need our query response to include cursors:
```
booksByTitle(after: "Moby Dick", pageSize: 10) {
  cursors {
    after
  }
  books {
    title
    author {   
      firstName
      lastName
    }
  }
}
```
Cursors solve the challenges afflicting page numbering, but we can do even better! In this model, the only way for our client to know it’s on the last page is if we sent an extra request for more entries and received an empty response. Moreover, we can imagine more complicated scenarios where we would want to know the cursor for any given element in our results, not just the first or last one. We also should really strive to conform to a standardized response for any paginated query rather than making new ones up as we go. Enter, Relay Cursor Connections.

## Relay Cursor Connections
[Relay Cursor Connections](http://relay%20cursor%20connections%20specification/) specify a standardized GraphQL Query response for paginated data. In our previous `booksByTitle` example, it would look like this:
```
booksByTitle(first:10 after:"Moby Dick") {
  edges {
    node {
      title
        author {
          firstName
          lastName
        }
      }
      cursor
    }
  }
  pageInfo {
    hasPreviousPage
    hasNextPage
  }
}
```
In a nutshell, the shape of the response — the [“connection object”](http://graphql.org/learn/pagination/#end-of-list-counts-and-connections)  —  holds two elements: `edges` and `pageInfo`.

Each edge contains a `node` which is the element itself — in our case the book — and a `cursor`, which represents the cursor for the node element. Ideally, a cursor should be a **serializable opaque** cursor, meaning we shouldn’t have to worry about its formatting for pagination to work. So to match the spec, our `booksByTitle` query should look more like this:
```
booksByTitle(first:10 after:"TW9ieSBEaWNr") {
  ...
}
```
Where “Moby Dick” has been base-64 encoded. Our cursor based pagination should work just fine so long as we can reliably serialize, encode, and decode our cursor.

The other half of the connection object is pageInfo. pageInfo holds just two Booleans `hasPreviousPage` and `hasNextPage` that specify exactly what you’d expect — whether a previous page or next page is available.

With this connection object, we can execute a new query from any cursor with however many elements we want returned. We’ll save extra trips to the server when we’ve hit the beginning or end of a page. We also now have a standardized way of writing any paginated query. Sweet!

Really the biggest downside to Relay Cursor Connections is the amount of code and energy it takes to execute. We might also take a small hit in performance versus the other strategies as the resolver does a bit more work per element and the response is a little larger.

# Pagination on the Server
Time to add pagination to Chatty!

First, let’s identify some places where pagination makes sense.

There is no doubt pagination is sorely needed for displaying messages in a group. If we showed every last message in a group thread off the bat, things would get ugly quickly. We can also use pagination to preview the most recent message for a group before a user taps into the group thread.

I can’t imagine there are going to be many occasions where a user would belong to hundreds of groups, so let’s hold off on paginating groups until we have good reason.

What about a user’s friends? Pagination here can get a bit dicier, but I’m going to make the executive call and say **not today** — this is a nice-to-have feature but it’s not need-to-have. Most people don’t have a ton of contacts. Even if the call gets a bit expensive, it likely wont be *that* expensive, certainly not until Chatty has hundreds of thousands of users. Maybe we’ll implement this in a future tutorial :)

First, it's important to note that page numbering is a totally valid solution to our use case, and much easier to implement than Relay Cursor Connections. Our messages will always be ordered by most recent, and we’re not planning on making them deletable anytime soon. WhatsApp just added the ability to edit and delete posts, and they’ve been around for 8 years. Really, most cases for pagination can be covered with page numbering. And when we add subscriptions next tutorial, you can see that even when data is constantly getting added and deleted, we could still use page numbering without running into issues.

**However**, Relay Cursor Connections are the gold standard for GraphQL pagination, and even though page numbering would suit us just fine, we're gonna go the harder route so we'll be armed for tougher pagination cases down the line.

Let’s code it up!

## Relay Cursor Connection Schema
When we request messages for a given group, we don’t use the `messages` query, we use `group`. We currently only request `Messages` within the context of a `Group`, and that makes sense because it's unlikely we'll just want messages on their own.

So if we query for `Messages` within a `Group` with a Relay Cursor Connection shape, it needs to look something like this:

```
group(id: 1) {
  id
  name
  # ... other group fields here
  messages(first:10 after:"TW9ieSBEaWNr") {
    edges {
      node { # this is the message!
        id
        text
        # ... other message fields here
      }
      cursor # this is an opaque serializable identifier... a String
    }
    pageInfo {
      hasPreviousPage # boolean
      hasNextPage # boolean
    }
  }
}
```

Cool! Let's first modify our Schema to fit this shape.

We need to declare a three new types in our Schema for Relay Cursor Connections:

1. `MessageConnection` -- the wrapper type that will hold the `edges` and `pageInfo` fields.
2. `MessageEdge` -- the type used for `edges` and will hold the `node` and `cursor` fields.
3. `PageInfo` -- the type use for `pageInfo` and hold the `hasPreviousPage` and `hasNextPage` fields.

We also need to change the `Group`'s `messages` field to take in Relay Cursor Connection arguments and return a `MessageConnection` instead of an array of `Messages`:

[{]: <helper> (diffStep 5.1)

#### Step 5.1: Update Schema with Relay Cursor Connection

##### Changed server&#x2F;data&#x2F;schema.js
```diff
@@ -2,12 +2,27 @@
 ┊ 2┊ 2┊  # declare custom scalars
 ┊ 3┊ 3┊  scalar Date
 ┊ 4┊ 4┊
+┊  ┊ 5┊  type MessageConnection {
+┊  ┊ 6┊    edges: [MessageEdge]
+┊  ┊ 7┊    pageInfo: PageInfo!
+┊  ┊ 8┊  }
+┊  ┊ 9┊
+┊  ┊10┊  type MessageEdge {
+┊  ┊11┊    cursor: String!
+┊  ┊12┊    node: Message!
+┊  ┊13┊  }
+┊  ┊14┊
+┊  ┊15┊  type PageInfo {
+┊  ┊16┊    hasNextPage: Boolean!
+┊  ┊17┊    hasPreviousPage: Boolean!
+┊  ┊18┊  }
+┊  ┊19┊
 ┊ 5┊20┊  # a group chat entity
 ┊ 6┊21┊  type Group {
 ┊ 7┊22┊    id: Int! # unique id for the group
 ┊ 8┊23┊    name: String # name of the group
 ┊ 9┊24┊    users: [User]! # users in the group
-┊10┊  ┊    messages: [Message] # messages sent to the group
+┊  ┊25┊    messages(first: Int, after: String, last: Int, before: String): MessageConnection # messages sent to the group
 ┊11┊26┊  }
 ┊12┊27┊
 ┊13┊28┊  # a user -- keep type really simple for now
```

[}]: #

Now instead of asking for all messages when we query for a group or groups, we will specify the `first` n `MessageEdges` `after` the cursor supplied (or the `last` n `MessageEdges` `before` the cursor supplied). 

## Relay Cursor Connection Resolvers
We need to update our resolvers in `server/data/resolvers.js` to meet the spec we've just specified.

Our first order of business should be to define the cursor we will use to track which messages to retrieve.

When we create new `Messages` in SQLite, the new `Message`'s `id` is based on an monatomic incrementing integer -- a fancy way of saying that newer `Messages` will always a have higher `id` than older Messages. We can use this neat feature to base our cursor on the `Message` `id`! For example, if we requested the first 10 `Messages` after the `Message` with `id = 25`, we could run the following sequelize query:

```
Message.findAll({
  where: { 
    groupId: 1, // get messages within Group with id = 1
    id: { $lt: 25 }, // get messages before Message #25 -- i.e. message.id < 25
  },
  order: [['id', 'DESC']], // return messages from newest to oldest
  limit: 10,
})
```

However, remember that we should use a **serializable opaque** cursor, not an integer. We'll simply convert the `Message` `id` to a base64 string to meet this spec.

After we receive the `Messages` from our sequelize query, we still need to convert our results to fit our `MessageConnection` type. We'll need to iterate through our returned Messages and create an `edge` for each one, with the `Message` as the node, and `base64(Message.id)` as the `cursor`. 

Lastly, we need to determine `hasNextPage`/`hasPreviousPage`. This can be simply accomplished by querying whether there is another `Message` after/before the returned results. It's also a good idea to keep `pageInfo` querying as separate functions in case the client doesn't request it -- a nice little performance enhancement.

Okay, enough theory -- here's the code:

[{]: <helper> (diffStep 5.2)

#### Step 5.2: Update Resolvers with Relay Cursor Connection

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -1,9 +1,17 @@
 ┊ 1┊ 1┊import GraphQLDate from 'graphql-date';
-┊ 2┊  ┊
 ┊ 3┊ 2┊import { Group, Message, User } from './connectors';
 ┊ 4┊ 3┊
 ┊ 5┊ 4┊export const Resolvers = {
 ┊ 6┊ 5┊  Date: GraphQLDate,
+┊  ┊ 6┊  PageInfo: {
+┊  ┊ 7┊    // we will have each connection supply its own hasNextPage/hasPreviousPage functions!
+┊  ┊ 8┊    hasNextPage(connection, args) {
+┊  ┊ 9┊      return connection.hasNextPage();
+┊  ┊10┊    },
+┊  ┊11┊    hasPreviousPage(connection, args) {
+┊  ┊12┊      return connection.hasPreviousPage();
+┊  ┊13┊    },
+┊  ┊14┊  },
 ┊ 7┊15┊  Query: {
 ┊ 8┊16┊    group(_, args) {
 ┊ 9┊17┊      return Group.find({ where: args });
```
```diff
@@ -69,10 +77,62 @@
 ┊ 69┊ 77┊    users(group) {
 ┊ 70┊ 78┊      return group.getUsers();
 ┊ 71┊ 79┊    },
-┊ 72┊   ┊    messages(group) {
+┊   ┊ 80┊    messages(group, { first, last, before, after }) {
+┊   ┊ 81┊      // base query -- get messages from the right group
+┊   ┊ 82┊      const where = { groupId: group.id };
+┊   ┊ 83┊
+┊   ┊ 84┊      // because we return messages from newest -> oldest
+┊   ┊ 85┊      // before actually means newer (id > cursor)
+┊   ┊ 86┊      // after actually means older (id < cursor)
+┊   ┊ 87┊
+┊   ┊ 88┊      if (before) {
+┊   ┊ 89┊        // convert base-64 to utf8 id
+┊   ┊ 90┊        where.id = { $gt: Buffer.from(before, 'base64').toString() };
+┊   ┊ 91┊      }
+┊   ┊ 92┊
+┊   ┊ 93┊      if (after) {
+┊   ┊ 94┊        where.id = { $lt: Buffer.from(after, 'base64').toString() };
+┊   ┊ 95┊      }
+┊   ┊ 96┊
 ┊ 73┊ 97┊      return Message.findAll({
-┊ 74┊   ┊        where: { groupId: group.id },
-┊ 75┊   ┊        order: [['createdAt', 'DESC']],
+┊   ┊ 98┊        where,
+┊   ┊ 99┊        order: [['id', 'DESC']],
+┊   ┊100┊        limit: first || last,
+┊   ┊101┊      }).then((messages) => {
+┊   ┊102┊        const edges = messages.map(message => ({
+┊   ┊103┊          cursor: Buffer.from(message.id.toString()).toString('base64'), // convert id to cursor
+┊   ┊104┊          node: message, // the node is the message itself
+┊   ┊105┊        }));
+┊   ┊106┊
+┊   ┊107┊        return {
+┊   ┊108┊          edges,
+┊   ┊109┊          pageInfo: {
+┊   ┊110┊            hasNextPage() {
+┊   ┊111┊              if (messages.length < (last || first)) {
+┊   ┊112┊                return Promise.resolve(false);
+┊   ┊113┊              }
+┊   ┊114┊
+┊   ┊115┊              return Message.findOne({
+┊   ┊116┊                where: {
+┊   ┊117┊                  groupId: group.id,
+┊   ┊118┊                  id: {
+┊   ┊119┊                    [before ? '$gt' : '$lt']: messages[messages.length - 1].id,
+┊   ┊120┊                  },
+┊   ┊121┊                },
+┊   ┊122┊                order: [['id', 'DESC']],
+┊   ┊123┊              }).then(message => !!message);
+┊   ┊124┊            },
+┊   ┊125┊            hasPreviousPage() {
+┊   ┊126┊              return Message.findOne({
+┊   ┊127┊                where: {
+┊   ┊128┊                  groupId: group.id,
+┊   ┊129┊                  id: where.id,
+┊   ┊130┊                },
+┊   ┊131┊                order: [['id']],
+┊   ┊132┊              }).then(message => !!message);
+┊   ┊133┊            },
+┊   ┊134┊          },
+┊   ┊135┊        };
 ┊ 76┊136┊      });
 ┊ 77┊137┊    },
 ┊ 78┊138┊  },
```

[}]: #

A quick test in GraphIQL shows everything is looking good: ![GraphIQL Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-2.png)

# Pagination in React Native
We’re going to update our React Native client to paginate messages with an infinite scroller when viewing a group thread.

`FlatList` has a function [`onEndReached`](https://facebook.github.io/react-native/docs/flatlist.html#onendreached) that will trigger when the user has scrolled close to the end of the list (we can set how close is needed to trigger the function via `onEndReachedThreshold`). However, messaging apps like ours typically display newest messages at the bottom of the list, which means we load older data at the top. This is the reverse of how most lists operate, so we need to modify our `FlatList` to be flipped so `onEndReached` triggers when we're approaching the top of the list, not the bottom. We can use the [`inverted`](https://facebook.github.io/react-native/docs/flatlist.html#inverted) flag on `FlatList` which flips the display of the list with a nifty trick just using CSS.

[{]: <helper> (diffStep 5.3 files="client/src/screens/messages.screen.js")

#### Step 5.3: Use inverted FlatList for Messages

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -84,10 +84,12 @@
 ┊84┊84┊
 ┊85┊85┊    this.state = {
 ┊86┊86┊      usernameColors,
+┊  ┊87┊      refreshing: false,
 ┊87┊88┊    };
 ┊88┊89┊
 ┊89┊90┊    this.renderItem = this.renderItem.bind(this);
 ┊90┊91┊    this.send = this.send.bind(this);
+┊  ┊92┊    this.onEndReached = this.onEndReached.bind(this);
 ┊91┊93┊  }
 ┊92┊94┊
 ┊93┊95┊  componentWillReceiveProps(nextProps) {
```
```diff
@@ -107,13 +109,17 @@
 ┊107┊109┊    }
 ┊108┊110┊  }
 ┊109┊111┊
+┊   ┊112┊  onEndReached() {
+┊   ┊113┊    console.log('TODO: onEndReached');
+┊   ┊114┊  }
+┊   ┊115┊
 ┊110┊116┊  send(text) {
 ┊111┊117┊    this.props.createMessage({
 ┊112┊118┊      groupId: this.props.navigation.state.params.groupId,
 ┊113┊119┊      userId: 1, // faking the user for now
 ┊114┊120┊      text,
 ┊115┊121┊    }).then(() => {
-┊116┊   ┊      this.flatList.scrollToEnd({ animated: true });
+┊   ┊122┊      this.flatList.scrollToIndex({ index: 0, animated: true });
 ┊117┊123┊    });
 ┊118┊124┊  }
 ┊119┊125┊
```
```diff
@@ -131,7 +137,7 @@
 ┊131┊137┊    const { loading, group } = this.props;
 ┊132┊138┊
 ┊133┊139┊    // render loading placeholder while we fetch messages
-┊134┊   ┊    if (loading && !group) {
+┊   ┊140┊    if (loading || !group) {
 ┊135┊141┊      return (
 ┊136┊142┊        <View style={[styles.loading, styles.container]}>
 ┊137┊143┊          <ActivityIndicator />
```
```diff
@@ -149,10 +155,12 @@
 ┊149┊155┊      >
 ┊150┊156┊        <FlatList
 ┊151┊157┊          ref={(ref) => { this.flatList = ref; }}
-┊152┊   ┊          data={group.messages.slice().reverse()}
+┊   ┊158┊          inverted
+┊   ┊159┊          data={group.messages}
 ┊153┊160┊          keyExtractor={this.keyExtractor}
 ┊154┊161┊          renderItem={this.renderItem}
 ┊155┊162┊          ListEmptyComponent={<View />}
+┊   ┊163┊          onEndReached={this.onEndReached}
 ┊156┊164┊        />
 ┊157┊165┊        <MessageInput send={this.send} />
 ┊158┊166┊      </KeyboardAvoidingView>
```

[}]: #

Now let’s update `GROUP_QUERY` in `client/src/graphql/group.query.js` to match our latest schema:

[{]: <helper> (diffStep 5.4)

#### Step 5.4: Update Group Query with Page Numbering

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.query.js
```diff
@@ -3,7 +3,7 @@
 ┊3┊3┊import MESSAGE_FRAGMENT from './message.fragment';
 ┊4┊4┊
 ┊5┊5┊const GROUP_QUERY = gql`
-┊6┊ ┊  query group($groupId: Int!) {
+┊ ┊6┊  query group($groupId: Int!, $first: Int, $after: String, $last: Int, $before: String) {
 ┊7┊7┊    group(id: $groupId) {
 ┊8┊8┊      id
 ┊9┊9┊      name
```
```diff
@@ -11,8 +11,17 @@
 ┊11┊11┊        id
 ┊12┊12┊        username
 ┊13┊13┊      }
-┊14┊  ┊      messages {
-┊15┊  ┊        ... MessageFragment
+┊  ┊14┊      messages(first: $first, after: $after, last: $last, before: $before) {
+┊  ┊15┊        edges {
+┊  ┊16┊          cursor
+┊  ┊17┊          node {
+┊  ┊18┊            ... MessageFragment
+┊  ┊19┊          }
+┊  ┊20┊        }
+┊  ┊21┊        pageInfo {
+┊  ┊22┊          hasNextPage
+┊  ┊23┊          hasPreviousPage
+┊  ┊24┊        }
 ┊16┊25┊      }
 ┊17┊26┊    }
 ┊18┊27┊  }
```

[}]: #

We now have the ability to pass `first`, `after`, `last`, and `before` variables into the `group` query called by our `Messages` component. Those variables will get passed to our `messages` field, where we will receive a `MessageConnection` with all the fields we need.

We need to specify how `group` should look on a first run, and how to load more entries using the same query. The `graphql` module of `react-apollo` exposes a [`fetchMore`](http://dev.apollodata.com/react/pagination.html#fetch-more) function on the data prop where we can define how to update our query and our data:

[{]: <helper> (diffStep 5.5)

#### Step 5.5: Add fetchMore to groupQuery

##### Changed client&#x2F;package.json
```diff
@@ -8,6 +8,7 @@
 ┊ 8┊ 8┊	},
 ┊ 9┊ 9┊	"dependencies": {
 ┊10┊10┊		"apollo-client": "^1.9.0",
+┊  ┊11┊		"buffer": "^5.0.7",
 ┊11┊12┊		"graphql-tag": "^2.4.2",
 ┊12┊13┊		"immutability-helper": "^2.3.0",
 ┊13┊14┊		"lodash": "^4.17.4",
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -12,6 +12,8 @@
 ┊12┊12┊import React, { Component } from 'react';
 ┊13┊13┊import randomColor from 'randomcolor';
 ┊14┊14┊import { graphql, compose } from 'react-apollo';
+┊  ┊15┊import update from 'immutability-helper';
+┊  ┊16┊import { Buffer } from 'buffer';
 ┊15┊17┊
 ┊16┊18┊import Message from '../components/message.component';
 ┊17┊19┊import MessageInput from '../components/message-input.component';
```
```diff
@@ -84,7 +86,6 @@
 ┊84┊86┊
 ┊85┊87┊    this.state = {
 ┊86┊88┊      usernameColors,
-┊87┊  ┊      refreshing: false,
 ┊88┊89┊    };
 ┊89┊90┊
 ┊90┊91┊    this.renderItem = this.renderItem.bind(this);
```
```diff
@@ -123,15 +124,19 @@
 ┊123┊124┊    });
 ┊124┊125┊  }
 ┊125┊126┊
-┊126┊   ┊  keyExtractor = item => item.id;
+┊   ┊127┊  keyExtractor = item => item.node.id;
 ┊127┊128┊
-┊128┊   ┊  renderItem = ({ item: message }) => (
-┊129┊   ┊    <Message
-┊130┊   ┊      color={this.state.usernameColors[message.from.username]}
-┊131┊   ┊      isCurrentUser={message.from.id === 1} // for now until we implement auth
-┊132┊   ┊      message={message}
-┊133┊   ┊    />
-┊134┊   ┊  )
+┊   ┊129┊  renderItem = ({ item: edge }) => {
+┊   ┊130┊    const message = edge.node;
+┊   ┊131┊
+┊   ┊132┊    return (
+┊   ┊133┊      <Message
+┊   ┊134┊        color={this.state.usernameColors[message.from.username]}
+┊   ┊135┊        isCurrentUser={message.from.id === 1} // for now until we implement auth
+┊   ┊136┊        message={message}
+┊   ┊137┊      />
+┊   ┊138┊    );
+┊   ┊139┊  }
 ┊135┊140┊
 ┊136┊141┊  render() {
 ┊137┊142┊    const { loading, group } = this.props;
```
```diff
@@ -156,7 +161,7 @@
 ┊156┊161┊        <FlatList
 ┊157┊162┊          ref={(ref) => { this.flatList = ref; }}
 ┊158┊163┊          inverted
-┊159┊   ┊          data={group.messages}
+┊   ┊164┊          data={group.messages.edges}
 ┊160┊165┊          keyExtractor={this.keyExtractor}
 ┊161┊166┊          renderItem={this.renderItem}
 ┊162┊167┊          ListEmptyComponent={<View />}
```
```diff
@@ -179,20 +184,56 @@
 ┊179┊184┊    }),
 ┊180┊185┊  }),
 ┊181┊186┊  group: PropTypes.shape({
-┊182┊   ┊    messages: PropTypes.array,
+┊   ┊187┊    messages: PropTypes.shape({
+┊   ┊188┊      edges: PropTypes.arrayOf(PropTypes.shape({
+┊   ┊189┊        cursor: PropTypes.string,
+┊   ┊190┊        node: PropTypes.object,
+┊   ┊191┊      })),
+┊   ┊192┊      pageInfo: PropTypes.shape({
+┊   ┊193┊        hasNextPage: PropTypes.bool,
+┊   ┊194┊        hasPreviousPage: PropTypes.bool,
+┊   ┊195┊      }),
+┊   ┊196┊    }),
 ┊183┊197┊    users: PropTypes.array,
 ┊184┊198┊  }),
 ┊185┊199┊  loading: PropTypes.bool,
+┊   ┊200┊  loadMoreEntries: PropTypes.func,
 ┊186┊201┊};
 ┊187┊202┊
+┊   ┊203┊const ITEMS_PER_PAGE = 10;
 ┊188┊204┊const groupQuery = graphql(GROUP_QUERY, {
 ┊189┊205┊  options: ownProps => ({
 ┊190┊206┊    variables: {
 ┊191┊207┊      groupId: ownProps.navigation.state.params.groupId,
+┊   ┊208┊      first: ITEMS_PER_PAGE,
 ┊192┊209┊    },
 ┊193┊210┊  }),
-┊194┊   ┊  props: ({ data: { loading, group } }) => ({
-┊195┊   ┊    loading, group,
+┊   ┊211┊  props: ({ data: { fetchMore, loading, group } }) => ({
+┊   ┊212┊    loading,
+┊   ┊213┊    group,
+┊   ┊214┊    loadMoreEntries() {
+┊   ┊215┊      return fetchMore({
+┊   ┊216┊        // query: ... (you can specify a different query.
+┊   ┊217┊        // GROUP_QUERY is used by default)
+┊   ┊218┊        variables: {
+┊   ┊219┊          // load more queries starting from the cursor of the last (oldest) message
+┊   ┊220┊          after: group.messages.edges[group.messages.edges.length - 1].cursor,
+┊   ┊221┊        },
+┊   ┊222┊        updateQuery: (previousResult, { fetchMoreResult }) => {
+┊   ┊223┊          // we will make an extra call to check if no more entries
+┊   ┊224┊          if (!fetchMoreResult) { return previousResult; }
+┊   ┊225┊          // push results (older messages) to end of messages list
+┊   ┊226┊          return update(previousResult, {
+┊   ┊227┊            group: {
+┊   ┊228┊              messages: {
+┊   ┊229┊                edges: { $push: fetchMoreResult.group.messages.edges },
+┊   ┊230┊                pageInfo: { $set: fetchMoreResult.group.messages.pageInfo },
+┊   ┊231┊              },
+┊   ┊232┊            },
+┊   ┊233┊          });
+┊   ┊234┊        },
+┊   ┊235┊      });
+┊   ┊236┊    },
 ┊196┊237┊  }),
 ┊197┊238┊});
 ┊198┊239┊
```
```diff
@@ -225,17 +266,23 @@
 ┊225┊266┊            query: GROUP_QUERY,
 ┊226┊267┊            variables: {
 ┊227┊268┊              groupId,
+┊   ┊269┊              first: ITEMS_PER_PAGE,
 ┊228┊270┊            },
 ┊229┊271┊          });
 ┊230┊272┊
 ┊231┊273┊          // Add our message from the mutation to the end.
-┊232┊   ┊          groupData.group.messages.unshift(createMessage);
+┊   ┊274┊          groupData.group.messages.edges.unshift({
+┊   ┊275┊            __typename: 'MessageEdge',
+┊   ┊276┊            node: createMessage,
+┊   ┊277┊            cursor: Buffer.from(createMessage.id.toString()).toString('base64'),
+┊   ┊278┊          });
 ┊233┊279┊
 ┊234┊280┊          // Write our data back to the cache.
 ┊235┊281┊          store.writeQuery({
 ┊236┊282┊            query: GROUP_QUERY,
 ┊237┊283┊            variables: {
 ┊238┊284┊              groupId,
+┊   ┊285┊              first: ITEMS_PER_PAGE,
 ┊239┊286┊            },
 ┊240┊287┊            data: groupData,
 ┊241┊288┊          });
```

[}]: #

We’ve specified `first: 10` in our initial run of the query. When our component executes `this.props.loadMoreEntries`, we update the `after` cursor with the `cursor` of the last `edge` from our previous results, fetch up to 10 more messages, and update our app’s state to push the edges to the end of our data set and set whether there is a next page.

Since we are returning `edges` now, we need to update our `Messages` component to look for `group.messages.edges[x].node` instead of `group.messages[x]`.

We also need to modify the `update` function in our mutations to match our updated `GROUP_QUERY` variables.

We should also create and append an `edge` to our cached query data whenever we create a new `Message`. This means deriving the `cursor` for the new `Message` we've created as well.

We finally need to update the `Messages` component to call `this.props.loadMoreEntries` when we call `onEndReached`:

[{]: <helper> (diffStep 5.6)

#### Step 5.6: Apply loadMoreEntries to onEndReached

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -111,7 +111,17 @@
 ┊111┊111┊  }
 ┊112┊112┊
 ┊113┊113┊  onEndReached() {
-┊114┊   ┊    console.log('TODO: onEndReached');
+┊   ┊114┊    if (!this.state.loadingMoreEntries &&
+┊   ┊115┊      this.props.group.messages.pageInfo.hasNextPage) {
+┊   ┊116┊      this.setState({
+┊   ┊117┊        loadingMoreEntries: true,
+┊   ┊118┊      });
+┊   ┊119┊      this.props.loadMoreEntries().then(() => {
+┊   ┊120┊        this.setState({
+┊   ┊121┊          loadingMoreEntries: false,
+┊   ┊122┊        });
+┊   ┊123┊      });
+┊   ┊124┊    }
 ┊115┊125┊  }
 ┊116┊126┊
 ┊117┊127┊  send(text) {
```

[}]: #

Boot it up for some pagination! ![Pagination Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-6.gif)

We can also modify the Groups component to preview the most recent message for each group. Using the same methodology, we’ll first update `USER_QUERY`:

[{]: <helper> (diffStep 5.7)

#### Step 5.7: Add most recent message to each Group in USER_QUERY

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
```diff
@@ -1,5 +1,7 @@
 ┊1┊1┊import gql from 'graphql-tag';
 ┊2┊2┊
+┊ ┊3┊import MESSAGE_FRAGMENT from './message.fragment';
+┊ ┊4┊
 ┊3┊5┊const CREATE_GROUP_MUTATION = gql`
 ┊4┊6┊  mutation createGroup($name: String!, $userIds: [Int!], $userId: Int!) {
 ┊5┊7┊    createGroup(name: $name, userIds: $userIds, userId: $userId) {
```
```diff
@@ -8,8 +10,17 @@
 ┊ 8┊10┊      users {
 ┊ 9┊11┊        id
 ┊10┊12┊      }
+┊  ┊13┊      messages(first: 1) { # we don't need to use variables
+┊  ┊14┊        edges {
+┊  ┊15┊          cursor
+┊  ┊16┊          node {
+┊  ┊17┊            ... MessageFragment
+┊  ┊18┊          }
+┊  ┊19┊        }
+┊  ┊20┊      }
 ┊11┊21┊    }
 ┊12┊22┊  }
+┊  ┊23┊  ${MESSAGE_FRAGMENT}
 ┊13┊24┊`;
 ┊14┊25┊
 ┊15┊26┊export default CREATE_GROUP_MUTATION;
```

##### Changed client&#x2F;src&#x2F;graphql&#x2F;user.query.js
```diff
@@ -1,5 +1,7 @@
 ┊1┊1┊import gql from 'graphql-tag';
 ┊2┊2┊
+┊ ┊3┊import MESSAGE_FRAGMENT from './message.fragment';
+┊ ┊4┊
 ┊3┊5┊// get the user and all user's groups
 ┊4┊6┊export const USER_QUERY = gql`
 ┊5┊7┊  query user($id: Int) {
```
```diff
@@ -10,6 +12,14 @@
 ┊10┊12┊      groups {
 ┊11┊13┊        id
 ┊12┊14┊        name
+┊  ┊15┊        messages(first: 1) { # we don't need to use variables
+┊  ┊16┊          edges {
+┊  ┊17┊            cursor
+┊  ┊18┊            node {
+┊  ┊19┊              ... MessageFragment
+┊  ┊20┊            }
+┊  ┊21┊          }
+┊  ┊22┊        }
 ┊13┊23┊      }
 ┊14┊24┊      friends {
 ┊15┊25┊        id
```
```diff
@@ -17,6 +27,7 @@
 ┊17┊27┊      }
 ┊18┊28┊    }
 ┊19┊29┊  }
+┊  ┊30┊  ${MESSAGE_FRAGMENT}
 ┊20┊31┊`;
 ┊21┊32┊
 ┊22┊33┊export default USER_QUERY;
```

[}]: #

And then we update the layout of the Group list item component in `Groups`:

[{]: <helper> (diffStep 5.8)

#### Step 5.8: Modify Group component to include latest message

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
```diff
@@ -4,12 +4,15 @@
 ┊ 4┊ 4┊  FlatList,
 ┊ 5┊ 5┊  ActivityIndicator,
 ┊ 6┊ 6┊  Button,
+┊  ┊ 7┊  Image,
 ┊ 7┊ 8┊  StyleSheet,
 ┊ 8┊ 9┊  Text,
 ┊ 9┊10┊  TouchableHighlight,
 ┊10┊11┊  View,
 ┊11┊12┊} from 'react-native';
 ┊12┊13┊import { graphql } from 'react-apollo';
+┊  ┊14┊import moment from 'moment';
+┊  ┊15┊import Icon from 'react-native-vector-icons/FontAwesome';
 ┊13┊16┊
 ┊14┊17┊import { USER_QUERY } from '../graphql/user.query';
 ┊15┊18┊
```
```diff
@@ -36,6 +39,31 @@
 ┊36┊39┊    fontWeight: 'bold',
 ┊37┊40┊    flex: 0.7,
 ┊38┊41┊  },
+┊  ┊42┊  groupTextContainer: {
+┊  ┊43┊    flex: 1,
+┊  ┊44┊    flexDirection: 'column',
+┊  ┊45┊    paddingLeft: 6,
+┊  ┊46┊  },
+┊  ┊47┊  groupText: {
+┊  ┊48┊    color: '#8c8c8c',
+┊  ┊49┊  },
+┊  ┊50┊  groupImage: {
+┊  ┊51┊    width: 54,
+┊  ┊52┊    height: 54,
+┊  ┊53┊    borderRadius: 27,
+┊  ┊54┊  },
+┊  ┊55┊  groupTitleContainer: {
+┊  ┊56┊    flexDirection: 'row',
+┊  ┊57┊  },
+┊  ┊58┊  groupLastUpdated: {
+┊  ┊59┊    flex: 0.3,
+┊  ┊60┊    color: '#8c8c8c',
+┊  ┊61┊    fontSize: 11,
+┊  ┊62┊    textAlign: 'right',
+┊  ┊63┊  },
+┊  ┊64┊  groupUsername: {
+┊  ┊65┊    paddingVertical: 4,
+┊  ┊66┊  },
 ┊39┊67┊  header: {
 ┊40┊68┊    alignItems: 'flex-end',
 ┊41┊69┊    padding: 6,
```
```diff
@@ -48,6 +76,16 @@
 ┊48┊76┊  },
 ┊49┊77┊});
 ┊50┊78┊
+┊  ┊79┊// format createdAt with moment
+┊  ┊80┊const formatCreatedAt = createdAt => moment(createdAt).calendar(null, {
+┊  ┊81┊  sameDay: '[Today]',
+┊  ┊82┊  nextDay: '[Tomorrow]',
+┊  ┊83┊  nextWeek: 'dddd',
+┊  ┊84┊  lastDay: '[Yesterday]',
+┊  ┊85┊  lastWeek: 'dddd',
+┊  ┊86┊  sameElse: 'DD/MM/YYYY',
+┊  ┊87┊});
+┊  ┊88┊
 ┊51┊89┊const Header = ({ onPress }) => (
 ┊52┊90┊  <View style={styles.header}>
 ┊53┊91┊    <Button title={'New Group'} onPress={onPress} />
```
```diff
@@ -65,14 +103,40 @@
 ┊ 65┊103┊  }
 ┊ 66┊104┊
 ┊ 67┊105┊  render() {
-┊ 68┊   ┊    const { id, name } = this.props.group;
+┊   ┊106┊    const { id, name, messages } = this.props.group;
 ┊ 69┊107┊    return (
 ┊ 70┊108┊      <TouchableHighlight
 ┊ 71┊109┊        key={id}
 ┊ 72┊110┊        onPress={this.goToMessages}
 ┊ 73┊111┊      >
 ┊ 74┊112┊        <View style={styles.groupContainer}>
-┊ 75┊   ┊          <Text style={styles.groupName}>{`${name}`}</Text>
+┊   ┊113┊          <Image
+┊   ┊114┊            style={styles.groupImage}
+┊   ┊115┊            source={{
+┊   ┊116┊              uri: 'https://facebook.github.io/react/img/logo_og.png',
+┊   ┊117┊            }}
+┊   ┊118┊          />
+┊   ┊119┊          <View style={styles.groupTextContainer}>
+┊   ┊120┊            <View style={styles.groupTitleContainer}>
+┊   ┊121┊              <Text style={styles.groupName}>{`${name}`}</Text>
+┊   ┊122┊              <Text style={styles.groupLastUpdated}>
+┊   ┊123┊                {messages.edges.length ?
+┊   ┊124┊                  formatCreatedAt(messages.edges[0].node.createdAt) : ''}
+┊   ┊125┊              </Text>
+┊   ┊126┊            </View>
+┊   ┊127┊            <Text style={styles.groupUsername}>
+┊   ┊128┊              {messages.edges.length ?
+┊   ┊129┊                `${messages.edges[0].node.from.username}:` : ''}
+┊   ┊130┊            </Text>
+┊   ┊131┊            <Text style={styles.groupText} numberOfLines={1}>
+┊   ┊132┊              {messages.edges.length ? messages.edges[0].node.text : ''}
+┊   ┊133┊            </Text>
+┊   ┊134┊          </View>
+┊   ┊135┊          <Icon
+┊   ┊136┊            name="angle-right"
+┊   ┊137┊            size={24}
+┊   ┊138┊            color={'#8c8c8c'}
+┊   ┊139┊          />
 ┊ 76┊140┊        </View>
 ┊ 77┊141┊      </TouchableHighlight>
 ┊ 78┊142┊    );
```
```diff
@@ -84,6 +148,12 @@
 ┊ 84┊148┊  group: PropTypes.shape({
 ┊ 85┊149┊    id: PropTypes.number,
 ┊ 86┊150┊    name: PropTypes.string,
+┊   ┊151┊    messages: PropTypes.shape({
+┊   ┊152┊      edges: PropTypes.arrayOf(PropTypes.shape({
+┊   ┊153┊        cursor: PropTypes.string,
+┊   ┊154┊        node: PropTypes.object,
+┊   ┊155┊      })),
+┊   ┊156┊    }),
 ┊ 87┊157┊  }),
 ┊ 88┊158┊};
```

[}]: #

![Layout Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-8.png)

# Refreshing Data
We can apply some of the tricks we’ve just learned to also give users a way to manually refresh data. Currently, if a user sends a message to a group, this new message won’t show up as the latest message on the groups page.

We could solve this problem by modifying `update` within `sendMessage` to update the `USER_QUERY` query. But let’s hold off on implementing that fix and use this opportunity to test manual refreshing.

In addition to `fetchMore`, `graphql` also exposes a [`refetch`](http://dev.apollodata.com/core/apollo-client-api.html#ObservableQuery.refetch) function on the data prop. Executing this function will force the query to refetch data. 

We can modify our `FlatList` to use a built-in [`RefreshControl`](https://facebook.github.io/react-native/docs/refreshcontrol.html) component via [`onRefresh`](https://facebook.github.io/react-native/docs/flatlist.html#onrefresh). When the user pulls down the list, `FlatList` will trigger `onRefresh` where we will `refetch` the `user` query.

We also need to pass a `refreshing` parameter to `FlatList` to let it know when to show or hide the `RefreshControl`. We can set simply set `refreshing` to check for the `networkStatus` of our query. `networkStatus === 4` means the data is still loading.

[{]: <helper> (diffStep 5.9)

#### Step 5.9: Manual Refresh Groups

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
```diff
@@ -166,6 +166,11 @@
 ┊166┊166┊    super(props);
 ┊167┊167┊    this.goToMessages = this.goToMessages.bind(this);
 ┊168┊168┊    this.goToNewGroup = this.goToNewGroup.bind(this);
+┊   ┊169┊    this.onRefresh = this.onRefresh.bind(this);
+┊   ┊170┊  }
+┊   ┊171┊
+┊   ┊172┊  onRefresh() {
+┊   ┊173┊    this.props.refetch();
 ┊169┊174┊  }
 ┊170┊175┊
 ┊171┊176┊  keyExtractor = item => item.id;
```
```diff
@@ -183,7 +188,7 @@
 ┊183┊188┊  renderItem = ({ item }) => <Group group={item} goToMessages={this.goToMessages} />;
 ┊184┊189┊
 ┊185┊190┊  render() {
-┊186┊   ┊    const { loading, user } = this.props;
+┊   ┊191┊    const { loading, user, networkStatus } = this.props;
 ┊187┊192┊
 ┊188┊193┊    // render loading placeholder while we fetch messages
 ┊189┊194┊    if (loading) {
```
```diff
@@ -211,6 +216,8 @@
 ┊211┊216┊          keyExtractor={this.keyExtractor}
 ┊212┊217┊          renderItem={this.renderItem}
 ┊213┊218┊          ListHeaderComponent={() => <Header onPress={this.goToNewGroup} />}
+┊   ┊219┊          onRefresh={this.onRefresh}
+┊   ┊220┊          refreshing={networkStatus === 4}
 ┊214┊221┊        />
 ┊215┊222┊      </View>
 ┊216┊223┊    );
```
```diff
@@ -221,6 +228,8 @@
 ┊221┊228┊    navigate: PropTypes.func,
 ┊222┊229┊  }),
 ┊223┊230┊  loading: PropTypes.bool,
+┊   ┊231┊  networkStatus: PropTypes.number,
+┊   ┊232┊  refetch: PropTypes.func,
 ┊224┊233┊  user: PropTypes.shape({
 ┊225┊234┊    id: PropTypes.number.isRequired,
 ┊226┊235┊    email: PropTypes.string.isRequired,
```
```diff
@@ -235,8 +244,8 @@
 ┊235┊244┊
 ┊236┊245┊const userQuery = graphql(USER_QUERY, {
 ┊237┊246┊  options: () => ({ variables: { id: 1 } }), // fake the user for now
-┊238┊   ┊  props: ({ data: { loading, user } }) => ({
-┊239┊   ┊    loading, user,
+┊   ┊247┊  props: ({ data: { loading, networkStatus, refetch, user } }) => ({
+┊   ┊248┊    loading, networkStatus, refetch, user,
 ┊240┊249┊  }),
 ┊241┊250┊});
```

[}]: #

Boot it! ![Refetch Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-9.gif)

Now that we can see manual refreshing is working, let's fix up `update` within `sendMessage` to update the `USER_QUERY` query so manual updating is only required for strange edge cases and not all cases!

[{]: <helper> (diffStep "5.10")

#### Step 5.10: Modify createMessage mutation to update USER_QUERY

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -14,11 +14,14 @@
 ┊14┊14┊import { graphql, compose } from 'react-apollo';
 ┊15┊15┊import update from 'immutability-helper';
 ┊16┊16┊import { Buffer } from 'buffer';
+┊  ┊17┊import _ from 'lodash';
+┊  ┊18┊import moment from 'moment';
 ┊17┊19┊
 ┊18┊20┊import Message from '../components/message.component';
 ┊19┊21┊import MessageInput from '../components/message-input.component';
 ┊20┊22┊import GROUP_QUERY from '../graphql/group.query';
 ┊21┊23┊import CREATE_MESSAGE_MUTATION from '../graphql/create-message.mutation';
+┊  ┊24┊import USER_QUERY from '../graphql/user.query';
 ┊22┊25┊
 ┊23┊26┊const styles = StyleSheet.create({
 ┊24┊27┊  container: {
```
```diff
@@ -296,6 +299,34 @@
 ┊296┊299┊            },
 ┊297┊300┊            data: groupData,
 ┊298┊301┊          });
+┊   ┊302┊
+┊   ┊303┊          const userData = store.readQuery({
+┊   ┊304┊            query: USER_QUERY,
+┊   ┊305┊            variables: {
+┊   ┊306┊              id: 1, // faking the user for now
+┊   ┊307┊            },
+┊   ┊308┊          });
+┊   ┊309┊
+┊   ┊310┊          // check whether the mutation is the latest message and update cache
+┊   ┊311┊          const updatedGroup = _.find(userData.user.groups, { id: groupId });
+┊   ┊312┊          if (!updatedGroup.messages.edges.length ||
+┊   ┊313┊            moment(updatedGroup.messages.edges[0].node.createdAt).isBefore(moment(createMessage.createdAt))) {
+┊   ┊314┊            // update the latest message
+┊   ┊315┊            updatedGroup.messages.edges[0] = {
+┊   ┊316┊              __typename: 'MessageEdge',
+┊   ┊317┊              node: createMessage,
+┊   ┊318┊              cursor: Buffer.from(createMessage.id.toString()).toString('base64'),
+┊   ┊319┊            };
+┊   ┊320┊
+┊   ┊321┊            // Write our data back to the cache.
+┊   ┊322┊            store.writeQuery({
+┊   ┊323┊              query: USER_QUERY,
+┊   ┊324┊              variables: {
+┊   ┊325┊                id: 1, // faking the user for now
+┊   ┊326┊              },
+┊   ┊327┊              data: userData,
+┊   ┊328┊            });
+┊   ┊329┊          }
 ┊299┊330┊        },
 ┊300┊331┊      }),
```

[}]: #
[{]: <helper> (navStep)

| [< Previous Step](step4.md) | [Next Step >](step6.md) |
|:--------------------------------|--------------------------------:|

[}]: #

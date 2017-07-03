# Step 5: GraphQL Pagination

[//]: # (head-end)


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

Page numbering’s strength is in its simplicity. It’s a great strategy for dealing with static content or ordered content that won’t likely change during a user session.

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

```graphql
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

```graphql
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

```graphql
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

```graphql
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

We need to declare three new types in our Schema for Relay Cursor Connections:

1. `MessageConnection` -- the wrapper type that will hold the `edges` and `pageInfo` fields.
2. `MessageEdge` -- the type used for `edges` and will hold the `node` and `cursor` fields.
3. `PageInfo` -- the type use for `pageInfo` and hold the `hasPreviousPage` and `hasNextPage` fields.

We also need to change the `Group`'s `messages` field to take in Relay Cursor Connection arguments and return a `MessageConnection` instead of an array of `Messages`:

[{]: <helper> (diffStep 5.1)

#### [Step 5.1: Update Schema with Relay Cursor Connection](https://github.com/srtucker22/chatty/commit/1941c58)

##### Changed server&#x2F;data&#x2F;schema.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 4┊ 4┊  # declare custom scalars
 ┊ 5┊ 5┊  scalar Date
 ┊ 6┊ 6┊
<b>+┊  ┊ 7┊  type MessageConnection {</b>
<b>+┊  ┊ 8┊    edges: [MessageEdge]</b>
<b>+┊  ┊ 9┊    pageInfo: PageInfo!</b>
<b>+┊  ┊10┊  }</b>
<b>+┊  ┊11┊</b>
<b>+┊  ┊12┊  type MessageEdge {</b>
<b>+┊  ┊13┊    cursor: String!</b>
<b>+┊  ┊14┊    node: Message!</b>
<b>+┊  ┊15┊  }</b>
<b>+┊  ┊16┊</b>
<b>+┊  ┊17┊  type PageInfo {</b>
<b>+┊  ┊18┊    hasNextPage: Boolean!</b>
<b>+┊  ┊19┊    hasPreviousPage: Boolean!</b>
<b>+┊  ┊20┊  }</b>
<b>+┊  ┊21┊</b>
 ┊ 7┊22┊  # a group chat entity
 ┊ 8┊23┊  type Group {
 ┊ 9┊24┊    id: Int! # unique id for the group
 ┊10┊25┊    name: String # name of the group
 ┊11┊26┊    users: [User]! # users in the group
<b>+┊  ┊27┊    messages(first: Int, after: String, last: Int, before: String): MessageConnection # messages sent to the group</b>
 ┊13┊28┊  }
 ┊14┊29┊
 ┊15┊30┊  # a user -- keep type really simple for now
</pre>

[}]: #

Now instead of asking for all messages when we query for a group or groups, we will specify the `first` n `MessageEdges` `after` the cursor supplied (or the `last` n `MessageEdges` `before` the cursor supplied).

## Relay Cursor Connection Resolvers
We need to update our resolvers in `server/data/resolvers.js` to meet the spec we've just specified.

Our first order of business should be to define the cursor we will use to track which messages to retrieve.

When we create new `Messages` in SQLite, the new `Message`'s `id` is based on an monatomic incrementing integer -- a fancy way of saying that newer `Messages` will always a have higher `id` than older Messages. We can use this neat feature to base our cursor on the `Message` `id`! For example, if we requested the first 10 `Messages` after the `Message` with `id = 25`, we could run the following sequelize query:

```js
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

#### [Step 5.2: Update Resolvers with Relay Cursor Connection](https://github.com/srtucker22/chatty/commit/6729d4d)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import GraphQLDate from &#x27;graphql-date&#x27;;
 ┊ 3┊ 2┊import { Group, Message, User } from &#x27;./connectors&#x27;;
 ┊ 4┊ 3┊
 ┊ 5┊ 4┊export const resolvers &#x3D; {
 ┊ 6┊ 5┊  Date: GraphQLDate,
<b>+┊  ┊ 6┊  PageInfo: {</b>
<b>+┊  ┊ 7┊    // we will have each connection supply its own hasNextPage/hasPreviousPage functions!</b>
<b>+┊  ┊ 8┊    hasNextPage(connection, args) {</b>
<b>+┊  ┊ 9┊      return connection.hasNextPage();</b>
<b>+┊  ┊10┊    },</b>
<b>+┊  ┊11┊    hasPreviousPage(connection, args) {</b>
<b>+┊  ┊12┊      return connection.hasPreviousPage();</b>
<b>+┊  ┊13┊    },</b>
<b>+┊  ┊14┊  },</b>
 ┊ 7┊15┊  Query: {
 ┊ 8┊16┊    group(_, args) {
 ┊ 9┊17┊      return Group.find({ where: args });
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 69┊ 77┊    users(group) {
 ┊ 70┊ 78┊      return group.getUsers();
 ┊ 71┊ 79┊    },
<b>+┊   ┊ 80┊    messages(group, { first, last, before, after }) {</b>
<b>+┊   ┊ 81┊      // base query -- get messages from the right group</b>
<b>+┊   ┊ 82┊      const where &#x3D; { groupId: group.id };</b>
<b>+┊   ┊ 83┊</b>
<b>+┊   ┊ 84┊      // because we return messages from newest -&gt; oldest</b>
<b>+┊   ┊ 85┊      // before actually means newer (id &gt; cursor)</b>
<b>+┊   ┊ 86┊      // after actually means older (id &lt; cursor)</b>
<b>+┊   ┊ 87┊</b>
<b>+┊   ┊ 88┊      if (before) {</b>
<b>+┊   ┊ 89┊        // convert base-64 to utf8 id</b>
<b>+┊   ┊ 90┊        where.id &#x3D; { $gt: Buffer.from(before, &#x27;base64&#x27;).toString() };</b>
<b>+┊   ┊ 91┊      }</b>
<b>+┊   ┊ 92┊</b>
<b>+┊   ┊ 93┊      if (after) {</b>
<b>+┊   ┊ 94┊        where.id &#x3D; { $lt: Buffer.from(after, &#x27;base64&#x27;).toString() };</b>
<b>+┊   ┊ 95┊      }</b>
<b>+┊   ┊ 96┊</b>
 ┊ 73┊ 97┊      return Message.findAll({
<b>+┊   ┊ 98┊        where,</b>
<b>+┊   ┊ 99┊        order: [[&#x27;id&#x27;, &#x27;DESC&#x27;]],</b>
<b>+┊   ┊100┊        limit: first || last,</b>
<b>+┊   ┊101┊      }).then((messages) &#x3D;&gt; {</b>
<b>+┊   ┊102┊        const edges &#x3D; messages.map(message &#x3D;&gt; ({</b>
<b>+┊   ┊103┊          cursor: Buffer.from(message.id.toString()).toString(&#x27;base64&#x27;), // convert id to cursor</b>
<b>+┊   ┊104┊          node: message, // the node is the message itself</b>
<b>+┊   ┊105┊        }));</b>
<b>+┊   ┊106┊</b>
<b>+┊   ┊107┊        return {</b>
<b>+┊   ┊108┊          edges,</b>
<b>+┊   ┊109┊          pageInfo: {</b>
<b>+┊   ┊110┊            hasNextPage() {</b>
<b>+┊   ┊111┊              if (messages.length &lt; (last || first)) {</b>
<b>+┊   ┊112┊                return Promise.resolve(false);</b>
<b>+┊   ┊113┊              }</b>
<b>+┊   ┊114┊</b>
<b>+┊   ┊115┊              return Message.findOne({</b>
<b>+┊   ┊116┊                where: {</b>
<b>+┊   ┊117┊                  groupId: group.id,</b>
<b>+┊   ┊118┊                  id: {</b>
<b>+┊   ┊119┊                    [before ? &#x27;$gt&#x27; : &#x27;$lt&#x27;]: messages[messages.length - 1].id,</b>
<b>+┊   ┊120┊                  },</b>
<b>+┊   ┊121┊                },</b>
<b>+┊   ┊122┊                order: [[&#x27;id&#x27;, &#x27;DESC&#x27;]],</b>
<b>+┊   ┊123┊              }).then(message &#x3D;&gt; !!message);</b>
<b>+┊   ┊124┊            },</b>
<b>+┊   ┊125┊            hasPreviousPage() {</b>
<b>+┊   ┊126┊              return Message.findOne({</b>
<b>+┊   ┊127┊                where: {</b>
<b>+┊   ┊128┊                  groupId: group.id,</b>
<b>+┊   ┊129┊                  id: where.id,</b>
<b>+┊   ┊130┊                },</b>
<b>+┊   ┊131┊                order: [[&#x27;id&#x27;]],</b>
<b>+┊   ┊132┊              }).then(message &#x3D;&gt; !!message);</b>
<b>+┊   ┊133┊            },</b>
<b>+┊   ┊134┊          },</b>
<b>+┊   ┊135┊        };</b>
 ┊ 76┊136┊      });
 ┊ 77┊137┊    },
 ┊ 78┊138┊  },
</pre>

[}]: #

A quick test in GraphQL Playground shows everything is looking good: ![Playground Image](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step5-2.png)

# Pagination in React Native
We’re going to update our React Native client to paginate messages with an infinite scroller when viewing a group thread.

`FlatList` has a function [`onEndReached`](https://facebook.github.io/react-native/docs/flatlist.html#onendreached) that will trigger when the user has scrolled close to the end of the list (we can set how close is needed to trigger the function via `onEndReachedThreshold`). However, messaging apps like ours typically display newest messages at the bottom of the list, which means we load older data at the top. This is the reverse of how most lists operate, so we need to modify our `FlatList` to be flipped so `onEndReached` triggers when we're approaching the top of the list, not the bottom. We can use the [`inverted`](https://facebook.github.io/react-native/docs/flatlist.html#inverted) flag on `FlatList` which flips the display of the list with a nifty trick just using CSS.

[{]: <helper> (diffStep 5.3 files="client/src/screens/messages.screen.js")

#### [Step 5.3: Use inverted FlatList for Messages](https://github.com/srtucker22/chatty/commit/21b9bfb)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊84┊84┊
 ┊85┊85┊    this.state &#x3D; {
 ┊86┊86┊      usernameColors,
<b>+┊  ┊87┊      refreshing: false,</b>
 ┊87┊88┊    };
 ┊88┊89┊
 ┊89┊90┊    this.renderItem &#x3D; this.renderItem.bind(this);
 ┊90┊91┊    this.send &#x3D; this.send.bind(this);
<b>+┊  ┊92┊    this.onEndReached &#x3D; this.onEndReached.bind(this);</b>
 ┊91┊93┊  }
 ┊92┊94┊
 ┊93┊95┊  componentWillReceiveProps(nextProps) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊107┊109┊    }
 ┊108┊110┊  }
 ┊109┊111┊
<b>+┊   ┊112┊  onEndReached() {</b>
<b>+┊   ┊113┊    console.log(&#x27;TODO: onEndReached&#x27;);</b>
<b>+┊   ┊114┊  }</b>
<b>+┊   ┊115┊</b>
 ┊110┊116┊  send(text) {
 ┊111┊117┊    this.props.createMessage({
 ┊112┊118┊      groupId: this.props.navigation.state.params.groupId,
 ┊113┊119┊      userId: 1, // faking the user for now
 ┊114┊120┊      text,
 ┊115┊121┊    }).then(() &#x3D;&gt; {
<b>+┊   ┊122┊      this.flatList.scrollToIndex({ index: 0, animated: true });</b>
 ┊117┊123┊    });
 ┊118┊124┊  }
 ┊119┊125┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊131┊137┊    const { loading, group } &#x3D; this.props;
 ┊132┊138┊
 ┊133┊139┊    // render loading placeholder while we fetch messages
<b>+┊   ┊140┊    if (loading || !group) {</b>
 ┊135┊141┊      return (
 ┊136┊142┊        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;
 ┊137┊143┊          &lt;ActivityIndicator /&gt;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊149┊155┊      &gt;
 ┊150┊156┊        &lt;FlatList
 ┊151┊157┊          ref&#x3D;{(ref) &#x3D;&gt; { this.flatList &#x3D; ref; }}
<b>+┊   ┊158┊          inverted</b>
<b>+┊   ┊159┊          data&#x3D;{group.messages}</b>
 ┊153┊160┊          keyExtractor&#x3D;{this.keyExtractor}
 ┊154┊161┊          renderItem&#x3D;{this.renderItem}
 ┊155┊162┊          ListEmptyComponent&#x3D;{&lt;View /&gt;}
<b>+┊   ┊163┊          onEndReached&#x3D;{this.onEndReached}</b>
 ┊156┊164┊        /&gt;
 ┊157┊165┊        &lt;MessageInput send&#x3D;{this.send} /&gt;
 ┊158┊166┊      &lt;/KeyboardAvoidingView&gt;
</pre>

[}]: #

Now let’s update `GROUP_QUERY` in `client/src/graphql/group.query.js` to match our latest schema:

[{]: <helper> (diffStep 5.4)

#### [Step 5.4: Update Group Query with Relay Cursor Connections](https://github.com/srtucker22/chatty/commit/fef9414)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.query.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊3┊3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;
 ┊4┊4┊
 ┊5┊5┊const GROUP_QUERY &#x3D; gql&#x60;
<b>+┊ ┊6┊  query group($groupId: Int!, $first: Int, $after: String, $last: Int, $before: String) {</b>
 ┊7┊7┊    group(id: $groupId) {
 ┊8┊8┊      id
 ┊9┊9┊      name
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊11┊11┊        id
 ┊12┊12┊        username
 ┊13┊13┊      }
<b>+┊  ┊14┊      messages(first: $first, after: $after, last: $last, before: $before) {</b>
<b>+┊  ┊15┊        edges {</b>
<b>+┊  ┊16┊          cursor</b>
<b>+┊  ┊17┊          node {</b>
<b>+┊  ┊18┊            ... MessageFragment</b>
<b>+┊  ┊19┊          }</b>
<b>+┊  ┊20┊        }</b>
<b>+┊  ┊21┊        pageInfo {</b>
<b>+┊  ┊22┊          hasNextPage</b>
<b>+┊  ┊23┊          hasPreviousPage</b>
<b>+┊  ┊24┊        }</b>
 ┊16┊25┊      }
 ┊17┊26┊    }
 ┊18┊27┊  }
</pre>

[}]: #

We now have the ability to pass `first`, `after`, `last`, and `before` variables into the `group` query called by our `Messages` component. Those variables will get passed to our `messages` field, where we will receive a `MessageConnection` with all the fields we need.

We need to specify how `group` should look on a first run, and how to load more entries using the same query. The `graphql` module of `react-apollo` exposes a [`fetchMore`](http://dev.apollodata.com/react/pagination.html#fetch-more) function on the data prop where we can define how to update our query and our data:

[{]: <helper> (diffStep 5.5)

#### [Step 5.5: Add fetchMore to groupQuery](https://github.com/srtucker22/chatty/commit/7fd4d29)

##### Changed client&#x2F;package.json
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊13┊13┊		&quot;apollo-link-error&quot;: &quot;^1.0.7&quot;,
 ┊14┊14┊		&quot;apollo-link-http&quot;: &quot;^1.3.3&quot;,
 ┊15┊15┊		&quot;apollo-link-redux&quot;: &quot;^0.2.1&quot;,
<b>+┊  ┊16┊		&quot;buffer&quot;: &quot;^5.0.8&quot;,</b>
 ┊16┊17┊		&quot;graphql&quot;: &quot;^0.12.3&quot;,
 ┊17┊18┊		&quot;graphql-tag&quot;: &quot;^2.4.2&quot;,
 ┊18┊19┊		&quot;immutability-helper&quot;: &quot;^2.6.4&quot;,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊12┊12┊import React, { Component } from &#x27;react&#x27;;
 ┊13┊13┊import randomColor from &#x27;randomcolor&#x27;;
 ┊14┊14┊import { graphql, compose } from &#x27;react-apollo&#x27;;
<b>+┊  ┊15┊import update from &#x27;immutability-helper&#x27;;</b>
<b>+┊  ┊16┊import { Buffer } from &#x27;buffer&#x27;;</b>
 ┊15┊17┊
 ┊16┊18┊import Message from &#x27;../components/message.component&#x27;;
 ┊17┊19┊import MessageInput from &#x27;../components/message-input.component&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊84┊86┊
 ┊85┊87┊    this.state &#x3D; {
 ┊86┊88┊      usernameColors,
 ┊88┊89┊    };
 ┊89┊90┊
 ┊90┊91┊    this.renderItem &#x3D; this.renderItem.bind(this);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊123┊124┊    });
 ┊124┊125┊  }
 ┊125┊126┊
<b>+┊   ┊127┊  keyExtractor &#x3D; item &#x3D;&gt; item.node.id.toString();</b>
 ┊127┊128┊
<b>+┊   ┊129┊  renderItem &#x3D; ({ item: edge }) &#x3D;&gt; {</b>
<b>+┊   ┊130┊    const message &#x3D; edge.node;</b>
<b>+┊   ┊131┊</b>
<b>+┊   ┊132┊    return (</b>
<b>+┊   ┊133┊      &lt;Message</b>
<b>+┊   ┊134┊        color&#x3D;{this.state.usernameColors[message.from.username]}</b>
<b>+┊   ┊135┊        isCurrentUser&#x3D;{message.from.id &#x3D;&#x3D;&#x3D; 1} // for now until we implement auth</b>
<b>+┊   ┊136┊        message&#x3D;{message}</b>
<b>+┊   ┊137┊      /&gt;</b>
<b>+┊   ┊138┊    );</b>
<b>+┊   ┊139┊  }</b>
 ┊135┊140┊
 ┊136┊141┊  render() {
 ┊137┊142┊    const { loading, group } &#x3D; this.props;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊156┊161┊        &lt;FlatList
 ┊157┊162┊          ref&#x3D;{(ref) &#x3D;&gt; { this.flatList &#x3D; ref; }}
 ┊158┊163┊          inverted
<b>+┊   ┊164┊          data&#x3D;{group.messages.edges}</b>
 ┊160┊165┊          keyExtractor&#x3D;{this.keyExtractor}
 ┊161┊166┊          renderItem&#x3D;{this.renderItem}
 ┊162┊167┊          ListEmptyComponent&#x3D;{&lt;View /&gt;}
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊179┊184┊    }),
 ┊180┊185┊  }),
 ┊181┊186┊  group: PropTypes.shape({
<b>+┊   ┊187┊    messages: PropTypes.shape({</b>
<b>+┊   ┊188┊      edges: PropTypes.arrayOf(PropTypes.shape({</b>
<b>+┊   ┊189┊        cursor: PropTypes.string,</b>
<b>+┊   ┊190┊        node: PropTypes.object,</b>
<b>+┊   ┊191┊      })),</b>
<b>+┊   ┊192┊      pageInfo: PropTypes.shape({</b>
<b>+┊   ┊193┊        hasNextPage: PropTypes.bool,</b>
<b>+┊   ┊194┊        hasPreviousPage: PropTypes.bool,</b>
<b>+┊   ┊195┊      }),</b>
<b>+┊   ┊196┊    }),</b>
 ┊183┊197┊    users: PropTypes.array,
 ┊184┊198┊  }),
 ┊185┊199┊  loading: PropTypes.bool,
<b>+┊   ┊200┊  loadMoreEntries: PropTypes.func,</b>
 ┊186┊201┊};
 ┊187┊202┊
<b>+┊   ┊203┊const ITEMS_PER_PAGE &#x3D; 10;</b>
 ┊188┊204┊const groupQuery &#x3D; graphql(GROUP_QUERY, {
 ┊189┊205┊  options: ownProps &#x3D;&gt; ({
 ┊190┊206┊    variables: {
 ┊191┊207┊      groupId: ownProps.navigation.state.params.groupId,
<b>+┊   ┊208┊      first: ITEMS_PER_PAGE,</b>
 ┊192┊209┊    },
 ┊193┊210┊  }),
<b>+┊   ┊211┊  props: ({ data: { fetchMore, loading, group } }) &#x3D;&gt; ({</b>
<b>+┊   ┊212┊    loading,</b>
<b>+┊   ┊213┊    group,</b>
<b>+┊   ┊214┊    loadMoreEntries() {</b>
<b>+┊   ┊215┊      return fetchMore({</b>
<b>+┊   ┊216┊        // query: ... (you can specify a different query.</b>
<b>+┊   ┊217┊        // GROUP_QUERY is used by default)</b>
<b>+┊   ┊218┊        variables: {</b>
<b>+┊   ┊219┊          // load more queries starting from the cursor of the last (oldest) message</b>
<b>+┊   ┊220┊          after: group.messages.edges[group.messages.edges.length - 1].cursor,</b>
<b>+┊   ┊221┊        },</b>
<b>+┊   ┊222┊        updateQuery: (previousResult, { fetchMoreResult }) &#x3D;&gt; {</b>
<b>+┊   ┊223┊          // we will make an extra call to check if no more entries</b>
<b>+┊   ┊224┊          if (!fetchMoreResult) { return previousResult; }</b>
<b>+┊   ┊225┊          // push results (older messages) to end of messages list</b>
<b>+┊   ┊226┊          return update(previousResult, {</b>
<b>+┊   ┊227┊            group: {</b>
<b>+┊   ┊228┊              messages: {</b>
<b>+┊   ┊229┊                edges: { $push: fetchMoreResult.group.messages.edges },</b>
<b>+┊   ┊230┊                pageInfo: { $set: fetchMoreResult.group.messages.pageInfo },</b>
<b>+┊   ┊231┊              },</b>
<b>+┊   ┊232┊            },</b>
<b>+┊   ┊233┊          });</b>
<b>+┊   ┊234┊        },</b>
<b>+┊   ┊235┊      });</b>
<b>+┊   ┊236┊    },</b>
 ┊196┊237┊  }),
 ┊197┊238┊});
 ┊198┊239┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊225┊266┊            query: GROUP_QUERY,
 ┊226┊267┊            variables: {
 ┊227┊268┊              groupId,
<b>+┊   ┊269┊              first: ITEMS_PER_PAGE,</b>
 ┊228┊270┊            },
 ┊229┊271┊          });
 ┊230┊272┊
 ┊231┊273┊          // Add our message from the mutation to the end.
<b>+┊   ┊274┊          groupData.group.messages.edges.unshift({</b>
<b>+┊   ┊275┊            __typename: &#x27;MessageEdge&#x27;,</b>
<b>+┊   ┊276┊            node: createMessage,</b>
<b>+┊   ┊277┊            cursor: Buffer.from(createMessage.id.toString()).toString(&#x27;base64&#x27;),</b>
<b>+┊   ┊278┊          });</b>
 ┊233┊279┊
 ┊234┊280┊          // Write our data back to the cache.
 ┊235┊281┊          store.writeQuery({
 ┊236┊282┊            query: GROUP_QUERY,
 ┊237┊283┊            variables: {
 ┊238┊284┊              groupId,
<b>+┊   ┊285┊              first: ITEMS_PER_PAGE,</b>
 ┊239┊286┊            },
 ┊240┊287┊            data: groupData,
 ┊241┊288┊          });
</pre>

[}]: #

We’ve specified `first: 10` in our initial run of the query. When our component executes `this.props.loadMoreEntries`, we update the `after` cursor with the `cursor` of the last `edge` from our previous results, fetch up to 10 more messages, and update our app’s state to push the edges to the end of our data set and set whether there is a next page.

Since we are returning `edges` now, we need to update our `Messages` component to look for `group.messages.edges[x].node` instead of `group.messages[x]`.

We also need to modify the `update` function in our mutations to match our updated `GROUP_QUERY` variables.

We should also create and append an `edge` to our cached query data whenever we create a new `Message`. This means deriving the `cursor` for the new `Message` we've created as well.

We finally need to update the `Messages` component to call `this.props.loadMoreEntries` when we call `onEndReached`:

[{]: <helper> (diffStep 5.6)

#### [Step 5.6: Apply loadMoreEntries to onEndReached](https://github.com/srtucker22/chatty/commit/2702513)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊111┊111┊  }
 ┊112┊112┊
 ┊113┊113┊  onEndReached() {
<b>+┊   ┊114┊    if (!this.state.loadingMoreEntries &amp;&amp;</b>
<b>+┊   ┊115┊      this.props.group.messages.pageInfo.hasNextPage) {</b>
<b>+┊   ┊116┊      this.setState({</b>
<b>+┊   ┊117┊        loadingMoreEntries: true,</b>
<b>+┊   ┊118┊      });</b>
<b>+┊   ┊119┊      this.props.loadMoreEntries().then(() &#x3D;&gt; {</b>
<b>+┊   ┊120┊        this.setState({</b>
<b>+┊   ┊121┊          loadingMoreEntries: false,</b>
<b>+┊   ┊122┊        });</b>
<b>+┊   ┊123┊      });</b>
<b>+┊   ┊124┊    }</b>
 ┊115┊125┊  }
 ┊116┊126┊
 ┊117┊127┊  send(text) {
</pre>

[}]: #

Boot it up for some pagination! ![Pagination Gif](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step5-6.gif)

We can also modify the Groups component to preview the most recent message for each group. Using the same methodology, we’ll first update `USER_QUERY`:

[{]: <helper> (diffStep 5.7)

#### [Step 5.7: Add most recent message to each Group in USER_QUERY](https://github.com/srtucker22/chatty/commit/2c41450)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import gql from &#x27;graphql-tag&#x27;;
 ┊2┊2┊
<b>+┊ ┊3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b>+┊ ┊4┊</b>
 ┊3┊5┊const CREATE_GROUP_MUTATION &#x3D; gql&#x60;
 ┊4┊6┊  mutation createGroup($name: String!, $userIds: [Int!], $userId: Int!) {
 ┊5┊7┊    createGroup(name: $name, userIds: $userIds, userId: $userId) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 8┊10┊      users {
 ┊ 9┊11┊        id
 ┊10┊12┊      }
<b>+┊  ┊13┊      messages(first: 1) { # we don&#x27;t need to use variables</b>
<b>+┊  ┊14┊        edges {</b>
<b>+┊  ┊15┊          cursor</b>
<b>+┊  ┊16┊          node {</b>
<b>+┊  ┊17┊            ... MessageFragment</b>
<b>+┊  ┊18┊          }</b>
<b>+┊  ┊19┊        }</b>
<b>+┊  ┊20┊      }</b>
 ┊11┊21┊    }
 ┊12┊22┊  }
<b>+┊  ┊23┊  ${MESSAGE_FRAGMENT}</b>
 ┊13┊24┊&#x60;;
 ┊14┊25┊
 ┊15┊26┊export default CREATE_GROUP_MUTATION;
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;user.query.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import gql from &#x27;graphql-tag&#x27;;
 ┊2┊2┊
<b>+┊ ┊3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b>+┊ ┊4┊</b>
 ┊3┊5┊// get the user and all user&#x27;s groups
 ┊4┊6┊export const USER_QUERY &#x3D; gql&#x60;
 ┊5┊7┊  query user($id: Int) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊10┊12┊      groups {
 ┊11┊13┊        id
 ┊12┊14┊        name
<b>+┊  ┊15┊        messages(first: 1) { # we don&#x27;t need to use variables</b>
<b>+┊  ┊16┊          edges {</b>
<b>+┊  ┊17┊            cursor</b>
<b>+┊  ┊18┊            node {</b>
<b>+┊  ┊19┊              ... MessageFragment</b>
<b>+┊  ┊20┊            }</b>
<b>+┊  ┊21┊          }</b>
<b>+┊  ┊22┊        }</b>
 ┊13┊23┊      }
 ┊14┊24┊      friends {
 ┊15┊25┊        id
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊17┊27┊      }
 ┊18┊28┊    }
 ┊19┊29┊  }
<b>+┊  ┊30┊  ${MESSAGE_FRAGMENT}</b>
 ┊20┊31┊&#x60;;
 ┊21┊32┊
 ┊22┊33┊export default USER_QUERY;
</pre>

[}]: #

And then we update the layout of the Group list item component in `Groups`:

[{]: <helper> (diffStep 5.8)

#### [Step 5.8: Modify Group component to include latest message](https://github.com/srtucker22/chatty/commit/61d62c5)

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 4┊ 4┊  FlatList,
 ┊ 5┊ 5┊  ActivityIndicator,
 ┊ 6┊ 6┊  Button,
<b>+┊  ┊ 7┊  Image,</b>
 ┊ 7┊ 8┊  StyleSheet,
 ┊ 8┊ 9┊  Text,
 ┊ 9┊10┊  TouchableHighlight,
 ┊10┊11┊  View,
 ┊11┊12┊} from &#x27;react-native&#x27;;
 ┊12┊13┊import { graphql } from &#x27;react-apollo&#x27;;
<b>+┊  ┊14┊import moment from &#x27;moment&#x27;;</b>
<b>+┊  ┊15┊import Icon from &#x27;react-native-vector-icons/FontAwesome&#x27;;</b>
 ┊13┊16┊
 ┊14┊17┊import { USER_QUERY } from &#x27;../graphql/user.query&#x27;;
 ┊15┊18┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊36┊39┊    fontWeight: &#x27;bold&#x27;,
 ┊37┊40┊    flex: 0.7,
 ┊38┊41┊  },
<b>+┊  ┊42┊  groupTextContainer: {</b>
<b>+┊  ┊43┊    flex: 1,</b>
<b>+┊  ┊44┊    flexDirection: &#x27;column&#x27;,</b>
<b>+┊  ┊45┊    paddingLeft: 6,</b>
<b>+┊  ┊46┊  },</b>
<b>+┊  ┊47┊  groupText: {</b>
<b>+┊  ┊48┊    color: &#x27;#8c8c8c&#x27;,</b>
<b>+┊  ┊49┊  },</b>
<b>+┊  ┊50┊  groupImage: {</b>
<b>+┊  ┊51┊    width: 54,</b>
<b>+┊  ┊52┊    height: 54,</b>
<b>+┊  ┊53┊    borderRadius: 27,</b>
<b>+┊  ┊54┊  },</b>
<b>+┊  ┊55┊  groupTitleContainer: {</b>
<b>+┊  ┊56┊    flexDirection: &#x27;row&#x27;,</b>
<b>+┊  ┊57┊  },</b>
<b>+┊  ┊58┊  groupLastUpdated: {</b>
<b>+┊  ┊59┊    flex: 0.3,</b>
<b>+┊  ┊60┊    color: &#x27;#8c8c8c&#x27;,</b>
<b>+┊  ┊61┊    fontSize: 11,</b>
<b>+┊  ┊62┊    textAlign: &#x27;right&#x27;,</b>
<b>+┊  ┊63┊  },</b>
<b>+┊  ┊64┊  groupUsername: {</b>
<b>+┊  ┊65┊    paddingVertical: 4,</b>
<b>+┊  ┊66┊  },</b>
 ┊39┊67┊  header: {
 ┊40┊68┊    alignItems: &#x27;flex-end&#x27;,
 ┊41┊69┊    padding: 6,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊48┊76┊  },
 ┊49┊77┊});
 ┊50┊78┊
<b>+┊  ┊79┊// format createdAt with moment</b>
<b>+┊  ┊80┊const formatCreatedAt &#x3D; createdAt &#x3D;&gt; moment(createdAt).calendar(null, {</b>
<b>+┊  ┊81┊  sameDay: &#x27;[Today]&#x27;,</b>
<b>+┊  ┊82┊  nextDay: &#x27;[Tomorrow]&#x27;,</b>
<b>+┊  ┊83┊  nextWeek: &#x27;dddd&#x27;,</b>
<b>+┊  ┊84┊  lastDay: &#x27;[Yesterday]&#x27;,</b>
<b>+┊  ┊85┊  lastWeek: &#x27;dddd&#x27;,</b>
<b>+┊  ┊86┊  sameElse: &#x27;DD/MM/YYYY&#x27;,</b>
<b>+┊  ┊87┊});</b>
<b>+┊  ┊88┊</b>
 ┊51┊89┊const Header &#x3D; ({ onPress }) &#x3D;&gt; (
 ┊52┊90┊  &lt;View style&#x3D;{styles.header}&gt;
 ┊53┊91┊    &lt;Button title&#x3D;{&#x27;New Group&#x27;} onPress&#x3D;{onPress} /&gt;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 65┊103┊  }
 ┊ 66┊104┊
 ┊ 67┊105┊  render() {
<b>+┊   ┊106┊    const { id, name, messages } &#x3D; this.props.group;</b>
 ┊ 69┊107┊    return (
 ┊ 70┊108┊      &lt;TouchableHighlight
 ┊ 71┊109┊        key&#x3D;{id}
 ┊ 72┊110┊        onPress&#x3D;{this.goToMessages}
 ┊ 73┊111┊      &gt;
 ┊ 74┊112┊        &lt;View style&#x3D;{styles.groupContainer}&gt;
<b>+┊   ┊113┊          &lt;Image</b>
<b>+┊   ┊114┊            style&#x3D;{styles.groupImage}</b>
<b>+┊   ┊115┊            source&#x3D;{{</b>
<b>+┊   ┊116┊              uri: &#x27;https://reactjs.org/logo-og.png&#x27;,</b>
<b>+┊   ┊117┊            }}</b>
<b>+┊   ┊118┊          /&gt;</b>
<b>+┊   ┊119┊          &lt;View style&#x3D;{styles.groupTextContainer}&gt;</b>
<b>+┊   ┊120┊            &lt;View style&#x3D;{styles.groupTitleContainer}&gt;</b>
<b>+┊   ┊121┊              &lt;Text style&#x3D;{styles.groupName}&gt;{&#x60;${name}&#x60;}&lt;/Text&gt;</b>
<b>+┊   ┊122┊              &lt;Text style&#x3D;{styles.groupLastUpdated}&gt;</b>
<b>+┊   ┊123┊                {messages.edges.length ?</b>
<b>+┊   ┊124┊                  formatCreatedAt(messages.edges[0].node.createdAt) : &#x27;&#x27;}</b>
<b>+┊   ┊125┊              &lt;/Text&gt;</b>
<b>+┊   ┊126┊            &lt;/View&gt;</b>
<b>+┊   ┊127┊            &lt;Text style&#x3D;{styles.groupUsername}&gt;</b>
<b>+┊   ┊128┊              {messages.edges.length ?</b>
<b>+┊   ┊129┊                &#x60;${messages.edges[0].node.from.username}:&#x60; : &#x27;&#x27;}</b>
<b>+┊   ┊130┊            &lt;/Text&gt;</b>
<b>+┊   ┊131┊            &lt;Text style&#x3D;{styles.groupText} numberOfLines&#x3D;{1}&gt;</b>
<b>+┊   ┊132┊              {messages.edges.length ? messages.edges[0].node.text : &#x27;&#x27;}</b>
<b>+┊   ┊133┊            &lt;/Text&gt;</b>
<b>+┊   ┊134┊          &lt;/View&gt;</b>
<b>+┊   ┊135┊          &lt;Icon</b>
<b>+┊   ┊136┊            name&#x3D;&quot;angle-right&quot;</b>
<b>+┊   ┊137┊            size&#x3D;{24}</b>
<b>+┊   ┊138┊            color&#x3D;{&#x27;#8c8c8c&#x27;}</b>
<b>+┊   ┊139┊          /&gt;</b>
 ┊ 76┊140┊        &lt;/View&gt;
 ┊ 77┊141┊      &lt;/TouchableHighlight&gt;
 ┊ 78┊142┊    );
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 84┊148┊  group: PropTypes.shape({
 ┊ 85┊149┊    id: PropTypes.number,
 ┊ 86┊150┊    name: PropTypes.string,
<b>+┊   ┊151┊    messages: PropTypes.shape({</b>
<b>+┊   ┊152┊      edges: PropTypes.arrayOf(PropTypes.shape({</b>
<b>+┊   ┊153┊        cursor: PropTypes.string,</b>
<b>+┊   ┊154┊        node: PropTypes.object,</b>
<b>+┊   ┊155┊      })),</b>
<b>+┊   ┊156┊    }),</b>
 ┊ 87┊157┊  }),
 ┊ 88┊158┊};
</pre>

[}]: #

![Layout Image](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step5-8.png)

# Refreshing Data
We can apply some of the tricks we’ve just learned to also give users a way to manually refresh data. Currently, if a user sends a message to a group, this new message won’t show up as the latest message on the groups page.

We could solve this problem by modifying `update` within `sendMessage` to update the `USER_QUERY` query. But let’s hold off on implementing that fix and use this opportunity to test manual refreshing.

In addition to `fetchMore`, `graphql` also exposes a [`refetch`](http://dev.apollodata.com/core/apollo-client-api.html#ObservableQuery.refetch) function on the data prop. Executing this function will force the query to refetch data.

We can modify our `FlatList` to use a built-in [`RefreshControl`](https://facebook.github.io/react-native/docs/refreshcontrol.html) component via [`onRefresh`](https://facebook.github.io/react-native/docs/flatlist.html#onrefresh). When the user pulls down the list, `FlatList` will trigger `onRefresh` where we will `refetch` the `user` query.

We also need to pass a `refreshing` parameter to `FlatList` to let it know when to show or hide the `RefreshControl`. We can set simply set `refreshing` to check for the `networkStatus` of our query. `networkStatus === 4` means the data is still loading.

[{]: <helper> (diffStep 5.9)

#### [Step 5.9: Manual Refresh Groups](https://github.com/srtucker22/chatty/commit/e4564bb)

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊166┊166┊    super(props);
 ┊167┊167┊    this.goToMessages &#x3D; this.goToMessages.bind(this);
 ┊168┊168┊    this.goToNewGroup &#x3D; this.goToNewGroup.bind(this);
<b>+┊   ┊169┊    this.onRefresh &#x3D; this.onRefresh.bind(this);</b>
<b>+┊   ┊170┊  }</b>
<b>+┊   ┊171┊</b>
<b>+┊   ┊172┊  onRefresh() {</b>
<b>+┊   ┊173┊    this.props.refetch();</b>
 ┊169┊174┊  }
 ┊170┊175┊
 ┊171┊176┊  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊183┊188┊  renderItem &#x3D; ({ item }) &#x3D;&gt; &lt;Group group&#x3D;{item} goToMessages&#x3D;{this.goToMessages} /&gt;;
 ┊184┊189┊
 ┊185┊190┊  render() {
<b>+┊   ┊191┊    const { loading, user, networkStatus } &#x3D; this.props;</b>
 ┊187┊192┊
 ┊188┊193┊    // render loading placeholder while we fetch messages
 ┊189┊194┊    if (loading || !user) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊211┊216┊          keyExtractor&#x3D;{this.keyExtractor}
 ┊212┊217┊          renderItem&#x3D;{this.renderItem}
 ┊213┊218┊          ListHeaderComponent&#x3D;{() &#x3D;&gt; &lt;Header onPress&#x3D;{this.goToNewGroup} /&gt;}
<b>+┊   ┊219┊          onRefresh&#x3D;{this.onRefresh}</b>
<b>+┊   ┊220┊          refreshing&#x3D;{networkStatus &#x3D;&#x3D;&#x3D; 4}</b>
 ┊214┊221┊        /&gt;
 ┊215┊222┊      &lt;/View&gt;
 ┊216┊223┊    );
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊221┊228┊    navigate: PropTypes.func,
 ┊222┊229┊  }),
 ┊223┊230┊  loading: PropTypes.bool,
<b>+┊   ┊231┊  networkStatus: PropTypes.number,</b>
<b>+┊   ┊232┊  refetch: PropTypes.func,</b>
 ┊224┊233┊  user: PropTypes.shape({
 ┊225┊234┊    id: PropTypes.number.isRequired,
 ┊226┊235┊    email: PropTypes.string.isRequired,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊235┊244┊
 ┊236┊245┊const userQuery &#x3D; graphql(USER_QUERY, {
 ┊237┊246┊  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
<b>+┊   ┊247┊  props: ({ data: { loading, networkStatus, refetch, user } }) &#x3D;&gt; ({</b>
<b>+┊   ┊248┊    loading, networkStatus, refetch, user,</b>
 ┊240┊249┊  }),
 ┊241┊250┊});
</pre>

[}]: #

Boot it! ![Refetch Gif](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step5-9.gif)

Now that we can see manual refreshing is working, let's fix up `update` within `sendMessage` to update the `USER_QUERY` query so manual updating is only required for strange edge cases and not all cases!

[{]: <helper> (diffStep "5.10")

#### [Step 5.10: Modify createMessage mutation to update USER_QUERY](https://github.com/srtucker22/chatty/commit/4ac7642)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊14┊14┊import { graphql, compose } from &#x27;react-apollo&#x27;;
 ┊15┊15┊import update from &#x27;immutability-helper&#x27;;
 ┊16┊16┊import { Buffer } from &#x27;buffer&#x27;;
<b>+┊  ┊17┊import _ from &#x27;lodash&#x27;;</b>
<b>+┊  ┊18┊import moment from &#x27;moment&#x27;;</b>
 ┊17┊19┊
 ┊18┊20┊import Message from &#x27;../components/message.component&#x27;;
 ┊19┊21┊import MessageInput from &#x27;../components/message-input.component&#x27;;
 ┊20┊22┊import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;
 ┊21┊23┊import CREATE_MESSAGE_MUTATION from &#x27;../graphql/create-message.mutation&#x27;;
<b>+┊  ┊24┊import USER_QUERY from &#x27;../graphql/user.query&#x27;;</b>
 ┊22┊25┊
 ┊23┊26┊const styles &#x3D; StyleSheet.create({
 ┊24┊27┊  container: {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊296┊299┊            },
 ┊297┊300┊            data: groupData,
 ┊298┊301┊          });
<b>+┊   ┊302┊</b>
<b>+┊   ┊303┊          const userData &#x3D; store.readQuery({</b>
<b>+┊   ┊304┊            query: USER_QUERY,</b>
<b>+┊   ┊305┊            variables: {</b>
<b>+┊   ┊306┊              id: 1, // faking the user for now</b>
<b>+┊   ┊307┊            },</b>
<b>+┊   ┊308┊          });</b>
<b>+┊   ┊309┊</b>
<b>+┊   ┊310┊          // check whether the mutation is the latest message and update cache</b>
<b>+┊   ┊311┊          const updatedGroup &#x3D; _.find(userData.user.groups, { id: groupId });</b>
<b>+┊   ┊312┊          if (!updatedGroup.messages.edges.length ||</b>
<b>+┊   ┊313┊            moment(updatedGroup.messages.edges[0].node.createdAt).isBefore(moment(createMessage.createdAt))) {</b>
<b>+┊   ┊314┊            // update the latest message</b>
<b>+┊   ┊315┊            updatedGroup.messages.edges[0] &#x3D; {</b>
<b>+┊   ┊316┊              __typename: &#x27;MessageEdge&#x27;,</b>
<b>+┊   ┊317┊              node: createMessage,</b>
<b>+┊   ┊318┊              cursor: Buffer.from(createMessage.id.toString()).toString(&#x27;base64&#x27;),</b>
<b>+┊   ┊319┊            };</b>
<b>+┊   ┊320┊</b>
<b>+┊   ┊321┊            // Write our data back to the cache.</b>
<b>+┊   ┊322┊            store.writeQuery({</b>
<b>+┊   ┊323┊              query: USER_QUERY,</b>
<b>+┊   ┊324┊              variables: {</b>
<b>+┊   ┊325┊                id: 1, // faking the user for now</b>
<b>+┊   ┊326┊              },</b>
<b>+┊   ┊327┊              data: userData,</b>
<b>+┊   ┊328┊            });</b>
<b>+┊   ┊329┊          }</b>
 ┊299┊330┊        },
 ┊300┊331┊      }),
</pre>

[}]: #


[//]: # (foot-start)

[{]: <helper> (navStep)

⟸ <a href="https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/medium/step4.md">PREVIOUS STEP</a> <b>║</b> <a href="https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/medium/step6.md">NEXT STEP</a> ⟹

[}]: #

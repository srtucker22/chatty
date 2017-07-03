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
<pre>

...

  # declare custom scalars
  scalar Date

<b>  type MessageConnection {</b>
<b>    edges: [MessageEdge]</b>
<b>    pageInfo: PageInfo!</b>
<b>  }</b>
<b></b>
<b>  type MessageEdge {</b>
<b>    cursor: String!</b>
<b>    node: Message!</b>
<b>  }</b>
<b></b>
<b>  type PageInfo {</b>
<b>    hasNextPage: Boolean!</b>
<b>    hasPreviousPage: Boolean!</b>
<b>  }</b>
<b></b>
  # a group chat entity
  type Group {
    id: Int! # unique id for the group
    name: String # name of the group
    users: [User]! # users in the group
<b>    messages(first: Int, after: String, last: Int, before: String): MessageConnection # messages sent to the group</b>
  }

  # a user -- keep type really simple for now
</pre>

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
<pre>

...

import GraphQLDate from &#x27;graphql-date&#x27;;
import { Group, Message, User } from &#x27;./connectors&#x27;;

export const Resolvers &#x3D; {
  Date: GraphQLDate,
<b>  PageInfo: {</b>
<b>    // we will have each connection supply its own hasNextPage/hasPreviousPage functions!</b>
<b>    hasNextPage(connection, args) {</b>
<b>      return connection.hasNextPage();</b>
<b>    },</b>
<b>    hasPreviousPage(connection, args) {</b>
<b>      return connection.hasPreviousPage();</b>
<b>    },</b>
<b>  },</b>
  Query: {
    group(_, args) {
      return Group.find({ where: args });
</pre>
<pre>

...

    users(group) {
      return group.getUsers();
    },
<b>    messages(group, { first, last, before, after }) {</b>
<b>      // base query -- get messages from the right group</b>
<b>      const where &#x3D; { groupId: group.id };</b>
<b></b>
<b>      // because we return messages from newest -&gt; oldest</b>
<b>      // before actually means newer (id &gt; cursor)</b>
<b>      // after actually means older (id &lt; cursor)</b>
<b></b>
<b>      if (before) {</b>
<b>        // convert base-64 to utf8 id</b>
<b>        where.id &#x3D; { $gt: Buffer.from(before, &#x27;base64&#x27;).toString() };</b>
<b>      }</b>
<b></b>
<b>      if (after) {</b>
<b>        where.id &#x3D; { $lt: Buffer.from(after, &#x27;base64&#x27;).toString() };</b>
<b>      }</b>
<b></b>
      return Message.findAll({
<b>        where,</b>
<b>        order: [[&#x27;id&#x27;, &#x27;DESC&#x27;]],</b>
<b>        limit: first || last,</b>
<b>      }).then((messages) &#x3D;&gt; {</b>
<b>        const edges &#x3D; messages.map(message &#x3D;&gt; ({</b>
<b>          cursor: Buffer.from(message.id.toString()).toString(&#x27;base64&#x27;), // convert id to cursor</b>
<b>          node: message, // the node is the message itself</b>
<b>        }));</b>
<b></b>
<b>        return {</b>
<b>          edges,</b>
<b>          pageInfo: {</b>
<b>            hasNextPage() {</b>
<b>              if (messages.length &lt; (last || first)) {</b>
<b>                return Promise.resolve(false);</b>
<b>              }</b>
<b></b>
<b>              return Message.findOne({</b>
<b>                where: {</b>
<b>                  groupId: group.id,</b>
<b>                  id: {</b>
<b>                    [before ? &#x27;$gt&#x27; : &#x27;$lt&#x27;]: messages[messages.length - 1].id,</b>
<b>                  },</b>
<b>                },</b>
<b>                order: [[&#x27;id&#x27;, &#x27;DESC&#x27;]],</b>
<b>              }).then(message &#x3D;&gt; !!message);</b>
<b>            },</b>
<b>            hasPreviousPage() {</b>
<b>              return Message.findOne({</b>
<b>                where: {</b>
<b>                  groupId: group.id,</b>
<b>                  id: where.id,</b>
<b>                },</b>
<b>                order: [[&#x27;id&#x27;]],</b>
<b>              }).then(message &#x3D;&gt; !!message);</b>
<b>            },</b>
<b>          },</b>
<b>        };</b>
      });
    },
  },
</pre>

[}]: #

A quick test in GraphIQL shows everything is looking good: ![GraphIQL Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-2.png)

# Pagination in React Native
We’re going to update our React Native client to paginate messages with an infinite scroller when viewing a group thread.

`FlatList` has a function [`onEndReached`](https://facebook.github.io/react-native/docs/flatlist.html#onendreached) that will trigger when the user has scrolled close to the end of the list (we can set how close is needed to trigger the function via `onEndReachedThreshold`). However, messaging apps like ours typically display newest messages at the bottom of the list, which means we load older data at the top. This is the reverse of how most lists operate, so we need to modify our `FlatList` to be flipped so `onEndReached` triggers when we're approaching the top of the list, not the bottom. We can use the [`inverted`](https://facebook.github.io/react-native/docs/flatlist.html#inverted) flag on `FlatList` which flips the display of the list with a nifty trick just using CSS.

[{]: <helper> (diffStep 5.3 files="client/src/screens/messages.screen.js")

#### Step 5.3: Use inverted FlatList for Messages

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...


    this.state &#x3D; {
      usernameColors,
<b>      refreshing: false,</b>
    };

    this.renderItem &#x3D; this.renderItem.bind(this);
    this.send &#x3D; this.send.bind(this);
<b>    this.onEndReached &#x3D; this.onEndReached.bind(this);</b>
  }

  componentWillReceiveProps(nextProps) {
</pre>
<pre>

...

    }
  }

<b>  onEndReached() {</b>
<b>    console.log(&#x27;TODO: onEndReached&#x27;);</b>
<b>  }</b>
<b></b>
  send(text) {
    this.props.createMessage({
      groupId: this.props.navigation.state.params.groupId,
      userId: 1, // faking the user for now
      text,
    }).then(() &#x3D;&gt; {
<b>      this.flatList.scrollToIndex({ index: 0, animated: true });</b>
    });
  }

</pre>
<pre>

...

    const { loading, group } &#x3D; this.props;

    // render loading placeholder while we fetch messages
<b>    if (loading || !group) {</b>
      return (
        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;
          &lt;ActivityIndicator /&gt;
</pre>
<pre>

...

      &gt;
        &lt;FlatList
          ref&#x3D;{(ref) &#x3D;&gt; { this.flatList &#x3D; ref; }}
<b>          inverted</b>
<b>          data&#x3D;{group.messages}</b>
          keyExtractor&#x3D;{this.keyExtractor}
          renderItem&#x3D;{this.renderItem}
          ListEmptyComponent&#x3D;{&lt;View /&gt;}
<b>          onEndReached&#x3D;{this.onEndReached}</b>
        /&gt;
        &lt;MessageInput send&#x3D;{this.send} /&gt;
      &lt;/KeyboardAvoidingView&gt;
</pre>

[}]: #

Now let’s update `GROUP_QUERY` in `client/src/graphql/group.query.js` to match our latest schema:

[{]: <helper> (diffStep 5.4)

#### Step 5.4: Update Group Query with Page Numbering

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.query.js
<pre>

...

import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;

const GROUP_QUERY &#x3D; gql&#x60;
<b>  query group($groupId: Int!, $first: Int, $after: String, $last: Int, $before: String) {</b>
    group(id: $groupId) {
      id
      name
</pre>
<pre>

...

        id
        username
      }
<b>      messages(first: $first, after: $after, last: $last, before: $before) {</b>
<b>        edges {</b>
<b>          cursor</b>
<b>          node {</b>
<b>            ... MessageFragment</b>
<b>          }</b>
<b>        }</b>
<b>        pageInfo {</b>
<b>          hasNextPage</b>
<b>          hasPreviousPage</b>
<b>        }</b>
      }
    }
  }
</pre>

[}]: #

We now have the ability to pass `first`, `after`, `last`, and `before` variables into the `group` query called by our `Messages` component. Those variables will get passed to our `messages` field, where we will receive a `MessageConnection` with all the fields we need.

We need to specify how `group` should look on a first run, and how to load more entries using the same query. The `graphql` module of `react-apollo` exposes a [`fetchMore`](http://dev.apollodata.com/react/pagination.html#fetch-more) function on the data prop where we can define how to update our query and our data:

[{]: <helper> (diffStep 5.5)

#### Step 5.5: Add fetchMore to groupQuery

##### Changed client&#x2F;package.json
<pre>

...

	},
	&quot;dependencies&quot;: {
		&quot;apollo-client&quot;: &quot;^1.9.0&quot;,
<b>		&quot;buffer&quot;: &quot;^5.0.7&quot;,</b>
		&quot;graphql-tag&quot;: &quot;^2.4.2&quot;,
		&quot;immutability-helper&quot;: &quot;^2.3.0&quot;,
		&quot;lodash&quot;: &quot;^4.17.4&quot;,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

import React, { Component } from &#x27;react&#x27;;
import randomColor from &#x27;randomcolor&#x27;;
import { graphql, compose } from &#x27;react-apollo&#x27;;
<b>import update from &#x27;immutability-helper&#x27;;</b>
<b>import { Buffer } from &#x27;buffer&#x27;;</b>

import Message from &#x27;../components/message.component&#x27;;
import MessageInput from &#x27;../components/message-input.component&#x27;;
</pre>
<pre>

...


    this.state &#x3D; {
      usernameColors,
    };

    this.renderItem &#x3D; this.renderItem.bind(this);
</pre>
<pre>

...

    });
  }

<b>  keyExtractor &#x3D; item &#x3D;&gt; item.node.id;</b>

<b>  renderItem &#x3D; ({ item: edge }) &#x3D;&gt; {</b>
<b>    const message &#x3D; edge.node;</b>
<b></b>
<b>    return (</b>
<b>      &lt;Message</b>
<b>        color&#x3D;{this.state.usernameColors[message.from.username]}</b>
<b>        isCurrentUser&#x3D;{message.from.id &#x3D;&#x3D;&#x3D; 1} // for now until we implement auth</b>
<b>        message&#x3D;{message}</b>
<b>      /&gt;</b>
<b>    );</b>
<b>  }</b>

  render() {
    const { loading, group } &#x3D; this.props;
</pre>
<pre>

...

        &lt;FlatList
          ref&#x3D;{(ref) &#x3D;&gt; { this.flatList &#x3D; ref; }}
          inverted
<b>          data&#x3D;{group.messages.edges}</b>
          keyExtractor&#x3D;{this.keyExtractor}
          renderItem&#x3D;{this.renderItem}
          ListEmptyComponent&#x3D;{&lt;View /&gt;}
</pre>
<pre>

...

    }),
  }),
  group: PropTypes.shape({
<b>    messages: PropTypes.shape({</b>
<b>      edges: PropTypes.arrayOf(PropTypes.shape({</b>
<b>        cursor: PropTypes.string,</b>
<b>        node: PropTypes.object,</b>
<b>      })),</b>
<b>      pageInfo: PropTypes.shape({</b>
<b>        hasNextPage: PropTypes.bool,</b>
<b>        hasPreviousPage: PropTypes.bool,</b>
<b>      }),</b>
<b>    }),</b>
    users: PropTypes.array,
  }),
  loading: PropTypes.bool,
<b>  loadMoreEntries: PropTypes.func,</b>
};

<b>const ITEMS_PER_PAGE &#x3D; 10;</b>
const groupQuery &#x3D; graphql(GROUP_QUERY, {
  options: ownProps &#x3D;&gt; ({
    variables: {
      groupId: ownProps.navigation.state.params.groupId,
<b>      first: ITEMS_PER_PAGE,</b>
    },
  }),
<b>  props: ({ data: { fetchMore, loading, group } }) &#x3D;&gt; ({</b>
<b>    loading,</b>
<b>    group,</b>
<b>    loadMoreEntries() {</b>
<b>      return fetchMore({</b>
<b>        // query: ... (you can specify a different query.</b>
<b>        // GROUP_QUERY is used by default)</b>
<b>        variables: {</b>
<b>          // load more queries starting from the cursor of the last (oldest) message</b>
<b>          after: group.messages.edges[group.messages.edges.length - 1].cursor,</b>
<b>        },</b>
<b>        updateQuery: (previousResult, { fetchMoreResult }) &#x3D;&gt; {</b>
<b>          // we will make an extra call to check if no more entries</b>
<b>          if (!fetchMoreResult) { return previousResult; }</b>
<b>          // push results (older messages) to end of messages list</b>
<b>          return update(previousResult, {</b>
<b>            group: {</b>
<b>              messages: {</b>
<b>                edges: { $push: fetchMoreResult.group.messages.edges },</b>
<b>                pageInfo: { $set: fetchMoreResult.group.messages.pageInfo },</b>
<b>              },</b>
<b>            },</b>
<b>          });</b>
<b>        },</b>
<b>      });</b>
<b>    },</b>
  }),
});

</pre>
<pre>

...

            query: GROUP_QUERY,
            variables: {
              groupId,
<b>              first: ITEMS_PER_PAGE,</b>
            },
          });

          // Add our message from the mutation to the end.
<b>          groupData.group.messages.edges.unshift({</b>
<b>            __typename: &#x27;MessageEdge&#x27;,</b>
<b>            node: createMessage,</b>
<b>            cursor: Buffer.from(createMessage.id.toString()).toString(&#x27;base64&#x27;),</b>
<b>          });</b>

          // Write our data back to the cache.
          store.writeQuery({
            query: GROUP_QUERY,
            variables: {
              groupId,
<b>              first: ITEMS_PER_PAGE,</b>
            },
            data: groupData,
          });
</pre>

[}]: #

We’ve specified `first: 10` in our initial run of the query. When our component executes `this.props.loadMoreEntries`, we update the `after` cursor with the `cursor` of the last `edge` from our previous results, fetch up to 10 more messages, and update our app’s state to push the edges to the end of our data set and set whether there is a next page.

Since we are returning `edges` now, we need to update our `Messages` component to look for `group.messages.edges[x].node` instead of `group.messages[x]`.

We also need to modify the `update` function in our mutations to match our updated `GROUP_QUERY` variables.

We should also create and append an `edge` to our cached query data whenever we create a new `Message`. This means deriving the `cursor` for the new `Message` we've created as well.

We finally need to update the `Messages` component to call `this.props.loadMoreEntries` when we call `onEndReached`:

[{]: <helper> (diffStep 5.6)

#### Step 5.6: Apply loadMoreEntries to onEndReached

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

  }

  onEndReached() {
<b>    if (!this.state.loadingMoreEntries &amp;&amp;</b>
<b>      this.props.group.messages.pageInfo.hasNextPage) {</b>
<b>      this.setState({</b>
<b>        loadingMoreEntries: true,</b>
<b>      });</b>
<b>      this.props.loadMoreEntries().then(() &#x3D;&gt; {</b>
<b>        this.setState({</b>
<b>          loadingMoreEntries: false,</b>
<b>        });</b>
<b>      });</b>
<b>    }</b>
  }

  send(text) {
</pre>

[}]: #

Boot it up for some pagination! ![Pagination Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-6.gif)

We can also modify the Groups component to preview the most recent message for each group. Using the same methodology, we’ll first update `USER_QUERY`:

[{]: <helper> (diffStep 5.7)

#### Step 5.7: Add most recent message to each Group in USER_QUERY

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
<pre>

...

import gql from &#x27;graphql-tag&#x27;;

<b>import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b></b>
const CREATE_GROUP_MUTATION &#x3D; gql&#x60;
  mutation createGroup($name: String!, $userIds: [Int!], $userId: Int!) {
    createGroup(name: $name, userIds: $userIds, userId: $userId) {
</pre>
<pre>

...

      users {
        id
      }
<b>      messages(first: 1) { # we don&#x27;t need to use variables</b>
<b>        edges {</b>
<b>          cursor</b>
<b>          node {</b>
<b>            ... MessageFragment</b>
<b>          }</b>
<b>        }</b>
<b>      }</b>
    }
  }
<b>  ${MESSAGE_FRAGMENT}</b>
&#x60;;

export default CREATE_GROUP_MUTATION;
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;user.query.js
<pre>

...

import gql from &#x27;graphql-tag&#x27;;

<b>import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b></b>
// get the user and all user&#x27;s groups
export const USER_QUERY &#x3D; gql&#x60;
  query user($id: Int) {
</pre>
<pre>

...

      groups {
        id
        name
<b>        messages(first: 1) { # we don&#x27;t need to use variables</b>
<b>          edges {</b>
<b>            cursor</b>
<b>            node {</b>
<b>              ... MessageFragment</b>
<b>            }</b>
<b>          }</b>
<b>        }</b>
      }
      friends {
        id
</pre>
<pre>

...

      }
    }
  }
<b>  ${MESSAGE_FRAGMENT}</b>
&#x60;;

export default USER_QUERY;
</pre>

[}]: #

And then we update the layout of the Group list item component in `Groups`:

[{]: <helper> (diffStep 5.8)

#### Step 5.8: Modify Group component to include latest message

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>

...

  FlatList,
  ActivityIndicator,
  Button,
<b>  Image,</b>
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from &#x27;react-native&#x27;;
import { graphql } from &#x27;react-apollo&#x27;;
<b>import moment from &#x27;moment&#x27;;</b>
<b>import Icon from &#x27;react-native-vector-icons/FontAwesome&#x27;;</b>

import { USER_QUERY } from &#x27;../graphql/user.query&#x27;;

</pre>
<pre>

...

    fontWeight: &#x27;bold&#x27;,
    flex: 0.7,
  },
<b>  groupTextContainer: {</b>
<b>    flex: 1,</b>
<b>    flexDirection: &#x27;column&#x27;,</b>
<b>    paddingLeft: 6,</b>
<b>  },</b>
<b>  groupText: {</b>
<b>    color: &#x27;#8c8c8c&#x27;,</b>
<b>  },</b>
<b>  groupImage: {</b>
<b>    width: 54,</b>
<b>    height: 54,</b>
<b>    borderRadius: 27,</b>
<b>  },</b>
<b>  groupTitleContainer: {</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>  },</b>
<b>  groupLastUpdated: {</b>
<b>    flex: 0.3,</b>
<b>    color: &#x27;#8c8c8c&#x27;,</b>
<b>    fontSize: 11,</b>
<b>    textAlign: &#x27;right&#x27;,</b>
<b>  },</b>
<b>  groupUsername: {</b>
<b>    paddingVertical: 4,</b>
<b>  },</b>
  header: {
    alignItems: &#x27;flex-end&#x27;,
    padding: 6,
</pre>
<pre>

...

  },
});

<b>// format createdAt with moment</b>
<b>const formatCreatedAt &#x3D; createdAt &#x3D;&gt; moment(createdAt).calendar(null, {</b>
<b>  sameDay: &#x27;[Today]&#x27;,</b>
<b>  nextDay: &#x27;[Tomorrow]&#x27;,</b>
<b>  nextWeek: &#x27;dddd&#x27;,</b>
<b>  lastDay: &#x27;[Yesterday]&#x27;,</b>
<b>  lastWeek: &#x27;dddd&#x27;,</b>
<b>  sameElse: &#x27;DD/MM/YYYY&#x27;,</b>
<b>});</b>
<b></b>
const Header &#x3D; ({ onPress }) &#x3D;&gt; (
  &lt;View style&#x3D;{styles.header}&gt;
    &lt;Button title&#x3D;{&#x27;New Group&#x27;} onPress&#x3D;{onPress} /&gt;
</pre>
<pre>

...

  }

  render() {
<b>    const { id, name, messages } &#x3D; this.props.group;</b>
    return (
      &lt;TouchableHighlight
        key&#x3D;{id}
        onPress&#x3D;{this.goToMessages}
      &gt;
        &lt;View style&#x3D;{styles.groupContainer}&gt;
<b>          &lt;Image</b>
<b>            style&#x3D;{styles.groupImage}</b>
<b>            source&#x3D;{{</b>
<b>              uri: &#x27;https://facebook.github.io/react/img/logo_og.png&#x27;,</b>
<b>            }}</b>
<b>          /&gt;</b>
<b>          &lt;View style&#x3D;{styles.groupTextContainer}&gt;</b>
<b>            &lt;View style&#x3D;{styles.groupTitleContainer}&gt;</b>
<b>              &lt;Text style&#x3D;{styles.groupName}&gt;{&#x60;${name}&#x60;}&lt;/Text&gt;</b>
<b>              &lt;Text style&#x3D;{styles.groupLastUpdated}&gt;</b>
<b>                {messages.edges.length ?</b>
<b>                  formatCreatedAt(messages.edges[0].node.createdAt) : &#x27;&#x27;}</b>
<b>              &lt;/Text&gt;</b>
<b>            &lt;/View&gt;</b>
<b>            &lt;Text style&#x3D;{styles.groupUsername}&gt;</b>
<b>              {messages.edges.length ?</b>
<b>                &#x60;${messages.edges[0].node.from.username}:&#x60; : &#x27;&#x27;}</b>
<b>            &lt;/Text&gt;</b>
<b>            &lt;Text style&#x3D;{styles.groupText} numberOfLines&#x3D;{1}&gt;</b>
<b>              {messages.edges.length ? messages.edges[0].node.text : &#x27;&#x27;}</b>
<b>            &lt;/Text&gt;</b>
<b>          &lt;/View&gt;</b>
<b>          &lt;Icon</b>
<b>            name&#x3D;&quot;angle-right&quot;</b>
<b>            size&#x3D;{24}</b>
<b>            color&#x3D;{&#x27;#8c8c8c&#x27;}</b>
<b>          /&gt;</b>
        &lt;/View&gt;
      &lt;/TouchableHighlight&gt;
    );
</pre>
<pre>

...

  group: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
<b>    messages: PropTypes.shape({</b>
<b>      edges: PropTypes.arrayOf(PropTypes.shape({</b>
<b>        cursor: PropTypes.string,</b>
<b>        node: PropTypes.object,</b>
<b>      })),</b>
<b>    }),</b>
  }),
};
</pre>

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
<pre>

...

    super(props);
    this.goToMessages &#x3D; this.goToMessages.bind(this);
    this.goToNewGroup &#x3D; this.goToNewGroup.bind(this);
<b>    this.onRefresh &#x3D; this.onRefresh.bind(this);</b>
<b>  }</b>
<b></b>
<b>  onRefresh() {</b>
<b>    this.props.refetch();</b>
  }

  keyExtractor &#x3D; item &#x3D;&gt; item.id;
</pre>
<pre>

...

  renderItem &#x3D; ({ item }) &#x3D;&gt; &lt;Group group&#x3D;{item} goToMessages&#x3D;{this.goToMessages} /&gt;;

  render() {
<b>    const { loading, user, networkStatus } &#x3D; this.props;</b>

    // render loading placeholder while we fetch messages
    if (loading) {
</pre>
<pre>

...

          keyExtractor&#x3D;{this.keyExtractor}
          renderItem&#x3D;{this.renderItem}
          ListHeaderComponent&#x3D;{() &#x3D;&gt; &lt;Header onPress&#x3D;{this.goToNewGroup} /&gt;}
<b>          onRefresh&#x3D;{this.onRefresh}</b>
<b>          refreshing&#x3D;{networkStatus &#x3D;&#x3D;&#x3D; 4}</b>
        /&gt;
      &lt;/View&gt;
    );
</pre>
<pre>

...

    navigate: PropTypes.func,
  }),
  loading: PropTypes.bool,
<b>  networkStatus: PropTypes.number,</b>
<b>  refetch: PropTypes.func,</b>
  user: PropTypes.shape({
    id: PropTypes.number.isRequired,
    email: PropTypes.string.isRequired,
</pre>
<pre>

...


const userQuery &#x3D; graphql(USER_QUERY, {
  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
<b>  props: ({ data: { loading, networkStatus, refetch, user } }) &#x3D;&gt; ({</b>
<b>    loading, networkStatus, refetch, user,</b>
  }),
});
</pre>

[}]: #

Boot it! ![Refetch Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-9.gif)

Now that we can see manual refreshing is working, let's fix up `update` within `sendMessage` to update the `USER_QUERY` query so manual updating is only required for strange edge cases and not all cases!

[{]: <helper> (diffStep "5.10")

#### Step 5.10: Modify createMessage mutation to update USER_QUERY

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

import { graphql, compose } from &#x27;react-apollo&#x27;;
import update from &#x27;immutability-helper&#x27;;
import { Buffer } from &#x27;buffer&#x27;;
<b>import _ from &#x27;lodash&#x27;;</b>
<b>import moment from &#x27;moment&#x27;;</b>

import Message from &#x27;../components/message.component&#x27;;
import MessageInput from &#x27;../components/message-input.component&#x27;;
import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;
import CREATE_MESSAGE_MUTATION from &#x27;../graphql/create-message.mutation&#x27;;
<b>import USER_QUERY from &#x27;../graphql/user.query&#x27;;</b>

const styles &#x3D; StyleSheet.create({
  container: {
</pre>
<pre>

...

            },
            data: groupData,
          });
<b></b>
<b>          const userData &#x3D; store.readQuery({</b>
<b>            query: USER_QUERY,</b>
<b>            variables: {</b>
<b>              id: 1, // faking the user for now</b>
<b>            },</b>
<b>          });</b>
<b></b>
<b>          // check whether the mutation is the latest message and update cache</b>
<b>          const updatedGroup &#x3D; _.find(userData.user.groups, { id: groupId });</b>
<b>          if (!updatedGroup.messages.edges.length ||</b>
<b>            moment(updatedGroup.messages.edges[0].node.createdAt).isBefore(moment(createMessage.createdAt))) {</b>
<b>            // update the latest message</b>
<b>            updatedGroup.messages.edges[0] &#x3D; {</b>
<b>              __typename: &#x27;MessageEdge&#x27;,</b>
<b>              node: createMessage,</b>
<b>              cursor: Buffer.from(createMessage.id.toString()).toString(&#x27;base64&#x27;),</b>
<b>            };</b>
<b></b>
<b>            // Write our data back to the cache.</b>
<b>            store.writeQuery({</b>
<b>              query: USER_QUERY,</b>
<b>              variables: {</b>
<b>                id: 1, // faking the user for now</b>
<b>              },</b>
<b>              data: userData,</b>
<b>            });</b>
<b>          }</b>
        },
      }),
</pre>

[}]: #
[{]: <helper> (navStep)

| [< Previous Step](step4.md) | [Next Step >](step6.md) |
|:--------------------------------|--------------------------------:|

[}]: #

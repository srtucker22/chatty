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

However, if our paginated results are ordered by newest element and elements aren’t deletable, page numbering can be a great option for paginating our data, especially for infinite scrollers. *wink*

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

I thought about taking us down the Relay Cursor Connections rabbit hole, but for our purposes, it’s pretty clear which strategy makes the most sense: **page numbering**. Why make things difficult? Our messages will always be ordered by most recent, and we’re not planning on making them deletable anytime soon. WhatsApp just added the ability to edit and delete posts, and they’ve been around for 8 years. Really, most cases for pagination can be covered with page numbering. And when we add event subscriptions next tutorial, you’ll see that even when data is constantly getting added and deleted, we can still use page numbering without running into issues.
Let’s code it up!

When we request messages for a given group, we don’t use the `messages` query, we use `group`. Since we currently only request `Messages` within the context of a `Group`, we can update our Schema in `server/data/schema.js` accordingly:

[{]: <helper> (diffStep 5.1)

#### Step 5.1: Update Schema with Page Numbering

##### Changed server&#x2F;data&#x2F;schema.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 7┊ 7┊    id: Int! # unique id for the group
 ┊ 8┊ 8┊    name: String # name of the group
 ┊ 9┊ 9┊    users: [User]! # users in the group
<b>+┊  ┊10┊    messages(limit: Int, offset: Int): [Message] # messages sent to the group</b>
 ┊11┊11┊  }
 ┊12┊12┊
 ┊13┊13┊  # a user -- keep type really simple for now
</pre>

[}]: #

Now instead of asking for all messages when we query for a group or groups, we will specify the `limit` and `offset`. We just need to update our resolvers in `server/data/resolvers.js` to meet the spec:

[{]: <helper> (diffStep 5.2)

#### Step 5.2: Update Resolvers with Page Numbering

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊63┊63┊    users(group) {
 ┊64┊64┊      return group.getUsers();
 ┊65┊65┊    },
<b>+┊  ┊66┊    messages(group, args) {</b>
 ┊67┊67┊      return Message.findAll({
 ┊68┊68┊        where: { groupId: group.id },
 ┊69┊69┊        order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],
<b>+┊  ┊70┊        limit: args.limit,</b>
<b>+┊  ┊71┊        offset: args.offset,</b>
 ┊70┊72┊      });
 ┊71┊73┊    },
 ┊72┊74┊  },
</pre>

[}]: #

A quick test in GraphIQL shows everything is looking good: ![GraphIQL Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-2.png)

# Pagination in React Native
We’re going to update our React Native client to paginate messages with an infinite scroller when viewing a group thread.

`FlatList` has a function [`onEndReached`](https://facebook.github.io/react-native/docs/flatlist.html#onendreached) that will trigger when the user has scrolled close to the end of the list (we can set how close is needed to trigger the function via `onEndReachedThreshold`). However, messaging apps like ours typically display newest messages at the bottom of the list, which means we load older data at the top. This is the reverse of how most lists operate, so we need to modify our `FlatList` to be flipped so `onEndReached` triggers when we're approaching the top of the list, not the bottom. We can use [`react-native-reversed-flat-list`](https://github.com/jevakallio/react-native-reversed-flat-list) which flips the display of the list with a nifty trick just using CSS.

```
yarn add react-native-reversed-flat-list
```

[{]: <helper> (diffStep 5.3 files="client/src/screens/messages.screen.js")

#### Step 5.3: Use ReverseFlatList for Messages

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import {
 ┊2┊2┊  ActivityIndicator,
 ┊4┊3┊  Image,
 ┊5┊4┊  KeyboardAvoidingView,
 ┊6┊5┊  StyleSheet,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊12┊11┊import React, { Component } from &#x27;react&#x27;;
 ┊13┊12┊import randomColor from &#x27;randomcolor&#x27;;
 ┊14┊13┊import { graphql, compose } from &#x27;react-apollo&#x27;;
<b>+┊  ┊14┊import ReversedFlatList from &#x27;react-native-reversed-flat-list&#x27;;</b>
 ┊15┊15┊
 ┊16┊16┊import Message from &#x27;../components/message.component&#x27;;
 ┊17┊17┊import MessageInput from &#x27;../components/message-input.component&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊82┊82┊    super(props);
 ┊83┊83┊    this.state &#x3D; {
 ┊84┊84┊      usernameColors: {},
<b>+┊  ┊85┊      refreshing: false,</b>
 ┊85┊86┊    };
 ┊86┊87┊
 ┊87┊88┊    this.renderItem &#x3D; this.renderItem.bind(this);
 ┊88┊89┊    this.send &#x3D; this.send.bind(this);
<b>+┊  ┊90┊    this.onEndReached &#x3D; this.onEndReached.bind(this);</b>
 ┊89┊91┊  }
 ┊90┊92┊
 ┊91┊93┊  componentWillReceiveProps(nextProps) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊105┊107┊    }
 ┊106┊108┊  }
 ┊107┊109┊
<b>+┊   ┊110┊  onEndReached() {</b>
<b>+┊   ┊111┊    console.log(&#x27;TODO: onEndReached&#x27;);</b>
<b>+┊   ┊112┊  }</b>
<b>+┊   ┊113┊</b>
 ┊108┊114┊  send(text) {
 ┊109┊115┊    this.props.createMessage({
 ┊110┊116┊      groupId: this.props.navigation.state.params.groupId,
 ┊111┊117┊      userId: 1, // faking the user for now
 ┊112┊118┊      text,
 ┊113┊119┊    }).then(() &#x3D;&gt; {
<b>+┊   ┊120┊      this.flatList.scrollToBottom({ animated: true });</b>
 ┊115┊121┊    });
 ┊116┊122┊  }
 ┊117┊123┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊145┊151┊        keyboardVerticalOffset&#x3D;{64}
 ┊146┊152┊        style&#x3D;{styles.container}
 ┊147┊153┊      &gt;
<b>+┊   ┊154┊        &lt;ReversedFlatList</b>
 ┊149┊155┊          ref&#x3D;{(ref) &#x3D;&gt; { this.flatList &#x3D; ref; }}
 ┊150┊156┊          data&#x3D;{group.messages.slice().reverse()}
 ┊151┊157┊          keyExtractor&#x3D;{this.keyExtractor}
 ┊152┊158┊          renderItem&#x3D;{this.renderItem}
<b>+┊   ┊159┊          onEndReached&#x3D;{this.onEndReached}</b>
 ┊153┊160┊        /&gt;
 ┊154┊161┊        &lt;MessageInput send&#x3D;{this.send} /&gt;
 ┊155┊162┊      &lt;/KeyboardAvoidingView&gt;
</pre>

[}]: #

Now let’s update `GROUP_QUERY` in `client/src/graphql/group.query.js` to match our latest schema:

[{]: <helper> (diffStep 5.4)

#### Step 5.4: Update Group Query with Page Numbering

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.query.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊3┊3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;
 ┊4┊4┊
 ┊5┊5┊const GROUP_QUERY &#x3D; gql&#x60;
<b>+┊ ┊6┊  query group($groupId: Int!, $limit: Int, $offset: Int) {</b>
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
<b>+┊  ┊14┊      messages(limit: $limit, offset: $offset) {</b>
 ┊15┊15┊        ... MessageFragment
 ┊16┊16┊      }
 ┊17┊17┊    }
</pre>

[}]: #

We now have the ability to pass `limit` and `offset` variables into the `group` query called by our `Messages` component.

We need to specify how `group` should look on a first run, and how to load more entries using the same query. The `graphql` module of `react-apollo` exposes a [`fetchMore`](http://dev.apollodata.com/react/pagination.html#fetch-more) function on the data prop where we can define how to update our query and our data:

[{]: <helper> (diffStep 5.5)

#### Step 5.5: Add fetchMore to groupQuery

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊12┊12┊import randomColor from &#x27;randomcolor&#x27;;
 ┊13┊13┊import { graphql, compose } from &#x27;react-apollo&#x27;;
 ┊14┊14┊import ReversedFlatList from &#x27;react-native-reversed-flat-list&#x27;;
<b>+┊  ┊15┊import update from &#x27;immutability-helper&#x27;;</b>
 ┊15┊16┊
 ┊16┊17┊import Message from &#x27;../components/message.component&#x27;;
 ┊17┊18┊import MessageInput from &#x27;../components/message-input.component&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊181┊182┊  loading: PropTypes.bool,
 ┊182┊183┊};
 ┊183┊184┊
<b>+┊   ┊185┊const ITEMS_PER_PAGE &#x3D; 10;</b>
 ┊184┊186┊const groupQuery &#x3D; graphql(GROUP_QUERY, {
 ┊185┊187┊  options: ownProps &#x3D;&gt; ({
 ┊186┊188┊    variables: {
 ┊187┊189┊      groupId: ownProps.navigation.state.params.groupId,
<b>+┊   ┊190┊      offset: 0,</b>
<b>+┊   ┊191┊      limit: ITEMS_PER_PAGE,</b>
 ┊188┊192┊    },
 ┊189┊193┊  }),
<b>+┊   ┊194┊  props: ({ data: { fetchMore, loading, group } }) &#x3D;&gt; ({</b>
<b>+┊   ┊195┊    loading,</b>
<b>+┊   ┊196┊    group,</b>
<b>+┊   ┊197┊    loadMoreEntries() {</b>
<b>+┊   ┊198┊      return fetchMore({</b>
<b>+┊   ┊199┊        // query: ... (you can specify a different query.</b>
<b>+┊   ┊200┊        // GROUP_QUERY is used by default)</b>
<b>+┊   ┊201┊        variables: {</b>
<b>+┊   ┊202┊          // We are able to figure out offset because it matches</b>
<b>+┊   ┊203┊          // the current messages length</b>
<b>+┊   ┊204┊          offset: group.messages.length,</b>
<b>+┊   ┊205┊        },</b>
<b>+┊   ┊206┊        updateQuery: (previousResult, { fetchMoreResult }) &#x3D;&gt; {</b>
<b>+┊   ┊207┊          // we will make an extra call to check if no more entries</b>
<b>+┊   ┊208┊          if (!fetchMoreResult) { return previousResult; }</b>
<b>+┊   ┊209┊          // push results (older messages) to end of messages list</b>
<b>+┊   ┊210┊          return update(previousResult, {</b>
<b>+┊   ┊211┊            group: {</b>
<b>+┊   ┊212┊              messages: { $push: fetchMoreResult.group.messages },</b>
<b>+┊   ┊213┊            },</b>
<b>+┊   ┊214┊          });</b>
<b>+┊   ┊215┊        },</b>
<b>+┊   ┊216┊      });</b>
<b>+┊   ┊217┊    },</b>
 ┊192┊218┊  }),
 ┊193┊219┊});
 ┊194┊220┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊221┊247┊            query: GROUP_QUERY,
 ┊222┊248┊            variables: {
 ┊223┊249┊              groupId,
<b>+┊   ┊250┊              offset: 0,</b>
<b>+┊   ┊251┊              limit: ITEMS_PER_PAGE,</b>
 ┊224┊252┊            },
 ┊225┊253┊          });
 ┊226┊254┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊236┊264┊            query: GROUP_QUERY,
 ┊237┊265┊            variables: {
 ┊238┊266┊              groupId,
<b>+┊   ┊267┊              offset: 0,</b>
<b>+┊   ┊268┊              limit: ITEMS_PER_PAGE,</b>
 ┊239┊269┊            },
 ┊240┊270┊            data,
 ┊241┊271┊          });
</pre>

[}]: #

We’ve specified `limit: 10` and `offset: 0` in our initial run of the query. When our component executes `this.props.loadMoreEntries`, we update the offset based on the current number of messages already loaded, fetch up to 10 more messages, and update our app’s state to push the messages to the end of our data set. We also need to modify the `update` function in our mutations to match our updated `GROUP_QUERY` variables.

We just need to update the `Messages` component to call `this.props.loadMoreEntries` when we call `onEndReached`:

[{]: <helper> (diffStep 5.6)

#### Step 5.6: Apply loadMoreEntries to onEndReached

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊83┊83┊    super(props);
 ┊84┊84┊    this.state &#x3D; {
 ┊85┊85┊      usernameColors: {},
 ┊87┊86┊    };
 ┊88┊87┊
 ┊89┊88┊    this.renderItem &#x3D; this.renderItem.bind(this);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊109┊108┊  }
 ┊110┊109┊
 ┊111┊110┊  onEndReached() {
<b>+┊   ┊111┊    this.props.loadMoreEntries();</b>
 ┊113┊112┊  }
 ┊114┊113┊
 ┊115┊114┊  send(text) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊180┊179┊    users: PropTypes.array,
 ┊181┊180┊  }),
 ┊182┊181┊  loading: PropTypes.bool,
<b>+┊   ┊182┊  loadMoreEntries: PropTypes.func,</b>
 ┊183┊183┊};
 ┊184┊184┊
 ┊185┊185┊const ITEMS_PER_PAGE &#x3D; 10;
</pre>

[}]: #

Boot it up for some pagination! ![Pagination Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-6.gif)

We can also modify the Groups component to preview the most recent message for each group. Using the same methodology, we’ll first update `USER_QUERY`:

[{]: <helper> (diffStep 5.7)

#### Step 5.7: Add most recent message to each Group in USER_QUERY

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
<b>+┊  ┊13┊      messages(limit: 1) { # we don&#x27;t need to use variables</b>
<b>+┊  ┊14┊        ... MessageFragment</b>
<b>+┊  ┊15┊      }</b>
 ┊11┊16┊    }
 ┊12┊17┊  }
<b>+┊  ┊18┊  ${MESSAGE_FRAGMENT}</b>
 ┊13┊19┊&#x60;;
 ┊14┊20┊
 ┊15┊21┊export default CREATE_GROUP_MUTATION;
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
<b>+┊  ┊15┊        messages(limit: 1) { # we don&#x27;t need to use variables</b>
<b>+┊  ┊16┊          ... MessageFragment</b>
<b>+┊  ┊17┊        }</b>
 ┊13┊18┊      }
 ┊14┊19┊      friends {
 ┊15┊20┊        id
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊17┊22┊      }
 ┊18┊23┊    }
 ┊19┊24┊  }
<b>+┊  ┊25┊  ${MESSAGE_FRAGMENT}</b>
 ┊20┊26┊&#x60;;
 ┊21┊27┊
 ┊22┊28┊export default USER_QUERY;
</pre>

[}]: #

And then we update the layout of the Group list item component in `Groups`:

[{]: <helper> (diffStep 5.8)

#### Step 5.8: Modify Group component to include latest message

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
<b>+┊   ┊116┊              uri: &#x27;https://facebook.github.io/react/img/logo_og.png&#x27; </b>
<b>+┊   ┊117┊            }}</b>
<b>+┊   ┊118┊          /&gt;</b>
<b>+┊   ┊119┊          &lt;View style&#x3D;{styles.groupTextContainer}&gt;</b>
<b>+┊   ┊120┊            &lt;View style&#x3D;{styles.groupTitleContainer}&gt;</b>
<b>+┊   ┊121┊              &lt;Text style&#x3D;{styles.groupName}&gt;{&#x60;${name}&#x60;}&lt;/Text&gt;</b>
<b>+┊   ┊122┊              &lt;Text style&#x3D;{styles.groupLastUpdated}&gt;</b>
<b>+┊   ┊123┊                {messages.length ?</b>
<b>+┊   ┊124┊                   formatCreatedAt(messages[0].createdAt) : &#x27;&#x27;}</b>
<b>+┊   ┊125┊              &lt;/Text&gt;</b>
<b>+┊   ┊126┊            &lt;/View&gt;</b>
<b>+┊   ┊127┊            &lt;Text style&#x3D;{styles.groupUsername}&gt;</b>
<b>+┊   ┊128┊              {messages.length ?</b>
<b>+┊   ┊129┊                  &#x60;${messages[0].from.username}:&#x60; : &#x27;&#x27;}</b>
<b>+┊   ┊130┊            &lt;/Text&gt;</b>
<b>+┊   ┊131┊            &lt;Text style&#x3D;{styles.groupText} numberOfLines&#x3D;{1}&gt;</b>
<b>+┊   ┊132┊              {messages.length ? messages[0].text : &#x27;&#x27;}</b>
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
<b>+┊   ┊151┊    messages: PropTypes.array,</b>
 ┊ 87┊152┊  }),
 ┊ 88┊153┊};
</pre>

[}]: #

![Layout Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-8.png)

# Refreshing Data
We can apply some of the tricks we’ve just learned to also give users a way to manually refresh data. Currently, if a user sends a message to a group, this new message won’t show up as the latest message on the groups page.

We could solve this problem by modifying `update` within `sendMessage` to update the `user` query. But let’s hold off on implementing that fix and use this opportunity to test manual refreshing.

In addition to `fetchMore`, `graphql` also exposes a [`refetch`](http://dev.apollodata.com/core/apollo-client-api.html#ObservableQuery.refetch) function on the data prop. Executing this function will force the query to refetch data. 

We can modify our `FlatList` to use a built-in [`RefreshControl`](https://facebook.github.io/react-native/docs/refreshcontrol.html) component via [`onRefresh`](https://facebook.github.io/react-native/docs/flatlist.html#onrefresh). When the user pulls down the list, `FlatList` will trigger `onRefresh` where we will `refetch` the `user` query. 
We also need to pass a `refreshing` parameter to `FlatList` to let it know when to show or hide the `RefreshControl`. We can set simply set `refreshing` to check for the `networkStatus` of our query. `networkStatus === 4` means the data is still loading.

[{]: <helper> (diffStep 5.9)

#### Step 5.9: Manual Refresh Groups

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊161┊161┊    super(props);
 ┊162┊162┊    this.goToMessages &#x3D; this.goToMessages.bind(this);
 ┊163┊163┊    this.goToNewGroup &#x3D; this.goToNewGroup.bind(this);
<b>+┊   ┊164┊    this.onRefresh &#x3D; this.onRefresh.bind(this);</b>
<b>+┊   ┊165┊  }</b>
<b>+┊   ┊166┊</b>
<b>+┊   ┊167┊  onRefresh() {</b>
<b>+┊   ┊168┊    this.props.refetch();</b>
 ┊164┊169┊  }
 ┊165┊170┊
 ┊166┊171┊  keyExtractor &#x3D; item &#x3D;&gt; item.id;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊178┊183┊  renderItem &#x3D; ({ item }) &#x3D;&gt; &lt;Group group&#x3D;{item} goToMessages&#x3D;{this.goToMessages} /&gt;;
 ┊179┊184┊
 ┊180┊185┊  render() {
<b>+┊   ┊186┊    const { loading, user, networkStatus } &#x3D; this.props;</b>
 ┊182┊187┊
 ┊183┊188┊    // render loading placeholder while we fetch messages
 ┊184┊189┊    if (loading) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊206┊211┊          keyExtractor&#x3D;{this.keyExtractor}
 ┊207┊212┊          renderItem&#x3D;{this.renderItem}
 ┊208┊213┊          ListHeaderComponent&#x3D;{() &#x3D;&gt; &lt;Header onPress&#x3D;{this.goToNewGroup} /&gt;}
<b>+┊   ┊214┊          onRefresh&#x3D;{this.onRefresh}</b>
<b>+┊   ┊215┊          refreshing&#x3D;{networkStatus &#x3D;&#x3D;&#x3D; 4}</b>
 ┊209┊216┊        /&gt;
 ┊210┊217┊      &lt;/View&gt;
 ┊211┊218┊    );
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊216┊223┊    navigate: PropTypes.func,
 ┊217┊224┊  }),
 ┊218┊225┊  loading: PropTypes.bool,
<b>+┊   ┊226┊  networkStatus: PropTypes.number,</b>
<b>+┊   ┊227┊  refetch: PropTypes.func,</b>
 ┊219┊228┊  user: PropTypes.shape({
 ┊220┊229┊    id: PropTypes.number.isRequired,
 ┊221┊230┊    email: PropTypes.string.isRequired,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊230┊239┊
 ┊231┊240┊const userQuery &#x3D; graphql(USER_QUERY, {
 ┊232┊241┊  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
<b>+┊   ┊242┊  props: ({ data: { loading, networkStatus, refetch, user } }) &#x3D;&gt; ({</b>
<b>+┊   ┊243┊    loading, networkStatus, refetch, user,</b>
 ┊235┊244┊  }),
 ┊236┊245┊});
</pre>

[}]: #

Boot it! ![Refetch Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step5-9.gif)
[{]: <helper> (navStep)

⟸ <a href="step4.md">PREVIOUS STEP</a> <b>║</b> <a href="step6.md">NEXT STEP</a> ⟹

[}]: #

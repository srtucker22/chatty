# Step 8: GraphQL Input Types

This is the eigth blog in a multipart series building Chatty, a WhatsApp clone, using [React Native](https://facebook.github.io/react-native/) and [Apollo](http://dev.apollodata.com/).

In this tutorial, we’ll focus on adding [GraphQL Input Types](http://graphql.org/learn/schema/#input-types), which will help us clean up our queries and streamline future GraphQL development in our app.

Here’s what we'll accomplish in this tutorial:
1. Discuss writing more flexible GraphQL requests
2. Add GraphQL Input Types to our Schema
3. Update resolvers and business logic to handle Input Types
4. Update client-side GraphQL requests to use Input Types

# Writing flexible GraphQL
So far in our journey, writing GraphQL queries has been a breeze. We've been able to get all the data we need in a single request in exactly the shape we want with very little code. But APIs inevitably get more complex as apps mature. We need to ensure our GraphQL infrastructure adapts gracefully as we expand the functionality of our app.

Let's do an audit of the GraphQL queries that currently power our React Native client to look for opportunities to improve our querying....

You may notice the queries, mutations, and subscriptions that return `Group` types have a similar shape, but don't share any code. If we modify or add a field to the `Group` type later on, we would need to individually update every query and mutation that returns a `Group` type -- not good. 

```
import gql from 'graphql-tag';

import MESSAGE_FRAGMENT from './message.fragment';

// this is our primary group query
const GROUP_QUERY = gql`
  query group($groupId: Int!, $first: Int, $after: String, $last: Int, $before: String) {
    group(id: $groupId) {
      id
      name
      users {
        id
        username
      }
      messages(first: $first, after: $after, last: $last, before: $before) {
        edges {
          cursor
          node {
            ... MessageFragment
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
      }
    }
  }
  ${MESSAGE_FRAGMENT}
`;

// creating a group returns a similar shape for the new group
const CREATE_GROUP_MUTATION = gql`
  mutation createGroup($name: String!, $userIds: [Int!]) {
    createGroup(name: $name, userIds: $userIds) {
      id
      name
      users {
        id
      }
      messages(first: 1) { # we don't need to use variables
        edges {
          cursor
          node {
            ... MessageFragment
          }
        }
      }
    }
  }
  ${MESSAGE_FRAGMENT}
`;

// unsurprisingly subscriptions to new groups
// looks like CREATE_GROUP_MUTATION
const GROUP_ADDED_SUBSCRIPTION = gql`
  subscription onGroupAdded($userId: Int){
    groupAdded(userId: $userId){
      id
      name
      messages(first: 1) {
        edges {
          cursor
          node {
            ... MessageFragment
          }
        }
      }
    }
  }
  ${MESSAGE_FRAGMENT}
`;

// and the group field in USER_QUERY looks a lot like these too
export const USER_QUERY = gql`
  query user($id: Int) {
    user(id: $id) {
      id
      email
      username
      groups {
        id
        name
        messages(first: 1) { # we don't need to use variables
          edges {
            cursor
            node {
              ... MessageFragment
            }
          }
        }
      }
      friends {
        id
        username
      }
    }
  }
  ${MESSAGE_FRAGMENT}
`;
```

If we create a common GraphQL fragment for our queries and mutations to share, we'll only need to update the one fragment when the `Group` type changes and all our queries, mutations, and subscriptions will benefit:

[{]: <helper> (diffStep 8.1)

#### Step 8.1: Create GROUP_FRAGMENT

##### Added client&#x2F;src&#x2F;graphql&#x2F;group.fragment.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b></b>
<b>const GROUP_FRAGMENT &#x3D; gql&#x60;</b>
<b>  fragment GroupFragment on Group {</b>
<b>    id</b>
<b>    name</b>
<b>    users {</b>
<b>      id</b>
<b>      username</b>
<b>    }</b>
<b>    messages(first: $first, last: $last, before: $before, after: $after) {</b>
<b>      edges {</b>
<b>        cursor</b>
<b>        node {</b>
<b>          ... MessageFragment</b>
<b>        }</b>
<b>      }</b>
<b>      pageInfo {</b>
<b>        hasNextPage</b>
<b>        hasPreviousPage</b>
<b>      }</b>
<b>    }</b>
<b>  }</b>
<b>  ${MESSAGE_FRAGMENT}</b>
<b>&#x60;;</b>
<b></b>
<b>export default GROUP_FRAGMENT;</b>
</pre>

[}]: #

Now we can update all these GraphQL requests to use the fragment:

[{]: <helper> (diffStep 8.2)

#### Step 8.2: Apply GROUP_FRAGMENT to Queries with default variables

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
<pre>

...

import gql from &#x27;graphql-tag&#x27;;

<b>import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;</b>

const CREATE_GROUP_MUTATION &#x3D; gql&#x60;
<b>  mutation createGroup($name: String!, $userIds: [Int!], $first: Int &#x3D; 1, $after: String, $last: Int, $before: String) {</b>
    createGroup(name: $name, userIds: $userIds) {
<b>      ... GroupFragment</b>
    }
  }
<b>  ${GROUP_FRAGMENT}</b>
&#x60;;

export default CREATE_GROUP_MUTATION;
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group-added.subscription.js
<pre>

...

import gql from &#x27;graphql-tag&#x27;;

<b>import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;</b>

const GROUP_ADDED_SUBSCRIPTION &#x3D; gql&#x60;
<b>  subscription onGroupAdded($userId: Int, $first: Int &#x3D; 1, $after: String, $last: Int, $before: String){</b>
    groupAdded(userId: $userId){
<b>      ... GroupFragment</b>
    }
  }
<b>  ${GROUP_FRAGMENT}</b>
&#x60;;

export default GROUP_ADDED_SUBSCRIPTION;
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.query.js
<pre>

...

import gql from &#x27;graphql-tag&#x27;;

<b>import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;</b>

const GROUP_QUERY &#x3D; gql&#x60;
<b>  query group($groupId: Int!, $first: Int &#x3D; 1, $after: String, $last: Int, $before: String) {</b>
    group(id: $groupId) {
<b>      ... GroupFragment</b>
    }
  }
<b>  ${GROUP_FRAGMENT}</b>
&#x60;;

export default GROUP_QUERY;
</pre>

[}]: #

There are a few things worth noting about this pattern:
1. Changing fields on `GROUP_FRAGMENT` will immediately apply to all queries, mutations, and subscriptions that use it.
2. We are occasionally using default values for the `$first` variable -- `$first: Int = 1` to return the first message in a Group if that variable is not specified when executing the query/mutation/subscription. 

(GraphQL default variables is without a doubt the greatest and most essential addition to `apollo-client` of all time, and whoever wrote that PR deserves free beer for life 😉)

3. Our GraphQL requests have much simpler return shapes, but much more complex sets of variables.

Old `CREATE_GROUP_MUTATION`:
```
mutation createGroup($name: String!, $userIds: [Int!]) { ... }
```

New `CREATE_GROUP_MUTATION`:
```
mutation createGroup($name: String!, $userIds: [Int!], $first: Int = 1, $after: String, $last: Int, $before: String) { ... }
```

Yeesh! If we needed to change a variable used in `GROUP_FRAGMENT`, we'd still have to change all the queries/mutations/subscriptions. Moreover, it's not very clear what all these variables mean. `$first`, `$after`, `$last`, and `$before` are variables we use to paginate messages within a `Group`, but those variables need to be specified in `USER_QUERY` -- that's nonobvious and weird. What we need is a way to abstract inputs to simplify the way we declare variables and update those variables as our app evolves. Enter GraphQL Input Types!

# Input Types on the Server
GraphQL Input Types are a super simple concept -- you can declare named arguments in a GraphQL request in whatever shape you want. 

For example, we can abstract away the pagination variables from our GraphQL requests by adding the following `ConnectionInput` in our schema:

```
# input for relay cursor connections
  input ConnectionInput {
    first: Int
    after: String
    last: Int
    before: String
  }
```

This will enable us to update `Group` like so:

```
# a group chat entity
  type Group {
    id: Int! # unique id for the group
    name: String # name of the group
    users: [User]! # users in the group
    messages(messageConnection: ConnectionInput): MessageConnection # messages sent to the group
  }
```

This will drastically simplify any request that returns `Group` types!

We should strive to apply input types to all of our GraphQL requests that have even the slightest complexity in their input requirements. For Chatty, I've added input types for most of our mutations:

[{]: <helper> (diffStep 8.3)

#### Step 8.3: Add Input Types to Schema

##### Changed server&#x2F;data&#x2F;schema.js
<pre>

...

  # declare custom scalars
  scalar Date

<b>  # input for creating messages</b>
<b>  input CreateMessageInput {</b>
<b>    groupId: Int!</b>
<b>    text: String!</b>
<b>  }</b>
<b></b>
<b>  # input for creating groups</b>
<b>  input CreateGroupInput {</b>
<b>    name: String!</b>
<b>    userIds: [Int!]</b>
<b>  }</b>
<b></b>
<b>  # input for updating groups</b>
<b>  input UpdateGroupInput {</b>
<b>    id: Int!</b>
<b>    name: String</b>
<b>    userIds: [Int!]</b>
<b>  }</b>
<b></b>
<b>  # input for signing in users</b>
<b>  input SigninUserInput {</b>
<b>    email: String!</b>
<b>    password: String!</b>
<b>    username: String</b>
<b>  }</b>
<b></b>
<b>  # input for updating users</b>
<b>  input UpdateUserInput {</b>
<b>    username: String</b>
<b>  }</b>
<b></b>
<b>  # input for relay cursor connections</b>
<b>  input ConnectionInput {</b>
<b>    first: Int</b>
<b>    after: String</b>
<b>    last: Int</b>
<b>    before: String</b>
<b>  }</b>
<b></b>
  type MessageConnection {
    edges: [MessageEdge]
    pageInfo: PageInfo!
</pre>
<pre>

...

    id: Int! # unique id for the group
    name: String # name of the group
    users: [User]! # users in the group
<b>    messages(messageConnection: ConnectionInput): MessageConnection # messages sent to the group</b>
  }

  # a user -- keep type really simple for now
</pre>
<pre>

...


  type Mutation {
    # send a message to a group
<b>    createMessage(message: CreateMessageInput!): Message</b>
<b>    createGroup(group: CreateGroupInput!): Group</b>
    deleteGroup(id: Int!): Group
    leaveGroup(id: Int!): Group # let user leave group
<b>    updateGroup(group: UpdateGroupInput!): Group</b>
<b>    login(user: SigninUserInput!): User</b>
<b>    signup(user: SigninUserInput!): User</b>
  }

  type Subscription {
</pre>

[}]: #

Sweet! Now let's update our resolvers and business logic to handle input types instead of individual variables. The changes are minimal:

[{]: <helper> (diffStep 8.4)

#### Step 8.4: Add Input Types to Resolvers and Logic

##### Changed server&#x2F;data&#x2F;logic.js
<pre>

...

  to(message) {
    return message.getGroup({ attributes: [&#x27;id&#x27;, &#x27;name&#x27;] });
  },
<b>  createMessage(_, createMessageInput, ctx) {</b>
<b>    const { text, groupId } &#x3D; createMessageInput.message;</b>
<b></b>
    return getAuthenticatedUser(ctx)
      .then(user &#x3D;&gt; user.getGroups({ where: { id: groupId }, attributes: [&#x27;id&#x27;] })
        .then((group) &#x3D;&gt; {
</pre>
<pre>

...

  users(group) {
    return group.getUsers({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });
  },
<b>  messages(group, { messageConnection &#x3D; {} }) {</b>
<b>    const { first, last, before, after } &#x3D; messageConnection;</b>
<b></b>
    // base query -- get messages from the right group
    const where &#x3D; { groupId: group.id };

</pre>
<pre>

...

      }],
    }));
  },
<b>  createGroup(_, createGroupInput, ctx) {</b>
<b>    const { name, userIds } &#x3D; createGroupInput.group;</b>
<b></b>
    return getAuthenticatedUser(ctx)
      .then(user &#x3D;&gt; user.getFriends({ where: { id: { $in: userIds } } })
        .then((friends) &#x3D;&gt; { // eslint-disable-line arrow-body-style
</pre>
<pre>

...

      });
    });
  },
<b>  updateGroup(_, updateGroupInput, ctx) {</b>
<b>    const { id, name } &#x3D; updateGroupInput.group;</b>
<b></b>
<b>    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; {  // eslint-disable-line arrow-body-style</b>
      return Group.findOne({
        where: { id },
        include: [{
</pre>

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

    updateGroup(_, args, ctx) {
      return groupLogic.updateGroup(_, args, ctx);
    },
<b>    login(_, signinUserInput, ctx) {</b>
      // find user by email
<b>      const { email, password } &#x3D; signinUserInput.user;</b>
<b></b>
      return User.findOne({ where: { email } }).then((user) &#x3D;&gt; {
        if (user) {
          // validate password
</pre>
<pre>

...

        return Promise.reject(&#x27;email not found&#x27;);
      });
    },
<b>    signup(_, signinUserInput, ctx) {</b>
<b>      const { email, password, username } &#x3D; signinUserInput.user;</b>
<b></b>
      // find user by email
      return User.findOne({ where: { email } }).then((existing) &#x3D;&gt; {
        if (!existing) {
</pre>

[}]: #

That's it!

# Input Types on the Client
We need the GraphQL requests on our client to match the input type updates we made on our server.

Let's start by updating `GROUP_FRAGMENT` with our new `ConnectionInput`:

[{]: <helper> (diffStep 8.5 files="client/src/graphql/group.fragment.js")

#### Step 8.5: Add Input Types to Mutations

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.fragment.js
<pre>

...

      id
      username
    }
<b>    messages(messageConnection: $messageConnection) {</b>
      edges {
        cursor
        node {
</pre>

[}]: #

This will super simplify all GraphQL requests that return `Group` types:

[{]: <helper> (diffStep 8.5 files="client/src/graphql/group.query.js,client/src/graphql/create-group.mutation.js,client/src/graphql/group-added.subscription.js")

#### Step 8.5: Add Input Types to Mutations

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
<pre>

...

import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;

const CREATE_GROUP_MUTATION &#x3D; gql&#x60;
<b>  mutation createGroup($group: CreateGroupInput!, $messageConnection: ConnectionInput &#x3D; { first: 1 }) {</b>
<b>    createGroup(group: $group) {</b>
      ... GroupFragment
    }
  }
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group-added.subscription.js
<pre>

...

import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;

const GROUP_ADDED_SUBSCRIPTION &#x3D; gql&#x60;
<b>  subscription onGroupAdded($userId: Int, $messageConnection: ConnectionInput){</b>
    groupAdded(userId: $userId){
      ... GroupFragment
    }
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.query.js
<pre>

...

import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;

const GROUP_QUERY &#x3D; gql&#x60;
<b>  query group($groupId: Int!, $messageConnection: ConnectionInput &#x3D; {first: 0}) {</b>
    group(id: $groupId) {
      ... GroupFragment
    }
</pre>

[}]: #

Our other mutations will also look cleaner with their fancy input types as well:

[{]: <helper> (diffStep 8.5 files="client/src/graphql/login.mutation.js,client/src/graphql/signup.mutation.js,client/src/graphql/create-message.mutation.js")

#### Step 8.5: Add Input Types to Mutations

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-message.mutation.js
<pre>

...

import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;

const CREATE_MESSAGE_MUTATION &#x3D; gql&#x60;
<b>  mutation createMessage($message: CreateMessageInput!) {</b>
<b>    createMessage(message: $message) {</b>
      ... MessageFragment
    }
  }
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;login.mutation.js
<pre>

...

import gql from &#x27;graphql-tag&#x27;;

const LOGIN_MUTATION &#x3D; gql&#x60;
<b>  mutation login($user: SigninUserInput!) {</b>
<b>    login(user: $user) {</b>
      id
      jwt
      username
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;signup.mutation.js
<pre>

...

import gql from &#x27;graphql-tag&#x27;;

const SIGNUP_MUTATION &#x3D; gql&#x60;
<b>  mutation signup($user: SigninUserInput!) {</b>
<b>    signup(user: $user) {</b>
      id
      jwt
      username
</pre>

[}]: #

Finally, we need to update our React Native components to pass in the right values to the new input types. The changes are pretty trivial:

[{]: <helper> (diffStep 8.6)

#### Step 8.6: Add Input Types to Screens

##### Changed client&#x2F;src&#x2F;screens&#x2F;finalize-group.screen.js
<pre>

...


const createGroupMutation &#x3D; graphql(CREATE_GROUP_MUTATION, {
  props: ({ ownProps, mutate }) &#x3D;&gt; ({
<b>    createGroup: group &#x3D;&gt;</b>
      mutate({
<b>        variables: { group },</b>
        update: (store, { data: { createGroup } }) &#x3D;&gt; {
          // Read the data from our cache for this query.
          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

  options: ownProps &#x3D;&gt; ({
    variables: {
      groupId: ownProps.navigation.state.params.groupId,
<b>      messageConnection: {</b>
<b>        first: ITEMS_PER_PAGE,</b>
<b>      },</b>
    },
  }),
  props: ({ data: { fetchMore, loading, group, refetch, subscribeToMore } }) &#x3D;&gt; ({
</pre>
<pre>

...

        // GROUP_QUERY is used by default)
        variables: {
          // load more queries starting from the cursor of the last (oldest) message
<b>          messageConnection: {</b>
<b>            first: ITEMS_PER_PAGE,</b>
<b>            after: group.messages.edges[group.messages.edges.length - 1].cursor,</b>
<b>          },</b>
        },
        updateQuery: (previousResult, { fetchMoreResult }) &#x3D;&gt; {
          // we will make an extra call to check if no more entries
</pre>
<pre>

...


const createMessageMutation &#x3D; graphql(CREATE_MESSAGE_MUTATION, {
  props: ({ ownProps, mutate }) &#x3D;&gt; ({
<b>    createMessage: message &#x3D;&gt;</b>
      mutate({
<b>        variables: { message },</b>
        optimisticResponse: {
          __typename: &#x27;Mutation&#x27;,
          createMessage: {
            __typename: &#x27;Message&#x27;,
            id: -1, // don&#x27;t know id yet, but it doesn&#x27;t matter
<b>            text: message.text, // we know what the text will be</b>
            createdAt: new Date().toISOString(), // the time is now!
            from: {
              __typename: &#x27;User&#x27;,
</pre>
<pre>

...

            },
            to: {
              __typename: &#x27;Group&#x27;,
<b>              id: message.groupId,</b>
            },
          },
        },
</pre>
<pre>

...

          const groupData &#x3D; store.readQuery({
            query: GROUP_QUERY,
            variables: {
<b>              groupId: message.groupId,</b>
<b>              messageConnection: { first: ITEMS_PER_PAGE },</b>
            },
          });

</pre>
<pre>

...

          store.writeQuery({
            query: GROUP_QUERY,
            variables: {
<b>              groupId: message.groupId,</b>
<b>              messageConnection: { first: ITEMS_PER_PAGE },</b>
            },
            data: groupData,
          });
</pre>
<pre>

...

          });

          // check whether the mutation is the latest message and update cache
<b>          const updatedGroup &#x3D; _.find(userData.user.groups, { id: message.groupId });</b>
          if (!updatedGroup.messages.edges.length ||
<b>            moment(updatedGroup.messages.edges[0].node.createdAt).isBefore(moment(message.createdAt))) {</b>
            // update the latest message
            updatedGroup.messages.edges[0] &#x3D; {
              __typename: &#x27;MessageEdge&#x27;,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;signin.screen.js
<pre>

...


const login &#x3D; graphql(LOGIN_MUTATION, {
  props: ({ mutate }) &#x3D;&gt; ({
<b>    login: user &#x3D;&gt;</b>
      mutate({
<b>        variables: { user },</b>
      }),
  }),
});

const signup &#x3D; graphql(SIGNUP_MUTATION, {
  props: ({ mutate }) &#x3D;&gt; ({
<b>    signup: user &#x3D;&gt;</b>
      mutate({
<b>        variables: { user },</b>
      }),
  }),
});
</pre>

[}]: #

Unlike with the previous tutorials in this series, this one doesn't have a flashy ending. Everything should be working as if nothing ever happenend, but under the hood, we've vastly improved the way we make GraphQL requests to gracefully adapt to future changes to our Schema! 

Fragments, default variables, and input types are essential tools for designing scalable GraphQL schemas to use in everchanging complex applications. They keep our code lean and adaptable. Apply liberally!
[{]: <helper> (navStep)

| [< Previous Step](step7.md) | [Next Step >](step9.md) |
|:--------------------------------|--------------------------------:|

[}]: #

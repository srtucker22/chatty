# Step 8: GraphQL Input Types

[//]: # (head-end)


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

```js
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

#### [Step 8.1: Create GROUP_FRAGMENT](https://github.com/srtucker22/chatty/commit/455e661)

##### Added client&#x2F;src&#x2F;graphql&#x2F;group.fragment.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import gql from &#x27;graphql-tag&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b>+┊  ┊ 4┊</b>
<b>+┊  ┊ 5┊const GROUP_FRAGMENT &#x3D; gql&#x60;</b>
<b>+┊  ┊ 6┊  fragment GroupFragment on Group {</b>
<b>+┊  ┊ 7┊    id</b>
<b>+┊  ┊ 8┊    name</b>
<b>+┊  ┊ 9┊    users {</b>
<b>+┊  ┊10┊      id</b>
<b>+┊  ┊11┊      username</b>
<b>+┊  ┊12┊    }</b>
<b>+┊  ┊13┊    messages(first: $first, last: $last, before: $before, after: $after) {</b>
<b>+┊  ┊14┊      edges {</b>
<b>+┊  ┊15┊        cursor</b>
<b>+┊  ┊16┊        node {</b>
<b>+┊  ┊17┊          ... MessageFragment</b>
<b>+┊  ┊18┊        }</b>
<b>+┊  ┊19┊      }</b>
<b>+┊  ┊20┊      pageInfo {</b>
<b>+┊  ┊21┊        hasNextPage</b>
<b>+┊  ┊22┊        hasPreviousPage</b>
<b>+┊  ┊23┊      }</b>
<b>+┊  ┊24┊    }</b>
<b>+┊  ┊25┊  }</b>
<b>+┊  ┊26┊  ${MESSAGE_FRAGMENT}</b>
<b>+┊  ┊27┊&#x60;;</b>
<b>+┊  ┊28┊</b>
<b>+┊  ┊29┊export default GROUP_FRAGMENT;</b>
</pre>

[}]: #

Now we can update all these GraphQL requests to use the fragment:

[{]: <helper> (diffStep 8.2)

#### [Step 8.2: Apply GROUP_FRAGMENT to Queries with default variables](https://github.com/srtucker22/chatty/commit/538a7fd)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import gql from &#x27;graphql-tag&#x27;;
 ┊ 2┊ 2┊
<b>+┊  ┊ 3┊import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;</b>
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const CREATE_GROUP_MUTATION &#x3D; gql&#x60;
<b>+┊  ┊ 6┊  mutation createGroup($name: String!, $userIds: [Int!], $first: Int &#x3D; 1, $after: String, $last: Int, $before: String) {</b>
 ┊ 7┊ 7┊    createGroup(name: $name, userIds: $userIds) {
<b>+┊  ┊ 8┊      ... GroupFragment</b>
 ┊21┊ 9┊    }
 ┊22┊10┊  }
<b>+┊  ┊11┊  ${GROUP_FRAGMENT}</b>
 ┊24┊12┊&#x60;;
 ┊25┊13┊
 ┊26┊14┊export default CREATE_GROUP_MUTATION;
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group-added.subscription.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import gql from &#x27;graphql-tag&#x27;;
 ┊ 2┊ 2┊
<b>+┊  ┊ 3┊import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;</b>
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const GROUP_ADDED_SUBSCRIPTION &#x3D; gql&#x60;
<b>+┊  ┊ 6┊  subscription onGroupAdded($userId: Int, $first: Int &#x3D; 1, $after: String, $last: Int, $before: String){</b>
 ┊ 7┊ 7┊    groupAdded(userId: $userId){
<b>+┊  ┊ 8┊      ... GroupFragment</b>
 ┊18┊ 9┊    }
 ┊19┊10┊  }
<b>+┊  ┊11┊  ${GROUP_FRAGMENT}</b>
 ┊21┊12┊&#x60;;
 ┊22┊13┊
 ┊23┊14┊export default GROUP_ADDED_SUBSCRIPTION;
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.query.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import gql from &#x27;graphql-tag&#x27;;
 ┊ 2┊ 2┊
<b>+┊  ┊ 3┊import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;</b>
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const GROUP_QUERY &#x3D; gql&#x60;
<b>+┊  ┊ 6┊  query group($groupId: Int!, $first: Int &#x3D; 1, $after: String, $last: Int, $before: String) {</b>
 ┊ 7┊ 7┊    group(id: $groupId) {
<b>+┊  ┊ 8┊      ... GroupFragment</b>
 ┊26┊ 9┊    }
 ┊27┊10┊  }
<b>+┊  ┊11┊  ${GROUP_FRAGMENT}</b>
 ┊29┊12┊&#x60;;
 ┊30┊13┊
 ┊31┊14┊export default GROUP_QUERY;
</pre>

[}]: #

There are a few things worth noting about this pattern:
1. Changing fields on `GROUP_FRAGMENT` will immediately apply to all queries, mutations, and subscriptions that use it.
2. We are occasionally using default values for the `$first` variable -- `$first: Int = 1` to return the first message in a Group if that variable is not specified when executing the query/mutation/subscription.

(GraphQL default variables is without a doubt the greatest and most essential addition to `apollo-client` of all time, and whoever wrote that PR deserves free beer for life 😉)

3. Our GraphQL requests have much simpler return shapes, but much more complex sets of variables.

Old `CREATE_GROUP_MUTATION`:

```graphql
mutation createGroup($name: String!, $userIds: [Int!]) { ... }
```

New `CREATE_GROUP_MUTATION`:

```graphql
mutation createGroup($name: String!, $userIds: [Int!], $first: Int = 1, $after: String, $last: Int, $before: String) { ... }
```

Yeesh! If we needed to change a variable used in `GROUP_FRAGMENT`, we'd still have to change all the queries/mutations/subscriptions. Moreover, it's not very clear what all these variables mean. `$first`, `$after`, `$last`, and `$before` are variables we use to paginate messages within a `Group`, but those variables need to be specified in `USER_QUERY` -- that's nonobvious and weird. What we need is a way to abstract inputs to simplify the way we declare variables and update those variables as our app evolves. Enter GraphQL Input Types!

# Input Types on the Server
GraphQL Input Types are a super simple concept -- you can declare named arguments in a GraphQL request in whatever shape you want.

For example, we can abstract away the pagination variables from our GraphQL requests by adding the following `ConnectionInput` in our schema:

```graphql
# input for relay cursor connections
  input ConnectionInput {
    first: Int
    after: String
    last: Int
    before: String
  }
```

This will enable us to update `Group` like so:

```graphql
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

#### [Step 8.3: Add Input Types to Schema](https://github.com/srtucker22/chatty/commit/843f7a7)

##### Changed server&#x2F;data&#x2F;schema.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 4┊ 4┊  # declare custom scalars
 ┊ 5┊ 5┊  scalar Date
 ┊ 6┊ 6┊
<b>+┊  ┊ 7┊  # input for creating messages</b>
<b>+┊  ┊ 8┊  input CreateMessageInput {</b>
<b>+┊  ┊ 9┊    groupId: Int!</b>
<b>+┊  ┊10┊    text: String!</b>
<b>+┊  ┊11┊  }</b>
<b>+┊  ┊12┊</b>
<b>+┊  ┊13┊  # input for creating groups</b>
<b>+┊  ┊14┊  input CreateGroupInput {</b>
<b>+┊  ┊15┊    name: String!</b>
<b>+┊  ┊16┊    userIds: [Int!]</b>
<b>+┊  ┊17┊  }</b>
<b>+┊  ┊18┊</b>
<b>+┊  ┊19┊  # input for updating groups</b>
<b>+┊  ┊20┊  input UpdateGroupInput {</b>
<b>+┊  ┊21┊    id: Int!</b>
<b>+┊  ┊22┊    name: String</b>
<b>+┊  ┊23┊    userIds: [Int!]</b>
<b>+┊  ┊24┊  }</b>
<b>+┊  ┊25┊</b>
<b>+┊  ┊26┊  # input for signing in users</b>
<b>+┊  ┊27┊  input SigninUserInput {</b>
<b>+┊  ┊28┊    email: String!</b>
<b>+┊  ┊29┊    password: String!</b>
<b>+┊  ┊30┊    username: String</b>
<b>+┊  ┊31┊  }</b>
<b>+┊  ┊32┊</b>
<b>+┊  ┊33┊  # input for updating users</b>
<b>+┊  ┊34┊  input UpdateUserInput {</b>
<b>+┊  ┊35┊    username: String</b>
<b>+┊  ┊36┊  }</b>
<b>+┊  ┊37┊</b>
<b>+┊  ┊38┊  # input for relay cursor connections</b>
<b>+┊  ┊39┊  input ConnectionInput {</b>
<b>+┊  ┊40┊    first: Int</b>
<b>+┊  ┊41┊    after: String</b>
<b>+┊  ┊42┊    last: Int</b>
<b>+┊  ┊43┊    before: String</b>
<b>+┊  ┊44┊  }</b>
<b>+┊  ┊45┊</b>
 ┊ 7┊46┊  type MessageConnection {
 ┊ 8┊47┊    edges: [MessageEdge]
 ┊ 9┊48┊    pageInfo: PageInfo!
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊24┊63┊    id: Int! # unique id for the group
 ┊25┊64┊    name: String # name of the group
 ┊26┊65┊    users: [User]! # users in the group
<b>+┊  ┊66┊    messages(messageConnection: ConnectionInput): MessageConnection # messages sent to the group</b>
 ┊28┊67┊  }
 ┊29┊68┊
 ┊30┊69┊  # a user -- keep type really simple for now
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 62┊101┊
 ┊ 63┊102┊  type Mutation {
 ┊ 64┊103┊    # send a message to a group
<b>+┊   ┊104┊    createMessage(message: CreateMessageInput!): Message</b>
<b>+┊   ┊105┊    createGroup(group: CreateGroupInput!): Group</b>
 ┊ 67┊106┊    deleteGroup(id: Int!): Group
 ┊ 68┊107┊    leaveGroup(id: Int!): Group # let user leave group
<b>+┊   ┊108┊    updateGroup(group: UpdateGroupInput!): Group</b>
<b>+┊   ┊109┊    login(user: SigninUserInput!): User</b>
<b>+┊   ┊110┊    signup(user: SigninUserInput!): User</b>
 ┊ 72┊111┊  }
 ┊ 73┊112┊
 ┊ 74┊113┊  type Subscription {
</pre>

[}]: #

Sweet! Now let's update our resolvers and business logic to handle input types instead of individual variables. The changes are minimal:

[{]: <helper> (diffStep 8.4)

#### [Step 8.4: Add Input Types to Resolvers and Logic](https://github.com/srtucker22/chatty/commit/483718b)

##### Changed server&#x2F;data&#x2F;logic.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊18┊18┊  to(message) {
 ┊19┊19┊    return message.getGroup({ attributes: [&#x27;id&#x27;, &#x27;name&#x27;] });
 ┊20┊20┊  },
<b>+┊  ┊21┊  createMessage(_, createMessageInput, ctx) {</b>
<b>+┊  ┊22┊    const { text, groupId } &#x3D; createMessageInput.message;</b>
<b>+┊  ┊23┊</b>
 ┊22┊24┊    return getAuthenticatedUser(ctx)
 ┊23┊25┊      .then(user &#x3D;&gt; user.getGroups({ where: { id: groupId }, attributes: [&#x27;id&#x27;] })
 ┊24┊26┊        .then((group) &#x3D;&gt; {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊38┊40┊  users(group) {
 ┊39┊41┊    return group.getUsers({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });
 ┊40┊42┊  },
<b>+┊  ┊43┊  messages(group, { messageConnection &#x3D; {} }) {</b>
<b>+┊  ┊44┊    const { first, last, before, after } &#x3D; messageConnection;</b>
<b>+┊  ┊45┊</b>
 ┊42┊46┊    // base query -- get messages from the right group
 ┊43┊47┊    const where &#x3D; { groupId: group.id };
 ┊44┊48┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊105┊109┊      }],
 ┊106┊110┊    }));
 ┊107┊111┊  },
<b>+┊   ┊112┊  createGroup(_, createGroupInput, ctx) {</b>
<b>+┊   ┊113┊    const { name, userIds } &#x3D; createGroupInput.group;</b>
<b>+┊   ┊114┊</b>
 ┊109┊115┊    return getAuthenticatedUser(ctx)
 ┊110┊116┊      .then(user &#x3D;&gt; user.getFriends({ where: { id: { $in: userIds } } })
 ┊111┊117┊        .then((friends) &#x3D;&gt; { // eslint-disable-line arrow-body-style
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊158┊164┊      });
 ┊159┊165┊    });
 ┊160┊166┊  },
<b>+┊   ┊167┊  updateGroup(_, updateGroupInput, ctx) {</b>
<b>+┊   ┊168┊    const { id, name } &#x3D; updateGroupInput.group;</b>
<b>+┊   ┊169┊</b>
<b>+┊   ┊170┊    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; {  // eslint-disable-line arrow-body-style</b>
 ┊163┊171┊      return Group.findOne({
 ┊164┊172┊        where: { id },
 ┊165┊173┊        include: [{
</pre>

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊55┊55┊    updateGroup(_, args, ctx) {
 ┊56┊56┊      return groupLogic.updateGroup(_, args, ctx);
 ┊57┊57┊    },
<b>+┊  ┊58┊    login(_, signinUserInput, ctx) {</b>
 ┊59┊59┊      // find user by email
<b>+┊  ┊60┊      const { email, password } &#x3D; signinUserInput.user;</b>
<b>+┊  ┊61┊</b>
 ┊60┊62┊      return User.findOne({ where: { email } }).then((user) &#x3D;&gt; {
 ┊61┊63┊        if (user) {
 ┊62┊64┊          // validate password
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊80┊82┊        return Promise.reject(&#x27;email not found&#x27;);
 ┊81┊83┊      });
 ┊82┊84┊    },
<b>+┊  ┊85┊    signup(_, signinUserInput, ctx) {</b>
<b>+┊  ┊86┊      const { email, password, username } &#x3D; signinUserInput.user;</b>
<b>+┊  ┊87┊</b>
 ┊84┊88┊      // find user by email
 ┊85┊89┊      return User.findOne({ where: { email } }).then((existing) &#x3D;&gt; {
 ┊86┊90┊        if (!existing) {
</pre>

[}]: #

That's it!

# Input Types on the Client
We need the GraphQL requests on our client to match the input type updates we made on our server.

Let's start by updating `GROUP_FRAGMENT` with our new `ConnectionInput`:

[{]: <helper> (diffStep 8.5 files="client/src/graphql/group.fragment.js")

#### [Step 8.5: Add Input Types to Mutations](https://github.com/srtucker22/chatty/commit/903a196)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.fragment.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊10┊10┊      id
 ┊11┊11┊      username
 ┊12┊12┊    }
<b>+┊  ┊13┊    messages(messageConnection: $messageConnection) {</b>
 ┊14┊14┊      edges {
 ┊15┊15┊        cursor
 ┊16┊16┊        node {
</pre>

[}]: #

This will super simplify all GraphQL requests that return `Group` types:

[{]: <helper> (diffStep 8.5 files="client/src/graphql/group.query.js,client/src/graphql/create-group.mutation.js,client/src/graphql/group-added.subscription.js")

#### [Step 8.5: Add Input Types to Mutations](https://github.com/srtucker22/chatty/commit/903a196)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 3┊ 3┊import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const CREATE_GROUP_MUTATION &#x3D; gql&#x60;
<b>+┊  ┊ 6┊  mutation createGroup($group: CreateGroupInput!, $messageConnection: ConnectionInput &#x3D; { first: 1 }) {</b>
<b>+┊  ┊ 7┊    createGroup(group: $group) {</b>
 ┊ 8┊ 8┊      ... GroupFragment
 ┊ 9┊ 9┊    }
 ┊10┊10┊  }
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group-added.subscription.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊3┊3┊import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;
 ┊4┊4┊
 ┊5┊5┊const GROUP_ADDED_SUBSCRIPTION &#x3D; gql&#x60;
<b>+┊ ┊6┊  subscription onGroupAdded($userId: Int, $messageConnection: ConnectionInput){</b>
 ┊7┊7┊    groupAdded(userId: $userId){
 ┊8┊8┊      ... GroupFragment
 ┊9┊9┊    }
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.query.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊3┊3┊import GROUP_FRAGMENT from &#x27;./group.fragment&#x27;;
 ┊4┊4┊
 ┊5┊5┊const GROUP_QUERY &#x3D; gql&#x60;
<b>+┊ ┊6┊  query group($groupId: Int!, $messageConnection: ConnectionInput &#x3D; {first: 0}) {</b>
 ┊7┊7┊    group(id: $groupId) {
 ┊8┊8┊      ... GroupFragment
 ┊9┊9┊    }
</pre>

[}]: #

Our other mutations will also look cleaner with their fancy input types as well:

[{]: <helper> (diffStep 8.5 files="client/src/graphql/login.mutation.js,client/src/graphql/signup.mutation.js,client/src/graphql/create-message.mutation.js")

#### [Step 8.5: Add Input Types to Mutations](https://github.com/srtucker22/chatty/commit/903a196)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-message.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 3┊ 3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const CREATE_MESSAGE_MUTATION &#x3D; gql&#x60;
<b>+┊  ┊ 6┊  mutation createMessage($message: CreateMessageInput!) {</b>
<b>+┊  ┊ 7┊    createMessage(message: $message) {</b>
 ┊ 8┊ 8┊      ... MessageFragment
 ┊ 9┊ 9┊    }
 ┊10┊10┊  }
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;login.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import gql from &#x27;graphql-tag&#x27;;
 ┊2┊2┊
 ┊3┊3┊const LOGIN_MUTATION &#x3D; gql&#x60;
<b>+┊ ┊4┊  mutation login($user: SigninUserInput!) {</b>
<b>+┊ ┊5┊    login(user: $user) {</b>
 ┊6┊6┊      id
 ┊7┊7┊      jwt
 ┊8┊8┊      username
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;signup.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import gql from &#x27;graphql-tag&#x27;;
 ┊2┊2┊
 ┊3┊3┊const SIGNUP_MUTATION &#x3D; gql&#x60;
<b>+┊ ┊4┊  mutation signup($user: SigninUserInput!) {</b>
<b>+┊ ┊5┊    signup(user: $user) {</b>
 ┊6┊6┊      id
 ┊7┊7┊      jwt
 ┊8┊8┊      username
</pre>

[}]: #

Finally, we need to update our React Native components to pass in the right values to the new input types. The changes are pretty trivial:

[{]: <helper> (diffStep 8.6)

#### [Step 8.6: Add Input Types to Screens](https://github.com/srtucker22/chatty/commit/4963386)

##### Changed client&#x2F;src&#x2F;screens&#x2F;finalize-group.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊223┊223┊
 ┊224┊224┊const createGroupMutation &#x3D; graphql(CREATE_GROUP_MUTATION, {
 ┊225┊225┊  props: ({ ownProps, mutate }) &#x3D;&gt; ({
<b>+┊   ┊226┊    createGroup: group &#x3D;&gt;</b>
 ┊227┊227┊      mutate({
<b>+┊   ┊228┊        variables: { group },</b>
 ┊229┊229┊        update: (store, { data: { createGroup } }) &#x3D;&gt; {
 ┊230┊230┊          // Read the data from our cache for this query.
 ┊231┊231┊          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊264┊264┊  options: ownProps &#x3D;&gt; ({
 ┊265┊265┊    variables: {
 ┊266┊266┊      groupId: ownProps.navigation.state.params.groupId,
<b>+┊   ┊267┊      messageConnection: {</b>
<b>+┊   ┊268┊        first: ITEMS_PER_PAGE,</b>
<b>+┊   ┊269┊      },</b>
 ┊268┊270┊    },
 ┊269┊271┊  }),
 ┊270┊272┊  props: ({ data: { fetchMore, loading, group, refetch, subscribeToMore } }) &#x3D;&gt; ({
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊278┊280┊        // GROUP_QUERY is used by default)
 ┊279┊281┊        variables: {
 ┊280┊282┊          // load more queries starting from the cursor of the last (oldest) message
<b>+┊   ┊283┊          messageConnection: {</b>
<b>+┊   ┊284┊            first: ITEMS_PER_PAGE,</b>
<b>+┊   ┊285┊            after: group.messages.edges[group.messages.edges.length - 1].cursor,</b>
<b>+┊   ┊286┊          },</b>
 ┊282┊287┊        },
 ┊283┊288┊        updateQuery: (previousResult, { fetchMoreResult }) &#x3D;&gt; {
 ┊284┊289┊          // we will make an extra call to check if no more entries
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊300┊305┊
 ┊301┊306┊const createMessageMutation &#x3D; graphql(CREATE_MESSAGE_MUTATION, {
 ┊302┊307┊  props: ({ ownProps, mutate }) &#x3D;&gt; ({
<b>+┊   ┊308┊    createMessage: message &#x3D;&gt;</b>
 ┊304┊309┊      mutate({
<b>+┊   ┊310┊        variables: { message },</b>
 ┊306┊311┊        optimisticResponse: {
 ┊307┊312┊          __typename: &#x27;Mutation&#x27;,
 ┊308┊313┊          createMessage: {
 ┊309┊314┊            __typename: &#x27;Message&#x27;,
 ┊310┊315┊            id: -1, // don&#x27;t know id yet, but it doesn&#x27;t matter
<b>+┊   ┊316┊            text: message.text, // we know what the text will be</b>
 ┊312┊317┊            createdAt: new Date().toISOString(), // the time is now!
 ┊313┊318┊            from: {
 ┊314┊319┊              __typename: &#x27;User&#x27;,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊317┊322┊            },
 ┊318┊323┊            to: {
 ┊319┊324┊              __typename: &#x27;Group&#x27;,
<b>+┊   ┊325┊              id: message.groupId,</b>
 ┊321┊326┊            },
 ┊322┊327┊          },
 ┊323┊328┊        },
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊326┊331┊          const groupData &#x3D; store.readQuery({
 ┊327┊332┊            query: GROUP_QUERY,
 ┊328┊333┊            variables: {
<b>+┊   ┊334┊              groupId: message.groupId,</b>
<b>+┊   ┊335┊              messageConnection: { first: ITEMS_PER_PAGE },</b>
 ┊331┊336┊            },
 ┊332┊337┊          });
 ┊333┊338┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊342┊347┊          store.writeQuery({
 ┊343┊348┊            query: GROUP_QUERY,
 ┊344┊349┊            variables: {
<b>+┊   ┊350┊              groupId: message.groupId,</b>
<b>+┊   ┊351┊              messageConnection: { first: ITEMS_PER_PAGE },</b>
 ┊347┊352┊            },
 ┊348┊353┊            data: groupData,
 ┊349┊354┊          });
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊356┊361┊          });
 ┊357┊362┊
 ┊358┊363┊          // check whether the mutation is the latest message and update cache
<b>+┊   ┊364┊          const updatedGroup &#x3D; _.find(userData.user.groups, { id: message.groupId });</b>
 ┊360┊365┊          if (!updatedGroup.messages.edges.length ||
<b>+┊   ┊366┊            moment(updatedGroup.messages.edges[0].node.createdAt).isBefore(moment(message.createdAt))) {</b>
 ┊362┊367┊            // update the latest message
 ┊363┊368┊            updatedGroup.messages.edges[0] &#x3D; {
 ┊364┊369┊              __typename: &#x27;MessageEdge&#x27;,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;signin.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊212┊212┊
 ┊213┊213┊const login &#x3D; graphql(LOGIN_MUTATION, {
 ┊214┊214┊  props: ({ mutate }) &#x3D;&gt; ({
<b>+┊   ┊215┊    login: user &#x3D;&gt;</b>
 ┊216┊216┊      mutate({
<b>+┊   ┊217┊        variables: { user },</b>
 ┊218┊218┊      }),
 ┊219┊219┊  }),
 ┊220┊220┊});
 ┊221┊221┊
 ┊222┊222┊const signup &#x3D; graphql(SIGNUP_MUTATION, {
 ┊223┊223┊  props: ({ mutate }) &#x3D;&gt; ({
<b>+┊   ┊224┊    signup: user &#x3D;&gt;</b>
 ┊225┊225┊      mutate({
<b>+┊   ┊226┊        variables: { user },</b>
 ┊227┊227┊      }),
 ┊228┊228┊  }),
 ┊229┊229┊});
</pre>

[}]: #

Unlike with the previous tutorials in this series, this one doesn't have a flashy ending. Everything should be working as if nothing ever happenend, but under the hood, we've vastly improved the way we make GraphQL requests to gracefully adapt to future changes to our Schema!

Fragments, default variables, and input types are essential tools for designing scalable GraphQL schemas to use in everchanging complex applications. They keep our code lean and adaptable. Apply liberally!


[//]: # (foot-start)

[{]: <helper> (navStep)

⟸ <a href="https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/medium/step7.md">PREVIOUS STEP</a> <b>║</b>

[}]: #

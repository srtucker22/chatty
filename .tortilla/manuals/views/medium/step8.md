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

#### Step 8.2: Apply GROUP_FRAGMENT to Queries with default variables

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
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 7┊ 7┊  # declare custom scalars
 ┊ 8┊ 8┊  scalar Date
 ┊ 9┊ 9┊
<b>+┊  ┊10┊  # input for creating messages</b>
<b>+┊  ┊11┊  input CreateMessageInput {</b>
<b>+┊  ┊12┊    groupId: Int!</b>
<b>+┊  ┊13┊    text: String!</b>
<b>+┊  ┊14┊  }</b>
<b>+┊  ┊15┊</b>
<b>+┊  ┊16┊  # input for creating groups</b>
<b>+┊  ┊17┊  input CreateGroupInput {</b>
<b>+┊  ┊18┊    name: String!</b>
<b>+┊  ┊19┊    userIds: [Int!]</b>
<b>+┊  ┊20┊  }</b>
<b>+┊  ┊21┊</b>
<b>+┊  ┊22┊  # input for updating groups</b>
<b>+┊  ┊23┊  input UpdateGroupInput {</b>
<b>+┊  ┊24┊    id: Int!</b>
<b>+┊  ┊25┊    name: String</b>
<b>+┊  ┊26┊    userIds: [Int!]</b>
<b>+┊  ┊27┊  }</b>
<b>+┊  ┊28┊</b>
<b>+┊  ┊29┊  # input for signing in users</b>
<b>+┊  ┊30┊  input SigninUserInput {</b>
<b>+┊  ┊31┊    email: String!</b>
<b>+┊  ┊32┊    password: String!</b>
<b>+┊  ┊33┊    username: String</b>
<b>+┊  ┊34┊  }</b>
<b>+┊  ┊35┊</b>
<b>+┊  ┊36┊  # input for updating users</b>
<b>+┊  ┊37┊  input UpdateUserInput {</b>
<b>+┊  ┊38┊    username: String</b>
<b>+┊  ┊39┊  }</b>
<b>+┊  ┊40┊</b>
<b>+┊  ┊41┊  # input for relay cursor connections</b>
<b>+┊  ┊42┊  input ConnectionInput {</b>
<b>+┊  ┊43┊    first: Int</b>
<b>+┊  ┊44┊    after: String</b>
<b>+┊  ┊45┊    last: Int</b>
<b>+┊  ┊46┊    before: String</b>
<b>+┊  ┊47┊  }</b>
<b>+┊  ┊48┊</b>
 ┊10┊49┊  type MessageConnection {
 ┊11┊50┊    edges: [MessageEdge]
 ┊12┊51┊    pageInfo: PageInfo!
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊27┊66┊    id: Int! # unique id for the group
 ┊28┊67┊    name: String # name of the group
 ┊29┊68┊    users: [User]! # users in the group
<b>+┊  ┊69┊    messages(messageConnection: ConnectionInput): MessageConnection # messages sent to the group</b>
 ┊31┊70┊  }
 ┊32┊71┊
 ┊33┊72┊  # a user -- keep type really simple for now
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 65┊104┊
 ┊ 66┊105┊  type Mutation {
 ┊ 67┊106┊    # send a message to a group
<b>+┊   ┊107┊    createMessage(message: CreateMessageInput!): Message</b>
<b>+┊   ┊108┊    createGroup(group: CreateGroupInput!): Group</b>
 ┊ 70┊109┊    deleteGroup(id: Int!): Group
 ┊ 71┊110┊    leaveGroup(id: Int!): Group # let user leave group
<b>+┊   ┊111┊    updateGroup(group: UpdateGroupInput!): Group</b>
<b>+┊   ┊112┊    login(user: SigninUserInput!): User</b>
<b>+┊   ┊113┊    signup(user: SigninUserInput!): User</b>
 ┊ 75┊114┊  }
 ┊ 76┊115┊
 ┊ 77┊116┊  type Subscription {
</pre>

[}]: #

Sweet! Now let's update our resolvers and business logic to handle input types instead of individual variables. The changes are minimal:

[{]: <helper> (diffStep 8.4)

#### Step 8.4: Add Input Types to Resolvers and Logic

##### Changed server&#x2F;data&#x2F;logic.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊17┊17┊  to(message) {
 ┊18┊18┊    return message.getGroup({ attributes: [&#x27;id&#x27;, &#x27;name&#x27;] });
 ┊19┊19┊  },
<b>+┊  ┊20┊  createMessage(_, createMessageInput, ctx) {</b>
<b>+┊  ┊21┊    const { text, groupId } &#x3D; createMessageInput.message;</b>
<b>+┊  ┊22┊</b>
 ┊21┊23┊    return getAuthenticatedUser(ctx)
 ┊22┊24┊      .then(user &#x3D;&gt; user.getGroups({ where: { id: groupId }, attributes: [&#x27;id&#x27;] })
 ┊23┊25┊        .then((group) &#x3D;&gt; {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊37┊39┊  users(group) {
 ┊38┊40┊    return group.getUsers({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });
 ┊39┊41┊  },
<b>+┊  ┊42┊  messages(group, { messageConnection &#x3D; {} }) {</b>
<b>+┊  ┊43┊    const { first, last, before, after } &#x3D; messageConnection;</b>
<b>+┊  ┊44┊</b>
 ┊41┊45┊    // base query -- get messages from the right group
 ┊42┊46┊    const where &#x3D; { groupId: group.id };
 ┊43┊47┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊104┊108┊      }],
 ┊105┊109┊    }));
 ┊106┊110┊  },
<b>+┊   ┊111┊  createGroup(_, createGroupInput, ctx) {</b>
<b>+┊   ┊112┊    const { name, userIds } &#x3D; createGroupInput.group;</b>
<b>+┊   ┊113┊</b>
 ┊108┊114┊    return getAuthenticatedUser(ctx)
 ┊109┊115┊      .then(user &#x3D;&gt; user.getFriends({ where: { id: { $in: userIds } } })
 ┊110┊116┊        .then((friends) &#x3D;&gt; { // eslint-disable-line arrow-body-style
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊161┊167┊      });
 ┊162┊168┊    });
 ┊163┊169┊  },
<b>+┊   ┊170┊  updateGroup(_, updateGroupInput, ctx) {</b>
<b>+┊   ┊171┊    const { id, name } &#x3D; updateGroupInput.group;</b>
<b>+┊   ┊172┊</b>
<b>+┊   ┊173┊    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; {  // eslint-disable-line arrow-body-style</b>
 ┊166┊174┊      return Group.findOne({
 ┊167┊175┊        where: { id },
 ┊168┊176┊        include: [{
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

#### Step 8.5: Add Input Types to Mutations

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

#### Step 8.5: Add Input Types to Mutations

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

#### Step 8.5: Add Input Types to Mutations

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

#### Step 8.6: Add Input Types to Screens

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
 ┊263┊263┊  options: ownProps &#x3D;&gt; ({
 ┊264┊264┊    variables: {
 ┊265┊265┊      groupId: ownProps.navigation.state.params.groupId,
<b>+┊   ┊266┊      messageConnection: {</b>
<b>+┊   ┊267┊        first: ITEMS_PER_PAGE,</b>
<b>+┊   ┊268┊      },</b>
 ┊267┊269┊    },
 ┊268┊270┊  }),
 ┊269┊271┊  props: ({ data: { fetchMore, loading, group, refetch, subscribeToMore } }) &#x3D;&gt; ({
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊277┊279┊        // GROUP_QUERY is used by default)
 ┊278┊280┊        variables: {
 ┊279┊281┊          // load more queries starting from the cursor of the last (oldest) message
<b>+┊   ┊282┊          messageConnection: {</b>
<b>+┊   ┊283┊            first: ITEMS_PER_PAGE,</b>
<b>+┊   ┊284┊            after: group.messages.edges[group.messages.edges.length - 1].cursor,</b>
<b>+┊   ┊285┊          },</b>
 ┊281┊286┊        },
 ┊282┊287┊        updateQuery: (previousResult, { fetchMoreResult }) &#x3D;&gt; {
 ┊283┊288┊          // we will make an extra call to check if no more entries
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊299┊304┊
 ┊300┊305┊const createMessageMutation &#x3D; graphql(CREATE_MESSAGE_MUTATION, {
 ┊301┊306┊  props: ({ ownProps, mutate }) &#x3D;&gt; ({
<b>+┊   ┊307┊    createMessage: message &#x3D;&gt;</b>
 ┊303┊308┊      mutate({
<b>+┊   ┊309┊        variables: { message },</b>
 ┊305┊310┊        optimisticResponse: {
 ┊306┊311┊          __typename: &#x27;Mutation&#x27;,
 ┊307┊312┊          createMessage: {
 ┊308┊313┊            __typename: &#x27;Message&#x27;,
 ┊309┊314┊            id: -1, // don&#x27;t know id yet, but it doesn&#x27;t matter
<b>+┊   ┊315┊            text: message.text, // we know what the text will be</b>
 ┊311┊316┊            createdAt: new Date().toISOString(), // the time is now!
 ┊312┊317┊            from: {
 ┊313┊318┊              __typename: &#x27;User&#x27;,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊316┊321┊            },
 ┊317┊322┊            to: {
 ┊318┊323┊              __typename: &#x27;Group&#x27;,
<b>+┊   ┊324┊              id: message.groupId,</b>
 ┊320┊325┊            },
 ┊321┊326┊          },
 ┊322┊327┊        },
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊325┊330┊          const groupData &#x3D; store.readQuery({
 ┊326┊331┊            query: GROUP_QUERY,
 ┊327┊332┊            variables: {
<b>+┊   ┊333┊              groupId: message.groupId,</b>
<b>+┊   ┊334┊              messageConnection: { first: ITEMS_PER_PAGE },</b>
 ┊330┊335┊            },
 ┊331┊336┊          });
 ┊332┊337┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊341┊346┊          store.writeQuery({
 ┊342┊347┊            query: GROUP_QUERY,
 ┊343┊348┊            variables: {
<b>+┊   ┊349┊              groupId: message.groupId,</b>
<b>+┊   ┊350┊              messageConnection: { first: ITEMS_PER_PAGE },</b>
 ┊346┊351┊            },
 ┊347┊352┊            data: groupData,
 ┊348┊353┊          });
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊355┊360┊          });
 ┊356┊361┊
 ┊357┊362┊          // check whether the mutation is the latest message and update cache
<b>+┊   ┊363┊          const updatedGroup &#x3D; _.find(userData.user.groups, { id: message.groupId });</b>
 ┊359┊364┊          if (!updatedGroup.messages.edges.length ||
<b>+┊   ┊365┊            moment(updatedGroup.messages.edges[0].node.createdAt).isBefore(moment(message.createdAt))) {</b>
 ┊361┊366┊            // update the latest message
 ┊362┊367┊            updatedGroup.messages.edges[0] &#x3D; {
 ┊363┊368┊              __typename: &#x27;MessageEdge&#x27;,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;signin.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊207┊207┊
 ┊208┊208┊const login &#x3D; graphql(LOGIN_MUTATION, {
 ┊209┊209┊  props: ({ mutate }) &#x3D;&gt; ({
<b>+┊   ┊210┊    login: user &#x3D;&gt;</b>
 ┊211┊211┊      mutate({
<b>+┊   ┊212┊        variables: { user },</b>
 ┊213┊213┊      }),
 ┊214┊214┊  }),
 ┊215┊215┊});
 ┊216┊216┊
 ┊217┊217┊const signup &#x3D; graphql(SIGNUP_MUTATION, {
 ┊218┊218┊  props: ({ mutate }) &#x3D;&gt; ({
<b>+┊   ┊219┊    signup: user &#x3D;&gt;</b>
 ┊220┊220┊      mutate({
<b>+┊   ┊221┊        variables: { user },</b>
 ┊222┊222┊      }),
 ┊223┊223┊  }),
 ┊224┊224┊});
</pre>

[}]: #

Unlike with the previous tutorials in this series, this one doesn't have a flashy ending. Everything should be working as if nothing ever happenend, but under the hood, we've vastly improved the way we make GraphQL requests to gracefully adapt to future changes to our Schema! 

Fragments, default variables, and input types are essential tools for designing scalable GraphQL schemas to use in everchanging complex applications. They keep our code lean and adaptable. Apply liberally!
[{]: <helper> (navStep)

⟸ <a href="step7.md">PREVIOUS STEP</a> <b>║</b> <a href="step9.md">NEXT STEP</a> ⟹

[}]: #

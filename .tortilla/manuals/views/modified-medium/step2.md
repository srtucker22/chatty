# Step 2: GraphQL Queries with Express

This is the second blog in a multipart series where we will be building Chatty, a WhatsApp clone, using React Native and Apollo. You can view the code for this part of the series here.

In this section, we will be designing [GraphQL Schemas](http://graphql.org/learn/schema/) and [Queries](http://graphql.org/learn/queries/) and connecting them to real data on our server.

Here are the steps we will accomplish in this tutorial:
1. Build **GraphQL Schemas** to model User, Group, and Message data types
2. Design **GraphQL Queries** for fetching data from our server
3. Create a basic SQL database with Users, Groups, and Messages
4. Connect our database to our [`graphqlExpress`](https://www.npmjs.com/package/graphq%E2%80%A6) server using **Connectors** and **Resolvers**
5. Test out our new Queries using [GraphIQL](https://github.com/graphql/graphiql)

# Designing GraphQL Schemas
[GraphQL Type Schemas](http://graphql.org/learn/schema/) define the shape of the data our client can expect. Chatty is going to need data models to represent **Messages**, **Users**, and **Groups** at the very least, so we can start by defining those. We’ll update `server/data/schema.js` to include some basic Schemas for these types:

[{]: <helper> (diffStep 2.1)

#### Step 2.1: Update Schema

##### Changed server&#x2F;data&#x2F;schema.js
<pre>

...

<b>export const Schema &#x3D; [&#x60;</b>
<b>  # declare custom scalars</b>
<b>  scalar Date</b>
<b></b>
<b>  # a group chat entity</b>
<b>  type Group {</b>
<b>    id: Int! # unique id for the group</b>
<b>    name: String # name of the group</b>
<b>    users: [User]! # users in the group</b>
<b>    messages: [Message] # messages sent to the group</b>
<b>  }</b>
<b></b>
<b>  # a user -- keep type really simple for now</b>
<b>  type User {</b>
<b>    id: Int! # unique id for the user</b>
<b>    email: String! # we will also require a unique email per user</b>
<b>    username: String # this is the name we&#x27;ll show other users</b>
<b>    messages: [Message] # messages sent by user</b>
<b>    groups: [Group] # groups the user belongs to</b>
<b>    friends: [User] # user&#x27;s friends/contacts</b>
<b>  }</b>
<b></b>
<b>  # a message sent from a user to a group</b>
<b>  type Message {</b>
<b>    id: Int! # unique id for message</b>
<b>    to: Group! # group message was sent in</b>
<b>    from: User! # user who sent the message</b>
<b>    text: String! # message text</b>
<b>    createdAt: Date! # when message was created</b>
  }
<b>&#x60;];</b>

export default Schema;
</pre>

[}]: #

The GraphQL language for Schemas is pretty straightforward. Keys within a given type have values that are either [scalars](http://graphql.org/learn/schema/#scalar-types), like a `String`, or another type like `Group`.

Field values can also be lists of types or scalars, like `messages` in `Group`.

Any field with an exclamation mark is a **required field!**

Some notes on the above code:
* We need to declare the custom `Date` scalar as it’s not a default scalar in GraphQL. You can [learn more about scalar types here](http://graphql.org/learn/schema/#scalar-types).
* In our model, all types have an id property of scalar type `Int!`. This will represent their unique id in our database.
* `User` type will require a unique email address. We will get into more complex user features such as authentication in a later tutorial.
* `User` type **does not include a password field.** Our client should *NEVER* need to query for a password, so we shouldn’t expose this field even if it is required on the server. This helps prevent passwords from falling into the wrong hands!
* Message gets sent “from” a `User` “to” a `Group`.

# Designing GraphQL Queries
[GraphQL Queries](http://graphql.org/learn/schema/#the-query-and-mutation-types) specify how clients are allowed to query and retrieve defined types. For example, we can make a GraphQL Query that lets our client ask for a `User` by providing either the `User`’s unique id or email address:

```
type Query {
  # Return a user by their email or id
  user(email: String, id: Int): User
}
```

We could also specify that an argument is required by including an exclamation mark:

```
type Query {
  # Return a group by its id -- must supply an id to query
  group(id: Int!): Group
}
```

We can even return an array of results with a query, and mix and match all of the above. For example, we could define a `message` query that will return all the messages sent by a user if a `userId` is provided, or all the messages sent to a group if a `groupId` is provided:

```
type Query {
  # Return messages sent by a user via userId
  # ... or ...
  # Return messages sent to a group via groupId
  messages(groupId: Int, userId: Int): [Message]
}
```

There are even more cool features available with advanced querying in GraphQL. However, these queries should serve us just fine for now:

[{]: <helper> (diffStep 2.2)

#### Step 2.2: Add Queries to Schema

##### Changed server&#x2F;data&#x2F;schema.js
<pre>

...

    text: String! # message text
    createdAt: Date! # when message was created
  }
<b></b>
<b>  # query for types</b>
<b>  type Query {</b>
<b>    # Return a user by their email or id</b>
<b>    user(email: String, id: Int): User</b>
<b></b>
<b>    # Return messages sent by a user via userId</b>
<b>    # Return messages sent to a group via groupId</b>
<b>    messages(groupId: Int, userId: Int): [Message]</b>
<b></b>
<b>    # Return a group by its id</b>
<b>    group(id: Int!): Group</b>
<b>  }</b>
<b></b>
<b>  schema {</b>
<b>    query: Query</b>
<b>  }</b>
&#x60;];

export default Schema;
</pre>

[}]: #

Note that we also need to define the `schema` at the end of our Schema string.

# Connecting Mocked Data

We have defined our Schema including queries, but it’s not connected to any sort of data. If we ran the current code as is, it would definitely fail.

While we could start creating real data right away, it’s good practice to mock data first. Mocking will enable us to catch any obvious errors with our Schema before we start trying to connect real data, and it will also help us down the line with testing.
Let’s modify our `server/data/mocks.js` code using `faker` (`yarn add faker`) to produce some fake data:

[{]: <helper> (diffStep 2.3 files="server/data/mocks.js")

#### Step 2.3: Update Mocks

##### Changed server&#x2F;data&#x2F;mocks.js
<pre>

...

<b>import faker from &#x27;faker&#x27;;</b>
<b></b>
export const Mocks &#x3D; {
<b>  Date: () &#x3D;&gt; new Date(),</b>
<b>  Int: () &#x3D;&gt; parseInt(Math.random() * 100, 10),</b>
  String: () &#x3D;&gt; &#x27;It works!&#x27;,
<b>  Query: () &#x3D;&gt; ({</b>
<b>    user: (root, args) &#x3D;&gt; ({</b>
<b>      email: args.email,</b>
<b>      messages: [{</b>
<b>        from: {</b>
<b>          email: args.email,</b>
<b>        },</b>
<b>      }],</b>
<b>    }),</b>
<b>  }),</b>
<b>  User: () &#x3D;&gt; ({</b>
<b>    email: faker.internet.email(),</b>
<b>    username: faker.internet.userName(),</b>
<b>  }),</b>
<b>  Group: () &#x3D;&gt; ({</b>
<b>    name: faker.lorem.words(Math.random() * 3),</b>
<b>  }),</b>
<b>  Message: () &#x3D;&gt; ({</b>
<b>    text: faker.lorem.sentences(Math.random() * 3),</b>
<b>  }),</b>
};

export default Mocks;
</pre>

[}]: #

While the mocks for `User`, `Group`, and `Message` are pretty simple looking, they’re actually quite powerful. If we run a query in GraphIQL, we'll receive fully populated results with backfilled properties, including example list results. Also, by adding details to our mocks for the `user` query, we ensure that the `email` field for the `User` and `from` field for their `messages` match the query parameter for `email`: ![GraphIQL Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step2-3.png)

# Connecting Real Data
Let’s connect our Schema to some real data now. We’re going to start small with a [SQLite](https://www.sqlite.org/) database and use the [`sequelize`](http://docs.sequelizejs.com/en/v3/) ORM to interact with our data.

```
yarn add sqlite3 sequelize
yarn add lodash # top notch utility library for handling data
yarn add graphql-date # graphql custom date scalar
```

First we will create tables to represent our models. Next, we’ll need to expose functions to connect our models to our Schema. These exposed functions are known as [**Connectors**](https://github.com/apollographql/graphql-tools/blob/master/designs/connectors.md). We’ll write this code in a new file `server/data/connectors.js`:

[{]: <helper> (diffStep 2.4 files="server/data/connectors.js")

#### Step 2.4: Create Connectors

##### Added server&#x2F;data&#x2F;connectors.js
<pre>

...

<b>import Sequelize from &#x27;sequelize&#x27;;</b>
<b></b>
<b>// initialize our database</b>
<b>const db &#x3D; new Sequelize(&#x27;chatty&#x27;, null, null, {</b>
<b>  dialect: &#x27;sqlite&#x27;,</b>
<b>  storage: &#x27;./chatty.sqlite&#x27;,</b>
<b>  logging: false, // mark this true if you want to see logs</b>
<b>});</b>
<b></b>
<b>// define groups</b>
<b>const GroupModel &#x3D; db.define(&#x27;group&#x27;, {</b>
<b>  name: { type: Sequelize.STRING },</b>
<b>});</b>
<b></b>
<b>// define messages</b>
<b>const MessageModel &#x3D; db.define(&#x27;message&#x27;, {</b>
<b>  text: { type: Sequelize.STRING },</b>
<b>});</b>
<b></b>
<b>// define users</b>
<b>const UserModel &#x3D; db.define(&#x27;user&#x27;, {</b>
<b>  email: { type: Sequelize.STRING },</b>
<b>  username: { type: Sequelize.STRING },</b>
<b>  password: { type: Sequelize.STRING },</b>
<b>});</b>
<b></b>
<b>// users belong to multiple groups</b>
<b>UserModel.belongsToMany(GroupModel, { through: &#x27;GroupUser&#x27; });</b>
<b></b>
<b>// users belong to multiple users as friends</b>
<b>UserModel.belongsToMany(UserModel, { through: &#x27;Friends&#x27;, as: &#x27;friends&#x27; });</b>
<b></b>
<b>// messages are sent from users</b>
<b>MessageModel.belongsTo(UserModel);</b>
<b></b>
<b>// messages are sent to groups</b>
<b>MessageModel.belongsTo(GroupModel);</b>
<b></b>
<b>// groups have multiple users</b>
<b>GroupModel.belongsToMany(UserModel, { through: &#x27;GroupUser&#x27; });</b>
<b></b>
<b>const Group &#x3D; db.models.group;</b>
<b>const Message &#x3D; db.models.message;</b>
<b>const User &#x3D; db.models.user;</b>
<b></b>
<b>export { Group, Message, User };</b>
</pre>

[}]: #

Let’s also add some seed data so we can test our setup right away. The code below will add 4 Groups, with 5 unique users per group, and 5 messages per user within that group:

[{]: <helper> (diffStep 2.5)

#### Step 2.5: Create fake users

##### Changed server&#x2F;data&#x2F;connectors.js
<pre>

...

<b>import { _ } from &#x27;lodash&#x27;;</b>
<b>import faker from &#x27;faker&#x27;;</b>
import Sequelize from &#x27;sequelize&#x27;;

// initialize our database
</pre>
<pre>

...

// groups have multiple users
GroupModel.belongsToMany(UserModel, { through: &#x27;GroupUser&#x27; });

<b>// create fake starter data</b>
<b>const GROUPS &#x3D; 4;</b>
<b>const USERS_PER_GROUP &#x3D; 5;</b>
<b>const MESSAGES_PER_USER &#x3D; 5;</b>
<b>faker.seed(123); // get consistent data every time we reload app</b>
<b></b>
<b>// you don&#x27;t need to stare at this code too hard</b>
<b>// just trust that it fakes a bunch of groups, users, and messages</b>
<b>db.sync({ force: true }).then(() &#x3D;&gt; _.times(GROUPS, () &#x3D;&gt; GroupModel.create({</b>
<b>  name: faker.lorem.words(3),</b>
<b>}).then(group &#x3D;&gt; _.times(USERS_PER_GROUP, () &#x3D;&gt; {</b>
<b>  const password &#x3D; faker.internet.password();</b>
<b>  return group.createUser({</b>
<b>    email: faker.internet.email(),</b>
<b>    username: faker.internet.userName(),</b>
<b>    password,</b>
<b>  }).then((user) &#x3D;&gt; {</b>
<b>    console.log(</b>
<b>      &#x27;{email, username, password}&#x27;,</b>
<b>      &#x60;{${user.email}, ${user.username}, ${password}}&#x60;</b>
<b>    );</b>
<b>    _.times(MESSAGES_PER_USER, () &#x3D;&gt; MessageModel.create({</b>
<b>      userId: user.id,</b>
<b>      groupId: group.id,</b>
<b>      text: faker.lorem.sentences(3),</b>
<b>    }));</b>
<b>    return user;</b>
<b>  });</b>
<b>})).then((userPromises) &#x3D;&gt; {</b>
<b>  // make users friends with all users in the group</b>
<b>  Promise.all(userPromises).then((users) &#x3D;&gt; {</b>
<b>    _.each(users, (current, i) &#x3D;&gt; {</b>
<b>      _.each(users, (user, j) &#x3D;&gt; {</b>
<b>        if (i !&#x3D;&#x3D; j) {</b>
<b>          current.addFriend(user);</b>
<b>        }</b>
<b>      });</b>
<b>    });</b>
<b>  });</b>
<b>})));</b>
<b></b>
const Group &#x3D; db.models.group;
const Message &#x3D; db.models.message;
const User &#x3D; db.models.user;
</pre>

[}]: #

For the final step, we need to connect our Schema to our Connectors so our server resolves the right data based on the request. We accomplish this last step with the help of [**Resolvers**](http://dev.apollodata.com/tools/graphql-tools/resolvers.html).

In `graphqlExpress`, we write Resolvers as a map that resolves each GraphQL Type defined in our Schema. For example, if we were just resolving `User`, our resolver code would look like this:

```
// server/data/resolvers.js
import { User, Message } from './connectors';
export const Resolvers = {
  Query: {
    user(_, {id, email}) {
      return User.findOne({ where: {id, email}});
    },
  },
  User: {
    messages(user) {
      return Message.findAll({
        where: { userId: user.id },
      });
    },
    groups(user) {
      return user.getGroups();
    },
    friends(user) {
      return user.getFriends();
    },
  },
};
export default Resolvers;
```

When the `user` query is executed, it will return the `User` in our SQL database that matches the query. But what’s *really cool* is that all fields associated with the `User` will also get resolved when they're requested, and those fields can recursively resolve using the same resolvers. For example, if we requested a `User`, her friends, and her friend’s friends, the query would run the `friends` resolver on the `User`, and then run `friends` again on each `User` returned by the first call:

```
user(id: 1) {
  username # the user we queried
  friends { # a list of their friends
    username
    friends { # a list of each friend's friends
      username
    }
  }
}
```

This is extremely cool and powerful code because it allows us to write resolvers for each type just once, and have it work anywhere and everywhere!

So let’s put together resolvers for our full Schema in `server/data/resolvers.js`:

[{]: <helper> (diffStep 2.6 files="server/data/resolvers.js")

#### Step 2.6: Create Resolvers

##### Added server&#x2F;data&#x2F;resolvers.js
<pre>

...

<b>import GraphQLDate from &#x27;graphql-date&#x27;;</b>
<b></b>
<b>import { Group, Message, User } from &#x27;./connectors&#x27;;</b>
<b></b>
<b>export const Resolvers &#x3D; {</b>
<b>  Date: GraphQLDate,</b>
<b>  Query: {</b>
<b>    group(_, args) {</b>
<b>      return Group.find({ where: args });</b>
<b>    },</b>
<b>    messages(_, args) {</b>
<b>      return Message.findAll({</b>
<b>        where: args,</b>
<b>        order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],</b>
<b>      });</b>
<b>    },</b>
<b>    user(_, args) {</b>
<b>      return User.findOne({ where: args });</b>
<b>    },</b>
<b>  },</b>
<b>  Group: {</b>
<b>    users(group) {</b>
<b>      return group.getUsers();</b>
<b>    },</b>
<b>    messages(group) {</b>
<b>      return Message.findAll({</b>
<b>        where: { groupId: group.id },</b>
<b>        order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],</b>
<b>      });</b>
<b>    },</b>
<b>  },</b>
<b>  Message: {</b>
<b>    to(message) {</b>
<b>      return message.getGroup();</b>
<b>    },</b>
<b>    from(message) {</b>
<b>      return message.getUser();</b>
<b>    },</b>
<b>  },</b>
<b>  User: {</b>
<b>    messages(user) {</b>
<b>      return Message.findAll({</b>
<b>        where: { userId: user.id },</b>
<b>        order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],</b>
<b>      });</b>
<b>    },</b>
<b>    groups(user) {</b>
<b>      return user.getGroups();</b>
<b>    },</b>
<b>    friends(user) {</b>
<b>      return user.getFriends();</b>
<b>    },</b>
<b>  },</b>
<b>};</b>
<b></b>
<b>export default Resolvers;</b>
</pre>

[}]: #

Our resolvers are relatively straightforward. We’ve set our message resolvers to return in descending order by date created, so the most recent messages will return first.

Notice we’ve also included a resolver for `Date` because it is a custom scalar. Instead of creating our own resolver, I’ve imported someone’s excellent [`GraphQLDate`](https://www.npmjs.com/package/graphql-date) package.

Finally, we can pass our resolvers to `makeExecutableSchema` in `server/index.js` to replace our mocked data with real data:

[{]: <helper> (diffStep 2.7 files="server/index.js")

#### Step 2.7: Connect Resolvers to GraphQL Server

##### Changed server&#x2F;index.js
<pre>

...

import bodyParser from &#x27;body-parser&#x27;;
import { createServer } from &#x27;http&#x27;;

<b>import { Resolvers } from &#x27;./data/resolvers&#x27;;</b>
import { Schema } from &#x27;./data/schema&#x27;;
import { Mocks } from &#x27;./data/mocks&#x27;;

</pre>
<pre>

...


const executableSchema &#x3D; makeExecutableSchema({
  typeDefs: Schema,
<b>  resolvers: Resolvers,</b>
});

<b>// we can comment out this code for mocking data</b>
<b>// we&#x27;re using REAL DATA now!</b>
<b>// addMockFunctionsToSchema({</b>
<b>//   schema: executableSchema,</b>
<b>//   mocks: Mocks,</b>
<b>//   preserveResolvers: true,</b>
<b>// });</b>

// &#x60;context&#x60; must be an object and can&#x27;t be undefined when using connectors
app.use(&#x27;/graphql&#x27;, bodyParser.json(), graphqlExpress({
</pre>

[}]: #

Now if we run a Query on GraphiQL, we should get some real results straight from our database: ![GraphIQL Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step2-7.png)

We’ve got the data. We’ve designed the Schema with Queries. Now it’s time to put that data in our React Native app!
[{]: <helper> (navStep)

| [< Previous Step](step1.md) | [Next Step >](step3.md) |
|:--------------------------------|--------------------------------:|

[}]: #

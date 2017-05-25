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
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊export const Schema &#x3D; [&#x60;</b>
<b>+┊  ┊ 2┊  # declare custom scalars</b>
<b>+┊  ┊ 3┊  scalar Date</b>
<b>+┊  ┊ 4┊</b>
<b>+┊  ┊ 5┊  # a group chat entity</b>
<b>+┊  ┊ 6┊  type Group {</b>
<b>+┊  ┊ 7┊    id: Int! # unique id for the group</b>
<b>+┊  ┊ 8┊    name: String # name of the group</b>
<b>+┊  ┊ 9┊    users: [User]! # users in the group</b>
<b>+┊  ┊10┊    messages: [Message] # messages sent to the group</b>
<b>+┊  ┊11┊  }</b>
<b>+┊  ┊12┊</b>
<b>+┊  ┊13┊  # a user -- keep type really simple for now</b>
<b>+┊  ┊14┊  type User {</b>
<b>+┊  ┊15┊    id: Int! # unique id for the user</b>
<b>+┊  ┊16┊    email: String! # we will also require a unique email per user</b>
<b>+┊  ┊17┊    username: String # this is the name we&#x27;ll show other users</b>
<b>+┊  ┊18┊    messages: [Message] # messages sent by user</b>
<b>+┊  ┊19┊    groups: [Group] # groups the user belongs to</b>
<b>+┊  ┊20┊    friends: [User] # user&#x27;s friends/contacts</b>
<b>+┊  ┊21┊  }</b>
<b>+┊  ┊22┊</b>
<b>+┊  ┊23┊  # a message sent from a user to a group</b>
<b>+┊  ┊24┊  type Message {</b>
<b>+┊  ┊25┊    id: Int! # unique id for message</b>
<b>+┊  ┊26┊    to: Group! # group message was sent in</b>
<b>+┊  ┊27┊    from: User! # user who sent the message</b>
<b>+┊  ┊28┊    text: String! # message text</b>
<b>+┊  ┊29┊    createdAt: Date! # when message was created</b>
 ┊ 4┊30┊  }
<b>+┊  ┊31┊&#x60;];</b>
 ┊ 9┊32┊
 ┊10┊33┊export default Schema;
</pre>

[}]: #

The GraphQL language for Schemas is pretty straightforward. Keys within a given type have values that are either [scalars](http://graphql.org/learn/schema/#scalar-types), like a `String`, or another type like `Group`.

Field values can also be lists of types or scalars, like `messages` in `Group`.

Any field with an exclamation mark is a **required field!**

Some notes on the above code:
* We need to declare the custom `Date` scalar as it’s not a default scalar in GraphQL. You can [learn more about scalar types here](http://graphql.org/learn/schema/#scalar-types).
* In our model, all types have an id property of scalar type `Int!`. This will represent their unique id in our database.
* User type will require a unique email address. We will get into more complex user features such as authentication in a later tutorial.
* `User` type **does not include a password field.** Our client should *NEVER* need to query for a password, so we shouldn’t expose this field even if it is required on the server. This helps prevent passwords from falling into the wrong hands!
* Message gets sent “from” a `User` “to” a `Group`.

# Designing GraphQL Queries
[GraphQL Queries](http://graphql.org/learn/schema/#the-query-and-mutation-types) specify how clients are allowed to query and retrieve defined types. For example, we can make a GraphQL Query that lets our client ask for a User by providing either the user’s unique id or email address:

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

We can also return an array of results with a Query, and mix and match all of the above. For example, we could define a `message` Query that will return all the messages sent by a user if a `userId` is provided, or all the messages sent to a group if a `groupId` is provided:

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
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊28┊28┊    text: String! # message text
 ┊29┊29┊    createdAt: Date! # when message was created
 ┊30┊30┊  }
<b>+┊  ┊31┊</b>
<b>+┊  ┊32┊  # query for types</b>
<b>+┊  ┊33┊  type Query {</b>
<b>+┊  ┊34┊    # Return a user by their email or id</b>
<b>+┊  ┊35┊    user(email: String, id: Int): User</b>
<b>+┊  ┊36┊</b>
<b>+┊  ┊37┊    # Return messages sent by a user via userId</b>
<b>+┊  ┊38┊    # Return messages sent to a group via groupId</b>
<b>+┊  ┊39┊    messages(groupId: Int, userId: Int): [Message]</b>
<b>+┊  ┊40┊</b>
<b>+┊  ┊41┊    # Return a group by its id</b>
<b>+┊  ┊42┊    group(id: Int!): Group</b>
<b>+┊  ┊43┊  }</b>
<b>+┊  ┊44┊</b>
<b>+┊  ┊45┊  schema {</b>
<b>+┊  ┊46┊    query: Query</b>
<b>+┊  ┊47┊  }</b>
 ┊31┊48┊&#x60;];
 ┊32┊49┊
 ┊33┊50┊export default Schema;
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
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import faker from &#x27;faker&#x27;;</b>
<b>+┊  ┊ 2┊</b>
 ┊ 1┊ 3┊export const Mocks &#x3D; {
<b>+┊  ┊ 4┊  Date: () &#x3D;&gt; new Date(),</b>
<b>+┊  ┊ 5┊  Int: () &#x3D;&gt; Math.random() * 100,</b>
 ┊ 2┊ 6┊  String: () &#x3D;&gt; &#x27;It works!&#x27;,
<b>+┊  ┊ 7┊  Query: () &#x3D;&gt; ({</b>
<b>+┊  ┊ 8┊    user: (root, args) &#x3D;&gt; ({</b>
<b>+┊  ┊ 9┊      email: args.email,</b>
<b>+┊  ┊10┊      messages: [{</b>
<b>+┊  ┊11┊        from: {</b>
<b>+┊  ┊12┊          email: args.email,</b>
<b>+┊  ┊13┊        },</b>
<b>+┊  ┊14┊      }],</b>
<b>+┊  ┊15┊    }),</b>
<b>+┊  ┊16┊  }),</b>
<b>+┊  ┊17┊  User: () &#x3D;&gt; ({</b>
<b>+┊  ┊18┊    email: faker.internet.email(),</b>
<b>+┊  ┊19┊    username: faker.internet.userName(),</b>
<b>+┊  ┊20┊  }),</b>
<b>+┊  ┊21┊  Group: () &#x3D;&gt; ({</b>
<b>+┊  ┊22┊    name: faker.lorem.words(Math.random() * 3),</b>
<b>+┊  ┊23┊  }),</b>
<b>+┊  ┊24┊  Message: () &#x3D;&gt; ({</b>
<b>+┊  ┊25┊    text: faker.lorem.sentences(Math.random() * 3),</b>
<b>+┊  ┊26┊  }),</b>
 ┊ 3┊27┊};
 ┊ 4┊28┊
 ┊ 5┊29┊export default Mocks;
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
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import Sequelize from &#x27;sequelize&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊// initialize our database</b>
<b>+┊  ┊ 4┊const db &#x3D; new Sequelize(&#x27;chatty&#x27;, null, null, {</b>
<b>+┊  ┊ 5┊  dialect: &#x27;sqlite&#x27;,</b>
<b>+┊  ┊ 6┊  storage: &#x27;./chatty.sqlite&#x27;,</b>
<b>+┊  ┊ 7┊  logging: false, // mark this true if you want to see logs</b>
<b>+┊  ┊ 8┊});</b>
<b>+┊  ┊ 9┊</b>
<b>+┊  ┊10┊// define groups</b>
<b>+┊  ┊11┊const GroupModel &#x3D; db.define(&#x27;group&#x27;, {</b>
<b>+┊  ┊12┊  name: { type: Sequelize.STRING },</b>
<b>+┊  ┊13┊});</b>
<b>+┊  ┊14┊</b>
<b>+┊  ┊15┊// define messages</b>
<b>+┊  ┊16┊const MessageModel &#x3D; db.define(&#x27;message&#x27;, {</b>
<b>+┊  ┊17┊  text: { type: Sequelize.STRING },</b>
<b>+┊  ┊18┊});</b>
<b>+┊  ┊19┊</b>
<b>+┊  ┊20┊// define users</b>
<b>+┊  ┊21┊const UserModel &#x3D; db.define(&#x27;user&#x27;, {</b>
<b>+┊  ┊22┊  email: { type: Sequelize.STRING },</b>
<b>+┊  ┊23┊  username: { type: Sequelize.STRING },</b>
<b>+┊  ┊24┊  password: { type: Sequelize.STRING },</b>
<b>+┊  ┊25┊});</b>
<b>+┊  ┊26┊</b>
<b>+┊  ┊27┊// users belong to multiple groups</b>
<b>+┊  ┊28┊UserModel.belongsToMany(GroupModel, { through: &#x27;GroupUser&#x27; });</b>
<b>+┊  ┊29┊</b>
<b>+┊  ┊30┊// users belong to multiple users as friends</b>
<b>+┊  ┊31┊UserModel.belongsToMany(UserModel, { through: &#x27;Friends&#x27;, as: &#x27;friends&#x27; });</b>
<b>+┊  ┊32┊</b>
<b>+┊  ┊33┊// messages are sent from users</b>
<b>+┊  ┊34┊MessageModel.belongsTo(UserModel);</b>
<b>+┊  ┊35┊</b>
<b>+┊  ┊36┊// messages are sent to groups</b>
<b>+┊  ┊37┊MessageModel.belongsTo(GroupModel);</b>
<b>+┊  ┊38┊</b>
<b>+┊  ┊39┊// groups have multiple users</b>
<b>+┊  ┊40┊GroupModel.belongsToMany(UserModel, { through: &#x27;GroupUser&#x27; });</b>
<b>+┊  ┊41┊</b>
<b>+┊  ┊42┊const Group &#x3D; db.models.group;</b>
<b>+┊  ┊43┊const Message &#x3D; db.models.message;</b>
<b>+┊  ┊44┊const User &#x3D; db.models.user;</b>
<b>+┊  ┊45┊</b>
<b>+┊  ┊46┊export { Group, Message, User };</b>
</pre>

[}]: #

Let’s also add some seed data so we can test our setup right away. The code below will add 4 Groups, with 5 unique users per group, and 5 messages per user within that group:

[{]: <helper> (diffStep 2.5)

#### Step 2.5: Create fake users

##### Changed server&#x2F;data&#x2F;connectors.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊import { _ } from &#x27;lodash&#x27;;</b>
<b>+┊ ┊2┊import faker from &#x27;faker&#x27;;</b>
 ┊1┊3┊import Sequelize from &#x27;sequelize&#x27;;
 ┊2┊4┊
 ┊3┊5┊// initialize our database
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊39┊41┊// groups have multiple users
 ┊40┊42┊GroupModel.belongsToMany(UserModel, { through: &#x27;GroupUser&#x27; });
 ┊41┊43┊
<b>+┊  ┊44┊// create fake starter data</b>
<b>+┊  ┊45┊const GROUPS &#x3D; 4;</b>
<b>+┊  ┊46┊const USERS_PER_GROUP &#x3D; 5;</b>
<b>+┊  ┊47┊const MESSAGES_PER_USER &#x3D; 5;</b>
<b>+┊  ┊48┊faker.seed(123); // get consistent data every time we reload app</b>
<b>+┊  ┊49┊</b>
<b>+┊  ┊50┊// you don&#x27;t need to stare at this code too hard</b>
<b>+┊  ┊51┊// just trust that it fakes a bunch of groups, users, and messages</b>
<b>+┊  ┊52┊db.sync({ force: true }).then(() &#x3D;&gt; _.times(GROUPS, () &#x3D;&gt; GroupModel.create({</b>
<b>+┊  ┊53┊  name: faker.lorem.words(3),</b>
<b>+┊  ┊54┊}).then(group &#x3D;&gt; _.times(USERS_PER_GROUP, () &#x3D;&gt; {</b>
<b>+┊  ┊55┊  const password &#x3D; faker.internet.password();</b>
<b>+┊  ┊56┊  return group.createUser({</b>
<b>+┊  ┊57┊    email: faker.internet.email(),</b>
<b>+┊  ┊58┊    username: faker.internet.userName(),</b>
<b>+┊  ┊59┊    password,</b>
<b>+┊  ┊60┊  }).then((user) &#x3D;&gt; {</b>
<b>+┊  ┊61┊    console.log(</b>
<b>+┊  ┊62┊      &#x27;{email, username, password}&#x27;,</b>
<b>+┊  ┊63┊      &#x60;{${user.email}, ${user.username}, ${password}}&#x60;</b>
<b>+┊  ┊64┊    );</b>
<b>+┊  ┊65┊    _.times(MESSAGES_PER_USER, () &#x3D;&gt; MessageModel.create({</b>
<b>+┊  ┊66┊      userId: user.id,</b>
<b>+┊  ┊67┊      groupId: group.id,</b>
<b>+┊  ┊68┊      text: faker.lorem.sentences(3),</b>
<b>+┊  ┊69┊    }));</b>
<b>+┊  ┊70┊    return user;</b>
<b>+┊  ┊71┊  });</b>
<b>+┊  ┊72┊})).then((userPromises) &#x3D;&gt; {</b>
<b>+┊  ┊73┊  // make users friends with all users in the group</b>
<b>+┊  ┊74┊  Promise.all(userPromises).then((users) &#x3D;&gt; {</b>
<b>+┊  ┊75┊    _.each(users, (current, i) &#x3D;&gt; {</b>
<b>+┊  ┊76┊      _.each(users, (user, j) &#x3D;&gt; {</b>
<b>+┊  ┊77┊        if (i !&#x3D;&#x3D; j) {</b>
<b>+┊  ┊78┊          current.addFriend(user);</b>
<b>+┊  ┊79┊        }</b>
<b>+┊  ┊80┊      });</b>
<b>+┊  ┊81┊    });</b>
<b>+┊  ┊82┊  });</b>
<b>+┊  ┊83┊})));</b>
<b>+┊  ┊84┊</b>
 ┊42┊85┊const Group &#x3D; db.models.group;
 ┊43┊86┊const Message &#x3D; db.models.message;
 ┊44┊87┊const User &#x3D; db.models.user;
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
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import GraphQLDate from &#x27;graphql-date&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊import { Group, Message, User } from &#x27;./connectors&#x27;;</b>
<b>+┊  ┊ 4┊</b>
<b>+┊  ┊ 5┊export const Resolvers &#x3D; {</b>
<b>+┊  ┊ 6┊  Date: GraphQLDate,</b>
<b>+┊  ┊ 7┊  Query: {</b>
<b>+┊  ┊ 8┊    group(_, args) {</b>
<b>+┊  ┊ 9┊      return Group.find({ where: args });</b>
<b>+┊  ┊10┊    },</b>
<b>+┊  ┊11┊    messages(_, args) {</b>
<b>+┊  ┊12┊      return Message.findAll({</b>
<b>+┊  ┊13┊        where: args,</b>
<b>+┊  ┊14┊        order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],</b>
<b>+┊  ┊15┊      });</b>
<b>+┊  ┊16┊    },</b>
<b>+┊  ┊17┊    user(_, args) {</b>
<b>+┊  ┊18┊      return User.findOne({ where: args });</b>
<b>+┊  ┊19┊    },</b>
<b>+┊  ┊20┊  },</b>
<b>+┊  ┊21┊  Group: {</b>
<b>+┊  ┊22┊    users(group) {</b>
<b>+┊  ┊23┊      return group.getUsers();</b>
<b>+┊  ┊24┊    },</b>
<b>+┊  ┊25┊    messages(group) {</b>
<b>+┊  ┊26┊      return Message.findAll({</b>
<b>+┊  ┊27┊        where: { groupId: group.id },</b>
<b>+┊  ┊28┊        order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],</b>
<b>+┊  ┊29┊      });</b>
<b>+┊  ┊30┊    },</b>
<b>+┊  ┊31┊  },</b>
<b>+┊  ┊32┊  Message: {</b>
<b>+┊  ┊33┊    to(message) {</b>
<b>+┊  ┊34┊      return message.getGroup();</b>
<b>+┊  ┊35┊    },</b>
<b>+┊  ┊36┊    from(message) {</b>
<b>+┊  ┊37┊      return message.getUser();</b>
<b>+┊  ┊38┊    },</b>
<b>+┊  ┊39┊  },</b>
<b>+┊  ┊40┊  User: {</b>
<b>+┊  ┊41┊    messages(user) {</b>
<b>+┊  ┊42┊      return Message.findAll({</b>
<b>+┊  ┊43┊        where: { userId: user.id },</b>
<b>+┊  ┊44┊        order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],</b>
<b>+┊  ┊45┊      });</b>
<b>+┊  ┊46┊    },</b>
<b>+┊  ┊47┊    groups(user) {</b>
<b>+┊  ┊48┊      return user.getGroups();</b>
<b>+┊  ┊49┊    },</b>
<b>+┊  ┊50┊    friends(user) {</b>
<b>+┊  ┊51┊      return user.getFriends();</b>
<b>+┊  ┊52┊    },</b>
<b>+┊  ┊53┊  },</b>
<b>+┊  ┊54┊};</b>
<b>+┊  ┊55┊</b>
<b>+┊  ┊56┊export default Resolvers;</b>
</pre>

[}]: #

Our resolvers are relatively straightforward. We’ve set our message resolvers to return in descending order by date created, so the most recent messages will return first.

Notice we’ve also included a resolver for `Date` because it is a custom scalar. Instead of creating our own resolver, I’ve imported someone’s excellent [`GraphQLDate`](https://www.npmjs.com/package/graphql-date) package.

Finally, we can pass our resolvers to `makeExecutableSchema` in `server/index.js` to replace our mocked data with real data:

[{]: <helper> (diffStep 2.7 files="server/index.js")

#### Step 2.7: Connect Resolvers to GraphQL Server

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 4┊ 4┊import bodyParser from &#x27;body-parser&#x27;;
 ┊ 5┊ 5┊import { createServer } from &#x27;http&#x27;;
 ┊ 6┊ 6┊
<b>+┊  ┊ 7┊import { Resolvers } from &#x27;./data/resolvers&#x27;;</b>
 ┊ 7┊ 8┊import { Schema } from &#x27;./data/schema&#x27;;
 ┊ 8┊ 9┊import { Mocks } from &#x27;./data/mocks&#x27;;
 ┊ 9┊10┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊12┊13┊
 ┊13┊14┊const executableSchema &#x3D; makeExecutableSchema({
 ┊14┊15┊  typeDefs: Schema,
<b>+┊  ┊16┊  resolvers: Resolvers,</b>
 ┊15┊17┊});
 ┊16┊18┊
<b>+┊  ┊19┊// we can comment out this code for mocking data</b>
<b>+┊  ┊20┊// we&#x27;re using REAL DATA now!</b>
<b>+┊  ┊21┊// addMockFunctionsToSchema({</b>
<b>+┊  ┊22┊//   schema: executableSchema,</b>
<b>+┊  ┊23┊//   mocks: Mocks,</b>
<b>+┊  ┊24┊//   preserveResolvers: true,</b>
<b>+┊  ┊25┊// });</b>
 ┊22┊26┊
 ┊23┊27┊// &#x60;context&#x60; must be an object and can&#x27;t be undefined when using connectors
 ┊24┊28┊app.use(&#x27;/graphql&#x27;, bodyParser.json(), graphqlExpress({
</pre>

[}]: #

Now if we run a Query on GraphiQL, we should get some real results straight from our database: ![GraphIQL Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step2-7.png)

We’ve got the data. We’ve designed the Schema with Queries. Now it’s time to put that data in our React Native app!
[{]: <helper> (navStep)

⟸ <a href="step1.md">PREVIOUS STEP</a> <b>║</b> <a href="step3.md">NEXT STEP</a> ⟹

[}]: #

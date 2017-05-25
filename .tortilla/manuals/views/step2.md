# Step 2: GraphQL Queries with Express

[//]: # (head-end)


This is the second blog in a multipart series where we will be building Chatty, a WhatsApp clone, using React Native and Apollo. You can view the code for this part of the series here.

In this section, we will be designing [GraphQL Schemas](http://graphql.org/learn/schema/) and [Queries](http://graphql.org/learn/queries/) and connecting them to real data on our server.

Here are the steps we will accomplish in this tutorial:
1. Build **GraphQL Schemas** to model User, Group, and Message data types
2. Design **GraphQL Queries** for fetching data from our server
3. Create a basic SQL database with Users, Groups, and Messages
4. Connect our database to our [Apollo Server](https://www.apollographql.com/docs/apollo-server/) using **Connectors** and **Resolvers**
5. Test out our new Queries using [GraphQL Playground](https://github.com/prismagraphql/graphql-playground)

# Designing GraphQL Schemas
[GraphQL Type Schemas](http://graphql.org/learn/schema/) define the shape of the data our client can expect. Chatty is going to need data models to represent **Messages**, **Users**, and **Groups** at the very least, so we can start by defining those. We’ll update `server/data/schema.js` to include some basic Schemas for these types:

[{]: <helper> (diffStep 2.1)

#### [Step 2.1: Update Schema](https://github.com/srtucker22/chatty/commit/e428967)

##### Added server&#x2F;data&#x2F;schema.js
```diff
@@ -0,0 +1,35 @@
+┊  ┊ 1┊import { gql } from 'apollo-server';
+┊  ┊ 2┊
+┊  ┊ 3┊export const typeDefs = gql`
+┊  ┊ 4┊  # declare custom scalars
+┊  ┊ 5┊  scalar Date
+┊  ┊ 6┊
+┊  ┊ 7┊  # a group chat entity
+┊  ┊ 8┊  type Group {
+┊  ┊ 9┊    id: Int! # unique id for the group
+┊  ┊10┊    name: String # name of the group
+┊  ┊11┊    users: [User]! # users in the group
+┊  ┊12┊    messages: [Message] # messages sent to the group
+┊  ┊13┊  }
+┊  ┊14┊
+┊  ┊15┊  # a user -- keep type really simple for now
+┊  ┊16┊  type User {
+┊  ┊17┊    id: Int! # unique id for the user
+┊  ┊18┊    email: String! # we will also require a unique email per user
+┊  ┊19┊    username: String # this is the name we'll show other users
+┊  ┊20┊    messages: [Message] # messages sent by user
+┊  ┊21┊    groups: [Group] # groups the user belongs to
+┊  ┊22┊    friends: [User] # user's friends/contacts
+┊  ┊23┊  }
+┊  ┊24┊
+┊  ┊25┊  # a message sent from a user to a group
+┊  ┊26┊  type Message {
+┊  ┊27┊    id: Int! # unique id for message
+┊  ┊28┊    to: Group! # group message was sent in
+┊  ┊29┊    from: User! # user who sent the message
+┊  ┊30┊    text: String! # message text
+┊  ┊31┊    createdAt: Date! # when message was created
+┊  ┊32┊  }
+┊  ┊33┊`;
+┊  ┊34┊
+┊  ┊35┊export default typeDefs;
```

##### Changed server&#x2F;index.js
```diff
@@ -1,14 +1,8 @@
-┊ 1┊  ┊import { ApolloServer, gql } from 'apollo-server';
+┊  ┊ 1┊import { ApolloServer } from 'apollo-server';
+┊  ┊ 2┊import { typeDefs } from './data/schema';
 ┊ 2┊ 3┊
 ┊ 3┊ 4┊const PORT = 8080;
 ┊ 4┊ 5┊
-┊ 5┊  ┊// basic schema
-┊ 6┊  ┊const typeDefs = gql`
-┊ 7┊  ┊  type Query {
-┊ 8┊  ┊    testString: String
-┊ 9┊  ┊  }
-┊10┊  ┊`;
-┊11┊  ┊
 ┊12┊ 6┊const server = new ApolloServer({ typeDefs, mocks: true });
 ┊13┊ 7┊
 ┊14┊ 8┊server.listen({ port: PORT }).then(({ url }) => console.log(`🚀 Server ready at ${url}`));
```

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

```graphql
type Query {
  # Return a user by their email or id
  user(email: String, id: Int): User
}
```

We could also specify that an argument is required by including an exclamation mark:

```graphql
type Query {
  # Return a group by its id -- must supply an id to query
  group(id: Int!): Group
}
```

We can even return an array of results with a query, and mix and match all of the above. For example, we could define a `message` query that will return all the messages sent by a user if a `userId` is provided, or all the messages sent to a group if a `groupId` is provided:

```graphql
type Query {
  # Return messages sent by a user via userId
  # ... or ...
  # Return messages sent to a group via groupId
  messages(groupId: Int, userId: Int): [Message]
}
```

There are even more cool features available with advanced querying in GraphQL. However, these queries should serve us just fine for now:

[{]: <helper> (diffStep 2.2)

#### [Step 2.2: Add Queries to Schema](https://github.com/srtucker22/chatty/commit/0e00c50)

##### Changed server&#x2F;data&#x2F;schema.js
```diff
@@ -30,6 +30,23 @@
 ┊30┊30┊    text: String! # message text
 ┊31┊31┊    createdAt: Date! # when message was created
 ┊32┊32┊  }
+┊  ┊33┊
+┊  ┊34┊  # query for types
+┊  ┊35┊  type Query {
+┊  ┊36┊    # Return a user by their email or id
+┊  ┊37┊    user(email: String, id: Int): User
+┊  ┊38┊
+┊  ┊39┊    # Return messages sent by a user via userId
+┊  ┊40┊    # Return messages sent to a group via groupId
+┊  ┊41┊    messages(groupId: Int, userId: Int): [Message]
+┊  ┊42┊
+┊  ┊43┊    # Return a group by its id
+┊  ┊44┊    group(id: Int!): Group
+┊  ┊45┊  }
+┊  ┊46┊
+┊  ┊47┊  schema {
+┊  ┊48┊    query: Query
+┊  ┊49┊  }
 ┊33┊50┊`;
 ┊34┊51┊
 ┊35┊52┊export default typeDefs;
```

[}]: #

Note that we also need to define the `schema` at the end of our Schema string.

# Connecting Mocked Data

We have defined our Schema including queries, but it’s not connected to any sort of data.

While we could start creating real data right away, it’s good practice to mock data first. Mocking will enable us to catch any obvious errors with our Schema before we start trying to connect real data, and it will also help us down the line with testing. `ApolloServer` will already naively mock our data with the `mock: true` setting, but we can also pass in our own advanced mocks.

Let’s create `server/data/mocks.js` and code up some mocks with `faker` (`npm i faker`) to produce some fake data:

[{]: <helper> (diffStep 2.3)

#### [Step 2.3: Update Mocks](https://github.com/srtucker22/chatty/commit/8476478)

##### Changed package.json
```diff
@@ -24,6 +24,7 @@
 ┊24┊24┊  },
 ┊25┊25┊  "dependencies": {
 ┊26┊26┊    "apollo-server": "^2.0.0",
+┊  ┊27┊    "faker": "^4.1.0",
 ┊27┊28┊    "graphql": "^0.13.2"
 ┊28┊29┊  }
 ┊29┊30┊}
```

##### Added server&#x2F;data&#x2F;mocks.js
```diff
@@ -0,0 +1,29 @@
+┊  ┊ 1┊import faker from 'faker';
+┊  ┊ 2┊
+┊  ┊ 3┊export const mocks = {
+┊  ┊ 4┊  Date: () => new Date(),
+┊  ┊ 5┊  Int: () => parseInt(Math.random() * 100, 10),
+┊  ┊ 6┊  String: () => 'It works!',
+┊  ┊ 7┊  Query: () => ({
+┊  ┊ 8┊    user: (root, args) => ({
+┊  ┊ 9┊      email: args.email,
+┊  ┊10┊      messages: [{
+┊  ┊11┊        from: {
+┊  ┊12┊          email: args.email,
+┊  ┊13┊        },
+┊  ┊14┊      }],
+┊  ┊15┊    }),
+┊  ┊16┊  }),
+┊  ┊17┊  User: () => ({
+┊  ┊18┊    email: faker.internet.email(),
+┊  ┊19┊    username: faker.internet.userName(),
+┊  ┊20┊  }),
+┊  ┊21┊  Group: () => ({
+┊  ┊22┊    name: faker.lorem.words(Math.random() * 3),
+┊  ┊23┊  }),
+┊  ┊24┊  Message: () => ({
+┊  ┊25┊    text: faker.lorem.sentences(Math.random() * 3),
+┊  ┊26┊  }),
+┊  ┊27┊};
+┊  ┊28┊
+┊  ┊29┊export default mocks;
```

##### Changed server&#x2F;index.js
```diff
@@ -1,8 +1,9 @@
 ┊1┊1┊import { ApolloServer } from 'apollo-server';
 ┊2┊2┊import { typeDefs } from './data/schema';
+┊ ┊3┊import { mocks } from './data/mocks';
 ┊3┊4┊
 ┊4┊5┊const PORT = 8080;
 ┊5┊6┊
-┊6┊ ┊const server = new ApolloServer({ typeDefs, mocks: true });
+┊ ┊7┊const server = new ApolloServer({ typeDefs, mocks });
 ┊7┊8┊
 ┊8┊9┊server.listen({ port: PORT }).then(({ url }) => console.log(`🚀 Server ready at ${url}`));
```

[}]: #

While the mocks for `User`, `Group`, and `Message` are pretty simple looking, they’re actually quite powerful. If we run a query in GraphQL Playground, we'll receive fully populated results with backfilled properties, including example list results. Also, by adding details to our mocks for the `user` query, we ensure that the `email` field for the `User` and `from` field for their `messages` match the query parameter for `email`: ![Playground Image](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step2-3.png)

# Connecting Real Data
Let’s connect our Schema to some real data now. We’re going to start small with a [SQLite](https://www.sqlite.org/) database and use the [`sequelize`](http://docs.sequelizejs.com/en/v3/) ORM to interact with our data.

```sh
npm i sqlite3 sequelize
npm i lodash # top notch utility library for handling data
npm i graphql-date # graphql custom date scalar
```

First we will create tables to represent our models. Next, we’ll need to expose functions to connect our models to our Schema. These exposed functions are known as [**Connectors**](https://github.com/apollographql/graphql-tools/blob/master/designs/connectors.md). We’ll write this code in a new file `server/data/connectors.js`:

[{]: <helper> (diffStep 2.4)

#### [Step 2.4: Create Connectors](https://github.com/srtucker22/chatty/commit/6297fc7)

##### Changed package.json
```diff
@@ -25,6 +25,9 @@
 ┊25┊25┊  "dependencies": {
 ┊26┊26┊    "apollo-server": "^2.0.0",
 ┊27┊27┊    "faker": "^4.1.0",
-┊28┊  ┊    "graphql": "^0.13.2"
+┊  ┊28┊    "graphql": "^0.13.2",
+┊  ┊29┊    "lodash": "^4.17.4",
+┊  ┊30┊    "sequelize": "^4.4.2",
+┊  ┊31┊    "sqlite3": "^4.0.1"
 ┊29┊32┊  }
 ┊30┊33┊}
```

##### Added server&#x2F;data&#x2F;connectors.js
```diff
@@ -0,0 +1,46 @@
+┊  ┊ 1┊import Sequelize from 'sequelize';
+┊  ┊ 2┊
+┊  ┊ 3┊// initialize our database
+┊  ┊ 4┊const db = new Sequelize('chatty', null, null, {
+┊  ┊ 5┊  dialect: 'sqlite',
+┊  ┊ 6┊  storage: './chatty.sqlite',
+┊  ┊ 7┊  logging: false, // mark this true if you want to see logs
+┊  ┊ 8┊});
+┊  ┊ 9┊
+┊  ┊10┊// define groups
+┊  ┊11┊const GroupModel = db.define('group', {
+┊  ┊12┊  name: { type: Sequelize.STRING },
+┊  ┊13┊});
+┊  ┊14┊
+┊  ┊15┊// define messages
+┊  ┊16┊const MessageModel = db.define('message', {
+┊  ┊17┊  text: { type: Sequelize.STRING },
+┊  ┊18┊});
+┊  ┊19┊
+┊  ┊20┊// define users
+┊  ┊21┊const UserModel = db.define('user', {
+┊  ┊22┊  email: { type: Sequelize.STRING },
+┊  ┊23┊  username: { type: Sequelize.STRING },
+┊  ┊24┊  password: { type: Sequelize.STRING },
+┊  ┊25┊});
+┊  ┊26┊
+┊  ┊27┊// users belong to multiple groups
+┊  ┊28┊UserModel.belongsToMany(GroupModel, { through: 'GroupUser' });
+┊  ┊29┊
+┊  ┊30┊// users belong to multiple users as friends
+┊  ┊31┊UserModel.belongsToMany(UserModel, { through: 'Friends', as: 'friends' });
+┊  ┊32┊
+┊  ┊33┊// messages are sent from users
+┊  ┊34┊MessageModel.belongsTo(UserModel);
+┊  ┊35┊
+┊  ┊36┊// messages are sent to groups
+┊  ┊37┊MessageModel.belongsTo(GroupModel);
+┊  ┊38┊
+┊  ┊39┊// groups have multiple users
+┊  ┊40┊GroupModel.belongsToMany(UserModel, { through: 'GroupUser' });
+┊  ┊41┊
+┊  ┊42┊const Group = db.models.group;
+┊  ┊43┊const Message = db.models.message;
+┊  ┊44┊const User = db.models.user;
+┊  ┊45┊
+┊  ┊46┊export { Group, Message, User };
```

[}]: #

Let’s also add some seed data so we can test our setup right away. The code below will add 4 Groups, with 5 unique users per group, and 5 messages per user within that group:

[{]: <helper> (diffStep 2.5)

#### [Step 2.5: Create fake users](https://github.com/srtucker22/chatty/commit/c11bf8a)

##### Changed server&#x2F;data&#x2F;connectors.js
```diff
@@ -1,3 +1,5 @@
+┊ ┊1┊import { _ } from 'lodash';
+┊ ┊2┊import faker from 'faker';
 ┊1┊3┊import Sequelize from 'sequelize';
 ┊2┊4┊
 ┊3┊5┊// initialize our database
```
```diff
@@ -39,6 +41,47 @@
 ┊39┊41┊// groups have multiple users
 ┊40┊42┊GroupModel.belongsToMany(UserModel, { through: 'GroupUser' });
 ┊41┊43┊
+┊  ┊44┊// create fake starter data
+┊  ┊45┊const GROUPS = 4;
+┊  ┊46┊const USERS_PER_GROUP = 5;
+┊  ┊47┊const MESSAGES_PER_USER = 5;
+┊  ┊48┊faker.seed(123); // get consistent data every time we reload app
+┊  ┊49┊
+┊  ┊50┊// you don't need to stare at this code too hard
+┊  ┊51┊// just trust that it fakes a bunch of groups, users, and messages
+┊  ┊52┊db.sync({ force: true }).then(() => _.times(GROUPS, () => GroupModel.create({
+┊  ┊53┊  name: faker.lorem.words(3),
+┊  ┊54┊}).then(group => _.times(USERS_PER_GROUP, () => {
+┊  ┊55┊  const password = faker.internet.password();
+┊  ┊56┊  return group.createUser({
+┊  ┊57┊    email: faker.internet.email(),
+┊  ┊58┊    username: faker.internet.userName(),
+┊  ┊59┊    password,
+┊  ┊60┊  }).then((user) => {
+┊  ┊61┊    console.log(
+┊  ┊62┊      '{email, username, password}',
+┊  ┊63┊      `{${user.email}, ${user.username}, ${password}}`
+┊  ┊64┊    );
+┊  ┊65┊    _.times(MESSAGES_PER_USER, () => MessageModel.create({
+┊  ┊66┊      userId: user.id,
+┊  ┊67┊      groupId: group.id,
+┊  ┊68┊      text: faker.lorem.sentences(3),
+┊  ┊69┊    }));
+┊  ┊70┊    return user;
+┊  ┊71┊  });
+┊  ┊72┊})).then((userPromises) => {
+┊  ┊73┊  // make users friends with all users in the group
+┊  ┊74┊  Promise.all(userPromises).then((users) => {
+┊  ┊75┊    _.each(users, (current, i) => {
+┊  ┊76┊      _.each(users, (user, j) => {
+┊  ┊77┊        if (i !== j) {
+┊  ┊78┊          current.addFriend(user);
+┊  ┊79┊        }
+┊  ┊80┊      });
+┊  ┊81┊    });
+┊  ┊82┊  });
+┊  ┊83┊})));
+┊  ┊84┊
 ┊42┊85┊const Group = db.models.group;
 ┊43┊86┊const Message = db.models.message;
 ┊44┊87┊const User = db.models.user;
```

[}]: #

For the final step, we need to connect our Schema to our Connectors so our server resolves the right data based on the request. We accomplish this last step with the help of [**Resolvers**](http://dev.apollodata.com/tools/graphql-tools/resolvers.html).

In `ApolloServer`, we write Resolvers as a map that resolves each GraphQL Type defined in our Schema. For example, if we were just resolving `User`, our resolver code would look like this:

```js
// server/data/resolvers.js
import { User, Message } from './connectors';
export const resolvers = {
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
export default resolvers;
```

When the `user` query is executed, it will return the `User` in our SQL database that matches the query. But what’s *really cool* is that all fields associated with the `User` will also get resolved when they're requested, and those fields can recursively resolve using the same resolvers. For example, if we requested a `User`, her friends, and her friend’s friends, the query would run the `friends` resolver on the `User`, and then run `friends` again on each `User` returned by the first call:

```graphql
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

[{]: <helper> (diffStep 2.6)

#### [Step 2.6: Create Resolvers](https://github.com/srtucker22/chatty/commit/7a6ed2f)

##### Changed package.json
```diff
@@ -26,6 +26,7 @@
 ┊26┊26┊    "apollo-server": "^2.0.0",
 ┊27┊27┊    "faker": "^4.1.0",
 ┊28┊28┊    "graphql": "^0.13.2",
+┊  ┊29┊    "graphql-date": "^1.0.3",
 ┊29┊30┊    "lodash": "^4.17.4",
 ┊30┊31┊    "sequelize": "^4.4.2",
 ┊31┊32┊    "sqlite3": "^4.0.1"
```

##### Added server&#x2F;data&#x2F;resolvers.js
```diff
@@ -0,0 +1,56 @@
+┊  ┊ 1┊import GraphQLDate from 'graphql-date';
+┊  ┊ 2┊
+┊  ┊ 3┊import { Group, Message, User } from './connectors';
+┊  ┊ 4┊
+┊  ┊ 5┊export const resolvers = {
+┊  ┊ 6┊  Date: GraphQLDate,
+┊  ┊ 7┊  Query: {
+┊  ┊ 8┊    group(_, args) {
+┊  ┊ 9┊      return Group.find({ where: args });
+┊  ┊10┊    },
+┊  ┊11┊    messages(_, args) {
+┊  ┊12┊      return Message.findAll({
+┊  ┊13┊        where: args,
+┊  ┊14┊        order: [['createdAt', 'DESC']],
+┊  ┊15┊      });
+┊  ┊16┊    },
+┊  ┊17┊    user(_, args) {
+┊  ┊18┊      return User.findOne({ where: args });
+┊  ┊19┊    },
+┊  ┊20┊  },
+┊  ┊21┊  Group: {
+┊  ┊22┊    users(group) {
+┊  ┊23┊      return group.getUsers();
+┊  ┊24┊    },
+┊  ┊25┊    messages(group) {
+┊  ┊26┊      return Message.findAll({
+┊  ┊27┊        where: { groupId: group.id },
+┊  ┊28┊        order: [['createdAt', 'DESC']],
+┊  ┊29┊      });
+┊  ┊30┊    },
+┊  ┊31┊  },
+┊  ┊32┊  Message: {
+┊  ┊33┊    to(message) {
+┊  ┊34┊      return message.getGroup();
+┊  ┊35┊    },
+┊  ┊36┊    from(message) {
+┊  ┊37┊      return message.getUser();
+┊  ┊38┊    },
+┊  ┊39┊  },
+┊  ┊40┊  User: {
+┊  ┊41┊    messages(user) {
+┊  ┊42┊      return Message.findAll({
+┊  ┊43┊        where: { userId: user.id },
+┊  ┊44┊        order: [['createdAt', 'DESC']],
+┊  ┊45┊      });
+┊  ┊46┊    },
+┊  ┊47┊    groups(user) {
+┊  ┊48┊      return user.getGroups();
+┊  ┊49┊    },
+┊  ┊50┊    friends(user) {
+┊  ┊51┊      return user.getFriends();
+┊  ┊52┊    },
+┊  ┊53┊  },
+┊  ┊54┊};
+┊  ┊55┊
+┊  ┊56┊export default resolvers;
```

[}]: #

Our resolvers are relatively straightforward. We’ve set our message resolvers to return in descending order by date created, so the most recent messages will return first.

Notice we’ve also included a resolver for `Date` because it's a custom scalar. Instead of creating our own resolver, I’ve imported someone’s excellent [`GraphQLDate`](https://www.npmjs.com/package/graphql-date) package.

Finally, we can pass our resolvers to `ApolloServer` in `server/index.js` to replace our mocked data with real data:

[{]: <helper> (diffStep 2.7)

#### [Step 2.7: Connect Resolvers to GraphQL Server](https://github.com/srtucker22/chatty/commit/153f7e4)

##### Changed .gitignore
```diff
@@ -1,4 +1,5 @@
 ┊1┊1┊node_modules
 ┊2┊2┊npm-debug.log
 ┊3┊3┊yarn-error.log 
-┊4┊ ┊.vscode🚫↵
+┊ ┊4┊.vscode
+┊ ┊5┊chatty.sqlite🚫↵
```

##### Changed server&#x2F;index.js
```diff
@@ -1,9 +1,14 @@
 ┊ 1┊ 1┊import { ApolloServer } from 'apollo-server';
 ┊ 2┊ 2┊import { typeDefs } from './data/schema';
 ┊ 3┊ 3┊import { mocks } from './data/mocks';
+┊  ┊ 4┊import { resolvers } from './data/resolvers';
 ┊ 4┊ 5┊
 ┊ 5┊ 6┊const PORT = 8080;
 ┊ 6┊ 7┊
-┊ 7┊  ┊const server = new ApolloServer({ typeDefs, mocks });
+┊  ┊ 8┊const server = new ApolloServer({
+┊  ┊ 9┊  resolvers,
+┊  ┊10┊  typeDefs,
+┊  ┊11┊  // mocks,
+┊  ┊12┊});
 ┊ 8┊13┊
 ┊ 9┊14┊server.listen({ port: PORT }).then(({ url }) => console.log(`🚀 Server ready at ${url}`));
```

[}]: #

Now if we run a Query in GraphQL Playground, we should get some real results straight from our database: ![Playground Image](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step2-7.png)

We’ve got the data. We’ve designed the Schema with Queries. Now it’s time to get that data in our React Native app!


[//]: # (foot-start)

[{]: <helper> (navStep)

| [< Previous Step](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/step1.md) | [Next Step >](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/step3.md) |
|:--------------------------------|--------------------------------:|

[}]: #

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
```diff
@@ -1,10 +1,33 @@
-┊ 1┊  ┊export const Schema = [
-┊ 2┊  ┊  `type Query {
-┊ 3┊  ┊    testString: String
+┊  ┊ 1┊export const Schema = [`
+┊  ┊ 2┊  # declare custom scalars
+┊  ┊ 3┊  scalar Date
+┊  ┊ 4┊
+┊  ┊ 5┊  # a group chat entity
+┊  ┊ 6┊  type Group {
+┊  ┊ 7┊    id: Int! # unique id for the group
+┊  ┊ 8┊    name: String # name of the group
+┊  ┊ 9┊    users: [User]! # users in the group
+┊  ┊10┊    messages: [Message] # messages sent to the group
+┊  ┊11┊  }
+┊  ┊12┊
+┊  ┊13┊  # a user -- keep type really simple for now
+┊  ┊14┊  type User {
+┊  ┊15┊    id: Int! # unique id for the user
+┊  ┊16┊    email: String! # we will also require a unique email per user
+┊  ┊17┊    username: String # this is the name we'll show other users
+┊  ┊18┊    messages: [Message] # messages sent by user
+┊  ┊19┊    groups: [Group] # groups the user belongs to
+┊  ┊20┊    friends: [User] # user's friends/contacts
+┊  ┊21┊  }
+┊  ┊22┊
+┊  ┊23┊  # a message sent from a user to a group
+┊  ┊24┊  type Message {
+┊  ┊25┊    id: Int! # unique id for message
+┊  ┊26┊    to: Group! # group message was sent in
+┊  ┊27┊    from: User! # user who sent the message
+┊  ┊28┊    text: String! # message text
+┊  ┊29┊    createdAt: Date! # when message was created
 ┊ 4┊30┊  }
-┊ 5┊  ┊  schema {
-┊ 6┊  ┊    query: Query
-┊ 7┊  ┊  }`,
-┊ 8┊  ┊];
+┊  ┊31┊`];
 ┊ 9┊32┊
 ┊10┊33┊export default Schema;
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
```diff
@@ -28,6 +28,23 @@
 ┊28┊28┊    text: String! # message text
 ┊29┊29┊    createdAt: Date! # when message was created
 ┊30┊30┊  }
+┊  ┊31┊
+┊  ┊32┊  # query for types
+┊  ┊33┊  type Query {
+┊  ┊34┊    # Return a user by their email or id
+┊  ┊35┊    user(email: String, id: Int): User
+┊  ┊36┊
+┊  ┊37┊    # Return messages sent by a user via userId
+┊  ┊38┊    # Return messages sent to a group via groupId
+┊  ┊39┊    messages(groupId: Int, userId: Int): [Message]
+┊  ┊40┊
+┊  ┊41┊    # Return a group by its id
+┊  ┊42┊    group(id: Int!): Group
+┊  ┊43┊  }
+┊  ┊44┊
+┊  ┊45┊  schema {
+┊  ┊46┊    query: Query
+┊  ┊47┊  }
 ┊31┊48┊`];
 ┊32┊49┊
 ┊33┊50┊export default Schema;
```

[}]: #

Note that we also need to define the `schema` at the end of our Schema string.

# Connecting Mocked Data

We have defined our Schema including queries, but it’s not connected to any sort of data. If we ran the current code as is, it would definitely fail.

While we could start creating real data right away, it’s good practice to mock data first. Mocking will enable us to catch any obvious errors with our Schema before we start trying to connect real data, and it will also help us down the line with testing.
Let’s modify our `server/data/mocks.js` code using `faker` (`yarn add faker`) to produce some fake data:

[{]: <helper> (diffStep 2.3 files="server/data/mocks.js")

#### Step 2.3: Update Mocks

##### Changed server&#x2F;data&#x2F;mocks.js
```diff
@@ -1,5 +1,29 @@
+┊  ┊ 1┊import faker from 'faker';
+┊  ┊ 2┊
 ┊ 1┊ 3┊export const Mocks = {
+┊  ┊ 4┊  Date: () => new Date(),
+┊  ┊ 5┊  Int: () => parseInt(Math.random() * 100, 10),
 ┊ 2┊ 6┊  String: () => 'It works!',
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
 ┊ 3┊27┊};
 ┊ 4┊28┊
 ┊ 5┊29┊export default Mocks;
```

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

#### Step 2.5: Create fake users

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
```diff
@@ -0,0 +1,56 @@
+┊  ┊ 1┊import GraphQLDate from 'graphql-date';
+┊  ┊ 2┊
+┊  ┊ 3┊import { Group, Message, User } from './connectors';
+┊  ┊ 4┊
+┊  ┊ 5┊export const Resolvers = {
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
+┊  ┊56┊export default Resolvers;
```

[}]: #

Our resolvers are relatively straightforward. We’ve set our message resolvers to return in descending order by date created, so the most recent messages will return first.

Notice we’ve also included a resolver for `Date` because it is a custom scalar. Instead of creating our own resolver, I’ve imported someone’s excellent [`GraphQLDate`](https://www.npmjs.com/package/graphql-date) package.

Finally, we can pass our resolvers to `makeExecutableSchema` in `server/index.js` to replace our mocked data with real data:

[{]: <helper> (diffStep 2.7 files="server/index.js")

#### Step 2.7: Connect Resolvers to GraphQL Server

##### Changed server&#x2F;index.js
```diff
@@ -4,6 +4,7 @@
 ┊ 4┊ 4┊import bodyParser from 'body-parser';
 ┊ 5┊ 5┊import { createServer } from 'http';
 ┊ 6┊ 6┊
+┊  ┊ 7┊import { Resolvers } from './data/resolvers';
 ┊ 7┊ 8┊import { Schema } from './data/schema';
 ┊ 8┊ 9┊import { Mocks } from './data/mocks';
 ┊ 9┊10┊
```
```diff
@@ -12,13 +13,16 @@
 ┊12┊13┊
 ┊13┊14┊const executableSchema = makeExecutableSchema({
 ┊14┊15┊  typeDefs: Schema,
+┊  ┊16┊  resolvers: Resolvers,
 ┊15┊17┊});
 ┊16┊18┊
-┊17┊  ┊addMockFunctionsToSchema({
-┊18┊  ┊  schema: executableSchema,
-┊19┊  ┊  mocks: Mocks,
-┊20┊  ┊  preserveResolvers: true,
-┊21┊  ┊});
+┊  ┊19┊// we can comment out this code for mocking data
+┊  ┊20┊// we're using REAL DATA now!
+┊  ┊21┊// addMockFunctionsToSchema({
+┊  ┊22┊//   schema: executableSchema,
+┊  ┊23┊//   mocks: Mocks,
+┊  ┊24┊//   preserveResolvers: true,
+┊  ┊25┊// });
 ┊22┊26┊
 ┊23┊27┊// `context` must be an object and can't be undefined when using connectors
 ┊24┊28┊app.use('/graphql', bodyParser.json(), graphqlExpress({
```

[}]: #

Now if we run a Query on GraphiQL, we should get some real results straight from our database: ![GraphIQL Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step2-7.png)

We’ve got the data. We’ve designed the Schema with Queries. Now it’s time to put that data in our React Native app!
[{]: <helper> (navStep)

| [< Previous Step](step1.md) | [Next Step >](step3.md) |
|:--------------------------------|--------------------------------:|

[}]: #

# Step 7: GraphQL Authentication

[//]: # (head-end)


This is the seventh blog in a multipart series where we will be building Chatty, a WhatsApp clone, using [React Native](https://facebook.github.io/react-native/) and [Apollo](http://dev.apollodata.com/).

In this tutorial, we’ll be adding authentication (auth) to Chatty, solidifying Chatty as a full-fledged MVP messaging app!

Here’s what we will accomplish in this tutorial:
1. Introduce [**JSON Web Tokens (JWT)**](https://jwt.io/introduction/)
2. Build server-side infrastructure for JWT auth with Queries and Mutations
3. Refactor Schemas and Resolvers with auth
4. Build server-side infrastructure for JWT auth with Subscriptions
5. Design login/signup layout in our React Native client
6. Build client-side infrastructure for JWT auth with Queries and Mutations
7. Build client-side infrastructure for JWT auth with Subscriptions
8. Refactor Components, Queries, Mutations, and Subscriptions with auth
9. Reflect on all we’ve accomplished!

Yeah, this one’s gonna be BIG….

# JSON Web Tokens (JWT)
[JSON Web Token (JWT)](http://jwt.io) is an open standard ([RFC 7519](https://tools.ietf.org/html/rfc7519)) for securely sending digitally signed JSONs between parties. JWTs are incredibly cool for authentication because they let us implement reliable Single Sign-On (SSO) and persisted auth with low overhead on any platform (native, web, VR, whatever…) and across domains. JWTs are a strong alternative to pure cookie or session based auth with simple tokens or SAML, which can fail miserably in native app implementations. We can even use cookies with JWTs if we really want.

Without getting into technical details, a JWT is basically just a JSON message that gets all kinds of encoded, hashed, and signed to keep it super secure. Feel free to dig into the details [here](https://jwt.io/introduction/).

For our purposes, we just need to know how to use JWTs within our authentication workflow. When a user logs into our app, the server will check their email and password against the database. If the user exists, we’ll take their `{email: <your-email>, password: <your-pw>}` combination, turn it into a lovely JWT, and send it back to the client. The client can store the JWT forever or until we set it to expire.

Whenever the client wants to ask the server for data, it’ll pass the JWT in the request’s Authorization Header (`Authorization: Bearer <token>`). The server will decode the Authorization Header before executing every request, and the decoded JWT should contain `{email: <your-email>, password: <your-pw>}`. With that data, the server can retrieve the user again via the database or a cache to determine whether the user is allowed to execute the request.

Let’s make it happen!

# JWT Authentication for Queries and Mutations
We can use the excellent [`express-jwt`](https://www.npmjs.com/package/express-jwt) and [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken) packages for all our JWT encoding/decoding needs. We’re also going to use [`bcrypt`](https://www.npmjs.com/package/bcrypt) for hashing passwords and [`dotenv`](https://www.npmjs.com/package/dotenv) to set our JWT secret key as an environment variable:

```sh
npm i express-jwt jsonwebtoken bcrypt dotenv
```

In a new `.env` file on the root directory, let’s add a `JWT_SECRET` environment variable:

[{]: <helper> (diffStep 7.1 files=".env")

#### [Step 7.1: Add environment variables for JWT_SECRET](https://github.com/srtucker22/chatty/commit/46a72bf)

##### Added .env
```diff
@@ -0,0 +1,3 @@
+┊ ┊1┊# .env
+┊ ┊2┊# use your own secret!!!
+┊ ┊3┊JWT_SECRET=your_secret🚫↵
```

[}]: #

We’ll process the `JWT_SECRET` inside a new file `server/config.js`:

[{]: <helper> (diffStep 7.1 files="server/config.js")

#### [Step 7.1: Add environment variables for JWT_SECRET](https://github.com/srtucker22/chatty/commit/46a72bf)

##### Added server&#x2F;config.js
```diff
@@ -0,0 +1,19 @@
+┊  ┊ 1┊import dotenv from 'dotenv';
+┊  ┊ 2┊
+┊  ┊ 3┊dotenv.config({ silent: true });
+┊  ┊ 4┊
+┊  ┊ 5┊export const {
+┊  ┊ 6┊  JWT_SECRET,
+┊  ┊ 7┊} = process.env;
+┊  ┊ 8┊
+┊  ┊ 9┊const defaults = {
+┊  ┊10┊  JWT_SECRET: 'your_secret',
+┊  ┊11┊};
+┊  ┊12┊
+┊  ┊13┊Object.keys(defaults).forEach((key) => {
+┊  ┊14┊  if (!process.env[key] || process.env[key] === defaults[key]) {
+┊  ┊15┊    throw new Error(`Please enter a custom ${key} in .env on the root directory`);
+┊  ┊16┊  }
+┊  ┊17┊});
+┊  ┊18┊
+┊  ┊19┊export default JWT_SECRET;
```

[}]: #

Now, let’s update our express server in `server/index.js` to use `express-jwt ` middleware. Even though our app isn't a pure `express` app, we can still use express-style middleware on requests passing through our `ApolloServer`:

[{]: <helper> (diffStep 7.2)

#### [Step 7.2: Add jwt middleware to express](https://github.com/srtucker22/chatty/commit/346363c)

##### Changed server&#x2F;index.js
```diff
@@ -1,7 +1,11 @@
 ┊ 1┊ 1┊import { ApolloServer } from 'apollo-server';
+┊  ┊ 2┊import jwt from 'express-jwt';
+┊  ┊ 3┊
 ┊ 2┊ 4┊import { typeDefs } from './data/schema';
 ┊ 3┊ 5┊import { mocks } from './data/mocks';
 ┊ 4┊ 6┊import { resolvers } from './data/resolvers';
+┊  ┊ 7┊import { JWT_SECRET } from './config';
+┊  ┊ 8┊import { User } from './data/connectors';
 ┊ 5┊ 9┊
 ┊ 6┊10┊const PORT = 8080;
 ┊ 7┊11┊
```
```diff
@@ -9,6 +13,29 @@
 ┊ 9┊13┊  resolvers,
 ┊10┊14┊  typeDefs,
 ┊11┊15┊  // mocks,
+┊  ┊16┊  context: ({ req, res, connection }) => {
+┊  ┊17┊    // web socket subscriptions will return a connection
+┊  ┊18┊    if (connection) {
+┊  ┊19┊      // check connection for metadata
+┊  ┊20┊      return {};
+┊  ┊21┊    }
+┊  ┊22┊
+┊  ┊23┊    const user = new Promise((resolve, reject) => {
+┊  ┊24┊      jwt({
+┊  ┊25┊        secret: JWT_SECRET,
+┊  ┊26┊        credentialsRequired: false,
+┊  ┊27┊      })(req, res, (e) => {
+┊  ┊28┊        if (req.user) {
+┊  ┊29┊          resolve(User.findOne({ where: { id: req.user.id } }));
+┊  ┊30┊        } else {
+┊  ┊31┊          resolve(null);
+┊  ┊32┊        }
+┊  ┊33┊      });
+┊  ┊34┊    });
+┊  ┊35┊    return {
+┊  ┊36┊      user,
+┊  ┊37┊    };
+┊  ┊38┊  },
 ┊12┊39┊});
 ┊13┊40┊
 ┊14┊41┊server.listen({ port: PORT }).then(({ url }) => console.log(`🚀 Server ready at ${url}`));
```

[}]: #

The `express-jwt` middleware checks our Authorization Header for a `Bearer` token, decodes the token using the `JWT_SECRET` into a JSON object, and then attaches that Object to the request as `req.user`. We can use `req.user` to find the associated `User` in our database  —  we pretty much only need to use the `id` parameter to retrieve the `User` because we can be confident the JWT is secure (more on this later). Lastly, we return the found `User` in this `context` function. By doing this, every one of our Resolvers will get passed a `context` parameter with the `User`, which we will use to validate credentials before touching any data.

Note that by setting `credentialsRequired: false`, we allow non-authenticated requests to pass through the middleware. This is required so we can allow signup and login requests (and others) through the endpoint.

## Refactoring Schemas
Time to focus on our Schema. We need to perform 3 changes to `server/data/schema.js`:
1. Add new GraphQL Mutations for logging in and signing up
2. Add the JWT to the `User` type
3. Since the User will get passed into all the Resolvers automatically via context, we no longer need to pass a `userId` to any queries or mutations, so let’s simplify their inputs!

[{]: <helper> (diffStep 7.3)

#### [Step 7.3: Update Schema with auth](https://github.com/srtucker22/chatty/commit/d2aa4ff)

##### Changed server&#x2F;data&#x2F;schema.js
```diff
@@ -35,6 +35,7 @@
 ┊35┊35┊    messages: [Message] # messages sent by user
 ┊36┊36┊    groups: [Group] # groups the user belongs to
 ┊37┊37┊    friends: [User] # user's friends/contacts
+┊  ┊38┊    jwt: String # json web token for access
 ┊38┊39┊  }
 ┊39┊40┊
 ┊40┊41┊  # a message sent from a user to a group
```
```diff
@@ -61,19 +62,19 @@
 ┊61┊62┊
 ┊62┊63┊  type Mutation {
 ┊63┊64┊    # send a message to a group
-┊64┊  ┊    createMessage(
-┊65┊  ┊      text: String!, userId: Int!, groupId: Int!
-┊66┊  ┊    ): Message
-┊67┊  ┊    createGroup(name: String!, userIds: [Int], userId: Int!): Group
+┊  ┊65┊    createMessage(text: String!, groupId: Int!): Message
+┊  ┊66┊    createGroup(name: String!, userIds: [Int]): Group
 ┊68┊67┊    deleteGroup(id: Int!): Group
-┊69┊  ┊    leaveGroup(id: Int!, userId: Int!): Group # let user leave group
+┊  ┊68┊    leaveGroup(id: Int!): Group # let user leave group
 ┊70┊69┊    updateGroup(id: Int!, name: String): Group
+┊  ┊70┊    login(email: String!, password: String!): User
+┊  ┊71┊    signup(email: String!, password: String!, username: String): User
 ┊71┊72┊  }
 ┊72┊73┊
 ┊73┊74┊  type Subscription {
 ┊74┊75┊    # Subscription fires on every message added
 ┊75┊76┊    # for any of the groups with one of these groupIds
-┊76┊  ┊    messageAdded(userId: Int, groupIds: [Int]): Message
+┊  ┊77┊    messageAdded(groupIds: [Int]): Message
 ┊77┊78┊    groupAdded(userId: Int): Group
 ┊78┊79┊  }
```

[}]: #

Because our server is stateless, **we don’t need to create a logout mutation!** The server will test for authorization on every request and login state will solely be kept on the client.

## Refactoring Resolvers
We need to update our Resolvers to handle our new `login` and `signup` Mutations. We can update `server/data/resolvers.js` as follows:

[{]: <helper> (diffStep 7.4)

#### [Step 7.4: Update Resolvers with login and signup mutations](https://github.com/srtucker22/chatty/commit/bfa7cb5)

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -1,9 +1,12 @@
 ┊ 1┊ 1┊import GraphQLDate from 'graphql-date';
 ┊ 2┊ 2┊import { withFilter } from 'apollo-server';
 ┊ 3┊ 3┊import { map } from 'lodash';
+┊  ┊ 4┊import bcrypt from 'bcrypt';
+┊  ┊ 5┊import jwt from 'jsonwebtoken';
 ┊ 4┊ 6┊
 ┊ 5┊ 7┊import { Group, Message, User } from './connectors';
 ┊ 6┊ 8┊import { pubsub } from '../subscriptions';
+┊  ┊ 9┊import { JWT_SECRET } from '../config';
 ┊ 7┊10┊
 ┊ 8┊11┊const MESSAGE_ADDED_TOPIC = 'messageAdded';
 ┊ 9┊12┊const GROUP_ADDED_TOPIC = 'groupAdded';
```
```diff
@@ -88,6 +91,51 @@
 ┊ 88┊ 91┊      return Group.findOne({ where: { id } })
 ┊ 89┊ 92┊        .then(group => group.update({ name }));
 ┊ 90┊ 93┊    },
+┊   ┊ 94┊    login(_, { email, password }, ctx) {
+┊   ┊ 95┊      // find user by email
+┊   ┊ 96┊      return User.findOne({ where: { email } }).then((user) => {
+┊   ┊ 97┊        if (user) {
+┊   ┊ 98┊          // validate password
+┊   ┊ 99┊          return bcrypt.compare(password, user.password).then((res) => {
+┊   ┊100┊            if (res) {
+┊   ┊101┊              // create jwt
+┊   ┊102┊              const token = jwt.sign({
+┊   ┊103┊                id: user.id,
+┊   ┊104┊                email: user.email,
+┊   ┊105┊              }, JWT_SECRET);
+┊   ┊106┊              user.jwt = token;
+┊   ┊107┊              ctx.user = Promise.resolve(user);
+┊   ┊108┊              return user;
+┊   ┊109┊            }
+┊   ┊110┊
+┊   ┊111┊            return Promise.reject('password incorrect');
+┊   ┊112┊          });
+┊   ┊113┊        }
+┊   ┊114┊
+┊   ┊115┊        return Promise.reject('email not found');
+┊   ┊116┊      });
+┊   ┊117┊    },
+┊   ┊118┊    signup(_, { email, password, username }, ctx) {
+┊   ┊119┊      // find user by email
+┊   ┊120┊      return User.findOne({ where: { email } }).then((existing) => {
+┊   ┊121┊        if (!existing) {
+┊   ┊122┊          // hash password and create user
+┊   ┊123┊          return bcrypt.hash(password, 10).then(hash => User.create({
+┊   ┊124┊            email,
+┊   ┊125┊            password: hash,
+┊   ┊126┊            username: username || email,
+┊   ┊127┊          })).then((user) => {
+┊   ┊128┊            const { id } = user;
+┊   ┊129┊            const token = jwt.sign({ id, email }, JWT_SECRET);
+┊   ┊130┊            user.jwt = token;
+┊   ┊131┊            ctx.user = Promise.resolve(user);
+┊   ┊132┊            return user;
+┊   ┊133┊          });
+┊   ┊134┊        }
+┊   ┊135┊
+┊   ┊136┊        return Promise.reject('email already exists'); // email already exists
+┊   ┊137┊      });
+┊   ┊138┊    },
 ┊ 91┊139┊  },
 ┊ 92┊140┊  Subscription: {
 ┊ 93┊141┊    messageAdded: {
```

[}]: #

Let’s break this code down a bit. First let’s look at `login`:
1. We search our database for the `User` with the supplied `email`
2. If the `User` exists, we use `bcrypt` to compare the `User`’s password (we store a hashed version of the password in the database for security) with the supplied password
3. If the passwords match, we create a JWT with the `User`’s `id` and `email`
4. We return the `User` with the JWT attached and also attach a `User` Promise to `context` to pass down to other resolvers.

The code for `signup` is very similar:
1. We search our database for the `User` with the supplied `email`
2. If no `User` with that `email` exists yet, we hash the supplied password and create a new `User` with the email, hashed password, and username (which defaults to email if no username is supplied)
3. We return the new `User` with the JWT attached and also attach a `User` Promise to context to pass down to other resolvers.

We need to also change our fake data generator in `server/data/connectors.js` to hash passwords before they’re stored in the database:

[{]: <helper> (diffStep 7.5)

#### [Step 7.5: Update fake data with hashed passwords](https://github.com/srtucker22/chatty/commit/4baba9b)

##### Changed server&#x2F;data&#x2F;connectors.js
```diff
@@ -1,6 +1,7 @@
 ┊1┊1┊import { _ } from 'lodash';
 ┊2┊2┊import faker from 'faker';
 ┊3┊3┊import Sequelize from 'sequelize';
+┊ ┊4┊import bcrypt from 'bcrypt';
 ┊4┊5┊
 ┊5┊6┊// initialize our database
 ┊6┊7┊const db = new Sequelize('chatty', null, null, {
```
```diff
@@ -53,10 +54,10 @@
 ┊53┊54┊  name: faker.lorem.words(3),
 ┊54┊55┊}).then(group => _.times(USERS_PER_GROUP, () => {
 ┊55┊56┊  const password = faker.internet.password();
-┊56┊  ┊  return group.createUser({
+┊  ┊57┊  return bcrypt.hash(password, 10).then(hash => group.createUser({
 ┊57┊58┊    email: faker.internet.email(),
 ┊58┊59┊    username: faker.internet.userName(),
-┊59┊  ┊    password,
+┊  ┊60┊    password: hash,
 ┊60┊61┊  }).then((user) => {
 ┊61┊62┊    console.log(
 ┊62┊63┊      '{email, username, password}',
```
```diff
@@ -68,7 +69,7 @@
 ┊68┊69┊      text: faker.lorem.sentences(3),
 ┊69┊70┊    }));
 ┊70┊71┊    return user;
-┊71┊  ┊  });
+┊  ┊72┊  }));
 ┊72┊73┊})).then((userPromises) => {
 ┊73┊74┊  // make users friends with all users in the group
 ┊74┊75┊  Promise.all(userPromises).then((users) => {
```

[}]: #

Sweet! Now let’s refactor our Type, Query, and Mutation resolvers to use authentication to protect our data. Our earlier changes to `ApolloServer` will attach a `context` parameter with the authenticated `User` to every request on our GraphQL endpoint. We consume `context` (`ctx`) in the Resolvers to build security around our data. For example, we might change `createMessage` to look something like this:

```js
// this isn't good enough!!!
createMessage(_, { groupId, text }, ctx) {
  if (!ctx.user) {
    throw new ForbiddenError('Unauthorized');
  }
  return ctx.user.then((user)=> {
    if(!user) {
      throw new ForbiddenError('Unauthorized');
    }
    return Message.create({
      userId: user.id,
      text,
      groupId,
    }).then((message) => {
      // Publish subscription notification with the whole message
      pubsub.publish('messageAdded', message);
      return message;
    });
  });
},
```

This is a start, but it doesn’t give us the security we really need. Users would be able to create messages for *any group*, not just their own groups. We could build this logic into the resolver, but we’re likely going to need to reuse logic for other Queries and Mutations. Our best move is to create a [**business logic layer**](http://graphql.org/learn/thinking-in-graphs/#business-logic-layer) in between our Connectors and Resolvers that will perform authorization checks. By putting this business logic layer in between our Connectors and Resolvers, we can incrementally add business logic to our application one Type/Query/Mutation at a time without breaking others.

In the Apollo docs, this layer is occasionally referred to as the `models` layer, but that name [can be confusing](https://github.com/apollographql/graphql-server/issues/118), so let’s just call it `logic`.

Let’s create a new file `server/data/logic.js` where we’ll start compiling our business logic:

[{]: <helper> (diffStep 7.6)

#### [Step 7.6: Create logic.js](https://github.com/srtucker22/chatty/commit/da16115)

##### Added server&#x2F;data&#x2F;logic.js
```diff
@@ -0,0 +1,29 @@
+┊  ┊ 1┊import { ApolloError, AuthenticationError, ForbiddenError } from 'apollo-server';
+┊  ┊ 2┊import { Message } from './connectors';
+┊  ┊ 3┊
+┊  ┊ 4┊// reusable function to check for a user with context
+┊  ┊ 5┊function getAuthenticatedUser(ctx) {
+┊  ┊ 6┊  return ctx.user.then((user) => {
+┊  ┊ 7┊    if (!user) {
+┊  ┊ 8┊      throw new AuthenticationError('Unauthenticated');
+┊  ┊ 9┊    }
+┊  ┊10┊    return user;
+┊  ┊11┊  });
+┊  ┊12┊}
+┊  ┊13┊
+┊  ┊14┊export const messageLogic = {
+┊  ┊15┊  createMessage(_, { text, groupId }, ctx) {
+┊  ┊16┊    return getAuthenticatedUser(ctx)
+┊  ┊17┊      .then(user => user.getGroups({ where: { id: groupId }, attributes: ['id'] })
+┊  ┊18┊        .then((group) => {
+┊  ┊19┊          if (group.length) {
+┊  ┊20┊            return Message.create({
+┊  ┊21┊              userId: user.id,
+┊  ┊22┊              text,
+┊  ┊23┊              groupId,
+┊  ┊24┊            });
+┊  ┊25┊          }
+┊  ┊26┊          throw new ForbiddenError('Unauthorized');
+┊  ┊27┊        }));
+┊  ┊28┊  },
+┊  ┊29┊};
```

[}]: #

We’ve separated out the function `getAuthenticatedUser` to check whether a `User` is making a request. We’ll be able to reuse this function across our logic for other requests.

Now we can start injecting this logic into our Resolvers:

[{]: <helper> (diffStep 7.7)

#### [Step 7.7: Apply messageLogic to createMessage resolver](https://github.com/srtucker22/chatty/commit/06415f4)

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -7,6 +7,7 @@
 ┊ 7┊ 7┊import { Group, Message, User } from './connectors';
 ┊ 8┊ 8┊import { pubsub } from '../subscriptions';
 ┊ 9┊ 9┊import { JWT_SECRET } from '../config';
+┊  ┊10┊import { messageLogic } from './logic';
 ┊10┊11┊
 ┊11┊12┊const MESSAGE_ADDED_TOPIC = 'messageAdded';
 ┊12┊13┊const GROUP_ADDED_TOPIC = 'groupAdded';
```
```diff
@@ -37,16 +38,13 @@
 ┊37┊38┊    },
 ┊38┊39┊  },
 ┊39┊40┊  Mutation: {
-┊40┊  ┊    createMessage(_, { text, userId, groupId }) {
-┊41┊  ┊      return Message.create({
-┊42┊  ┊        userId,
-┊43┊  ┊        text,
-┊44┊  ┊        groupId,
-┊45┊  ┊      }).then((message) => {
-┊46┊  ┊        // publish subscription notification with the whole message
-┊47┊  ┊        pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });
-┊48┊  ┊        return message;
-┊49┊  ┊      });
+┊  ┊41┊    createMessage(_, args, ctx) {
+┊  ┊42┊      return messageLogic.createMessage(_, args, ctx)
+┊  ┊43┊        .then((message) => {
+┊  ┊44┊          // Publish subscription notification with message
+┊  ┊45┊          pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });
+┊  ┊46┊          return message;
+┊  ┊47┊        });
 ┊50┊48┊    },
 ┊51┊49┊    createGroup(_, { name, userIds, userId }) {
 ┊52┊50┊      return User.findOne({ where: { id: userId } })
```

[}]: #

`createMessage` will return the result of the logic in `messageLogic`,  which returns a Promise that either successfully resolves to the new `Message` or rejects due to failed authorization.

Let’s fill out our logic in `server/data/logic.js` to cover all GraphQL Types, Queries and Mutations:

[{]: <helper> (diffStep 7.8)

#### [Step 7.8: Create logic for all Resolvers](https://github.com/srtucker22/chatty/commit/0b12211)

##### Changed server&#x2F;data&#x2F;logic.js
```diff
@@ -1,5 +1,5 @@
 ┊1┊1┊import { ApolloError, AuthenticationError, ForbiddenError } from 'apollo-server';
-┊2┊ ┊import { Message } from './connectors';
+┊ ┊2┊import { Group, Message, User } from './connectors';
 ┊3┊3┊
 ┊4┊4┊// reusable function to check for a user with context
 ┊5┊5┊function getAuthenticatedUser(ctx) {
```
```diff
@@ -12,6 +12,12 @@
 ┊12┊12┊}
 ┊13┊13┊
 ┊14┊14┊export const messageLogic = {
+┊  ┊15┊  from(message) {
+┊  ┊16┊    return message.getUser({ attributes: ['id', 'username'] });
+┊  ┊17┊  },
+┊  ┊18┊  to(message) {
+┊  ┊19┊    return message.getGroup({ attributes: ['id', 'name'] });
+┊  ┊20┊  },
 ┊15┊21┊  createMessage(_, { text, groupId }, ctx) {
 ┊16┊22┊    return getAuthenticatedUser(ctx)
 ┊17┊23┊      .then(user => user.getGroups({ where: { id: groupId }, attributes: ['id'] })
```
```diff
@@ -27,3 +33,194 @@
 ┊ 27┊ 33┊        }));
 ┊ 28┊ 34┊  },
 ┊ 29┊ 35┊};
+┊   ┊ 36┊
+┊   ┊ 37┊export const groupLogic = {
+┊   ┊ 38┊  users(group) {
+┊   ┊ 39┊    return group.getUsers({ attributes: ['id', 'username'] });
+┊   ┊ 40┊  },
+┊   ┊ 41┊  messages(group, { first, last, before, after }) {
+┊   ┊ 42┊    // base query -- get messages from the right group
+┊   ┊ 43┊    const where = { groupId: group.id };
+┊   ┊ 44┊
+┊   ┊ 45┊    // because we return messages from newest -> oldest
+┊   ┊ 46┊    // before actually means newer (date > cursor)
+┊   ┊ 47┊    // after actually means older (date < cursor)
+┊   ┊ 48┊
+┊   ┊ 49┊    if (before) {
+┊   ┊ 50┊      // convert base-64 to utf8 iso date and use in Date constructor
+┊   ┊ 51┊      where.id = { $gt: Buffer.from(before, 'base64').toString() };
+┊   ┊ 52┊    }
+┊   ┊ 53┊
+┊   ┊ 54┊    if (after) {
+┊   ┊ 55┊      where.id = { $lt: Buffer.from(after, 'base64').toString() };
+┊   ┊ 56┊    }
+┊   ┊ 57┊
+┊   ┊ 58┊    return Message.findAll({
+┊   ┊ 59┊      where,
+┊   ┊ 60┊      order: [['id', 'DESC']],
+┊   ┊ 61┊      limit: first || last,
+┊   ┊ 62┊    }).then((messages) => {
+┊   ┊ 63┊      const edges = messages.map(message => ({
+┊   ┊ 64┊        cursor: Buffer.from(message.id.toString()).toString('base64'), // convert createdAt to cursor
+┊   ┊ 65┊        node: message, // the node is the message itself
+┊   ┊ 66┊      }));
+┊   ┊ 67┊
+┊   ┊ 68┊      return {
+┊   ┊ 69┊        edges,
+┊   ┊ 70┊        pageInfo: {
+┊   ┊ 71┊          hasNextPage() {
+┊   ┊ 72┊            if (messages.length < (last || first)) {
+┊   ┊ 73┊              return Promise.resolve(false);
+┊   ┊ 74┊            }
+┊   ┊ 75┊
+┊   ┊ 76┊            return Message.findOne({
+┊   ┊ 77┊              where: {
+┊   ┊ 78┊                groupId: group.id,
+┊   ┊ 79┊                id: {
+┊   ┊ 80┊                  [before ? '$gt' : '$lt']: messages[messages.length - 1].id,
+┊   ┊ 81┊                },
+┊   ┊ 82┊              },
+┊   ┊ 83┊              order: [['id', 'DESC']],
+┊   ┊ 84┊            }).then(message => !!message);
+┊   ┊ 85┊          },
+┊   ┊ 86┊          hasPreviousPage() {
+┊   ┊ 87┊            return Message.findOne({
+┊   ┊ 88┊              where: {
+┊   ┊ 89┊                groupId: group.id,
+┊   ┊ 90┊                id: where.id,
+┊   ┊ 91┊              },
+┊   ┊ 92┊              order: [['id']],
+┊   ┊ 93┊            }).then(message => !!message);
+┊   ┊ 94┊          },
+┊   ┊ 95┊        },
+┊   ┊ 96┊      };
+┊   ┊ 97┊    });
+┊   ┊ 98┊  },
+┊   ┊ 99┊  query(_, { id }, ctx) {
+┊   ┊100┊    return getAuthenticatedUser(ctx).then(user => Group.findOne({
+┊   ┊101┊      where: { id },
+┊   ┊102┊      include: [{
+┊   ┊103┊        model: User,
+┊   ┊104┊        where: { id: user.id },
+┊   ┊105┊      }],
+┊   ┊106┊    }));
+┊   ┊107┊  },
+┊   ┊108┊  createGroup(_, { name, userIds }, ctx) {
+┊   ┊109┊    return getAuthenticatedUser(ctx)
+┊   ┊110┊      .then(user => user.getFriends({ where: { id: { $in: userIds } } })
+┊   ┊111┊        .then((friends) => { // eslint-disable-line arrow-body-style
+┊   ┊112┊          return Group.create({
+┊   ┊113┊            name,
+┊   ┊114┊          }).then((group) => { // eslint-disable-line arrow-body-style
+┊   ┊115┊            return group.addUsers([user, ...friends]).then(() => {
+┊   ┊116┊              group.users = [user, ...friends];
+┊   ┊117┊              return group;
+┊   ┊118┊            });
+┊   ┊119┊          });
+┊   ┊120┊        }));
+┊   ┊121┊  },
+┊   ┊122┊  deleteGroup(_, { id }, ctx) {
+┊   ┊123┊    return getAuthenticatedUser(ctx).then((user) => { // eslint-disable-line arrow-body-style
+┊   ┊124┊      return Group.findOne({
+┊   ┊125┊        where: { id },
+┊   ┊126┊        include: [{
+┊   ┊127┊          model: User,
+┊   ┊128┊          where: { id: user.id },
+┊   ┊129┊        }],
+┊   ┊130┊      }).then(group => group.getUsers()
+┊   ┊131┊        .then(users => group.removeUsers(users))
+┊   ┊132┊        .then(() => Message.destroy({ where: { groupId: group.id } }))
+┊   ┊133┊        .then(() => group.destroy()));
+┊   ┊134┊    });
+┊   ┊135┊  },
+┊   ┊136┊  leaveGroup(_, { id }, ctx) {
+┊   ┊137┊    return getAuthenticatedUser(ctx).then((user) => {
+┊   ┊138┊      return Group.findOne({
+┊   ┊139┊        where: { id },
+┊   ┊140┊        include: [{
+┊   ┊141┊          model: User,
+┊   ┊142┊          where: { id: user.id },
+┊   ┊143┊        }],
+┊   ┊144┊      }).then((group) => {
+┊   ┊145┊        if (!group) {
+┊   ┊146┊          throw new ApolloError('No group found', 404);
+┊   ┊147┊        }
+┊   ┊148┊
+┊   ┊149┊        return group.removeUser(user.id)
+┊   ┊150┊          .then(() => group.getUsers())
+┊   ┊151┊          .then((users) => {
+┊   ┊152┊            // if the last user is leaving, remove the group
+┊   ┊153┊            if (!users.length) {
+┊   ┊154┊              group.destroy();
+┊   ┊155┊            }
+┊   ┊156┊            return { id };
+┊   ┊157┊          });
+┊   ┊158┊      });
+┊   ┊159┊    });
+┊   ┊160┊  },
+┊   ┊161┊  updateGroup(_, { id, name }, ctx) {
+┊   ┊162┊    return getAuthenticatedUser(ctx).then((user) => { // eslint-disable-line arrow-body-style
+┊   ┊163┊      return Group.findOne({
+┊   ┊164┊        where: { id },
+┊   ┊165┊        include: [{
+┊   ┊166┊          model: User,
+┊   ┊167┊          where: { id: user.id },
+┊   ┊168┊        }],
+┊   ┊169┊      }).then(group => group.update({ name }));
+┊   ┊170┊    });
+┊   ┊171┊  },
+┊   ┊172┊};
+┊   ┊173┊
+┊   ┊174┊export const userLogic = {
+┊   ┊175┊  email(user, args, ctx) {
+┊   ┊176┊    return getAuthenticatedUser(ctx).then((currentUser) => {
+┊   ┊177┊      if (currentUser.id === user.id) {
+┊   ┊178┊        return currentUser.email;
+┊   ┊179┊      }
+┊   ┊180┊
+┊   ┊181┊      throw new ForbiddenError('Unauthorized');
+┊   ┊182┊    });
+┊   ┊183┊  },
+┊   ┊184┊  friends(user, args, ctx) {
+┊   ┊185┊    return getAuthenticatedUser(ctx).then((currentUser) => {
+┊   ┊186┊      if (currentUser.id !== user.id) {
+┊   ┊187┊        throw new ForbiddenError('Unauthorized');
+┊   ┊188┊      }
+┊   ┊189┊
+┊   ┊190┊      return user.getFriends({ attributes: ['id', 'username'] });
+┊   ┊191┊    });
+┊   ┊192┊  },
+┊   ┊193┊  groups(user, args, ctx) {
+┊   ┊194┊    return getAuthenticatedUser(ctx).then((currentUser) => {
+┊   ┊195┊      if (currentUser.id !== user.id) {
+┊   ┊196┊        throw new ForbiddenError('Unauthorized');
+┊   ┊197┊      }
+┊   ┊198┊
+┊   ┊199┊      return user.getGroups();
+┊   ┊200┊    });
+┊   ┊201┊  },
+┊   ┊202┊  jwt(user) {
+┊   ┊203┊    return Promise.resolve(user.jwt);
+┊   ┊204┊  },
+┊   ┊205┊  messages(user, args, ctx) {
+┊   ┊206┊    return getAuthenticatedUser(ctx).then((currentUser) => {
+┊   ┊207┊      if (currentUser.id !== user.id) {
+┊   ┊208┊        throw new ForbiddenError('Unauthorized');
+┊   ┊209┊      }
+┊   ┊210┊
+┊   ┊211┊      return Message.findAll({
+┊   ┊212┊        where: { userId: user.id },
+┊   ┊213┊        order: [['createdAt', 'DESC']],
+┊   ┊214┊      });
+┊   ┊215┊    });
+┊   ┊216┊  },
+┊   ┊217┊  query(_, args, ctx) {
+┊   ┊218┊    return getAuthenticatedUser(ctx).then((user) => {
+┊   ┊219┊      if (user.id === args.id || user.email === args.email) {
+┊   ┊220┊        return user;
+┊   ┊221┊      }
+┊   ┊222┊
+┊   ┊223┊      throw new ForbiddenError('Unauthorized');
+┊   ┊224┊    });
+┊   ┊225┊  },
+┊   ┊226┊};
```

[}]: #

And now let’s apply that logic to the Resolvers in `server/data/resolvers.js`:

[{]: <helper> (diffStep 7.9)

#### [Step 7.9: Apply logic to all Resolvers](https://github.com/srtucker22/chatty/commit/99d0d74)

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -7,7 +7,7 @@
 ┊ 7┊ 7┊import { Group, Message, User } from './connectors';
 ┊ 8┊ 8┊import { pubsub } from '../subscriptions';
 ┊ 9┊ 9┊import { JWT_SECRET } from '../config';
-┊10┊  ┊import { messageLogic } from './logic';
+┊  ┊10┊import { groupLogic, messageLogic, userLogic } from './logic';
 ┊11┊11┊
 ┊12┊12┊const MESSAGE_ADDED_TOPIC = 'messageAdded';
 ┊13┊13┊const GROUP_ADDED_TOPIC = 'groupAdded';
```
```diff
@@ -24,17 +24,11 @@
 ┊24┊24┊    },
 ┊25┊25┊  },
 ┊26┊26┊  Query: {
-┊27┊  ┊    group(_, args) {
-┊28┊  ┊      return Group.find({ where: args });
+┊  ┊27┊    group(_, args, ctx) {
+┊  ┊28┊      return groupLogic.query(_, args, ctx);
 ┊29┊29┊    },
-┊30┊  ┊    messages(_, args) {
-┊31┊  ┊      return Message.findAll({
-┊32┊  ┊        where: args,
-┊33┊  ┊        order: [['createdAt', 'DESC']],
-┊34┊  ┊      });
-┊35┊  ┊    },
-┊36┊  ┊    user(_, args) {
-┊37┊  ┊      return User.findOne({ where: args });
+┊  ┊30┊    user(_, args, ctx) {
+┊  ┊31┊      return userLogic.query(_, args, ctx);
 ┊38┊32┊    },
 ┊39┊33┊  },
 ┊40┊34┊  Mutation: {
```
```diff
@@ -46,48 +40,20 @@
 ┊46┊40┊          return message;
 ┊47┊41┊        });
 ┊48┊42┊    },
-┊49┊  ┊    createGroup(_, { name, userIds, userId }) {
-┊50┊  ┊      return User.findOne({ where: { id: userId } })
-┊51┊  ┊        .then(user => user.getFriends({ where: { id: { $in: userIds } } })
-┊52┊  ┊          .then(friends => Group.create({
-┊53┊  ┊            name,
-┊54┊  ┊            users: [user, ...friends],
-┊55┊  ┊          })
-┊56┊  ┊            .then(group => group.addUsers([user, ...friends])
-┊57┊  ┊              .then((res) => {
-┊58┊  ┊                // append the user list to the group object
-┊59┊  ┊                // to pass to pubsub so we can check members
-┊60┊  ┊                group.users = [user, ...friends];
-┊61┊  ┊                pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });
-┊62┊  ┊                return group;
-┊63┊  ┊              })),
-┊64┊  ┊          ),
-┊65┊  ┊        );
-┊66┊  ┊    },
-┊67┊  ┊    deleteGroup(_, { id }) {
-┊68┊  ┊      return Group.find({ where: id })
-┊69┊  ┊        .then(group => group.getUsers()
-┊70┊  ┊          .then(users => group.removeUsers(users))
-┊71┊  ┊          .then(() => Message.destroy({ where: { groupId: group.id } }))
-┊72┊  ┊          .then(() => group.destroy()),
-┊73┊  ┊        );
-┊74┊  ┊    },
-┊75┊  ┊    leaveGroup(_, { id, userId }) {
-┊76┊  ┊      return Group.findOne({ where: { id } })
-┊77┊  ┊        .then(group => group.removeUser(userId)
-┊78┊  ┊          .then(() => group.getUsers())
-┊79┊  ┊          .then((users) => {
-┊80┊  ┊            // if the last user is leaving, remove the group
-┊81┊  ┊            if (!users.length) {
-┊82┊  ┊              group.destroy();
-┊83┊  ┊            }
-┊84┊  ┊            return { id };
-┊85┊  ┊          }),
-┊86┊  ┊        );
+┊  ┊43┊    createGroup(_, args, ctx) {
+┊  ┊44┊      return groupLogic.createGroup(_, args, ctx).then((group) => {
+┊  ┊45┊        pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });
+┊  ┊46┊        return group;
+┊  ┊47┊      });
 ┊87┊48┊    },
-┊88┊  ┊    updateGroup(_, { id, name }) {
-┊89┊  ┊      return Group.findOne({ where: { id } })
-┊90┊  ┊        .then(group => group.update({ name }));
+┊  ┊49┊    deleteGroup(_, args, ctx) {
+┊  ┊50┊      return groupLogic.deleteGroup(_, args, ctx);
+┊  ┊51┊    },
+┊  ┊52┊    leaveGroup(_, args, ctx) {
+┊  ┊53┊      return groupLogic.leaveGroup(_, args, ctx);
+┊  ┊54┊    },
+┊  ┊55┊    updateGroup(_, args, ctx) {
+┊  ┊56┊      return groupLogic.updateGroup(_, args, ctx);
 ┊91┊57┊    },
 ┊92┊58┊    login(_, { email, password }, ctx) {
 ┊93┊59┊      // find user by email
```
```diff
@@ -162,88 +128,36 @@
 ┊162┊128┊    },
 ┊163┊129┊  },
 ┊164┊130┊  Group: {
-┊165┊   ┊    users(group) {
-┊166┊   ┊      return group.getUsers();
+┊   ┊131┊    users(group, args, ctx) {
+┊   ┊132┊      return groupLogic.users(group, args, ctx);
 ┊167┊133┊    },
-┊168┊   ┊    messages(group, { first, last, before, after }) {
-┊169┊   ┊      // base query -- get messages from the right group
-┊170┊   ┊      const where = { groupId: group.id };
-┊171┊   ┊
-┊172┊   ┊      // because we return messages from newest -> oldest
-┊173┊   ┊      // before actually means newer (id > cursor)
-┊174┊   ┊      // after actually means older (id < cursor)
-┊175┊   ┊
-┊176┊   ┊      if (before) {
-┊177┊   ┊        // convert base-64 to utf8 id
-┊178┊   ┊        where.id = { $gt: Buffer.from(before, 'base64').toString() };
-┊179┊   ┊      }
-┊180┊   ┊
-┊181┊   ┊      if (after) {
-┊182┊   ┊        where.id = { $lt: Buffer.from(after, 'base64').toString() };
-┊183┊   ┊      }
-┊184┊   ┊
-┊185┊   ┊      return Message.findAll({
-┊186┊   ┊        where,
-┊187┊   ┊        order: [['id', 'DESC']],
-┊188┊   ┊        limit: first || last,
-┊189┊   ┊      }).then((messages) => {
-┊190┊   ┊        const edges = messages.map(message => ({
-┊191┊   ┊          cursor: Buffer.from(message.id.toString()).toString('base64'), // convert id to cursor
-┊192┊   ┊          node: message, // the node is the message itself
-┊193┊   ┊        }));
-┊194┊   ┊
-┊195┊   ┊        return {
-┊196┊   ┊          edges,
-┊197┊   ┊          pageInfo: {
-┊198┊   ┊            hasNextPage() {
-┊199┊   ┊              if (messages.length < (last || first)) {
-┊200┊   ┊                return Promise.resolve(false);
-┊201┊   ┊              }
-┊202┊   ┊
-┊203┊   ┊              return Message.findOne({
-┊204┊   ┊                where: {
-┊205┊   ┊                  groupId: group.id,
-┊206┊   ┊                  id: {
-┊207┊   ┊                    [before ? '$gt' : '$lt']: messages[messages.length - 1].id,
-┊208┊   ┊                  },
-┊209┊   ┊                },
-┊210┊   ┊                order: [['id', 'DESC']],
-┊211┊   ┊              }).then(message => !!message);
-┊212┊   ┊            },
-┊213┊   ┊            hasPreviousPage() {
-┊214┊   ┊              return Message.findOne({
-┊215┊   ┊                where: {
-┊216┊   ┊                  groupId: group.id,
-┊217┊   ┊                  id: where.id,
-┊218┊   ┊                },
-┊219┊   ┊                order: [['id']],
-┊220┊   ┊              }).then(message => !!message);
-┊221┊   ┊            },
-┊222┊   ┊          },
-┊223┊   ┊        };
-┊224┊   ┊      });
+┊   ┊134┊    messages(group, args, ctx) {
+┊   ┊135┊      return groupLogic.messages(group, args, ctx);
 ┊225┊136┊    },
 ┊226┊137┊  },
 ┊227┊138┊  Message: {
-┊228┊   ┊    to(message) {
-┊229┊   ┊      return message.getGroup();
+┊   ┊139┊    to(message, args, ctx) {
+┊   ┊140┊      return messageLogic.to(message, args, ctx);
 ┊230┊141┊    },
-┊231┊   ┊    from(message) {
-┊232┊   ┊      return message.getUser();
+┊   ┊142┊    from(message, args, ctx) {
+┊   ┊143┊      return messageLogic.from(message, args, ctx);
 ┊233┊144┊    },
 ┊234┊145┊  },
 ┊235┊146┊  User: {
-┊236┊   ┊    messages(user) {
-┊237┊   ┊      return Message.findAll({
-┊238┊   ┊        where: { userId: user.id },
-┊239┊   ┊        order: [['createdAt', 'DESC']],
-┊240┊   ┊      });
+┊   ┊147┊    email(user, args, ctx) {
+┊   ┊148┊      return userLogic.email(user, args, ctx);
+┊   ┊149┊    },
+┊   ┊150┊    friends(user, args, ctx) {
+┊   ┊151┊      return userLogic.friends(user, args, ctx);
+┊   ┊152┊    },
+┊   ┊153┊    groups(user, args, ctx) {
+┊   ┊154┊      return userLogic.groups(user, args, ctx);
 ┊241┊155┊    },
-┊242┊   ┊    groups(user) {
-┊243┊   ┊      return user.getGroups();
+┊   ┊156┊    jwt(user, args, ctx) {
+┊   ┊157┊      return userLogic.jwt(user, args, ctx);
 ┊244┊158┊    },
-┊245┊   ┊    friends(user) {
-┊246┊   ┊      return user.getFriends();
+┊   ┊159┊    messages(user, args, ctx) {
+┊   ┊160┊      return userLogic.messages(user, args, ctx);
 ┊247┊161┊    },
 ┊248┊162┊  },
 ┊249┊163┊};
```

[}]: #

We also need to update our subscription filters with the user context. Fortunately, `withFilter` can return a `Boolean` or `Promise<Boolean>`.

[{]: <helper> (diffStep "7.10")

#### [Step 7.10: Apply user context to subscription filters](https://github.com/srtucker22/chatty/commit/bba8202)

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -105,24 +105,28 @@
 ┊105┊105┊    messageAdded: {
 ┊106┊106┊      subscribe: withFilter(
 ┊107┊107┊        () => pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),
-┊108┊   ┊        (payload, args) => {
-┊109┊   ┊          return Boolean(
-┊110┊   ┊            args.groupIds &&
-┊111┊   ┊            ~args.groupIds.indexOf(payload.messageAdded.groupId) &&
-┊112┊   ┊            args.userId !== payload.messageAdded.userId, // don't send to user creating message
-┊113┊   ┊          );
+┊   ┊108┊        (payload, args, ctx) => {
+┊   ┊109┊          return ctx.user.then((user) => {
+┊   ┊110┊            return Boolean(
+┊   ┊111┊              args.groupIds &&
+┊   ┊112┊              ~args.groupIds.indexOf(payload.messageAdded.groupId) &&
+┊   ┊113┊              user.id !== payload.messageAdded.userId, // don't send to user creating message
+┊   ┊114┊            );
+┊   ┊115┊          });
 ┊114┊116┊        },
 ┊115┊117┊      ),
 ┊116┊118┊    },
 ┊117┊119┊    groupAdded: {
 ┊118┊120┊      subscribe: withFilter(
 ┊119┊121┊        () => pubsub.asyncIterator(GROUP_ADDED_TOPIC),
-┊120┊   ┊        (payload, args) => {
-┊121┊   ┊          return Boolean(
-┊122┊   ┊            args.userId &&
-┊123┊   ┊            ~map(payload.groupAdded.users, 'id').indexOf(args.userId) &&
-┊124┊   ┊            args.userId !== payload.groupAdded.users[0].id, // don't send to user creating group
-┊125┊   ┊          );
+┊   ┊122┊        (payload, args, ctx) => {
+┊   ┊123┊          return ctx.user.then((user) => {
+┊   ┊124┊            return Boolean(
+┊   ┊125┊              args.userId &&
+┊   ┊126┊              ~map(payload.groupAdded.users, 'id').indexOf(args.userId) &&
+┊   ┊127┊              user.id !== payload.groupAdded.users[0].id, // don't send to user creating group
+┊   ┊128┊            );
+┊   ┊129┊          });
 ┊126┊130┊        },
 ┊127┊131┊      ),
 ┊128┊132┊    },
```

[}]: #

So much cleaner and **WAY** more secure!

## The Expired Password Problem
We still have one last thing that needs modifying in our authorization setup. When a user changes their password, we issue a new JWT, but the old JWT will still pass verification! This can become a serious problem if a hacker gets ahold of a user’s password. To close the loop on this issue, we can make a clever little adjustment to our `UserModel` database model to include a `version` parameter, which will be a counter that increments with each new password for the user. We’ll incorporate `version` into our JWT so only the newest JWT will pass our security. Let’s update `ApolloServer` and our Connectors and Resolvers accordingly:

[{]: <helper> (diffStep "7.11")

#### [Step 7.11: Apply versioning to JWT auth](https://github.com/srtucker22/chatty/commit/8045bc6)

##### Changed server&#x2F;data&#x2F;connectors.js
```diff
@@ -25,6 +25,7 @@
 ┊25┊25┊  email: { type: Sequelize.STRING },
 ┊26┊26┊  username: { type: Sequelize.STRING },
 ┊27┊27┊  password: { type: Sequelize.STRING },
+┊  ┊28┊  version: { type: Sequelize.INTEGER }, // version the password
 ┊28┊29┊});
 ┊29┊30┊
 ┊30┊31┊// users belong to multiple groups
```
```diff
@@ -58,6 +59,7 @@
 ┊58┊59┊    email: faker.internet.email(),
 ┊59┊60┊    username: faker.internet.userName(),
 ┊60┊61┊    password: hash,
+┊  ┊62┊    version: 1,
 ┊61┊63┊  }).then((user) => {
 ┊62┊64┊    console.log(
 ┊63┊65┊      '{email, username, password}',
```

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -66,6 +66,7 @@
 ┊66┊66┊              const token = jwt.sign({
 ┊67┊67┊                id: user.id,
 ┊68┊68┊                email: user.email,
+┊  ┊69┊                version: user.version,
 ┊69┊70┊              }, JWT_SECRET);
 ┊70┊71┊              user.jwt = token;
 ┊71┊72┊              ctx.user = Promise.resolve(user);
```
```diff
@@ -88,9 +89,10 @@
 ┊88┊89┊            email,
 ┊89┊90┊            password: hash,
 ┊90┊91┊            username: username || email,
+┊  ┊92┊            version: 1,
 ┊91┊93┊          })).then((user) => {
 ┊92┊94┊            const { id } = user;
-┊93┊  ┊            const token = jwt.sign({ id, email }, JWT_SECRET);
+┊  ┊95┊            const token = jwt.sign({ id, email, version: 1 }, JWT_SECRET);
 ┊94┊96┊            user.jwt = token;
 ┊95┊97┊            ctx.user = Promise.resolve(user);
 ┊96┊98┊            return user;
```

##### Changed server&#x2F;index.js
```diff
@@ -26,7 +26,7 @@
 ┊26┊26┊        credentialsRequired: false,
 ┊27┊27┊      })(req, res, (e) => {
 ┊28┊28┊        if (req.user) {
-┊29┊  ┊          resolve(User.findOne({ where: { id: req.user.id } }));
+┊  ┊29┊          resolve(User.findOne({ where: { id: req.user.id, version: req.user.version } }));
 ┊30┊30┊        } else {
 ┊31┊31┊          resolve(null);
 ┊32┊32┊        }
```

[}]: #

# Testing
It can’t be understated just how vital testing is to securing our code. Yet, like with most tutorials, testing is noticeably absent from this one. We’re not going to cover proper testing here because it really belongs in its own post and would make this already egregiously long post even longer.

For now, we’ll just use GraphQL Playground to make sure our code is performing as expected.

Here are the steps to test our protected GraphQL endpoint in GraphQL Playground:

1. Use the `signup` or `login` mutation to receive a JWT ![Login Image](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-11-1.png)
2. Apply the JWT to the Authorization Header for future requests and make whatever authorized `query` or `mutation` requests we want
![Query Image Success](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-11-2.png)
![Query Image Fail](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-11-3.png)
![Query Image Partial](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-11-4.png)

# JWT Authentication for Subscriptions
Our Queries and Mutations are secure, but our Subscriptions are wide open. Right now, any user could subscribe to new messages for all groups, or track when any group is created. The security we’ve already implemented limits the `Message` and `Group` fields a hacker could view, but that’s not good enough! Secure all the things!

In this workflow, we will only allow WebSocket connections once the user is authenticated. Whenever the user is logged off, we terminate the connection, and then reinitiate a new connection the next time they log in. This workflow is suitable for applications that don't require subscriptions while the user isn't logged in and makes it easier to defend against DOS attacks.

Just like with Queries and Mutations, we can pass a `context` parameter to our Subscriptions every time a user connects over WebSockets! When constructing `ApolloServer`, we can pass an `onConnect` parameter, which is a function that runs before every WebSocket connection. The `onConnect` function offers 2 parameters —  `connectionParams` and `webSocket` —  and should return a Promise that resolves the `context`.

`connectionParams` is where we will receive the JWT from the client. Inside `onConnect`, we will extract the `User` Promise from the JWT and replace return the `User` Promise as the context.

Let’s first update `ApolloServer` in `server/index.js` to use `onConnect` to validate the JWT and return a `context` with the `User` for subscriptions:

[{]: <helper> (diffStep 7.12)

#### [Step 7.12: Add onConnect to ApolloServer config](https://github.com/srtucker22/chatty/commit/84bb74f)

##### Changed server&#x2F;index.js
```diff
@@ -1,5 +1,6 @@
-┊1┊ ┊import { ApolloServer } from 'apollo-server';
+┊ ┊1┊import { ApolloServer, AuthenticationError } from 'apollo-server';
 ┊2┊2┊import jwt from 'express-jwt';
+┊ ┊3┊import jsonwebtoken from 'jsonwebtoken';
 ┊3┊4┊
 ┊4┊5┊import { typeDefs } from './data/schema';
 ┊5┊6┊import { mocks } from './data/mocks';
```
```diff
@@ -17,7 +18,7 @@
 ┊17┊18┊    // web socket subscriptions will return a connection
 ┊18┊19┊    if (connection) {
 ┊19┊20┊      // check connection for metadata
-┊20┊  ┊      return {};
+┊  ┊21┊      return connection.context;
 ┊21┊22┊    }
 ┊22┊23┊
 ┊23┊24┊    const user = new Promise((resolve, reject) => {
```
```diff
@@ -36,6 +37,34 @@
 ┊36┊37┊      user,
 ┊37┊38┊    };
 ┊38┊39┊  },
+┊  ┊40┊  subscriptions: {
+┊  ┊41┊    onConnect(connectionParams, websocket, wsContext) {
+┊  ┊42┊      const userPromise = new Promise((res, rej) => {
+┊  ┊43┊        if (connectionParams.jwt) {
+┊  ┊44┊          jsonwebtoken.verify(
+┊  ┊45┊            connectionParams.jwt, JWT_SECRET,
+┊  ┊46┊            (err, decoded) => {
+┊  ┊47┊              if (err) {
+┊  ┊48┊                rej(new AuthenticationError('No token'));
+┊  ┊49┊              }
+┊  ┊50┊
+┊  ┊51┊              res(User.findOne({ where: { id: decoded.id, version: decoded.version } }));
+┊  ┊52┊            },
+┊  ┊53┊          );
+┊  ┊54┊        } else {
+┊  ┊55┊          rej(new AuthenticationError('No token'));
+┊  ┊56┊        }
+┊  ┊57┊      });
+┊  ┊58┊
+┊  ┊59┊      return userPromise.then((user) => {
+┊  ┊60┊        if (user) {
+┊  ┊61┊          return { user: Promise.resolve(user) };
+┊  ┊62┊        }
+┊  ┊63┊
+┊  ┊64┊        return Promise.reject(new AuthenticationError('No user'));
+┊  ┊65┊      });
+┊  ┊66┊    },
+┊  ┊67┊  },
 ┊39┊68┊});
 ┊40┊69┊
 ┊41┊70┊server.listen({ port: PORT }).then(({ url }) => console.log(`🚀 Server ready at ${url}`));
```

[}]: #

First, `onConnect` will use `jsonwebtoken` to verify and decode `connectionParams.jwt` to extract a `User` from the database. It will do this work within a new Promise called `user`.

Second, we need to write our `subscriptionLogic` to validate whether this `User` is allowed to subscribe to this particular subscription:

[{]: <helper> (diffStep 7.13 files="server/data/logic.js")

#### [Step 7.13: Create subscriptionLogic](https://github.com/srtucker22/chatty/commit/9849422)

##### Changed server&#x2F;data&#x2F;logic.js
```diff
@@ -224,3 +224,28 @@
 ┊224┊224┊    });
 ┊225┊225┊  },
 ┊226┊226┊};
+┊   ┊227┊
+┊   ┊228┊export const subscriptionLogic = {
+┊   ┊229┊  groupAdded(params, args, ctx) {
+┊   ┊230┊    return getAuthenticatedUser(ctx)
+┊   ┊231┊      .then((user) => {
+┊   ┊232┊        if (user.id !== args.userId) {
+┊   ┊233┊          throw new ForbiddenError('Unauthorized');
+┊   ┊234┊        }
+┊   ┊235┊
+┊   ┊236┊        return Promise.resolve();
+┊   ┊237┊      });
+┊   ┊238┊  },
+┊   ┊239┊  messageAdded(params, args, ctx) {
+┊   ┊240┊    return getAuthenticatedUser(ctx)
+┊   ┊241┊      .then(user => user.getGroups({ where: { id: { $in: args.groupIds } }, attributes: ['id'] })
+┊   ┊242┊        .then((groups) => {
+┊   ┊243┊          // user attempted to subscribe to some groups without access
+┊   ┊244┊          if (args.groupIds.length > groups.length) {
+┊   ┊245┊            throw new ForbiddenError('Unauthorized');
+┊   ┊246┊          }
+┊   ┊247┊
+┊   ┊248┊          return Promise.resolve();
+┊   ┊249┊        }));
+┊   ┊250┊  },
+┊   ┊251┊};
```

[}]: #

Finally, we need a way to run this logic when the subscription will attempt to be initiated. This happens inside our resolvers when we run `pubsub.asyncIterator`, returning the `AsyncIterator` that will listen for events and trigger our server to send WebSocket emittions. We'll need to update this `AsyncIterator` generator to first validate through our `subscriptionLogic` and throw an error if the request is unauthorized. We can create a `pubsub.asyncAuthIterator` function that looks like `pubsub.asyncIterator`, but takes an extra `authPromise` argument that will need to resolve before any data gets passed from the `AsyncIterator` this function creates.

[{]: <helper> (diffStep 7.13 files="server/subscriptions.js")

#### [Step 7.13: Create subscriptionLogic](https://github.com/srtucker22/chatty/commit/9849422)

##### Changed server&#x2F;subscriptions.js
```diff
@@ -1,5 +1,24 @@
+┊  ┊ 1┊import { $$asyncIterator } from 'iterall';
 ┊ 1┊ 2┊import { PubSub } from 'apollo-server';
 ┊ 2┊ 3┊
 ┊ 3┊ 4┊export const pubsub = new PubSub();
 ┊ 4┊ 5┊
+┊  ┊ 6┊pubsub.asyncAuthIterator = (messages, authPromise) => {
+┊  ┊ 7┊  const asyncIterator = pubsub.asyncIterator(messages);
+┊  ┊ 8┊  return {
+┊  ┊ 9┊    next() {
+┊  ┊10┊      return authPromise.then(() => asyncIterator.next());
+┊  ┊11┊    },
+┊  ┊12┊    return() {
+┊  ┊13┊      return authPromise.then(() => asyncIterator.return());
+┊  ┊14┊    },
+┊  ┊15┊    throw(error) {
+┊  ┊16┊      return asyncIterator.throw(error);
+┊  ┊17┊    },
+┊  ┊18┊    [$$asyncIterator]() {
+┊  ┊19┊      return asyncIterator;
+┊  ┊20┊    },
+┊  ┊21┊  };
+┊  ┊22┊};
+┊  ┊23┊
 ┊ 5┊24┊export default pubsub;
```

[}]: #

We can stick this `pubsub.asyncAuthIterator` in our resolvers like so:

[{]: <helper> (diffStep 7.13 files="server/data/resolvers.js")

#### [Step 7.13: Create subscriptionLogic](https://github.com/srtucker22/chatty/commit/9849422)

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -7,7 +7,7 @@
 ┊ 7┊ 7┊import { Group, Message, User } from './connectors';
 ┊ 8┊ 8┊import { pubsub } from '../subscriptions';
 ┊ 9┊ 9┊import { JWT_SECRET } from '../config';
-┊10┊  ┊import { groupLogic, messageLogic, userLogic } from './logic';
+┊  ┊10┊import { groupLogic, messageLogic, userLogic, subscriptionLogic } from './logic';
 ┊11┊11┊
 ┊12┊12┊const MESSAGE_ADDED_TOPIC = 'messageAdded';
 ┊13┊13┊const GROUP_ADDED_TOPIC = 'groupAdded';
```
```diff
@@ -106,7 +106,10 @@
 ┊106┊106┊  Subscription: {
 ┊107┊107┊    messageAdded: {
 ┊108┊108┊      subscribe: withFilter(
-┊109┊   ┊        () => pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),
+┊   ┊109┊        (payload, args, ctx) => pubsub.asyncAuthIterator(
+┊   ┊110┊          MESSAGE_ADDED_TOPIC,
+┊   ┊111┊          subscriptionLogic.messageAdded(payload, args, ctx),
+┊   ┊112┊        ),
 ┊110┊113┊        (payload, args, ctx) => {
 ┊111┊114┊          return ctx.user.then((user) => {
 ┊112┊115┊            return Boolean(
```
```diff
@@ -120,7 +123,10 @@
 ┊120┊123┊    },
 ┊121┊124┊    groupAdded: {
 ┊122┊125┊      subscribe: withFilter(
-┊123┊   ┊        () => pubsub.asyncIterator(GROUP_ADDED_TOPIC),
+┊   ┊126┊        (payload, args, ctx) => pubsub.asyncAuthIterator(
+┊   ┊127┊          GROUP_ADDED_TOPIC,
+┊   ┊128┊          subscriptionLogic.groupAdded(payload, args, ctx),
+┊   ┊129┊        ),
 ┊124┊130┊        (payload, args, ctx) => {
 ┊125┊131┊          return ctx.user.then((user) => {
 ┊126┊132┊            return Boolean(
```

[}]: #

Unfortunately, there’s no easy way to currently test subscription context with GraphQL Playground, so let’s just hope the code does what it’s supposed to do and move on for now ¯\_(ツ)_/¯

## Now would be a good time to take a break!

# GraphQL Authentication in React Native
Our server is now only serving authenticated GraphQL, and our React Native client needs to catch up!

## Designing the Layout
First, let’s design the basic authentication UI/UX for our users.

If a user isn’t authenticated, we want to push a modal Screen asking them to login or sign up and then pop the Screen when they sign in.

Let’s start by creating a Signin screen (`client/src/screens/signin.screen.js`) to display our `login`/`signup` modal:

[{]: <helper> (diffStep 7.14)

#### [Step 7.14: Create Signup Screen](https://github.com/srtucker22/chatty/commit/cf59a3b)

##### Added client&#x2F;src&#x2F;screens&#x2F;signin.screen.js
```diff
@@ -0,0 +1,150 @@
+┊   ┊  1┊import React, { Component } from 'react';
+┊   ┊  2┊import PropTypes from 'prop-types';
+┊   ┊  3┊import {
+┊   ┊  4┊  ActivityIndicator,
+┊   ┊  5┊  KeyboardAvoidingView,
+┊   ┊  6┊  Button,
+┊   ┊  7┊  StyleSheet,
+┊   ┊  8┊  Text,
+┊   ┊  9┊  TextInput,
+┊   ┊ 10┊  TouchableOpacity,
+┊   ┊ 11┊  View,
+┊   ┊ 12┊} from 'react-native';
+┊   ┊ 13┊
+┊   ┊ 14┊const styles = StyleSheet.create({
+┊   ┊ 15┊  container: {
+┊   ┊ 16┊    flex: 1,
+┊   ┊ 17┊    justifyContent: 'center',
+┊   ┊ 18┊    backgroundColor: '#eeeeee',
+┊   ┊ 19┊    paddingHorizontal: 50,
+┊   ┊ 20┊  },
+┊   ┊ 21┊  inputContainer: {
+┊   ┊ 22┊    marginBottom: 20,
+┊   ┊ 23┊  },
+┊   ┊ 24┊  input: {
+┊   ┊ 25┊    height: 40,
+┊   ┊ 26┊    borderRadius: 4,
+┊   ┊ 27┊    marginVertical: 6,
+┊   ┊ 28┊    padding: 6,
+┊   ┊ 29┊    backgroundColor: 'rgba(0,0,0,0.2)',
+┊   ┊ 30┊  },
+┊   ┊ 31┊  loadingContainer: {
+┊   ┊ 32┊    left: 0,
+┊   ┊ 33┊    right: 0,
+┊   ┊ 34┊    top: 0,
+┊   ┊ 35┊    bottom: 0,
+┊   ┊ 36┊    position: 'absolute',
+┊   ┊ 37┊    flexDirection: 'row',
+┊   ┊ 38┊    justifyContent: 'center',
+┊   ┊ 39┊    alignItems: 'center',
+┊   ┊ 40┊  },
+┊   ┊ 41┊  switchContainer: {
+┊   ┊ 42┊    flexDirection: 'row',
+┊   ┊ 43┊    justifyContent: 'center',
+┊   ┊ 44┊    marginTop: 12,
+┊   ┊ 45┊  },
+┊   ┊ 46┊  switchAction: {
+┊   ┊ 47┊    paddingHorizontal: 4,
+┊   ┊ 48┊    color: 'blue',
+┊   ┊ 49┊  },
+┊   ┊ 50┊  submit: {
+┊   ┊ 51┊    marginVertical: 6,
+┊   ┊ 52┊  },
+┊   ┊ 53┊});
+┊   ┊ 54┊
+┊   ┊ 55┊class Signin extends Component {
+┊   ┊ 56┊  static navigationOptions = {
+┊   ┊ 57┊    title: 'Chatty',
+┊   ┊ 58┊    headerLeft: null,
+┊   ┊ 59┊  };
+┊   ┊ 60┊
+┊   ┊ 61┊  constructor(props) {
+┊   ┊ 62┊    super(props);
+┊   ┊ 63┊    this.state = {
+┊   ┊ 64┊      view: 'login',
+┊   ┊ 65┊    };
+┊   ┊ 66┊    this.login = this.login.bind(this);
+┊   ┊ 67┊    this.signup = this.signup.bind(this);
+┊   ┊ 68┊    this.switchView = this.switchView.bind(this);
+┊   ┊ 69┊  }
+┊   ┊ 70┊
+┊   ┊ 71┊  // fake for now
+┊   ┊ 72┊  login() {
+┊   ┊ 73┊    console.log('logging in');
+┊   ┊ 74┊    this.setState({ loading: true });
+┊   ┊ 75┊    setTimeout(() => {
+┊   ┊ 76┊      console.log('signing up');
+┊   ┊ 77┊      this.props.navigation.goBack();
+┊   ┊ 78┊    }, 1000);
+┊   ┊ 79┊  }
+┊   ┊ 80┊
+┊   ┊ 81┊  // fake for now
+┊   ┊ 82┊  signup() {
+┊   ┊ 83┊    console.log('signing up');
+┊   ┊ 84┊    this.setState({ loading: true });
+┊   ┊ 85┊    setTimeout(() => {
+┊   ┊ 86┊      this.props.navigation.goBack();
+┊   ┊ 87┊    }, 1000);
+┊   ┊ 88┊  }
+┊   ┊ 89┊
+┊   ┊ 90┊  switchView() {
+┊   ┊ 91┊    this.setState({
+┊   ┊ 92┊      view: this.state.view === 'signup' ? 'login' : 'signup',
+┊   ┊ 93┊    });
+┊   ┊ 94┊  }
+┊   ┊ 95┊
+┊   ┊ 96┊  render() {
+┊   ┊ 97┊    const { view } = this.state;
+┊   ┊ 98┊
+┊   ┊ 99┊    return (
+┊   ┊100┊      <KeyboardAvoidingView
+┊   ┊101┊        behavior={'padding'}
+┊   ┊102┊        style={styles.container}
+┊   ┊103┊      >
+┊   ┊104┊        {this.state.loading ?
+┊   ┊105┊          <View style={styles.loadingContainer}>
+┊   ┊106┊            <ActivityIndicator />
+┊   ┊107┊          </View> : undefined}
+┊   ┊108┊        <View style={styles.inputContainer}>
+┊   ┊109┊          <TextInput
+┊   ┊110┊            onChangeText={email => this.setState({ email })}
+┊   ┊111┊            placeholder={'Email'}
+┊   ┊112┊            style={styles.input}
+┊   ┊113┊          />
+┊   ┊114┊          <TextInput
+┊   ┊115┊            onChangeText={password => this.setState({ password })}
+┊   ┊116┊            placeholder={'Password'}
+┊   ┊117┊            secureTextEntry
+┊   ┊118┊            style={styles.input}
+┊   ┊119┊          />
+┊   ┊120┊        </View>
+┊   ┊121┊        <Button
+┊   ┊122┊          onPress={this[view]}
+┊   ┊123┊          style={styles.submit}
+┊   ┊124┊          title={view === 'signup' ? 'Sign up' : 'Login'}
+┊   ┊125┊          disabled={this.state.loading}
+┊   ┊126┊        />
+┊   ┊127┊        <View style={styles.switchContainer}>
+┊   ┊128┊          <Text>
+┊   ┊129┊            { view === 'signup' ?
+┊   ┊130┊              'Already have an account?' : 'New to Chatty?' }
+┊   ┊131┊          </Text>
+┊   ┊132┊          <TouchableOpacity
+┊   ┊133┊            onPress={this.switchView}
+┊   ┊134┊          >
+┊   ┊135┊            <Text style={styles.switchAction}>
+┊   ┊136┊              {view === 'login' ? 'Sign up' : 'Login'}
+┊   ┊137┊            </Text>
+┊   ┊138┊          </TouchableOpacity>
+┊   ┊139┊        </View>
+┊   ┊140┊      </KeyboardAvoidingView>
+┊   ┊141┊    );
+┊   ┊142┊  }
+┊   ┊143┊}
+┊   ┊144┊Signin.propTypes = {
+┊   ┊145┊  navigation: PropTypes.shape({
+┊   ┊146┊    goBack: PropTypes.func,
+┊   ┊147┊  }),
+┊   ┊148┊};
+┊   ┊149┊
+┊   ┊150┊export default Signin;
```

[}]: #

Next, we’ll add `Signin` to our Navigation. We'll also make sure the `USER_QUERY` attached to `AppWithNavigationState` gets skipped and doesn't query for anything for now. We don’t want to run any queries until a user officially signs in. Right now, we’re just testing the layout, so we don’t want queries to run at all no matter what. `graphql` let’s us pass a `skip` function as an optional parameter to our queries to skip their execution. We can update the code in `client/src/navigation.js` as follows:

[{]: <helper> (diffStep 7.15 files="client/src/navigation.js")

#### [Step 7.15: Add Signin to navigation and skip queries](https://github.com/srtucker22/chatty/commit/5e8c2fe)

##### Changed client&#x2F;src&#x2F;navigation.js
```diff
@@ -17,6 +17,7 @@
 ┊17┊17┊import FinalizeGroup from './screens/finalize-group.screen';
 ┊18┊18┊import GroupDetails from './screens/group-details.screen';
 ┊19┊19┊import NewGroup from './screens/new-group.screen';
+┊  ┊20┊import Signin from './screens/signin.screen';
 ┊20┊21┊
 ┊21┊22┊import { USER_QUERY } from './graphql/user.query';
 ┊22┊23┊import MESSAGE_ADDED_SUBSCRIPTION from './graphql/message-added.subscription';
```
```diff
@@ -59,6 +60,7 @@
 ┊59┊60┊
 ┊60┊61┊const AppNavigator = StackNavigator({
 ┊61┊62┊  Main: { screen: MainScreenNavigator },
+┊  ┊63┊  Signin: { screen: Signin },
 ┊62┊64┊  Messages: { screen: Messages },
 ┊63┊65┊  GroupDetails: { screen: GroupDetails },
 ┊64┊66┊  NewGroup: { screen: NewGroup },
```
```diff
@@ -164,6 +166,7 @@
 ┊164┊166┊});
 ┊165┊167┊
 ┊166┊168┊const userQuery = graphql(USER_QUERY, {
+┊   ┊169┊  skip: ownProps => true, // fake it -- we'll use ownProps with auth
 ┊167┊170┊  options: () => ({ variables: { id: 1 } }), // fake the user for now
 ┊168┊171┊  props: ({ data: { loading, user, refetch, subscribeToMore } }) => ({
 ┊169┊172┊    loading,
```

[}]: #

Lastly, we need to modify the `Groups` screen to push the `Signin` modal and skip querying for anything:

[{]: <helper> (diffStep 7.15 files="client/src/screens/groups.screen.js")

#### [Step 7.15: Add Signin to navigation and skip queries](https://github.com/srtucker22/chatty/commit/5e8c2fe)

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
```diff
@@ -95,6 +95,9 @@
 ┊ 95┊ 95┊  onPress: PropTypes.func.isRequired,
 ┊ 96┊ 96┊};
 ┊ 97┊ 97┊
+┊   ┊ 98┊// we'll fake signin for now
+┊   ┊ 99┊let IS_SIGNED_IN = false;
+┊   ┊100┊
 ┊ 98┊101┊class Group extends Component {
 ┊ 99┊102┊  constructor(props) {
 ┊100┊103┊    super(props);
```
```diff
@@ -169,8 +172,19 @@
 ┊169┊172┊    this.onRefresh = this.onRefresh.bind(this);
 ┊170┊173┊  }
 ┊171┊174┊
+┊   ┊175┊  componentDidMount() {
+┊   ┊176┊    if (!IS_SIGNED_IN) {
+┊   ┊177┊      IS_SIGNED_IN = true;
+┊   ┊178┊
+┊   ┊179┊      const { navigate } = this.props.navigation;
+┊   ┊180┊
+┊   ┊181┊      navigate('Signin');
+┊   ┊182┊    }
+┊   ┊183┊  }
+┊   ┊184┊
 ┊172┊185┊  onRefresh() {
 ┊173┊186┊    this.props.refetch();
+┊   ┊187┊    // faking unauthorized status
 ┊174┊188┊  }
 ┊175┊189┊
 ┊176┊190┊  keyExtractor = item => item.id.toString();
```
```diff
@@ -243,6 +257,7 @@
 ┊243┊257┊};
 ┊244┊258┊
 ┊245┊259┊const userQuery = graphql(USER_QUERY, {
+┊   ┊260┊  skip: ownProps => true, // fake it -- we'll use ownProps with auth
 ┊246┊261┊  options: () => ({ variables: { id: 1 } }), // fake the user for now
 ┊247┊262┊  props: ({ data: { loading, networkStatus, refetch, user } }) => ({
 ┊248┊263┊    loading, networkStatus, refetch, user,
```

[}]: #

Let’s test out our layout: ![Fake Signin Gif](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-15.gif)

# Persisted authentication with React Native and Redux
Time to add authentication infrastructure to our React Native client! When a user signs up or logs in, the server is going to return a JWT. Whenever the client makes a GraphQL HTTP request to the server, it needs to pass the JWT in the Authorization Header to verify the request is being sent by the user.

Once we have a JWT, we can use it forever or until we set it to expire. Therefore, we want to store the JWT in our app’s storage so users don’t have to log in every time they restart the app . We’re also going to want quick access to the JWT for any GraphQL request while the user is active. We can use a combination of [`redux`](http://redux.js.org/), [`redux-persist`](https://github.com/rt2zz/redux-persist), and [`AsyncStorage`](https://facebook.github.io/react-native/docs/asyncstorage.html) to efficiently meet all our demands!

```sh
# make sure you add this package to the client!!!
cd client
npm i redux redux-persist redux-thunk seamless-immutable
```

[`redux`](http://redux.js.org/) is the **BOMB**. If you don’t know Redux, [**learn Redux!**](https://egghead.io/courses/getting-started-with-redux)

[`redux-persist`](https://github.com/rt2zz/redux-persist) is an incredible package which let’s us store Redux state in a bunch of different storage engines and rehydrate our Redux store when we restart our app.

[`redux-thunk`](https://github.com/gaearon/redux-thunk) will let us return functions and use Promises to dispatch Redux actions.

[`seamless-immutable`](https://github.com/rtfeldman/seamless-immutable) will help us use Immutable JS data structures within Redux that are backwards-compatible with normal Arrays and Objects.

First, let’s create a reducer for our auth data. We’ll create a new folder `client/src/reducers` for our reducer files to live and create a new file `client/src/reducers/auth.reducer.js` for the auth reducer:

[{]: <helper> (diffStep 7.16 files="client/src/reducers/auth.reducer.js")

#### [Step 7.16: Create auth reducer](https://github.com/srtucker22/chatty/commit/d6bd99d)

##### Added client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
```diff
@@ -0,0 +1,14 @@
+┊  ┊ 1┊import Immutable from 'seamless-immutable';
+┊  ┊ 2┊
+┊  ┊ 3┊const initialState = Immutable({
+┊  ┊ 4┊  loading: true,
+┊  ┊ 5┊});
+┊  ┊ 6┊
+┊  ┊ 7┊const auth = (state = initialState, action) => {
+┊  ┊ 8┊  switch (action.type) {
+┊  ┊ 9┊    default:
+┊  ┊10┊      return state;
+┊  ┊11┊  }
+┊  ┊12┊};
+┊  ┊13┊
+┊  ┊14┊export default auth;
```

[}]: #

The initial state for store.auth will be `{ loading: true }`. We can combine the auth reducer into our store in `client/src/app.js`:

[{]: <helper> (diffStep 7.17)

#### [Step 7.17: Combine auth reducer with reducers](https://github.com/srtucker22/chatty/commit/a5f63c2)

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -18,6 +18,7 @@
 ┊18┊18┊  navigationReducer,
 ┊19┊19┊  navigationMiddleware,
 ┊20┊20┊} from './navigation';
+┊  ┊21┊import auth from './reducers/auth.reducer';
 ┊21┊22┊
 ┊22┊23┊const URL = 'localhost:8080'; // set your comp's url here
 ┊23┊24┊
```
```diff
@@ -25,6 +26,7 @@
 ┊25┊26┊  combineReducers({
 ┊26┊27┊    apollo: apolloReducer,
 ┊27┊28┊    nav: navigationReducer,
+┊  ┊29┊    auth,
 ┊28┊30┊  }),
 ┊29┊31┊  {}, // initial state
 ┊30┊32┊  composeWithDevTools(
```

[}]: #

Now let’s add `thunk` middleware and persistence with `redux-persist` and `AsyncStorage` to our store in `client/src/app.js`:

[{]: <helper> (diffStep 7.18)

#### [Step 7.18: Add persistent storage](https://github.com/srtucker22/chatty/commit/f3e0fde)

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -1,4 +1,7 @@
 ┊1┊1┊import React, { Component } from 'react';
+┊ ┊2┊import {
+┊ ┊3┊  AsyncStorage,
+┊ ┊4┊} from 'react-native';
 ┊2┊5┊
 ┊3┊6┊import { ApolloClient } from 'apollo-client';
 ┊4┊7┊import { ApolloLink } from 'apollo-link';
```
```diff
@@ -13,6 +16,9 @@
 ┊13┊16┊import { WebSocketLink } from 'apollo-link-ws';
 ┊14┊17┊import { getMainDefinition } from 'apollo-utilities';
 ┊15┊18┊import { SubscriptionClient } from 'subscriptions-transport-ws';
+┊  ┊19┊import { PersistGate } from 'redux-persist/lib/integration/react';
+┊  ┊20┊import { persistStore, persistCombineReducers } from 'redux-persist';
+┊  ┊21┊import thunk from 'redux-thunk';
 ┊16┊22┊
 ┊17┊23┊import AppWithNavigationState, {
 ┊18┊24┊  navigationReducer,
```
```diff
@@ -22,18 +28,29 @@
 ┊22┊28┊
 ┊23┊29┊const URL = 'localhost:8080'; // set your comp's url here
 ┊24┊30┊
+┊  ┊31┊const config = {
+┊  ┊32┊  key: 'root',
+┊  ┊33┊  storage: AsyncStorage,
+┊  ┊34┊  blacklist: ['nav', 'apollo'], // don't persist nav for now
+┊  ┊35┊};
+┊  ┊36┊
+┊  ┊37┊const reducer = persistCombineReducers(config, {
+┊  ┊38┊  apollo: apolloReducer,
+┊  ┊39┊  nav: navigationReducer,
+┊  ┊40┊  auth,
+┊  ┊41┊});
+┊  ┊42┊
 ┊25┊43┊const store = createStore(
-┊26┊  ┊  combineReducers({
-┊27┊  ┊    apollo: apolloReducer,
-┊28┊  ┊    nav: navigationReducer,
-┊29┊  ┊    auth,
-┊30┊  ┊  }),
+┊  ┊44┊  reducer,
 ┊31┊45┊  {}, // initial state
 ┊32┊46┊  composeWithDevTools(
-┊33┊  ┊    applyMiddleware(navigationMiddleware),
+┊  ┊47┊    applyMiddleware(thunk, navigationMiddleware),
 ┊34┊48┊  ),
 ┊35┊49┊);
 ┊36┊50┊
+┊  ┊51┊// persistent storage
+┊  ┊52┊const persistor = persistStore(store);
+┊  ┊53┊
 ┊37┊54┊const cache = new ReduxCache({ store });
 ┊38┊55┊
 ┊39┊56┊const reduxLink = new ReduxLink(store);
```
```diff
@@ -83,7 +100,9 @@
 ┊ 83┊100┊    return (
 ┊ 84┊101┊      <ApolloProvider client={client}>
 ┊ 85┊102┊        <Provider store={store}>
-┊ 86┊   ┊          <AppWithNavigationState />
+┊   ┊103┊          <PersistGate persistor={persistor}>
+┊   ┊104┊            <AppWithNavigationState />
+┊   ┊105┊          </PersistGate>
 ┊ 87┊106┊        </Provider>
 ┊ 88┊107┊      </ApolloProvider>
 ┊ 89┊108┊    );
```

[}]: #

We have set our store data (excluding `apollo`) to persist via React Native’s `AsyncStorage` and to automatically rehydrate the store when the client restarts the app. When the app restarts, a `REHYDRATE` action will execute asyncronously with all the data persisted from the last session. We need to handle that action and properly update our store in our `auth` reducer:

[{]: <helper> (diffStep 7.19)

#### [Step 7.19: Handle rehydration in auth reducer](https://github.com/srtucker22/chatty/commit/7731a6f)

##### Changed client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
```diff
@@ -1,3 +1,4 @@
+┊ ┊1┊import { REHYDRATE } from 'redux-persist';
 ┊1┊2┊import Immutable from 'seamless-immutable';
 ┊2┊3┊
 ┊3┊4┊const initialState = Immutable({
```
```diff
@@ -6,6 +7,10 @@
 ┊ 6┊ 7┊
 ┊ 7┊ 8┊const auth = (state = initialState, action) => {
 ┊ 8┊ 9┊  switch (action.type) {
+┊  ┊10┊    case REHYDRATE:
+┊  ┊11┊      // convert persisted data to Immutable and confirm rehydration
+┊  ┊12┊      return Immutable(action.payload.auth || state)
+┊  ┊13┊        .set('loading', false);
 ┊ 9┊14┊    default:
 ┊10┊15┊      return state;
 ┊11┊16┊  }
```

[}]: #

The `auth` state will be `{ loading: true }` until we rehydrate our persisted state.

When the user successfully signs up or logs in, we need to store the user’s id and their JWT within auth. We also need to clear this information when they log out. Let’s create a constants folder `client/src/constants` and file `client/src/constants/constants.js` where we can start declaring Redux action types and write two for setting the current user and logging out:

[{]: <helper> (diffStep "7.20")

#### [Step 7.20: Create constants](https://github.com/srtucker22/chatty/commit/1c7c83d)

##### Added client&#x2F;src&#x2F;constants&#x2F;constants.js
```diff
@@ -0,0 +1,3 @@
+┊ ┊1┊// auth constants
+┊ ┊2┊export const LOGOUT = 'LOGOUT';
+┊ ┊3┊export const SET_CURRENT_USER = 'SET_CURRENT_USER';
```

[}]: #

We can add these constants to our `auth` reducer now:

[{]: <helper> (diffStep 7.21)

#### [Step 7.21: Handle login/logout in auth reducer](https://github.com/srtucker22/chatty/commit/f82bf5e)

##### Changed client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
```diff
@@ -1,6 +1,8 @@
 ┊1┊1┊import { REHYDRATE } from 'redux-persist';
 ┊2┊2┊import Immutable from 'seamless-immutable';
 ┊3┊3┊
+┊ ┊4┊import { LOGOUT, SET_CURRENT_USER } from '../constants/constants';
+┊ ┊5┊
 ┊4┊6┊const initialState = Immutable({
 ┊5┊7┊  loading: true,
 ┊6┊8┊});
```
```diff
@@ -9,8 +11,13 @@
 ┊ 9┊11┊  switch (action.type) {
 ┊10┊12┊    case REHYDRATE:
 ┊11┊13┊      // convert persisted data to Immutable and confirm rehydration
-┊12┊  ┊      return Immutable(action.payload.auth || state)
+┊  ┊14┊      const { payload = {} } = action;
+┊  ┊15┊      return Immutable(payload.auth || state)
 ┊13┊16┊        .set('loading', false);
+┊  ┊17┊    case SET_CURRENT_USER:
+┊  ┊18┊      return state.merge(action.user);
+┊  ┊19┊    case LOGOUT:
+┊  ┊20┊      return Immutable({ loading: false });
 ┊14┊21┊    default:
 ┊15┊22┊      return state;
 ┊16┊23┊  }
```

[}]: #

The `SET_CURRENT_USER` and `LOGOUT` action types will need to get triggered by `ActionCreators`. Let’s put those in a new folder `client/src/actions` and a new file `client/src/actions/auth.actions.js`:

[{]: <helper> (diffStep 7.22)

#### [Step 7.22: Create auth actions](https://github.com/srtucker22/chatty/commit/f41dc69)

##### Added client&#x2F;src&#x2F;actions&#x2F;auth.actions.js
```diff
@@ -0,0 +1,12 @@
+┊  ┊ 1┊import { client } from '../app';
+┊  ┊ 2┊import { SET_CURRENT_USER, LOGOUT } from '../constants/constants';
+┊  ┊ 3┊
+┊  ┊ 4┊export const setCurrentUser = user => ({
+┊  ┊ 5┊  type: SET_CURRENT_USER,
+┊  ┊ 6┊  user,
+┊  ┊ 7┊});
+┊  ┊ 8┊
+┊  ┊ 9┊export const logout = () => {
+┊  ┊10┊  client.resetStore();
+┊  ┊11┊  return { type: LOGOUT };
+┊  ┊12┊};
```

[}]: #

When `logout` is called, we’ll clear all auth data by dispatching `LOGOUT` and also all data in the apollo store by calling [`client.resetStore`](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient.resetStore).

Let’s tie everything together. We’ll update the `Signin` screen to use our login and signup mutations, and dispatch `setCurrentUser` with the mutation results (the JWT and user’s id).

First we’ll create files for our `login` and `signup` mutations:

[{]: <helper> (diffStep 7.23)

#### [Step 7.23: Create login and signup mutations](https://github.com/srtucker22/chatty/commit/b9d06d6)

##### Added client&#x2F;src&#x2F;graphql&#x2F;login.mutation.js
```diff
@@ -0,0 +1,13 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊const LOGIN_MUTATION = gql`
+┊  ┊ 4┊  mutation login($email: String!, $password: String!) {
+┊  ┊ 5┊    login(email: $email, password: $password) {
+┊  ┊ 6┊      id
+┊  ┊ 7┊      jwt
+┊  ┊ 8┊      username
+┊  ┊ 9┊    }
+┊  ┊10┊  }
+┊  ┊11┊`;
+┊  ┊12┊
+┊  ┊13┊export default LOGIN_MUTATION;
```

##### Added client&#x2F;src&#x2F;graphql&#x2F;signup.mutation.js
```diff
@@ -0,0 +1,13 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊const SIGNUP_MUTATION = gql`
+┊  ┊ 4┊  mutation signup($email: String!, $password: String!) {
+┊  ┊ 5┊    signup(email: $email, password: $password) {
+┊  ┊ 6┊      id
+┊  ┊ 7┊      jwt
+┊  ┊ 8┊      username
+┊  ┊ 9┊    }
+┊  ┊10┊  }
+┊  ┊11┊`;
+┊  ┊12┊
+┊  ┊13┊export default SIGNUP_MUTATION;
```

[}]: #

We connect these mutations and our Redux store to the `Signin` component with `compose` and `connect`:

[{]: <helper> (diffStep 7.24)

#### [Step 7.24: Add login and signup mutations to Signin screen](https://github.com/srtucker22/chatty/commit/49886b1)

##### Changed client&#x2F;src&#x2F;screens&#x2F;signin.screen.js
```diff
@@ -2,6 +2,7 @@
 ┊2┊2┊import PropTypes from 'prop-types';
 ┊3┊3┊import {
 ┊4┊4┊  ActivityIndicator,
+┊ ┊5┊  Alert,
 ┊5┊6┊  KeyboardAvoidingView,
 ┊6┊7┊  Button,
 ┊7┊8┊  StyleSheet,
```
```diff
@@ -10,6 +11,14 @@
 ┊10┊11┊  TouchableOpacity,
 ┊11┊12┊  View,
 ┊12┊13┊} from 'react-native';
+┊  ┊14┊import { graphql, compose } from 'react-apollo';
+┊  ┊15┊import { connect } from 'react-redux';
+┊  ┊16┊
+┊  ┊17┊import {
+┊  ┊18┊  setCurrentUser,
+┊  ┊19┊} from '../actions/auth.actions';
+┊  ┊20┊import LOGIN_MUTATION from '../graphql/login.mutation';
+┊  ┊21┊import SIGNUP_MUTATION from '../graphql/signup.mutation';
 ┊13┊22┊
 ┊14┊23┊const styles = StyleSheet.create({
 ┊15┊24┊  container: {
```
```diff
@@ -52,6 +61,10 @@
 ┊52┊61┊  },
 ┊53┊62┊});
 ┊54┊63┊
+┊  ┊64┊function capitalizeFirstLetter(string) {
+┊  ┊65┊  return string[0].toUpperCase() + string.slice(1);
+┊  ┊66┊}
+┊  ┊67┊
 ┊55┊68┊class Signin extends Component {
 ┊56┊69┊  static navigationOptions = {
 ┊57┊70┊    title: 'Chatty',
```
```diff
@@ -60,6 +73,11 @@
 ┊60┊73┊
 ┊61┊74┊  constructor(props) {
 ┊62┊75┊    super(props);
+┊  ┊76┊
+┊  ┊77┊    if (props.auth && props.auth.jwt) {
+┊  ┊78┊      props.navigation.goBack();
+┊  ┊79┊    }
+┊  ┊80┊
 ┊63┊81┊    this.state = {
 ┊64┊82┊      view: 'login',
 ┊65┊83┊    };
```
```diff
@@ -68,23 +86,61 @@
 ┊ 68┊ 86┊    this.switchView = this.switchView.bind(this);
 ┊ 69┊ 87┊  }
 ┊ 70┊ 88┊
-┊ 71┊   ┊  // fake for now
+┊   ┊ 89┊  componentWillReceiveProps(nextProps) {
+┊   ┊ 90┊    if (nextProps.auth.jwt) {
+┊   ┊ 91┊      nextProps.navigation.goBack();
+┊   ┊ 92┊    }
+┊   ┊ 93┊  }
+┊   ┊ 94┊
 ┊ 72┊ 95┊  login() {
-┊ 73┊   ┊    console.log('logging in');
-┊ 74┊   ┊    this.setState({ loading: true });
-┊ 75┊   ┊    setTimeout(() => {
-┊ 76┊   ┊      console.log('signing up');
-┊ 77┊   ┊      this.props.navigation.goBack();
-┊ 78┊   ┊    }, 1000);
+┊   ┊ 96┊    const { email, password } = this.state;
+┊   ┊ 97┊
+┊   ┊ 98┊    this.setState({
+┊   ┊ 99┊      loading: true,
+┊   ┊100┊    });
+┊   ┊101┊
+┊   ┊102┊    this.props.login({ email, password })
+┊   ┊103┊      .then(({ data: { login: user } }) => {
+┊   ┊104┊        this.props.dispatch(setCurrentUser(user));
+┊   ┊105┊        this.setState({
+┊   ┊106┊          loading: false,
+┊   ┊107┊        });
+┊   ┊108┊      }).catch((error) => {
+┊   ┊109┊        this.setState({
+┊   ┊110┊          loading: false,
+┊   ┊111┊        });
+┊   ┊112┊        Alert.alert(
+┊   ┊113┊          `${capitalizeFirstLetter(this.state.view)} error`,
+┊   ┊114┊          error.message,
+┊   ┊115┊          [
+┊   ┊116┊            { text: 'OK', onPress: () => console.log('OK pressed') }, // eslint-disable-line no-console
+┊   ┊117┊            { text: 'Forgot password', onPress: () => console.log('Forgot Pressed'), style: 'cancel' }, // eslint-disable-line no-console
+┊   ┊118┊          ],
+┊   ┊119┊        );
+┊   ┊120┊      });
 ┊ 79┊121┊  }
 ┊ 80┊122┊
-┊ 81┊   ┊  // fake for now
 ┊ 82┊123┊  signup() {
-┊ 83┊   ┊    console.log('signing up');
-┊ 84┊   ┊    this.setState({ loading: true });
-┊ 85┊   ┊    setTimeout(() => {
-┊ 86┊   ┊      this.props.navigation.goBack();
-┊ 87┊   ┊    }, 1000);
+┊   ┊124┊    this.setState({
+┊   ┊125┊      loading: true,
+┊   ┊126┊    });
+┊   ┊127┊    const { email, password } = this.state;
+┊   ┊128┊    this.props.signup({ email, password })
+┊   ┊129┊      .then(({ data: { signup: user } }) => {
+┊   ┊130┊        this.props.dispatch(setCurrentUser(user));
+┊   ┊131┊        this.setState({
+┊   ┊132┊          loading: false,
+┊   ┊133┊        });
+┊   ┊134┊      }).catch((error) => {
+┊   ┊135┊        this.setState({
+┊   ┊136┊          loading: false,
+┊   ┊137┊        });
+┊   ┊138┊        Alert.alert(
+┊   ┊139┊          `${capitalizeFirstLetter(this.state.view)} error`,
+┊   ┊140┊          error.message,
+┊   ┊141┊          [{ text: 'OK', onPress: () => console.log('OK pressed') }],  // eslint-disable-line no-console
+┊   ┊142┊        );
+┊   ┊143┊      });
 ┊ 88┊144┊  }
 ┊ 89┊145┊
 ┊ 90┊146┊  switchView() {
```
```diff
@@ -122,7 +178,7 @@
 ┊122┊178┊          onPress={this[view]}
 ┊123┊179┊          style={styles.submit}
 ┊124┊180┊          title={view === 'signup' ? 'Sign up' : 'Login'}
-┊125┊   ┊          disabled={this.state.loading}
+┊   ┊181┊          disabled={this.state.loading || !!this.props.auth.jwt}
 ┊126┊182┊        />
 ┊127┊183┊        <View style={styles.switchContainer}>
 ┊128┊184┊          <Text>
```
```diff
@@ -145,6 +201,39 @@
 ┊145┊201┊  navigation: PropTypes.shape({
 ┊146┊202┊    goBack: PropTypes.func,
 ┊147┊203┊  }),
+┊   ┊204┊  auth: PropTypes.shape({
+┊   ┊205┊    loading: PropTypes.bool,
+┊   ┊206┊    jwt: PropTypes.string,
+┊   ┊207┊  }),
+┊   ┊208┊  dispatch: PropTypes.func.isRequired,
+┊   ┊209┊  login: PropTypes.func.isRequired,
+┊   ┊210┊  signup: PropTypes.func.isRequired,
 ┊148┊211┊};
 ┊149┊212┊
-┊150┊   ┊export default Signin;
+┊   ┊213┊const login = graphql(LOGIN_MUTATION, {
+┊   ┊214┊  props: ({ mutate }) => ({
+┊   ┊215┊    login: ({ email, password }) =>
+┊   ┊216┊      mutate({
+┊   ┊217┊        variables: { email, password },
+┊   ┊218┊      }),
+┊   ┊219┊  }),
+┊   ┊220┊});
+┊   ┊221┊
+┊   ┊222┊const signup = graphql(SIGNUP_MUTATION, {
+┊   ┊223┊  props: ({ mutate }) => ({
+┊   ┊224┊    signup: ({ email, password }) =>
+┊   ┊225┊      mutate({
+┊   ┊226┊        variables: { email, password },
+┊   ┊227┊      }),
+┊   ┊228┊  }),
+┊   ┊229┊});
+┊   ┊230┊
+┊   ┊231┊const mapStateToProps = ({ auth }) => ({
+┊   ┊232┊  auth,
+┊   ┊233┊});
+┊   ┊234┊
+┊   ┊235┊export default compose(
+┊   ┊236┊  login,
+┊   ┊237┊  signup,
+┊   ┊238┊  connect(mapStateToProps),
+┊   ┊239┊)(Signin);
```

[}]: #

We attached `auth` from our Redux store to `Signin` via `connect(mapStateToProps)`. When we sign up or log in, we call the associated mutation (`signup` or `login`), receive the JWT and id, and dispatch the data with `setCurrentUser`. In `componentWillReceiveProps`, once `auth.jwt` exists, we are logged in and pop the Screen. We’ve also included some simple error messages if things go wrong.

Let’s check it out! ![Signin Gif](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-24.gif)

# Apollo-Client Authentication Middleware
We need to add Authorization Headers to our GraphQL requests from React Native before we can resume retrieving data from our auth protected server. We accomplish this by using middleware that will attach the headers to every request before they are sent out. Middleware works very elegantly within the `apollo-link` ecosystem. We just need to add a couple new links! Fortunately, `apollo-link-context` and `apollo-link-error` are perfect for our requirements and work really nicely with our Redux setup. We can simply add the following in `client/src/app.js`:

```sh
npm i apollo-link-context apollo-link-error
```

[{]: <helper> (diffStep 7.25)

#### [Step 7.25: Add authentication middleware for requests](https://github.com/srtucker22/chatty/commit/92a036b)

##### Changed client&#x2F;package.json
```diff
@@ -10,6 +10,7 @@
 ┊10┊10┊		"apollo-cache-redux": "^0.1.0-alpha.7",
 ┊11┊11┊		"apollo-client": "^2.2.5",
 ┊12┊12┊		"apollo-link": "^1.1.0",
+┊  ┊13┊		"apollo-link-context": "^1.0.5",
 ┊13┊14┊		"apollo-link-error": "^1.0.7",
 ┊14┊15┊		"apollo-link-http": "^1.3.3",
 ┊15┊16┊		"apollo-link-redux": "^0.2.1",
```

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -19,12 +19,15 @@
 ┊19┊19┊import { PersistGate } from 'redux-persist/lib/integration/react';
 ┊20┊20┊import { persistStore, persistCombineReducers } from 'redux-persist';
 ┊21┊21┊import thunk from 'redux-thunk';
+┊  ┊22┊import { setContext } from 'apollo-link-context';
+┊  ┊23┊import _ from 'lodash';
 ┊22┊24┊
 ┊23┊25┊import AppWithNavigationState, {
 ┊24┊26┊  navigationReducer,
 ┊25┊27┊  navigationMiddleware,
 ┊26┊28┊} from './navigation';
 ┊27┊29┊import auth from './reducers/auth.reducer';
+┊  ┊30┊import { logout } from './actions/auth.actions';
 ┊28┊31┊
 ┊29┊32┊const URL = 'localhost:8080'; // set your comp's url here
 ┊30┊33┊
```
```diff
@@ -61,6 +64,21 @@
 ┊61┊64┊
 ┊62┊65┊const httpLink = createHttpLink({ uri: `http://${URL}` });
 ┊63┊66┊
+┊  ┊67┊// middleware for requests
+┊  ┊68┊const middlewareLink = setContext((req, previousContext) => {
+┊  ┊69┊  // get the authentication token from local storage if it exists
+┊  ┊70┊  const { jwt } = store.getState().auth;
+┊  ┊71┊  if (jwt) {
+┊  ┊72┊    return {
+┊  ┊73┊      headers: {
+┊  ┊74┊        authorization: `Bearer ${jwt}`,
+┊  ┊75┊      },
+┊  ┊76┊    };
+┊  ┊77┊  }
+┊  ┊78┊
+┊  ┊79┊  return previousContext;
+┊  ┊80┊});
+┊  ┊81┊
 ┊64┊82┊// Create WebSocket client
 ┊65┊83┊export const wsClient = new SubscriptionClient(`ws://${URL}/graphql`, {
 ┊66┊84┊  reconnect: true,
```
```diff
@@ -85,7 +103,7 @@
 ┊ 85┊103┊  reduxLink,
 ┊ 86┊104┊  errorLink,
 ┊ 87┊105┊  requestLink({
-┊ 88┊   ┊    queryOrMutationLink: httpLink,
+┊   ┊106┊    queryOrMutationLink: middlewareLink.concat(httpLink),
 ┊ 89┊107┊    subscriptionLink: webSocketLink,
 ┊ 90┊108┊  }),
 ┊ 91┊109┊]);
```

[}]: #

Before every request, we get the JWT from `auth` and stick it in the header. We can also run middleware *after* receiving responses to check for auth errors and log out the user if necessary (afterware?):

[{]: <helper> (diffStep 7.26)

#### [Step 7.26: Add authentication afterware for responses](https://github.com/srtucker22/chatty/commit/b5b2895)

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -58,10 +58,6 @@
 ┊58┊58┊
 ┊59┊59┊const reduxLink = new ReduxLink(store);
 ┊60┊60┊
-┊61┊  ┊const errorLink = onError((errors) => {
-┊62┊  ┊  console.log(errors);
-┊63┊  ┊});
-┊64┊  ┊
 ┊65┊61┊const httpLink = createHttpLink({ uri: `http://${URL}` });
 ┊66┊62┊
 ┊67┊63┊// middleware for requests
```
```diff
@@ -79,6 +75,31 @@
 ┊ 79┊ 75┊  return previousContext;
 ┊ 80┊ 76┊});
 ┊ 81┊ 77┊
+┊   ┊ 78┊// afterware for responses
+┊   ┊ 79┊const errorLink = onError(({ graphQLErrors, networkError }) => {
+┊   ┊ 80┊  let shouldLogout = false;
+┊   ┊ 81┊  if (graphQLErrors) {
+┊   ┊ 82┊    console.log({ graphQLErrors });
+┊   ┊ 83┊    graphQLErrors.forEach(({ message, locations, path }) => {
+┊   ┊ 84┊      console.log({ message, locations, path });
+┊   ┊ 85┊      if (message === 'Unauthorized') {
+┊   ┊ 86┊        shouldLogout = true;
+┊   ┊ 87┊      }
+┊   ┊ 88┊    });
+┊   ┊ 89┊
+┊   ┊ 90┊    if (shouldLogout) {
+┊   ┊ 91┊      store.dispatch(logout());
+┊   ┊ 92┊    }
+┊   ┊ 93┊  }
+┊   ┊ 94┊  if (networkError) {
+┊   ┊ 95┊    console.log('[Network error]:');
+┊   ┊ 96┊    console.log({ networkError });
+┊   ┊ 97┊    if (networkError.statusCode === 401) {
+┊   ┊ 98┊      logout();
+┊   ┊ 99┊    }
+┊   ┊100┊  }
+┊   ┊101┊});
+┊   ┊102┊
 ┊ 82┊103┊// Create WebSocket client
 ┊ 83┊104┊export const wsClient = new SubscriptionClient(`ws://${URL}/graphql`, {
 ┊ 84┊105┊  reconnect: true,
```

[}]: #

We simply parse the error and dispatch `logout()` if we receive an `Unauthorized` response message.

# Subscriptions-Transport-WS Authentication
Luckily for us, `SubscriptionClient` has a nifty little feature that lets us lazily (on-demand) connect to our WebSocket by setting `lazy: true`. This flag means we will only try to connect the WebSocket when we make our first subscription call, which only happens in our app once the user is authenticated. When we make our connection call, we can pass the JWT credentials via `connectionParams`. When the user logs out, we’ll close the connection and lazily reconnect when a user log back in and resubscribes.

We can update `client/src/app.js` and `client/actions/auth.actions.js` as follows:

[{]: <helper> (diffStep 7.27)

#### [Step 7.27: Add lazy connecting to wsClient](https://github.com/srtucker22/chatty/commit/62be634)

##### Changed client&#x2F;src&#x2F;actions&#x2F;auth.actions.js
```diff
@@ -1,4 +1,4 @@
-┊1┊ ┊import { client } from '../app';
+┊ ┊1┊import { client, wsClient } from '../app';
 ┊2┊2┊import { SET_CURRENT_USER, LOGOUT } from '../constants/constants';
 ┊3┊3┊
 ┊4┊4┊export const setCurrentUser = user => ({
```
```diff
@@ -8,5 +8,7 @@
 ┊ 8┊ 8┊
 ┊ 9┊ 9┊export const logout = () => {
 ┊10┊10┊  client.resetStore();
+┊  ┊11┊  wsClient.unsubscribeAll(); // unsubscribe from all subscriptions
+┊  ┊12┊  wsClient.close(); // close the WebSocket connection
 ┊11┊13┊  return { type: LOGOUT };
 ┊12┊14┊};
```

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -102,9 +102,11 @@
 ┊102┊102┊
 ┊103┊103┊// Create WebSocket client
 ┊104┊104┊export const wsClient = new SubscriptionClient(`ws://${URL}/graphql`, {
+┊   ┊105┊  lazy: true,
 ┊105┊106┊  reconnect: true,
-┊106┊   ┊  connectionParams: {
-┊107┊   ┊    // Pass any arguments you want for initialization
+┊   ┊107┊  connectionParams() {
+┊   ┊108┊    // get the authentication token from local storage if it exists
+┊   ┊109┊    return { jwt: store.getState().auth.jwt };
 ┊108┊110┊  },
 ┊109┊111┊});
```

[}]: #

KaBLaM! We’re ready to start using auth across our app!

# Refactoring the Client for Authentication
Our final major hurdle is going to be refactoring all our client code to use the Queries and Mutations we modified for auth and to handle auth UI.

## Logout
To get our feet wet, let’s start by creating a new Screen instead of fixing up an existing one. Let’s create a new Screen for the Settings tab where we will show the current user’s details and give users the option to log out!

We’ll put our new Settings Screen in a new file `client/src/screens/settings.screen.js`:

[{]: <helper> (diffStep 7.28)

#### [Step 7.28: Create Settings Screen](https://github.com/srtucker22/chatty/commit/01b24ea)

##### Added client&#x2F;src&#x2F;screens&#x2F;settings.screen.js
```diff
@@ -0,0 +1,176 @@
+┊   ┊  1┊import PropTypes from 'prop-types';
+┊   ┊  2┊import React, { Component } from 'react';
+┊   ┊  3┊import {
+┊   ┊  4┊  ActivityIndicator,
+┊   ┊  5┊  Button,
+┊   ┊  6┊  Image,
+┊   ┊  7┊  StyleSheet,
+┊   ┊  8┊  Text,
+┊   ┊  9┊  TextInput,
+┊   ┊ 10┊  TouchableOpacity,
+┊   ┊ 11┊  View,
+┊   ┊ 12┊} from 'react-native';
+┊   ┊ 13┊import { connect } from 'react-redux';
+┊   ┊ 14┊import { graphql, compose } from 'react-apollo';
+┊   ┊ 15┊
+┊   ┊ 16┊import USER_QUERY from '../graphql/user.query';
+┊   ┊ 17┊import { logout } from '../actions/auth.actions';
+┊   ┊ 18┊
+┊   ┊ 19┊const styles = StyleSheet.create({
+┊   ┊ 20┊  container: {
+┊   ┊ 21┊    flex: 1,
+┊   ┊ 22┊  },
+┊   ┊ 23┊  email: {
+┊   ┊ 24┊    borderColor: '#777',
+┊   ┊ 25┊    borderBottomWidth: 1,
+┊   ┊ 26┊    borderTopWidth: 1,
+┊   ┊ 27┊    paddingVertical: 8,
+┊   ┊ 28┊    paddingHorizontal: 16,
+┊   ┊ 29┊    fontSize: 16,
+┊   ┊ 30┊  },
+┊   ┊ 31┊  emailHeader: {
+┊   ┊ 32┊    backgroundColor: '#dbdbdb',
+┊   ┊ 33┊    color: '#777',
+┊   ┊ 34┊    paddingHorizontal: 16,
+┊   ┊ 35┊    paddingBottom: 6,
+┊   ┊ 36┊    paddingTop: 32,
+┊   ┊ 37┊    fontSize: 12,
+┊   ┊ 38┊  },
+┊   ┊ 39┊  loading: {
+┊   ┊ 40┊    justifyContent: 'center',
+┊   ┊ 41┊    flex: 1,
+┊   ┊ 42┊  },
+┊   ┊ 43┊  userImage: {
+┊   ┊ 44┊    width: 54,
+┊   ┊ 45┊    height: 54,
+┊   ┊ 46┊    borderRadius: 27,
+┊   ┊ 47┊  },
+┊   ┊ 48┊  imageContainer: {
+┊   ┊ 49┊    paddingRight: 20,
+┊   ┊ 50┊    alignItems: 'center',
+┊   ┊ 51┊  },
+┊   ┊ 52┊  input: {
+┊   ┊ 53┊    color: 'black',
+┊   ┊ 54┊    height: 32,
+┊   ┊ 55┊  },
+┊   ┊ 56┊  inputBorder: {
+┊   ┊ 57┊    borderColor: '#dbdbdb',
+┊   ┊ 58┊    borderBottomWidth: 1,
+┊   ┊ 59┊    borderTopWidth: 1,
+┊   ┊ 60┊    paddingVertical: 8,
+┊   ┊ 61┊  },
+┊   ┊ 62┊  inputInstructions: {
+┊   ┊ 63┊    paddingTop: 6,
+┊   ┊ 64┊    color: '#777',
+┊   ┊ 65┊    fontSize: 12,
+┊   ┊ 66┊    flex: 1,
+┊   ┊ 67┊  },
+┊   ┊ 68┊  userContainer: {
+┊   ┊ 69┊    paddingLeft: 16,
+┊   ┊ 70┊  },
+┊   ┊ 71┊  userInner: {
+┊   ┊ 72┊    flexDirection: 'row',
+┊   ┊ 73┊    alignItems: 'center',
+┊   ┊ 74┊    paddingVertical: 16,
+┊   ┊ 75┊    paddingRight: 16,
+┊   ┊ 76┊  },
+┊   ┊ 77┊});
+┊   ┊ 78┊
+┊   ┊ 79┊class Settings extends Component {
+┊   ┊ 80┊  static navigationOptions = {
+┊   ┊ 81┊    title: 'Settings',
+┊   ┊ 82┊  };
+┊   ┊ 83┊
+┊   ┊ 84┊  constructor(props) {
+┊   ┊ 85┊    super(props);
+┊   ┊ 86┊
+┊   ┊ 87┊    this.state = {};
+┊   ┊ 88┊
+┊   ┊ 89┊    this.logout = this.logout.bind(this);
+┊   ┊ 90┊  }
+┊   ┊ 91┊
+┊   ┊ 92┊  logout() {
+┊   ┊ 93┊    this.props.dispatch(logout());
+┊   ┊ 94┊  }
+┊   ┊ 95┊
+┊   ┊ 96┊  // eslint-disable-next-line
+┊   ┊ 97┊  updateUsername(username) {
+┊   ┊ 98┊    // eslint-disable-next-line
+┊   ┊ 99┊    console.log('TODO: update username');
+┊   ┊100┊  }
+┊   ┊101┊
+┊   ┊102┊  render() {
+┊   ┊103┊    const { loading, user } = this.props;
+┊   ┊104┊
+┊   ┊105┊    // render loading placeholder while we fetch data
+┊   ┊106┊    if (loading || !user) {
+┊   ┊107┊      return (
+┊   ┊108┊        <View style={[styles.loading, styles.container]}>
+┊   ┊109┊          <ActivityIndicator />
+┊   ┊110┊        </View>
+┊   ┊111┊      );
+┊   ┊112┊    }
+┊   ┊113┊
+┊   ┊114┊    return (
+┊   ┊115┊      <View style={styles.container}>
+┊   ┊116┊        <View style={styles.userContainer}>
+┊   ┊117┊          <View style={styles.userInner}>
+┊   ┊118┊            <TouchableOpacity style={styles.imageContainer}>
+┊   ┊119┊              <Image
+┊   ┊120┊                style={styles.userImage}
+┊   ┊121┊                source={{ uri: 'https://reactjs.org/logo-og.png' }}
+┊   ┊122┊              />
+┊   ┊123┊              <Text>edit</Text>
+┊   ┊124┊            </TouchableOpacity>
+┊   ┊125┊            <Text style={styles.inputInstructions}>
+┊   ┊126┊              Enter your name and add an optional profile picture
+┊   ┊127┊            </Text>
+┊   ┊128┊          </View>
+┊   ┊129┊          <View style={styles.inputBorder}>
+┊   ┊130┊            <TextInput
+┊   ┊131┊              onChangeText={username => this.setState({ username })}
+┊   ┊132┊              placeholder={user.username}
+┊   ┊133┊              style={styles.input}
+┊   ┊134┊              defaultValue={user.username}
+┊   ┊135┊            />
+┊   ┊136┊          </View>
+┊   ┊137┊        </View>
+┊   ┊138┊        <Text style={styles.emailHeader}>EMAIL</Text>
+┊   ┊139┊        <Text style={styles.email}>{user.email}</Text>
+┊   ┊140┊        <Button title="Logout" onPress={this.logout} />
+┊   ┊141┊      </View>
+┊   ┊142┊    );
+┊   ┊143┊  }
+┊   ┊144┊}
+┊   ┊145┊
+┊   ┊146┊Settings.propTypes = {
+┊   ┊147┊  auth: PropTypes.shape({
+┊   ┊148┊    loading: PropTypes.bool,
+┊   ┊149┊    jwt: PropTypes.string,
+┊   ┊150┊  }).isRequired,
+┊   ┊151┊  dispatch: PropTypes.func.isRequired,
+┊   ┊152┊  loading: PropTypes.bool,
+┊   ┊153┊  navigation: PropTypes.shape({
+┊   ┊154┊    navigate: PropTypes.func,
+┊   ┊155┊  }),
+┊   ┊156┊  user: PropTypes.shape({
+┊   ┊157┊    username: PropTypes.string,
+┊   ┊158┊  }),
+┊   ┊159┊};
+┊   ┊160┊
+┊   ┊161┊const userQuery = graphql(USER_QUERY, {
+┊   ┊162┊  skip: ownProps => !ownProps.auth || !ownProps.auth.jwt,
+┊   ┊163┊  options: ({ auth }) => ({ variables: { id: auth.id }, fetchPolicy: 'cache-only' }),
+┊   ┊164┊  props: ({ data: { loading, user } }) => ({
+┊   ┊165┊    loading, user,
+┊   ┊166┊  }),
+┊   ┊167┊});
+┊   ┊168┊
+┊   ┊169┊const mapStateToProps = ({ auth }) => ({
+┊   ┊170┊  auth,
+┊   ┊171┊});
+┊   ┊172┊
+┊   ┊173┊export default compose(
+┊   ┊174┊  connect(mapStateToProps),
+┊   ┊175┊  userQuery,
+┊   ┊176┊)(Settings);
```

[}]: #

The most important pieces of this code we need to focus on is any `auth` related code:
1. We connect `auth` from our Redux store to the component via `connect(mapStateToProps)`
2. We `skip` the `userQuery` unless we have a JWT (`ownProps.auth.jwt`)
3. We show a loading spinner until we’re done loading the user

Let’s add the `Settings` screen to our settings tab in `client/src/navigation.js`. We will also use `navigationReducer` to handle pushing the `Signin` Screen whenever the user logs out or starts the application without being authenticated:

[{]: <helper> (diffStep 7.29)

#### [Step 7.29: Add Settings screen and auth logic to Navigation](https://github.com/srtucker22/chatty/commit/6c3cec6)

##### Changed client&#x2F;src&#x2F;navigation.js
```diff
@@ -11,6 +11,7 @@
 ┊11┊11┊import update from 'immutability-helper';
 ┊12┊12┊import { map } from 'lodash';
 ┊13┊13┊import { Buffer } from 'buffer';
+┊  ┊14┊import { REHYDRATE } from 'redux-persist';
 ┊14┊15┊
 ┊15┊16┊import Groups from './screens/groups.screen';
 ┊16┊17┊import Messages from './screens/messages.screen';
```
```diff
@@ -18,6 +19,7 @@
 ┊18┊19┊import GroupDetails from './screens/group-details.screen';
 ┊19┊20┊import NewGroup from './screens/new-group.screen';
 ┊20┊21┊import Signin from './screens/signin.screen';
+┊  ┊22┊import Settings from './screens/settings.screen';
 ┊21┊23┊
 ┊22┊24┊import { USER_QUERY } from './graphql/user.query';
 ┊23┊25┊import MESSAGE_ADDED_SUBSCRIPTION from './graphql/message-added.subscription';
```
```diff
@@ -25,35 +27,12 @@
 ┊25┊27┊
 ┊26┊28┊import { wsClient } from './app';
 ┊27┊29┊
-┊28┊  ┊const styles = StyleSheet.create({
-┊29┊  ┊  container: {
-┊30┊  ┊    flex: 1,
-┊31┊  ┊    justifyContent: 'center',
-┊32┊  ┊    alignItems: 'center',
-┊33┊  ┊    backgroundColor: 'white',
-┊34┊  ┊  },
-┊35┊  ┊  tabText: {
-┊36┊  ┊    color: '#777',
-┊37┊  ┊    fontSize: 10,
-┊38┊  ┊    justifyContent: 'center',
-┊39┊  ┊  },
-┊40┊  ┊  selected: {
-┊41┊  ┊    color: 'blue',
-┊42┊  ┊  },
-┊43┊  ┊});
-┊44┊  ┊
-┊45┊  ┊const TestScreen = title => () => (
-┊46┊  ┊  <View style={styles.container}>
-┊47┊  ┊    <Text>
-┊48┊  ┊      {title}
-┊49┊  ┊    </Text>
-┊50┊  ┊  </View>
-┊51┊  ┊);
+┊  ┊30┊import { LOGOUT } from './constants/constants';
 ┊52┊31┊
 ┊53┊32┊// tabs in main screen
 ┊54┊33┊const MainScreenNavigator = TabNavigator({
 ┊55┊34┊  Chats: { screen: Groups },
-┊56┊  ┊  Settings: { screen: TestScreen('Settings') },
+┊  ┊35┊  Settings: { screen: Settings },
 ┊57┊36┊}, {
 ┊58┊37┊  initialRouteName: 'Chats',
 ┊59┊38┊});
```
```diff
@@ -79,8 +58,35 @@
 ┊79┊58┊	],
 ┊80┊59┊}));
 ┊81┊60┊
+┊  ┊61┊// reducer code
 ┊82┊62┊export const navigationReducer = (state = initialState, action) => {
-┊83┊  ┊  const nextState = AppNavigator.router.getStateForAction(action, state);
+┊  ┊63┊  let nextState = AppNavigator.router.getStateForAction(action, state);
+┊  ┊64┊  switch (action.type) {
+┊  ┊65┊    case REHYDRATE:
+┊  ┊66┊      // convert persisted data to Immutable and confirm rehydration
+┊  ┊67┊      if (!action.payload || !action.payload.auth || !action.payload.auth.jwt) {
+┊  ┊68┊        const { routes, index } = state;
+┊  ┊69┊        if (routes[index].routeName !== 'Signin') {
+┊  ┊70┊          nextState = AppNavigator.router.getStateForAction(
+┊  ┊71┊            NavigationActions.navigate({ routeName: 'Signin' }),
+┊  ┊72┊            state,
+┊  ┊73┊          );
+┊  ┊74┊        }
+┊  ┊75┊      }
+┊  ┊76┊      break;
+┊  ┊77┊    case LOGOUT:
+┊  ┊78┊      const { routes, index } = state;
+┊  ┊79┊      if (routes[index].routeName !== 'Signin') {
+┊  ┊80┊        nextState = AppNavigator.router.getStateForAction(
+┊  ┊81┊          NavigationActions.navigate({ routeName: 'Signin' }),
+┊  ┊82┊          state,
+┊  ┊83┊        );
+┊  ┊84┊      }
+┊  ┊85┊      break;
+┊  ┊86┊    default:
+┊  ┊87┊      nextState = AppNavigator.router.getStateForAction(action, state);
+┊  ┊88┊      break;
+┊  ┊89┊  }
 ┊84┊90┊
 ┊85┊91┊  // Simply return the original `state` if `nextState` is null or undefined.
 ┊86┊92┊  return nextState || state;
```

[}]: #

Though it’s typically best practice to keep reducers pure (not triggering actions directly), we’ve made an exception with `NavigationActions` in our `navigationReducer` to keep the code a little simpler in this particular case.

Let’s run it!

![Logout Gif](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-29.gif)

## Refactoring Queries and Mutations
We need to update all our client-side Queries and Mutations to match our modified Schema. We also need to update the variables we pass to these Queries and Mutations through `graphql` and attach to components.

Let’s look at the `USER_QUERY` in `Groups` and `AppWithNavigationState` for a full example:

[{]: <helper> (diffStep "7.30")

#### [Step 7.30: Update userQuery with auth in Groups and Navigation](https://github.com/srtucker22/chatty/commit/1757e15)

##### Changed client&#x2F;src&#x2F;navigation.js
```diff
@@ -120,7 +120,7 @@
 ┊120┊120┊      }, this);
 ┊121┊121┊    }
 ┊122┊122┊
-┊123┊   ┊    if (nextProps.user &&
+┊   ┊123┊    if (nextProps.user && nextProps.user.id === nextProps.auth.id &&
 ┊124┊124┊      (!this.props.user || nextProps.user.groups.length !== this.props.user.groups.length)) {
 ┊125┊125┊      // unsubscribe from old
 ┊126┊126┊
```
```diff
@@ -150,6 +150,10 @@
 ┊150┊150┊}
 ┊151┊151┊
 ┊152┊152┊AppWithNavigationState.propTypes = {
+┊   ┊153┊  auth: PropTypes.shape({
+┊   ┊154┊    id: PropTypes.number,
+┊   ┊155┊    jwt: PropTypes.string,
+┊   ┊156┊  }),
 ┊153┊157┊  dispatch: PropTypes.func.isRequired,
 ┊154┊158┊  nav: PropTypes.object.isRequired,
 ┊155┊159┊  refetch: PropTypes.func,
```
```diff
@@ -167,13 +171,14 @@
 ┊167┊171┊  }),
 ┊168┊172┊};
 ┊169┊173┊
-┊170┊   ┊const mapStateToProps = state => ({
-┊171┊   ┊  nav: state.nav,
+┊   ┊174┊const mapStateToProps = ({ auth, nav }) => ({
+┊   ┊175┊  auth,
+┊   ┊176┊  nav,
 ┊172┊177┊});
 ┊173┊178┊
 ┊174┊179┊const userQuery = graphql(USER_QUERY, {
-┊175┊   ┊  skip: ownProps => true, // fake it -- we'll use ownProps with auth
-┊176┊   ┊  options: () => ({ variables: { id: 1 } }), // fake the user for now
+┊   ┊180┊  skip: ownProps => !ownProps.auth || !ownProps.auth.jwt,
+┊   ┊181┊  options: ownProps => ({ variables: { id: ownProps.auth.id } }),
 ┊177┊182┊  props: ({ data: { loading, user, refetch, subscribeToMore } }) => ({
 ┊178┊183┊    loading,
 ┊179┊184┊    user,
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
```diff
@@ -10,9 +10,10 @@
 ┊10┊10┊  TouchableHighlight,
 ┊11┊11┊  View,
 ┊12┊12┊} from 'react-native';
-┊13┊  ┊import { graphql } from 'react-apollo';
+┊  ┊13┊import { graphql, compose } from 'react-apollo';
 ┊14┊14┊import moment from 'moment';
 ┊15┊15┊import Icon from 'react-native-vector-icons/FontAwesome';
+┊  ┊16┊import { connect } from 'react-redux';
 ┊16┊17┊
 ┊17┊18┊import { USER_QUERY } from '../graphql/user.query';
 ┊18┊19┊
```
```diff
@@ -95,9 +96,6 @@
 ┊ 95┊ 96┊  onPress: PropTypes.func.isRequired,
 ┊ 96┊ 97┊};
 ┊ 97┊ 98┊
-┊ 98┊   ┊// we'll fake signin for now
-┊ 99┊   ┊let IS_SIGNED_IN = false;
-┊100┊   ┊
 ┊101┊ 99┊class Group extends Component {
 ┊102┊100┊  constructor(props) {
 ┊103┊101┊    super(props);
```
```diff
@@ -172,16 +170,6 @@
 ┊172┊170┊    this.onRefresh = this.onRefresh.bind(this);
 ┊173┊171┊  }
 ┊174┊172┊
-┊175┊   ┊  componentDidMount() {
-┊176┊   ┊    if (!IS_SIGNED_IN) {
-┊177┊   ┊      IS_SIGNED_IN = true;
-┊178┊   ┊
-┊179┊   ┊      const { navigate } = this.props.navigation;
-┊180┊   ┊
-┊181┊   ┊      navigate('Signin');
-┊182┊   ┊    }
-┊183┊   ┊  }
-┊184┊   ┊
 ┊185┊173┊  onRefresh() {
 ┊186┊174┊    this.props.refetch();
 ┊187┊175┊    // faking unauthorized status
```
```diff
@@ -257,11 +245,18 @@
 ┊257┊245┊};
 ┊258┊246┊
 ┊259┊247┊const userQuery = graphql(USER_QUERY, {
-┊260┊   ┊  skip: ownProps => true, // fake it -- we'll use ownProps with auth
-┊261┊   ┊  options: () => ({ variables: { id: 1 } }), // fake the user for now
+┊   ┊248┊  skip: ownProps => !ownProps.auth || !ownProps.auth.jwt,
+┊   ┊249┊  options: ownProps => ({ variables: { id: ownProps.auth.id } }),
 ┊262┊250┊  props: ({ data: { loading, networkStatus, refetch, user } }) => ({
 ┊263┊251┊    loading, networkStatus, refetch, user,
 ┊264┊252┊  }),
 ┊265┊253┊});
 ┊266┊254┊
-┊267┊   ┊export default userQuery(Groups);
+┊   ┊255┊const mapStateToProps = ({ auth }) => ({
+┊   ┊256┊  auth,
+┊   ┊257┊});
+┊   ┊258┊
+┊   ┊259┊export default compose(
+┊   ┊260┊  connect(mapStateToProps),
+┊   ┊261┊  userQuery,
+┊   ┊262┊)(Groups);
```

[}]: #

1. We use `connect(mapStateToProps)` to attach `auth` from Redux to our component
2. We modify the `userQuery` options to pass `ownProps.auth.id` instead of the `1` placeholder
3. We change `skip` to use `ownProps.auth.jwt` to determine whether to run `userQuery`

We'll also have to make similar changes in `Messages`:

[{]: <helper> (diffStep 7.31)

#### [Step 7.31: Update Messages Screen and createMessage with auth](https://github.com/srtucker22/chatty/commit/63080e5)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-message.mutation.js
```diff
@@ -3,8 +3,8 @@
 ┊ 3┊ 3┊import MESSAGE_FRAGMENT from './message.fragment';
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const CREATE_MESSAGE_MUTATION = gql`
-┊ 6┊  ┊  mutation createMessage($text: String!, $userId: Int!, $groupId: Int!) {
-┊ 7┊  ┊    createMessage(text: $text, userId: $userId, groupId: $groupId) {
+┊  ┊ 6┊  mutation createMessage($text: String!, $groupId: Int!) {
+┊  ┊ 7┊    createMessage(text: $text, groupId: $groupId) {
 ┊ 8┊ 8┊      ... MessageFragment
 ┊ 9┊ 9┊    }
 ┊10┊10┊  }
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -16,6 +16,7 @@
 ┊16┊16┊import { Buffer } from 'buffer';
 ┊17┊17┊import _ from 'lodash';
 ┊18┊18┊import moment from 'moment';
+┊  ┊19┊import { connect } from 'react-redux';
 ┊19┊20┊
 ┊20┊21┊import { wsClient } from '../app';
 ┊21┊22┊
```
```diff
@@ -171,7 +172,6 @@
 ┊171┊172┊  send(text) {
 ┊172┊173┊    this.props.createMessage({
 ┊173┊174┊      groupId: this.props.navigation.state.params.groupId,
-┊174┊   ┊      userId: 1, // faking the user for now
 ┊175┊175┊      text,
 ┊176┊176┊    }).then(() => {
 ┊177┊177┊      this.flatList.scrollToIndex({ index: 0, animated: true });
```
```diff
@@ -186,7 +186,7 @@
 ┊186┊186┊    return (
 ┊187┊187┊      <Message
 ┊188┊188┊        color={this.state.usernameColors[message.from.username]}
-┊189┊   ┊        isCurrentUser={message.from.id === 1} // for now until we implement auth
+┊   ┊189┊        isCurrentUser={message.from.id === this.props.auth.id}
 ┊190┊190┊        message={message}
 ┊191┊191┊      />
 ┊192┊192┊    );
```
```diff
@@ -228,6 +228,10 @@
 ┊228┊228┊}
 ┊229┊229┊
 ┊230┊230┊Messages.propTypes = {
+┊   ┊231┊  auth: PropTypes.shape({
+┊   ┊232┊    id: PropTypes.number,
+┊   ┊233┊    username: PropTypes.string,
+┊   ┊234┊  }),
 ┊231┊235┊  createMessage: PropTypes.func,
 ┊232┊236┊  navigation: PropTypes.shape({
 ┊233┊237┊    navigate: PropTypes.func,
```
```diff
@@ -296,10 +300,10 @@
 ┊296┊300┊});
 ┊297┊301┊
 ┊298┊302┊const createMessageMutation = graphql(CREATE_MESSAGE_MUTATION, {
-┊299┊   ┊  props: ({ mutate }) => ({
-┊300┊   ┊    createMessage: ({ text, userId, groupId }) =>
+┊   ┊303┊  props: ({ ownProps, mutate }) => ({
+┊   ┊304┊    createMessage: ({ text, groupId }) =>
 ┊301┊305┊      mutate({
-┊302┊   ┊        variables: { text, userId, groupId },
+┊   ┊306┊        variables: { text, groupId },
 ┊303┊307┊        optimisticResponse: {
 ┊304┊308┊          __typename: 'Mutation',
 ┊305┊309┊          createMessage: {
```
```diff
@@ -309,8 +313,8 @@
 ┊309┊313┊            createdAt: new Date().toISOString(), // the time is now!
 ┊310┊314┊            from: {
 ┊311┊315┊              __typename: 'User',
-┊312┊   ┊              id: 1, // still faking the user
-┊313┊   ┊              username: 'Justyn.Kautzer', // still faking the user
+┊   ┊316┊              id: ownProps.auth.id,
+┊   ┊317┊              username: ownProps.auth.username,
 ┊314┊318┊            },
 ┊315┊319┊            to: {
 ┊316┊320┊              __typename: 'Group',
```
```diff
@@ -348,7 +352,7 @@
 ┊348┊352┊          const userData = store.readQuery({
 ┊349┊353┊            query: USER_QUERY,
 ┊350┊354┊            variables: {
-┊351┊   ┊              id: 1, // faking the user for now
+┊   ┊355┊              id: ownProps.auth.id,
 ┊352┊356┊            },
 ┊353┊357┊          });
 ┊354┊358┊
```
```diff
@@ -367,7 +371,7 @@
 ┊367┊371┊            store.writeQuery({
 ┊368┊372┊              query: USER_QUERY,
 ┊369┊373┊              variables: {
-┊370┊   ┊                id: 1, // faking the user for now
+┊   ┊374┊                id: ownProps.auth.id,
 ┊371┊375┊              },
 ┊372┊376┊              data: userData,
 ┊373┊377┊            });
```
```diff
@@ -378,7 +382,12 @@
 ┊378┊382┊  }),
 ┊379┊383┊});
 ┊380┊384┊
+┊   ┊385┊const mapStateToProps = ({ auth }) => ({
+┊   ┊386┊  auth,
+┊   ┊387┊});
+┊   ┊388┊
 ┊381┊389┊export default compose(
+┊   ┊390┊  connect(mapStateToProps),
 ┊382┊391┊  groupQuery,
 ┊383┊392┊  createMessageMutation,
 ┊384┊393┊)(Messages);
```

[}]: #

We need to make similar changes in every other one of our components before we’re bug free. Here are all the major changes:

[{]: <helper> (diffStep 7.32)

#### [Step 7.32: Update Groups flow with auth](https://github.com/srtucker22/chatty/commit/e70ff8b)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
```diff
@@ -3,8 +3,8 @@
 ┊ 3┊ 3┊import MESSAGE_FRAGMENT from './message.fragment';
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const CREATE_GROUP_MUTATION = gql`
-┊ 6┊  ┊  mutation createGroup($name: String!, $userIds: [Int!], $userId: Int!) {
-┊ 7┊  ┊    createGroup(name: $name, userIds: $userIds, userId: $userId) {
+┊  ┊ 6┊  mutation createGroup($name: String!, $userIds: [Int!]) {
+┊  ┊ 7┊    createGroup(name: $name, userIds: $userIds) {
 ┊ 8┊ 8┊      id
 ┊ 9┊ 9┊      name
 ┊10┊10┊      users {
```

##### Changed client&#x2F;src&#x2F;graphql&#x2F;leave-group.mutation.js
```diff
@@ -1,8 +1,8 @@
 ┊1┊1┊import gql from 'graphql-tag';
 ┊2┊2┊
 ┊3┊3┊const LEAVE_GROUP_MUTATION = gql`
-┊4┊ ┊  mutation leaveGroup($id: Int!, $userId: Int!) {
-┊5┊ ┊    leaveGroup(id: $id, userId: $userId) {
+┊ ┊4┊  mutation leaveGroup($id: Int!) {
+┊ ┊5┊    leaveGroup(id: $id) {
 ┊6┊6┊      id
 ┊7┊7┊    }
 ┊8┊8┊  }
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;finalize-group.screen.js
```diff
@@ -14,6 +14,7 @@
 ┊14┊14┊import { graphql, compose } from 'react-apollo';
 ┊15┊15┊import { NavigationActions } from 'react-navigation';
 ┊16┊16┊import update from 'immutability-helper';
+┊  ┊17┊import { connect } from 'react-redux';
 ┊17┊18┊
 ┊18┊19┊import { USER_QUERY } from '../graphql/user.query';
 ┊19┊20┊import CREATE_GROUP_MUTATION from '../graphql/create-group.mutation';
```
```diff
@@ -143,7 +144,6 @@
 ┊143┊144┊
 ┊144┊145┊    createGroup({
 ┊145┊146┊      name: this.state.name,
-┊146┊   ┊      userId: 1, // fake user for now
 ┊147┊147┊      userIds: _.map(this.state.selected, 'id'),
 ┊148┊148┊    }).then((res) => {
 ┊149┊149┊      this.props.navigation.dispatch(goToNewGroup(res.data.createGroup));
```
```diff
@@ -222,13 +222,13 @@
 ┊222┊222┊};
 ┊223┊223┊
 ┊224┊224┊const createGroupMutation = graphql(CREATE_GROUP_MUTATION, {
-┊225┊   ┊  props: ({ mutate }) => ({
-┊226┊   ┊    createGroup: ({ name, userIds, userId }) =>
+┊   ┊225┊  props: ({ ownProps, mutate }) => ({
+┊   ┊226┊    createGroup: ({ name, userIds }) =>
 ┊227┊227┊      mutate({
-┊228┊   ┊        variables: { name, userIds, userId },
+┊   ┊228┊        variables: { name, userIds },
 ┊229┊229┊        update: (store, { data: { createGroup } }) => {
 ┊230┊230┊          // Read the data from our cache for this query.
-┊231┊   ┊          const data = store.readQuery({ query: USER_QUERY, variables: { id: userId } });
+┊   ┊231┊          const data = store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });
 ┊232┊232┊
 ┊233┊233┊          // Add our message from the mutation to the end.
 ┊234┊234┊          data.user.groups.push(createGroup);
```
```diff
@@ -236,7 +236,7 @@
 ┊236┊236┊          // Write our data back to the cache.
 ┊237┊237┊          store.writeQuery({
 ┊238┊238┊            query: USER_QUERY,
-┊239┊   ┊            variables: { id: userId },
+┊   ┊239┊            variables: { id: ownProps.auth.id },
 ┊240┊240┊            data,
 ┊241┊241┊          });
 ┊242┊242┊        },
```
```diff
@@ -255,7 +255,12 @@
 ┊255┊255┊  }),
 ┊256┊256┊});
 ┊257┊257┊
+┊   ┊258┊const mapStateToProps = ({ auth }) => ({
+┊   ┊259┊  auth,
+┊   ┊260┊});
+┊   ┊261┊
 ┊258┊262┊export default compose(
+┊   ┊263┊  connect(mapStateToProps),
 ┊259┊264┊  userQuery,
 ┊260┊265┊  createGroupMutation,
 ┊261┊266┊)(FinalizeGroup);
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;group-details.screen.js
```diff
@@ -13,6 +13,7 @@
 ┊13┊13┊} from 'react-native';
 ┊14┊14┊import { graphql, compose } from 'react-apollo';
 ┊15┊15┊import { NavigationActions } from 'react-navigation';
+┊  ┊16┊import { connect } from 'react-redux';
 ┊16┊17┊
 ┊17┊18┊import GROUP_QUERY from '../graphql/group.query';
 ┊18┊19┊import USER_QUERY from '../graphql/user.query';
```
```diff
@@ -110,8 +111,7 @@
 ┊110┊111┊  leaveGroup() {
 ┊111┊112┊    this.props.leaveGroup({
 ┊112┊113┊      id: this.props.navigation.state.params.id,
-┊113┊   ┊      userId: 1,
-┊114┊   ┊    }) // fake user for now
+┊   ┊114┊    })
 ┊115┊115┊      .then(() => {
 ┊116┊116┊        this.props.navigation.dispatch(resetAction);
 ┊117┊117┊      })
```
```diff
@@ -219,7 +219,7 @@
 ┊219┊219┊        variables: { id },
 ┊220┊220┊        update: (store, { data: { deleteGroup } }) => {
 ┊221┊221┊          // Read the data from our cache for this query.
-┊222┊   ┊          const data = store.readQuery({ query: USER_QUERY, variables: { id: 1 } }); // fake for now
+┊   ┊222┊          const data = store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });
 ┊223┊223┊
 ┊224┊224┊          // Add our message from the mutation to the end.
 ┊225┊225┊          data.user.groups = data.user.groups.filter(g => deleteGroup.id !== g.id);
```
```diff
@@ -227,7 +227,7 @@
 ┊227┊227┊          // Write our data back to the cache.
 ┊228┊228┊          store.writeQuery({
 ┊229┊229┊            query: USER_QUERY,
-┊230┊   ┊            variables: { id: 1 }, // fake for now
+┊   ┊230┊            variables: { id: ownProps.auth.id },
 ┊231┊231┊            data,
 ┊232┊232┊          });
 ┊233┊233┊        },
```
```diff
@@ -237,12 +237,12 @@
 ┊237┊237┊
 ┊238┊238┊const leaveGroupMutation = graphql(LEAVE_GROUP_MUTATION, {
 ┊239┊239┊  props: ({ ownProps, mutate }) => ({
-┊240┊   ┊    leaveGroup: ({ id, userId }) =>
+┊   ┊240┊    leaveGroup: ({ id }) =>
 ┊241┊241┊      mutate({
-┊242┊   ┊        variables: { id, userId },
+┊   ┊242┊        variables: { id },
 ┊243┊243┊        update: (store, { data: { leaveGroup } }) => {
 ┊244┊244┊          // Read the data from our cache for this query.
-┊245┊   ┊          const data = store.readQuery({ query: USER_QUERY, variables: { id: 1 } }); // fake for now
+┊   ┊245┊          const data = store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });
 ┊246┊246┊
 ┊247┊247┊          // Add our message from the mutation to the end.
 ┊248┊248┊          data.user.groups = data.user.groups.filter(g => leaveGroup.id !== g.id);
```
```diff
@@ -250,7 +250,7 @@
 ┊250┊250┊          // Write our data back to the cache.
 ┊251┊251┊          store.writeQuery({
 ┊252┊252┊            query: USER_QUERY,
-┊253┊   ┊            variables: { id: 1 }, // fake for now
+┊   ┊253┊            variables: { id: ownProps.auth.id },
 ┊254┊254┊            data,
 ┊255┊255┊          });
 ┊256┊256┊        },
```
```diff
@@ -258,7 +258,12 @@
 ┊258┊258┊  }),
 ┊259┊259┊});
 ┊260┊260┊
+┊   ┊261┊const mapStateToProps = ({ auth }) => ({
+┊   ┊262┊  auth,
+┊   ┊263┊});
+┊   ┊264┊
 ┊261┊265┊export default compose(
+┊   ┊266┊  connect(mapStateToProps),
 ┊262┊267┊  groupQuery,
 ┊263┊268┊  deleteGroupMutation,
 ┊264┊269┊  leaveGroupMutation,
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;new-group.screen.js
```diff
@@ -13,6 +13,7 @@
 ┊13┊13┊import AlphabetListView from 'react-native-alpha-listview';
 ┊14┊14┊import update from 'immutability-helper';
 ┊15┊15┊import Icon from 'react-native-vector-icons/FontAwesome';
+┊  ┊16┊import { connect } from 'react-redux';
 ┊16┊17┊
 ┊17┊18┊import SelectedUserList from '../components/selected-user-list.component';
 ┊18┊19┊import USER_QUERY from '../graphql/user.query';
```
```diff
@@ -309,12 +310,17 @@
 ┊309┊310┊};
 ┊310┊311┊
 ┊311┊312┊const userQuery = graphql(USER_QUERY, {
-┊312┊   ┊  options: (ownProps) => ({ variables: { id: 1 } }), // fake for now
+┊   ┊313┊  options: ownProps => ({ variables: { id: ownProps.auth.id } }),
 ┊313┊314┊  props: ({ data: { loading, user } }) => ({
 ┊314┊315┊    loading, user,
 ┊315┊316┊  }),
 ┊316┊317┊});
 ┊317┊318┊
+┊   ┊319┊const mapStateToProps = ({ auth }) => ({
+┊   ┊320┊  auth,
+┊   ┊321┊});
+┊   ┊322┊
 ┊318┊323┊export default compose(
+┊   ┊324┊  connect(mapStateToProps),
 ┊319┊325┊  userQuery,
 ┊320┊326┊)(NewGroup);
```

[}]: #

[{]: <helper> (diffStep 7.33)

#### [Step 7.33: Update messageAdded flow with auth](https://github.com/srtucker22/chatty/commit/95be6be)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;message-added.subscription.js
```diff
@@ -3,8 +3,8 @@
 ┊ 3┊ 3┊import MESSAGE_FRAGMENT from './message.fragment';
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const MESSAGE_ADDED_SUBSCRIPTION = gql`
-┊ 6┊  ┊  subscription onMessageAdded($userId: Int, $groupIds: [Int]){
-┊ 7┊  ┊    messageAdded(userId: $userId, groupIds: $groupIds){
+┊  ┊ 6┊  subscription onMessageAdded($groupIds: [Int]){
+┊  ┊ 7┊    messageAdded(groupIds: $groupIds){
 ┊ 8┊ 8┊      ... MessageFragment
 ┊ 9┊ 9┊    }
 ┊10┊10┊  }
```

##### Changed client&#x2F;src&#x2F;navigation.js
```diff
@@ -187,7 +187,6 @@
 ┊187┊187┊      return subscribeToMore({
 ┊188┊188┊        document: MESSAGE_ADDED_SUBSCRIPTION,
 ┊189┊189┊        variables: {
-┊190┊   ┊          userId: 1, // fake the user for now
 ┊191┊190┊          groupIds: map(user.groups, 'id'),
 ┊192┊191┊        },
 ┊193┊192┊        updateQuery: (previousResult, { subscriptionData }) => {
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -117,7 +117,6 @@
 ┊117┊117┊        this.subscription = nextProps.subscribeToMore({
 ┊118┊118┊          document: MESSAGE_ADDED_SUBSCRIPTION,
 ┊119┊119┊          variables: {
-┊120┊   ┊            userId: 1, // fake the user for now
 ┊121┊120┊            groupIds: [nextProps.navigation.state.params.groupId],
 ┊122┊121┊          },
 ┊123┊122┊          updateQuery: (previousResult, { subscriptionData }) => {
```

[}]: #

When everything is said and done, we should have a beautifully running Chatty app 📱‼️‼️

![Chatty Gif](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-32.gif)

# 🎉 CONGRATULATIONS!!! 🎉
We made it! We made a secure, real-time chat app with React Native and GraphQL. How cool is that?! More importantly, we now have the skills and knowhow to make pretty much anything we want with some of the best tools out there.

I hope this series has been at least a little helpful in furthering your growth as a developer. I’m really stoked and humbled at the reception it has been getting, and I want to continue to do everything I can to make it the best it can be.

With that in mind, if you have any suggestions for making this series better, please leave your feedback!


[//]: # (foot-start)

[{]: <helper> (navStep)

| [< Previous Step](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/step6.md) | [Next Step >](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/step8.md) |
|:--------------------------------|--------------------------------:|

[}]: #

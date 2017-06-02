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

#### [Step 7.1: Add environment variables for JWT_SECRET](https://github.com/srtucker22/chatty/commit/afe7902)

##### Added .env
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊# .env</b>
<b>+┊ ┊2┊# use your own secret!!!</b>
<b>+┊ ┊3┊JWT_SECRET&#x3D;your_secret🚫↵</b>
</pre>

[}]: #

We’ll process the `JWT_SECRET` inside a new file `server/config.js`:

[{]: <helper> (diffStep 7.1 files="server/config.js")

#### [Step 7.1: Add environment variables for JWT_SECRET](https://github.com/srtucker22/chatty/commit/afe7902)

##### Added server&#x2F;config.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import dotenv from &#x27;dotenv&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊dotenv.config({ silent: true });</b>
<b>+┊  ┊ 4┊</b>
<b>+┊  ┊ 5┊export const {</b>
<b>+┊  ┊ 6┊  JWT_SECRET,</b>
<b>+┊  ┊ 7┊} &#x3D; process.env;</b>
<b>+┊  ┊ 8┊</b>
<b>+┊  ┊ 9┊const defaults &#x3D; {</b>
<b>+┊  ┊10┊  JWT_SECRET: &#x27;your_secret&#x27;,</b>
<b>+┊  ┊11┊};</b>
<b>+┊  ┊12┊</b>
<b>+┊  ┊13┊Object.keys(defaults).forEach((key) &#x3D;&gt; {</b>
<b>+┊  ┊14┊  if (!process.env[key] || process.env[key] &#x3D;&#x3D;&#x3D; defaults[key]) {</b>
<b>+┊  ┊15┊    throw new Error(&#x60;Please enter a custom ${key} in .env on the root directory&#x60;);</b>
<b>+┊  ┊16┊  }</b>
<b>+┊  ┊17┊});</b>
<b>+┊  ┊18┊</b>
<b>+┊  ┊19┊export default JWT_SECRET;</b>
</pre>

[}]: #

Now, let’s update our express server in `server/index.js` to use `express-jwt ` middleware. Even though our app isn't a pure `express` app, we can still use express-style middleware on requests passing through our `ApolloServer`:

[{]: <helper> (diffStep 7.2)

#### [Step 7.2: Add jwt middleware to express](https://github.com/srtucker22/chatty/commit/fa9479f)

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import { ApolloServer } from &#x27;apollo-server&#x27;;
<b>+┊  ┊ 2┊import jwt from &#x27;express-jwt&#x27;;</b>
<b>+┊  ┊ 3┊</b>
 ┊ 2┊ 4┊import { typeDefs } from &#x27;./data/schema&#x27;;
 ┊ 3┊ 5┊import { mocks } from &#x27;./data/mocks&#x27;;
 ┊ 4┊ 6┊import { resolvers } from &#x27;./data/resolvers&#x27;;
<b>+┊  ┊ 7┊import { JWT_SECRET } from &#x27;./config&#x27;;</b>
<b>+┊  ┊ 8┊import { User } from &#x27;./data/connectors&#x27;;</b>
 ┊ 5┊ 9┊
 ┊ 6┊10┊const PORT &#x3D; 8080;
 ┊ 7┊11┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 9┊13┊  resolvers,
 ┊10┊14┊  typeDefs,
 ┊11┊15┊  // mocks,
<b>+┊  ┊16┊  context: ({ req, res, connection }) &#x3D;&gt; {</b>
<b>+┊  ┊17┊    // web socket subscriptions will return a connection</b>
<b>+┊  ┊18┊    if (connection) {</b>
<b>+┊  ┊19┊      // check connection for metadata</b>
<b>+┊  ┊20┊      return {};</b>
<b>+┊  ┊21┊    }</b>
<b>+┊  ┊22┊</b>
<b>+┊  ┊23┊    const user &#x3D; new Promise((resolve, reject) &#x3D;&gt; {</b>
<b>+┊  ┊24┊      jwt({</b>
<b>+┊  ┊25┊        secret: JWT_SECRET,</b>
<b>+┊  ┊26┊        credentialsRequired: false,</b>
<b>+┊  ┊27┊      })(req, res, (e) &#x3D;&gt; {</b>
<b>+┊  ┊28┊        if (req.user) {</b>
<b>+┊  ┊29┊          resolve(User.findOne({ where: { id: req.user.id } }));</b>
<b>+┊  ┊30┊        } else {</b>
<b>+┊  ┊31┊          resolve(null);</b>
<b>+┊  ┊32┊        }</b>
<b>+┊  ┊33┊      });</b>
<b>+┊  ┊34┊    });</b>
<b>+┊  ┊35┊    return {</b>
<b>+┊  ┊36┊      user,</b>
<b>+┊  ┊37┊    };</b>
<b>+┊  ┊38┊  },</b>
 ┊12┊39┊});
 ┊13┊40┊
 ┊14┊41┊server.listen({ port: PORT }).then(({ url }) &#x3D;&gt; console.log(&#x60;🚀 Server ready at ${url}&#x60;));
</pre>

[}]: #

The `express-jwt` middleware checks our Authorization Header for a `Bearer` token, decodes the token using the `JWT_SECRET` into a JSON object, and then attaches that Object to the request as `req.user`. We can use `req.user` to find the associated `User` in our database  —  we pretty much only need to use the `id` parameter to retrieve the `User` because we can be confident the JWT is secure (more on this later). Lastly, we return the found `User` in this `context` function. By doing this, every one of our Resolvers will get passed a `context` parameter with the `User`, which we will use to validate credentials before touching any data.

Note that by setting `credentialsRequired: false`, we allow non-authenticated requests to pass through the middleware. This is required so we can allow signup and login requests (and others) through the endpoint.

## Refactoring Schemas
Time to focus on our Schema. We need to perform 3 changes to `server/data/schema.js`:
1. Add new GraphQL Mutations for logging in and signing up
2. Add the JWT to the `User` type
3. Since the User will get passed into all the Resolvers automatically via context, we no longer need to pass a `userId` to any queries or mutations, so let’s simplify their inputs!

[{]: <helper> (diffStep 7.3)

#### [Step 7.3: Update Schema with auth](https://github.com/srtucker22/chatty/commit/28f8945)

##### Changed server&#x2F;data&#x2F;schema.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊35┊35┊    messages: [Message] # messages sent by user
 ┊36┊36┊    groups: [Group] # groups the user belongs to
 ┊37┊37┊    friends: [User] # user&#x27;s friends/contacts
<b>+┊  ┊38┊    jwt: String # json web token for access</b>
 ┊38┊39┊  }
 ┊39┊40┊
 ┊40┊41┊  # a message sent from a user to a group
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊61┊62┊
 ┊62┊63┊  type Mutation {
 ┊63┊64┊    # send a message to a group
<b>+┊  ┊65┊    createMessage(text: String!, groupId: Int!): Message</b>
<b>+┊  ┊66┊    createGroup(name: String!, userIds: [Int]): Group</b>
 ┊68┊67┊    deleteGroup(id: Int!): Group
<b>+┊  ┊68┊    leaveGroup(id: Int!): Group # let user leave group</b>
 ┊70┊69┊    updateGroup(id: Int!, name: String): Group
<b>+┊  ┊70┊    login(email: String!, password: String!): User</b>
<b>+┊  ┊71┊    signup(email: String!, password: String!, username: String): User</b>
 ┊71┊72┊  }
 ┊72┊73┊
 ┊73┊74┊  type Subscription {
 ┊74┊75┊    # Subscription fires on every message added
 ┊75┊76┊    # for any of the groups with one of these groupIds
<b>+┊  ┊77┊    messageAdded(groupIds: [Int]): Message</b>
 ┊77┊78┊    groupAdded(userId: Int): Group
 ┊78┊79┊  }
</pre>

[}]: #

Because our server is stateless, **we don’t need to create a logout mutation!** The server will test for authorization on every request and login state will solely be kept on the client.

## Refactoring Resolvers
We need to update our Resolvers to handle our new `login` and `signup` Mutations. We can update `server/data/resolvers.js` as follows:

[{]: <helper> (diffStep 7.4)

#### [Step 7.4: Update Resolvers with login and signup mutations](https://github.com/srtucker22/chatty/commit/c3b6a11)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import GraphQLDate from &#x27;graphql-date&#x27;;
 ┊ 2┊ 2┊import { withFilter } from &#x27;apollo-server&#x27;;
 ┊ 3┊ 3┊import { map } from &#x27;lodash&#x27;;
<b>+┊  ┊ 4┊import bcrypt from &#x27;bcrypt&#x27;;</b>
<b>+┊  ┊ 5┊import jwt from &#x27;jsonwebtoken&#x27;;</b>
 ┊ 4┊ 6┊
 ┊ 5┊ 7┊import { Group, Message, User } from &#x27;./connectors&#x27;;
 ┊ 6┊ 8┊import { pubsub } from &#x27;../subscriptions&#x27;;
<b>+┊  ┊ 9┊import { JWT_SECRET } from &#x27;../config&#x27;;</b>
 ┊ 7┊10┊
 ┊ 8┊11┊const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;
 ┊ 9┊12┊const GROUP_ADDED_TOPIC &#x3D; &#x27;groupAdded&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 88┊ 91┊      return Group.findOne({ where: { id } })
 ┊ 89┊ 92┊        .then(group &#x3D;&gt; group.update({ name }));
 ┊ 90┊ 93┊    },
<b>+┊   ┊ 94┊    login(_, { email, password }, ctx) {</b>
<b>+┊   ┊ 95┊      // find user by email</b>
<b>+┊   ┊ 96┊      return User.findOne({ where: { email } }).then((user) &#x3D;&gt; {</b>
<b>+┊   ┊ 97┊        if (user) {</b>
<b>+┊   ┊ 98┊          // validate password</b>
<b>+┊   ┊ 99┊          return bcrypt.compare(password, user.password).then((res) &#x3D;&gt; {</b>
<b>+┊   ┊100┊            if (res) {</b>
<b>+┊   ┊101┊              // create jwt</b>
<b>+┊   ┊102┊              const token &#x3D; jwt.sign({</b>
<b>+┊   ┊103┊                id: user.id,</b>
<b>+┊   ┊104┊                email: user.email,</b>
<b>+┊   ┊105┊              }, JWT_SECRET);</b>
<b>+┊   ┊106┊              user.jwt &#x3D; token;</b>
<b>+┊   ┊107┊              ctx.user &#x3D; Promise.resolve(user);</b>
<b>+┊   ┊108┊              return user;</b>
<b>+┊   ┊109┊            }</b>
<b>+┊   ┊110┊</b>
<b>+┊   ┊111┊            return Promise.reject(&#x27;password incorrect&#x27;);</b>
<b>+┊   ┊112┊          });</b>
<b>+┊   ┊113┊        }</b>
<b>+┊   ┊114┊</b>
<b>+┊   ┊115┊        return Promise.reject(&#x27;email not found&#x27;);</b>
<b>+┊   ┊116┊      });</b>
<b>+┊   ┊117┊    },</b>
<b>+┊   ┊118┊    signup(_, { email, password, username }, ctx) {</b>
<b>+┊   ┊119┊      // find user by email</b>
<b>+┊   ┊120┊      return User.findOne({ where: { email } }).then((existing) &#x3D;&gt; {</b>
<b>+┊   ┊121┊        if (!existing) {</b>
<b>+┊   ┊122┊          // hash password and create user</b>
<b>+┊   ┊123┊          return bcrypt.hash(password, 10).then(hash &#x3D;&gt; User.create({</b>
<b>+┊   ┊124┊            email,</b>
<b>+┊   ┊125┊            password: hash,</b>
<b>+┊   ┊126┊            username: username || email,</b>
<b>+┊   ┊127┊          })).then((user) &#x3D;&gt; {</b>
<b>+┊   ┊128┊            const { id } &#x3D; user;</b>
<b>+┊   ┊129┊            const token &#x3D; jwt.sign({ id, email }, JWT_SECRET);</b>
<b>+┊   ┊130┊            user.jwt &#x3D; token;</b>
<b>+┊   ┊131┊            ctx.user &#x3D; Promise.resolve(user);</b>
<b>+┊   ┊132┊            return user;</b>
<b>+┊   ┊133┊          });</b>
<b>+┊   ┊134┊        }</b>
<b>+┊   ┊135┊</b>
<b>+┊   ┊136┊        return Promise.reject(&#x27;email already exists&#x27;); // email already exists</b>
<b>+┊   ┊137┊      });</b>
<b>+┊   ┊138┊    },</b>
 ┊ 91┊139┊  },
 ┊ 92┊140┊  Subscription: {
 ┊ 93┊141┊    messageAdded: {
</pre>

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

#### [Step 7.5: Update fake data with hashed passwords](https://github.com/srtucker22/chatty/commit/04ca956)

##### Changed server&#x2F;data&#x2F;connectors.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import { _ } from &#x27;lodash&#x27;;
 ┊2┊2┊import faker from &#x27;faker&#x27;;
 ┊3┊3┊import Sequelize from &#x27;sequelize&#x27;;
<b>+┊ ┊4┊import bcrypt from &#x27;bcrypt&#x27;;</b>
 ┊4┊5┊
 ┊5┊6┊// initialize our database
 ┊6┊7┊const db &#x3D; new Sequelize(&#x27;chatty&#x27;, null, null, {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊53┊54┊  name: faker.lorem.words(3),
 ┊54┊55┊}).then(group &#x3D;&gt; _.times(USERS_PER_GROUP, () &#x3D;&gt; {
 ┊55┊56┊  const password &#x3D; faker.internet.password();
<b>+┊  ┊57┊  return bcrypt.hash(password, 10).then(hash &#x3D;&gt; group.createUser({</b>
 ┊57┊58┊    email: faker.internet.email(),
 ┊58┊59┊    username: faker.internet.userName(),
<b>+┊  ┊60┊    password: hash,</b>
 ┊60┊61┊  }).then((user) &#x3D;&gt; {
 ┊61┊62┊    console.log(
 ┊62┊63┊      &#x27;{email, username, password}&#x27;,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊68┊69┊      text: faker.lorem.sentences(3),
 ┊69┊70┊    }));
 ┊70┊71┊    return user;
<b>+┊  ┊72┊  }));</b>
 ┊72┊73┊})).then((userPromises) &#x3D;&gt; {
 ┊73┊74┊  // make users friends with all users in the group
 ┊74┊75┊  Promise.all(userPromises).then((users) &#x3D;&gt; {
</pre>

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

#### [Step 7.6: Create logic.js](https://github.com/srtucker22/chatty/commit/a454bf4)

##### Added server&#x2F;data&#x2F;logic.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import { ApolloError, AuthenticationError, ForbiddenError } from &#x27;apollo-server&#x27;;</b>
<b>+┊  ┊ 2┊import { Message } from &#x27;./connectors&#x27;;</b>
<b>+┊  ┊ 3┊</b>
<b>+┊  ┊ 4┊// reusable function to check for a user with context</b>
<b>+┊  ┊ 5┊function getAuthenticatedUser(ctx) {</b>
<b>+┊  ┊ 6┊  return ctx.user.then((user) &#x3D;&gt; {</b>
<b>+┊  ┊ 7┊    if (!user) {</b>
<b>+┊  ┊ 8┊      throw new AuthenticationError(&#x27;Unauthenticated&#x27;);</b>
<b>+┊  ┊ 9┊    }</b>
<b>+┊  ┊10┊    return user;</b>
<b>+┊  ┊11┊  });</b>
<b>+┊  ┊12┊}</b>
<b>+┊  ┊13┊</b>
<b>+┊  ┊14┊export const messageLogic &#x3D; {</b>
<b>+┊  ┊15┊  createMessage(_, { text, groupId }, ctx) {</b>
<b>+┊  ┊16┊    return getAuthenticatedUser(ctx)</b>
<b>+┊  ┊17┊      .then(user &#x3D;&gt; user.getGroups({ where: { id: groupId }, attributes: [&#x27;id&#x27;] })</b>
<b>+┊  ┊18┊        .then((group) &#x3D;&gt; {</b>
<b>+┊  ┊19┊          if (group.length) {</b>
<b>+┊  ┊20┊            return Message.create({</b>
<b>+┊  ┊21┊              userId: user.id,</b>
<b>+┊  ┊22┊              text,</b>
<b>+┊  ┊23┊              groupId,</b>
<b>+┊  ┊24┊            });</b>
<b>+┊  ┊25┊          }</b>
<b>+┊  ┊26┊          throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>+┊  ┊27┊        }));</b>
<b>+┊  ┊28┊  },</b>
<b>+┊  ┊29┊};</b>
</pre>

[}]: #

We’ve separated out the function `getAuthenticatedUser` to check whether a `User` is making a request. We’ll be able to reuse this function across our logic for other requests.

Now we can start injecting this logic into our Resolvers:

[{]: <helper> (diffStep 7.7)

#### [Step 7.7: Apply messageLogic to createMessage resolver](https://github.com/srtucker22/chatty/commit/fcdbee1)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 7┊ 7┊import { Group, Message, User } from &#x27;./connectors&#x27;;
 ┊ 8┊ 8┊import { pubsub } from &#x27;../subscriptions&#x27;;
 ┊ 9┊ 9┊import { JWT_SECRET } from &#x27;../config&#x27;;
<b>+┊  ┊10┊import { messageLogic } from &#x27;./logic&#x27;;</b>
 ┊10┊11┊
 ┊11┊12┊const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;
 ┊12┊13┊const GROUP_ADDED_TOPIC &#x3D; &#x27;groupAdded&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊37┊38┊    },
 ┊38┊39┊  },
 ┊39┊40┊  Mutation: {
<b>+┊  ┊41┊    createMessage(_, args, ctx) {</b>
<b>+┊  ┊42┊      return messageLogic.createMessage(_, args, ctx)</b>
<b>+┊  ┊43┊        .then((message) &#x3D;&gt; {</b>
<b>+┊  ┊44┊          // Publish subscription notification with message</b>
<b>+┊  ┊45┊          pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });</b>
<b>+┊  ┊46┊          return message;</b>
<b>+┊  ┊47┊        });</b>
 ┊50┊48┊    },
 ┊51┊49┊    createGroup(_, { name, userIds, userId }) {
 ┊52┊50┊      return User.findOne({ where: { id: userId } })
</pre>

[}]: #

`createMessage` will return the result of the logic in `messageLogic`,  which returns a Promise that either successfully resolves to the new `Message` or rejects due to failed authorization.

Let’s fill out our logic in `server/data/logic.js` to cover all GraphQL Types, Queries and Mutations:

[{]: <helper> (diffStep 7.8)

#### [Step 7.8: Create logic for all Resolvers](https://github.com/srtucker22/chatty/commit/45b2e94)

##### Changed server&#x2F;data&#x2F;logic.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import { ApolloError, AuthenticationError, ForbiddenError } from &#x27;apollo-server&#x27;;
<b>+┊ ┊2┊import { Group, Message, User } from &#x27;./connectors&#x27;;</b>
 ┊3┊3┊
 ┊4┊4┊// reusable function to check for a user with context
 ┊5┊5┊function getAuthenticatedUser(ctx) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊12┊12┊}
 ┊13┊13┊
 ┊14┊14┊export const messageLogic &#x3D; {
<b>+┊  ┊15┊  from(message) {</b>
<b>+┊  ┊16┊    return message.getUser({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });</b>
<b>+┊  ┊17┊  },</b>
<b>+┊  ┊18┊  to(message) {</b>
<b>+┊  ┊19┊    return message.getGroup({ attributes: [&#x27;id&#x27;, &#x27;name&#x27;] });</b>
<b>+┊  ┊20┊  },</b>
 ┊15┊21┊  createMessage(_, { text, groupId }, ctx) {
 ┊16┊22┊    return getAuthenticatedUser(ctx)
 ┊17┊23┊      .then(user &#x3D;&gt; user.getGroups({ where: { id: groupId }, attributes: [&#x27;id&#x27;] })
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 27┊ 33┊        }));
 ┊ 28┊ 34┊  },
 ┊ 29┊ 35┊};
<b>+┊   ┊ 36┊</b>
<b>+┊   ┊ 37┊export const groupLogic &#x3D; {</b>
<b>+┊   ┊ 38┊  users(group) {</b>
<b>+┊   ┊ 39┊    return group.getUsers({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });</b>
<b>+┊   ┊ 40┊  },</b>
<b>+┊   ┊ 41┊  messages(group, { first, last, before, after }) {</b>
<b>+┊   ┊ 42┊    // base query -- get messages from the right group</b>
<b>+┊   ┊ 43┊    const where &#x3D; { groupId: group.id };</b>
<b>+┊   ┊ 44┊</b>
<b>+┊   ┊ 45┊    // because we return messages from newest -&gt; oldest</b>
<b>+┊   ┊ 46┊    // before actually means newer (date &gt; cursor)</b>
<b>+┊   ┊ 47┊    // after actually means older (date &lt; cursor)</b>
<b>+┊   ┊ 48┊</b>
<b>+┊   ┊ 49┊    if (before) {</b>
<b>+┊   ┊ 50┊      // convert base-64 to utf8 iso date and use in Date constructor</b>
<b>+┊   ┊ 51┊      where.id &#x3D; { $gt: Buffer.from(before, &#x27;base64&#x27;).toString() };</b>
<b>+┊   ┊ 52┊    }</b>
<b>+┊   ┊ 53┊</b>
<b>+┊   ┊ 54┊    if (after) {</b>
<b>+┊   ┊ 55┊      where.id &#x3D; { $lt: Buffer.from(after, &#x27;base64&#x27;).toString() };</b>
<b>+┊   ┊ 56┊    }</b>
<b>+┊   ┊ 57┊</b>
<b>+┊   ┊ 58┊    return Message.findAll({</b>
<b>+┊   ┊ 59┊      where,</b>
<b>+┊   ┊ 60┊      order: [[&#x27;id&#x27;, &#x27;DESC&#x27;]],</b>
<b>+┊   ┊ 61┊      limit: first || last,</b>
<b>+┊   ┊ 62┊    }).then((messages) &#x3D;&gt; {</b>
<b>+┊   ┊ 63┊      const edges &#x3D; messages.map(message &#x3D;&gt; ({</b>
<b>+┊   ┊ 64┊        cursor: Buffer.from(message.id.toString()).toString(&#x27;base64&#x27;), // convert createdAt to cursor</b>
<b>+┊   ┊ 65┊        node: message, // the node is the message itself</b>
<b>+┊   ┊ 66┊      }));</b>
<b>+┊   ┊ 67┊</b>
<b>+┊   ┊ 68┊      return {</b>
<b>+┊   ┊ 69┊        edges,</b>
<b>+┊   ┊ 70┊        pageInfo: {</b>
<b>+┊   ┊ 71┊          hasNextPage() {</b>
<b>+┊   ┊ 72┊            if (messages.length &lt; (last || first)) {</b>
<b>+┊   ┊ 73┊              return Promise.resolve(false);</b>
<b>+┊   ┊ 74┊            }</b>
<b>+┊   ┊ 75┊</b>
<b>+┊   ┊ 76┊            return Message.findOne({</b>
<b>+┊   ┊ 77┊              where: {</b>
<b>+┊   ┊ 78┊                groupId: group.id,</b>
<b>+┊   ┊ 79┊                id: {</b>
<b>+┊   ┊ 80┊                  [before ? &#x27;$gt&#x27; : &#x27;$lt&#x27;]: messages[messages.length - 1].id,</b>
<b>+┊   ┊ 81┊                },</b>
<b>+┊   ┊ 82┊              },</b>
<b>+┊   ┊ 83┊              order: [[&#x27;id&#x27;, &#x27;DESC&#x27;]],</b>
<b>+┊   ┊ 84┊            }).then(message &#x3D;&gt; !!message);</b>
<b>+┊   ┊ 85┊          },</b>
<b>+┊   ┊ 86┊          hasPreviousPage() {</b>
<b>+┊   ┊ 87┊            return Message.findOne({</b>
<b>+┊   ┊ 88┊              where: {</b>
<b>+┊   ┊ 89┊                groupId: group.id,</b>
<b>+┊   ┊ 90┊                id: where.id,</b>
<b>+┊   ┊ 91┊              },</b>
<b>+┊   ┊ 92┊              order: [[&#x27;id&#x27;]],</b>
<b>+┊   ┊ 93┊            }).then(message &#x3D;&gt; !!message);</b>
<b>+┊   ┊ 94┊          },</b>
<b>+┊   ┊ 95┊        },</b>
<b>+┊   ┊ 96┊      };</b>
<b>+┊   ┊ 97┊    });</b>
<b>+┊   ┊ 98┊  },</b>
<b>+┊   ┊ 99┊  query(_, { id }, ctx) {</b>
<b>+┊   ┊100┊    return getAuthenticatedUser(ctx).then(user &#x3D;&gt; Group.findOne({</b>
<b>+┊   ┊101┊      where: { id },</b>
<b>+┊   ┊102┊      include: [{</b>
<b>+┊   ┊103┊        model: User,</b>
<b>+┊   ┊104┊        where: { id: user.id },</b>
<b>+┊   ┊105┊      }],</b>
<b>+┊   ┊106┊    }));</b>
<b>+┊   ┊107┊  },</b>
<b>+┊   ┊108┊  createGroup(_, { name, userIds }, ctx) {</b>
<b>+┊   ┊109┊    return getAuthenticatedUser(ctx)</b>
<b>+┊   ┊110┊      .then(user &#x3D;&gt; user.getFriends({ where: { id: { $in: userIds } } })</b>
<b>+┊   ┊111┊        .then((friends) &#x3D;&gt; { // eslint-disable-line arrow-body-style</b>
<b>+┊   ┊112┊          return Group.create({</b>
<b>+┊   ┊113┊            name,</b>
<b>+┊   ┊114┊          }).then((group) &#x3D;&gt; { // eslint-disable-line arrow-body-style</b>
<b>+┊   ┊115┊            return group.addUsers([user, ...friends]).then(() &#x3D;&gt; {</b>
<b>+┊   ┊116┊              group.users &#x3D; [user, ...friends];</b>
<b>+┊   ┊117┊              return group;</b>
<b>+┊   ┊118┊            });</b>
<b>+┊   ┊119┊          });</b>
<b>+┊   ┊120┊        }));</b>
<b>+┊   ┊121┊  },</b>
<b>+┊   ┊122┊  deleteGroup(_, { id }, ctx) {</b>
<b>+┊   ┊123┊    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; { // eslint-disable-line arrow-body-style</b>
<b>+┊   ┊124┊      return Group.findOne({</b>
<b>+┊   ┊125┊        where: { id },</b>
<b>+┊   ┊126┊        include: [{</b>
<b>+┊   ┊127┊          model: User,</b>
<b>+┊   ┊128┊          where: { id: user.id },</b>
<b>+┊   ┊129┊        }],</b>
<b>+┊   ┊130┊      }).then(group &#x3D;&gt; group.getUsers()</b>
<b>+┊   ┊131┊        .then(users &#x3D;&gt; group.removeUsers(users))</b>
<b>+┊   ┊132┊        .then(() &#x3D;&gt; Message.destroy({ where: { groupId: group.id } }))</b>
<b>+┊   ┊133┊        .then(() &#x3D;&gt; group.destroy()));</b>
<b>+┊   ┊134┊    });</b>
<b>+┊   ┊135┊  },</b>
<b>+┊   ┊136┊  leaveGroup(_, { id }, ctx) {</b>
<b>+┊   ┊137┊    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; {</b>
<b>+┊   ┊138┊      return Group.findOne({</b>
<b>+┊   ┊139┊        where: { id },</b>
<b>+┊   ┊140┊        include: [{</b>
<b>+┊   ┊141┊          model: User,</b>
<b>+┊   ┊142┊          where: { id: user.id },</b>
<b>+┊   ┊143┊        }],</b>
<b>+┊   ┊144┊      }).then((group) &#x3D;&gt; {</b>
<b>+┊   ┊145┊        if (!group) {</b>
<b>+┊   ┊146┊          throw new ApolloError(&#x27;No group found&#x27;, 404);</b>
<b>+┊   ┊147┊        }</b>
<b>+┊   ┊148┊</b>
<b>+┊   ┊149┊        return group.removeUser(user.id)</b>
<b>+┊   ┊150┊          .then(() &#x3D;&gt; group.getUsers())</b>
<b>+┊   ┊151┊          .then((users) &#x3D;&gt; {</b>
<b>+┊   ┊152┊            // if the last user is leaving, remove the group</b>
<b>+┊   ┊153┊            if (!users.length) {</b>
<b>+┊   ┊154┊              group.destroy();</b>
<b>+┊   ┊155┊            }</b>
<b>+┊   ┊156┊            return { id };</b>
<b>+┊   ┊157┊          });</b>
<b>+┊   ┊158┊      });</b>
<b>+┊   ┊159┊    });</b>
<b>+┊   ┊160┊  },</b>
<b>+┊   ┊161┊  updateGroup(_, { id, name }, ctx) {</b>
<b>+┊   ┊162┊    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; { // eslint-disable-line arrow-body-style</b>
<b>+┊   ┊163┊      return Group.findOne({</b>
<b>+┊   ┊164┊        where: { id },</b>
<b>+┊   ┊165┊        include: [{</b>
<b>+┊   ┊166┊          model: User,</b>
<b>+┊   ┊167┊          where: { id: user.id },</b>
<b>+┊   ┊168┊        }],</b>
<b>+┊   ┊169┊      }).then(group &#x3D;&gt; group.update({ name }));</b>
<b>+┊   ┊170┊    });</b>
<b>+┊   ┊171┊  },</b>
<b>+┊   ┊172┊};</b>
<b>+┊   ┊173┊</b>
<b>+┊   ┊174┊export const userLogic &#x3D; {</b>
<b>+┊   ┊175┊  email(user, args, ctx) {</b>
<b>+┊   ┊176┊    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>+┊   ┊177┊      if (currentUser.id &#x3D;&#x3D;&#x3D; user.id) {</b>
<b>+┊   ┊178┊        return currentUser.email;</b>
<b>+┊   ┊179┊      }</b>
<b>+┊   ┊180┊</b>
<b>+┊   ┊181┊      throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊182┊    });</b>
<b>+┊   ┊183┊  },</b>
<b>+┊   ┊184┊  friends(user, args, ctx) {</b>
<b>+┊   ┊185┊    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>+┊   ┊186┊      if (currentUser.id !&#x3D;&#x3D; user.id) {</b>
<b>+┊   ┊187┊        throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊188┊      }</b>
<b>+┊   ┊189┊</b>
<b>+┊   ┊190┊      return user.getFriends({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });</b>
<b>+┊   ┊191┊    });</b>
<b>+┊   ┊192┊  },</b>
<b>+┊   ┊193┊  groups(user, args, ctx) {</b>
<b>+┊   ┊194┊    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>+┊   ┊195┊      if (currentUser.id !&#x3D;&#x3D; user.id) {</b>
<b>+┊   ┊196┊        throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊197┊      }</b>
<b>+┊   ┊198┊</b>
<b>+┊   ┊199┊      return user.getGroups();</b>
<b>+┊   ┊200┊    });</b>
<b>+┊   ┊201┊  },</b>
<b>+┊   ┊202┊  jwt(user) {</b>
<b>+┊   ┊203┊    return Promise.resolve(user.jwt);</b>
<b>+┊   ┊204┊  },</b>
<b>+┊   ┊205┊  messages(user, args, ctx) {</b>
<b>+┊   ┊206┊    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>+┊   ┊207┊      if (currentUser.id !&#x3D;&#x3D; user.id) {</b>
<b>+┊   ┊208┊        throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊209┊      }</b>
<b>+┊   ┊210┊</b>
<b>+┊   ┊211┊      return Message.findAll({</b>
<b>+┊   ┊212┊        where: { userId: user.id },</b>
<b>+┊   ┊213┊        order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],</b>
<b>+┊   ┊214┊      });</b>
<b>+┊   ┊215┊    });</b>
<b>+┊   ┊216┊  },</b>
<b>+┊   ┊217┊  query(_, args, ctx) {</b>
<b>+┊   ┊218┊    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; {</b>
<b>+┊   ┊219┊      if (user.id &#x3D;&#x3D;&#x3D; args.id || user.email &#x3D;&#x3D;&#x3D; args.email) {</b>
<b>+┊   ┊220┊        return user;</b>
<b>+┊   ┊221┊      }</b>
<b>+┊   ┊222┊</b>
<b>+┊   ┊223┊      throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊224┊    });</b>
<b>+┊   ┊225┊  },</b>
<b>+┊   ┊226┊};</b>
</pre>

[}]: #

And now let’s apply that logic to the Resolvers in `server/data/resolvers.js`:

[{]: <helper> (diffStep 7.9)

#### [Step 7.9: Apply logic to all Resolvers](https://github.com/srtucker22/chatty/commit/94efcf9)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 7┊ 7┊import { Group, Message, User } from &#x27;./connectors&#x27;;
 ┊ 8┊ 8┊import { pubsub } from &#x27;../subscriptions&#x27;;
 ┊ 9┊ 9┊import { JWT_SECRET } from &#x27;../config&#x27;;
<b>+┊  ┊10┊import { groupLogic, messageLogic, userLogic } from &#x27;./logic&#x27;;</b>
 ┊11┊11┊
 ┊12┊12┊const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;
 ┊13┊13┊const GROUP_ADDED_TOPIC &#x3D; &#x27;groupAdded&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊24┊24┊    },
 ┊25┊25┊  },
 ┊26┊26┊  Query: {
<b>+┊  ┊27┊    group(_, args, ctx) {</b>
<b>+┊  ┊28┊      return groupLogic.query(_, args, ctx);</b>
 ┊29┊29┊    },
<b>+┊  ┊30┊    user(_, args, ctx) {</b>
<b>+┊  ┊31┊      return userLogic.query(_, args, ctx);</b>
 ┊38┊32┊    },
 ┊39┊33┊  },
 ┊40┊34┊  Mutation: {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊46┊40┊          return message;
 ┊47┊41┊        });
 ┊48┊42┊    },
<b>+┊  ┊43┊    createGroup(_, args, ctx) {</b>
<b>+┊  ┊44┊      return groupLogic.createGroup(_, args, ctx).then((group) &#x3D;&gt; {</b>
<b>+┊  ┊45┊        pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });</b>
<b>+┊  ┊46┊        return group;</b>
<b>+┊  ┊47┊      });</b>
 ┊87┊48┊    },
<b>+┊  ┊49┊    deleteGroup(_, args, ctx) {</b>
<b>+┊  ┊50┊      return groupLogic.deleteGroup(_, args, ctx);</b>
<b>+┊  ┊51┊    },</b>
<b>+┊  ┊52┊    leaveGroup(_, args, ctx) {</b>
<b>+┊  ┊53┊      return groupLogic.leaveGroup(_, args, ctx);</b>
<b>+┊  ┊54┊    },</b>
<b>+┊  ┊55┊    updateGroup(_, args, ctx) {</b>
<b>+┊  ┊56┊      return groupLogic.updateGroup(_, args, ctx);</b>
 ┊91┊57┊    },
 ┊92┊58┊    login(_, { email, password }, ctx) {
 ┊93┊59┊      // find user by email
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊162┊128┊    },
 ┊163┊129┊  },
 ┊164┊130┊  Group: {
<b>+┊   ┊131┊    users(group, args, ctx) {</b>
<b>+┊   ┊132┊      return groupLogic.users(group, args, ctx);</b>
 ┊167┊133┊    },
<b>+┊   ┊134┊    messages(group, args, ctx) {</b>
<b>+┊   ┊135┊      return groupLogic.messages(group, args, ctx);</b>
 ┊225┊136┊    },
 ┊226┊137┊  },
 ┊227┊138┊  Message: {
<b>+┊   ┊139┊    to(message, args, ctx) {</b>
<b>+┊   ┊140┊      return messageLogic.to(message, args, ctx);</b>
 ┊230┊141┊    },
<b>+┊   ┊142┊    from(message, args, ctx) {</b>
<b>+┊   ┊143┊      return messageLogic.from(message, args, ctx);</b>
 ┊233┊144┊    },
 ┊234┊145┊  },
 ┊235┊146┊  User: {
<b>+┊   ┊147┊    email(user, args, ctx) {</b>
<b>+┊   ┊148┊      return userLogic.email(user, args, ctx);</b>
<b>+┊   ┊149┊    },</b>
<b>+┊   ┊150┊    friends(user, args, ctx) {</b>
<b>+┊   ┊151┊      return userLogic.friends(user, args, ctx);</b>
<b>+┊   ┊152┊    },</b>
<b>+┊   ┊153┊    groups(user, args, ctx) {</b>
<b>+┊   ┊154┊      return userLogic.groups(user, args, ctx);</b>
 ┊241┊155┊    },
<b>+┊   ┊156┊    jwt(user, args, ctx) {</b>
<b>+┊   ┊157┊      return userLogic.jwt(user, args, ctx);</b>
 ┊244┊158┊    },
<b>+┊   ┊159┊    messages(user, args, ctx) {</b>
<b>+┊   ┊160┊      return userLogic.messages(user, args, ctx);</b>
 ┊247┊161┊    },
 ┊248┊162┊  },
 ┊249┊163┊};
</pre>

[}]: #

We also need to update our subscription filters with the user context. Fortunately, `withFilter` can return a `Boolean` or `Promise<Boolean>`.

[{]: <helper> (diffStep "7.10")

#### [Step 7.10: Apply user context to subscription filters](https://github.com/srtucker22/chatty/commit/bb5a6d6)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊105┊105┊    messageAdded: {
 ┊106┊106┊      subscribe: withFilter(
 ┊107┊107┊        () &#x3D;&gt; pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),
<b>+┊   ┊108┊        (payload, args, ctx) &#x3D;&gt; {</b>
<b>+┊   ┊109┊          return ctx.user.then((user) &#x3D;&gt; {</b>
<b>+┊   ┊110┊            return Boolean(</b>
<b>+┊   ┊111┊              args.groupIds &amp;&amp;</b>
<b>+┊   ┊112┊              ~args.groupIds.indexOf(payload.messageAdded.groupId) &amp;&amp;</b>
<b>+┊   ┊113┊              user.id !&#x3D;&#x3D; payload.messageAdded.userId, // don&#x27;t send to user creating message</b>
<b>+┊   ┊114┊            );</b>
<b>+┊   ┊115┊          });</b>
 ┊114┊116┊        },
 ┊115┊117┊      ),
 ┊116┊118┊    },
 ┊117┊119┊    groupAdded: {
 ┊118┊120┊      subscribe: withFilter(
 ┊119┊121┊        () &#x3D;&gt; pubsub.asyncIterator(GROUP_ADDED_TOPIC),
<b>+┊   ┊122┊        (payload, args, ctx) &#x3D;&gt; {</b>
<b>+┊   ┊123┊          return ctx.user.then((user) &#x3D;&gt; {</b>
<b>+┊   ┊124┊            return Boolean(</b>
<b>+┊   ┊125┊              args.userId &amp;&amp;</b>
<b>+┊   ┊126┊              ~map(payload.groupAdded.users, &#x27;id&#x27;).indexOf(args.userId) &amp;&amp;</b>
<b>+┊   ┊127┊              user.id !&#x3D;&#x3D; payload.groupAdded.users[0].id, // don&#x27;t send to user creating group</b>
<b>+┊   ┊128┊            );</b>
<b>+┊   ┊129┊          });</b>
 ┊126┊130┊        },
 ┊127┊131┊      ),
 ┊128┊132┊    },
</pre>

[}]: #

So much cleaner and **WAY** more secure!

## The Expired Password Problem
We still have one last thing that needs modifying in our authorization setup. When a user changes their password, we issue a new JWT, but the old JWT will still pass verification! This can become a serious problem if a hacker gets ahold of a user’s password. To close the loop on this issue, we can make a clever little adjustment to our `UserModel` database model to include a `version` parameter, which will be a counter that increments with each new password for the user. We’ll incorporate `version` into our JWT so only the newest JWT will pass our security. Let’s update `ApolloServer` and our Connectors and Resolvers accordingly:

[{]: <helper> (diffStep "7.11")

#### [Step 7.11: Apply versioning to JWT auth](https://github.com/srtucker22/chatty/commit/c4594e1)

##### Changed server&#x2F;data&#x2F;connectors.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊25┊25┊  email: { type: Sequelize.STRING },
 ┊26┊26┊  username: { type: Sequelize.STRING },
 ┊27┊27┊  password: { type: Sequelize.STRING },
<b>+┊  ┊28┊  version: { type: Sequelize.INTEGER }, // version the password</b>
 ┊28┊29┊});
 ┊29┊30┊
 ┊30┊31┊// users belong to multiple groups
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊58┊59┊    email: faker.internet.email(),
 ┊59┊60┊    username: faker.internet.userName(),
 ┊60┊61┊    password: hash,
<b>+┊  ┊62┊    version: 1,</b>
 ┊61┊63┊  }).then((user) &#x3D;&gt; {
 ┊62┊64┊    console.log(
 ┊63┊65┊      &#x27;{email, username, password}&#x27;,
</pre>

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊66┊66┊              const token &#x3D; jwt.sign({
 ┊67┊67┊                id: user.id,
 ┊68┊68┊                email: user.email,
<b>+┊  ┊69┊                version: user.version,</b>
 ┊69┊70┊              }, JWT_SECRET);
 ┊70┊71┊              user.jwt &#x3D; token;
 ┊71┊72┊              ctx.user &#x3D; Promise.resolve(user);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊88┊89┊            email,
 ┊89┊90┊            password: hash,
 ┊90┊91┊            username: username || email,
<b>+┊  ┊92┊            version: 1,</b>
 ┊91┊93┊          })).then((user) &#x3D;&gt; {
 ┊92┊94┊            const { id } &#x3D; user;
<b>+┊  ┊95┊            const token &#x3D; jwt.sign({ id, email, version: 1 }, JWT_SECRET);</b>
 ┊94┊96┊            user.jwt &#x3D; token;
 ┊95┊97┊            ctx.user &#x3D; Promise.resolve(user);
 ┊96┊98┊            return user;
</pre>

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊26┊26┊        credentialsRequired: false,
 ┊27┊27┊      })(req, res, (e) &#x3D;&gt; {
 ┊28┊28┊        if (req.user) {
<b>+┊  ┊29┊          resolve(User.findOne({ where: { id: req.user.id, version: req.user.version } }));</b>
 ┊30┊30┊        } else {
 ┊31┊31┊          resolve(null);
 ┊32┊32┊        }
</pre>

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

#### [Step 7.12: Add onConnect to ApolloServer config](https://github.com/srtucker22/chatty/commit/9ba4cad)

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊import { ApolloServer, AuthenticationError } from &#x27;apollo-server&#x27;;</b>
 ┊2┊2┊import jwt from &#x27;express-jwt&#x27;;
<b>+┊ ┊3┊import jsonwebtoken from &#x27;jsonwebtoken&#x27;;</b>
 ┊3┊4┊
 ┊4┊5┊import { typeDefs } from &#x27;./data/schema&#x27;;
 ┊5┊6┊import { mocks } from &#x27;./data/mocks&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊17┊18┊    // web socket subscriptions will return a connection
 ┊18┊19┊    if (connection) {
 ┊19┊20┊      // check connection for metadata
<b>+┊  ┊21┊      return connection.context;</b>
 ┊21┊22┊    }
 ┊22┊23┊
 ┊23┊24┊    const user &#x3D; new Promise((resolve, reject) &#x3D;&gt; {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊36┊37┊      user,
 ┊37┊38┊    };
 ┊38┊39┊  },
<b>+┊  ┊40┊  subscriptions: {</b>
<b>+┊  ┊41┊    onConnect(connectionParams, websocket, wsContext) {</b>
<b>+┊  ┊42┊      const userPromise &#x3D; new Promise((res, rej) &#x3D;&gt; {</b>
<b>+┊  ┊43┊        if (connectionParams.jwt) {</b>
<b>+┊  ┊44┊          jsonwebtoken.verify(</b>
<b>+┊  ┊45┊            connectionParams.jwt, JWT_SECRET,</b>
<b>+┊  ┊46┊            (err, decoded) &#x3D;&gt; {</b>
<b>+┊  ┊47┊              if (err) {</b>
<b>+┊  ┊48┊                rej(new AuthenticationError(&#x27;No token&#x27;));</b>
<b>+┊  ┊49┊              }</b>
<b>+┊  ┊50┊</b>
<b>+┊  ┊51┊              res(User.findOne({ where: { id: decoded.id, version: decoded.version } }));</b>
<b>+┊  ┊52┊            },</b>
<b>+┊  ┊53┊          );</b>
<b>+┊  ┊54┊        } else {</b>
<b>+┊  ┊55┊          rej(new AuthenticationError(&#x27;No token&#x27;));</b>
<b>+┊  ┊56┊        }</b>
<b>+┊  ┊57┊      });</b>
<b>+┊  ┊58┊</b>
<b>+┊  ┊59┊      return userPromise.then((user) &#x3D;&gt; {</b>
<b>+┊  ┊60┊        if (user) {</b>
<b>+┊  ┊61┊          return { user: Promise.resolve(user) };</b>
<b>+┊  ┊62┊        }</b>
<b>+┊  ┊63┊</b>
<b>+┊  ┊64┊        return Promise.reject(new AuthenticationError(&#x27;No user&#x27;));</b>
<b>+┊  ┊65┊      });</b>
<b>+┊  ┊66┊    },</b>
<b>+┊  ┊67┊  },</b>
 ┊39┊68┊});
 ┊40┊69┊
 ┊41┊70┊server.listen({ port: PORT }).then(({ url }) &#x3D;&gt; console.log(&#x60;🚀 Server ready at ${url}&#x60;));
</pre>

[}]: #

First, `onConnect` will use `jsonwebtoken` to verify and decode `connectionParams.jwt` to extract a `User` from the database. It will do this work within a new Promise called `user`.

Second, we need to write our `subscriptionLogic` to validate whether this `User` is allowed to subscribe to this particular subscription:

[{]: <helper> (diffStep 7.13 files="server/data/logic.js")

#### [Step 7.13: Create subscriptionLogic](https://github.com/srtucker22/chatty/commit/db763df)

##### Changed server&#x2F;data&#x2F;logic.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊224┊224┊    });
 ┊225┊225┊  },
 ┊226┊226┊};
<b>+┊   ┊227┊</b>
<b>+┊   ┊228┊export const subscriptionLogic &#x3D; {</b>
<b>+┊   ┊229┊  groupAdded(params, args, ctx) {</b>
<b>+┊   ┊230┊    return getAuthenticatedUser(ctx)</b>
<b>+┊   ┊231┊      .then((user) &#x3D;&gt; {</b>
<b>+┊   ┊232┊        if (user.id !&#x3D;&#x3D; args.userId) {</b>
<b>+┊   ┊233┊          throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊234┊        }</b>
<b>+┊   ┊235┊</b>
<b>+┊   ┊236┊        return Promise.resolve();</b>
<b>+┊   ┊237┊      });</b>
<b>+┊   ┊238┊  },</b>
<b>+┊   ┊239┊  messageAdded(params, args, ctx) {</b>
<b>+┊   ┊240┊    return getAuthenticatedUser(ctx)</b>
<b>+┊   ┊241┊      .then(user &#x3D;&gt; user.getGroups({ where: { id: { $in: args.groupIds } }, attributes: [&#x27;id&#x27;] })</b>
<b>+┊   ┊242┊        .then((groups) &#x3D;&gt; {</b>
<b>+┊   ┊243┊          // user attempted to subscribe to some groups without access</b>
<b>+┊   ┊244┊          if (args.groupIds.length &gt; groups.length) {</b>
<b>+┊   ┊245┊            throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊246┊          }</b>
<b>+┊   ┊247┊</b>
<b>+┊   ┊248┊          return Promise.resolve();</b>
<b>+┊   ┊249┊        }));</b>
<b>+┊   ┊250┊  },</b>
<b>+┊   ┊251┊};</b>
</pre>

[}]: #

Finally, we need a way to run this logic when the subscription will attempt to be initiated. This happens inside our resolvers when we run `pubsub.asyncIterator`, returning the `AsyncIterator` that will listen for events and trigger our server to send WebSocket emittions. We'll need to update this `AsyncIterator` generator to first validate through our `subscriptionLogic` and throw an error if the request is unauthorized. We can create a `pubsub.asyncAuthIterator` function that looks like `pubsub.asyncIterator`, but takes an extra `authPromise` argument that will need to resolve before any data gets passed from the `AsyncIterator` this function creates.

[{]: <helper> (diffStep 7.13 files="server/subscriptions.js")

#### [Step 7.13: Create subscriptionLogic](https://github.com/srtucker22/chatty/commit/db763df)

##### Changed server&#x2F;subscriptions.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import { $$asyncIterator } from &#x27;iterall&#x27;;</b>
 ┊ 1┊ 2┊import { PubSub } from &#x27;apollo-server&#x27;;
 ┊ 2┊ 3┊
 ┊ 3┊ 4┊export const pubsub &#x3D; new PubSub();
 ┊ 4┊ 5┊
<b>+┊  ┊ 6┊pubsub.asyncAuthIterator &#x3D; (messages, authPromise) &#x3D;&gt; {</b>
<b>+┊  ┊ 7┊  const asyncIterator &#x3D; pubsub.asyncIterator(messages);</b>
<b>+┊  ┊ 8┊  return {</b>
<b>+┊  ┊ 9┊    next() {</b>
<b>+┊  ┊10┊      return authPromise.then(() &#x3D;&gt; asyncIterator.next());</b>
<b>+┊  ┊11┊    },</b>
<b>+┊  ┊12┊    return() {</b>
<b>+┊  ┊13┊      return authPromise.then(() &#x3D;&gt; asyncIterator.return());</b>
<b>+┊  ┊14┊    },</b>
<b>+┊  ┊15┊    throw(error) {</b>
<b>+┊  ┊16┊      return asyncIterator.throw(error);</b>
<b>+┊  ┊17┊    },</b>
<b>+┊  ┊18┊    [$$asyncIterator]() {</b>
<b>+┊  ┊19┊      return asyncIterator;</b>
<b>+┊  ┊20┊    },</b>
<b>+┊  ┊21┊  };</b>
<b>+┊  ┊22┊};</b>
<b>+┊  ┊23┊</b>
 ┊ 5┊24┊export default pubsub;
</pre>

[}]: #

We can stick this `pubsub.asyncAuthIterator` in our resolvers like so:

[{]: <helper> (diffStep 7.13 files="server/data/resolvers.js")

#### [Step 7.13: Create subscriptionLogic](https://github.com/srtucker22/chatty/commit/db763df)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 7┊ 7┊import { Group, Message, User } from &#x27;./connectors&#x27;;
 ┊ 8┊ 8┊import { pubsub } from &#x27;../subscriptions&#x27;;
 ┊ 9┊ 9┊import { JWT_SECRET } from &#x27;../config&#x27;;
<b>+┊  ┊10┊import { groupLogic, messageLogic, userLogic, subscriptionLogic } from &#x27;./logic&#x27;;</b>
 ┊11┊11┊
 ┊12┊12┊const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;
 ┊13┊13┊const GROUP_ADDED_TOPIC &#x3D; &#x27;groupAdded&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊106┊106┊  Subscription: {
 ┊107┊107┊    messageAdded: {
 ┊108┊108┊      subscribe: withFilter(
<b>+┊   ┊109┊        (payload, args, ctx) &#x3D;&gt; pubsub.asyncAuthIterator(</b>
<b>+┊   ┊110┊          MESSAGE_ADDED_TOPIC,</b>
<b>+┊   ┊111┊          subscriptionLogic.messageAdded(payload, args, ctx),</b>
<b>+┊   ┊112┊        ),</b>
 ┊110┊113┊        (payload, args, ctx) &#x3D;&gt; {
 ┊111┊114┊          return ctx.user.then((user) &#x3D;&gt; {
 ┊112┊115┊            return Boolean(
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊120┊123┊    },
 ┊121┊124┊    groupAdded: {
 ┊122┊125┊      subscribe: withFilter(
<b>+┊   ┊126┊        (payload, args, ctx) &#x3D;&gt; pubsub.asyncAuthIterator(</b>
<b>+┊   ┊127┊          GROUP_ADDED_TOPIC,</b>
<b>+┊   ┊128┊          subscriptionLogic.groupAdded(payload, args, ctx),</b>
<b>+┊   ┊129┊        ),</b>
 ┊124┊130┊        (payload, args, ctx) &#x3D;&gt; {
 ┊125┊131┊          return ctx.user.then((user) &#x3D;&gt; {
 ┊126┊132┊            return Boolean(
</pre>

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

#### [Step 7.14: Create Signup Screen](https://github.com/srtucker22/chatty/commit/629fcdc)

##### Added client&#x2F;src&#x2F;screens&#x2F;signin.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊   ┊  1┊import React, { Component } from &#x27;react&#x27;;</b>
<b>+┊   ┊  2┊import PropTypes from &#x27;prop-types&#x27;;</b>
<b>+┊   ┊  3┊import {</b>
<b>+┊   ┊  4┊  ActivityIndicator,</b>
<b>+┊   ┊  5┊  KeyboardAvoidingView,</b>
<b>+┊   ┊  6┊  Button,</b>
<b>+┊   ┊  7┊  StyleSheet,</b>
<b>+┊   ┊  8┊  Text,</b>
<b>+┊   ┊  9┊  TextInput,</b>
<b>+┊   ┊ 10┊  TouchableOpacity,</b>
<b>+┊   ┊ 11┊  View,</b>
<b>+┊   ┊ 12┊} from &#x27;react-native&#x27;;</b>
<b>+┊   ┊ 13┊</b>
<b>+┊   ┊ 14┊const styles &#x3D; StyleSheet.create({</b>
<b>+┊   ┊ 15┊  container: {</b>
<b>+┊   ┊ 16┊    flex: 1,</b>
<b>+┊   ┊ 17┊    justifyContent: &#x27;center&#x27;,</b>
<b>+┊   ┊ 18┊    backgroundColor: &#x27;#eeeeee&#x27;,</b>
<b>+┊   ┊ 19┊    paddingHorizontal: 50,</b>
<b>+┊   ┊ 20┊  },</b>
<b>+┊   ┊ 21┊  inputContainer: {</b>
<b>+┊   ┊ 22┊    marginBottom: 20,</b>
<b>+┊   ┊ 23┊  },</b>
<b>+┊   ┊ 24┊  input: {</b>
<b>+┊   ┊ 25┊    height: 40,</b>
<b>+┊   ┊ 26┊    borderRadius: 4,</b>
<b>+┊   ┊ 27┊    marginVertical: 6,</b>
<b>+┊   ┊ 28┊    padding: 6,</b>
<b>+┊   ┊ 29┊    backgroundColor: &#x27;rgba(0,0,0,0.2)&#x27;,</b>
<b>+┊   ┊ 30┊  },</b>
<b>+┊   ┊ 31┊  loadingContainer: {</b>
<b>+┊   ┊ 32┊    left: 0,</b>
<b>+┊   ┊ 33┊    right: 0,</b>
<b>+┊   ┊ 34┊    top: 0,</b>
<b>+┊   ┊ 35┊    bottom: 0,</b>
<b>+┊   ┊ 36┊    position: &#x27;absolute&#x27;,</b>
<b>+┊   ┊ 37┊    flexDirection: &#x27;row&#x27;,</b>
<b>+┊   ┊ 38┊    justifyContent: &#x27;center&#x27;,</b>
<b>+┊   ┊ 39┊    alignItems: &#x27;center&#x27;,</b>
<b>+┊   ┊ 40┊  },</b>
<b>+┊   ┊ 41┊  switchContainer: {</b>
<b>+┊   ┊ 42┊    flexDirection: &#x27;row&#x27;,</b>
<b>+┊   ┊ 43┊    justifyContent: &#x27;center&#x27;,</b>
<b>+┊   ┊ 44┊    marginTop: 12,</b>
<b>+┊   ┊ 45┊  },</b>
<b>+┊   ┊ 46┊  switchAction: {</b>
<b>+┊   ┊ 47┊    paddingHorizontal: 4,</b>
<b>+┊   ┊ 48┊    color: &#x27;blue&#x27;,</b>
<b>+┊   ┊ 49┊  },</b>
<b>+┊   ┊ 50┊  submit: {</b>
<b>+┊   ┊ 51┊    marginVertical: 6,</b>
<b>+┊   ┊ 52┊  },</b>
<b>+┊   ┊ 53┊});</b>
<b>+┊   ┊ 54┊</b>
<b>+┊   ┊ 55┊class Signin extends Component {</b>
<b>+┊   ┊ 56┊  static navigationOptions &#x3D; {</b>
<b>+┊   ┊ 57┊    title: &#x27;Chatty&#x27;,</b>
<b>+┊   ┊ 58┊    headerLeft: null,</b>
<b>+┊   ┊ 59┊  };</b>
<b>+┊   ┊ 60┊</b>
<b>+┊   ┊ 61┊  constructor(props) {</b>
<b>+┊   ┊ 62┊    super(props);</b>
<b>+┊   ┊ 63┊    this.state &#x3D; {</b>
<b>+┊   ┊ 64┊      view: &#x27;login&#x27;,</b>
<b>+┊   ┊ 65┊    };</b>
<b>+┊   ┊ 66┊    this.login &#x3D; this.login.bind(this);</b>
<b>+┊   ┊ 67┊    this.signup &#x3D; this.signup.bind(this);</b>
<b>+┊   ┊ 68┊    this.switchView &#x3D; this.switchView.bind(this);</b>
<b>+┊   ┊ 69┊  }</b>
<b>+┊   ┊ 70┊</b>
<b>+┊   ┊ 71┊  // fake for now</b>
<b>+┊   ┊ 72┊  login() {</b>
<b>+┊   ┊ 73┊    console.log(&#x27;logging in&#x27;);</b>
<b>+┊   ┊ 74┊    this.setState({ loading: true });</b>
<b>+┊   ┊ 75┊    setTimeout(() &#x3D;&gt; {</b>
<b>+┊   ┊ 76┊      console.log(&#x27;signing up&#x27;);</b>
<b>+┊   ┊ 77┊      this.props.navigation.goBack();</b>
<b>+┊   ┊ 78┊    }, 1000);</b>
<b>+┊   ┊ 79┊  }</b>
<b>+┊   ┊ 80┊</b>
<b>+┊   ┊ 81┊  // fake for now</b>
<b>+┊   ┊ 82┊  signup() {</b>
<b>+┊   ┊ 83┊    console.log(&#x27;signing up&#x27;);</b>
<b>+┊   ┊ 84┊    this.setState({ loading: true });</b>
<b>+┊   ┊ 85┊    setTimeout(() &#x3D;&gt; {</b>
<b>+┊   ┊ 86┊      this.props.navigation.goBack();</b>
<b>+┊   ┊ 87┊    }, 1000);</b>
<b>+┊   ┊ 88┊  }</b>
<b>+┊   ┊ 89┊</b>
<b>+┊   ┊ 90┊  switchView() {</b>
<b>+┊   ┊ 91┊    this.setState({</b>
<b>+┊   ┊ 92┊      view: this.state.view &#x3D;&#x3D;&#x3D; &#x27;signup&#x27; ? &#x27;login&#x27; : &#x27;signup&#x27;,</b>
<b>+┊   ┊ 93┊    });</b>
<b>+┊   ┊ 94┊  }</b>
<b>+┊   ┊ 95┊</b>
<b>+┊   ┊ 96┊  render() {</b>
<b>+┊   ┊ 97┊    const { view } &#x3D; this.state;</b>
<b>+┊   ┊ 98┊</b>
<b>+┊   ┊ 99┊    return (</b>
<b>+┊   ┊100┊      &lt;KeyboardAvoidingView</b>
<b>+┊   ┊101┊        behavior&#x3D;{&#x27;padding&#x27;}</b>
<b>+┊   ┊102┊        style&#x3D;{styles.container}</b>
<b>+┊   ┊103┊      &gt;</b>
<b>+┊   ┊104┊        {this.state.loading ?</b>
<b>+┊   ┊105┊          &lt;View style&#x3D;{styles.loadingContainer}&gt;</b>
<b>+┊   ┊106┊            &lt;ActivityIndicator /&gt;</b>
<b>+┊   ┊107┊          &lt;/View&gt; : undefined}</b>
<b>+┊   ┊108┊        &lt;View style&#x3D;{styles.inputContainer}&gt;</b>
<b>+┊   ┊109┊          &lt;TextInput</b>
<b>+┊   ┊110┊            onChangeText&#x3D;{email &#x3D;&gt; this.setState({ email })}</b>
<b>+┊   ┊111┊            placeholder&#x3D;{&#x27;Email&#x27;}</b>
<b>+┊   ┊112┊            style&#x3D;{styles.input}</b>
<b>+┊   ┊113┊          /&gt;</b>
<b>+┊   ┊114┊          &lt;TextInput</b>
<b>+┊   ┊115┊            onChangeText&#x3D;{password &#x3D;&gt; this.setState({ password })}</b>
<b>+┊   ┊116┊            placeholder&#x3D;{&#x27;Password&#x27;}</b>
<b>+┊   ┊117┊            secureTextEntry</b>
<b>+┊   ┊118┊            style&#x3D;{styles.input}</b>
<b>+┊   ┊119┊          /&gt;</b>
<b>+┊   ┊120┊        &lt;/View&gt;</b>
<b>+┊   ┊121┊        &lt;Button</b>
<b>+┊   ┊122┊          onPress&#x3D;{this[view]}</b>
<b>+┊   ┊123┊          style&#x3D;{styles.submit}</b>
<b>+┊   ┊124┊          title&#x3D;{view &#x3D;&#x3D;&#x3D; &#x27;signup&#x27; ? &#x27;Sign up&#x27; : &#x27;Login&#x27;}</b>
<b>+┊   ┊125┊          disabled&#x3D;{this.state.loading}</b>
<b>+┊   ┊126┊        /&gt;</b>
<b>+┊   ┊127┊        &lt;View style&#x3D;{styles.switchContainer}&gt;</b>
<b>+┊   ┊128┊          &lt;Text&gt;</b>
<b>+┊   ┊129┊            { view &#x3D;&#x3D;&#x3D; &#x27;signup&#x27; ?</b>
<b>+┊   ┊130┊              &#x27;Already have an account?&#x27; : &#x27;New to Chatty?&#x27; }</b>
<b>+┊   ┊131┊          &lt;/Text&gt;</b>
<b>+┊   ┊132┊          &lt;TouchableOpacity</b>
<b>+┊   ┊133┊            onPress&#x3D;{this.switchView}</b>
<b>+┊   ┊134┊          &gt;</b>
<b>+┊   ┊135┊            &lt;Text style&#x3D;{styles.switchAction}&gt;</b>
<b>+┊   ┊136┊              {view &#x3D;&#x3D;&#x3D; &#x27;login&#x27; ? &#x27;Sign up&#x27; : &#x27;Login&#x27;}</b>
<b>+┊   ┊137┊            &lt;/Text&gt;</b>
<b>+┊   ┊138┊          &lt;/TouchableOpacity&gt;</b>
<b>+┊   ┊139┊        &lt;/View&gt;</b>
<b>+┊   ┊140┊      &lt;/KeyboardAvoidingView&gt;</b>
<b>+┊   ┊141┊    );</b>
<b>+┊   ┊142┊  }</b>
<b>+┊   ┊143┊}</b>
<b>+┊   ┊144┊Signin.propTypes &#x3D; {</b>
<b>+┊   ┊145┊  navigation: PropTypes.shape({</b>
<b>+┊   ┊146┊    goBack: PropTypes.func,</b>
<b>+┊   ┊147┊  }),</b>
<b>+┊   ┊148┊};</b>
<b>+┊   ┊149┊</b>
<b>+┊   ┊150┊export default Signin;</b>
</pre>

[}]: #

Next, we’ll add `Signin` to our Navigation. We'll also make sure the `USER_QUERY` attached to `AppWithNavigationState` gets skipped and doesn't query for anything for now. We don’t want to run any queries until a user officially signs in. Right now, we’re just testing the layout, so we don’t want queries to run at all no matter what. `graphql` let’s us pass a `skip` function as an optional parameter to our queries to skip their execution. We can update the code in `client/src/navigation.js` as follows:

[{]: <helper> (diffStep 7.15 files="client/src/navigation.js")

#### [Step 7.15: Add Signin to navigation and skip queries](https://github.com/srtucker22/chatty/commit/dd8db97)

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊17┊17┊import FinalizeGroup from &#x27;./screens/finalize-group.screen&#x27;;
 ┊18┊18┊import GroupDetails from &#x27;./screens/group-details.screen&#x27;;
 ┊19┊19┊import NewGroup from &#x27;./screens/new-group.screen&#x27;;
<b>+┊  ┊20┊import Signin from &#x27;./screens/signin.screen&#x27;;</b>
 ┊20┊21┊
 ┊21┊22┊import { USER_QUERY } from &#x27;./graphql/user.query&#x27;;
 ┊22┊23┊import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊59┊60┊
 ┊60┊61┊const AppNavigator &#x3D; StackNavigator({
 ┊61┊62┊  Main: { screen: MainScreenNavigator },
<b>+┊  ┊63┊  Signin: { screen: Signin },</b>
 ┊62┊64┊  Messages: { screen: Messages },
 ┊63┊65┊  GroupDetails: { screen: GroupDetails },
 ┊64┊66┊  NewGroup: { screen: NewGroup },
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊164┊166┊});
 ┊165┊167┊
 ┊166┊168┊const userQuery &#x3D; graphql(USER_QUERY, {
<b>+┊   ┊169┊  skip: ownProps &#x3D;&gt; true, // fake it -- we&#x27;ll use ownProps with auth</b>
 ┊167┊170┊  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
 ┊168┊171┊  props: ({ data: { loading, user, refetch, subscribeToMore } }) &#x3D;&gt; ({
 ┊169┊172┊    loading,
</pre>

[}]: #

Lastly, we need to modify the `Groups` screen to push the `Signin` modal and skip querying for anything:

[{]: <helper> (diffStep 7.15 files="client/src/screens/groups.screen.js")

#### [Step 7.15: Add Signin to navigation and skip queries](https://github.com/srtucker22/chatty/commit/dd8db97)

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 95┊ 95┊  onPress: PropTypes.func.isRequired,
 ┊ 96┊ 96┊};
 ┊ 97┊ 97┊
<b>+┊   ┊ 98┊// we&#x27;ll fake signin for now</b>
<b>+┊   ┊ 99┊let IS_SIGNED_IN &#x3D; false;</b>
<b>+┊   ┊100┊</b>
 ┊ 98┊101┊class Group extends Component {
 ┊ 99┊102┊  constructor(props) {
 ┊100┊103┊    super(props);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊169┊172┊    this.onRefresh &#x3D; this.onRefresh.bind(this);
 ┊170┊173┊  }
 ┊171┊174┊
<b>+┊   ┊175┊  componentDidMount() {</b>
<b>+┊   ┊176┊    if (!IS_SIGNED_IN) {</b>
<b>+┊   ┊177┊      IS_SIGNED_IN &#x3D; true;</b>
<b>+┊   ┊178┊</b>
<b>+┊   ┊179┊      const { navigate } &#x3D; this.props.navigation;</b>
<b>+┊   ┊180┊</b>
<b>+┊   ┊181┊      navigate(&#x27;Signin&#x27;);</b>
<b>+┊   ┊182┊    }</b>
<b>+┊   ┊183┊  }</b>
<b>+┊   ┊184┊</b>
 ┊172┊185┊  onRefresh() {
 ┊173┊186┊    this.props.refetch();
<b>+┊   ┊187┊    // faking unauthorized status</b>
 ┊174┊188┊  }
 ┊175┊189┊
 ┊176┊190┊  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊243┊257┊};
 ┊244┊258┊
 ┊245┊259┊const userQuery &#x3D; graphql(USER_QUERY, {
<b>+┊   ┊260┊  skip: ownProps &#x3D;&gt; true, // fake it -- we&#x27;ll use ownProps with auth</b>
 ┊246┊261┊  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
 ┊247┊262┊  props: ({ data: { loading, networkStatus, refetch, user } }) &#x3D;&gt; ({
 ┊248┊263┊    loading, networkStatus, refetch, user,
</pre>

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

#### [Step 7.16: Create auth reducer](https://github.com/srtucker22/chatty/commit/dcd0732)

##### Added client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import Immutable from &#x27;seamless-immutable&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊const initialState &#x3D; Immutable({</b>
<b>+┊  ┊ 4┊  loading: true,</b>
<b>+┊  ┊ 5┊});</b>
<b>+┊  ┊ 6┊</b>
<b>+┊  ┊ 7┊const auth &#x3D; (state &#x3D; initialState, action) &#x3D;&gt; {</b>
<b>+┊  ┊ 8┊  switch (action.type) {</b>
<b>+┊  ┊ 9┊    default:</b>
<b>+┊  ┊10┊      return state;</b>
<b>+┊  ┊11┊  }</b>
<b>+┊  ┊12┊};</b>
<b>+┊  ┊13┊</b>
<b>+┊  ┊14┊export default auth;</b>
</pre>

[}]: #

The initial state for store.auth will be `{ loading: true }`. We can combine the auth reducer into our store in `client/src/app.js`:

[{]: <helper> (diffStep 7.17)

#### [Step 7.17: Combine auth reducer with reducers](https://github.com/srtucker22/chatty/commit/b490caf)

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊18┊18┊  navigationReducer,
 ┊19┊19┊  navigationMiddleware,
 ┊20┊20┊} from &#x27;./navigation&#x27;;
<b>+┊  ┊21┊import auth from &#x27;./reducers/auth.reducer&#x27;;</b>
 ┊21┊22┊
 ┊22┊23┊const URL &#x3D; &#x27;localhost:8080&#x27;; // set your comp&#x27;s url here
 ┊23┊24┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊25┊26┊  combineReducers({
 ┊26┊27┊    apollo: apolloReducer,
 ┊27┊28┊    nav: navigationReducer,
<b>+┊  ┊29┊    auth,</b>
 ┊28┊30┊  }),
 ┊29┊31┊  {}, // initial state
 ┊30┊32┊  composeWithDevTools(
</pre>

[}]: #

Now let’s add `thunk` middleware and persistence with `redux-persist` and `AsyncStorage` to our store in `client/src/app.js`:

[{]: <helper> (diffStep 7.18)

#### [Step 7.18: Add persistent storage](https://github.com/srtucker22/chatty/commit/05193aa)

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import React, { Component } from &#x27;react&#x27;;
<b>+┊ ┊2┊import {</b>
<b>+┊ ┊3┊  AsyncStorage,</b>
<b>+┊ ┊4┊} from &#x27;react-native&#x27;;</b>
 ┊2┊5┊
 ┊3┊6┊import { ApolloClient } from &#x27;apollo-client&#x27;;
 ┊4┊7┊import { ApolloLink } from &#x27;apollo-link&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊13┊16┊import { WebSocketLink } from &#x27;apollo-link-ws&#x27;;
 ┊14┊17┊import { getMainDefinition } from &#x27;apollo-utilities&#x27;;
 ┊15┊18┊import { SubscriptionClient } from &#x27;subscriptions-transport-ws&#x27;;
<b>+┊  ┊19┊import { PersistGate } from &#x27;redux-persist/lib/integration/react&#x27;;</b>
<b>+┊  ┊20┊import { persistStore, persistCombineReducers } from &#x27;redux-persist&#x27;;</b>
<b>+┊  ┊21┊import thunk from &#x27;redux-thunk&#x27;;</b>
 ┊16┊22┊
 ┊17┊23┊import AppWithNavigationState, {
 ┊18┊24┊  navigationReducer,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊22┊28┊
 ┊23┊29┊const URL &#x3D; &#x27;localhost:8080&#x27;; // set your comp&#x27;s url here
 ┊24┊30┊
<b>+┊  ┊31┊const config &#x3D; {</b>
<b>+┊  ┊32┊  key: &#x27;root&#x27;,</b>
<b>+┊  ┊33┊  storage: AsyncStorage,</b>
<b>+┊  ┊34┊  blacklist: [&#x27;nav&#x27;, &#x27;apollo&#x27;], // don&#x27;t persist nav for now</b>
<b>+┊  ┊35┊};</b>
<b>+┊  ┊36┊</b>
<b>+┊  ┊37┊const reducer &#x3D; persistCombineReducers(config, {</b>
<b>+┊  ┊38┊  apollo: apolloReducer,</b>
<b>+┊  ┊39┊  nav: navigationReducer,</b>
<b>+┊  ┊40┊  auth,</b>
<b>+┊  ┊41┊});</b>
<b>+┊  ┊42┊</b>
 ┊25┊43┊const store &#x3D; createStore(
<b>+┊  ┊44┊  reducer,</b>
 ┊31┊45┊  {}, // initial state
 ┊32┊46┊  composeWithDevTools(
<b>+┊  ┊47┊    applyMiddleware(thunk, navigationMiddleware),</b>
 ┊34┊48┊  ),
 ┊35┊49┊);
 ┊36┊50┊
<b>+┊  ┊51┊// persistent storage</b>
<b>+┊  ┊52┊const persistor &#x3D; persistStore(store);</b>
<b>+┊  ┊53┊</b>
 ┊37┊54┊const cache &#x3D; new ReduxCache({ store });
 ┊38┊55┊
 ┊39┊56┊const reduxLink &#x3D; new ReduxLink(store);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 83┊100┊    return (
 ┊ 84┊101┊      &lt;ApolloProvider client&#x3D;{client}&gt;
 ┊ 85┊102┊        &lt;Provider store&#x3D;{store}&gt;
<b>+┊   ┊103┊          &lt;PersistGate persistor&#x3D;{persistor}&gt;</b>
<b>+┊   ┊104┊            &lt;AppWithNavigationState /&gt;</b>
<b>+┊   ┊105┊          &lt;/PersistGate&gt;</b>
 ┊ 87┊106┊        &lt;/Provider&gt;
 ┊ 88┊107┊      &lt;/ApolloProvider&gt;
 ┊ 89┊108┊    );
</pre>

[}]: #

We have set our store data (excluding `apollo`) to persist via React Native’s `AsyncStorage` and to automatically rehydrate the store when the client restarts the app. When the app restarts, a `REHYDRATE` action will execute asyncronously with all the data persisted from the last session. We need to handle that action and properly update our store in our `auth` reducer:

[{]: <helper> (diffStep 7.19)

#### [Step 7.19: Handle rehydration in auth reducer](https://github.com/srtucker22/chatty/commit/9366994)

##### Changed client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊import { REHYDRATE } from &#x27;redux-persist&#x27;;</b>
 ┊1┊2┊import Immutable from &#x27;seamless-immutable&#x27;;
 ┊2┊3┊
 ┊3┊4┊const initialState &#x3D; Immutable({
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 6┊ 7┊
 ┊ 7┊ 8┊const auth &#x3D; (state &#x3D; initialState, action) &#x3D;&gt; {
 ┊ 8┊ 9┊  switch (action.type) {
<b>+┊  ┊10┊    case REHYDRATE:</b>
<b>+┊  ┊11┊      // convert persisted data to Immutable and confirm rehydration</b>
<b>+┊  ┊12┊      return Immutable(action.payload.auth || state)</b>
<b>+┊  ┊13┊        .set(&#x27;loading&#x27;, false);</b>
 ┊ 9┊14┊    default:
 ┊10┊15┊      return state;
 ┊11┊16┊  }
</pre>

[}]: #

The `auth` state will be `{ loading: true }` until we rehydrate our persisted state.

When the user successfully signs up or logs in, we need to store the user’s id and their JWT within auth. We also need to clear this information when they log out. Let’s create a constants folder `client/src/constants` and file `client/src/constants/constants.js` where we can start declaring Redux action types and write two for setting the current user and logging out:

[{]: <helper> (diffStep "7.20")

#### [Step 7.20: Create constants](https://github.com/srtucker22/chatty/commit/0b749e2)

##### Added client&#x2F;src&#x2F;constants&#x2F;constants.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊// auth constants</b>
<b>+┊ ┊2┊export const LOGOUT &#x3D; &#x27;LOGOUT&#x27;;</b>
<b>+┊ ┊3┊export const SET_CURRENT_USER &#x3D; &#x27;SET_CURRENT_USER&#x27;;</b>
</pre>

[}]: #

We can add these constants to our `auth` reducer now:

[{]: <helper> (diffStep 7.21)

#### [Step 7.21: Handle login/logout in auth reducer](https://github.com/srtucker22/chatty/commit/52eff86)

##### Changed client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import { REHYDRATE } from &#x27;redux-persist&#x27;;
 ┊2┊2┊import Immutable from &#x27;seamless-immutable&#x27;;
 ┊3┊3┊
<b>+┊ ┊4┊import { LOGOUT, SET_CURRENT_USER } from &#x27;../constants/constants&#x27;;</b>
<b>+┊ ┊5┊</b>
 ┊4┊6┊const initialState &#x3D; Immutable({
 ┊5┊7┊  loading: true,
 ┊6┊8┊});
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 9┊11┊  switch (action.type) {
 ┊10┊12┊    case REHYDRATE:
 ┊11┊13┊      // convert persisted data to Immutable and confirm rehydration
<b>+┊  ┊14┊      const { payload &#x3D; {} } &#x3D; action;</b>
<b>+┊  ┊15┊      return Immutable(payload.auth || state)</b>
 ┊13┊16┊        .set(&#x27;loading&#x27;, false);
<b>+┊  ┊17┊    case SET_CURRENT_USER:</b>
<b>+┊  ┊18┊      return state.merge(action.user);</b>
<b>+┊  ┊19┊    case LOGOUT:</b>
<b>+┊  ┊20┊      return Immutable({ loading: false });</b>
 ┊14┊21┊    default:
 ┊15┊22┊      return state;
 ┊16┊23┊  }
</pre>

[}]: #

The `SET_CURRENT_USER` and `LOGOUT` action types will need to get triggered by `ActionCreators`. Let’s put those in a new folder `client/src/actions` and a new file `client/src/actions/auth.actions.js`:

[{]: <helper> (diffStep 7.22)

#### [Step 7.22: Create auth actions](https://github.com/srtucker22/chatty/commit/970cd58)

##### Added client&#x2F;src&#x2F;actions&#x2F;auth.actions.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import { client } from &#x27;../app&#x27;;</b>
<b>+┊  ┊ 2┊import { SET_CURRENT_USER, LOGOUT } from &#x27;../constants/constants&#x27;;</b>
<b>+┊  ┊ 3┊</b>
<b>+┊  ┊ 4┊export const setCurrentUser &#x3D; user &#x3D;&gt; ({</b>
<b>+┊  ┊ 5┊  type: SET_CURRENT_USER,</b>
<b>+┊  ┊ 6┊  user,</b>
<b>+┊  ┊ 7┊});</b>
<b>+┊  ┊ 8┊</b>
<b>+┊  ┊ 9┊export const logout &#x3D; () &#x3D;&gt; {</b>
<b>+┊  ┊10┊  client.resetStore();</b>
<b>+┊  ┊11┊  return { type: LOGOUT };</b>
<b>+┊  ┊12┊};</b>
</pre>

[}]: #

When `logout` is called, we’ll clear all auth data by dispatching `LOGOUT` and also all data in the apollo store by calling [`client.resetStore`](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient.resetStore).

Let’s tie everything together. We’ll update the `Signin` screen to use our login and signup mutations, and dispatch `setCurrentUser` with the mutation results (the JWT and user’s id).

First we’ll create files for our `login` and `signup` mutations:

[{]: <helper> (diffStep 7.23)

#### [Step 7.23: Create login and signup mutations](https://github.com/srtucker22/chatty/commit/f2fd7d1)

##### Added client&#x2F;src&#x2F;graphql&#x2F;login.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import gql from &#x27;graphql-tag&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊const LOGIN_MUTATION &#x3D; gql&#x60;</b>
<b>+┊  ┊ 4┊  mutation login($email: String!, $password: String!) {</b>
<b>+┊  ┊ 5┊    login(email: $email, password: $password) {</b>
<b>+┊  ┊ 6┊      id</b>
<b>+┊  ┊ 7┊      jwt</b>
<b>+┊  ┊ 8┊      username</b>
<b>+┊  ┊ 9┊    }</b>
<b>+┊  ┊10┊  }</b>
<b>+┊  ┊11┊&#x60;;</b>
<b>+┊  ┊12┊</b>
<b>+┊  ┊13┊export default LOGIN_MUTATION;</b>
</pre>

##### Added client&#x2F;src&#x2F;graphql&#x2F;signup.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import gql from &#x27;graphql-tag&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊const SIGNUP_MUTATION &#x3D; gql&#x60;</b>
<b>+┊  ┊ 4┊  mutation signup($email: String!, $password: String!) {</b>
<b>+┊  ┊ 5┊    signup(email: $email, password: $password) {</b>
<b>+┊  ┊ 6┊      id</b>
<b>+┊  ┊ 7┊      jwt</b>
<b>+┊  ┊ 8┊      username</b>
<b>+┊  ┊ 9┊    }</b>
<b>+┊  ┊10┊  }</b>
<b>+┊  ┊11┊&#x60;;</b>
<b>+┊  ┊12┊</b>
<b>+┊  ┊13┊export default SIGNUP_MUTATION;</b>
</pre>

[}]: #

We connect these mutations and our Redux store to the `Signin` component with `compose` and `connect`:

[{]: <helper> (diffStep 7.24)

#### [Step 7.24: Add login and signup mutations to Signin screen](https://github.com/srtucker22/chatty/commit/1e76ab1)

##### Changed client&#x2F;src&#x2F;screens&#x2F;signin.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊2┊2┊import PropTypes from &#x27;prop-types&#x27;;
 ┊3┊3┊import {
 ┊4┊4┊  ActivityIndicator,
<b>+┊ ┊5┊  Alert,</b>
 ┊5┊6┊  KeyboardAvoidingView,
 ┊6┊7┊  Button,
 ┊7┊8┊  StyleSheet,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊10┊11┊  TouchableOpacity,
 ┊11┊12┊  View,
 ┊12┊13┊} from &#x27;react-native&#x27;;
<b>+┊  ┊14┊import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b>+┊  ┊15┊import { connect } from &#x27;react-redux&#x27;;</b>
<b>+┊  ┊16┊</b>
<b>+┊  ┊17┊import {</b>
<b>+┊  ┊18┊  setCurrentUser,</b>
<b>+┊  ┊19┊} from &#x27;../actions/auth.actions&#x27;;</b>
<b>+┊  ┊20┊import LOGIN_MUTATION from &#x27;../graphql/login.mutation&#x27;;</b>
<b>+┊  ┊21┊import SIGNUP_MUTATION from &#x27;../graphql/signup.mutation&#x27;;</b>
 ┊13┊22┊
 ┊14┊23┊const styles &#x3D; StyleSheet.create({
 ┊15┊24┊  container: {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊52┊61┊  },
 ┊53┊62┊});
 ┊54┊63┊
<b>+┊  ┊64┊function capitalizeFirstLetter(string) {</b>
<b>+┊  ┊65┊  return string[0].toUpperCase() + string.slice(1);</b>
<b>+┊  ┊66┊}</b>
<b>+┊  ┊67┊</b>
 ┊55┊68┊class Signin extends Component {
 ┊56┊69┊  static navigationOptions &#x3D; {
 ┊57┊70┊    title: &#x27;Chatty&#x27;,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊60┊73┊
 ┊61┊74┊  constructor(props) {
 ┊62┊75┊    super(props);
<b>+┊  ┊76┊</b>
<b>+┊  ┊77┊    if (props.auth &amp;&amp; props.auth.jwt) {</b>
<b>+┊  ┊78┊      props.navigation.goBack();</b>
<b>+┊  ┊79┊    }</b>
<b>+┊  ┊80┊</b>
 ┊63┊81┊    this.state &#x3D; {
 ┊64┊82┊      view: &#x27;login&#x27;,
 ┊65┊83┊    };
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 68┊ 86┊    this.switchView &#x3D; this.switchView.bind(this);
 ┊ 69┊ 87┊  }
 ┊ 70┊ 88┊
<b>+┊   ┊ 89┊  componentWillReceiveProps(nextProps) {</b>
<b>+┊   ┊ 90┊    if (nextProps.auth.jwt) {</b>
<b>+┊   ┊ 91┊      nextProps.navigation.goBack();</b>
<b>+┊   ┊ 92┊    }</b>
<b>+┊   ┊ 93┊  }</b>
<b>+┊   ┊ 94┊</b>
 ┊ 72┊ 95┊  login() {
<b>+┊   ┊ 96┊    const { email, password } &#x3D; this.state;</b>
<b>+┊   ┊ 97┊</b>
<b>+┊   ┊ 98┊    this.setState({</b>
<b>+┊   ┊ 99┊      loading: true,</b>
<b>+┊   ┊100┊    });</b>
<b>+┊   ┊101┊</b>
<b>+┊   ┊102┊    this.props.login({ email, password })</b>
<b>+┊   ┊103┊      .then(({ data: { login: user } }) &#x3D;&gt; {</b>
<b>+┊   ┊104┊        this.props.dispatch(setCurrentUser(user));</b>
<b>+┊   ┊105┊        this.setState({</b>
<b>+┊   ┊106┊          loading: false,</b>
<b>+┊   ┊107┊        });</b>
<b>+┊   ┊108┊      }).catch((error) &#x3D;&gt; {</b>
<b>+┊   ┊109┊        this.setState({</b>
<b>+┊   ┊110┊          loading: false,</b>
<b>+┊   ┊111┊        });</b>
<b>+┊   ┊112┊        Alert.alert(</b>
<b>+┊   ┊113┊          &#x60;${capitalizeFirstLetter(this.state.view)} error&#x60;,</b>
<b>+┊   ┊114┊          error.message,</b>
<b>+┊   ┊115┊          [</b>
<b>+┊   ┊116┊            { text: &#x27;OK&#x27;, onPress: () &#x3D;&gt; console.log(&#x27;OK pressed&#x27;) }, // eslint-disable-line no-console</b>
<b>+┊   ┊117┊            { text: &#x27;Forgot password&#x27;, onPress: () &#x3D;&gt; console.log(&#x27;Forgot Pressed&#x27;), style: &#x27;cancel&#x27; }, // eslint-disable-line no-console</b>
<b>+┊   ┊118┊          ],</b>
<b>+┊   ┊119┊        );</b>
<b>+┊   ┊120┊      });</b>
 ┊ 79┊121┊  }
 ┊ 80┊122┊
 ┊ 82┊123┊  signup() {
<b>+┊   ┊124┊    this.setState({</b>
<b>+┊   ┊125┊      loading: true,</b>
<b>+┊   ┊126┊    });</b>
<b>+┊   ┊127┊    const { email, password } &#x3D; this.state;</b>
<b>+┊   ┊128┊    this.props.signup({ email, password })</b>
<b>+┊   ┊129┊      .then(({ data: { signup: user } }) &#x3D;&gt; {</b>
<b>+┊   ┊130┊        this.props.dispatch(setCurrentUser(user));</b>
<b>+┊   ┊131┊        this.setState({</b>
<b>+┊   ┊132┊          loading: false,</b>
<b>+┊   ┊133┊        });</b>
<b>+┊   ┊134┊      }).catch((error) &#x3D;&gt; {</b>
<b>+┊   ┊135┊        this.setState({</b>
<b>+┊   ┊136┊          loading: false,</b>
<b>+┊   ┊137┊        });</b>
<b>+┊   ┊138┊        Alert.alert(</b>
<b>+┊   ┊139┊          &#x60;${capitalizeFirstLetter(this.state.view)} error&#x60;,</b>
<b>+┊   ┊140┊          error.message,</b>
<b>+┊   ┊141┊          [{ text: &#x27;OK&#x27;, onPress: () &#x3D;&gt; console.log(&#x27;OK pressed&#x27;) }],  // eslint-disable-line no-console</b>
<b>+┊   ┊142┊        );</b>
<b>+┊   ┊143┊      });</b>
 ┊ 88┊144┊  }
 ┊ 89┊145┊
 ┊ 90┊146┊  switchView() {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊122┊178┊          onPress&#x3D;{this[view]}
 ┊123┊179┊          style&#x3D;{styles.submit}
 ┊124┊180┊          title&#x3D;{view &#x3D;&#x3D;&#x3D; &#x27;signup&#x27; ? &#x27;Sign up&#x27; : &#x27;Login&#x27;}
<b>+┊   ┊181┊          disabled&#x3D;{this.state.loading || !!this.props.auth.jwt}</b>
 ┊126┊182┊        /&gt;
 ┊127┊183┊        &lt;View style&#x3D;{styles.switchContainer}&gt;
 ┊128┊184┊          &lt;Text&gt;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊145┊201┊  navigation: PropTypes.shape({
 ┊146┊202┊    goBack: PropTypes.func,
 ┊147┊203┊  }),
<b>+┊   ┊204┊  auth: PropTypes.shape({</b>
<b>+┊   ┊205┊    loading: PropTypes.bool,</b>
<b>+┊   ┊206┊    jwt: PropTypes.string,</b>
<b>+┊   ┊207┊  }),</b>
<b>+┊   ┊208┊  dispatch: PropTypes.func.isRequired,</b>
<b>+┊   ┊209┊  login: PropTypes.func.isRequired,</b>
<b>+┊   ┊210┊  signup: PropTypes.func.isRequired,</b>
 ┊148┊211┊};
 ┊149┊212┊
<b>+┊   ┊213┊const login &#x3D; graphql(LOGIN_MUTATION, {</b>
<b>+┊   ┊214┊  props: ({ mutate }) &#x3D;&gt; ({</b>
<b>+┊   ┊215┊    login: ({ email, password }) &#x3D;&gt;</b>
<b>+┊   ┊216┊      mutate({</b>
<b>+┊   ┊217┊        variables: { email, password },</b>
<b>+┊   ┊218┊      }),</b>
<b>+┊   ┊219┊  }),</b>
<b>+┊   ┊220┊});</b>
<b>+┊   ┊221┊</b>
<b>+┊   ┊222┊const signup &#x3D; graphql(SIGNUP_MUTATION, {</b>
<b>+┊   ┊223┊  props: ({ mutate }) &#x3D;&gt; ({</b>
<b>+┊   ┊224┊    signup: ({ email, password }) &#x3D;&gt;</b>
<b>+┊   ┊225┊      mutate({</b>
<b>+┊   ┊226┊        variables: { email, password },</b>
<b>+┊   ┊227┊      }),</b>
<b>+┊   ┊228┊  }),</b>
<b>+┊   ┊229┊});</b>
<b>+┊   ┊230┊</b>
<b>+┊   ┊231┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊232┊  auth,</b>
<b>+┊   ┊233┊});</b>
<b>+┊   ┊234┊</b>
<b>+┊   ┊235┊export default compose(</b>
<b>+┊   ┊236┊  login,</b>
<b>+┊   ┊237┊  signup,</b>
<b>+┊   ┊238┊  connect(mapStateToProps),</b>
<b>+┊   ┊239┊)(Signin);</b>
</pre>

[}]: #

We attached `auth` from our Redux store to `Signin` via `connect(mapStateToProps)`. When we sign up or log in, we call the associated mutation (`signup` or `login`), receive the JWT and id, and dispatch the data with `setCurrentUser`. In `componentWillReceiveProps`, once `auth.jwt` exists, we are logged in and pop the Screen. We’ve also included some simple error messages if things go wrong.

Let’s check it out! ![Signin Gif](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-24.gif)

# Apollo-Client Authentication Middleware
We need to add Authorization Headers to our GraphQL requests from React Native before we can resume retrieving data from our auth protected server. We accomplish this by using middleware that will attach the headers to every request before they are sent out. Middleware works very elegantly within the `apollo-link` ecosystem. We just need to add a couple new links! Fortunately, `apollo-link-context` and `apollo-link-error` are perfect for our requirements and work really nicely with our Redux setup. We can simply add the following in `client/src/app.js`:

```sh
npm i apollo-link-context apollo-link-error
```

[{]: <helper> (diffStep 7.25)

#### [Step 7.25: Add authentication middleware for requests](https://github.com/srtucker22/chatty/commit/4354616)

##### Changed client&#x2F;package.json
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊10┊10┊		&quot;apollo-cache-redux&quot;: &quot;^0.1.0-alpha.7&quot;,
 ┊11┊11┊		&quot;apollo-client&quot;: &quot;^2.2.5&quot;,
 ┊12┊12┊		&quot;apollo-link&quot;: &quot;^1.1.0&quot;,
<b>+┊  ┊13┊		&quot;apollo-link-context&quot;: &quot;^1.0.5&quot;,</b>
 ┊13┊14┊		&quot;apollo-link-error&quot;: &quot;^1.0.7&quot;,
 ┊14┊15┊		&quot;apollo-link-http&quot;: &quot;^1.3.3&quot;,
 ┊15┊16┊		&quot;apollo-link-redux&quot;: &quot;^0.2.1&quot;,
</pre>

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊19┊19┊import { PersistGate } from &#x27;redux-persist/lib/integration/react&#x27;;
 ┊20┊20┊import { persistStore, persistCombineReducers } from &#x27;redux-persist&#x27;;
 ┊21┊21┊import thunk from &#x27;redux-thunk&#x27;;
<b>+┊  ┊22┊import { setContext } from &#x27;apollo-link-context&#x27;;</b>
<b>+┊  ┊23┊import _ from &#x27;lodash&#x27;;</b>
 ┊22┊24┊
 ┊23┊25┊import AppWithNavigationState, {
 ┊24┊26┊  navigationReducer,
 ┊25┊27┊  navigationMiddleware,
 ┊26┊28┊} from &#x27;./navigation&#x27;;
 ┊27┊29┊import auth from &#x27;./reducers/auth.reducer&#x27;;
<b>+┊  ┊30┊import { logout } from &#x27;./actions/auth.actions&#x27;;</b>
 ┊28┊31┊
 ┊29┊32┊const URL &#x3D; &#x27;localhost:8080&#x27;; // set your comp&#x27;s url here
 ┊30┊33┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊61┊64┊
 ┊62┊65┊const httpLink &#x3D; createHttpLink({ uri: &#x60;http://${URL}&#x60; });
 ┊63┊66┊
<b>+┊  ┊67┊// middleware for requests</b>
<b>+┊  ┊68┊const middlewareLink &#x3D; setContext((req, previousContext) &#x3D;&gt; {</b>
<b>+┊  ┊69┊  // get the authentication token from local storage if it exists</b>
<b>+┊  ┊70┊  const { jwt } &#x3D; store.getState().auth;</b>
<b>+┊  ┊71┊  if (jwt) {</b>
<b>+┊  ┊72┊    return {</b>
<b>+┊  ┊73┊      headers: {</b>
<b>+┊  ┊74┊        authorization: &#x60;Bearer ${jwt}&#x60;,</b>
<b>+┊  ┊75┊      },</b>
<b>+┊  ┊76┊    };</b>
<b>+┊  ┊77┊  }</b>
<b>+┊  ┊78┊</b>
<b>+┊  ┊79┊  return previousContext;</b>
<b>+┊  ┊80┊});</b>
<b>+┊  ┊81┊</b>
 ┊64┊82┊// Create WebSocket client
 ┊65┊83┊export const wsClient &#x3D; new SubscriptionClient(&#x60;ws://${URL}/graphql&#x60;, {
 ┊66┊84┊  reconnect: true,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 85┊103┊  reduxLink,
 ┊ 86┊104┊  errorLink,
 ┊ 87┊105┊  requestLink({
<b>+┊   ┊106┊    queryOrMutationLink: middlewareLink.concat(httpLink),</b>
 ┊ 89┊107┊    subscriptionLink: webSocketLink,
 ┊ 90┊108┊  }),
 ┊ 91┊109┊]);
</pre>

[}]: #

Before every request, we get the JWT from `auth` and stick it in the header. We can also run middleware *after* receiving responses to check for auth errors and log out the user if necessary (afterware?):

[{]: <helper> (diffStep 7.26)

#### [Step 7.26: Add authentication afterware for responses](https://github.com/srtucker22/chatty/commit/84e04df)

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊58┊58┊
 ┊59┊59┊const reduxLink &#x3D; new ReduxLink(store);
 ┊60┊60┊
 ┊65┊61┊const httpLink &#x3D; createHttpLink({ uri: &#x60;http://${URL}&#x60; });
 ┊66┊62┊
 ┊67┊63┊// middleware for requests
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 79┊ 75┊  return previousContext;
 ┊ 80┊ 76┊});
 ┊ 81┊ 77┊
<b>+┊   ┊ 78┊// afterware for responses</b>
<b>+┊   ┊ 79┊const errorLink &#x3D; onError(({ graphQLErrors, networkError }) &#x3D;&gt; {</b>
<b>+┊   ┊ 80┊  let shouldLogout &#x3D; false;</b>
<b>+┊   ┊ 81┊  if (graphQLErrors) {</b>
<b>+┊   ┊ 82┊    console.log({ graphQLErrors });</b>
<b>+┊   ┊ 83┊    graphQLErrors.forEach(({ message, locations, path }) &#x3D;&gt; {</b>
<b>+┊   ┊ 84┊      console.log({ message, locations, path });</b>
<b>+┊   ┊ 85┊      if (message &#x3D;&#x3D;&#x3D; &#x27;Unauthorized&#x27;) {</b>
<b>+┊   ┊ 86┊        shouldLogout &#x3D; true;</b>
<b>+┊   ┊ 87┊      }</b>
<b>+┊   ┊ 88┊    });</b>
<b>+┊   ┊ 89┊</b>
<b>+┊   ┊ 90┊    if (shouldLogout) {</b>
<b>+┊   ┊ 91┊      store.dispatch(logout());</b>
<b>+┊   ┊ 92┊    }</b>
<b>+┊   ┊ 93┊  }</b>
<b>+┊   ┊ 94┊  if (networkError) {</b>
<b>+┊   ┊ 95┊    console.log(&#x27;[Network error]:&#x27;);</b>
<b>+┊   ┊ 96┊    console.log({ networkError });</b>
<b>+┊   ┊ 97┊    if (networkError.statusCode &#x3D;&#x3D;&#x3D; 401) {</b>
<b>+┊   ┊ 98┊      logout();</b>
<b>+┊   ┊ 99┊    }</b>
<b>+┊   ┊100┊  }</b>
<b>+┊   ┊101┊});</b>
<b>+┊   ┊102┊</b>
 ┊ 82┊103┊// Create WebSocket client
 ┊ 83┊104┊export const wsClient &#x3D; new SubscriptionClient(&#x60;ws://${URL}/graphql&#x60;, {
 ┊ 84┊105┊  reconnect: true,
</pre>

[}]: #

We simply parse the error and dispatch `logout()` if we receive an `Unauthorized` response message.

# Subscriptions-Transport-WS Authentication
Luckily for us, `SubscriptionClient` has a nifty little feature that lets us lazily (on-demand) connect to our WebSocket by setting `lazy: true`. This flag means we will only try to connect the WebSocket when we make our first subscription call, which only happens in our app once the user is authenticated. When we make our connection call, we can pass the JWT credentials via `connectionParams`. When the user logs out, we’ll close the connection and lazily reconnect when a user log back in and resubscribes.

We can update `client/src/app.js` and `client/actions/auth.actions.js` as follows:

[{]: <helper> (diffStep 7.27)

#### [Step 7.27: Add lazy connecting to wsClient](https://github.com/srtucker22/chatty/commit/9a2ec9a)

##### Changed client&#x2F;src&#x2F;actions&#x2F;auth.actions.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊import { client, wsClient } from &#x27;../app&#x27;;</b>
 ┊2┊2┊import { SET_CURRENT_USER, LOGOUT } from &#x27;../constants/constants&#x27;;
 ┊3┊3┊
 ┊4┊4┊export const setCurrentUser &#x3D; user &#x3D;&gt; ({
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 8┊ 8┊
 ┊ 9┊ 9┊export const logout &#x3D; () &#x3D;&gt; {
 ┊10┊10┊  client.resetStore();
<b>+┊  ┊11┊  wsClient.unsubscribeAll(); // unsubscribe from all subscriptions</b>
<b>+┊  ┊12┊  wsClient.close(); // close the WebSocket connection</b>
 ┊11┊13┊  return { type: LOGOUT };
 ┊12┊14┊};
</pre>

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊102┊102┊
 ┊103┊103┊// Create WebSocket client
 ┊104┊104┊export const wsClient &#x3D; new SubscriptionClient(&#x60;ws://${URL}/graphql&#x60;, {
<b>+┊   ┊105┊  lazy: true,</b>
 ┊105┊106┊  reconnect: true,
<b>+┊   ┊107┊  connectionParams() {</b>
<b>+┊   ┊108┊    // get the authentication token from local storage if it exists</b>
<b>+┊   ┊109┊    return { jwt: store.getState().auth.jwt };</b>
 ┊108┊110┊  },
 ┊109┊111┊});
</pre>

[}]: #

KaBLaM! We’re ready to start using auth across our app!

# Refactoring the Client for Authentication
Our final major hurdle is going to be refactoring all our client code to use the Queries and Mutations we modified for auth and to handle auth UI.

## Logout
To get our feet wet, let’s start by creating a new Screen instead of fixing up an existing one. Let’s create a new Screen for the Settings tab where we will show the current user’s details and give users the option to log out!

We’ll put our new Settings Screen in a new file `client/src/screens/settings.screen.js`:

[{]: <helper> (diffStep 7.28)

#### [Step 7.28: Create Settings Screen](https://github.com/srtucker22/chatty/commit/867868b)

##### Added client&#x2F;src&#x2F;screens&#x2F;settings.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊   ┊  1┊import PropTypes from &#x27;prop-types&#x27;;</b>
<b>+┊   ┊  2┊import React, { Component } from &#x27;react&#x27;;</b>
<b>+┊   ┊  3┊import {</b>
<b>+┊   ┊  4┊  ActivityIndicator,</b>
<b>+┊   ┊  5┊  Button,</b>
<b>+┊   ┊  6┊  Image,</b>
<b>+┊   ┊  7┊  StyleSheet,</b>
<b>+┊   ┊  8┊  Text,</b>
<b>+┊   ┊  9┊  TextInput,</b>
<b>+┊   ┊ 10┊  TouchableOpacity,</b>
<b>+┊   ┊ 11┊  View,</b>
<b>+┊   ┊ 12┊} from &#x27;react-native&#x27;;</b>
<b>+┊   ┊ 13┊import { connect } from &#x27;react-redux&#x27;;</b>
<b>+┊   ┊ 14┊import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b>+┊   ┊ 15┊</b>
<b>+┊   ┊ 16┊import USER_QUERY from &#x27;../graphql/user.query&#x27;;</b>
<b>+┊   ┊ 17┊import { logout } from &#x27;../actions/auth.actions&#x27;;</b>
<b>+┊   ┊ 18┊</b>
<b>+┊   ┊ 19┊const styles &#x3D; StyleSheet.create({</b>
<b>+┊   ┊ 20┊  container: {</b>
<b>+┊   ┊ 21┊    flex: 1,</b>
<b>+┊   ┊ 22┊  },</b>
<b>+┊   ┊ 23┊  email: {</b>
<b>+┊   ┊ 24┊    borderColor: &#x27;#777&#x27;,</b>
<b>+┊   ┊ 25┊    borderBottomWidth: 1,</b>
<b>+┊   ┊ 26┊    borderTopWidth: 1,</b>
<b>+┊   ┊ 27┊    paddingVertical: 8,</b>
<b>+┊   ┊ 28┊    paddingHorizontal: 16,</b>
<b>+┊   ┊ 29┊    fontSize: 16,</b>
<b>+┊   ┊ 30┊  },</b>
<b>+┊   ┊ 31┊  emailHeader: {</b>
<b>+┊   ┊ 32┊    backgroundColor: &#x27;#dbdbdb&#x27;,</b>
<b>+┊   ┊ 33┊    color: &#x27;#777&#x27;,</b>
<b>+┊   ┊ 34┊    paddingHorizontal: 16,</b>
<b>+┊   ┊ 35┊    paddingBottom: 6,</b>
<b>+┊   ┊ 36┊    paddingTop: 32,</b>
<b>+┊   ┊ 37┊    fontSize: 12,</b>
<b>+┊   ┊ 38┊  },</b>
<b>+┊   ┊ 39┊  loading: {</b>
<b>+┊   ┊ 40┊    justifyContent: &#x27;center&#x27;,</b>
<b>+┊   ┊ 41┊    flex: 1,</b>
<b>+┊   ┊ 42┊  },</b>
<b>+┊   ┊ 43┊  userImage: {</b>
<b>+┊   ┊ 44┊    width: 54,</b>
<b>+┊   ┊ 45┊    height: 54,</b>
<b>+┊   ┊ 46┊    borderRadius: 27,</b>
<b>+┊   ┊ 47┊  },</b>
<b>+┊   ┊ 48┊  imageContainer: {</b>
<b>+┊   ┊ 49┊    paddingRight: 20,</b>
<b>+┊   ┊ 50┊    alignItems: &#x27;center&#x27;,</b>
<b>+┊   ┊ 51┊  },</b>
<b>+┊   ┊ 52┊  input: {</b>
<b>+┊   ┊ 53┊    color: &#x27;black&#x27;,</b>
<b>+┊   ┊ 54┊    height: 32,</b>
<b>+┊   ┊ 55┊  },</b>
<b>+┊   ┊ 56┊  inputBorder: {</b>
<b>+┊   ┊ 57┊    borderColor: &#x27;#dbdbdb&#x27;,</b>
<b>+┊   ┊ 58┊    borderBottomWidth: 1,</b>
<b>+┊   ┊ 59┊    borderTopWidth: 1,</b>
<b>+┊   ┊ 60┊    paddingVertical: 8,</b>
<b>+┊   ┊ 61┊  },</b>
<b>+┊   ┊ 62┊  inputInstructions: {</b>
<b>+┊   ┊ 63┊    paddingTop: 6,</b>
<b>+┊   ┊ 64┊    color: &#x27;#777&#x27;,</b>
<b>+┊   ┊ 65┊    fontSize: 12,</b>
<b>+┊   ┊ 66┊    flex: 1,</b>
<b>+┊   ┊ 67┊  },</b>
<b>+┊   ┊ 68┊  userContainer: {</b>
<b>+┊   ┊ 69┊    paddingLeft: 16,</b>
<b>+┊   ┊ 70┊  },</b>
<b>+┊   ┊ 71┊  userInner: {</b>
<b>+┊   ┊ 72┊    flexDirection: &#x27;row&#x27;,</b>
<b>+┊   ┊ 73┊    alignItems: &#x27;center&#x27;,</b>
<b>+┊   ┊ 74┊    paddingVertical: 16,</b>
<b>+┊   ┊ 75┊    paddingRight: 16,</b>
<b>+┊   ┊ 76┊  },</b>
<b>+┊   ┊ 77┊});</b>
<b>+┊   ┊ 78┊</b>
<b>+┊   ┊ 79┊class Settings extends Component {</b>
<b>+┊   ┊ 80┊  static navigationOptions &#x3D; {</b>
<b>+┊   ┊ 81┊    title: &#x27;Settings&#x27;,</b>
<b>+┊   ┊ 82┊  };</b>
<b>+┊   ┊ 83┊</b>
<b>+┊   ┊ 84┊  constructor(props) {</b>
<b>+┊   ┊ 85┊    super(props);</b>
<b>+┊   ┊ 86┊</b>
<b>+┊   ┊ 87┊    this.state &#x3D; {};</b>
<b>+┊   ┊ 88┊</b>
<b>+┊   ┊ 89┊    this.logout &#x3D; this.logout.bind(this);</b>
<b>+┊   ┊ 90┊  }</b>
<b>+┊   ┊ 91┊</b>
<b>+┊   ┊ 92┊  logout() {</b>
<b>+┊   ┊ 93┊    this.props.dispatch(logout());</b>
<b>+┊   ┊ 94┊  }</b>
<b>+┊   ┊ 95┊</b>
<b>+┊   ┊ 96┊  // eslint-disable-next-line</b>
<b>+┊   ┊ 97┊  updateUsername(username) {</b>
<b>+┊   ┊ 98┊    // eslint-disable-next-line</b>
<b>+┊   ┊ 99┊    console.log(&#x27;TODO: update username&#x27;);</b>
<b>+┊   ┊100┊  }</b>
<b>+┊   ┊101┊</b>
<b>+┊   ┊102┊  render() {</b>
<b>+┊   ┊103┊    const { loading, user } &#x3D; this.props;</b>
<b>+┊   ┊104┊</b>
<b>+┊   ┊105┊    // render loading placeholder while we fetch data</b>
<b>+┊   ┊106┊    if (loading || !user) {</b>
<b>+┊   ┊107┊      return (</b>
<b>+┊   ┊108┊        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;</b>
<b>+┊   ┊109┊          &lt;ActivityIndicator /&gt;</b>
<b>+┊   ┊110┊        &lt;/View&gt;</b>
<b>+┊   ┊111┊      );</b>
<b>+┊   ┊112┊    }</b>
<b>+┊   ┊113┊</b>
<b>+┊   ┊114┊    return (</b>
<b>+┊   ┊115┊      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>+┊   ┊116┊        &lt;View style&#x3D;{styles.userContainer}&gt;</b>
<b>+┊   ┊117┊          &lt;View style&#x3D;{styles.userInner}&gt;</b>
<b>+┊   ┊118┊            &lt;TouchableOpacity style&#x3D;{styles.imageContainer}&gt;</b>
<b>+┊   ┊119┊              &lt;Image</b>
<b>+┊   ┊120┊                style&#x3D;{styles.userImage}</b>
<b>+┊   ┊121┊                source&#x3D;{{ uri: &#x27;https://reactjs.org/logo-og.png&#x27; }}</b>
<b>+┊   ┊122┊              /&gt;</b>
<b>+┊   ┊123┊              &lt;Text&gt;edit&lt;/Text&gt;</b>
<b>+┊   ┊124┊            &lt;/TouchableOpacity&gt;</b>
<b>+┊   ┊125┊            &lt;Text style&#x3D;{styles.inputInstructions}&gt;</b>
<b>+┊   ┊126┊              Enter your name and add an optional profile picture</b>
<b>+┊   ┊127┊            &lt;/Text&gt;</b>
<b>+┊   ┊128┊          &lt;/View&gt;</b>
<b>+┊   ┊129┊          &lt;View style&#x3D;{styles.inputBorder}&gt;</b>
<b>+┊   ┊130┊            &lt;TextInput</b>
<b>+┊   ┊131┊              onChangeText&#x3D;{username &#x3D;&gt; this.setState({ username })}</b>
<b>+┊   ┊132┊              placeholder&#x3D;{user.username}</b>
<b>+┊   ┊133┊              style&#x3D;{styles.input}</b>
<b>+┊   ┊134┊              defaultValue&#x3D;{user.username}</b>
<b>+┊   ┊135┊            /&gt;</b>
<b>+┊   ┊136┊          &lt;/View&gt;</b>
<b>+┊   ┊137┊        &lt;/View&gt;</b>
<b>+┊   ┊138┊        &lt;Text style&#x3D;{styles.emailHeader}&gt;EMAIL&lt;/Text&gt;</b>
<b>+┊   ┊139┊        &lt;Text style&#x3D;{styles.email}&gt;{user.email}&lt;/Text&gt;</b>
<b>+┊   ┊140┊        &lt;Button title&#x3D;&quot;Logout&quot; onPress&#x3D;{this.logout} /&gt;</b>
<b>+┊   ┊141┊      &lt;/View&gt;</b>
<b>+┊   ┊142┊    );</b>
<b>+┊   ┊143┊  }</b>
<b>+┊   ┊144┊}</b>
<b>+┊   ┊145┊</b>
<b>+┊   ┊146┊Settings.propTypes &#x3D; {</b>
<b>+┊   ┊147┊  auth: PropTypes.shape({</b>
<b>+┊   ┊148┊    loading: PropTypes.bool,</b>
<b>+┊   ┊149┊    jwt: PropTypes.string,</b>
<b>+┊   ┊150┊  }).isRequired,</b>
<b>+┊   ┊151┊  dispatch: PropTypes.func.isRequired,</b>
<b>+┊   ┊152┊  loading: PropTypes.bool,</b>
<b>+┊   ┊153┊  navigation: PropTypes.shape({</b>
<b>+┊   ┊154┊    navigate: PropTypes.func,</b>
<b>+┊   ┊155┊  }),</b>
<b>+┊   ┊156┊  user: PropTypes.shape({</b>
<b>+┊   ┊157┊    username: PropTypes.string,</b>
<b>+┊   ┊158┊  }),</b>
<b>+┊   ┊159┊};</b>
<b>+┊   ┊160┊</b>
<b>+┊   ┊161┊const userQuery &#x3D; graphql(USER_QUERY, {</b>
<b>+┊   ┊162┊  skip: ownProps &#x3D;&gt; !ownProps.auth || !ownProps.auth.jwt,</b>
<b>+┊   ┊163┊  options: ({ auth }) &#x3D;&gt; ({ variables: { id: auth.id }, fetchPolicy: &#x27;cache-only&#x27; }),</b>
<b>+┊   ┊164┊  props: ({ data: { loading, user } }) &#x3D;&gt; ({</b>
<b>+┊   ┊165┊    loading, user,</b>
<b>+┊   ┊166┊  }),</b>
<b>+┊   ┊167┊});</b>
<b>+┊   ┊168┊</b>
<b>+┊   ┊169┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊170┊  auth,</b>
<b>+┊   ┊171┊});</b>
<b>+┊   ┊172┊</b>
<b>+┊   ┊173┊export default compose(</b>
<b>+┊   ┊174┊  connect(mapStateToProps),</b>
<b>+┊   ┊175┊  userQuery,</b>
<b>+┊   ┊176┊)(Settings);</b>
</pre>

[}]: #

The most important pieces of this code we need to focus on is any `auth` related code:
1. We connect `auth` from our Redux store to the component via `connect(mapStateToProps)`
2. We `skip` the `userQuery` unless we have a JWT (`ownProps.auth.jwt`)
3. We show a loading spinner until we’re done loading the user

Let’s add the `Settings` screen to our settings tab in `client/src/navigation.js`. We will also use `navigationReducer` to handle pushing the `Signin` Screen whenever the user logs out or starts the application without being authenticated:

[{]: <helper> (diffStep 7.29)

#### [Step 7.29: Add Settings screen and auth logic to Navigation](https://github.com/srtucker22/chatty/commit/8db9691)

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊11┊11┊import update from &#x27;immutability-helper&#x27;;
 ┊12┊12┊import { map } from &#x27;lodash&#x27;;
 ┊13┊13┊import { Buffer } from &#x27;buffer&#x27;;
<b>+┊  ┊14┊import { REHYDRATE } from &#x27;redux-persist&#x27;;</b>
 ┊14┊15┊
 ┊15┊16┊import Groups from &#x27;./screens/groups.screen&#x27;;
 ┊16┊17┊import Messages from &#x27;./screens/messages.screen&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊18┊19┊import GroupDetails from &#x27;./screens/group-details.screen&#x27;;
 ┊19┊20┊import NewGroup from &#x27;./screens/new-group.screen&#x27;;
 ┊20┊21┊import Signin from &#x27;./screens/signin.screen&#x27;;
<b>+┊  ┊22┊import Settings from &#x27;./screens/settings.screen&#x27;;</b>
 ┊21┊23┊
 ┊22┊24┊import { USER_QUERY } from &#x27;./graphql/user.query&#x27;;
 ┊23┊25┊import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊25┊27┊
 ┊26┊28┊import { wsClient } from &#x27;./app&#x27;;
 ┊27┊29┊
<b>+┊  ┊30┊import { LOGOUT } from &#x27;./constants/constants&#x27;;</b>
 ┊52┊31┊
 ┊53┊32┊// tabs in main screen
 ┊54┊33┊const MainScreenNavigator &#x3D; TabNavigator({
 ┊55┊34┊  Chats: { screen: Groups },
<b>+┊  ┊35┊  Settings: { screen: Settings },</b>
 ┊57┊36┊}, {
 ┊58┊37┊  initialRouteName: &#x27;Chats&#x27;,
 ┊59┊38┊});
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊79┊58┊	],
 ┊80┊59┊}));
 ┊81┊60┊
<b>+┊  ┊61┊// reducer code</b>
 ┊82┊62┊export const navigationReducer &#x3D; (state &#x3D; initialState, action) &#x3D;&gt; {
<b>+┊  ┊63┊  let nextState &#x3D; AppNavigator.router.getStateForAction(action, state);</b>
<b>+┊  ┊64┊  switch (action.type) {</b>
<b>+┊  ┊65┊    case REHYDRATE:</b>
<b>+┊  ┊66┊      // convert persisted data to Immutable and confirm rehydration</b>
<b>+┊  ┊67┊      if (!action.payload || !action.payload.auth || !action.payload.auth.jwt) {</b>
<b>+┊  ┊68┊        const { routes, index } &#x3D; state;</b>
<b>+┊  ┊69┊        if (routes[index].routeName !&#x3D;&#x3D; &#x27;Signin&#x27;) {</b>
<b>+┊  ┊70┊          nextState &#x3D; AppNavigator.router.getStateForAction(</b>
<b>+┊  ┊71┊            NavigationActions.navigate({ routeName: &#x27;Signin&#x27; }),</b>
<b>+┊  ┊72┊            state,</b>
<b>+┊  ┊73┊          );</b>
<b>+┊  ┊74┊        }</b>
<b>+┊  ┊75┊      }</b>
<b>+┊  ┊76┊      break;</b>
<b>+┊  ┊77┊    case LOGOUT:</b>
<b>+┊  ┊78┊      const { routes, index } &#x3D; state;</b>
<b>+┊  ┊79┊      if (routes[index].routeName !&#x3D;&#x3D; &#x27;Signin&#x27;) {</b>
<b>+┊  ┊80┊        nextState &#x3D; AppNavigator.router.getStateForAction(</b>
<b>+┊  ┊81┊          NavigationActions.navigate({ routeName: &#x27;Signin&#x27; }),</b>
<b>+┊  ┊82┊          state,</b>
<b>+┊  ┊83┊        );</b>
<b>+┊  ┊84┊      }</b>
<b>+┊  ┊85┊      break;</b>
<b>+┊  ┊86┊    default:</b>
<b>+┊  ┊87┊      nextState &#x3D; AppNavigator.router.getStateForAction(action, state);</b>
<b>+┊  ┊88┊      break;</b>
<b>+┊  ┊89┊  }</b>
 ┊84┊90┊
 ┊85┊91┊  // Simply return the original &#x60;state&#x60; if &#x60;nextState&#x60; is null or undefined.
 ┊86┊92┊  return nextState || state;
</pre>

[}]: #

Though it’s typically best practice to keep reducers pure (not triggering actions directly), we’ve made an exception with `NavigationActions` in our `navigationReducer` to keep the code a little simpler in this particular case.

Let’s run it!

![Logout Gif](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-29.gif)

## Refactoring Queries and Mutations
We need to update all our client-side Queries and Mutations to match our modified Schema. We also need to update the variables we pass to these Queries and Mutations through `graphql` and attach to components.

Let’s look at the `USER_QUERY` in `Groups` and `AppWithNavigationState` for a full example:

[{]: <helper> (diffStep "7.30")

#### [Step 7.30: Update userQuery with auth in Groups and Navigation](https://github.com/srtucker22/chatty/commit/0606c92)

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊120┊120┊      }, this);
 ┊121┊121┊    }
 ┊122┊122┊
<b>+┊   ┊123┊    if (nextProps.user &amp;&amp; nextProps.user.id &#x3D;&#x3D;&#x3D; nextProps.auth.id &amp;&amp;</b>
 ┊124┊124┊      (!this.props.user || nextProps.user.groups.length !&#x3D;&#x3D; this.props.user.groups.length)) {
 ┊125┊125┊      // unsubscribe from old
 ┊126┊126┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊150┊150┊}
 ┊151┊151┊
 ┊152┊152┊AppWithNavigationState.propTypes &#x3D; {
<b>+┊   ┊153┊  auth: PropTypes.shape({</b>
<b>+┊   ┊154┊    id: PropTypes.number,</b>
<b>+┊   ┊155┊    jwt: PropTypes.string,</b>
<b>+┊   ┊156┊  }),</b>
 ┊153┊157┊  dispatch: PropTypes.func.isRequired,
 ┊154┊158┊  nav: PropTypes.object.isRequired,
 ┊155┊159┊  refetch: PropTypes.func,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊167┊171┊  }),
 ┊168┊172┊};
 ┊169┊173┊
<b>+┊   ┊174┊const mapStateToProps &#x3D; ({ auth, nav }) &#x3D;&gt; ({</b>
<b>+┊   ┊175┊  auth,</b>
<b>+┊   ┊176┊  nav,</b>
 ┊172┊177┊});
 ┊173┊178┊
 ┊174┊179┊const userQuery &#x3D; graphql(USER_QUERY, {
<b>+┊   ┊180┊  skip: ownProps &#x3D;&gt; !ownProps.auth || !ownProps.auth.jwt,</b>
<b>+┊   ┊181┊  options: ownProps &#x3D;&gt; ({ variables: { id: ownProps.auth.id } }),</b>
 ┊177┊182┊  props: ({ data: { loading, user, refetch, subscribeToMore } }) &#x3D;&gt; ({
 ┊178┊183┊    loading,
 ┊179┊184┊    user,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊10┊10┊  TouchableHighlight,
 ┊11┊11┊  View,
 ┊12┊12┊} from &#x27;react-native&#x27;;
<b>+┊  ┊13┊import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
 ┊14┊14┊import moment from &#x27;moment&#x27;;
 ┊15┊15┊import Icon from &#x27;react-native-vector-icons/FontAwesome&#x27;;
<b>+┊  ┊16┊import { connect } from &#x27;react-redux&#x27;;</b>
 ┊16┊17┊
 ┊17┊18┊import { USER_QUERY } from &#x27;../graphql/user.query&#x27;;
 ┊18┊19┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 95┊ 96┊  onPress: PropTypes.func.isRequired,
 ┊ 96┊ 97┊};
 ┊ 97┊ 98┊
 ┊101┊ 99┊class Group extends Component {
 ┊102┊100┊  constructor(props) {
 ┊103┊101┊    super(props);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊172┊170┊    this.onRefresh &#x3D; this.onRefresh.bind(this);
 ┊173┊171┊  }
 ┊174┊172┊
 ┊185┊173┊  onRefresh() {
 ┊186┊174┊    this.props.refetch();
 ┊187┊175┊    // faking unauthorized status
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊257┊245┊};
 ┊258┊246┊
 ┊259┊247┊const userQuery &#x3D; graphql(USER_QUERY, {
<b>+┊   ┊248┊  skip: ownProps &#x3D;&gt; !ownProps.auth || !ownProps.auth.jwt,</b>
<b>+┊   ┊249┊  options: ownProps &#x3D;&gt; ({ variables: { id: ownProps.auth.id } }),</b>
 ┊262┊250┊  props: ({ data: { loading, networkStatus, refetch, user } }) &#x3D;&gt; ({
 ┊263┊251┊    loading, networkStatus, refetch, user,
 ┊264┊252┊  }),
 ┊265┊253┊});
 ┊266┊254┊
<b>+┊   ┊255┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊256┊  auth,</b>
<b>+┊   ┊257┊});</b>
<b>+┊   ┊258┊</b>
<b>+┊   ┊259┊export default compose(</b>
<b>+┊   ┊260┊  connect(mapStateToProps),</b>
<b>+┊   ┊261┊  userQuery,</b>
<b>+┊   ┊262┊)(Groups);</b>
</pre>

[}]: #

1. We use `connect(mapStateToProps)` to attach `auth` from Redux to our component
2. We modify the `userQuery` options to pass `ownProps.auth.id` instead of the `1` placeholder
3. We change `skip` to use `ownProps.auth.jwt` to determine whether to run `userQuery`

We'll also have to make similar changes in `Messages`:

[{]: <helper> (diffStep 7.31)

#### [Step 7.31: Update Messages Screen and createMessage with auth](https://github.com/srtucker22/chatty/commit/807d2f7)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-message.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 3┊ 3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const CREATE_MESSAGE_MUTATION &#x3D; gql&#x60;
<b>+┊  ┊ 6┊  mutation createMessage($text: String!, $groupId: Int!) {</b>
<b>+┊  ┊ 7┊    createMessage(text: $text, groupId: $groupId) {</b>
 ┊ 8┊ 8┊      ... MessageFragment
 ┊ 9┊ 9┊    }
 ┊10┊10┊  }
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊16┊16┊import { Buffer } from &#x27;buffer&#x27;;
 ┊17┊17┊import _ from &#x27;lodash&#x27;;
 ┊18┊18┊import moment from &#x27;moment&#x27;;
<b>+┊  ┊19┊import { connect } from &#x27;react-redux&#x27;;</b>
 ┊19┊20┊
 ┊20┊21┊import { wsClient } from &#x27;../app&#x27;;
 ┊21┊22┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊171┊172┊  send(text) {
 ┊172┊173┊    this.props.createMessage({
 ┊173┊174┊      groupId: this.props.navigation.state.params.groupId,
 ┊175┊175┊      text,
 ┊176┊176┊    }).then(() &#x3D;&gt; {
 ┊177┊177┊      this.flatList.scrollToIndex({ index: 0, animated: true });
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊186┊186┊    return (
 ┊187┊187┊      &lt;Message
 ┊188┊188┊        color&#x3D;{this.state.usernameColors[message.from.username]}
<b>+┊   ┊189┊        isCurrentUser&#x3D;{message.from.id &#x3D;&#x3D;&#x3D; this.props.auth.id}</b>
 ┊190┊190┊        message&#x3D;{message}
 ┊191┊191┊      /&gt;
 ┊192┊192┊    );
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊228┊228┊}
 ┊229┊229┊
 ┊230┊230┊Messages.propTypes &#x3D; {
<b>+┊   ┊231┊  auth: PropTypes.shape({</b>
<b>+┊   ┊232┊    id: PropTypes.number,</b>
<b>+┊   ┊233┊    username: PropTypes.string,</b>
<b>+┊   ┊234┊  }),</b>
 ┊231┊235┊  createMessage: PropTypes.func,
 ┊232┊236┊  navigation: PropTypes.shape({
 ┊233┊237┊    navigate: PropTypes.func,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊296┊300┊});
 ┊297┊301┊
 ┊298┊302┊const createMessageMutation &#x3D; graphql(CREATE_MESSAGE_MUTATION, {
<b>+┊   ┊303┊  props: ({ ownProps, mutate }) &#x3D;&gt; ({</b>
<b>+┊   ┊304┊    createMessage: ({ text, groupId }) &#x3D;&gt;</b>
 ┊301┊305┊      mutate({
<b>+┊   ┊306┊        variables: { text, groupId },</b>
 ┊303┊307┊        optimisticResponse: {
 ┊304┊308┊          __typename: &#x27;Mutation&#x27;,
 ┊305┊309┊          createMessage: {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊309┊313┊            createdAt: new Date().toISOString(), // the time is now!
 ┊310┊314┊            from: {
 ┊311┊315┊              __typename: &#x27;User&#x27;,
<b>+┊   ┊316┊              id: ownProps.auth.id,</b>
<b>+┊   ┊317┊              username: ownProps.auth.username,</b>
 ┊314┊318┊            },
 ┊315┊319┊            to: {
 ┊316┊320┊              __typename: &#x27;Group&#x27;,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊348┊352┊          const userData &#x3D; store.readQuery({
 ┊349┊353┊            query: USER_QUERY,
 ┊350┊354┊            variables: {
<b>+┊   ┊355┊              id: ownProps.auth.id,</b>
 ┊352┊356┊            },
 ┊353┊357┊          });
 ┊354┊358┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊367┊371┊            store.writeQuery({
 ┊368┊372┊              query: USER_QUERY,
 ┊369┊373┊              variables: {
<b>+┊   ┊374┊                id: ownProps.auth.id,</b>
 ┊371┊375┊              },
 ┊372┊376┊              data: userData,
 ┊373┊377┊            });
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊378┊382┊  }),
 ┊379┊383┊});
 ┊380┊384┊
<b>+┊   ┊385┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊386┊  auth,</b>
<b>+┊   ┊387┊});</b>
<b>+┊   ┊388┊</b>
 ┊381┊389┊export default compose(
<b>+┊   ┊390┊  connect(mapStateToProps),</b>
 ┊382┊391┊  groupQuery,
 ┊383┊392┊  createMessageMutation,
 ┊384┊393┊)(Messages);
</pre>

[}]: #

We need to make similar changes in every other one of our components before we’re bug free. Here are all the major changes:

[{]: <helper> (diffStep 7.32)

#### [Step 7.32: Update Groups flow with auth](https://github.com/srtucker22/chatty/commit/dc12061)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 3┊ 3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const CREATE_GROUP_MUTATION &#x3D; gql&#x60;
<b>+┊  ┊ 6┊  mutation createGroup($name: String!, $userIds: [Int!]) {</b>
<b>+┊  ┊ 7┊    createGroup(name: $name, userIds: $userIds) {</b>
 ┊ 8┊ 8┊      id
 ┊ 9┊ 9┊      name
 ┊10┊10┊      users {
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;leave-group.mutation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import gql from &#x27;graphql-tag&#x27;;
 ┊2┊2┊
 ┊3┊3┊const LEAVE_GROUP_MUTATION &#x3D; gql&#x60;
<b>+┊ ┊4┊  mutation leaveGroup($id: Int!) {</b>
<b>+┊ ┊5┊    leaveGroup(id: $id) {</b>
 ┊6┊6┊      id
 ┊7┊7┊    }
 ┊8┊8┊  }
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;finalize-group.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊14┊14┊import { graphql, compose } from &#x27;react-apollo&#x27;;
 ┊15┊15┊import { NavigationActions } from &#x27;react-navigation&#x27;;
 ┊16┊16┊import update from &#x27;immutability-helper&#x27;;
<b>+┊  ┊17┊import { connect } from &#x27;react-redux&#x27;;</b>
 ┊17┊18┊
 ┊18┊19┊import { USER_QUERY } from &#x27;../graphql/user.query&#x27;;
 ┊19┊20┊import CREATE_GROUP_MUTATION from &#x27;../graphql/create-group.mutation&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊143┊144┊
 ┊144┊145┊    createGroup({
 ┊145┊146┊      name: this.state.name,
 ┊147┊147┊      userIds: _.map(this.state.selected, &#x27;id&#x27;),
 ┊148┊148┊    }).then((res) &#x3D;&gt; {
 ┊149┊149┊      this.props.navigation.dispatch(goToNewGroup(res.data.createGroup));
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊222┊222┊};
 ┊223┊223┊
 ┊224┊224┊const createGroupMutation &#x3D; graphql(CREATE_GROUP_MUTATION, {
<b>+┊   ┊225┊  props: ({ ownProps, mutate }) &#x3D;&gt; ({</b>
<b>+┊   ┊226┊    createGroup: ({ name, userIds }) &#x3D;&gt;</b>
 ┊227┊227┊      mutate({
<b>+┊   ┊228┊        variables: { name, userIds },</b>
 ┊229┊229┊        update: (store, { data: { createGroup } }) &#x3D;&gt; {
 ┊230┊230┊          // Read the data from our cache for this query.
<b>+┊   ┊231┊          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });</b>
 ┊232┊232┊
 ┊233┊233┊          // Add our message from the mutation to the end.
 ┊234┊234┊          data.user.groups.push(createGroup);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊236┊236┊          // Write our data back to the cache.
 ┊237┊237┊          store.writeQuery({
 ┊238┊238┊            query: USER_QUERY,
<b>+┊   ┊239┊            variables: { id: ownProps.auth.id },</b>
 ┊240┊240┊            data,
 ┊241┊241┊          });
 ┊242┊242┊        },
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊255┊255┊  }),
 ┊256┊256┊});
 ┊257┊257┊
<b>+┊   ┊258┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊259┊  auth,</b>
<b>+┊   ┊260┊});</b>
<b>+┊   ┊261┊</b>
 ┊258┊262┊export default compose(
<b>+┊   ┊263┊  connect(mapStateToProps),</b>
 ┊259┊264┊  userQuery,
 ┊260┊265┊  createGroupMutation,
 ┊261┊266┊)(FinalizeGroup);
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;group-details.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊13┊13┊} from &#x27;react-native&#x27;;
 ┊14┊14┊import { graphql, compose } from &#x27;react-apollo&#x27;;
 ┊15┊15┊import { NavigationActions } from &#x27;react-navigation&#x27;;
<b>+┊  ┊16┊import { connect } from &#x27;react-redux&#x27;;</b>
 ┊16┊17┊
 ┊17┊18┊import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;
 ┊18┊19┊import USER_QUERY from &#x27;../graphql/user.query&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊110┊111┊  leaveGroup() {
 ┊111┊112┊    this.props.leaveGroup({
 ┊112┊113┊      id: this.props.navigation.state.params.id,
<b>+┊   ┊114┊    })</b>
 ┊115┊115┊      .then(() &#x3D;&gt; {
 ┊116┊116┊        this.props.navigation.dispatch(resetAction);
 ┊117┊117┊      })
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊219┊219┊        variables: { id },
 ┊220┊220┊        update: (store, { data: { deleteGroup } }) &#x3D;&gt; {
 ┊221┊221┊          // Read the data from our cache for this query.
<b>+┊   ┊222┊          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });</b>
 ┊223┊223┊
 ┊224┊224┊          // Add our message from the mutation to the end.
 ┊225┊225┊          data.user.groups &#x3D; data.user.groups.filter(g &#x3D;&gt; deleteGroup.id !&#x3D;&#x3D; g.id);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊227┊227┊          // Write our data back to the cache.
 ┊228┊228┊          store.writeQuery({
 ┊229┊229┊            query: USER_QUERY,
<b>+┊   ┊230┊            variables: { id: ownProps.auth.id },</b>
 ┊231┊231┊            data,
 ┊232┊232┊          });
 ┊233┊233┊        },
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊237┊237┊
 ┊238┊238┊const leaveGroupMutation &#x3D; graphql(LEAVE_GROUP_MUTATION, {
 ┊239┊239┊  props: ({ ownProps, mutate }) &#x3D;&gt; ({
<b>+┊   ┊240┊    leaveGroup: ({ id }) &#x3D;&gt;</b>
 ┊241┊241┊      mutate({
<b>+┊   ┊242┊        variables: { id },</b>
 ┊243┊243┊        update: (store, { data: { leaveGroup } }) &#x3D;&gt; {
 ┊244┊244┊          // Read the data from our cache for this query.
<b>+┊   ┊245┊          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });</b>
 ┊246┊246┊
 ┊247┊247┊          // Add our message from the mutation to the end.
 ┊248┊248┊          data.user.groups &#x3D; data.user.groups.filter(g &#x3D;&gt; leaveGroup.id !&#x3D;&#x3D; g.id);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊250┊250┊          // Write our data back to the cache.
 ┊251┊251┊          store.writeQuery({
 ┊252┊252┊            query: USER_QUERY,
<b>+┊   ┊253┊            variables: { id: ownProps.auth.id },</b>
 ┊254┊254┊            data,
 ┊255┊255┊          });
 ┊256┊256┊        },
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊258┊258┊  }),
 ┊259┊259┊});
 ┊260┊260┊
<b>+┊   ┊261┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊262┊  auth,</b>
<b>+┊   ┊263┊});</b>
<b>+┊   ┊264┊</b>
 ┊261┊265┊export default compose(
<b>+┊   ┊266┊  connect(mapStateToProps),</b>
 ┊262┊267┊  groupQuery,
 ┊263┊268┊  deleteGroupMutation,
 ┊264┊269┊  leaveGroupMutation,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;new-group.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊13┊13┊import AlphabetListView from &#x27;react-native-alpha-listview&#x27;;
 ┊14┊14┊import update from &#x27;immutability-helper&#x27;;
 ┊15┊15┊import Icon from &#x27;react-native-vector-icons/FontAwesome&#x27;;
<b>+┊  ┊16┊import { connect } from &#x27;react-redux&#x27;;</b>
 ┊16┊17┊
 ┊17┊18┊import SelectedUserList from &#x27;../components/selected-user-list.component&#x27;;
 ┊18┊19┊import USER_QUERY from &#x27;../graphql/user.query&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊309┊310┊};
 ┊310┊311┊
 ┊311┊312┊const userQuery &#x3D; graphql(USER_QUERY, {
<b>+┊   ┊313┊  options: ownProps &#x3D;&gt; ({ variables: { id: ownProps.auth.id } }),</b>
 ┊313┊314┊  props: ({ data: { loading, user } }) &#x3D;&gt; ({
 ┊314┊315┊    loading, user,
 ┊315┊316┊  }),
 ┊316┊317┊});
 ┊317┊318┊
<b>+┊   ┊319┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊320┊  auth,</b>
<b>+┊   ┊321┊});</b>
<b>+┊   ┊322┊</b>
 ┊318┊323┊export default compose(
<b>+┊   ┊324┊  connect(mapStateToProps),</b>
 ┊319┊325┊  userQuery,
 ┊320┊326┊)(NewGroup);
</pre>

[}]: #

[{]: <helper> (diffStep 7.33)

#### [Step 7.33: Update messageAdded flow with auth](https://github.com/srtucker22/chatty/commit/fac81c5)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;message-added.subscription.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 3┊ 3┊import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;
 ┊ 4┊ 4┊
 ┊ 5┊ 5┊const MESSAGE_ADDED_SUBSCRIPTION &#x3D; gql&#x60;
<b>+┊  ┊ 6┊  subscription onMessageAdded($groupIds: [Int]){</b>
<b>+┊  ┊ 7┊    messageAdded(groupIds: $groupIds){</b>
 ┊ 8┊ 8┊      ... MessageFragment
 ┊ 9┊ 9┊    }
 ┊10┊10┊  }
</pre>

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊187┊187┊      return subscribeToMore({
 ┊188┊188┊        document: MESSAGE_ADDED_SUBSCRIPTION,
 ┊189┊189┊        variables: {
 ┊191┊190┊          groupIds: map(user.groups, &#x27;id&#x27;),
 ┊192┊191┊        },
 ┊193┊192┊        updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊117┊117┊        this.subscription &#x3D; nextProps.subscribeToMore({
 ┊118┊118┊          document: MESSAGE_ADDED_SUBSCRIPTION,
 ┊119┊119┊          variables: {
 ┊121┊120┊            groupIds: [nextProps.navigation.state.params.groupId],
 ┊122┊121┊          },
 ┊123┊122┊          updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {
</pre>

[}]: #

When everything is said and done, we should have a beautifully running Chatty app 📱‼️‼️

![Chatty Gif](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step7-32.gif)

# 🎉 CONGRATULATIONS!!! 🎉
We made it! We made a secure, real-time chat app with React Native and GraphQL. How cool is that?! More importantly, we now have the skills and knowhow to make pretty much anything we want with some of the best tools out there.

I hope this series has been at least a little helpful in furthering your growth as a developer. I’m really stoked and humbled at the reception it has been getting, and I want to continue to do everything I can to make it the best it can be.

With that in mind, if you have any suggestions for making this series better, please leave your feedback!


[//]: # (foot-start)

[{]: <helper> (navStep)

⟸ <a href="https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/medium/step6.md">PREVIOUS STEP</a> <b>║</b> <a href="https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/medium/step8.md">NEXT STEP</a> ⟹

[}]: #

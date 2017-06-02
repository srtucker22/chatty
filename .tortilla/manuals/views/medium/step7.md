# Step 7: GraphQL Authentication

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
[JSON Web Token (JWT)](http://jwt.io) is an open standard ([RFC 7519](https://tools.ietf.org/html/rfc7519)) for securely sending digitally signed JSONs between parties. JWTs are incredibly cool for authentication because they let us implement reliable Single Sign-On (SSO) with low overhead on any platform (native, web, VR, whatever…) and across domains. JWTs are a strong alternative to pure cookie or session based auth with simple tokens or SAML, which can fail miserably in native app implementations. We can even use cookies with JWTs if we really want.

Without getting into technical details, a JWT is basically just a JSON message that gets all kinds of encoded, hashed, and signed to keep it super secure. Feel free to dig into the details [here](https://jwt.io/introduction/).

For our purposes, we just need to know how to use JWTs within our authentication workflow. When a user logs into our app, the server will check their email and password against the database. If the user exists, we’ll take their `{email: <your-email>, password: <your-pw>}` combination, turn it into a lovely JWT, and send it back to the client. The client can store the JWT forever or until we set it to expire.

Whenever the client wants to ask the server for data, it’ll pass the JWT in the request’s Authorization Header (`Authorization: Bearer <token>`). The server will decode the Authorization Header before executing every request, and the decoded JWT should contain `{email: <your-email>, password: <your-pw>}`. With that data, the server can retrieve the user again via the database or a cache to determine whether the user is allowed to execute the request.

Let’s make it happen!

# JWT Authentication for Queries and Mutations
We can use the excellent [`express-jwt`](https://www.npmjs.com/package/express-jwt) and [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken) packages for all our JWT encoding/decoding needs. We’re also going to use [`bcrypt`](https://www.npmjs.com/package/bcrypt) for hashing passwords and [`dotenv`](https://www.npmjs.com/package/dotenv) to set our JWT secret key as an environment variable:
```
yarn add express-jwt jsonwebtoken bcrypt dotenv
```

In a new `.env` file on the root directory, let’s add a `JWT_SECRET` environment variable:

[{]: <helper> (diffStep 7.1 files=".env")

#### Step 7.1: Add environment variables for JWT_SECRET

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

#### Step 7.1: Add environment variables for JWT_SECRET

##### Added server&#x2F;config.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊import dotenv from &#x27;dotenv&#x27;;</b>
<b>+┊ ┊2┊</b>
<b>+┊ ┊3┊dotenv.config({ silent: true });</b>
<b>+┊ ┊4┊</b>
<b>+┊ ┊5┊export const { JWT_SECRET } &#x3D; process.env;</b>
<b>+┊ ┊6┊</b>
<b>+┊ ┊7┊export default JWT_SECRET;</b>
</pre>

[}]: #

Now, let’s update our express server in `server/index.js` to use `express-jwt `middleware:

[{]: <helper> (diffStep 7.2)

#### Step 7.2: Add jwt middleware to express

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 4┊ 4┊import { createServer } from &#x27;http&#x27;;
 ┊ 5┊ 5┊import { SubscriptionServer } from &#x27;subscriptions-transport-ws&#x27;;
 ┊ 6┊ 6┊import { execute, subscribe } from &#x27;graphql&#x27;;
<b>+┊  ┊ 7┊import jwt from &#x27;express-jwt&#x27;;</b>
 ┊ 7┊ 8┊
<b>+┊  ┊ 9┊import { JWT_SECRET } from &#x27;./config&#x27;;</b>
<b>+┊  ┊10┊import { User } from &#x27;./data/connectors&#x27;;</b>
 ┊ 8┊11┊import { executableSchema } from &#x27;./data/schema&#x27;;
 ┊ 9┊12┊
 ┊10┊13┊const GRAPHQL_PORT &#x3D; 8080;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊14┊17┊const app &#x3D; express();
 ┊15┊18┊
 ┊16┊19┊// &#x60;context&#x60; must be an object and can&#x27;t be undefined when using connectors
<b>+┊  ┊20┊app.use(&#x27;/graphql&#x27;, bodyParser.json(), jwt({</b>
<b>+┊  ┊21┊  secret: JWT_SECRET,</b>
<b>+┊  ┊22┊  credentialsRequired: false,</b>
<b>+┊  ┊23┊}), graphqlExpress(req &#x3D;&gt; ({</b>
 ┊18┊24┊  schema: executableSchema,
<b>+┊  ┊25┊  context: {</b>
<b>+┊  ┊26┊    user: req.user ?</b>
<b>+┊  ┊27┊      User.findOne({ where: { id: req.user.id } }) : Promise.resolve(null),</b>
<b>+┊  ┊28┊  },</b>
<b>+┊  ┊29┊})));</b>
 ┊21┊30┊
 ┊22┊31┊app.use(&#x27;/graphiql&#x27;, graphiqlExpress({
 ┊23┊32┊  endpointURL: GRAPHQL_PATH,
</pre>

[}]: #

The `express-jwt` middleware checks our Authorization Header for a `Bearer` token, decodes the token using the `JWT_SECRET` into a JSON object, and then attaches that Object to the request as `req.user`. We can use `req.user` to find the associated `User` in our database  —  we pretty much only need to use the `id` parameter to retrieve the `User` because we can be confident the JWT is secure (more on this later). Lastly, we pass the found User into a `context` parameter in our `graphqlExpress` middleware. By doing this, every one of our Resolvers will get passed a `context` parameter with the `User`, which we will use to validate credentials before touching any data.

Note that by setting `credentialsRequired: false`, we allow non-authenticated requests to pass through the middleware. This is required so we can allow signup and login requests (and others) through the endpoint.

## Refactoring Schemas
Time to focus on our Schema. We need to perform 3 changes to `server/data/schema.js`:
1. Add new GraphQL Mutations for logging in and signing up
2. Add the JWT to the `User` type
3. Since the User will get passed into all the Resolvers automatically via context, we no longer need to pass a `userId` to any queries or mutations, so let’s simplify their inputs!

[{]: <helper> (diffStep 7.3)

#### Step 7.3: Update Schema with auth

##### Changed server&#x2F;data&#x2F;schema.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊23┊23┊    messages: [Message] # messages sent by user
 ┊24┊24┊    groups: [Group] # groups the user belongs to
 ┊25┊25┊    friends: [User] # user&#x27;s friends/contacts
<b>+┊  ┊26┊    jwt: String # json web token for access</b>
 ┊26┊27┊  }
 ┊27┊28┊
 ┊28┊29┊  # a message sent from a user to a group
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊49┊50┊
 ┊50┊51┊  type Mutation {
 ┊51┊52┊    # send a message to a group
<b>+┊  ┊53┊    createMessage(text: String!, groupId: Int!): Message</b>
<b>+┊  ┊54┊    createGroup(name: String!, userIds: [Int]): Group</b>
 ┊56┊55┊    deleteGroup(id: Int!): Group
<b>+┊  ┊56┊    leaveGroup(id: Int!): Group # let user leave group</b>
 ┊58┊57┊    updateGroup(id: Int!, name: String): Group
<b>+┊  ┊58┊    login(email: String!, password: String!): User</b>
<b>+┊  ┊59┊    signup(email: String!, password: String!, username: String): User</b>
 ┊59┊60┊  }
 ┊60┊61┊
 ┊61┊62┊  type Subscription {
</pre>

[}]: #

Because our server is stateless, **we don’t need to create a logout mutation!** The server will test for authorization on every request and login state will solely be kept on the client.

## Refactoring Resolvers
We need to update our Resolvers to handle our new `login` and `signup` Mutations. We can update `server/data/resolvers.js` as follows:

[{]: <helper> (diffStep 7.4)

#### Step 7.4: Update Resolvers with login and signup mutations

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import GraphQLDate from &#x27;graphql-date&#x27;;
 ┊ 2┊ 2┊import { withFilter } from &#x27;graphql-subscriptions&#x27;;
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
 ┊ 73┊ 76┊      return Group.findOne({ where: { id } })
 ┊ 74┊ 77┊        .then(group &#x3D;&gt; group.update({ name }));
 ┊ 75┊ 78┊    },
<b>+┊   ┊ 79┊    login(_, { email, password }, ctx) {</b>
<b>+┊   ┊ 80┊      // find user by email</b>
<b>+┊   ┊ 81┊      return User.findOne({ where: { email } }).then((user) &#x3D;&gt; {</b>
<b>+┊   ┊ 82┊        if (user) {</b>
<b>+┊   ┊ 83┊          // validate password</b>
<b>+┊   ┊ 84┊          return bcrypt.compare(password, user.password).then((res) &#x3D;&gt; {</b>
<b>+┊   ┊ 85┊            if (res) {</b>
<b>+┊   ┊ 86┊              // create jwt</b>
<b>+┊   ┊ 87┊              const token &#x3D; jwt.sign({</b>
<b>+┊   ┊ 88┊                id: user.id,</b>
<b>+┊   ┊ 89┊                email: user.email,</b>
<b>+┊   ┊ 90┊              }, JWT_SECRET);</b>
<b>+┊   ┊ 91┊              user.jwt &#x3D; token;</b>
<b>+┊   ┊ 92┊              ctx.user &#x3D; Promise.resolve(user);</b>
<b>+┊   ┊ 93┊              return user;</b>
<b>+┊   ┊ 94┊            }</b>
<b>+┊   ┊ 95┊</b>
<b>+┊   ┊ 96┊            return Promise.reject(&#x27;password incorrect&#x27;);</b>
<b>+┊   ┊ 97┊          });</b>
<b>+┊   ┊ 98┊        }</b>
<b>+┊   ┊ 99┊</b>
<b>+┊   ┊100┊        return Promise.reject(&#x27;email not found&#x27;);</b>
<b>+┊   ┊101┊      });</b>
<b>+┊   ┊102┊    },</b>
<b>+┊   ┊103┊    signup(_, { email, password, username }, ctx) {</b>
<b>+┊   ┊104┊      // find user by email</b>
<b>+┊   ┊105┊      return User.findOne({ where: { email } }).then((existing) &#x3D;&gt; {</b>
<b>+┊   ┊106┊        if (!existing) {</b>
<b>+┊   ┊107┊          // hash password and create user</b>
<b>+┊   ┊108┊          return bcrypt.hash(password, 10).then(hash &#x3D;&gt; User.create({</b>
<b>+┊   ┊109┊            email,</b>
<b>+┊   ┊110┊            password: hash,</b>
<b>+┊   ┊111┊            username: username || email,</b>
<b>+┊   ┊112┊          })).then((user) &#x3D;&gt; {</b>
<b>+┊   ┊113┊            const { id } &#x3D; user;</b>
<b>+┊   ┊114┊            const token &#x3D; jwt.sign({ id, email }, JWT_SECRET);</b>
<b>+┊   ┊115┊            user.jwt &#x3D; token;</b>
<b>+┊   ┊116┊            ctx.user &#x3D; Promise.resolve(user);</b>
<b>+┊   ┊117┊            return user;</b>
<b>+┊   ┊118┊          });</b>
<b>+┊   ┊119┊        }</b>
<b>+┊   ┊120┊</b>
<b>+┊   ┊121┊        return Promise.reject(&#x27;email already exists&#x27;); // email already exists</b>
<b>+┊   ┊122┊      });</b>
<b>+┊   ┊123┊    },</b>
 ┊ 76┊124┊  },
 ┊ 77┊125┊  Subscription: {
 ┊ 78┊126┊    messageAdded: {
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

#### Step 7.5: Update fake data with hashed passwords

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

Sweet! Now let’s refactor our Type, Query, and Mutation resolvers to use authentication to protect our data. Our earlier changes to `graphqlExpress` will attach a `context` parameter with the authenticated User to every request on our GraphQL endpoint. We consume `context` (`ctx`) in the Resolvers to build security around our data. For example, we might change `createMessage` to look something like this:

```
// this isn't good enough!!!
createMessage(_, { groupId, text }, ctx) {
  if (!ctx.user) {
    return Promise.reject('Unauthorized');
  }
  return ctx.user.then((user)=> {
    if(!user) {
      return Promise.reject('Unauthorized');
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

#### Step 7.6: Create logic.js

##### Added server&#x2F;data&#x2F;logic.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import { Message } from &#x27;./connectors&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊// reusable function to check for a user with context</b>
<b>+┊  ┊ 4┊function getAuthenticatedUser(ctx) {</b>
<b>+┊  ┊ 5┊  return ctx.user.then((user) &#x3D;&gt; {</b>
<b>+┊  ┊ 6┊    if (!user) {</b>
<b>+┊  ┊ 7┊      return Promise.reject(&#x27;Unauthorized&#x27;);</b>
<b>+┊  ┊ 8┊    }</b>
<b>+┊  ┊ 9┊    return user;</b>
<b>+┊  ┊10┊  });</b>
<b>+┊  ┊11┊}</b>
<b>+┊  ┊12┊</b>
<b>+┊  ┊13┊export const messageLogic &#x3D; {</b>
<b>+┊  ┊14┊  createMessage(_, { text, groupId }, ctx) {</b>
<b>+┊  ┊15┊    return getAuthenticatedUser(ctx)</b>
<b>+┊  ┊16┊      .then(user &#x3D;&gt; user.getGroups({ where: { id: groupId }, attributes: [&#x27;id&#x27;] })</b>
<b>+┊  ┊17┊      .then((group) &#x3D;&gt; {</b>
<b>+┊  ┊18┊        if (group.length) {</b>
<b>+┊  ┊19┊          return Message.create({</b>
<b>+┊  ┊20┊            userId: user.id,</b>
<b>+┊  ┊21┊            text,</b>
<b>+┊  ┊22┊            groupId,</b>
<b>+┊  ┊23┊          });</b>
<b>+┊  ┊24┊        }</b>
<b>+┊  ┊25┊        return Promise.reject(&#x27;Unauthorized&#x27;);</b>
<b>+┊  ┊26┊      }));</b>
<b>+┊  ┊27┊  },</b>
<b>+┊  ┊28┊};</b>
</pre>

[}]: #

We’ve separated out the function `getAuthenticatedUser` to check whether a `User` is making a request. We’ll be able to reuse this function across our logic for other requests.

Now we can start injecting this logic into our Resolvers:

[{]: <helper> (diffStep 7.7)

#### Step 7.7: Apply messageLogic to createMessage resolver

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
 ┊28┊29┊    },
 ┊29┊30┊  },
 ┊30┊31┊  Mutation: {
<b>+┊  ┊32┊    createMessage(_, args, ctx) {</b>
<b>+┊  ┊33┊      return messageLogic.createMessage(_, args, ctx)</b>
<b>+┊  ┊34┊        .then((message) &#x3D;&gt; {</b>
<b>+┊  ┊35┊          // Publish subscription notification with message</b>
<b>+┊  ┊36┊          pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });</b>
<b>+┊  ┊37┊          return message;</b>
<b>+┊  ┊38┊        });</b>
 ┊41┊39┊    },
 ┊42┊40┊    createGroup(_, { name, userIds, userId }) {
 ┊43┊41┊      return User.findOne({ where: { id: userId } })
</pre>

[}]: #

`createMessage` will return the result of the logic in `messageLogic`,  which returns a Promise that either successfully resolves to the new `Message` or rejects due to failed authorization.

Let’s fill out our logic in `server/data/logic.js` to cover all GraphQL Types, Queries and Mutations:

[{]: <helper> (diffStep 7.8)

#### Step 7.8: Create logic for all Resolvers

##### Changed server&#x2F;data&#x2F;logic.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊import { Group, Message, User } from &#x27;./connectors&#x27;;</b>
 ┊2┊2┊
 ┊3┊3┊// reusable function to check for a user with context
 ┊4┊4┊function getAuthenticatedUser(ctx) {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊11┊11┊}
 ┊12┊12┊
 ┊13┊13┊export const messageLogic &#x3D; {
<b>+┊  ┊14┊  from(message) {</b>
<b>+┊  ┊15┊    return message.getUser({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });</b>
<b>+┊  ┊16┊  },</b>
<b>+┊  ┊17┊  to(message) {</b>
<b>+┊  ┊18┊    return message.getGroup({ attributes: [&#x27;id&#x27;, &#x27;name&#x27;] });</b>
<b>+┊  ┊19┊  },</b>
 ┊14┊20┊  createMessage(_, { text, groupId }, ctx) {
 ┊15┊21┊    return getAuthenticatedUser(ctx)
 ┊16┊22┊      .then(user &#x3D;&gt; user.getGroups({ where: { id: groupId }, attributes: [&#x27;id&#x27;] })
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 26┊ 32┊      }));
 ┊ 27┊ 33┊  },
 ┊ 28┊ 34┊};
<b>+┊   ┊ 35┊</b>
<b>+┊   ┊ 36┊export const groupLogic &#x3D; {</b>
<b>+┊   ┊ 37┊  users(group) {</b>
<b>+┊   ┊ 38┊    return group.getUsers({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });</b>
<b>+┊   ┊ 39┊  },</b>
<b>+┊   ┊ 40┊  messages(group, args) {</b>
<b>+┊   ┊ 41┊    return Message.findAll({</b>
<b>+┊   ┊ 42┊      where: { groupId: group.id },</b>
<b>+┊   ┊ 43┊      order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],</b>
<b>+┊   ┊ 44┊      limit: args.limit,</b>
<b>+┊   ┊ 45┊      offset: args.offset,</b>
<b>+┊   ┊ 46┊    });</b>
<b>+┊   ┊ 47┊  },</b>
<b>+┊   ┊ 48┊  query(_, { id }, ctx) {</b>
<b>+┊   ┊ 49┊    return getAuthenticatedUser(ctx).then(user &#x3D;&gt; Group.findOne({</b>
<b>+┊   ┊ 50┊      where: { id },</b>
<b>+┊   ┊ 51┊      include: [{</b>
<b>+┊   ┊ 52┊        model: User,</b>
<b>+┊   ┊ 53┊        where: { id: user.id },</b>
<b>+┊   ┊ 54┊      }],</b>
<b>+┊   ┊ 55┊    }));</b>
<b>+┊   ┊ 56┊  },</b>
<b>+┊   ┊ 57┊  createGroup(_, { name, userIds }, ctx) {</b>
<b>+┊   ┊ 58┊    return getAuthenticatedUser(ctx)</b>
<b>+┊   ┊ 59┊      .then(user &#x3D;&gt; user.getFriends({ where: { id: { $in: userIds } } })</b>
<b>+┊   ┊ 60┊      .then((friends) &#x3D;&gt; {  // eslint-disable-line arrow-body-style</b>
<b>+┊   ┊ 61┊        return Group.create({</b>
<b>+┊   ┊ 62┊          name,</b>
<b>+┊   ┊ 63┊        }).then((group) &#x3D;&gt; {  // eslint-disable-line arrow-body-style</b>
<b>+┊   ┊ 64┊          return group.addUsers([user, ...friends]).then(() &#x3D;&gt; {</b>
<b>+┊   ┊ 65┊            group.users &#x3D; [user, ...friends];</b>
<b>+┊   ┊ 66┊            return group;</b>
<b>+┊   ┊ 67┊          });</b>
<b>+┊   ┊ 68┊        });</b>
<b>+┊   ┊ 69┊      }));</b>
<b>+┊   ┊ 70┊  },</b>
<b>+┊   ┊ 71┊  deleteGroup(_, { id }, ctx) {</b>
<b>+┊   ┊ 72┊    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; { // eslint-disable-line arrow-body-style</b>
<b>+┊   ┊ 73┊      return Group.findOne({</b>
<b>+┊   ┊ 74┊        where: { id },</b>
<b>+┊   ┊ 75┊        include: [{</b>
<b>+┊   ┊ 76┊          model: User,</b>
<b>+┊   ┊ 77┊          where: { id: user.id },</b>
<b>+┊   ┊ 78┊        }],</b>
<b>+┊   ┊ 79┊      }).then(group &#x3D;&gt; group.getUsers()</b>
<b>+┊   ┊ 80┊        .then(users &#x3D;&gt; group.removeUsers(users))</b>
<b>+┊   ┊ 81┊        .then(() &#x3D;&gt; Message.destroy({ where: { groupId: group.id } }))</b>
<b>+┊   ┊ 82┊        .then(() &#x3D;&gt; group.destroy()));</b>
<b>+┊   ┊ 83┊    });</b>
<b>+┊   ┊ 84┊  },</b>
<b>+┊   ┊ 85┊  leaveGroup(_, { id }, ctx) {</b>
<b>+┊   ┊ 86┊    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; {</b>
<b>+┊   ┊ 87┊      if (!user) {</b>
<b>+┊   ┊ 88┊        return Promise.reject(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊ 89┊      }</b>
<b>+┊   ┊ 90┊</b>
<b>+┊   ┊ 91┊      return Group.findOne({</b>
<b>+┊   ┊ 92┊        where: { id },</b>
<b>+┊   ┊ 93┊        include: [{</b>
<b>+┊   ┊ 94┊          model: User,</b>
<b>+┊   ┊ 95┊          where: { id: user.id },</b>
<b>+┊   ┊ 96┊        }],</b>
<b>+┊   ┊ 97┊      }).then((group) &#x3D;&gt; {</b>
<b>+┊   ┊ 98┊        if (!group) {</b>
<b>+┊   ┊ 99┊          Promise.reject(&#x27;No group found&#x27;);</b>
<b>+┊   ┊100┊        }</b>
<b>+┊   ┊101┊</b>
<b>+┊   ┊102┊        group.removeUser(user.id);</b>
<b>+┊   ┊103┊        return Promise.resolve({ id });</b>
<b>+┊   ┊104┊      });</b>
<b>+┊   ┊105┊    });</b>
<b>+┊   ┊106┊  },</b>
<b>+┊   ┊107┊  updateGroup(_, { id, name }, ctx) {</b>
<b>+┊   ┊108┊    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; {  // eslint-disable-line arrow-body-style</b>
<b>+┊   ┊109┊      return Group.findOne({</b>
<b>+┊   ┊110┊        where: { id },</b>
<b>+┊   ┊111┊        include: [{</b>
<b>+┊   ┊112┊          model: User,</b>
<b>+┊   ┊113┊          where: { id: user.id },</b>
<b>+┊   ┊114┊        }],</b>
<b>+┊   ┊115┊      }).then(group &#x3D;&gt; group.update({ name }));</b>
<b>+┊   ┊116┊    });</b>
<b>+┊   ┊117┊  },</b>
<b>+┊   ┊118┊};</b>
<b>+┊   ┊119┊</b>
<b>+┊   ┊120┊export const userLogic &#x3D; {</b>
<b>+┊   ┊121┊  email(user, args, ctx) {</b>
<b>+┊   ┊122┊    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>+┊   ┊123┊      if (currentUser.id &#x3D;&#x3D;&#x3D; user.id) {</b>
<b>+┊   ┊124┊        return currentUser.email;</b>
<b>+┊   ┊125┊      }</b>
<b>+┊   ┊126┊</b>
<b>+┊   ┊127┊      return Promise.reject(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊128┊    });</b>
<b>+┊   ┊129┊  },</b>
<b>+┊   ┊130┊  friends(user, args, ctx) {</b>
<b>+┊   ┊131┊    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>+┊   ┊132┊      if (currentUser.id !&#x3D;&#x3D; user.id) {</b>
<b>+┊   ┊133┊        return Promise.reject(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊134┊      }</b>
<b>+┊   ┊135┊</b>
<b>+┊   ┊136┊      return user.getFriends({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });</b>
<b>+┊   ┊137┊    });</b>
<b>+┊   ┊138┊  },</b>
<b>+┊   ┊139┊  groups(user, args, ctx) {</b>
<b>+┊   ┊140┊    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>+┊   ┊141┊      if (currentUser.id !&#x3D;&#x3D; user.id) {</b>
<b>+┊   ┊142┊        return Promise.reject(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊143┊      }</b>
<b>+┊   ┊144┊</b>
<b>+┊   ┊145┊      return user.getGroups();</b>
<b>+┊   ┊146┊    });</b>
<b>+┊   ┊147┊  },</b>
<b>+┊   ┊148┊  jwt(user) {</b>
<b>+┊   ┊149┊    return Promise.resolve(user.jwt);</b>
<b>+┊   ┊150┊  },</b>
<b>+┊   ┊151┊  messages(user, args, ctx) {</b>
<b>+┊   ┊152┊    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>+┊   ┊153┊      if (currentUser.id !&#x3D;&#x3D; user.id) {</b>
<b>+┊   ┊154┊        return Promise.reject(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊155┊      }</b>
<b>+┊   ┊156┊</b>
<b>+┊   ┊157┊      return Message.findAll({</b>
<b>+┊   ┊158┊        where: { userId: user.id },</b>
<b>+┊   ┊159┊        order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],</b>
<b>+┊   ┊160┊      });</b>
<b>+┊   ┊161┊    });</b>
<b>+┊   ┊162┊  },</b>
<b>+┊   ┊163┊  query(_, args, ctx) {</b>
<b>+┊   ┊164┊    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; {</b>
<b>+┊   ┊165┊      if (user.id &#x3D;&#x3D;&#x3D; args.id || user.email &#x3D;&#x3D;&#x3D; args.email) {</b>
<b>+┊   ┊166┊        return user;</b>
<b>+┊   ┊167┊      }</b>
<b>+┊   ┊168┊</b>
<b>+┊   ┊169┊      return Promise.reject(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊170┊    });</b>
<b>+┊   ┊171┊  },</b>
<b>+┊   ┊172┊};</b>
</pre>

[}]: #

And now let’s apply that logic to the Resolvers in `server/data/resolvers.js`:

[{]: <helper> (diffStep 7.9)

#### Step 7.9: Apply logic to all Resolvers

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
 ┊15┊15┊export const Resolvers &#x3D; {
 ┊16┊16┊  Date: GraphQLDate,
 ┊17┊17┊  Query: {
<b>+┊  ┊18┊    group(_, args, ctx) {</b>
<b>+┊  ┊19┊      return groupLogic.query(_, args, ctx);</b>
 ┊20┊20┊    },
<b>+┊  ┊21┊    user(_, args, ctx) {</b>
<b>+┊  ┊22┊      return userLogic.query(_, args, ctx);</b>
 ┊29┊23┊    },
 ┊30┊24┊  },
 ┊31┊25┊  Mutation: {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊37┊31┊          return message;
 ┊38┊32┊        });
 ┊39┊33┊    },
<b>+┊  ┊34┊    createGroup(_, args, ctx) {</b>
<b>+┊  ┊35┊      return groupLogic.createGroup(_, args, ctx).then((group) &#x3D;&gt; {</b>
<b>+┊  ┊36┊        pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });</b>
<b>+┊  ┊37┊        return group;</b>
<b>+┊  ┊38┊      });</b>
<b>+┊  ┊39┊    },</b>
<b>+┊  ┊40┊    deleteGroup(_, args, ctx) {</b>
<b>+┊  ┊41┊      return groupLogic.deleteGroup(_, args, ctx);</b>
<b>+┊  ┊42┊    },</b>
<b>+┊  ┊43┊    leaveGroup(_, args, ctx) {</b>
<b>+┊  ┊44┊      return groupLogic.leaveGroup(_, args, ctx);</b>
 ┊72┊45┊    },
<b>+┊  ┊46┊    updateGroup(_, args, ctx) {</b>
<b>+┊  ┊47┊      return groupLogic.updateGroup(_, args, ctx);</b>
 ┊76┊48┊    },
 ┊77┊49┊    login(_, { email, password }, ctx) {
 ┊78┊50┊      // find user by email
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊139┊111┊    },
 ┊140┊112┊  },
 ┊141┊113┊  Group: {
<b>+┊   ┊114┊    users(group, args, ctx) {</b>
<b>+┊   ┊115┊      return groupLogic.users(group, args, ctx);</b>
<b>+┊   ┊116┊    },</b>
<b>+┊   ┊117┊    messages(group, args, ctx) {</b>
<b>+┊   ┊118┊      return groupLogic.messages(group, args, ctx);</b>
 ┊152┊119┊    },
 ┊153┊120┊  },
 ┊154┊121┊  Message: {
<b>+┊   ┊122┊    to(message, args, ctx) {</b>
<b>+┊   ┊123┊      return messageLogic.to(message, args, ctx);</b>
 ┊157┊124┊    },
<b>+┊   ┊125┊    from(message, args, ctx) {</b>
<b>+┊   ┊126┊      return messageLogic.from(message, args, ctx);</b>
 ┊160┊127┊    },
 ┊161┊128┊  },
 ┊162┊129┊  User: {
<b>+┊   ┊130┊    email(user, args, ctx) {</b>
<b>+┊   ┊131┊      return userLogic.email(user, args, ctx);</b>
<b>+┊   ┊132┊    },</b>
<b>+┊   ┊133┊    friends(user, args, ctx) {</b>
<b>+┊   ┊134┊      return userLogic.friends(user, args, ctx);</b>
<b>+┊   ┊135┊    },</b>
<b>+┊   ┊136┊    groups(user, args, ctx) {</b>
<b>+┊   ┊137┊      return userLogic.groups(user, args, ctx);</b>
 ┊168┊138┊    },
<b>+┊   ┊139┊    jwt(user, args, ctx) {</b>
<b>+┊   ┊140┊      return userLogic.jwt(user, args, ctx);</b>
 ┊171┊141┊    },
<b>+┊   ┊142┊    messages(user, args, ctx) {</b>
<b>+┊   ┊143┊      return userLogic.messages(user, args, ctx);</b>
 ┊174┊144┊    },
 ┊175┊145┊  },
 ┊176┊146┊};
</pre>

[}]: #

So much cleaner and **WAY** more secure!

## The Expired Password Problem
We still have one last thing that needs modifying in our authorization setup. When a user changes their password, we issue a new JWT, but the old JWT will still pass verification! This can become a serious problem if a hacker gets ahold of a user’s password. To close the loop on this issue, we can make a clever little adjustment to our `UserModel` database model to include a `version` parameter, which will be a counter that increments with each new password for the user. We’ll incorporate `version` into our JWT so only the newest JWT will pass our security. Let’s update `graphqlExpress` and our Connectors and Resolvers accordingly:

[{]: <helper> (diffStep "7.10")

#### Step 7.10: Apply versioning to JWT auth

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
 ┊57┊57┊              const token &#x3D; jwt.sign({
 ┊58┊58┊                id: user.id,
 ┊59┊59┊                email: user.email,
<b>+┊  ┊60┊                version: user.version,</b>
 ┊60┊61┊              }, JWT_SECRET);
 ┊61┊62┊              user.jwt &#x3D; token;
 ┊62┊63┊              ctx.user &#x3D; Promise.resolve(user);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊79┊80┊            email,
 ┊80┊81┊            password: hash,
 ┊81┊82┊            username: username || email,
<b>+┊  ┊83┊            version: 1,</b>
 ┊82┊84┊          })).then((user) &#x3D;&gt; {
 ┊83┊85┊            const { id } &#x3D; user;
<b>+┊  ┊86┊            const token &#x3D; jwt.sign({ id, email, version: 1 }, JWT_SECRET);</b>
 ┊85┊87┊            user.jwt &#x3D; token;
 ┊86┊88┊            ctx.user &#x3D; Promise.resolve(user);
 ┊87┊89┊            return user;
</pre>

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊24┊24┊  schema: executableSchema,
 ┊25┊25┊  context: {
 ┊26┊26┊    user: req.user ?
<b>+┊  ┊27┊      User.findOne({ where: { id: req.user.id, version: req.user.version } }) :</b>
<b>+┊  ┊28┊      Promise.resolve(null),</b>
 ┊28┊29┊  },
 ┊29┊30┊})));
</pre>

[}]: #

# Testing
It can’t be understated just how vital testing is to securing our code. Yet, like with most tutorials, testing is noticeably absent from this one. We’re not going to cover proper testing here because it really belongs in its own post and would make this already egregiously long post even longer.

For now, we’ll just use GraphIQL to make sure our code is performing as expected. We’re also going to need a way to modify HTTP headers  —  I recommend the [ModHeader Chrome Extension](https://chrome.google.com/webstore/detail/modheader/idgpnmonknjnojddfkpgkljpfnnfcklj).

Here are the steps to test our protected GraphQL endpoint in GraphIQL:

1. Use the `signup` or `login` mutation to receive a JWT ![Login Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step7-10.png)
2. Apply the JWT to the Authorization Header for future requests ![Header Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step7-10-2.png)
3. Make whatever authorized `query` or `mutation` requests we want
![Query Image Success](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step7-10-3.png)
![Query Image Fail](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step7-10-4.png)
![Query Image Partial](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step7-10-5.png)

# JWT Authentication for Subscriptions
Our Queries and Mutations are secure, but our Subscriptions are wide open. Right now, any user could subscribe to new messages for all groups, or track when any group is created. The security we’ve already implemented limits the `Message` and `Group` fields a hacker could view, but that’s not good enough! Secure all the things!

In this workflow, we will only allow WebSocket connections once the user is authenticated. Whenever the user is logged off, we terminate the connection, and then reinitiate a new connection the next time they log in. This workflow is suitable for applications that don't require subscriptions while the user isn't logged in and makes it easier to defend against DOS attacks.

Just like with Queries and Mutations, we can pass a `context` parameter to our Subscriptions every time a user connects over WebSockets! When constructing `SubscriptionServer`, we can pass an `onConnect` parameter, which is a function that runs before every connection. The `onConnect` function offers 2 parameters —  `connectionParams` and `webSocket` —  and should return a Promise that resolves the context. 

`connectionParams` is where we will receive the JWT from the client. Inside `onConnect`, we will extract the `User` Promise from the JWT and replace return the `User` Promise as the context. 

We can then pass the context through subscription logic before each subscription using the `onOperation` parameter of `SubscriptionServer`. `onOperation` offers 3 parameters  —  `parsedMessage`, `baseParams`, and `connection`  —  and should return a Promise that resolves `baseParams`. `baseParams.context` is where we receive the context, and it is where the `User` Promise needs to be when it is consumed by the Resolvers.

Let’s first update the `SubscriptionServer` in `server/index.js` to use the JWT:

[{]: <helper> (diffStep 7.11)

#### Step 7.11: Add onConnect and onOperation to SubscriptionServer

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 5┊ 5┊import { SubscriptionServer } from &#x27;subscriptions-transport-ws&#x27;;
 ┊ 6┊ 6┊import { execute, subscribe } from &#x27;graphql&#x27;;
 ┊ 7┊ 7┊import jwt from &#x27;express-jwt&#x27;;
<b>+┊  ┊ 8┊import jsonwebtoken from &#x27;jsonwebtoken&#x27;;</b>
 ┊ 8┊ 9┊
 ┊ 9┊10┊import { JWT_SECRET } from &#x27;./config&#x27;;
 ┊10┊11┊import { User } from &#x27;./data/connectors&#x27;;
<b>+┊  ┊12┊import { getSubscriptionDetails } from &#x27;./subscriptions&#x27;; // make sure this imports before executableSchema!</b>
 ┊11┊13┊import { executableSchema } from &#x27;./data/schema&#x27;;
<b>+┊  ┊14┊import { subscriptionLogic } from &#x27;./data/logic&#x27;;</b>
 ┊12┊15┊
 ┊13┊16┊const GRAPHQL_PORT &#x3D; 8080;
 ┊14┊17┊const GRAPHQL_PATH &#x3D; &#x27;/graphql&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊46┊49┊  schema: executableSchema,
 ┊47┊50┊  execute,
 ┊48┊51┊  subscribe,
<b>+┊  ┊52┊  onConnect(connectionParams, webSocket) {</b>
<b>+┊  ┊53┊    const userPromise &#x3D; new Promise((res, rej) &#x3D;&gt; {</b>
<b>+┊  ┊54┊      if (connectionParams.jwt) {</b>
<b>+┊  ┊55┊        jsonwebtoken.verify(connectionParams.jwt, JWT_SECRET,</b>
<b>+┊  ┊56┊        (err, decoded) &#x3D;&gt; {</b>
<b>+┊  ┊57┊          if (err) {</b>
<b>+┊  ┊58┊            rej(&#x27;Invalid Token&#x27;);</b>
<b>+┊  ┊59┊          }</b>
<b>+┊  ┊60┊</b>
<b>+┊  ┊61┊          res(User.findOne({ where: { id: decoded.id, version: decoded.version } }));</b>
<b>+┊  ┊62┊        });</b>
<b>+┊  ┊63┊      } else {</b>
<b>+┊  ┊64┊        rej(&#x27;No Token&#x27;);</b>
<b>+┊  ┊65┊      }</b>
<b>+┊  ┊66┊    });</b>
<b>+┊  ┊67┊</b>
<b>+┊  ┊68┊    return userPromise.then((user) &#x3D;&gt; {</b>
<b>+┊  ┊69┊      if (user) {</b>
<b>+┊  ┊70┊        return { user: Promise.resolve(user) };</b>
<b>+┊  ┊71┊      }</b>
<b>+┊  ┊72┊</b>
<b>+┊  ┊73┊      return Promise.reject(&#x27;No User&#x27;);</b>
<b>+┊  ┊74┊    });</b>
<b>+┊  ┊75┊  },</b>
<b>+┊  ┊76┊  onOperation(parsedMessage, baseParams) {</b>
<b>+┊  ┊77┊    // we need to implement this!!!</b>
<b>+┊  ┊78┊    const { subscriptionName, args } &#x3D; getSubscriptionDetails({</b>
<b>+┊  ┊79┊      baseParams,</b>
<b>+┊  ┊80┊      schema: executableSchema,</b>
<b>+┊  ┊81┊    });</b>
<b>+┊  ┊82┊</b>
<b>+┊  ┊83┊    // we need to implement this too!!!</b>
<b>+┊  ┊84┊    return subscriptionLogic[subscriptionName](baseParams, args, baseParams.context);</b>
<b>+┊  ┊85┊  },</b>
 ┊49┊86┊}, {
 ┊50┊87┊  server: graphQLServer,
 ┊51┊88┊  path: SUBSCRIPTIONS_PATH,
</pre>

[}]: #

First, `onConnect` will use `jsonwebtoken` to verify and decode `connectionParams.jwt` to extract a `User` from the database. It will do this work within a new Promise called `user`.

Second, `onOperation` is going to call a function `getSubscriptionDetails` to extract the subscription name (`subscriptionName`) and arguments (`args`) from `baseParams` using our Schema.

Finally, `onOperation` will pass the `baseParams`, `args`, and `user` to our subscription logic (e.g. `subscriptionLogic.messageAdded`) to verify whether the `User` is authorized to initiate this subscription. `subscriptionLogic.messageAdded` will return a Promise that either resolves `baseParams` or rejects if the subscription is unauthorized.

We still need to write the code for `getSubscriptionDetails` and `subscriptionLogic`.
Let’s start by adding `getSubscriptionDetails` to `server/subscriptions.js`. You don’t really need to understand this code, and hopefully in a future release of `subscriptions-transport-ws`, we’ll bake this in:

[{]: <helper> (diffStep 7.12)

#### Step 7.12: Create getSubscriptionDetails

##### Changed server&#x2F;subscriptions.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import { PubSub } from &#x27;graphql-subscriptions&#x27;;
<b>+┊  ┊ 2┊import { parse } from &#x27;graphql&#x27;;</b>
<b>+┊  ┊ 3┊import { getArgumentValues } from &#x27;graphql/execution/values&#x27;;</b>
<b>+┊  ┊ 4┊</b>
<b>+┊  ┊ 5┊export function getSubscriptionDetails({ baseParams, schema }) {</b>
<b>+┊  ┊ 6┊  const parsedQuery &#x3D; parse(baseParams.query);</b>
<b>+┊  ┊ 7┊  let args &#x3D; {};</b>
<b>+┊  ┊ 8┊  // operationName is the name of the only root field in the</b>
<b>+┊  ┊ 9┊  // subscription document</b>
<b>+┊  ┊10┊  let subscriptionName &#x3D; &#x27;&#x27;;</b>
<b>+┊  ┊11┊  parsedQuery.definitions.forEach((definition) &#x3D;&gt; {</b>
<b>+┊  ┊12┊    if (definition.kind &#x3D;&#x3D;&#x3D; &#x27;OperationDefinition&#x27;) {</b>
<b>+┊  ┊13┊      // only one root field is allowed on subscription.</b>
<b>+┊  ┊14┊      // No fragments for now.</b>
<b>+┊  ┊15┊      const rootField &#x3D; (definition).selectionSet.selections[0];</b>
<b>+┊  ┊16┊      subscriptionName &#x3D; rootField.name.value;</b>
<b>+┊  ┊17┊      const fields &#x3D; schema.getSubscriptionType().getFields();</b>
<b>+┊  ┊18┊      args &#x3D; getArgumentValues(</b>
<b>+┊  ┊19┊        fields[subscriptionName],</b>
<b>+┊  ┊20┊        rootField,</b>
<b>+┊  ┊21┊        baseParams.variables,</b>
<b>+┊  ┊22┊      );</b>
<b>+┊  ┊23┊    }</b>
<b>+┊  ┊24┊  });</b>
<b>+┊  ┊25┊</b>
<b>+┊  ┊26┊  return { args, subscriptionName };</b>
<b>+┊  ┊27┊}</b>
 ┊ 2┊28┊
 ┊ 3┊29┊export const pubsub &#x3D; new PubSub();
</pre>

[}]: #

Now let’s add `subscriptionLogic` to `server/data/logic.js`:

[{]: <helper> (diffStep 7.13)

#### Step 7.13: Create subscriptionLogic

##### Changed server&#x2F;data&#x2F;logic.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊170┊170┊    });
 ┊171┊171┊  },
 ┊172┊172┊};
<b>+┊   ┊173┊</b>
<b>+┊   ┊174┊export const subscriptionLogic &#x3D; {</b>
<b>+┊   ┊175┊  groupAdded(baseParams, args, ctx) {</b>
<b>+┊   ┊176┊    return getAuthenticatedUser(ctx)</b>
<b>+┊   ┊177┊      .then((user) &#x3D;&gt; {</b>
<b>+┊   ┊178┊        if (user.id !&#x3D;&#x3D; args.userId) {</b>
<b>+┊   ┊179┊          return Promise.reject(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊180┊        }</b>
<b>+┊   ┊181┊</b>
<b>+┊   ┊182┊        baseParams.context &#x3D; ctx;</b>
<b>+┊   ┊183┊        return baseParams;</b>
<b>+┊   ┊184┊      });</b>
<b>+┊   ┊185┊  },</b>
<b>+┊   ┊186┊  messageAdded(baseParams, args, ctx) {</b>
<b>+┊   ┊187┊    return getAuthenticatedUser(ctx)</b>
<b>+┊   ┊188┊      .then(user &#x3D;&gt; user.getGroups({ where: { id: { $in: args.groupIds } }, attributes: [&#x27;id&#x27;] })</b>
<b>+┊   ┊189┊      .then((groups) &#x3D;&gt; {</b>
<b>+┊   ┊190┊        // user attempted to subscribe to some groups without access</b>
<b>+┊   ┊191┊        if (args.groupIds.length &gt; groups.length) {</b>
<b>+┊   ┊192┊          return Promise.reject(&#x27;Unauthorized&#x27;);</b>
<b>+┊   ┊193┊        }</b>
<b>+┊   ┊194┊</b>
<b>+┊   ┊195┊        baseParams.context &#x3D; ctx;</b>
<b>+┊   ┊196┊        return baseParams;</b>
<b>+┊   ┊197┊      }));</b>
<b>+┊   ┊198┊  },</b>
<b>+┊   ┊199┊};</b>
</pre>

[}]: #

Unfortunately, given how new this feature is, there’s no easy way to currently test it with GraphIQL, so let’s just hope the code does what it’s supposed to do and move on for now ¯\_(ツ)_/¯

## Now would be a good time to take a break!

# GraphQL Authentication in React Native
Our server is now only serving authenticated GraphQL, and our React Native client needs to catch up!

## Designing the Layout
First, let’s design the basic authentication UI/UX for our users.

If a user isn’t authenticated, we want to push a modal Screen asking them to login or sign up and then pop the Screen when they sign in.

Let’s start by creating a Signin screen (`client/src/screens/signin.screen.js`) to display our `login`/`signup` modal:

[{]: <helper> (diffStep 7.14)

#### Step 7.14: Create Signup Screen

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

#### Step 7.15: Add Signin to navigation and skip queries

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊12┊12┊import FinalizeGroup from &#x27;./screens/finalize-group.screen&#x27;;
 ┊13┊13┊import GroupDetails from &#x27;./screens/group-details.screen&#x27;;
 ┊14┊14┊import NewGroup from &#x27;./screens/new-group.screen&#x27;;
<b>+┊  ┊15┊import Signin from &#x27;./screens/signin.screen&#x27;;</b>
 ┊15┊16┊
 ┊16┊17┊import { USER_QUERY } from &#x27;./graphql/user.query&#x27;;
 ┊17┊18┊import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊57┊58┊
 ┊58┊59┊const AppNavigator &#x3D; StackNavigator({
 ┊59┊60┊  Main: { screen: MainScreenNavigator },
<b>+┊  ┊61┊  Signin: { screen: Signin },</b>
 ┊60┊62┊  Messages: { screen: Messages },
 ┊61┊63┊  GroupDetails: { screen: GroupDetails },
 ┊62┊64┊  NewGroup: { screen: NewGroup },
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊143┊145┊});
 ┊144┊146┊
 ┊145┊147┊const userQuery &#x3D; graphql(USER_QUERY, {
<b>+┊   ┊148┊  skip: ownProps &#x3D;&gt; true, // fake it -- we&#x27;ll use ownProps with auth</b>
 ┊146┊149┊  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
 ┊147┊150┊  props: ({ data: { loading, user, subscribeToMore } }) &#x3D;&gt; ({
 ┊148┊151┊    loading,
</pre>

[}]: #

Lastly, we need to modify the `Groups` screen to push the `Signin` modal and skip querying for anything:

[{]: <helper> (diffStep 7.15 files="client/src/screens/groups.screen.js")

#### Step 7.15: Add Signin to navigation and skip queries

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
 ┊164┊167┊    this.onRefresh &#x3D; this.onRefresh.bind(this);
 ┊165┊168┊  }
 ┊166┊169┊
<b>+┊   ┊170┊  componentDidMount() {</b>
<b>+┊   ┊171┊    if (!IS_SIGNED_IN) {</b>
<b>+┊   ┊172┊      IS_SIGNED_IN &#x3D; true;</b>
<b>+┊   ┊173┊</b>
<b>+┊   ┊174┊      const { navigate } &#x3D; this.props.navigation;</b>
<b>+┊   ┊175┊</b>
<b>+┊   ┊176┊      navigate(&#x27;Signin&#x27;);</b>
<b>+┊   ┊177┊    }</b>
<b>+┊   ┊178┊  }</b>
<b>+┊   ┊179┊</b>
 ┊167┊180┊  onRefresh() {
 ┊168┊181┊    this.props.refetch();
<b>+┊   ┊182┊    // faking unauthorized status</b>
 ┊169┊183┊  }
 ┊170┊184┊
 ┊171┊185┊  keyExtractor &#x3D; item &#x3D;&gt; item.id;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊238┊252┊};
 ┊239┊253┊
 ┊240┊254┊const userQuery &#x3D; graphql(USER_QUERY, {
<b>+┊   ┊255┊  skip: ownProps &#x3D;&gt; true, // fake it -- we&#x27;ll use ownProps with auth</b>
 ┊241┊256┊  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
 ┊242┊257┊  props: ({ data: { loading, networkStatus, refetch, user } }) &#x3D;&gt; ({
 ┊243┊258┊    loading, networkStatus, refetch, user,
</pre>

[}]: #

Let’s test out our layout: ![Fake Signin Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step7-15.gif)

# Single Sign-On (SSO) with React Native and Redux
Time to add authentication infrastructure to our React Native client! When a user signs up or logs in, the server is going to return a JWT. Whenever the client makes a GraphQL HTTP request to the server, it needs to pass the JWT in the Authorization Header to verify the request is being sent by the user.

Once we have a JWT, we can use it forever or until we set it to expire. Therefore, we want to store the JWT in our app’s storage so users don’t have to log in every time they restart the app — that’s SSO! We’re also going to want quick access to the JWT for any GraphQL request while the user is active. We can use a combination of [`redux`](http://redux.js.org/), [`redux-persist`](https://github.com/rt2zz/redux-persist), and [`AsyncStorage`](https://facebook.github.io/react-native/docs/asyncstorage.html) to efficiently meet all our demands!
```
# make sure you add this package to the client!!!
cd client
yarn add redux redux-persist redux-thunk seamless-immutable
```
[`redux`](http://redux.js.org/) is the **BOMB**. If you don’t know Redux, [**learn Redux!**](https://egghead.io/courses/getting-started-with-redux)

[`redux-persist`](https://github.com/rt2zz/redux-persist) is an incredible package which let’s us store Redux state in a bunch of different storage engines and rehydrate our Redux store when we restart our app.

[`redux-thunk`](https://github.com/gaearon/redux-thunk) will let us return functions and use Promises to dispatch Redux actions.

[`seamless-immutable`](https://github.com/rtfeldman/seamless-immutable) will help us use Immutable JS data structures within Redux that are backwards-compatible with normal Arrays and Objects.

First, let’s create a reducer for our auth data. We’ll create a new folder `client/src/reducers` for our reducer files to live and create a new file `client/src/reducers/auth.reducer.js` for the auth reducer:

[{]: <helper> (diffStep 7.16 files="client/src/reducers/auth.reducer.js")

#### Step 7.16: Create auth reducer

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

#### Step 7.17: Combine auth reducer with reducers

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 7┊ 7┊import { SubscriptionClient, addGraphQLSubscriptions } from &#x27;subscriptions-transport-ws&#x27;;
 ┊ 8┊ 8┊
 ┊ 9┊ 9┊import AppWithNavigationState, { navigationReducer } from &#x27;./navigation&#x27;;
<b>+┊  ┊10┊import auth from &#x27;./reducers/auth.reducer&#x27;;</b>
 ┊10┊11┊
 ┊11┊12┊const networkInterface &#x3D; createNetworkInterface({ uri: &#x27;http://localhost:8080/graphql&#x27; });
 ┊12┊13┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊32┊33┊  combineReducers({
 ┊33┊34┊    apollo: client.reducer(),
 ┊34┊35┊    nav: navigationReducer,
<b>+┊  ┊36┊    auth,</b>
 ┊35┊37┊  }),
 ┊36┊38┊  {}, // initial state
 ┊37┊39┊  composeWithDevTools(
</pre>

[}]: #

Now let’s add `thunk` middleware and persistence with `redux-persist` and `AsyncStorage` to our store in `client/src/app.js`:

[{]: <helper> (diffStep 7.18)

#### Step 7.18: Add persistent storage

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import React, { Component } from &#x27;react&#x27;;
<b>+┊  ┊ 2┊import {</b>
<b>+┊  ┊ 3┊  AsyncStorage,</b>
<b>+┊  ┊ 4┊} from &#x27;react-native&#x27;;</b>
 ┊ 2┊ 5┊
 ┊ 3┊ 6┊import { ApolloProvider } from &#x27;react-apollo&#x27;;
 ┊ 4┊ 7┊import { createStore, combineReducers, applyMiddleware } from &#x27;redux&#x27;;
 ┊ 5┊ 8┊import { composeWithDevTools } from &#x27;redux-devtools-extension&#x27;;
 ┊ 6┊ 9┊import ApolloClient, { createNetworkInterface } from &#x27;apollo-client&#x27;;
 ┊ 7┊10┊import { SubscriptionClient, addGraphQLSubscriptions } from &#x27;subscriptions-transport-ws&#x27;;
<b>+┊  ┊11┊import { persistStore, autoRehydrate } from &#x27;redux-persist&#x27;;</b>
<b>+┊  ┊12┊import thunk from &#x27;redux-thunk&#x27;;</b>
 ┊ 8┊13┊
 ┊ 9┊14┊import AppWithNavigationState, { navigationReducer } from &#x27;./navigation&#x27;;
 ┊10┊15┊import auth from &#x27;./reducers/auth.reducer&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊37┊42┊  }),
 ┊38┊43┊  {}, // initial state
 ┊39┊44┊  composeWithDevTools(
<b>+┊  ┊45┊    applyMiddleware(client.middleware(), thunk),</b>
<b>+┊  ┊46┊    autoRehydrate(),</b>
 ┊41┊47┊  ),
 ┊42┊48┊);
 ┊43┊49┊
<b>+┊  ┊50┊// persistent storage</b>
<b>+┊  ┊51┊persistStore(store, {</b>
<b>+┊  ┊52┊  storage: AsyncStorage,</b>
<b>+┊  ┊53┊  blacklist: [&#x27;apollo&#x27;, &#x27;nav&#x27;], // don&#x27;t persist apollo or nav for now</b>
<b>+┊  ┊54┊});</b>
<b>+┊  ┊55┊</b>
 ┊44┊56┊export default class App extends Component {
 ┊45┊57┊  render() {
 ┊46┊58┊    return (
</pre>

[}]: #

We have set our store data (excluding `apollo`) to persist via React Native’s `AsyncStorage` and to automatically rehydrate the store when the client restarts the app. When the app restarts, a `REHYDRATE` action will execute asyncronously with all the data persisted from the last session. We need to handle that action and properly update our store in our `auth` reducer:

[{]: <helper> (diffStep 7.19)

#### Step 7.19: Handle rehydration in auth reducer

##### Changed client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊import { REHYDRATE } from &#x27;redux-persist/constants&#x27;;</b>
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

#### Step 7.20: Create constants

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

#### Step 7.21: Handle login/logout in auth reducer

##### Changed client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import { REHYDRATE } from &#x27;redux-persist/constants&#x27;;
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
 ┊11┊13┊      // convert persisted data to Immutable and confirm rehydration
 ┊12┊14┊      return Immutable(action.payload.auth || state)
 ┊13┊15┊        .set(&#x27;loading&#x27;, false);
<b>+┊  ┊16┊    case SET_CURRENT_USER:</b>
<b>+┊  ┊17┊      return state.merge(action.user);</b>
<b>+┊  ┊18┊    case LOGOUT:</b>
<b>+┊  ┊19┊      return Immutable({ loading: false });</b>
 ┊14┊20┊    default:
 ┊15┊21┊      return state;
 ┊16┊22┊  }
</pre>

[}]: #

The `SET_CURRENT_USER` and `LOGOUT` action types will need to get triggered by `ActionCreators`. Let’s put those in a new folder `client/src/actions` and a new file `client/src/actions/auth.actions.js`:

[{]: <helper> (diffStep 7.22)

#### Step 7.22: Create auth actions

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

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊30┊30┊  wsClient,
 ┊31┊31┊);
 ┊32┊32┊
<b>+┊  ┊33┊export const client &#x3D; new ApolloClient({</b>
 ┊34┊34┊  networkInterface: networkInterfaceWithSubscriptions,
 ┊35┊35┊});
</pre>

[}]: #

When `logout` is called, we’ll clear all auth data by dispatching `LOGOUT` and also all data in the apollo store by calling [`client.resetStore`](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient.resetStore).

Let’s tie everything together. We’ll update the `Signin` screen to use our login and signup mutations, and dispatch `setCurrentUser` with the mutation results (the JWT and user’s id).

First we’ll create files for our `login` and `signup` mutations:

[{]: <helper> (diffStep 7.23)

#### Step 7.23: Create login and signup mutations

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

#### Step 7.24: Add login and signup mutations to Signin screen

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
 ┊ 68┊ 81┊    this.switchView &#x3D; this.switchView.bind(this);
 ┊ 69┊ 82┊  }
 ┊ 70┊ 83┊
<b>+┊   ┊ 84┊  componentWillReceiveProps(nextProps) {</b>
<b>+┊   ┊ 85┊    if (nextProps.auth.jwt) {</b>
<b>+┊   ┊ 86┊      nextProps.navigation.goBack();</b>
<b>+┊   ┊ 87┊    }</b>
<b>+┊   ┊ 88┊  }</b>
<b>+┊   ┊ 89┊</b>
 ┊ 72┊ 90┊  login() {
<b>+┊   ┊ 91┊    const { email, password } &#x3D; this.state;</b>
<b>+┊   ┊ 92┊</b>
<b>+┊   ┊ 93┊    this.setState({</b>
<b>+┊   ┊ 94┊      loading: true,</b>
<b>+┊   ┊ 95┊    });</b>
<b>+┊   ┊ 96┊</b>
<b>+┊   ┊ 97┊    this.props.login({ email, password })</b>
<b>+┊   ┊ 98┊      .then(({ data: { login: user } }) &#x3D;&gt; {</b>
<b>+┊   ┊ 99┊        this.props.dispatch(setCurrentUser(user));</b>
<b>+┊   ┊100┊        this.setState({</b>
<b>+┊   ┊101┊          loading: false,</b>
<b>+┊   ┊102┊        });</b>
<b>+┊   ┊103┊      }).catch((error) &#x3D;&gt; {</b>
<b>+┊   ┊104┊        this.setState({</b>
<b>+┊   ┊105┊          loading: false,</b>
<b>+┊   ┊106┊        });</b>
<b>+┊   ┊107┊        Alert.alert(</b>
<b>+┊   ┊108┊          &#x60;${capitalizeFirstLetter(this.state.view)} error&#x60;,</b>
<b>+┊   ┊109┊          error.message,</b>
<b>+┊   ┊110┊          [</b>
<b>+┊   ┊111┊            { text: &#x27;OK&#x27;, onPress: () &#x3D;&gt; console.log(&#x27;OK pressed&#x27;) }, // eslint-disable-line no-console</b>
<b>+┊   ┊112┊            { text: &#x27;Forgot password&#x27;, onPress: () &#x3D;&gt; console.log(&#x27;Forgot Pressed&#x27;), style: &#x27;cancel&#x27; }, // eslint-disable-line no-console</b>
<b>+┊   ┊113┊          ],</b>
<b>+┊   ┊114┊        );</b>
<b>+┊   ┊115┊      });</b>
 ┊ 79┊116┊  }
 ┊ 80┊117┊
 ┊ 82┊118┊  signup() {
<b>+┊   ┊119┊    this.setState({</b>
<b>+┊   ┊120┊      loading: true,</b>
<b>+┊   ┊121┊    });</b>
<b>+┊   ┊122┊    const { email, password } &#x3D; this.state;</b>
<b>+┊   ┊123┊    this.props.signup({ email, password })</b>
<b>+┊   ┊124┊      .then(({ data: { signup: user } }) &#x3D;&gt; {</b>
<b>+┊   ┊125┊        this.props.dispatch(setCurrentUser(user));</b>
<b>+┊   ┊126┊        this.setState({</b>
<b>+┊   ┊127┊          loading: false,</b>
<b>+┊   ┊128┊        });</b>
<b>+┊   ┊129┊      }).catch((error) &#x3D;&gt; {</b>
<b>+┊   ┊130┊        this.setState({</b>
<b>+┊   ┊131┊          loading: false,</b>
<b>+┊   ┊132┊        });</b>
<b>+┊   ┊133┊        Alert.alert(</b>
<b>+┊   ┊134┊          &#x60;${capitalizeFirstLetter(this.state.view)} error&#x60;,</b>
<b>+┊   ┊135┊          error.message,</b>
<b>+┊   ┊136┊          [{ text: &#x27;OK&#x27;, onPress: () &#x3D;&gt; console.log(&#x27;OK pressed&#x27;) }],  // eslint-disable-line no-console</b>
<b>+┊   ┊137┊        );</b>
<b>+┊   ┊138┊      });</b>
 ┊ 88┊139┊  }
 ┊ 89┊140┊
 ┊ 90┊141┊  switchView() {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊122┊173┊          onPress&#x3D;{this[view]}
 ┊123┊174┊          style&#x3D;{styles.submit}
 ┊124┊175┊          title&#x3D;{view &#x3D;&#x3D;&#x3D; &#x27;signup&#x27; ? &#x27;Sign up&#x27; : &#x27;Login&#x27;}
<b>+┊   ┊176┊          disabled&#x3D;{this.state.loading || !!this.props.auth.jwt}</b>
 ┊126┊177┊        /&gt;
 ┊127┊178┊        &lt;View style&#x3D;{styles.switchContainer}&gt;
 ┊128┊179┊          &lt;Text&gt;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊145┊196┊  navigation: PropTypes.shape({
 ┊146┊197┊    goBack: PropTypes.func,
 ┊147┊198┊  }),
<b>+┊   ┊199┊  auth: PropTypes.shape({</b>
<b>+┊   ┊200┊    loading: PropTypes.bool,</b>
<b>+┊   ┊201┊    jwt: PropTypes.string,</b>
<b>+┊   ┊202┊  }),</b>
<b>+┊   ┊203┊  dispatch: PropTypes.func.isRequired,</b>
<b>+┊   ┊204┊  login: PropTypes.func.isRequired,</b>
<b>+┊   ┊205┊  signup: PropTypes.func.isRequired,</b>
 ┊148┊206┊};
 ┊149┊207┊
<b>+┊   ┊208┊const login &#x3D; graphql(LOGIN_MUTATION, {</b>
<b>+┊   ┊209┊  props: ({ mutate }) &#x3D;&gt; ({</b>
<b>+┊   ┊210┊    login: ({ email, password }) &#x3D;&gt;</b>
<b>+┊   ┊211┊      mutate({</b>
<b>+┊   ┊212┊        variables: { email, password },</b>
<b>+┊   ┊213┊      }),</b>
<b>+┊   ┊214┊  }),</b>
<b>+┊   ┊215┊});</b>
<b>+┊   ┊216┊</b>
<b>+┊   ┊217┊const signup &#x3D; graphql(SIGNUP_MUTATION, {</b>
<b>+┊   ┊218┊  props: ({ mutate }) &#x3D;&gt; ({</b>
<b>+┊   ┊219┊    signup: ({ email, password }) &#x3D;&gt;</b>
<b>+┊   ┊220┊      mutate({</b>
<b>+┊   ┊221┊        variables: { email, password },</b>
<b>+┊   ┊222┊      }),</b>
<b>+┊   ┊223┊  }),</b>
<b>+┊   ┊224┊});</b>
<b>+┊   ┊225┊</b>
<b>+┊   ┊226┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊227┊  auth,</b>
<b>+┊   ┊228┊});</b>
<b>+┊   ┊229┊</b>
<b>+┊   ┊230┊export default compose(</b>
<b>+┊   ┊231┊  login,</b>
<b>+┊   ┊232┊  signup,</b>
<b>+┊   ┊233┊  connect(mapStateToProps),</b>
<b>+┊   ┊234┊)(Signin);</b>
</pre>

[}]: #

We attached `auth` from our Redux store to `Signin` via `connect(mapStateToProps)`. When we sign up or log in, we call the associated mutation (`signup` or `login`), receive the JWT and id, and dispatch the data with `setCurrentUser`. In `componentWillReceiveProps`, once `auth.jwt` exists, we are logged in and pop the Screen. We’ve also included some simple error messages if things go wrong.

Let’s check it out! ![Signin Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step7-24.gif)

# Apollo-Client Authentication Middleware
We need to add Authorization Headers to our GraphQL requests from React Native before we can resume retrieving data from our auth protected server. We accomplish this by using middleware on `networkInterface` that will attach the headers to every request before they are sent out. This middleware option is elegantly built into `networkInterface` and works really nicely with our Redux setup. We can simply add the following in `client/src/app.js`:

[{]: <helper> (diffStep 7.25)

#### Step 7.25: Add authentication middleware for requests

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊16┊16┊
 ┊17┊17┊const networkInterface &#x3D; createNetworkInterface({ uri: &#x27;http://localhost:8080/graphql&#x27; });
 ┊18┊18┊
<b>+┊  ┊19┊// middleware for requests</b>
<b>+┊  ┊20┊networkInterface.use([{</b>
<b>+┊  ┊21┊  applyMiddleware(req, next) {</b>
<b>+┊  ┊22┊    if (!req.options.headers) {</b>
<b>+┊  ┊23┊      req.options.headers &#x3D; {};</b>
<b>+┊  ┊24┊    }</b>
<b>+┊  ┊25┊    // get the authentication token from local storage if it exists</b>
<b>+┊  ┊26┊    const jwt &#x3D; store.getState().auth.jwt;</b>
<b>+┊  ┊27┊    if (jwt) {</b>
<b>+┊  ┊28┊      req.options.headers.authorization &#x3D; &#x60;Bearer ${jwt}&#x60;;</b>
<b>+┊  ┊29┊    }</b>
<b>+┊  ┊30┊    next();</b>
<b>+┊  ┊31┊  },</b>
<b>+┊  ┊32┊}]);</b>
<b>+┊  ┊33┊</b>
 ┊19┊34┊// Create WebSocket client
 ┊20┊35┊const wsClient &#x3D; new SubscriptionClient(&#x27;ws://localhost:8080/subscriptions&#x27;, {
 ┊21┊36┊  reconnect: true,
</pre>

[}]: #

Before every request, we get the JWT from `auth` and stick it in the header. We can also run middleware *after* receiving responses to check for auth errors and log out the user if necessary:

[{]: <helper> (diffStep 7.26)

#### Step 7.26: Add afterware for responses

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊10┊10┊import { SubscriptionClient, addGraphQLSubscriptions } from &#x27;subscriptions-transport-ws&#x27;;
 ┊11┊11┊import { persistStore, autoRehydrate } from &#x27;redux-persist&#x27;;
 ┊12┊12┊import thunk from &#x27;redux-thunk&#x27;;
<b>+┊  ┊13┊import _ from &#x27;lodash&#x27;;</b>
 ┊13┊14┊
 ┊14┊15┊import AppWithNavigationState, { navigationReducer } from &#x27;./navigation&#x27;;
 ┊15┊16┊import auth from &#x27;./reducers/auth.reducer&#x27;;
<b>+┊  ┊17┊import { logout } from &#x27;./actions/auth.actions&#x27;;</b>
 ┊16┊18┊
 ┊17┊19┊const networkInterface &#x3D; createNetworkInterface({ uri: &#x27;http://localhost:8080/graphql&#x27; });
 ┊18┊20┊
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊31┊33┊  },
 ┊32┊34┊}]);
 ┊33┊35┊
<b>+┊  ┊36┊// afterware for responses</b>
<b>+┊  ┊37┊networkInterface.useAfter([{</b>
<b>+┊  ┊38┊  applyAfterware({ response }, next) {</b>
<b>+┊  ┊39┊    if (!response.ok) {</b>
<b>+┊  ┊40┊      response.clone().text().then((bodyText) &#x3D;&gt; {</b>
<b>+┊  ┊41┊        console.log(&#x60;Network Error: ${response.status} (${response.statusText}) - ${bodyText}&#x60;);</b>
<b>+┊  ┊42┊        next();</b>
<b>+┊  ┊43┊      });</b>
<b>+┊  ┊44┊    } else {</b>
<b>+┊  ┊45┊      let isUnauthorized &#x3D; false;</b>
<b>+┊  ┊46┊      response.clone().json().then(({ errors }) &#x3D;&gt; {</b>
<b>+┊  ┊47┊        if (errors) {</b>
<b>+┊  ┊48┊          console.log(&#x27;GraphQL Errors:&#x27;, errors);</b>
<b>+┊  ┊49┊          if (_.some(errors, { message: &#x27;Unauthorized&#x27; })) {</b>
<b>+┊  ┊50┊            isUnauthorized &#x3D; true;</b>
<b>+┊  ┊51┊          }</b>
<b>+┊  ┊52┊        }</b>
<b>+┊  ┊53┊      }).then(() &#x3D;&gt; {</b>
<b>+┊  ┊54┊        if (isUnauthorized) {</b>
<b>+┊  ┊55┊          store.dispatch(logout());</b>
<b>+┊  ┊56┊        }</b>
<b>+┊  ┊57┊        next();</b>
<b>+┊  ┊58┊      });</b>
<b>+┊  ┊59┊    }</b>
<b>+┊  ┊60┊  },</b>
<b>+┊  ┊61┊}]);</b>
<b>+┊  ┊62┊</b>
 ┊34┊63┊// Create WebSocket client
 ┊35┊64┊const wsClient &#x3D; new SubscriptionClient(&#x27;ws://localhost:8080/subscriptions&#x27;, {
 ┊36┊65┊  reconnect: true,
</pre>

[}]: #

We simply parse the error and dispatch `logout()` if we receive an `Unauthorized` response message.

# Subscriptions-Transport-WS Authentication
Luckily for us, `SubscriptionClient` has a nifty little feature that lets us lazily (on-demand) connect to our WebSocket by setting `lazy: true`. This flag means we will only try to connect the WebSocket when we make our first subscription call, which only happens in our app once the user is authenticated. When we make our connection call, we can pass the JWT credentials via `connectionParams`. When the user logs out, we’ll close the connection and lazily reconnect when a user log back in and resubscribes.

We can update `client/src/app.js` and `client/actions/auth.actions.js` as follows:

[{]: <helper> (diffStep 7.27)

#### Step 7.27: Add lazy connecting to wsClient

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
 ┊61┊61┊}]);
 ┊62┊62┊
 ┊63┊63┊// Create WebSocket client
<b>+┊  ┊64┊export const wsClient &#x3D; new SubscriptionClient(&#x27;ws://localhost:8080/subscriptions&#x27;, {</b>
 ┊65┊65┊  reconnect: true,
<b>+┊  ┊66┊  connectionParams() {</b>
<b>+┊  ┊67┊    // get the authentication token from local storage if it exists</b>
<b>+┊  ┊68┊    return { jwt: store.getState().auth.jwt };</b>
 ┊68┊69┊  },
<b>+┊  ┊70┊  lazy: true,</b>
 ┊69┊71┊});
 ┊70┊72┊
 ┊71┊73┊// Extend the network interface with the WebSocket
</pre>

[}]: #

KaBLaM! We’re ready to start using auth across our app!

# Refactoring the Client for Authentication
Our final major hurdle is going to be refactoring all our client code to use the Queries and Mutations we modified for auth and to handle auth UI.

## Logout
To get our feet wet, let’s start by creating a new Screen instead of fixing up an existing one. Let’s create a new Screen for the Settings tab where we will show the current user’s details and give users the option to log out!

We’ll put our new Settings Screen in a new file `client/src/screens/settings.screen.js`:

[{]: <helper> (diffStep 7.28)

#### Step 7.28: Create Settings Screen

##### Added client&#x2F;src&#x2F;screens&#x2F;settings.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊   ┊  1┊import React, { Component, PropTypes } from &#x27;react&#x27;;</b>
<b>+┊   ┊  2┊import {</b>
<b>+┊   ┊  3┊  ActivityIndicator,</b>
<b>+┊   ┊  4┊  Button,</b>
<b>+┊   ┊  5┊  Image,</b>
<b>+┊   ┊  6┊  StyleSheet,</b>
<b>+┊   ┊  7┊  Text,</b>
<b>+┊   ┊  8┊  TextInput,</b>
<b>+┊   ┊  9┊  TouchableOpacity,</b>
<b>+┊   ┊ 10┊  View,</b>
<b>+┊   ┊ 11┊} from &#x27;react-native&#x27;;</b>
<b>+┊   ┊ 12┊import { connect } from &#x27;react-redux&#x27;;</b>
<b>+┊   ┊ 13┊import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b>+┊   ┊ 14┊</b>
<b>+┊   ┊ 15┊import USER_QUERY from &#x27;../graphql/user.query&#x27;;</b>
<b>+┊   ┊ 16┊import { logout } from &#x27;../actions/auth.actions&#x27;;</b>
<b>+┊   ┊ 17┊</b>
<b>+┊   ┊ 18┊const styles &#x3D; StyleSheet.create({</b>
<b>+┊   ┊ 19┊  container: {</b>
<b>+┊   ┊ 20┊    flex: 1,</b>
<b>+┊   ┊ 21┊  },</b>
<b>+┊   ┊ 22┊  email: {</b>
<b>+┊   ┊ 23┊    borderColor: &#x27;#777&#x27;,</b>
<b>+┊   ┊ 24┊    borderBottomWidth: 1,</b>
<b>+┊   ┊ 25┊    borderTopWidth: 1,</b>
<b>+┊   ┊ 26┊    paddingVertical: 8,</b>
<b>+┊   ┊ 27┊    paddingHorizontal: 16,</b>
<b>+┊   ┊ 28┊    fontSize: 16,</b>
<b>+┊   ┊ 29┊  },</b>
<b>+┊   ┊ 30┊  emailHeader: {</b>
<b>+┊   ┊ 31┊    backgroundColor: &#x27;#dbdbdb&#x27;,</b>
<b>+┊   ┊ 32┊    color: &#x27;#777&#x27;,</b>
<b>+┊   ┊ 33┊    paddingHorizontal: 16,</b>
<b>+┊   ┊ 34┊    paddingBottom: 6,</b>
<b>+┊   ┊ 35┊    paddingTop: 32,</b>
<b>+┊   ┊ 36┊    fontSize: 12,</b>
<b>+┊   ┊ 37┊  },</b>
<b>+┊   ┊ 38┊  loading: {</b>
<b>+┊   ┊ 39┊    justifyContent: &#x27;center&#x27;,</b>
<b>+┊   ┊ 40┊    flex: 1,</b>
<b>+┊   ┊ 41┊  },</b>
<b>+┊   ┊ 42┊  userImage: {</b>
<b>+┊   ┊ 43┊    width: 54,</b>
<b>+┊   ┊ 44┊    height: 54,</b>
<b>+┊   ┊ 45┊    borderRadius: 27,</b>
<b>+┊   ┊ 46┊  },</b>
<b>+┊   ┊ 47┊  imageContainer: {</b>
<b>+┊   ┊ 48┊    paddingRight: 20,</b>
<b>+┊   ┊ 49┊    alignItems: &#x27;center&#x27;,</b>
<b>+┊   ┊ 50┊  },</b>
<b>+┊   ┊ 51┊  input: {</b>
<b>+┊   ┊ 52┊    color: &#x27;black&#x27;,</b>
<b>+┊   ┊ 53┊    height: 32,</b>
<b>+┊   ┊ 54┊  },</b>
<b>+┊   ┊ 55┊  inputBorder: {</b>
<b>+┊   ┊ 56┊    borderColor: &#x27;#dbdbdb&#x27;,</b>
<b>+┊   ┊ 57┊    borderBottomWidth: 1,</b>
<b>+┊   ┊ 58┊    borderTopWidth: 1,</b>
<b>+┊   ┊ 59┊    paddingVertical: 8,</b>
<b>+┊   ┊ 60┊  },</b>
<b>+┊   ┊ 61┊  inputInstructions: {</b>
<b>+┊   ┊ 62┊    paddingTop: 6,</b>
<b>+┊   ┊ 63┊    color: &#x27;#777&#x27;,</b>
<b>+┊   ┊ 64┊    fontSize: 12,</b>
<b>+┊   ┊ 65┊    flex: 1,</b>
<b>+┊   ┊ 66┊  },</b>
<b>+┊   ┊ 67┊  userContainer: {</b>
<b>+┊   ┊ 68┊    paddingLeft: 16,</b>
<b>+┊   ┊ 69┊  },</b>
<b>+┊   ┊ 70┊  userInner: {</b>
<b>+┊   ┊ 71┊    flexDirection: &#x27;row&#x27;,</b>
<b>+┊   ┊ 72┊    alignItems: &#x27;center&#x27;,</b>
<b>+┊   ┊ 73┊    paddingVertical: 16,</b>
<b>+┊   ┊ 74┊    paddingRight: 16,</b>
<b>+┊   ┊ 75┊  },</b>
<b>+┊   ┊ 76┊});</b>
<b>+┊   ┊ 77┊</b>
<b>+┊   ┊ 78┊class Settings extends Component {</b>
<b>+┊   ┊ 79┊  static navigationOptions &#x3D; {</b>
<b>+┊   ┊ 80┊    title: &#x27;Settings&#x27;,</b>
<b>+┊   ┊ 81┊  };</b>
<b>+┊   ┊ 82┊</b>
<b>+┊   ┊ 83┊  constructor(props) {</b>
<b>+┊   ┊ 84┊    super(props);</b>
<b>+┊   ┊ 85┊</b>
<b>+┊   ┊ 86┊    this.state &#x3D; {};</b>
<b>+┊   ┊ 87┊</b>
<b>+┊   ┊ 88┊    this.logout &#x3D; this.logout.bind(this);</b>
<b>+┊   ┊ 89┊  }</b>
<b>+┊   ┊ 90┊</b>
<b>+┊   ┊ 91┊  logout() {</b>
<b>+┊   ┊ 92┊    this.props.dispatch(logout());</b>
<b>+┊   ┊ 93┊  }</b>
<b>+┊   ┊ 94┊</b>
<b>+┊   ┊ 95┊  // eslint-disable-next-line</b>
<b>+┊   ┊ 96┊  updateUsername(username) {</b>
<b>+┊   ┊ 97┊    // eslint-disable-next-line</b>
<b>+┊   ┊ 98┊    console.log(&#x27;TODO: update username&#x27;);</b>
<b>+┊   ┊ 99┊  }</b>
<b>+┊   ┊100┊</b>
<b>+┊   ┊101┊  render() {</b>
<b>+┊   ┊102┊    const { loading, user } &#x3D; this.props;</b>
<b>+┊   ┊103┊</b>
<b>+┊   ┊104┊    // render loading placeholder while we fetch data</b>
<b>+┊   ┊105┊    if (loading || !user) {</b>
<b>+┊   ┊106┊      return (</b>
<b>+┊   ┊107┊        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;</b>
<b>+┊   ┊108┊          &lt;ActivityIndicator /&gt;</b>
<b>+┊   ┊109┊        &lt;/View&gt;</b>
<b>+┊   ┊110┊      );</b>
<b>+┊   ┊111┊    }</b>
<b>+┊   ┊112┊</b>
<b>+┊   ┊113┊    return (</b>
<b>+┊   ┊114┊      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>+┊   ┊115┊        &lt;View style&#x3D;{styles.userContainer}&gt;</b>
<b>+┊   ┊116┊          &lt;View style&#x3D;{styles.userInner}&gt;</b>
<b>+┊   ┊117┊            &lt;TouchableOpacity style&#x3D;{styles.imageContainer}&gt;</b>
<b>+┊   ┊118┊              &lt;Image</b>
<b>+┊   ┊119┊                style&#x3D;{styles.userImage}</b>
<b>+┊   ┊120┊                source&#x3D;{{ uri: &#x27;https://facebook.github.io/react/img/logo_og.png&#x27; }}</b>
<b>+┊   ┊121┊              /&gt;</b>
<b>+┊   ┊122┊              &lt;Text&gt;edit&lt;/Text&gt;</b>
<b>+┊   ┊123┊            &lt;/TouchableOpacity&gt;</b>
<b>+┊   ┊124┊            &lt;Text style&#x3D;{styles.inputInstructions}&gt;</b>
<b>+┊   ┊125┊              Enter your name and add an optional profile picture</b>
<b>+┊   ┊126┊            &lt;/Text&gt;</b>
<b>+┊   ┊127┊          &lt;/View&gt;</b>
<b>+┊   ┊128┊          &lt;View style&#x3D;{styles.inputBorder}&gt;</b>
<b>+┊   ┊129┊            &lt;TextInput</b>
<b>+┊   ┊130┊              onChangeText&#x3D;{username &#x3D;&gt; this.setState({ username })}</b>
<b>+┊   ┊131┊              placeholder&#x3D;{user.username}</b>
<b>+┊   ┊132┊              style&#x3D;{styles.input}</b>
<b>+┊   ┊133┊              defaultValue&#x3D;{user.username}</b>
<b>+┊   ┊134┊            /&gt;</b>
<b>+┊   ┊135┊          &lt;/View&gt;</b>
<b>+┊   ┊136┊        &lt;/View&gt;</b>
<b>+┊   ┊137┊        &lt;Text style&#x3D;{styles.emailHeader}&gt;{&#x27;EMAIL&#x27;}&lt;/Text&gt;</b>
<b>+┊   ┊138┊        &lt;Text style&#x3D;{styles.email}&gt;{user.email}&lt;/Text&gt;</b>
<b>+┊   ┊139┊        &lt;Button title&#x3D;{&#x27;Logout&#x27;} onPress&#x3D;{this.logout} /&gt;</b>
<b>+┊   ┊140┊      &lt;/View&gt;</b>
<b>+┊   ┊141┊    );</b>
<b>+┊   ┊142┊  }</b>
<b>+┊   ┊143┊}</b>
<b>+┊   ┊144┊</b>
<b>+┊   ┊145┊Settings.propTypes &#x3D; {</b>
<b>+┊   ┊146┊  auth: PropTypes.shape({</b>
<b>+┊   ┊147┊    loading: PropTypes.bool,</b>
<b>+┊   ┊148┊    jwt: PropTypes.string,</b>
<b>+┊   ┊149┊  }).isRequired,</b>
<b>+┊   ┊150┊  dispatch: PropTypes.func.isRequired,</b>
<b>+┊   ┊151┊  loading: PropTypes.bool,</b>
<b>+┊   ┊152┊  navigation: PropTypes.shape({</b>
<b>+┊   ┊153┊    navigate: PropTypes.func,</b>
<b>+┊   ┊154┊  }),</b>
<b>+┊   ┊155┊  user: PropTypes.shape({</b>
<b>+┊   ┊156┊    username: PropTypes.string,</b>
<b>+┊   ┊157┊  }),</b>
<b>+┊   ┊158┊};</b>
<b>+┊   ┊159┊</b>
<b>+┊   ┊160┊const userQuery &#x3D; graphql(USER_QUERY, {</b>
<b>+┊   ┊161┊  skip: ownProps &#x3D;&gt; !ownProps.auth || !ownProps.auth.jwt,</b>
<b>+┊   ┊162┊  options: ({ auth }) &#x3D;&gt; ({ variables: { id: auth.id }, fetchPolicy: &#x27;cache-only&#x27; }),</b>
<b>+┊   ┊163┊  props: ({ data: { loading, user } }) &#x3D;&gt; ({</b>
<b>+┊   ┊164┊    loading, user,</b>
<b>+┊   ┊165┊  }),</b>
<b>+┊   ┊166┊});</b>
<b>+┊   ┊167┊</b>
<b>+┊   ┊168┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊169┊  auth,</b>
<b>+┊   ┊170┊});</b>
<b>+┊   ┊171┊</b>
<b>+┊   ┊172┊export default compose(</b>
<b>+┊   ┊173┊  connect(mapStateToProps),</b>
<b>+┊   ┊174┊  userQuery,</b>
<b>+┊   ┊175┊)(Settings);</b>
</pre>

[}]: #

The most important pieces of this code we need to focus on is any `auth` related code:
1. We connect `auth` from our Redux store to the component via `connect(mapStateToProps)`
2. We `skip` the `userQuery` unless we have a JWT (`ownProps.auth.jwt`)
3. We show a loading spinner until we’re done loading the user

Let’s add the `Settings` screen to our settings tab in `client/src/navigation.js`. We will also use `navigationReducer` to handle pushing the `Signin` Screen whenever the user logs out or starts the application without being authenticated:

[{]: <helper> (diffStep 7.29)

#### Step 7.29: Add Settings screen and auth logic to Navigation

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import PropTypes from &#x27;prop-types&#x27;;
 ┊ 2┊ 2┊import React, { Component } from &#x27;react&#x27;;
<b>+┊  ┊ 3┊import { addNavigationHelpers, StackNavigator, TabNavigator, NavigationActions } from &#x27;react-navigation&#x27;;</b>
 ┊ 5┊ 4┊import { connect } from &#x27;react-redux&#x27;;
 ┊ 6┊ 5┊import { graphql, compose } from &#x27;react-apollo&#x27;;
 ┊ 7┊ 6┊import update from &#x27;immutability-helper&#x27;;
 ┊ 8┊ 7┊import { map } from &#x27;lodash&#x27;;
<b>+┊  ┊ 8┊import { REHYDRATE } from &#x27;redux-persist/constants&#x27;;</b>
 ┊ 9┊ 9┊
 ┊10┊10┊import Groups from &#x27;./screens/groups.screen&#x27;;
 ┊11┊11┊import Messages from &#x27;./screens/messages.screen&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊13┊13┊import GroupDetails from &#x27;./screens/group-details.screen&#x27;;
 ┊14┊14┊import NewGroup from &#x27;./screens/new-group.screen&#x27;;
 ┊15┊15┊import Signin from &#x27;./screens/signin.screen&#x27;;
<b>+┊  ┊16┊import Settings from &#x27;./screens/settings.screen&#x27;;</b>
 ┊16┊17┊
 ┊17┊18┊import { USER_QUERY } from &#x27;./graphql/user.query&#x27;;
 ┊18┊19┊import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊25┊26┊  return newDocument.id !&#x3D;&#x3D; null &amp;&amp; existingDocuments.some(doc &#x3D;&gt; newDocument.id &#x3D;&#x3D;&#x3D; doc.id);
 ┊26┊27┊}
 ┊27┊28┊
 ┊53┊29┊// tabs in main screen
 ┊54┊30┊const MainScreenNavigator &#x3D; TabNavigator({
 ┊55┊31┊  Chats: { screen: Groups },
<b>+┊  ┊32┊  Settings: { screen: Settings },</b>
 ┊57┊33┊});
 ┊58┊34┊
 ┊59┊35┊const AppNavigator &#x3D; StackNavigator({
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊78┊54┊export const navigationReducer &#x3D; (state &#x3D; initialNavState, action) &#x3D;&gt; {
 ┊79┊55┊  let nextState;
 ┊80┊56┊  switch (action.type) {
<b>+┊  ┊57┊    case REHYDRATE:</b>
<b>+┊  ┊58┊      // convert persisted data to Immutable and confirm rehydration</b>
<b>+┊  ┊59┊      if (!action.payload.auth || !action.payload.auth.jwt) {</b>
<b>+┊  ┊60┊        const { routes, index } &#x3D; state;</b>
<b>+┊  ┊61┊        if (routes[index].routeName !&#x3D;&#x3D; &#x27;Signin&#x27;) {</b>
<b>+┊  ┊62┊          nextState &#x3D; AppNavigator.router.getStateForAction(</b>
<b>+┊  ┊63┊            NavigationActions.navigate({ routeName: &#x27;Signin&#x27; }),</b>
<b>+┊  ┊64┊            state,</b>
<b>+┊  ┊65┊          );</b>
<b>+┊  ┊66┊        }</b>
<b>+┊  ┊67┊      }</b>
<b>+┊  ┊68┊      break;</b>
<b>+┊  ┊69┊    case &#x27;LOGOUT&#x27;:</b>
<b>+┊  ┊70┊      const { routes, index } &#x3D; state;</b>
<b>+┊  ┊71┊      if (routes[index].routeName !&#x3D;&#x3D; &#x27;Signin&#x27;) {</b>
<b>+┊  ┊72┊        nextState &#x3D; AppNavigator.router.getStateForAction(</b>
<b>+┊  ┊73┊          NavigationActions.navigate({ routeName: &#x27;Signin&#x27; }),</b>
<b>+┊  ┊74┊          state,</b>
<b>+┊  ┊75┊        );</b>
<b>+┊  ┊76┊      }</b>
<b>+┊  ┊77┊      break;</b>
 ┊81┊78┊    default:
 ┊82┊79┊      nextState &#x3D; AppNavigator.router.getStateForAction(action, state);
 ┊83┊80┊      break;
</pre>

[}]: #

Though it’s typically best practice to keep reducers pure (not triggering actions directly), we’ve made an exception with `NavigationActions` in our `navigationReducer` to keep the code a little simpler in this particular case. 

Let’s run it!

![Logout Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step7-29.gif)

## Refactoring Queries and Mutations
We need to update all our client-side Queries and Mutations to match our modified Schema. We also need to update the variables we pass to these Queries and Mutations through `graphql` and attach to components.

Let’s look at the `USER_QUERY` in `Groups` and `AppWithNavigationState` for a full example:

[{]: <helper> (diffStep "7.30")

#### Step 7.30: Update userQuery with auth in Groups and Navigation

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊137┊137┊  }),
 ┊138┊138┊};
 ┊139┊139┊
<b>+┊   ┊140┊const mapStateToProps &#x3D; ({ auth, nav }) &#x3D;&gt; ({</b>
<b>+┊   ┊141┊  auth,</b>
<b>+┊   ┊142┊  nav,</b>
 ┊142┊143┊});
 ┊143┊144┊
 ┊144┊145┊const userQuery &#x3D; graphql(USER_QUERY, {
<b>+┊   ┊146┊  skip: ownProps &#x3D;&gt; !ownProps.auth || !ownProps.auth.jwt,</b>
<b>+┊   ┊147┊  options: ownProps &#x3D;&gt; ({ variables: { id: ownProps.auth.id } }),</b>
 ┊147┊148┊  props: ({ data: { loading, user, subscribeToMore } }) &#x3D;&gt; ({
 ┊148┊149┊    loading,
 ┊149┊150┊    user,
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
 ┊167┊165┊    this.onRefresh &#x3D; this.onRefresh.bind(this);
 ┊168┊166┊  }
 ┊169┊167┊
 ┊180┊168┊  onRefresh() {
 ┊181┊169┊    this.props.refetch();
 ┊182┊170┊    // faking unauthorized status
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊252┊240┊};
 ┊253┊241┊
 ┊254┊242┊const userQuery &#x3D; graphql(USER_QUERY, {
<b>+┊   ┊243┊  skip: ownProps &#x3D;&gt; !ownProps.auth || !ownProps.auth.jwt,</b>
<b>+┊   ┊244┊  options: ownProps &#x3D;&gt; ({ variables: { id: ownProps.auth.id } }),</b>
 ┊257┊245┊  props: ({ data: { loading, networkStatus, refetch, user } }) &#x3D;&gt; ({
 ┊258┊246┊    loading, networkStatus, refetch, user,
 ┊259┊247┊  }),
 ┊260┊248┊});
 ┊261┊249┊
<b>+┊   ┊250┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊251┊  auth,</b>
<b>+┊   ┊252┊});</b>
<b>+┊   ┊253┊</b>
<b>+┊   ┊254┊export default compose(</b>
<b>+┊   ┊255┊  connect(mapStateToProps),</b>
<b>+┊   ┊256┊  userQuery,</b>
<b>+┊   ┊257┊)(Groups);</b>
</pre>

[}]: #

1. We use `connect(mapStateToProps)` to attach `auth` from Redux to our component
2. We modify the `userQuery` options to pass `ownProps.auth.id` instead of the `1` placeholder
3. We change `skip` to use `ownProps.auth.jwt` to determine whether to run `userQuery`

We'll also have to make similar changes in `Messages`:

[{]: <helper> (diffStep 7.31)

#### Step 7.31: Update Messages Screen and createMessage with auth

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
 ┊13┊13┊import { graphql, compose } from &#x27;react-apollo&#x27;;
 ┊14┊14┊import ReversedFlatList from &#x27;react-native-reversed-flat-list&#x27;;
 ┊15┊15┊import update from &#x27;immutability-helper&#x27;;
<b>+┊  ┊16┊import { connect } from &#x27;react-redux&#x27;;</b>
 ┊16┊17┊
 ┊17┊18┊import Message from &#x27;../components/message.component&#x27;;
 ┊18┊19┊import MessageInput from &#x27;../components/message-input.component&#x27;;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊142┊143┊  send(text) {
 ┊143┊144┊    this.props.createMessage({
 ┊144┊145┊      groupId: this.props.navigation.state.params.groupId,
 ┊146┊146┊      text,
 ┊147┊147┊    }).then(() &#x3D;&gt; {
 ┊148┊148┊      this.flatList.scrollToBottom({ animated: true });
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊154┊154┊  renderItem &#x3D; ({ item: message }) &#x3D;&gt; (
 ┊155┊155┊    &lt;Message
 ┊156┊156┊      color&#x3D;{this.state.usernameColors[message.from.username]}
<b>+┊   ┊157┊      isCurrentUser&#x3D;{message.from.id &#x3D;&#x3D;&#x3D; this.props.auth.id}</b>
 ┊158┊158┊      message&#x3D;{message}
 ┊159┊159┊    /&gt;
 ┊160┊160┊  )
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊193┊193┊}
 ┊194┊194┊
 ┊195┊195┊Messages.propTypes &#x3D; {
<b>+┊   ┊196┊  auth: PropTypes.shape({</b>
<b>+┊   ┊197┊    id: PropTypes.number,</b>
<b>+┊   ┊198┊    username: PropTypes.string,</b>
<b>+┊   ┊199┊  }),</b>
 ┊196┊200┊  createMessage: PropTypes.func,
 ┊197┊201┊  navigation: PropTypes.shape({
 ┊198┊202┊    navigate: PropTypes.func,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊249┊253┊});
 ┊250┊254┊
 ┊251┊255┊const createMessageMutation &#x3D; graphql(CREATE_MESSAGE_MUTATION, {
<b>+┊   ┊256┊  props: ({ ownProps, mutate }) &#x3D;&gt; ({</b>
<b>+┊   ┊257┊    createMessage: ({ text, groupId }) &#x3D;&gt;</b>
 ┊254┊258┊      mutate({
<b>+┊   ┊259┊        variables: { text, groupId },</b>
 ┊256┊260┊        optimisticResponse: {
 ┊257┊261┊          __typename: &#x27;Mutation&#x27;,
 ┊258┊262┊          createMessage: {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊262┊266┊            createdAt: new Date().toISOString(), // the time is now!
 ┊263┊267┊            from: {
 ┊264┊268┊              __typename: &#x27;User&#x27;,
<b>+┊   ┊269┊              id: ownProps.auth.id,</b>
<b>+┊   ┊270┊              username: ownProps.auth.username,</b>
 ┊267┊271┊            },
 ┊268┊272┊            to: {
 ┊269┊273┊              __typename: &#x27;Group&#x27;,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊305┊309┊  }),
 ┊306┊310┊});
 ┊307┊311┊
<b>+┊   ┊312┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊313┊  auth,</b>
<b>+┊   ┊314┊});</b>
<b>+┊   ┊315┊</b>
 ┊308┊316┊export default compose(
<b>+┊   ┊317┊  connect(mapStateToProps),</b>
 ┊309┊318┊  groupQuery,
 ┊310┊319┊  createMessageMutation,
 ┊311┊320┊)(Messages);
</pre>

[}]: #

We need to make similar changes in every other one of our components before we’re bug free. Here are all the major changes:

[{]: <helper> (diffStep 7.32)

#### Step 7.32: Update Groups flow with auth

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
 ┊151┊152┊
 ┊152┊153┊    createGroup({
 ┊153┊154┊      name: this.state.name,
 ┊155┊155┊      userIds: _.map(this.state.selected, &#x27;id&#x27;),
 ┊156┊156┊    }).then((res) &#x3D;&gt; {
 ┊157┊157┊      this.props.navigation.dispatch(goToNewGroup(res.data.createGroup));
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊230┊230┊};
 ┊231┊231┊
 ┊232┊232┊const createGroupMutation &#x3D; graphql(CREATE_GROUP_MUTATION, {
<b>+┊   ┊233┊  props: ({ ownProps, mutate }) &#x3D;&gt; ({</b>
<b>+┊   ┊234┊    createGroup: ({ name, userIds }) &#x3D;&gt;</b>
 ┊235┊235┊      mutate({
<b>+┊   ┊236┊        variables: { name, userIds },</b>
 ┊237┊237┊        update: (store, { data: { createGroup } }) &#x3D;&gt; {
 ┊238┊238┊          // Read the data from our cache for this query.
<b>+┊   ┊239┊          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });</b>
 ┊240┊240┊
 ┊241┊241┊          if (isDuplicateGroup(createGroup, data.user.groups)) {
 ┊242┊242┊            return;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊248┊248┊          // Write our data back to the cache.
 ┊249┊249┊          store.writeQuery({
 ┊250┊250┊            query: USER_QUERY,
<b>+┊   ┊251┊            variables: { id: ownProps.auth.id },</b>
 ┊252┊252┊            data,
 ┊253┊253┊          });
 ┊254┊254┊        },
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊267┊267┊  }),
 ┊268┊268┊});
 ┊269┊269┊
<b>+┊   ┊270┊const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>+┊   ┊271┊  auth,</b>
<b>+┊   ┊272┊});</b>
<b>+┊   ┊273┊</b>
 ┊270┊274┊export default compose(
<b>+┊   ┊275┊  connect(mapStateToProps),</b>
 ┊271┊276┊  userQuery,
 ┊272┊277┊  createGroupMutation,
 ┊273┊278┊)(FinalizeGroup);
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
 ┊13┊13┊import AlphabetListView from &#x27;react-native-alphabetlistview&#x27;;
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

When everything is said and done, we should have a beautifully running Chatty app 📱‼️‼️ 

![Chatty Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step7-32.gif)

# 🎉 CONGRATULATIONS!!! 🎉
We made it! We made a secure, real-time chat app with React Native and GraphQL. How cool is that?! More importantly, we now have the skills and knowhow to make pretty much anything we want with some of the best tools out there.

I hope this series has been at least a little helpful in furthering your growth as a developer. I’m really stoked and humbled at the reception it has been getting, and I want to continue to do everything I can to make it the best it can be.

With that in mind, if you have any suggestions for making this series better, please leave your feedback!

[{]: <helper> (navStep)

⟸ <a href="step6.md">PREVIOUS STEP</a> <b>║</b> <a href="step8.md">NEXT STEP</a> ⟹

[}]: #

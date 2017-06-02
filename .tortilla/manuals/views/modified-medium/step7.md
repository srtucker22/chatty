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

#### [Step 7.1: Add environment variables for JWT_SECRET](https://github.com/srtucker22/chatty/commit/0136bb9)

##### Added .env
<pre>

...

<b># .env</b>
<b># use your own secret!!!</b>
<b>JWT_SECRET&#x3D;your_secret🚫↵</b>
</pre>

[}]: #

We’ll process the `JWT_SECRET` inside a new file `server/config.js`:

[{]: <helper> (diffStep 7.1 files="server/config.js")

#### [Step 7.1: Add environment variables for JWT_SECRET](https://github.com/srtucker22/chatty/commit/0136bb9)

##### Added server&#x2F;config.js
<pre>

...

<b>import dotenv from &#x27;dotenv&#x27;;</b>
<b></b>
<b>dotenv.config({ silent: true });</b>
<b></b>
<b>export const {</b>
<b>  JWT_SECRET,</b>
<b>} &#x3D; process.env;</b>
<b></b>
<b>const defaults &#x3D; {</b>
<b>  JWT_SECRET: &#x27;your_secret&#x27;,</b>
<b>};</b>
<b></b>
<b>Object.keys(defaults).forEach((key) &#x3D;&gt; {</b>
<b>  if (!process.env[key] || process.env[key] &#x3D;&#x3D;&#x3D; defaults[key]) {</b>
<b>    throw new Error(&#x60;Please enter a custom ${key} in .env on the root directory&#x60;);</b>
<b>  }</b>
<b>});</b>
<b></b>
<b>export default JWT_SECRET;</b>
</pre>

[}]: #

Now, let’s update our express server in `server/index.js` to use `express-jwt ` middleware. Even though our app isn't a pure `express` app, we can still use express-style middleware on requests passing through our `ApolloServer`:

[{]: <helper> (diffStep 7.2)

#### [Step 7.2: Add jwt middleware to express](https://github.com/srtucker22/chatty/commit/10842b3)

##### Changed server&#x2F;index.js
<pre>

...

import { ApolloServer } from &#x27;apollo-server&#x27;;
<b>import jwt from &#x27;express-jwt&#x27;;</b>
<b></b>
import { typeDefs } from &#x27;./data/schema&#x27;;
import { mocks } from &#x27;./data/mocks&#x27;;
import { resolvers } from &#x27;./data/resolvers&#x27;;
<b>import { JWT_SECRET } from &#x27;./config&#x27;;</b>
<b>import { User } from &#x27;./data/connectors&#x27;;</b>

const PORT &#x3D; 8080;

</pre>
<pre>

...

  resolvers,
  typeDefs,
  // mocks,
<b>  context: ({ req, res, connection }) &#x3D;&gt; {</b>
<b>    // web socket subscriptions will return a connection</b>
<b>    if (connection) {</b>
<b>      // check connection for metadata</b>
<b>      return {};</b>
<b>    }</b>
<b></b>
<b>    const user &#x3D; new Promise((resolve, reject) &#x3D;&gt; {</b>
<b>      jwt({</b>
<b>        secret: JWT_SECRET,</b>
<b>        credentialsRequired: false,</b>
<b>      })(req, res, (e) &#x3D;&gt; {</b>
<b>        if (req.user) {</b>
<b>          resolve(User.findOne({ where: { id: req.user.id } }));</b>
<b>        } else {</b>
<b>          resolve(null);</b>
<b>        }</b>
<b>      });</b>
<b>    });</b>
<b>    return {</b>
<b>      user,</b>
<b>    };</b>
<b>  },</b>
});

server.listen({ port: PORT }).then(({ url }) &#x3D;&gt; console.log(&#x60;🚀 Server ready at ${url}&#x60;));
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

#### [Step 7.3: Update Schema with auth](https://github.com/srtucker22/chatty/commit/1e958e6)

##### Changed server&#x2F;data&#x2F;schema.js
<pre>

...

    messages: [Message] # messages sent by user
    groups: [Group] # groups the user belongs to
    friends: [User] # user&#x27;s friends/contacts
<b>    jwt: String # json web token for access</b>
  }

  # a message sent from a user to a group
</pre>
<pre>

...


  type Mutation {
    # send a message to a group
<b>    createMessage(text: String!, groupId: Int!): Message</b>
<b>    createGroup(name: String!, userIds: [Int]): Group</b>
    deleteGroup(id: Int!): Group
<b>    leaveGroup(id: Int!): Group # let user leave group</b>
    updateGroup(id: Int!, name: String): Group
<b>    login(email: String!, password: String!): User</b>
<b>    signup(email: String!, password: String!, username: String): User</b>
  }

  type Subscription {
    # Subscription fires on every message added
    # for any of the groups with one of these groupIds
<b>    messageAdded(groupIds: [Int]): Message</b>
    groupAdded(userId: Int): Group
  }
</pre>

[}]: #

Because our server is stateless, **we don’t need to create a logout mutation!** The server will test for authorization on every request and login state will solely be kept on the client.

## Refactoring Resolvers
We need to update our Resolvers to handle our new `login` and `signup` Mutations. We can update `server/data/resolvers.js` as follows:

[{]: <helper> (diffStep 7.4)

#### [Step 7.4: Update Resolvers with login and signup mutations](https://github.com/srtucker22/chatty/commit/e880e26)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

import GraphQLDate from &#x27;graphql-date&#x27;;
import { withFilter } from &#x27;apollo-server&#x27;;
import { map } from &#x27;lodash&#x27;;
<b>import bcrypt from &#x27;bcrypt&#x27;;</b>
<b>import jwt from &#x27;jsonwebtoken&#x27;;</b>

import { Group, Message, User } from &#x27;./connectors&#x27;;
import { pubsub } from &#x27;../subscriptions&#x27;;
<b>import { JWT_SECRET } from &#x27;../config&#x27;;</b>

const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;
const GROUP_ADDED_TOPIC &#x3D; &#x27;groupAdded&#x27;;
</pre>
<pre>

...

      return Group.findOne({ where: { id } })
        .then(group &#x3D;&gt; group.update({ name }));
    },
<b>    login(_, { email, password }, ctx) {</b>
<b>      // find user by email</b>
<b>      return User.findOne({ where: { email } }).then((user) &#x3D;&gt; {</b>
<b>        if (user) {</b>
<b>          // validate password</b>
<b>          return bcrypt.compare(password, user.password).then((res) &#x3D;&gt; {</b>
<b>            if (res) {</b>
<b>              // create jwt</b>
<b>              const token &#x3D; jwt.sign({</b>
<b>                id: user.id,</b>
<b>                email: user.email,</b>
<b>              }, JWT_SECRET);</b>
<b>              user.jwt &#x3D; token;</b>
<b>              ctx.user &#x3D; Promise.resolve(user);</b>
<b>              return user;</b>
<b>            }</b>
<b></b>
<b>            return Promise.reject(&#x27;password incorrect&#x27;);</b>
<b>          });</b>
<b>        }</b>
<b></b>
<b>        return Promise.reject(&#x27;email not found&#x27;);</b>
<b>      });</b>
<b>    },</b>
<b>    signup(_, { email, password, username }, ctx) {</b>
<b>      // find user by email</b>
<b>      return User.findOne({ where: { email } }).then((existing) &#x3D;&gt; {</b>
<b>        if (!existing) {</b>
<b>          // hash password and create user</b>
<b>          return bcrypt.hash(password, 10).then(hash &#x3D;&gt; User.create({</b>
<b>            email,</b>
<b>            password: hash,</b>
<b>            username: username || email,</b>
<b>          })).then((user) &#x3D;&gt; {</b>
<b>            const { id } &#x3D; user;</b>
<b>            const token &#x3D; jwt.sign({ id, email }, JWT_SECRET);</b>
<b>            user.jwt &#x3D; token;</b>
<b>            ctx.user &#x3D; Promise.resolve(user);</b>
<b>            return user;</b>
<b>          });</b>
<b>        }</b>
<b></b>
<b>        return Promise.reject(&#x27;email already exists&#x27;); // email already exists</b>
<b>      });</b>
<b>    },</b>
  },
  Subscription: {
    messageAdded: {
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

#### [Step 7.5: Update fake data with hashed passwords](https://github.com/srtucker22/chatty/commit/bcd9bf0)

##### Changed server&#x2F;data&#x2F;connectors.js
<pre>

...

import { _ } from &#x27;lodash&#x27;;
import faker from &#x27;faker&#x27;;
import Sequelize from &#x27;sequelize&#x27;;
<b>import bcrypt from &#x27;bcrypt&#x27;;</b>

// initialize our database
const db &#x3D; new Sequelize(&#x27;chatty&#x27;, null, null, {
</pre>
<pre>

...

  name: faker.lorem.words(3),
}).then(group &#x3D;&gt; _.times(USERS_PER_GROUP, () &#x3D;&gt; {
  const password &#x3D; faker.internet.password();
<b>  return bcrypt.hash(password, 10).then(hash &#x3D;&gt; group.createUser({</b>
    email: faker.internet.email(),
    username: faker.internet.userName(),
<b>    password: hash,</b>
  }).then((user) &#x3D;&gt; {
    console.log(
      &#x27;{email, username, password}&#x27;,
</pre>
<pre>

...

      text: faker.lorem.sentences(3),
    }));
    return user;
<b>  }));</b>
})).then((userPromises) &#x3D;&gt; {
  // make users friends with all users in the group
  Promise.all(userPromises).then((users) &#x3D;&gt; {
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

#### [Step 7.6: Create logic.js](https://github.com/srtucker22/chatty/commit/f5374a7)

##### Added server&#x2F;data&#x2F;logic.js
<pre>

...

<b>import { ApolloError, AuthenticationError, ForbiddenError } from &#x27;apollo-server&#x27;;</b>
<b>import { Message } from &#x27;./connectors&#x27;;</b>
<b></b>
<b>// reusable function to check for a user with context</b>
<b>function getAuthenticatedUser(ctx) {</b>
<b>  return ctx.user.then((user) &#x3D;&gt; {</b>
<b>    if (!user) {</b>
<b>      throw new AuthenticationError(&#x27;Unauthenticated&#x27;);</b>
<b>    }</b>
<b>    return user;</b>
<b>  });</b>
<b>}</b>
<b></b>
<b>export const messageLogic &#x3D; {</b>
<b>  createMessage(_, { text, groupId }, ctx) {</b>
<b>    return getAuthenticatedUser(ctx)</b>
<b>      .then(user &#x3D;&gt; user.getGroups({ where: { id: groupId }, attributes: [&#x27;id&#x27;] })</b>
<b>        .then((group) &#x3D;&gt; {</b>
<b>          if (group.length) {</b>
<b>            return Message.create({</b>
<b>              userId: user.id,</b>
<b>              text,</b>
<b>              groupId,</b>
<b>            });</b>
<b>          }</b>
<b>          throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>        }));</b>
<b>  },</b>
<b>};</b>
</pre>

[}]: #

We’ve separated out the function `getAuthenticatedUser` to check whether a `User` is making a request. We’ll be able to reuse this function across our logic for other requests.

Now we can start injecting this logic into our Resolvers:

[{]: <helper> (diffStep 7.7)

#### [Step 7.7: Apply messageLogic to createMessage resolver](https://github.com/srtucker22/chatty/commit/18d1862)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

import { Group, Message, User } from &#x27;./connectors&#x27;;
import { pubsub } from &#x27;../subscriptions&#x27;;
import { JWT_SECRET } from &#x27;../config&#x27;;
<b>import { messageLogic } from &#x27;./logic&#x27;;</b>

const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;
const GROUP_ADDED_TOPIC &#x3D; &#x27;groupAdded&#x27;;
</pre>
<pre>

...

    },
  },
  Mutation: {
<b>    createMessage(_, args, ctx) {</b>
<b>      return messageLogic.createMessage(_, args, ctx)</b>
<b>        .then((message) &#x3D;&gt; {</b>
<b>          // Publish subscription notification with message</b>
<b>          pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });</b>
<b>          return message;</b>
<b>        });</b>
    },
    createGroup(_, { name, userIds, userId }) {
      return User.findOne({ where: { id: userId } })
</pre>

[}]: #

`createMessage` will return the result of the logic in `messageLogic`,  which returns a Promise that either successfully resolves to the new `Message` or rejects due to failed authorization.

Let’s fill out our logic in `server/data/logic.js` to cover all GraphQL Types, Queries and Mutations:

[{]: <helper> (diffStep 7.8)

#### [Step 7.8: Create logic for all Resolvers](https://github.com/srtucker22/chatty/commit/2be468c)

##### Changed server&#x2F;data&#x2F;logic.js
<pre>

...

import { ApolloError, AuthenticationError, ForbiddenError } from &#x27;apollo-server&#x27;;
<b>import { Group, Message, User } from &#x27;./connectors&#x27;;</b>

// reusable function to check for a user with context
function getAuthenticatedUser(ctx) {
</pre>
<pre>

...

}

export const messageLogic &#x3D; {
<b>  from(message) {</b>
<b>    return message.getUser({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });</b>
<b>  },</b>
<b>  to(message) {</b>
<b>    return message.getGroup({ attributes: [&#x27;id&#x27;, &#x27;name&#x27;] });</b>
<b>  },</b>
  createMessage(_, { text, groupId }, ctx) {
    return getAuthenticatedUser(ctx)
      .then(user &#x3D;&gt; user.getGroups({ where: { id: groupId }, attributes: [&#x27;id&#x27;] })
</pre>
<pre>

...

        }));
  },
};
<b></b>
<b>export const groupLogic &#x3D; {</b>
<b>  users(group) {</b>
<b>    return group.getUsers({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });</b>
<b>  },</b>
<b>  messages(group, { first, last, before, after }) {</b>
<b>    // base query -- get messages from the right group</b>
<b>    const where &#x3D; { groupId: group.id };</b>
<b></b>
<b>    // because we return messages from newest -&gt; oldest</b>
<b>    // before actually means newer (date &gt; cursor)</b>
<b>    // after actually means older (date &lt; cursor)</b>
<b></b>
<b>    if (before) {</b>
<b>      // convert base-64 to utf8 iso date and use in Date constructor</b>
<b>      where.id &#x3D; { $gt: Buffer.from(before, &#x27;base64&#x27;).toString() };</b>
<b>    }</b>
<b></b>
<b>    if (after) {</b>
<b>      where.id &#x3D; { $lt: Buffer.from(after, &#x27;base64&#x27;).toString() };</b>
<b>    }</b>
<b></b>
<b>    return Message.findAll({</b>
<b>      where,</b>
<b>      order: [[&#x27;id&#x27;, &#x27;DESC&#x27;]],</b>
<b>      limit: first || last,</b>
<b>    }).then((messages) &#x3D;&gt; {</b>
<b>      const edges &#x3D; messages.map(message &#x3D;&gt; ({</b>
<b>        cursor: Buffer.from(message.id.toString()).toString(&#x27;base64&#x27;), // convert createdAt to cursor</b>
<b>        node: message, // the node is the message itself</b>
<b>      }));</b>
<b></b>
<b>      return {</b>
<b>        edges,</b>
<b>        pageInfo: {</b>
<b>          hasNextPage() {</b>
<b>            if (messages.length &lt; (last || first)) {</b>
<b>              return Promise.resolve(false);</b>
<b>            }</b>
<b></b>
<b>            return Message.findOne({</b>
<b>              where: {</b>
<b>                groupId: group.id,</b>
<b>                id: {</b>
<b>                  [before ? &#x27;$gt&#x27; : &#x27;$lt&#x27;]: messages[messages.length - 1].id,</b>
<b>                },</b>
<b>              },</b>
<b>              order: [[&#x27;id&#x27;, &#x27;DESC&#x27;]],</b>
<b>            }).then(message &#x3D;&gt; !!message);</b>
<b>          },</b>
<b>          hasPreviousPage() {</b>
<b>            return Message.findOne({</b>
<b>              where: {</b>
<b>                groupId: group.id,</b>
<b>                id: where.id,</b>
<b>              },</b>
<b>              order: [[&#x27;id&#x27;]],</b>
<b>            }).then(message &#x3D;&gt; !!message);</b>
<b>          },</b>
<b>        },</b>
<b>      };</b>
<b>    });</b>
<b>  },</b>
<b>  query(_, { id }, ctx) {</b>
<b>    return getAuthenticatedUser(ctx).then(user &#x3D;&gt; Group.findOne({</b>
<b>      where: { id },</b>
<b>      include: [{</b>
<b>        model: User,</b>
<b>        where: { id: user.id },</b>
<b>      }],</b>
<b>    }));</b>
<b>  },</b>
<b>  createGroup(_, { name, userIds }, ctx) {</b>
<b>    return getAuthenticatedUser(ctx)</b>
<b>      .then(user &#x3D;&gt; user.getFriends({ where: { id: { $in: userIds } } })</b>
<b>        .then((friends) &#x3D;&gt; { // eslint-disable-line arrow-body-style</b>
<b>          return Group.create({</b>
<b>            name,</b>
<b>          }).then((group) &#x3D;&gt; { // eslint-disable-line arrow-body-style</b>
<b>            return group.addUsers([user, ...friends]).then(() &#x3D;&gt; {</b>
<b>              group.users &#x3D; [user, ...friends];</b>
<b>              return group;</b>
<b>            });</b>
<b>          });</b>
<b>        }));</b>
<b>  },</b>
<b>  deleteGroup(_, { id }, ctx) {</b>
<b>    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; { // eslint-disable-line arrow-body-style</b>
<b>      return Group.findOne({</b>
<b>        where: { id },</b>
<b>        include: [{</b>
<b>          model: User,</b>
<b>          where: { id: user.id },</b>
<b>        }],</b>
<b>      }).then(group &#x3D;&gt; group.getUsers()</b>
<b>        .then(users &#x3D;&gt; group.removeUsers(users))</b>
<b>        .then(() &#x3D;&gt; Message.destroy({ where: { groupId: group.id } }))</b>
<b>        .then(() &#x3D;&gt; group.destroy()));</b>
<b>    });</b>
<b>  },</b>
<b>  leaveGroup(_, { id }, ctx) {</b>
<b>    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; {</b>
<b>      return Group.findOne({</b>
<b>        where: { id },</b>
<b>        include: [{</b>
<b>          model: User,</b>
<b>          where: { id: user.id },</b>
<b>        }],</b>
<b>      }).then((group) &#x3D;&gt; {</b>
<b>        if (!group) {</b>
<b>          throw new ApolloError(&#x27;No group found&#x27;, 404);</b>
<b>        }</b>
<b></b>
<b>        return group.removeUser(user.id)</b>
<b>          .then(() &#x3D;&gt; group.getUsers())</b>
<b>          .then((users) &#x3D;&gt; {</b>
<b>            // if the last user is leaving, remove the group</b>
<b>            if (!users.length) {</b>
<b>              group.destroy();</b>
<b>            }</b>
<b>            return { id };</b>
<b>          });</b>
<b>      });</b>
<b>    });</b>
<b>  },</b>
<b>  updateGroup(_, { id, name }, ctx) {</b>
<b>    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; { // eslint-disable-line arrow-body-style</b>
<b>      return Group.findOne({</b>
<b>        where: { id },</b>
<b>        include: [{</b>
<b>          model: User,</b>
<b>          where: { id: user.id },</b>
<b>        }],</b>
<b>      }).then(group &#x3D;&gt; group.update({ name }));</b>
<b>    });</b>
<b>  },</b>
<b>};</b>
<b></b>
<b>export const userLogic &#x3D; {</b>
<b>  email(user, args, ctx) {</b>
<b>    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>      if (currentUser.id &#x3D;&#x3D;&#x3D; user.id) {</b>
<b>        return currentUser.email;</b>
<b>      }</b>
<b></b>
<b>      throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>    });</b>
<b>  },</b>
<b>  friends(user, args, ctx) {</b>
<b>    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>      if (currentUser.id !&#x3D;&#x3D; user.id) {</b>
<b>        throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>      }</b>
<b></b>
<b>      return user.getFriends({ attributes: [&#x27;id&#x27;, &#x27;username&#x27;] });</b>
<b>    });</b>
<b>  },</b>
<b>  groups(user, args, ctx) {</b>
<b>    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>      if (currentUser.id !&#x3D;&#x3D; user.id) {</b>
<b>        throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>      }</b>
<b></b>
<b>      return user.getGroups();</b>
<b>    });</b>
<b>  },</b>
<b>  jwt(user) {</b>
<b>    return Promise.resolve(user.jwt);</b>
<b>  },</b>
<b>  messages(user, args, ctx) {</b>
<b>    return getAuthenticatedUser(ctx).then((currentUser) &#x3D;&gt; {</b>
<b>      if (currentUser.id !&#x3D;&#x3D; user.id) {</b>
<b>        throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>      }</b>
<b></b>
<b>      return Message.findAll({</b>
<b>        where: { userId: user.id },</b>
<b>        order: [[&#x27;createdAt&#x27;, &#x27;DESC&#x27;]],</b>
<b>      });</b>
<b>    });</b>
<b>  },</b>
<b>  query(_, args, ctx) {</b>
<b>    return getAuthenticatedUser(ctx).then((user) &#x3D;&gt; {</b>
<b>      if (user.id &#x3D;&#x3D;&#x3D; args.id || user.email &#x3D;&#x3D;&#x3D; args.email) {</b>
<b>        return user;</b>
<b>      }</b>
<b></b>
<b>      throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>    });</b>
<b>  },</b>
<b>};</b>
</pre>

[}]: #

And now let’s apply that logic to the Resolvers in `server/data/resolvers.js`:

[{]: <helper> (diffStep 7.9)

#### [Step 7.9: Apply logic to all Resolvers](https://github.com/srtucker22/chatty/commit/6a4beb8)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

import { Group, Message, User } from &#x27;./connectors&#x27;;
import { pubsub } from &#x27;../subscriptions&#x27;;
import { JWT_SECRET } from &#x27;../config&#x27;;
<b>import { groupLogic, messageLogic, userLogic } from &#x27;./logic&#x27;;</b>

const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;
const GROUP_ADDED_TOPIC &#x3D; &#x27;groupAdded&#x27;;
</pre>
<pre>

...

    },
  },
  Query: {
<b>    group(_, args, ctx) {</b>
<b>      return groupLogic.query(_, args, ctx);</b>
    },
<b>    user(_, args, ctx) {</b>
<b>      return userLogic.query(_, args, ctx);</b>
    },
  },
  Mutation: {
</pre>
<pre>

...

          return message;
        });
    },
<b>    createGroup(_, args, ctx) {</b>
<b>      return groupLogic.createGroup(_, args, ctx).then((group) &#x3D;&gt; {</b>
<b>        pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });</b>
<b>        return group;</b>
<b>      });</b>
    },
<b>    deleteGroup(_, args, ctx) {</b>
<b>      return groupLogic.deleteGroup(_, args, ctx);</b>
<b>    },</b>
<b>    leaveGroup(_, args, ctx) {</b>
<b>      return groupLogic.leaveGroup(_, args, ctx);</b>
<b>    },</b>
<b>    updateGroup(_, args, ctx) {</b>
<b>      return groupLogic.updateGroup(_, args, ctx);</b>
    },
    login(_, { email, password }, ctx) {
      // find user by email
</pre>
<pre>

...

    },
  },
  Group: {
<b>    users(group, args, ctx) {</b>
<b>      return groupLogic.users(group, args, ctx);</b>
    },
<b>    messages(group, args, ctx) {</b>
<b>      return groupLogic.messages(group, args, ctx);</b>
    },
  },
  Message: {
<b>    to(message, args, ctx) {</b>
<b>      return messageLogic.to(message, args, ctx);</b>
    },
<b>    from(message, args, ctx) {</b>
<b>      return messageLogic.from(message, args, ctx);</b>
    },
  },
  User: {
<b>    email(user, args, ctx) {</b>
<b>      return userLogic.email(user, args, ctx);</b>
<b>    },</b>
<b>    friends(user, args, ctx) {</b>
<b>      return userLogic.friends(user, args, ctx);</b>
<b>    },</b>
<b>    groups(user, args, ctx) {</b>
<b>      return userLogic.groups(user, args, ctx);</b>
    },
<b>    jwt(user, args, ctx) {</b>
<b>      return userLogic.jwt(user, args, ctx);</b>
    },
<b>    messages(user, args, ctx) {</b>
<b>      return userLogic.messages(user, args, ctx);</b>
    },
  },
};
</pre>

[}]: #

We also need to update our subscription filters with the user context. Fortunately, `withFilter` can return a `Boolean` or `Promise<Boolean>`.

[{]: <helper> (diffStep "7.10")

#### [Step 7.10: Apply user context to subscription filters](https://github.com/srtucker22/chatty/commit/fd0be66)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

    messageAdded: {
      subscribe: withFilter(
        () &#x3D;&gt; pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),
<b>        (payload, args, ctx) &#x3D;&gt; {</b>
<b>          return ctx.user.then((user) &#x3D;&gt; {</b>
<b>            return Boolean(</b>
<b>              args.groupIds &amp;&amp;</b>
<b>              ~args.groupIds.indexOf(payload.messageAdded.groupId) &amp;&amp;</b>
<b>              user.id !&#x3D;&#x3D; payload.messageAdded.userId, // don&#x27;t send to user creating message</b>
<b>            );</b>
<b>          });</b>
        },
      ),
    },
    groupAdded: {
      subscribe: withFilter(
        () &#x3D;&gt; pubsub.asyncIterator(GROUP_ADDED_TOPIC),
<b>        (payload, args, ctx) &#x3D;&gt; {</b>
<b>          return ctx.user.then((user) &#x3D;&gt; {</b>
<b>            return Boolean(</b>
<b>              args.userId &amp;&amp;</b>
<b>              ~map(payload.groupAdded.users, &#x27;id&#x27;).indexOf(args.userId) &amp;&amp;</b>
<b>              user.id !&#x3D;&#x3D; payload.groupAdded.users[0].id, // don&#x27;t send to user creating group</b>
<b>            );</b>
<b>          });</b>
        },
      ),
    },
</pre>

[}]: #

So much cleaner and **WAY** more secure!

## The Expired Password Problem
We still have one last thing that needs modifying in our authorization setup. When a user changes their password, we issue a new JWT, but the old JWT will still pass verification! This can become a serious problem if a hacker gets ahold of a user’s password. To close the loop on this issue, we can make a clever little adjustment to our `UserModel` database model to include a `version` parameter, which will be a counter that increments with each new password for the user. We’ll incorporate `version` into our JWT so only the newest JWT will pass our security. Let’s update `ApolloServer` and our Connectors and Resolvers accordingly:

[{]: <helper> (diffStep "7.11")

#### [Step 7.11: Apply versioning to JWT auth](https://github.com/srtucker22/chatty/commit/40574db)

##### Changed server&#x2F;data&#x2F;connectors.js
<pre>

...

  email: { type: Sequelize.STRING },
  username: { type: Sequelize.STRING },
  password: { type: Sequelize.STRING },
<b>  version: { type: Sequelize.INTEGER }, // version the password</b>
});

// users belong to multiple groups
</pre>
<pre>

...

    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: hash,
<b>    version: 1,</b>
  }).then((user) &#x3D;&gt; {
    console.log(
      &#x27;{email, username, password}&#x27;,
</pre>

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

              const token &#x3D; jwt.sign({
                id: user.id,
                email: user.email,
<b>                version: user.version,</b>
              }, JWT_SECRET);
              user.jwt &#x3D; token;
              ctx.user &#x3D; Promise.resolve(user);
</pre>
<pre>

...

            email,
            password: hash,
            username: username || email,
<b>            version: 1,</b>
          })).then((user) &#x3D;&gt; {
            const { id } &#x3D; user;
<b>            const token &#x3D; jwt.sign({ id, email, version: 1 }, JWT_SECRET);</b>
            user.jwt &#x3D; token;
            ctx.user &#x3D; Promise.resolve(user);
            return user;
</pre>

##### Changed server&#x2F;index.js
<pre>

...

        credentialsRequired: false,
      })(req, res, (e) &#x3D;&gt; {
        if (req.user) {
<b>          resolve(User.findOne({ where: { id: req.user.id, version: req.user.version } }));</b>
        } else {
          resolve(null);
        }
</pre>

[}]: #

# Testing
It can’t be understated just how vital testing is to securing our code. Yet, like with most tutorials, testing is noticeably absent from this one. We’re not going to cover proper testing here because it really belongs in its own post and would make this already egregiously long post even longer.

For now, we’ll just use GraphQL Playground to make sure our code is performing as expected.

Here are the steps to test our protected GraphQL endpoint in GraphQL Playground:

1. Use the `signup` or `login` mutation to receive a JWT ![Login Image](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step7-11-1.png)
2. Apply the JWT to the Authorization Header for future requests and make whatever authorized `query` or `mutation` requests we want
![Query Image Success](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step7-11-2.png)
![Query Image Fail](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step7-11-3.png)
![Query Image Partial](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step7-11-4.png)

# JWT Authentication for Subscriptions
Our Queries and Mutations are secure, but our Subscriptions are wide open. Right now, any user could subscribe to new messages for all groups, or track when any group is created. The security we’ve already implemented limits the `Message` and `Group` fields a hacker could view, but that’s not good enough! Secure all the things!

In this workflow, we will only allow WebSocket connections once the user is authenticated. Whenever the user is logged off, we terminate the connection, and then reinitiate a new connection the next time they log in. This workflow is suitable for applications that don't require subscriptions while the user isn't logged in and makes it easier to defend against DOS attacks.

Just like with Queries and Mutations, we can pass a `context` parameter to our Subscriptions every time a user connects over WebSockets! When constructing `ApolloServer`, we can pass an `onConnect` parameter, which is a function that runs before every WebSocket connection. The `onConnect` function offers 2 parameters —  `connectionParams` and `webSocket` —  and should return a Promise that resolves the `context`.

`connectionParams` is where we will receive the JWT from the client. Inside `onConnect`, we will extract the `User` Promise from the JWT and replace return the `User` Promise as the context.

Let’s first update `ApolloServer` in `server/index.js` to use `onConnect` to validate the JWT and return a `context` with the `User` for subscriptions:

[{]: <helper> (diffStep 7.12)

#### [Step 7.12: Add onConnect to ApolloServer config](https://github.com/srtucker22/chatty/commit/f212f1e)

##### Changed server&#x2F;index.js
<pre>

...

<b>import { ApolloServer, AuthenticationError } from &#x27;apollo-server&#x27;;</b>
import jwt from &#x27;express-jwt&#x27;;
<b>import jsonwebtoken from &#x27;jsonwebtoken&#x27;;</b>

import { typeDefs } from &#x27;./data/schema&#x27;;
import { mocks } from &#x27;./data/mocks&#x27;;
</pre>
<pre>

...

    // web socket subscriptions will return a connection
    if (connection) {
      // check connection for metadata
<b>      return connection.context;</b>
    }

    const user &#x3D; new Promise((resolve, reject) &#x3D;&gt; {
</pre>
<pre>

...

      user,
    };
  },
<b>  subscriptions: {</b>
<b>    onConnect(connectionParams, websocket, wsContext) {</b>
<b>      const userPromise &#x3D; new Promise((res, rej) &#x3D;&gt; {</b>
<b>        if (connectionParams.jwt) {</b>
<b>          jsonwebtoken.verify(</b>
<b>            connectionParams.jwt, JWT_SECRET,</b>
<b>            (err, decoded) &#x3D;&gt; {</b>
<b>              if (err) {</b>
<b>                rej(new AuthenticationError(&#x27;No token&#x27;));</b>
<b>              }</b>
<b></b>
<b>              res(User.findOne({ where: { id: decoded.id, version: decoded.version } }));</b>
<b>            },</b>
<b>          );</b>
<b>        } else {</b>
<b>          rej(new AuthenticationError(&#x27;No token&#x27;));</b>
<b>        }</b>
<b>      });</b>
<b></b>
<b>      return userPromise.then((user) &#x3D;&gt; {</b>
<b>        if (user) {</b>
<b>          return { user: Promise.resolve(user) };</b>
<b>        }</b>
<b></b>
<b>        return Promise.reject(new AuthenticationError(&#x27;No user&#x27;));</b>
<b>      });</b>
<b>    },</b>
<b>  },</b>
});

server.listen({ port: PORT }).then(({ url }) &#x3D;&gt; console.log(&#x60;🚀 Server ready at ${url}&#x60;));
</pre>

[}]: #

First, `onConnect` will use `jsonwebtoken` to verify and decode `connectionParams.jwt` to extract a `User` from the database. It will do this work within a new Promise called `user`.

Second, we need to write our `subscriptionLogic` to validate whether this `User` is allowed to subscribe to this particular subscription:

[{]: <helper> (diffStep 7.13 files="server/data/logic.js")

#### [Step 7.13: Create subscriptionLogic](https://github.com/srtucker22/chatty/commit/1cbaab9)

##### Changed server&#x2F;data&#x2F;logic.js
<pre>

...

    });
  },
};
<b></b>
<b>export const subscriptionLogic &#x3D; {</b>
<b>  groupAdded(params, args, ctx) {</b>
<b>    return getAuthenticatedUser(ctx)</b>
<b>      .then((user) &#x3D;&gt; {</b>
<b>        if (user.id !&#x3D;&#x3D; args.userId) {</b>
<b>          throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>        }</b>
<b></b>
<b>        return Promise.resolve();</b>
<b>      });</b>
<b>  },</b>
<b>  messageAdded(params, args, ctx) {</b>
<b>    return getAuthenticatedUser(ctx)</b>
<b>      .then(user &#x3D;&gt; user.getGroups({ where: { id: { $in: args.groupIds } }, attributes: [&#x27;id&#x27;] })</b>
<b>        .then((groups) &#x3D;&gt; {</b>
<b>          // user attempted to subscribe to some groups without access</b>
<b>          if (args.groupIds.length &gt; groups.length) {</b>
<b>            throw new ForbiddenError(&#x27;Unauthorized&#x27;);</b>
<b>          }</b>
<b></b>
<b>          return Promise.resolve();</b>
<b>        }));</b>
<b>  },</b>
<b>};</b>
</pre>

[}]: #

Finally, we need a way to run this logic when the subscription will attempt to be initiated. This happens inside our resolvers when we run `pubsub.asyncIterator`, returning the `AsyncIterator` that will listen for events and trigger our server to send WebSocket emittions. We'll need to update this `AsyncIterator` generator to first validate through our `subscriptionLogic` and throw an error if the request is unauthorized. We can create a `pubsub.asyncAuthIterator` function that looks like `pubsub.asyncIterator`, but takes an extra `authPromise` argument that will need to resolve before any data gets passed from the `AsyncIterator` this function creates.

[{]: <helper> (diffStep 7.13 files="server/subscriptions.js")

#### [Step 7.13: Create subscriptionLogic](https://github.com/srtucker22/chatty/commit/1cbaab9)

##### Changed server&#x2F;subscriptions.js
<pre>

...

<b>import { $$asyncIterator } from &#x27;iterall&#x27;;</b>
import { PubSub } from &#x27;apollo-server&#x27;;

export const pubsub &#x3D; new PubSub();

<b>pubsub.asyncAuthIterator &#x3D; (messages, authPromise) &#x3D;&gt; {</b>
<b>  const asyncIterator &#x3D; pubsub.asyncIterator(messages);</b>
<b>  return {</b>
<b>    next() {</b>
<b>      return authPromise.then(() &#x3D;&gt; asyncIterator.next());</b>
<b>    },</b>
<b>    return() {</b>
<b>      return authPromise.then(() &#x3D;&gt; asyncIterator.return());</b>
<b>    },</b>
<b>    throw(error) {</b>
<b>      return asyncIterator.throw(error);</b>
<b>    },</b>
<b>    [$$asyncIterator]() {</b>
<b>      return asyncIterator;</b>
<b>    },</b>
<b>  };</b>
<b>};</b>
<b></b>
export default pubsub;
</pre>

[}]: #

We can stick this `pubsub.asyncAuthIterator` in our resolvers like so:

[{]: <helper> (diffStep 7.13 files="server/data/resolvers.js")

#### [Step 7.13: Create subscriptionLogic](https://github.com/srtucker22/chatty/commit/1cbaab9)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

import { Group, Message, User } from &#x27;./connectors&#x27;;
import { pubsub } from &#x27;../subscriptions&#x27;;
import { JWT_SECRET } from &#x27;../config&#x27;;
<b>import { groupLogic, messageLogic, userLogic, subscriptionLogic } from &#x27;./logic&#x27;;</b>

const MESSAGE_ADDED_TOPIC &#x3D; &#x27;messageAdded&#x27;;
const GROUP_ADDED_TOPIC &#x3D; &#x27;groupAdded&#x27;;
</pre>
<pre>

...

  Subscription: {
    messageAdded: {
      subscribe: withFilter(
<b>        (payload, args, ctx) &#x3D;&gt; pubsub.asyncAuthIterator(</b>
<b>          MESSAGE_ADDED_TOPIC,</b>
<b>          subscriptionLogic.messageAdded(payload, args, ctx),</b>
<b>        ),</b>
        (payload, args, ctx) &#x3D;&gt; {
          return ctx.user.then((user) &#x3D;&gt; {
            return Boolean(
</pre>
<pre>

...

    },
    groupAdded: {
      subscribe: withFilter(
<b>        (payload, args, ctx) &#x3D;&gt; pubsub.asyncAuthIterator(</b>
<b>          GROUP_ADDED_TOPIC,</b>
<b>          subscriptionLogic.groupAdded(payload, args, ctx),</b>
<b>        ),</b>
        (payload, args, ctx) &#x3D;&gt; {
          return ctx.user.then((user) &#x3D;&gt; {
            return Boolean(
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

#### [Step 7.14: Create Signup Screen](https://github.com/srtucker22/chatty/commit/25879e8)

##### Added client&#x2F;src&#x2F;screens&#x2F;signin.screen.js
<pre>

...

<b>import React, { Component } from &#x27;react&#x27;;</b>
<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import {</b>
<b>  ActivityIndicator,</b>
<b>  KeyboardAvoidingView,</b>
<b>  Button,</b>
<b>  StyleSheet,</b>
<b>  Text,</b>
<b>  TextInput,</b>
<b>  TouchableOpacity,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    flex: 1,</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>    backgroundColor: &#x27;#eeeeee&#x27;,</b>
<b>    paddingHorizontal: 50,</b>
<b>  },</b>
<b>  inputContainer: {</b>
<b>    marginBottom: 20,</b>
<b>  },</b>
<b>  input: {</b>
<b>    height: 40,</b>
<b>    borderRadius: 4,</b>
<b>    marginVertical: 6,</b>
<b>    padding: 6,</b>
<b>    backgroundColor: &#x27;rgba(0,0,0,0.2)&#x27;,</b>
<b>  },</b>
<b>  loadingContainer: {</b>
<b>    left: 0,</b>
<b>    right: 0,</b>
<b>    top: 0,</b>
<b>    bottom: 0,</b>
<b>    position: &#x27;absolute&#x27;,</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>  },</b>
<b>  switchContainer: {</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>    marginTop: 12,</b>
<b>  },</b>
<b>  switchAction: {</b>
<b>    paddingHorizontal: 4,</b>
<b>    color: &#x27;blue&#x27;,</b>
<b>  },</b>
<b>  submit: {</b>
<b>    marginVertical: 6,</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>class Signin extends Component {</b>
<b>  static navigationOptions &#x3D; {</b>
<b>    title: &#x27;Chatty&#x27;,</b>
<b>    headerLeft: null,</b>
<b>  };</b>
<b></b>
<b>  constructor(props) {</b>
<b>    super(props);</b>
<b>    this.state &#x3D; {</b>
<b>      view: &#x27;login&#x27;,</b>
<b>    };</b>
<b>    this.login &#x3D; this.login.bind(this);</b>
<b>    this.signup &#x3D; this.signup.bind(this);</b>
<b>    this.switchView &#x3D; this.switchView.bind(this);</b>
<b>  }</b>
<b></b>
<b>  // fake for now</b>
<b>  login() {</b>
<b>    console.log(&#x27;logging in&#x27;);</b>
<b>    this.setState({ loading: true });</b>
<b>    setTimeout(() &#x3D;&gt; {</b>
<b>      console.log(&#x27;signing up&#x27;);</b>
<b>      this.props.navigation.goBack();</b>
<b>    }, 1000);</b>
<b>  }</b>
<b></b>
<b>  // fake for now</b>
<b>  signup() {</b>
<b>    console.log(&#x27;signing up&#x27;);</b>
<b>    this.setState({ loading: true });</b>
<b>    setTimeout(() &#x3D;&gt; {</b>
<b>      this.props.navigation.goBack();</b>
<b>    }, 1000);</b>
<b>  }</b>
<b></b>
<b>  switchView() {</b>
<b>    this.setState({</b>
<b>      view: this.state.view &#x3D;&#x3D;&#x3D; &#x27;signup&#x27; ? &#x27;login&#x27; : &#x27;signup&#x27;,</b>
<b>    });</b>
<b>  }</b>
<b></b>
<b>  render() {</b>
<b>    const { view } &#x3D; this.state;</b>
<b></b>
<b>    return (</b>
<b>      &lt;KeyboardAvoidingView</b>
<b>        behavior&#x3D;{&#x27;padding&#x27;}</b>
<b>        style&#x3D;{styles.container}</b>
<b>      &gt;</b>
<b>        {this.state.loading ?</b>
<b>          &lt;View style&#x3D;{styles.loadingContainer}&gt;</b>
<b>            &lt;ActivityIndicator /&gt;</b>
<b>          &lt;/View&gt; : undefined}</b>
<b>        &lt;View style&#x3D;{styles.inputContainer}&gt;</b>
<b>          &lt;TextInput</b>
<b>            onChangeText&#x3D;{email &#x3D;&gt; this.setState({ email })}</b>
<b>            placeholder&#x3D;{&#x27;Email&#x27;}</b>
<b>            style&#x3D;{styles.input}</b>
<b>          /&gt;</b>
<b>          &lt;TextInput</b>
<b>            onChangeText&#x3D;{password &#x3D;&gt; this.setState({ password })}</b>
<b>            placeholder&#x3D;{&#x27;Password&#x27;}</b>
<b>            secureTextEntry</b>
<b>            style&#x3D;{styles.input}</b>
<b>          /&gt;</b>
<b>        &lt;/View&gt;</b>
<b>        &lt;Button</b>
<b>          onPress&#x3D;{this[view]}</b>
<b>          style&#x3D;{styles.submit}</b>
<b>          title&#x3D;{view &#x3D;&#x3D;&#x3D; &#x27;signup&#x27; ? &#x27;Sign up&#x27; : &#x27;Login&#x27;}</b>
<b>          disabled&#x3D;{this.state.loading}</b>
<b>        /&gt;</b>
<b>        &lt;View style&#x3D;{styles.switchContainer}&gt;</b>
<b>          &lt;Text&gt;</b>
<b>            { view &#x3D;&#x3D;&#x3D; &#x27;signup&#x27; ?</b>
<b>              &#x27;Already have an account?&#x27; : &#x27;New to Chatty?&#x27; }</b>
<b>          &lt;/Text&gt;</b>
<b>          &lt;TouchableOpacity</b>
<b>            onPress&#x3D;{this.switchView}</b>
<b>          &gt;</b>
<b>            &lt;Text style&#x3D;{styles.switchAction}&gt;</b>
<b>              {view &#x3D;&#x3D;&#x3D; &#x27;login&#x27; ? &#x27;Sign up&#x27; : &#x27;Login&#x27;}</b>
<b>            &lt;/Text&gt;</b>
<b>          &lt;/TouchableOpacity&gt;</b>
<b>        &lt;/View&gt;</b>
<b>      &lt;/KeyboardAvoidingView&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b>Signin.propTypes &#x3D; {</b>
<b>  navigation: PropTypes.shape({</b>
<b>    goBack: PropTypes.func,</b>
<b>  }),</b>
<b>};</b>
<b></b>
<b>export default Signin;</b>
</pre>

[}]: #

Next, we’ll add `Signin` to our Navigation. We'll also make sure the `USER_QUERY` attached to `AppWithNavigationState` gets skipped and doesn't query for anything for now. We don’t want to run any queries until a user officially signs in. Right now, we’re just testing the layout, so we don’t want queries to run at all no matter what. `graphql` let’s us pass a `skip` function as an optional parameter to our queries to skip their execution. We can update the code in `client/src/navigation.js` as follows:

[{]: <helper> (diffStep 7.15 files="client/src/navigation.js")

#### [Step 7.15: Add Signin to navigation and skip queries](https://github.com/srtucker22/chatty/commit/8c3b680)

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>

...

import FinalizeGroup from &#x27;./screens/finalize-group.screen&#x27;;
import GroupDetails from &#x27;./screens/group-details.screen&#x27;;
import NewGroup from &#x27;./screens/new-group.screen&#x27;;
<b>import Signin from &#x27;./screens/signin.screen&#x27;;</b>

import { USER_QUERY } from &#x27;./graphql/user.query&#x27;;
import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;
</pre>
<pre>

...


const AppNavigator &#x3D; StackNavigator({
  Main: { screen: MainScreenNavigator },
<b>  Signin: { screen: Signin },</b>
  Messages: { screen: Messages },
  GroupDetails: { screen: GroupDetails },
  NewGroup: { screen: NewGroup },
</pre>
<pre>

...

});

const userQuery &#x3D; graphql(USER_QUERY, {
<b>  skip: ownProps &#x3D;&gt; true, // fake it -- we&#x27;ll use ownProps with auth</b>
  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
  props: ({ data: { loading, user, refetch, subscribeToMore } }) &#x3D;&gt; ({
    loading,
</pre>

[}]: #

Lastly, we need to modify the `Groups` screen to push the `Signin` modal and skip querying for anything:

[{]: <helper> (diffStep 7.15 files="client/src/screens/groups.screen.js")

#### [Step 7.15: Add Signin to navigation and skip queries](https://github.com/srtucker22/chatty/commit/8c3b680)

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>

...

  onPress: PropTypes.func.isRequired,
};

<b>// we&#x27;ll fake signin for now</b>
<b>let IS_SIGNED_IN &#x3D; false;</b>
<b></b>
class Group extends Component {
  constructor(props) {
    super(props);
</pre>
<pre>

...

    this.onRefresh &#x3D; this.onRefresh.bind(this);
  }

<b>  componentDidMount() {</b>
<b>    if (!IS_SIGNED_IN) {</b>
<b>      IS_SIGNED_IN &#x3D; true;</b>
<b></b>
<b>      const { navigate } &#x3D; this.props.navigation;</b>
<b></b>
<b>      navigate(&#x27;Signin&#x27;);</b>
<b>    }</b>
<b>  }</b>
<b></b>
  onRefresh() {
    this.props.refetch();
<b>    // faking unauthorized status</b>
  }

  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();
</pre>
<pre>

...

};

const userQuery &#x3D; graphql(USER_QUERY, {
<b>  skip: ownProps &#x3D;&gt; true, // fake it -- we&#x27;ll use ownProps with auth</b>
  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now
  props: ({ data: { loading, networkStatus, refetch, user } }) &#x3D;&gt; ({
    loading, networkStatus, refetch, user,
</pre>

[}]: #

Let’s test out our layout: ![Fake Signin Gif](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step7-15.gif)

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

#### [Step 7.16: Create auth reducer](https://github.com/srtucker22/chatty/commit/47c5a1d)

##### Added client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
<pre>

...

<b>import Immutable from &#x27;seamless-immutable&#x27;;</b>
<b></b>
<b>const initialState &#x3D; Immutable({</b>
<b>  loading: true,</b>
<b>});</b>
<b></b>
<b>const auth &#x3D; (state &#x3D; initialState, action) &#x3D;&gt; {</b>
<b>  switch (action.type) {</b>
<b>    default:</b>
<b>      return state;</b>
<b>  }</b>
<b>};</b>
<b></b>
<b>export default auth;</b>
</pre>

[}]: #

The initial state for store.auth will be `{ loading: true }`. We can combine the auth reducer into our store in `client/src/app.js`:

[{]: <helper> (diffStep 7.17)

#### [Step 7.17: Combine auth reducer with reducers](https://github.com/srtucker22/chatty/commit/a113517)

##### Changed client&#x2F;src&#x2F;app.js
<pre>

...

  navigationReducer,
  navigationMiddleware,
} from &#x27;./navigation&#x27;;
<b>import auth from &#x27;./reducers/auth.reducer&#x27;;</b>

const URL &#x3D; &#x27;localhost:8080&#x27;; // set your comp&#x27;s url here

</pre>
<pre>

...

  combineReducers({
    apollo: apolloReducer,
    nav: navigationReducer,
<b>    auth,</b>
  }),
  {}, // initial state
  composeWithDevTools(
</pre>

[}]: #

Now let’s add `thunk` middleware and persistence with `redux-persist` and `AsyncStorage` to our store in `client/src/app.js`:

[{]: <helper> (diffStep 7.18)

#### [Step 7.18: Add persistent storage](https://github.com/srtucker22/chatty/commit/501d269)

##### Changed client&#x2F;src&#x2F;app.js
<pre>

...

import React, { Component } from &#x27;react&#x27;;
<b>import {</b>
<b>  AsyncStorage,</b>
<b>} from &#x27;react-native&#x27;;</b>

import { ApolloClient } from &#x27;apollo-client&#x27;;
import { ApolloLink } from &#x27;apollo-link&#x27;;
</pre>
<pre>

...

import { WebSocketLink } from &#x27;apollo-link-ws&#x27;;
import { getMainDefinition } from &#x27;apollo-utilities&#x27;;
import { SubscriptionClient } from &#x27;subscriptions-transport-ws&#x27;;
<b>import { PersistGate } from &#x27;redux-persist/lib/integration/react&#x27;;</b>
<b>import { persistStore, persistCombineReducers } from &#x27;redux-persist&#x27;;</b>
<b>import thunk from &#x27;redux-thunk&#x27;;</b>

import AppWithNavigationState, {
  navigationReducer,
</pre>
<pre>

...


const URL &#x3D; &#x27;localhost:8080&#x27;; // set your comp&#x27;s url here

<b>const config &#x3D; {</b>
<b>  key: &#x27;root&#x27;,</b>
<b>  storage: AsyncStorage,</b>
<b>  blacklist: [&#x27;nav&#x27;, &#x27;apollo&#x27;], // don&#x27;t persist nav for now</b>
<b>};</b>
<b></b>
<b>const reducer &#x3D; persistCombineReducers(config, {</b>
<b>  apollo: apolloReducer,</b>
<b>  nav: navigationReducer,</b>
<b>  auth,</b>
<b>});</b>
<b></b>
const store &#x3D; createStore(
<b>  reducer,</b>
  {}, // initial state
  composeWithDevTools(
<b>    applyMiddleware(thunk, navigationMiddleware),</b>
  ),
);

<b>// persistent storage</b>
<b>const persistor &#x3D; persistStore(store);</b>
<b></b>
const cache &#x3D; new ReduxCache({ store });

const reduxLink &#x3D; new ReduxLink(store);
</pre>
<pre>

...

    return (
      &lt;ApolloProvider client&#x3D;{client}&gt;
        &lt;Provider store&#x3D;{store}&gt;
<b>          &lt;PersistGate persistor&#x3D;{persistor}&gt;</b>
<b>            &lt;AppWithNavigationState /&gt;</b>
<b>          &lt;/PersistGate&gt;</b>
        &lt;/Provider&gt;
      &lt;/ApolloProvider&gt;
    );
</pre>

[}]: #

We have set our store data (excluding `apollo`) to persist via React Native’s `AsyncStorage` and to automatically rehydrate the store when the client restarts the app. When the app restarts, a `REHYDRATE` action will execute asyncronously with all the data persisted from the last session. We need to handle that action and properly update our store in our `auth` reducer:

[{]: <helper> (diffStep 7.19)

#### [Step 7.19: Handle rehydration in auth reducer](https://github.com/srtucker22/chatty/commit/80e11df)

##### Changed client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
<pre>

...

<b>import { REHYDRATE } from &#x27;redux-persist&#x27;;</b>
import Immutable from &#x27;seamless-immutable&#x27;;

const initialState &#x3D; Immutable({
</pre>
<pre>

...


const auth &#x3D; (state &#x3D; initialState, action) &#x3D;&gt; {
  switch (action.type) {
<b>    case REHYDRATE:</b>
<b>      // convert persisted data to Immutable and confirm rehydration</b>
<b>      return Immutable(action.payload.auth || state)</b>
<b>        .set(&#x27;loading&#x27;, false);</b>
    default:
      return state;
  }
</pre>

[}]: #

The `auth` state will be `{ loading: true }` until we rehydrate our persisted state.

When the user successfully signs up or logs in, we need to store the user’s id and their JWT within auth. We also need to clear this information when they log out. Let’s create a constants folder `client/src/constants` and file `client/src/constants/constants.js` where we can start declaring Redux action types and write two for setting the current user and logging out:

[{]: <helper> (diffStep "7.20")

#### [Step 7.20: Create constants](https://github.com/srtucker22/chatty/commit/910d442)

##### Added client&#x2F;src&#x2F;constants&#x2F;constants.js
<pre>

...

<b>// auth constants</b>
<b>export const LOGOUT &#x3D; &#x27;LOGOUT&#x27;;</b>
<b>export const SET_CURRENT_USER &#x3D; &#x27;SET_CURRENT_USER&#x27;;</b>
</pre>

[}]: #

We can add these constants to our `auth` reducer now:

[{]: <helper> (diffStep 7.21)

#### [Step 7.21: Handle login/logout in auth reducer](https://github.com/srtucker22/chatty/commit/bd6a4b3)

##### Changed client&#x2F;src&#x2F;reducers&#x2F;auth.reducer.js
<pre>

...

import { REHYDRATE } from &#x27;redux-persist&#x27;;
import Immutable from &#x27;seamless-immutable&#x27;;

<b>import { LOGOUT, SET_CURRENT_USER } from &#x27;../constants/constants&#x27;;</b>
<b></b>
const initialState &#x3D; Immutable({
  loading: true,
});
</pre>
<pre>

...

  switch (action.type) {
    case REHYDRATE:
      // convert persisted data to Immutable and confirm rehydration
<b>      const { payload &#x3D; {} } &#x3D; action;</b>
<b>      return Immutable(payload.auth || state)</b>
        .set(&#x27;loading&#x27;, false);
<b>    case SET_CURRENT_USER:</b>
<b>      return state.merge(action.user);</b>
<b>    case LOGOUT:</b>
<b>      return Immutable({ loading: false });</b>
    default:
      return state;
  }
</pre>

[}]: #

The `SET_CURRENT_USER` and `LOGOUT` action types will need to get triggered by `ActionCreators`. Let’s put those in a new folder `client/src/actions` and a new file `client/src/actions/auth.actions.js`:

[{]: <helper> (diffStep 7.22)

#### [Step 7.22: Create auth actions](https://github.com/srtucker22/chatty/commit/9d583f7)

##### Added client&#x2F;src&#x2F;actions&#x2F;auth.actions.js
<pre>

...

<b>import { client } from &#x27;../app&#x27;;</b>
<b>import { SET_CURRENT_USER, LOGOUT } from &#x27;../constants/constants&#x27;;</b>
<b></b>
<b>export const setCurrentUser &#x3D; user &#x3D;&gt; ({</b>
<b>  type: SET_CURRENT_USER,</b>
<b>  user,</b>
<b>});</b>
<b></b>
<b>export const logout &#x3D; () &#x3D;&gt; {</b>
<b>  client.resetStore();</b>
<b>  return { type: LOGOUT };</b>
<b>};</b>
</pre>

[}]: #

When `logout` is called, we’ll clear all auth data by dispatching `LOGOUT` and also all data in the apollo store by calling [`client.resetStore`](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient.resetStore).

Let’s tie everything together. We’ll update the `Signin` screen to use our login and signup mutations, and dispatch `setCurrentUser` with the mutation results (the JWT and user’s id).

First we’ll create files for our `login` and `signup` mutations:

[{]: <helper> (diffStep 7.23)

#### [Step 7.23: Create login and signup mutations](https://github.com/srtucker22/chatty/commit/f6961c8)

##### Added client&#x2F;src&#x2F;graphql&#x2F;login.mutation.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>const LOGIN_MUTATION &#x3D; gql&#x60;</b>
<b>  mutation login($email: String!, $password: String!) {</b>
<b>    login(email: $email, password: $password) {</b>
<b>      id</b>
<b>      jwt</b>
<b>      username</b>
<b>    }</b>
<b>  }</b>
<b>&#x60;;</b>
<b></b>
<b>export default LOGIN_MUTATION;</b>
</pre>

##### Added client&#x2F;src&#x2F;graphql&#x2F;signup.mutation.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>const SIGNUP_MUTATION &#x3D; gql&#x60;</b>
<b>  mutation signup($email: String!, $password: String!) {</b>
<b>    signup(email: $email, password: $password) {</b>
<b>      id</b>
<b>      jwt</b>
<b>      username</b>
<b>    }</b>
<b>  }</b>
<b>&#x60;;</b>
<b></b>
<b>export default SIGNUP_MUTATION;</b>
</pre>

[}]: #

We connect these mutations and our Redux store to the `Signin` component with `compose` and `connect`:

[{]: <helper> (diffStep 7.24)

#### [Step 7.24: Add login and signup mutations to Signin screen](https://github.com/srtucker22/chatty/commit/7c47b0c)

##### Changed client&#x2F;src&#x2F;screens&#x2F;signin.screen.js
<pre>

...

import PropTypes from &#x27;prop-types&#x27;;
import {
  ActivityIndicator,
<b>  Alert,</b>
  KeyboardAvoidingView,
  Button,
  StyleSheet,
</pre>
<pre>

...

  TouchableOpacity,
  View,
} from &#x27;react-native&#x27;;
<b>import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b>import { connect } from &#x27;react-redux&#x27;;</b>
<b></b>
<b>import {</b>
<b>  setCurrentUser,</b>
<b>} from &#x27;../actions/auth.actions&#x27;;</b>
<b>import LOGIN_MUTATION from &#x27;../graphql/login.mutation&#x27;;</b>
<b>import SIGNUP_MUTATION from &#x27;../graphql/signup.mutation&#x27;;</b>

const styles &#x3D; StyleSheet.create({
  container: {
</pre>
<pre>

...

  },
});

<b>function capitalizeFirstLetter(string) {</b>
<b>  return string[0].toUpperCase() + string.slice(1);</b>
<b>}</b>
<b></b>
class Signin extends Component {
  static navigationOptions &#x3D; {
    title: &#x27;Chatty&#x27;,
</pre>
<pre>

...


  constructor(props) {
    super(props);
<b></b>
<b>    if (props.auth &amp;&amp; props.auth.jwt) {</b>
<b>      props.navigation.goBack();</b>
<b>    }</b>
<b></b>
    this.state &#x3D; {
      view: &#x27;login&#x27;,
    };
</pre>
<pre>

...

    this.switchView &#x3D; this.switchView.bind(this);
  }

<b>  componentWillReceiveProps(nextProps) {</b>
<b>    if (nextProps.auth.jwt) {</b>
<b>      nextProps.navigation.goBack();</b>
<b>    }</b>
<b>  }</b>
<b></b>
  login() {
<b>    const { email, password } &#x3D; this.state;</b>
<b></b>
<b>    this.setState({</b>
<b>      loading: true,</b>
<b>    });</b>
<b></b>
<b>    this.props.login({ email, password })</b>
<b>      .then(({ data: { login: user } }) &#x3D;&gt; {</b>
<b>        this.props.dispatch(setCurrentUser(user));</b>
<b>        this.setState({</b>
<b>          loading: false,</b>
<b>        });</b>
<b>      }).catch((error) &#x3D;&gt; {</b>
<b>        this.setState({</b>
<b>          loading: false,</b>
<b>        });</b>
<b>        Alert.alert(</b>
<b>          &#x60;${capitalizeFirstLetter(this.state.view)} error&#x60;,</b>
<b>          error.message,</b>
<b>          [</b>
<b>            { text: &#x27;OK&#x27;, onPress: () &#x3D;&gt; console.log(&#x27;OK pressed&#x27;) }, // eslint-disable-line no-console</b>
<b>            { text: &#x27;Forgot password&#x27;, onPress: () &#x3D;&gt; console.log(&#x27;Forgot Pressed&#x27;), style: &#x27;cancel&#x27; }, // eslint-disable-line no-console</b>
<b>          ],</b>
<b>        );</b>
<b>      });</b>
  }

  signup() {
<b>    this.setState({</b>
<b>      loading: true,</b>
<b>    });</b>
<b>    const { email, password } &#x3D; this.state;</b>
<b>    this.props.signup({ email, password })</b>
<b>      .then(({ data: { signup: user } }) &#x3D;&gt; {</b>
<b>        this.props.dispatch(setCurrentUser(user));</b>
<b>        this.setState({</b>
<b>          loading: false,</b>
<b>        });</b>
<b>      }).catch((error) &#x3D;&gt; {</b>
<b>        this.setState({</b>
<b>          loading: false,</b>
<b>        });</b>
<b>        Alert.alert(</b>
<b>          &#x60;${capitalizeFirstLetter(this.state.view)} error&#x60;,</b>
<b>          error.message,</b>
<b>          [{ text: &#x27;OK&#x27;, onPress: () &#x3D;&gt; console.log(&#x27;OK pressed&#x27;) }],  // eslint-disable-line no-console</b>
<b>        );</b>
<b>      });</b>
  }

  switchView() {
</pre>
<pre>

...

          onPress&#x3D;{this[view]}
          style&#x3D;{styles.submit}
          title&#x3D;{view &#x3D;&#x3D;&#x3D; &#x27;signup&#x27; ? &#x27;Sign up&#x27; : &#x27;Login&#x27;}
<b>          disabled&#x3D;{this.state.loading || !!this.props.auth.jwt}</b>
        /&gt;
        &lt;View style&#x3D;{styles.switchContainer}&gt;
          &lt;Text&gt;
</pre>
<pre>

...

  navigation: PropTypes.shape({
    goBack: PropTypes.func,
  }),
<b>  auth: PropTypes.shape({</b>
<b>    loading: PropTypes.bool,</b>
<b>    jwt: PropTypes.string,</b>
<b>  }),</b>
<b>  dispatch: PropTypes.func.isRequired,</b>
<b>  login: PropTypes.func.isRequired,</b>
<b>  signup: PropTypes.func.isRequired,</b>
};

<b>const login &#x3D; graphql(LOGIN_MUTATION, {</b>
<b>  props: ({ mutate }) &#x3D;&gt; ({</b>
<b>    login: ({ email, password }) &#x3D;&gt;</b>
<b>      mutate({</b>
<b>        variables: { email, password },</b>
<b>      }),</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>const signup &#x3D; graphql(SIGNUP_MUTATION, {</b>
<b>  props: ({ mutate }) &#x3D;&gt; ({</b>
<b>    signup: ({ email, password }) &#x3D;&gt;</b>
<b>      mutate({</b>
<b>        variables: { email, password },</b>
<b>      }),</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>  auth,</b>
<b>});</b>
<b></b>
<b>export default compose(</b>
<b>  login,</b>
<b>  signup,</b>
<b>  connect(mapStateToProps),</b>
<b>)(Signin);</b>
</pre>

[}]: #

We attached `auth` from our Redux store to `Signin` via `connect(mapStateToProps)`. When we sign up or log in, we call the associated mutation (`signup` or `login`), receive the JWT and id, and dispatch the data with `setCurrentUser`. In `componentWillReceiveProps`, once `auth.jwt` exists, we are logged in and pop the Screen. We’ve also included some simple error messages if things go wrong.

Let’s check it out! ![Signin Gif](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step7-24.gif)

# Apollo-Client Authentication Middleware
We need to add Authorization Headers to our GraphQL requests from React Native before we can resume retrieving data from our auth protected server. We accomplish this by using middleware that will attach the headers to every request before they are sent out. Middleware works very elegantly within the `apollo-link` ecosystem. We just need to add a couple new links! Fortunately, `apollo-link-context` and `apollo-link-error` are perfect for our requirements and work really nicely with our Redux setup. We can simply add the following in `client/src/app.js`:

```sh
npm i apollo-link-context apollo-link-error
```

[{]: <helper> (diffStep 7.25)

#### [Step 7.25: Add authentication middleware for requests](https://github.com/srtucker22/chatty/commit/8c0963e)

##### Changed client&#x2F;package.json
<pre>

...

		&quot;apollo-cache-redux&quot;: &quot;^0.1.0-alpha.7&quot;,
		&quot;apollo-client&quot;: &quot;^2.2.5&quot;,
		&quot;apollo-link&quot;: &quot;^1.1.0&quot;,
<b>		&quot;apollo-link-context&quot;: &quot;^1.0.5&quot;,</b>
		&quot;apollo-link-error&quot;: &quot;^1.0.7&quot;,
		&quot;apollo-link-http&quot;: &quot;^1.3.3&quot;,
		&quot;apollo-link-redux&quot;: &quot;^0.2.1&quot;,
</pre>

##### Changed client&#x2F;src&#x2F;app.js
<pre>

...

import { PersistGate } from &#x27;redux-persist/lib/integration/react&#x27;;
import { persistStore, persistCombineReducers } from &#x27;redux-persist&#x27;;
import thunk from &#x27;redux-thunk&#x27;;
<b>import { setContext } from &#x27;apollo-link-context&#x27;;</b>
<b>import _ from &#x27;lodash&#x27;;</b>

import AppWithNavigationState, {
  navigationReducer,
  navigationMiddleware,
} from &#x27;./navigation&#x27;;
import auth from &#x27;./reducers/auth.reducer&#x27;;
<b>import { logout } from &#x27;./actions/auth.actions&#x27;;</b>

const URL &#x3D; &#x27;localhost:8080&#x27;; // set your comp&#x27;s url here

</pre>
<pre>

...


const httpLink &#x3D; createHttpLink({ uri: &#x60;http://${URL}&#x60; });

<b>// middleware for requests</b>
<b>const middlewareLink &#x3D; setContext((req, previousContext) &#x3D;&gt; {</b>
<b>  // get the authentication token from local storage if it exists</b>
<b>  const { jwt } &#x3D; store.getState().auth;</b>
<b>  if (jwt) {</b>
<b>    return {</b>
<b>      headers: {</b>
<b>        authorization: &#x60;Bearer ${jwt}&#x60;,</b>
<b>      },</b>
<b>    };</b>
<b>  }</b>
<b></b>
<b>  return previousContext;</b>
<b>});</b>
<b></b>
// Create WebSocket client
export const wsClient &#x3D; new SubscriptionClient(&#x60;ws://${URL}/graphql&#x60;, {
  reconnect: true,
</pre>
<pre>

...

  reduxLink,
  errorLink,
  requestLink({
<b>    queryOrMutationLink: middlewareLink.concat(httpLink),</b>
    subscriptionLink: webSocketLink,
  }),
]);
</pre>

[}]: #

Before every request, we get the JWT from `auth` and stick it in the header. We can also run middleware *after* receiving responses to check for auth errors and log out the user if necessary (afterware?):

[{]: <helper> (diffStep 7.26)

#### [Step 7.26: Add authentication afterware for responses](https://github.com/srtucker22/chatty/commit/edd1589)

##### Changed client&#x2F;src&#x2F;app.js
<pre>

...


const reduxLink &#x3D; new ReduxLink(store);

const httpLink &#x3D; createHttpLink({ uri: &#x60;http://${URL}&#x60; });

// middleware for requests
</pre>
<pre>

...

  return previousContext;
});

<b>// afterware for responses</b>
<b>const errorLink &#x3D; onError(({ graphQLErrors, networkError }) &#x3D;&gt; {</b>
<b>  let shouldLogout &#x3D; false;</b>
<b>  if (graphQLErrors) {</b>
<b>    console.log({ graphQLErrors });</b>
<b>    graphQLErrors.forEach(({ message, locations, path }) &#x3D;&gt; {</b>
<b>      console.log({ message, locations, path });</b>
<b>      if (message &#x3D;&#x3D;&#x3D; &#x27;Unauthorized&#x27;) {</b>
<b>        shouldLogout &#x3D; true;</b>
<b>      }</b>
<b>    });</b>
<b></b>
<b>    if (shouldLogout) {</b>
<b>      store.dispatch(logout());</b>
<b>    }</b>
<b>  }</b>
<b>  if (networkError) {</b>
<b>    console.log(&#x27;[Network error]:&#x27;);</b>
<b>    console.log({ networkError });</b>
<b>    if (networkError.statusCode &#x3D;&#x3D;&#x3D; 401) {</b>
<b>      logout();</b>
<b>    }</b>
<b>  }</b>
<b>});</b>
<b></b>
// Create WebSocket client
export const wsClient &#x3D; new SubscriptionClient(&#x60;ws://${URL}/graphql&#x60;, {
  reconnect: true,
</pre>

[}]: #

We simply parse the error and dispatch `logout()` if we receive an `Unauthorized` response message.

# Subscriptions-Transport-WS Authentication
Luckily for us, `SubscriptionClient` has a nifty little feature that lets us lazily (on-demand) connect to our WebSocket by setting `lazy: true`. This flag means we will only try to connect the WebSocket when we make our first subscription call, which only happens in our app once the user is authenticated. When we make our connection call, we can pass the JWT credentials via `connectionParams`. When the user logs out, we’ll close the connection and lazily reconnect when a user log back in and resubscribes.

We can update `client/src/app.js` and `client/actions/auth.actions.js` as follows:

[{]: <helper> (diffStep 7.27)

#### [Step 7.27: Add lazy connecting to wsClient](https://github.com/srtucker22/chatty/commit/9cda19f)

##### Changed client&#x2F;src&#x2F;actions&#x2F;auth.actions.js
<pre>

...

<b>import { client, wsClient } from &#x27;../app&#x27;;</b>
import { SET_CURRENT_USER, LOGOUT } from &#x27;../constants/constants&#x27;;

export const setCurrentUser &#x3D; user &#x3D;&gt; ({
</pre>
<pre>

...


export const logout &#x3D; () &#x3D;&gt; {
  client.resetStore();
<b>  wsClient.unsubscribeAll(); // unsubscribe from all subscriptions</b>
<b>  wsClient.close(); // close the WebSocket connection</b>
  return { type: LOGOUT };
};
</pre>

##### Changed client&#x2F;src&#x2F;app.js
<pre>

...


// Create WebSocket client
export const wsClient &#x3D; new SubscriptionClient(&#x60;ws://${URL}/graphql&#x60;, {
<b>  lazy: true,</b>
  reconnect: true,
<b>  connectionParams() {</b>
<b>    // get the authentication token from local storage if it exists</b>
<b>    return { jwt: store.getState().auth.jwt };</b>
  },
});
</pre>

[}]: #

KaBLaM! We’re ready to start using auth across our app!

# Refactoring the Client for Authentication
Our final major hurdle is going to be refactoring all our client code to use the Queries and Mutations we modified for auth and to handle auth UI.

## Logout
To get our feet wet, let’s start by creating a new Screen instead of fixing up an existing one. Let’s create a new Screen for the Settings tab where we will show the current user’s details and give users the option to log out!

We’ll put our new Settings Screen in a new file `client/src/screens/settings.screen.js`:

[{]: <helper> (diffStep 7.28)

#### [Step 7.28: Create Settings Screen](https://github.com/srtucker22/chatty/commit/e93d860)

##### Added client&#x2F;src&#x2F;screens&#x2F;settings.screen.js
<pre>

...

<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import React, { Component } from &#x27;react&#x27;;</b>
<b>import {</b>
<b>  ActivityIndicator,</b>
<b>  Button,</b>
<b>  Image,</b>
<b>  StyleSheet,</b>
<b>  Text,</b>
<b>  TextInput,</b>
<b>  TouchableOpacity,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b>import { connect } from &#x27;react-redux&#x27;;</b>
<b>import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b></b>
<b>import USER_QUERY from &#x27;../graphql/user.query&#x27;;</b>
<b>import { logout } from &#x27;../actions/auth.actions&#x27;;</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    flex: 1,</b>
<b>  },</b>
<b>  email: {</b>
<b>    borderColor: &#x27;#777&#x27;,</b>
<b>    borderBottomWidth: 1,</b>
<b>    borderTopWidth: 1,</b>
<b>    paddingVertical: 8,</b>
<b>    paddingHorizontal: 16,</b>
<b>    fontSize: 16,</b>
<b>  },</b>
<b>  emailHeader: {</b>
<b>    backgroundColor: &#x27;#dbdbdb&#x27;,</b>
<b>    color: &#x27;#777&#x27;,</b>
<b>    paddingHorizontal: 16,</b>
<b>    paddingBottom: 6,</b>
<b>    paddingTop: 32,</b>
<b>    fontSize: 12,</b>
<b>  },</b>
<b>  loading: {</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>    flex: 1,</b>
<b>  },</b>
<b>  userImage: {</b>
<b>    width: 54,</b>
<b>    height: 54,</b>
<b>    borderRadius: 27,</b>
<b>  },</b>
<b>  imageContainer: {</b>
<b>    paddingRight: 20,</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>  },</b>
<b>  input: {</b>
<b>    color: &#x27;black&#x27;,</b>
<b>    height: 32,</b>
<b>  },</b>
<b>  inputBorder: {</b>
<b>    borderColor: &#x27;#dbdbdb&#x27;,</b>
<b>    borderBottomWidth: 1,</b>
<b>    borderTopWidth: 1,</b>
<b>    paddingVertical: 8,</b>
<b>  },</b>
<b>  inputInstructions: {</b>
<b>    paddingTop: 6,</b>
<b>    color: &#x27;#777&#x27;,</b>
<b>    fontSize: 12,</b>
<b>    flex: 1,</b>
<b>  },</b>
<b>  userContainer: {</b>
<b>    paddingLeft: 16,</b>
<b>  },</b>
<b>  userInner: {</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>    paddingVertical: 16,</b>
<b>    paddingRight: 16,</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>class Settings extends Component {</b>
<b>  static navigationOptions &#x3D; {</b>
<b>    title: &#x27;Settings&#x27;,</b>
<b>  };</b>
<b></b>
<b>  constructor(props) {</b>
<b>    super(props);</b>
<b></b>
<b>    this.state &#x3D; {};</b>
<b></b>
<b>    this.logout &#x3D; this.logout.bind(this);</b>
<b>  }</b>
<b></b>
<b>  logout() {</b>
<b>    this.props.dispatch(logout());</b>
<b>  }</b>
<b></b>
<b>  // eslint-disable-next-line</b>
<b>  updateUsername(username) {</b>
<b>    // eslint-disable-next-line</b>
<b>    console.log(&#x27;TODO: update username&#x27;);</b>
<b>  }</b>
<b></b>
<b>  render() {</b>
<b>    const { loading, user } &#x3D; this.props;</b>
<b></b>
<b>    // render loading placeholder while we fetch data</b>
<b>    if (loading || !user) {</b>
<b>      return (</b>
<b>        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;</b>
<b>          &lt;ActivityIndicator /&gt;</b>
<b>        &lt;/View&gt;</b>
<b>      );</b>
<b>    }</b>
<b></b>
<b>    return (</b>
<b>      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>        &lt;View style&#x3D;{styles.userContainer}&gt;</b>
<b>          &lt;View style&#x3D;{styles.userInner}&gt;</b>
<b>            &lt;TouchableOpacity style&#x3D;{styles.imageContainer}&gt;</b>
<b>              &lt;Image</b>
<b>                style&#x3D;{styles.userImage}</b>
<b>                source&#x3D;{{ uri: &#x27;https://reactjs.org/logo-og.png&#x27; }}</b>
<b>              /&gt;</b>
<b>              &lt;Text&gt;edit&lt;/Text&gt;</b>
<b>            &lt;/TouchableOpacity&gt;</b>
<b>            &lt;Text style&#x3D;{styles.inputInstructions}&gt;</b>
<b>              Enter your name and add an optional profile picture</b>
<b>            &lt;/Text&gt;</b>
<b>          &lt;/View&gt;</b>
<b>          &lt;View style&#x3D;{styles.inputBorder}&gt;</b>
<b>            &lt;TextInput</b>
<b>              onChangeText&#x3D;{username &#x3D;&gt; this.setState({ username })}</b>
<b>              placeholder&#x3D;{user.username}</b>
<b>              style&#x3D;{styles.input}</b>
<b>              defaultValue&#x3D;{user.username}</b>
<b>            /&gt;</b>
<b>          &lt;/View&gt;</b>
<b>        &lt;/View&gt;</b>
<b>        &lt;Text style&#x3D;{styles.emailHeader}&gt;EMAIL&lt;/Text&gt;</b>
<b>        &lt;Text style&#x3D;{styles.email}&gt;{user.email}&lt;/Text&gt;</b>
<b>        &lt;Button title&#x3D;&quot;Logout&quot; onPress&#x3D;{this.logout} /&gt;</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b></b>
<b>Settings.propTypes &#x3D; {</b>
<b>  auth: PropTypes.shape({</b>
<b>    loading: PropTypes.bool,</b>
<b>    jwt: PropTypes.string,</b>
<b>  }).isRequired,</b>
<b>  dispatch: PropTypes.func.isRequired,</b>
<b>  loading: PropTypes.bool,</b>
<b>  navigation: PropTypes.shape({</b>
<b>    navigate: PropTypes.func,</b>
<b>  }),</b>
<b>  user: PropTypes.shape({</b>
<b>    username: PropTypes.string,</b>
<b>  }),</b>
<b>};</b>
<b></b>
<b>const userQuery &#x3D; graphql(USER_QUERY, {</b>
<b>  skip: ownProps &#x3D;&gt; !ownProps.auth || !ownProps.auth.jwt,</b>
<b>  options: ({ auth }) &#x3D;&gt; ({ variables: { id: auth.id }, fetchPolicy: &#x27;cache-only&#x27; }),</b>
<b>  props: ({ data: { loading, user } }) &#x3D;&gt; ({</b>
<b>    loading, user,</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>  auth,</b>
<b>});</b>
<b></b>
<b>export default compose(</b>
<b>  connect(mapStateToProps),</b>
<b>  userQuery,</b>
<b>)(Settings);</b>
</pre>

[}]: #

The most important pieces of this code we need to focus on is any `auth` related code:
1. We connect `auth` from our Redux store to the component via `connect(mapStateToProps)`
2. We `skip` the `userQuery` unless we have a JWT (`ownProps.auth.jwt`)
3. We show a loading spinner until we’re done loading the user

Let’s add the `Settings` screen to our settings tab in `client/src/navigation.js`. We will also use `navigationReducer` to handle pushing the `Signin` Screen whenever the user logs out or starts the application without being authenticated:

[{]: <helper> (diffStep 7.29)

#### [Step 7.29: Add Settings screen and auth logic to Navigation](https://github.com/srtucker22/chatty/commit/9ae604b)

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>

...

import update from &#x27;immutability-helper&#x27;;
import { map } from &#x27;lodash&#x27;;
import { Buffer } from &#x27;buffer&#x27;;
<b>import { REHYDRATE } from &#x27;redux-persist&#x27;;</b>

import Groups from &#x27;./screens/groups.screen&#x27;;
import Messages from &#x27;./screens/messages.screen&#x27;;
</pre>
<pre>

...

import GroupDetails from &#x27;./screens/group-details.screen&#x27;;
import NewGroup from &#x27;./screens/new-group.screen&#x27;;
import Signin from &#x27;./screens/signin.screen&#x27;;
<b>import Settings from &#x27;./screens/settings.screen&#x27;;</b>

import { USER_QUERY } from &#x27;./graphql/user.query&#x27;;
import MESSAGE_ADDED_SUBSCRIPTION from &#x27;./graphql/message-added.subscription&#x27;;
</pre>
<pre>

...


import { wsClient } from &#x27;./app&#x27;;

<b>import { LOGOUT } from &#x27;./constants/constants&#x27;;</b>

// tabs in main screen
const MainScreenNavigator &#x3D; TabNavigator({
  Chats: { screen: Groups },
<b>  Settings: { screen: Settings },</b>
}, {
  initialRouteName: &#x27;Chats&#x27;,
});
</pre>
<pre>

...

	],
}));

<b>// reducer code</b>
export const navigationReducer &#x3D; (state &#x3D; initialState, action) &#x3D;&gt; {
<b>  let nextState &#x3D; AppNavigator.router.getStateForAction(action, state);</b>
<b>  switch (action.type) {</b>
<b>    case REHYDRATE:</b>
<b>      // convert persisted data to Immutable and confirm rehydration</b>
<b>      if (!action.payload || !action.payload.auth || !action.payload.auth.jwt) {</b>
<b>        const { routes, index } &#x3D; state;</b>
<b>        if (routes[index].routeName !&#x3D;&#x3D; &#x27;Signin&#x27;) {</b>
<b>          nextState &#x3D; AppNavigator.router.getStateForAction(</b>
<b>            NavigationActions.navigate({ routeName: &#x27;Signin&#x27; }),</b>
<b>            state,</b>
<b>          );</b>
<b>        }</b>
<b>      }</b>
<b>      break;</b>
<b>    case LOGOUT:</b>
<b>      const { routes, index } &#x3D; state;</b>
<b>      if (routes[index].routeName !&#x3D;&#x3D; &#x27;Signin&#x27;) {</b>
<b>        nextState &#x3D; AppNavigator.router.getStateForAction(</b>
<b>          NavigationActions.navigate({ routeName: &#x27;Signin&#x27; }),</b>
<b>          state,</b>
<b>        );</b>
<b>      }</b>
<b>      break;</b>
<b>    default:</b>
<b>      nextState &#x3D; AppNavigator.router.getStateForAction(action, state);</b>
<b>      break;</b>
<b>  }</b>

  // Simply return the original &#x60;state&#x60; if &#x60;nextState&#x60; is null or undefined.
  return nextState || state;
</pre>

[}]: #

Though it’s typically best practice to keep reducers pure (not triggering actions directly), we’ve made an exception with `NavigationActions` in our `navigationReducer` to keep the code a little simpler in this particular case.

Let’s run it!

![Logout Gif](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step7-29.gif)

## Refactoring Queries and Mutations
We need to update all our client-side Queries and Mutations to match our modified Schema. We also need to update the variables we pass to these Queries and Mutations through `graphql` and attach to components.

Let’s look at the `USER_QUERY` in `Groups` and `AppWithNavigationState` for a full example:

[{]: <helper> (diffStep "7.30")

#### [Step 7.30: Update userQuery with auth in Groups and Navigation](https://github.com/srtucker22/chatty/commit/dc3ad36)

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>

...

      }, this);
    }

<b>    if (nextProps.user &amp;&amp; nextProps.user.id &#x3D;&#x3D;&#x3D; nextProps.auth.id &amp;&amp;</b>
      (!this.props.user || nextProps.user.groups.length !&#x3D;&#x3D; this.props.user.groups.length)) {
      // unsubscribe from old

</pre>
<pre>

...

}

AppWithNavigationState.propTypes &#x3D; {
<b>  auth: PropTypes.shape({</b>
<b>    id: PropTypes.number,</b>
<b>    jwt: PropTypes.string,</b>
<b>  }),</b>
  dispatch: PropTypes.func.isRequired,
  nav: PropTypes.object.isRequired,
  refetch: PropTypes.func,
</pre>
<pre>

...

  }),
};

<b>const mapStateToProps &#x3D; ({ auth, nav }) &#x3D;&gt; ({</b>
<b>  auth,</b>
<b>  nav,</b>
});

const userQuery &#x3D; graphql(USER_QUERY, {
<b>  skip: ownProps &#x3D;&gt; !ownProps.auth || !ownProps.auth.jwt,</b>
<b>  options: ownProps &#x3D;&gt; ({ variables: { id: ownProps.auth.id } }),</b>
  props: ({ data: { loading, user, refetch, subscribeToMore } }) &#x3D;&gt; ({
    loading,
    user,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>

...

  TouchableHighlight,
  View,
} from &#x27;react-native&#x27;;
<b>import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
import moment from &#x27;moment&#x27;;
import Icon from &#x27;react-native-vector-icons/FontAwesome&#x27;;
<b>import { connect } from &#x27;react-redux&#x27;;</b>

import { USER_QUERY } from &#x27;../graphql/user.query&#x27;;

</pre>
<pre>

...

  onPress: PropTypes.func.isRequired,
};

class Group extends Component {
  constructor(props) {
    super(props);
</pre>
<pre>

...

    this.onRefresh &#x3D; this.onRefresh.bind(this);
  }

  onRefresh() {
    this.props.refetch();
    // faking unauthorized status
</pre>
<pre>

...

};

const userQuery &#x3D; graphql(USER_QUERY, {
<b>  skip: ownProps &#x3D;&gt; !ownProps.auth || !ownProps.auth.jwt,</b>
<b>  options: ownProps &#x3D;&gt; ({ variables: { id: ownProps.auth.id } }),</b>
  props: ({ data: { loading, networkStatus, refetch, user } }) &#x3D;&gt; ({
    loading, networkStatus, refetch, user,
  }),
});

<b>const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>  auth,</b>
<b>});</b>
<b></b>
<b>export default compose(</b>
<b>  connect(mapStateToProps),</b>
<b>  userQuery,</b>
<b>)(Groups);</b>
</pre>

[}]: #

1. We use `connect(mapStateToProps)` to attach `auth` from Redux to our component
2. We modify the `userQuery` options to pass `ownProps.auth.id` instead of the `1` placeholder
3. We change `skip` to use `ownProps.auth.jwt` to determine whether to run `userQuery`

We'll also have to make similar changes in `Messages`:

[{]: <helper> (diffStep 7.31)

#### [Step 7.31: Update Messages Screen and createMessage with auth](https://github.com/srtucker22/chatty/commit/466f528)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-message.mutation.js
<pre>

...

import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;

const CREATE_MESSAGE_MUTATION &#x3D; gql&#x60;
<b>  mutation createMessage($text: String!, $groupId: Int!) {</b>
<b>    createMessage(text: $text, groupId: $groupId) {</b>
      ... MessageFragment
    }
  }
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

import { Buffer } from &#x27;buffer&#x27;;
import _ from &#x27;lodash&#x27;;
import moment from &#x27;moment&#x27;;
<b>import { connect } from &#x27;react-redux&#x27;;</b>

import { wsClient } from &#x27;../app&#x27;;

</pre>
<pre>

...

  send(text) {
    this.props.createMessage({
      groupId: this.props.navigation.state.params.groupId,
      text,
    }).then(() &#x3D;&gt; {
      this.flatList.scrollToIndex({ index: 0, animated: true });
</pre>
<pre>

...

    return (
      &lt;Message
        color&#x3D;{this.state.usernameColors[message.from.username]}
<b>        isCurrentUser&#x3D;{message.from.id &#x3D;&#x3D;&#x3D; this.props.auth.id}</b>
        message&#x3D;{message}
      /&gt;
    );
</pre>
<pre>

...

}

Messages.propTypes &#x3D; {
<b>  auth: PropTypes.shape({</b>
<b>    id: PropTypes.number,</b>
<b>    username: PropTypes.string,</b>
<b>  }),</b>
  createMessage: PropTypes.func,
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
</pre>
<pre>

...

});

const createMessageMutation &#x3D; graphql(CREATE_MESSAGE_MUTATION, {
<b>  props: ({ ownProps, mutate }) &#x3D;&gt; ({</b>
<b>    createMessage: ({ text, groupId }) &#x3D;&gt;</b>
      mutate({
<b>        variables: { text, groupId },</b>
        optimisticResponse: {
          __typename: &#x27;Mutation&#x27;,
          createMessage: {
</pre>
<pre>

...

            createdAt: new Date().toISOString(), // the time is now!
            from: {
              __typename: &#x27;User&#x27;,
<b>              id: ownProps.auth.id,</b>
<b>              username: ownProps.auth.username,</b>
            },
            to: {
              __typename: &#x27;Group&#x27;,
</pre>
<pre>

...

          const userData &#x3D; store.readQuery({
            query: USER_QUERY,
            variables: {
<b>              id: ownProps.auth.id,</b>
            },
          });

</pre>
<pre>

...

            store.writeQuery({
              query: USER_QUERY,
              variables: {
<b>                id: ownProps.auth.id,</b>
              },
              data: userData,
            });
</pre>
<pre>

...

  }),
});

<b>const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>  auth,</b>
<b>});</b>
<b></b>
export default compose(
<b>  connect(mapStateToProps),</b>
  groupQuery,
  createMessageMutation,
)(Messages);
</pre>

[}]: #

We need to make similar changes in every other one of our components before we’re bug free. Here are all the major changes:

[{]: <helper> (diffStep 7.32)

#### [Step 7.32: Update Groups flow with auth](https://github.com/srtucker22/chatty/commit/5663124)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
<pre>

...

import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;

const CREATE_GROUP_MUTATION &#x3D; gql&#x60;
<b>  mutation createGroup($name: String!, $userIds: [Int!]) {</b>
<b>    createGroup(name: $name, userIds: $userIds) {</b>
      id
      name
      users {
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;leave-group.mutation.js
<pre>

...

import gql from &#x27;graphql-tag&#x27;;

const LEAVE_GROUP_MUTATION &#x3D; gql&#x60;
<b>  mutation leaveGroup($id: Int!) {</b>
<b>    leaveGroup(id: $id) {</b>
      id
    }
  }
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;finalize-group.screen.js
<pre>

...

import { graphql, compose } from &#x27;react-apollo&#x27;;
import { NavigationActions } from &#x27;react-navigation&#x27;;
import update from &#x27;immutability-helper&#x27;;
<b>import { connect } from &#x27;react-redux&#x27;;</b>

import { USER_QUERY } from &#x27;../graphql/user.query&#x27;;
import CREATE_GROUP_MUTATION from &#x27;../graphql/create-group.mutation&#x27;;
</pre>
<pre>

...


    createGroup({
      name: this.state.name,
      userIds: _.map(this.state.selected, &#x27;id&#x27;),
    }).then((res) &#x3D;&gt; {
      this.props.navigation.dispatch(goToNewGroup(res.data.createGroup));
</pre>
<pre>

...

};

const createGroupMutation &#x3D; graphql(CREATE_GROUP_MUTATION, {
<b>  props: ({ ownProps, mutate }) &#x3D;&gt; ({</b>
<b>    createGroup: ({ name, userIds }) &#x3D;&gt;</b>
      mutate({
<b>        variables: { name, userIds },</b>
        update: (store, { data: { createGroup } }) &#x3D;&gt; {
          // Read the data from our cache for this query.
<b>          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });</b>

          // Add our message from the mutation to the end.
          data.user.groups.push(createGroup);
</pre>
<pre>

...

          // Write our data back to the cache.
          store.writeQuery({
            query: USER_QUERY,
<b>            variables: { id: ownProps.auth.id },</b>
            data,
          });
        },
</pre>
<pre>

...

  }),
});

<b>const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>  auth,</b>
<b>});</b>
<b></b>
export default compose(
<b>  connect(mapStateToProps),</b>
  userQuery,
  createGroupMutation,
)(FinalizeGroup);
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;group-details.screen.js
<pre>

...

} from &#x27;react-native&#x27;;
import { graphql, compose } from &#x27;react-apollo&#x27;;
import { NavigationActions } from &#x27;react-navigation&#x27;;
<b>import { connect } from &#x27;react-redux&#x27;;</b>

import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;
import USER_QUERY from &#x27;../graphql/user.query&#x27;;
</pre>
<pre>

...

  leaveGroup() {
    this.props.leaveGroup({
      id: this.props.navigation.state.params.id,
<b>    })</b>
      .then(() &#x3D;&gt; {
        this.props.navigation.dispatch(resetAction);
      })
</pre>
<pre>

...

        variables: { id },
        update: (store, { data: { deleteGroup } }) &#x3D;&gt; {
          // Read the data from our cache for this query.
<b>          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });</b>

          // Add our message from the mutation to the end.
          data.user.groups &#x3D; data.user.groups.filter(g &#x3D;&gt; deleteGroup.id !&#x3D;&#x3D; g.id);
</pre>
<pre>

...

          // Write our data back to the cache.
          store.writeQuery({
            query: USER_QUERY,
<b>            variables: { id: ownProps.auth.id },</b>
            data,
          });
        },
</pre>
<pre>

...


const leaveGroupMutation &#x3D; graphql(LEAVE_GROUP_MUTATION, {
  props: ({ ownProps, mutate }) &#x3D;&gt; ({
<b>    leaveGroup: ({ id }) &#x3D;&gt;</b>
      mutate({
<b>        variables: { id },</b>
        update: (store, { data: { leaveGroup } }) &#x3D;&gt; {
          // Read the data from our cache for this query.
<b>          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: ownProps.auth.id } });</b>

          // Add our message from the mutation to the end.
          data.user.groups &#x3D; data.user.groups.filter(g &#x3D;&gt; leaveGroup.id !&#x3D;&#x3D; g.id);
</pre>
<pre>

...

          // Write our data back to the cache.
          store.writeQuery({
            query: USER_QUERY,
<b>            variables: { id: ownProps.auth.id },</b>
            data,
          });
        },
</pre>
<pre>

...

  }),
});

<b>const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>  auth,</b>
<b>});</b>
<b></b>
export default compose(
<b>  connect(mapStateToProps),</b>
  groupQuery,
  deleteGroupMutation,
  leaveGroupMutation,
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;new-group.screen.js
<pre>

...

import AlphabetListView from &#x27;react-native-alpha-listview&#x27;;
import update from &#x27;immutability-helper&#x27;;
import Icon from &#x27;react-native-vector-icons/FontAwesome&#x27;;
<b>import { connect } from &#x27;react-redux&#x27;;</b>

import SelectedUserList from &#x27;../components/selected-user-list.component&#x27;;
import USER_QUERY from &#x27;../graphql/user.query&#x27;;
</pre>
<pre>

...

};

const userQuery &#x3D; graphql(USER_QUERY, {
<b>  options: ownProps &#x3D;&gt; ({ variables: { id: ownProps.auth.id } }),</b>
  props: ({ data: { loading, user } }) &#x3D;&gt; ({
    loading, user,
  }),
});

<b>const mapStateToProps &#x3D; ({ auth }) &#x3D;&gt; ({</b>
<b>  auth,</b>
<b>});</b>
<b></b>
export default compose(
<b>  connect(mapStateToProps),</b>
  userQuery,
)(NewGroup);
</pre>

[}]: #

[{]: <helper> (diffStep 7.33)

#### [Step 7.33: Update messageAdded flow with auth](https://github.com/srtucker22/chatty/commit/9d9e9df)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;message-added.subscription.js
<pre>

...

import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;

const MESSAGE_ADDED_SUBSCRIPTION &#x3D; gql&#x60;
<b>  subscription onMessageAdded($groupIds: [Int]){</b>
<b>    messageAdded(groupIds: $groupIds){</b>
      ... MessageFragment
    }
  }
</pre>

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>

...

      return subscribeToMore({
        document: MESSAGE_ADDED_SUBSCRIPTION,
        variables: {
          groupIds: map(user.groups, &#x27;id&#x27;),
        },
        updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

        this.subscription &#x3D; nextProps.subscribeToMore({
          document: MESSAGE_ADDED_SUBSCRIPTION,
          variables: {
            groupIds: [nextProps.navigation.state.params.groupId],
          },
          updateQuery: (previousResult, { subscriptionData }) &#x3D;&gt; {
</pre>

[}]: #

When everything is said and done, we should have a beautifully running Chatty app 📱‼️‼️

![Chatty Gif](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step7-32.gif)

# 🎉 CONGRATULATIONS!!! 🎉
We made it! We made a secure, real-time chat app with React Native and GraphQL. How cool is that?! More importantly, we now have the skills and knowhow to make pretty much anything we want with some of the best tools out there.

I hope this series has been at least a little helpful in furthering your growth as a developer. I’m really stoked and humbled at the reception it has been getting, and I want to continue to do everything I can to make it the best it can be.

With that in mind, if you have any suggestions for making this series better, please leave your feedback!


[//]: # (foot-start)

[{]: <helper> (navStep)

| [< Previous Step](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/modified-medium/step6.md) | [Next Step >](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/modified-medium/step8.md) |
|:--------------------------------|--------------------------------:|

[}]: #

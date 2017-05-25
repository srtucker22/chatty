# Step 1: Setup

[//]: # (head-end)


This is the first blog in a multipart series where we will be building Chatty, a WhatsApp clone, using [React Native](https://facebook.github.io/react-native/) and [Apollo](http://dev.apollodata.com/).

# Overview
Each part of this series will be focused on teaching a core concept of Apollo or React Native. We’ll start from scratch, and by the end of the series, we’ll have a kick-ass group messaging application with real-time updates. Future posts beyond the core series will cover more complex features like push notifications, file uploads, and query optimizations.

Since we are using shiny new tech, this series will be a living document. I will update each post as the tools we use continue to advance. My goal is to use this series as a best practices model for building a complex application using some of the best software available.

With that in mind, if you have any suggestions for making this series better, please leave your feedback!

# The Stack
Chatty will use the following stack:
* Server: Express
* Client: React Native
* Middleware: Apollo (GraphQL)
* Database: SQL (sqlite to start)

This is a pretty awesome stack for building complex real-time native applications.

For those of you who are new to Apollo, I just want to point out some of the coolest built-in features for [Apollo with React](http://dev.apollodata.com/react/):
* Smart query caching (client side state gets updated and cached with each query/mutation)
* Subscriptions (realtime updates pushed by server)
* Optimistic UI (UI that predicts how the server will respond to a request)
* SSR support
* Prefetching

That’s a ton of buzzwords! In the end, what that all really adds up to is our app will be data driven, really fast for users, and get real-time updates as they happen.

# Part 1 Goals
Here’s what we are going to accomplish in this first tutorial:
1. Set up our dev environment
2. Start a basic express server
3. Create our first GraphQL Schema
4. Start a basic React Native client
5. Connect our express server and RN client with Apollo

# Getting started
For this tutorial series, we’re going to start from absolute scratch. My style is to keep everything really simple and refactor as we add complexity.
Let’s start with this basic directory structure:
```
/chatty
  /node_modules
  package.json
  /server
    ... express files
  /client
    /node_modules
    package.json
    ... RN files
```
We will keep our React Native code separate from our server code. This will also keep server dependencies separate from React Native dependencies, which means **we will have 2 `package.json` files**. That may sound weird/bad, but trying to get everything set up with one packager is a huge hassle. It will also save us from a few other issues down the line.

Here’s the terminal code to get us started:
```
# make our directory
mkdir chatty
cd chatty

# start yarn package managing
yarn init

# build some server folders and files
mkdir server
cd server
touch index.js
```
## Setting up the dev environment
We’ll start setting up our dev env with the following features:
1. Server stays running and reloads when we modify code
2. ES6 syntax including import syntax in our server code
3. ESLint with AirBNB presets
```
# from root dir..

# add dev dependencies
yarn global add eslint-cli # eslint is an excellent linter

yarn add --dev babel-cli babel-preset-es2015 babel-preset-stage-2 nodemon eslint babel-eslint
eslint --init  # choose airbnb preset or your preferred setup
```

My `eslintrc.js` file looks like this:

[{]: <helper> (diffStep 1.2 files=".eslintrc.js")

#### Step 1.2: Add eslint, babel, and nodemon

##### Added .eslintrc.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊module.exports &#x3D; {</b>
<b>+┊  ┊ 2┊    &quot;parser&quot;: &quot;babel-eslint&quot;,</b>
<b>+┊  ┊ 3┊    &quot;extends&quot;: &quot;airbnb&quot;,</b>
<b>+┊  ┊ 4┊    &quot;plugins&quot;: [</b>
<b>+┊  ┊ 5┊        &quot;react&quot;,</b>
<b>+┊  ┊ 6┊        &quot;jsx-a11y&quot;,</b>
<b>+┊  ┊ 7┊        &quot;import&quot;</b>
<b>+┊  ┊ 8┊    ],</b>
<b>+┊  ┊ 9┊    &quot;rules&quot;: {</b>
<b>+┊  ┊10┊        &quot;react/jsx-filename-extension&quot;: [1, { &quot;extensions&quot;: [&quot;.js&quot;, &quot;.jsx&quot;] }],</b>
<b>+┊  ┊11┊        &quot;react/require-default-props&quot;: [0],</b>
<b>+┊  ┊12┊        &quot;react/no-unused-prop-types&quot;: [2, {</b>
<b>+┊  ┊13┊            &quot;skipShapeProps&quot;: true</b>
<b>+┊  ┊14┊        }],</b>
<b>+┊  ┊15┊        &quot;react/no-multi-comp&quot;: [0],</b>
<b>+┊  ┊16┊        &quot;no-bitwise&quot;: [0],</b>
<b>+┊  ┊17┊    },</b>
<b>+┊  ┊18┊};🚫↵</b>
</pre>

[}]: #

Create our start script inside `package.json`:

[{]: <helper> (diffStep 1.3 files="package.json")

#### Step 1.3: Create start script

##### Changed package.json
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 7┊ 7┊  &quot;repository&quot;: &quot;https://github.com/srtucker22/chatty.git&quot;,
 ┊ 8┊ 8┊  &quot;author&quot;: &quot;Simon Tucker &lt;srtucker22@gmail.com&gt;&quot;,
 ┊ 9┊ 9┊  &quot;license&quot;: &quot;MIT&quot;,
<b>+┊  ┊10┊  &quot;scripts&quot;: {</b>
<b>+┊  ┊11┊    &quot;start&quot;: &quot;nodemon --watch server --watch package.json server/index.js --exec babel-node --presets es2015,stage-2&quot;</b>
<b>+┊  ┊12┊  },</b>
 ┊10┊13┊  &quot;devDependencies&quot;: {
 ┊11┊14┊    &quot;babel-cli&quot;: &quot;^6.24.1&quot;,
 ┊12┊15┊    &quot;babel-eslint&quot;: &quot;^8.2.1&quot;,
</pre>

[}]: #

## Starting the Express server
Let’s import express in `index.js` using ES6 syntax.
1. `yarn add express`
2. Add the following to `index.js`:

[{]: <helper> (diffStep 1.4 files="index.js")

#### Step 1.4: Add express

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊import express from &#x27;express&#x27;;</b>
<b>+┊ ┊2┊</b>
<b>+┊ ┊3┊const PORT &#x3D; 8080;</b>
<b>+┊ ┊4┊</b>
<b>+┊ ┊5┊const app &#x3D; express();</b>
<b>+┊ ┊6┊</b>
<b>+┊ ┊7┊app.listen(PORT, () &#x3D;&gt; console.log(&#x60;Server is now running on http://localhost:${PORT}&#x60;));</b>
</pre>

[}]: #

Quickly verify our setup works by running `yarn start`.

We have a great starting point. Our start script will transpile ES6 code, spin up our express server, and refresh as we make changes to server code. Nice!

## Adding GraphQL to Express
[GraphQL](http://graphql.org/) in a nutshell is a query language for APIs. It’s a middleware that sits between your server side data and your client. It allows your client to query for exactly what it needs in one single trip and nothing more. You can check out [GraphQL’s homepage](http://graphql.org/) for some sweet visualizations illustrating why GraphQL is so cool.

We’ll start by creating a basic GraphQL Schema. A Schema establishes the data types the client can request and how the client is allowed to request them.

We’ll create a new folder `/server/data` and add a new file `schema.js`:

[{]: <helper> (diffStep 1.5)

#### Step 1.5: Create basic schema

##### Added server&#x2F;data&#x2F;schema.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊export const Schema &#x3D; [</b>
<b>+┊  ┊ 2┊  &#x60;type Query {</b>
<b>+┊  ┊ 3┊    testString: String</b>
<b>+┊  ┊ 4┊  }</b>
<b>+┊  ┊ 5┊  schema {</b>
<b>+┊  ┊ 6┊    query: Query</b>
<b>+┊  ┊ 7┊  }&#x60;,</b>
<b>+┊  ┊ 8┊];</b>
<b>+┊  ┊ 9┊</b>
<b>+┊  ┊10┊export default Schema;</b>
</pre>

[}]: #

Apollo requires a list of strings written in GraphQL’s language to establish a Schema. This Schema will just be a basic placeholder for now. We will add more advanced and meaningful Schemas in the next tutorial.

We also need our Schema to work with data. A great way to get Schemas up and running is by mocking data. Mocking data also happens to be useful for testing, so it’s good practice to start using mocks with Schemas before attaching real data like a database or 3rd party API.

We’ll add the file `/server/data/mocks.js`:

[{]: <helper> (diffStep 1.6)

#### Step 1.6: Create basic mocks

##### Added server&#x2F;data&#x2F;mocks.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊ ┊1┊export const Mocks &#x3D; {</b>
<b>+┊ ┊2┊  String: () &#x3D;&gt; &#x27;It works!&#x27;,</b>
<b>+┊ ┊3┊};</b>
<b>+┊ ┊4┊</b>
<b>+┊ ┊5┊export default Mocks;</b>
</pre>

[}]: #

Using the `Mocks` Object, we will be able to convert all Strings returned by GraphQL queries to “It works!”

We want to add a GraphQL endpoint to our server in `server/index.js` so clients can use GraphQL with our server. First we need to add the following dependencies:

```
yarn add body-parser graphql graphql-server-express graphql-tools
```

We’ll rewrite `server/index.js` as follows (explanation below):

[{]: <helper> (diffStep 1.7 files="index.js")

#### Step 1.7: Add graphqlExpress

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import express from &#x27;express&#x27;;
<b>+┊  ┊ 2┊import { graphqlExpress, graphiqlExpress } from &#x27;apollo-server-express&#x27;;</b>
<b>+┊  ┊ 3┊import { makeExecutableSchema, addMockFunctionsToSchema } from &#x27;graphql-tools&#x27;;</b>
<b>+┊  ┊ 4┊import bodyParser from &#x27;body-parser&#x27;;</b>
<b>+┊  ┊ 5┊import { createServer } from &#x27;http&#x27;;</b>
 ┊ 2┊ 6┊
<b>+┊  ┊ 7┊import { Schema } from &#x27;./data/schema&#x27;;</b>
<b>+┊  ┊ 8┊import { Mocks } from &#x27;./data/mocks&#x27;;</b>
 ┊ 4┊ 9┊
<b>+┊  ┊10┊const GRAPHQL_PORT &#x3D; 8080;</b>
 ┊ 5┊11┊const app &#x3D; express();
 ┊ 6┊12┊
<b>+┊  ┊13┊const executableSchema &#x3D; makeExecutableSchema({</b>
<b>+┊  ┊14┊  typeDefs: Schema,</b>
<b>+┊  ┊15┊});</b>
<b>+┊  ┊16┊</b>
<b>+┊  ┊17┊addMockFunctionsToSchema({</b>
<b>+┊  ┊18┊  schema: executableSchema,</b>
<b>+┊  ┊19┊  mocks: Mocks,</b>
<b>+┊  ┊20┊  preserveResolvers: true,</b>
<b>+┊  ┊21┊});</b>
<b>+┊  ┊22┊</b>
<b>+┊  ┊23┊// &#x60;context&#x60; must be an object and can&#x27;t be undefined when using connectors</b>
<b>+┊  ┊24┊app.use(&#x27;/graphql&#x27;, bodyParser.json(), graphqlExpress({</b>
<b>+┊  ┊25┊  schema: executableSchema,</b>
<b>+┊  ┊26┊  context: {}, // at least(!) an empty object</b>
<b>+┊  ┊27┊}));</b>
<b>+┊  ┊28┊</b>
<b>+┊  ┊29┊app.use(&#x27;/graphiql&#x27;, graphiqlExpress({</b>
<b>+┊  ┊30┊  endpointURL: &#x27;/graphql&#x27;,</b>
<b>+┊  ┊31┊}));</b>
<b>+┊  ┊32┊</b>
<b>+┊  ┊33┊const graphQLServer &#x3D; createServer(app);</b>
<b>+┊  ┊34┊</b>
<b>+┊  ┊35┊graphQLServer.listen(GRAPHQL_PORT, () &#x3D;&gt; console.log(&#x60;GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}/graphql&#x60;));</b>
</pre>

[}]: #

What we’ve done is add Apollo’s `graphqlExpress` and `graphiqlExpress` middleware for the `/graphql` endpoint. The `graphqlExpress` middleware enables clients to retrieve data by querying with our Schema. However, since we don’t have real data yet, we can use `Mocks` to fake the data when our schema is queried by using `addMockFunctionsToSchema`.

We’ve also added a second endpoint `/graphiql`, which uses the `graphiqlExpress` middleware. This middleware connects to our GraphQL endpoint and displays an UI for sending GraphQL queries to our server, called GraphIQL.

Let’s test it all out. Open `http://localhost:8080/graphiql` and you should see the GraphIQL interface. Type in `{testString}` and you should get back the proper response:
![GraphIQL Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step1-7.png)

Great! So now we have a server that runs the most basic GraphQL. We could build up our GraphQL backend a bit more, but I’d prefer to connect our server and React Native client before we make our Schema any more complex.

# Starting the React Native client
First we’ll download the dependencies and initialize our React Native app. For the sake of brevity, I’m going to focus on iOS, but all our code should also work with Android.

```
# from root dir...
yarn global add react-native-cli

# initialize RN with name chatty
react-native init chatty

# change name of RN folder to client
mv chatty client

# run the app in simulator
cd client
react-native run-ios # and grab a snack or something cause this might take a while the first run...
```
Running the initialization will create an `index.ios.js` file. In this file is boilerplate code that creates a React component and registers it with `AppRegistry`, which renders the component.

Let’s pull out the `Chatty` component from `index.ios.js` and stick it in its own file. I prefer to organize my files by type rather than feature, but you’re welcome to organize differently if you feel strongly about it.

So I’m going to place the `Chatty` component code into `client/src/app.js` and rename the component `App`.

[{]: <helper> (diffStep 1.9)

#### Step 1.9: Move app code to /src

##### Changed client&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊import { AppRegistry } from &#x27;react-native&#x27;;
<b>+┊ ┊2┊import App from &#x27;./src/app&#x27;;</b>
 ┊3┊3┊
 ┊4┊4┊AppRegistry.registerComponent(&#x27;chatty&#x27;, () &#x3D;&gt; App);
</pre>

##### Changed client&#x2F;App.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 9┊ 9┊  Platform,
 ┊10┊10┊  StyleSheet,
 ┊11┊11┊  Text,
<b>+┊  ┊12┊  View,</b>
 ┊13┊13┊} from &#x27;react-native&#x27;;
 ┊14┊14┊
 ┊15┊15┊const instructions &#x3D; Platform.select({
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊19┊19┊    &#x27;Shake or press menu button for dev menu&#x27;,
 ┊20┊20┊});
 ┊21┊21┊
<b>+┊  ┊22┊export default class App extends Component {</b>
 ┊24┊23┊  render() {
 ┊25┊24┊    return (
 ┊26┊25┊      &lt;View style&#x3D;{styles.container}&gt;
</pre>

[}]: #

## Adding Apollo to React Native

We’re going to modify `app.component.js` to use [React-Apollo](http://dev.apollodata.com/react/) and [Redux](http://redux.js.org/). While Apollo can be used sans Redux, the developer experience for React Native is much sweeter with Redux for monitoring our app's state, as you'll soon see.

We need to add a bunch of Apollo packages and a couple Redux ones:
```
# **make sure we're adding all react native and client related packages to package.json in the client folder!!!**
cd client

yarn add apollo-cache-redux apollo-client apollo-link apollo-link-http apollo-link-redux graphql graphql-tag react-apollo react-redux redux redux-devtools-extension
```
We need to do the following:
1. Create a Redux store
2. Create an Apollo client
3. Connect our Apollo client to our GraphQL endpoint via the `apollo-link-http`
4. Connect Redux to our Apollo workflow via `apollo-link-redux`. This will let us track Apollo events as Redux actions!
5. Set our Apollo client's data store (cache) to Redux via `apollo-cache-redux`

We can also swap out `compose` for `composeWithDevTools`, which will let us observe our Redux state remotely via [React Native Debugger](https://github.com/jhen0409/react-native-debugger).

[{]: <helper> (diffStep "1.10")

#### Step 1.10: Add ApolloClient

##### Changed client&#x2F;package.json
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊{
<b>+┊  ┊ 2┊	&quot;name&quot;: &quot;chatty&quot;,</b>
<b>+┊  ┊ 3┊	&quot;version&quot;: &quot;0.0.1&quot;,</b>
<b>+┊  ┊ 4┊	&quot;private&quot;: true,</b>
<b>+┊  ┊ 5┊	&quot;scripts&quot;: {</b>
<b>+┊  ┊ 6┊		&quot;start&quot;: &quot;node node_modules/react-native/local-cli/cli.js start&quot;,</b>
<b>+┊  ┊ 7┊		&quot;test&quot;: &quot;jest&quot;</b>
<b>+┊  ┊ 8┊	},</b>
<b>+┊  ┊ 9┊	&quot;dependencies&quot;: {</b>
<b>+┊  ┊10┊		&quot;apollo-cache-redux&quot;: &quot;^0.1.0-alpha.7&quot;,</b>
<b>+┊  ┊11┊		&quot;apollo-client&quot;: &quot;^2.2.5&quot;,</b>
<b>+┊  ┊12┊		&quot;apollo-link&quot;: &quot;^1.1.0&quot;,</b>
<b>+┊  ┊13┊		&quot;apollo-link-http&quot;: &quot;^1.3.3&quot;,</b>
<b>+┊  ┊14┊		&quot;apollo-link-redux&quot;: &quot;^0.2.1&quot;,</b>
<b>+┊  ┊15┊		&quot;graphql&quot;: &quot;^0.12.3&quot;,</b>
<b>+┊  ┊16┊		&quot;graphql-tag&quot;: &quot;^2.4.2&quot;,</b>
<b>+┊  ┊17┊		&quot;react&quot;: &quot;^16.3.0-alpha.1&quot;,</b>
<b>+┊  ┊18┊		&quot;react-apollo&quot;: &quot;^2.0.4&quot;,</b>
<b>+┊  ┊19┊		&quot;react-native&quot;: &quot;0.54.2&quot;,</b>
<b>+┊  ┊20┊		&quot;react-redux&quot;: &quot;^5.0.5&quot;,</b>
<b>+┊  ┊21┊		&quot;redux&quot;: &quot;^3.7.2&quot;,</b>
<b>+┊  ┊22┊		&quot;redux-devtools-extension&quot;: &quot;^2.13.2&quot;</b>
<b>+┊  ┊23┊	},</b>
<b>+┊  ┊24┊	&quot;devDependencies&quot;: {</b>
 ┊14┊25┊    &quot;babel-jest&quot;: &quot;22.4.1&quot;,
 ┊15┊26┊    &quot;babel-preset-react-native&quot;: &quot;4.0.0&quot;,
 ┊16┊27┊    &quot;jest&quot;: &quot;22.4.2&quot;,
 ┊17┊28┊    &quot;react-test-renderer&quot;: &quot;16.2.0&quot;
<b>+┊  ┊29┊	},</b>
<b>+┊  ┊30┊	&quot;jest&quot;: {</b>
<b>+┊  ┊31┊		&quot;preset&quot;: &quot;react-native&quot;</b>
<b>+┊  ┊32┊	}</b>
 ┊22┊33┊}
</pre>

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊7┊1┊import React, { Component } from &#x27;react&#x27;;
 ┊8┊2┊import {
 ┊9┊3┊  Platform,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊12┊ 6┊  View,
 ┊13┊ 7┊} from &#x27;react-native&#x27;;
 ┊14┊ 8┊
<b>+┊  ┊ 9┊import { ApolloClient } from &#x27;apollo-client&#x27;;</b>
<b>+┊  ┊10┊import { ApolloLink } from &#x27;apollo-link&#x27;;</b>
<b>+┊  ┊11┊import { ApolloProvider } from &#x27;react-apollo&#x27;;</b>
<b>+┊  ┊12┊import { composeWithDevTools } from &#x27;redux-devtools-extension&#x27;;</b>
<b>+┊  ┊13┊import { createHttpLink } from &#x27;apollo-link-http&#x27;;</b>
<b>+┊  ┊14┊import { createStore, combineReducers } from &#x27;redux&#x27;;</b>
<b>+┊  ┊15┊import { Provider } from &#x27;react-redux&#x27;;</b>
<b>+┊  ┊16┊import { ReduxCache, apolloReducer } from &#x27;apollo-cache-redux&#x27;;</b>
<b>+┊  ┊17┊import ReduxLink from &#x27;apollo-link-redux&#x27;;</b>
<b>+┊  ┊18┊</b>
<b>+┊  ┊19┊const URL &#x3D; &#x27;localhost:8080&#x27;; // set your comp&#x27;s url here</b>
<b>+┊  ┊20┊</b>
<b>+┊  ┊21┊const store &#x3D; createStore(</b>
<b>+┊  ┊22┊  combineReducers({</b>
<b>+┊  ┊23┊    apollo: apolloReducer,</b>
<b>+┊  ┊24┊  }),</b>
<b>+┊  ┊25┊  {}, // initial state</b>
<b>+┊  ┊26┊  composeWithDevTools(),</b>
<b>+┊  ┊27┊);</b>
<b>+┊  ┊28┊</b>
<b>+┊  ┊29┊const cache &#x3D; new ReduxCache({ store });</b>
<b>+┊  ┊30┊</b>
<b>+┊  ┊31┊const reduxLink &#x3D; new ReduxLink(store);</b>
<b>+┊  ┊32┊</b>
<b>+┊  ┊33┊const httpLink &#x3D; createHttpLink({ uri: &#x60;http://${URL}/graphql&#x60; });</b>
<b>+┊  ┊34┊</b>
<b>+┊  ┊35┊const link &#x3D; ApolloLink.from([</b>
<b>+┊  ┊36┊  reduxLink,</b>
<b>+┊  ┊37┊  httpLink,</b>
<b>+┊  ┊38┊]);</b>
<b>+┊  ┊39┊</b>
<b>+┊  ┊40┊export const client &#x3D; new ApolloClient({</b>
<b>+┊  ┊41┊  link,</b>
<b>+┊  ┊42┊  cache,</b>
<b>+┊  ┊43┊});</b>
<b>+┊  ┊44┊</b>
 ┊15┊45┊const instructions &#x3D; Platform.select({
 ┊16┊46┊  ios: &#x27;Press Cmd+R to reload,\n&#x27; +
 ┊17┊47┊    &#x27;Cmd+D or shake for dev menu&#x27;,
</pre>

[}]: #

Finally, we wrap our `App` component in the `ApolloProvider` component from `react-apollo`. `ApolloProvider` connects our app to Redux and Apollo at the same time.

[{]: <helper> (diffStep 1.11)

#### Step 1.11: Add ApolloProvider to App

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊52┊52┊export default class App extends Component {
 ┊53┊53┊  render() {
 ┊54┊54┊    return (
<b>+┊  ┊55┊      &lt;ApolloProvider client&#x3D;{client}&gt;</b>
<b>+┊  ┊56┊        &lt;Provider store&#x3D;{store}&gt;</b>
<b>+┊  ┊57┊          &lt;View style&#x3D;{styles.container}&gt;</b>
<b>+┊  ┊58┊            &lt;Text style&#x3D;{styles.welcome}&gt;</b>
<b>+┊  ┊59┊              Welcome to React Native!</b>
<b>+┊  ┊60┊            &lt;/Text&gt;</b>
<b>+┊  ┊61┊            &lt;Text style&#x3D;{styles.instructions}&gt;</b>
<b>+┊  ┊62┊              To get started, edit App.js</b>
<b>+┊  ┊63┊            &lt;/Text&gt;</b>
<b>+┊  ┊64┊            &lt;Text style&#x3D;{styles.instructions}&gt;</b>
<b>+┊  ┊65┊              {instructions}</b>
<b>+┊  ┊66┊            &lt;/Text&gt;</b>
<b>+┊  ┊67┊          &lt;/View&gt;</b>
<b>+┊  ┊68┊        &lt;/Provider&gt;</b>
<b>+┊  ┊69┊      &lt;/ApolloProvider&gt;</b>
 ┊66┊70┊    );
 ┊67┊71┊  }
 ┊68┊72┊}
</pre>

[}]: #

If we reload the app `(CMD + R)`, there hopefully should be no errors in the simulator. We can check if everything is hooked up properly by opening Redux Native Debugger and confirming the Redux store includes `apollo`: ![Redux Devtools Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step1-11.png)


[//]: # (foot-start)

[{]: <helper> (navStep)

⟸ <a href="../../../README.md">INTRO</a> <b>║</b> <a href="step2.md">NEXT STEP</a> ⟹

[}]: #

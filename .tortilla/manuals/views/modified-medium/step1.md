# Step 1: Setup

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

...

<b>module.exports &#x3D; {</b>
<b>    &quot;parser&quot;: &quot;babel-eslint&quot;,</b>
<b>    &quot;extends&quot;: &quot;airbnb&quot;,</b>
<b>    &quot;plugins&quot;: [</b>
<b>        &quot;react&quot;,</b>
<b>        &quot;jsx-a11y&quot;,</b>
<b>        &quot;import&quot;</b>
<b>    ],</b>
<b>    &quot;rules&quot;: {</b>
<b>        &quot;react/jsx-filename-extension&quot;: [1, { &quot;extensions&quot;: [&quot;.js&quot;, &quot;.jsx&quot;] }],</b>
<b>        &quot;react/require-default-props&quot;: [0],</b>
<b>        &quot;react/no-unused-prop-types&quot;: [2, {</b>
<b>            &quot;skipShapeProps&quot;: true</b>
<b>        }],</b>
<b>        &quot;react/no-multi-comp&quot;: [0],</b>
<b>        &quot;no-bitwise&quot;: [0],</b>
<b>    },</b>
<b>};🚫↵</b>
</pre>

[}]: #

Create our start script inside `package.json`:

[{]: <helper> (diffStep 1.3 files="package.json")

#### Step 1.3: Create start script

##### Changed package.json
<pre>

...

  &quot;repository&quot;: &quot;https://github.com/srtucker22/chatty.git&quot;,
  &quot;author&quot;: &quot;Simon Tucker &lt;srtucker22@gmail.com&gt;&quot;,
  &quot;license&quot;: &quot;MIT&quot;,
<b>  &quot;scripts&quot;: {</b>
<b>    &quot;start&quot;: &quot;nodemon --watch server --watch package.json server/index.js --exec babel-node --presets es2015,stage-2&quot;</b>
<b>  },</b>
  &quot;devDependencies&quot;: {
    &quot;babel-cli&quot;: &quot;^6.24.1&quot;,
    &quot;babel-eslint&quot;: &quot;^7.2.3&quot;,
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

...

<b>import express from &#x27;express&#x27;;</b>
<b></b>
<b>const PORT &#x3D; 8080;</b>
<b></b>
<b>const app &#x3D; express();</b>
<b></b>
<b>app.listen(PORT, () &#x3D;&gt; console.log(&#x60;Server is now running on http://localhost:${PORT}&#x60;));</b>
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

...

<b>export const Schema &#x3D; [</b>
<b>  &#x60;type Query {</b>
<b>    testString: String</b>
<b>  }</b>
<b>  schema {</b>
<b>    query: Query</b>
<b>  }&#x60;,</b>
<b>];</b>
<b></b>
<b>export default Schema;</b>
</pre>

[}]: #

Apollo requires a list of strings written in GraphQL’s language to establish a Schema. This Schema will just be a basic placeholder for now. We will add more advanced and meaningful Schemas in the next tutorial.

We also need our Schema to work with data. A great way to get Schemas up and running is by mocking data. Mocking data also happens to be useful for testing, so it’s good practice to start using mocks with Schemas before attaching real data like a database or 3rd party API.

We’ll add the file `/server/data/mocks.js`:

[{]: <helper> (diffStep 1.6)

#### Step 1.6: Create basic mocks

##### Added server&#x2F;data&#x2F;mocks.js
<pre>

...

<b>export const Mocks &#x3D; {</b>
<b>  String: () &#x3D;&gt; &#x27;It works!&#x27;,</b>
<b>};</b>
<b></b>
<b>export default Mocks;</b>
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

...

import express from &#x27;express&#x27;;
<b>import { graphqlExpress, graphiqlExpress } from &#x27;graphql-server-express&#x27;;</b>
<b>import { makeExecutableSchema, addMockFunctionsToSchema } from &#x27;graphql-tools&#x27;;</b>
<b>import bodyParser from &#x27;body-parser&#x27;;</b>
<b>import { createServer } from &#x27;http&#x27;;</b>

<b>import { Schema } from &#x27;./data/schema&#x27;;</b>
<b>import { Mocks } from &#x27;./data/mocks&#x27;;</b>

<b>const GRAPHQL_PORT &#x3D; 8080;</b>
const app &#x3D; express();

<b>const executableSchema &#x3D; makeExecutableSchema({</b>
<b>  typeDefs: Schema,</b>
<b>});</b>
<b></b>
<b>addMockFunctionsToSchema({</b>
<b>  schema: executableSchema,</b>
<b>  mocks: Mocks,</b>
<b>  preserveResolvers: true,</b>
<b>});</b>
<b></b>
<b>// &#x60;context&#x60; must be an object and can&#x27;t be undefined when using connectors</b>
<b>app.use(&#x27;/graphql&#x27;, bodyParser.json(), graphqlExpress({</b>
<b>  schema: executableSchema,</b>
<b>  context: {}, // at least(!) an empty object</b>
<b>}));</b>
<b></b>
<b>app.use(&#x27;/graphiql&#x27;, graphiqlExpress({</b>
<b>  endpointURL: &#x27;/graphql&#x27;,</b>
<b>}));</b>
<b></b>
<b>const graphQLServer &#x3D; createServer(app);</b>
<b></b>
<b>graphQLServer.listen(GRAPHQL_PORT, () &#x3D;&gt; console.log(&#x60;GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}/graphql&#x60;));</b>
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

##### Changed client&#x2F;index.ios.js
<pre>

...

 * @flow
 */

import {
  AppRegistry,
} from &#x27;react-native&#x27;;

<b>import App from &#x27;./src/app&#x27;;</b>

<b>AppRegistry.registerComponent(&#x27;chatty&#x27;, () &#x3D;&gt; App);</b>
</pre>

##### Added client&#x2F;src&#x2F;app.js
<pre>

...

<b>import React, { Component } from &#x27;react&#x27;;</b>
<b>import {</b>
<b>  StyleSheet,</b>
<b>  Text,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    flex: 1,</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>    backgroundColor: &#x27;#F5FCFF&#x27;,</b>
<b>  },</b>
<b>  welcome: {</b>
<b>    fontSize: 20,</b>
<b>    textAlign: &#x27;center&#x27;,</b>
<b>    margin: 10,</b>
<b>  },</b>
<b>  instructions: {</b>
<b>    textAlign: &#x27;center&#x27;,</b>
<b>    color: &#x27;#333333&#x27;,</b>
<b>    marginBottom: 5,</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>export default class App extends Component {</b>
<b>  render() {</b>
<b>    return (</b>
<b>      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>        &lt;Text style&#x3D;{styles.welcome}&gt;</b>
<b>          Welcome to React Native!</b>
<b>        &lt;/Text&gt;</b>
<b>        &lt;Text style&#x3D;{styles.instructions}&gt;</b>
<b>          To get started, edit index.ios.js</b>
<b>        &lt;/Text&gt;</b>
<b>        &lt;Text style&#x3D;{styles.instructions}&gt;</b>
<b>          Press Cmd+R to reload,{&#x27;\n&#x27;}</b>
<b>          Cmd+D or shake for dev menu</b>
<b>        &lt;/Text&gt;</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
</pre>

[}]: #

## Adding Apollo to React Native

We’re going to modify `app.component.js` to use [React-Apollo](http://dev.apollodata.com/react/) and [Redux](http://redux.js.org/).

Add the following dependencies:
```
# **make sure we're adding all react native and client related packages to package.json in the client folder!!!**
cd client

yarn add apollo-client graphql-tag react-apollo redux react-redux redux-devtools-extension
```
We need to do the following:
1. Create a Redux store
2. Create an Apollo client
3. Connect our Apollo client to our GraphQL endpoint
4. Attach the Apollo client reducer to the Redux store

We can also swap out `compose` for `composeWithDevTools`, which will let us observe our Redux state remotely via [React Native Debugger](https://github.com/jhen0409/react-native-debugger).

[{]: <helper> (diffStep "1.10" files="client/src/app.js")

#### Step 1.10: Add ApolloClient

##### Changed client&#x2F;src&#x2F;app.js
<pre>

...

  View,
} from &#x27;react-native&#x27;;

<b>import { ApolloProvider } from &#x27;react-apollo&#x27;;</b>
<b>import { createStore, combineReducers, applyMiddleware } from &#x27;redux&#x27;;</b>
<b>import { composeWithDevTools } from &#x27;redux-devtools-extension&#x27;;</b>
<b>import ApolloClient, { createNetworkInterface } from &#x27;apollo-client&#x27;;</b>
<b></b>
<b>const networkInterface &#x3D; createNetworkInterface({ uri: &#x27;http://localhost:8080/graphql&#x27; });</b>
<b>const client &#x3D; new ApolloClient({</b>
<b>  networkInterface,</b>
<b>});</b>
<b></b>
<b>const store &#x3D; createStore(</b>
<b>  combineReducers({</b>
<b>    apollo: client.reducer(),</b>
<b>  }),</b>
<b>  {}, // initial state</b>
<b>  composeWithDevTools(</b>
<b>    applyMiddleware(client.middleware()),</b>
<b>  ),</b>
<b>);</b>
<b></b>
const styles &#x3D; StyleSheet.create({
  container: {
    flex: 1,
</pre>

[}]: #

Finally, we wrap our `App` component in the `ApolloProvider` component from `react-apollo`. `ApolloProvider` connects our app to Redux and Apollo at the same time.

[{]: <helper> (diffStep 1.11)

#### Step 1.11: Add ApolloProvider to App

##### Changed client&#x2F;src&#x2F;app.js
<pre>

...

export default class App extends Component {
  render() {
    return (
<b>      &lt;ApolloProvider store&#x3D;{store} client&#x3D;{client}&gt;</b>
<b>        &lt;View style&#x3D;{styles.container}&gt;</b>
<b>          &lt;Text style&#x3D;{styles.welcome}&gt;</b>
<b>            Welcome to React Native!</b>
<b>          &lt;/Text&gt;</b>
<b>          &lt;Text style&#x3D;{styles.instructions}&gt;</b>
<b>            To get started, edit index.ios.js</b>
<b>          &lt;/Text&gt;</b>
<b>          &lt;Text style&#x3D;{styles.instructions}&gt;</b>
<b>            Press Cmd+R to reload,{&#x27;\n&#x27;}</b>
<b>            Cmd+D or shake for dev menu</b>
<b>          &lt;/Text&gt;</b>
<b>        &lt;/View&gt;</b>
<b>      &lt;/ApolloProvider&gt;</b>
    );
  }
}
</pre>

[}]: #

If we reload the app `(CMD + R)`, there hopefully should be no errors in the simulator. We can check if everything is hooked up properly by opening Redux Native Debugger and confirming the Redux store includes `apollo`: ![Redux Devtools Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step1-11.png)

[{]: <helper> (navStep)

| [< Intro](../../../README.md) | [Next Step >](step2.md) |
|:--------------------------------|--------------------------------:|

[}]: #

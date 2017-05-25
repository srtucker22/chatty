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
```diff
@@ -0,0 +1,18 @@
+┊  ┊ 1┊module.exports = {
+┊  ┊ 2┊    "parser": "babel-eslint",
+┊  ┊ 3┊    "extends": "airbnb",
+┊  ┊ 4┊    "plugins": [
+┊  ┊ 5┊        "react",
+┊  ┊ 6┊        "jsx-a11y",
+┊  ┊ 7┊        "import"
+┊  ┊ 8┊    ],
+┊  ┊ 9┊    "rules": {
+┊  ┊10┊        "react/jsx-filename-extension": [1, { "extensions": [".js", ".jsx"] }],
+┊  ┊11┊        "react/require-default-props": [0],
+┊  ┊12┊        "react/no-unused-prop-types": [2, {
+┊  ┊13┊            "skipShapeProps": true
+┊  ┊14┊        }],
+┊  ┊15┊        "react/no-multi-comp": [0],
+┊  ┊16┊        "no-bitwise": [0],
+┊  ┊17┊    },
+┊  ┊18┊};🚫↵
```

[}]: #

Create our start script inside `package.json`:

[{]: <helper> (diffStep 1.3 files="package.json")

#### Step 1.3: Create start script

##### Changed package.json
```diff
@@ -7,6 +7,9 @@
 ┊ 7┊ 7┊  "repository": "https://github.com/srtucker22/chatty.git",
 ┊ 8┊ 8┊  "author": "Simon Tucker <srtucker22@gmail.com>",
 ┊ 9┊ 9┊  "license": "MIT",
+┊  ┊10┊  "scripts": {
+┊  ┊11┊    "start": "nodemon --watch server --watch package.json server/index.js --exec babel-node --presets es2015,stage-2"
+┊  ┊12┊  },
 ┊10┊13┊  "devDependencies": {
 ┊11┊14┊    "babel-cli": "^6.24.1",
 ┊12┊15┊    "babel-eslint": "^7.2.3",
```

[}]: #

## Starting the Express server
Let’s import express in `index.js` using ES6 syntax.
1. `yarn add express`
2. Add the following to `index.js`:

[{]: <helper> (diffStep 1.4 files="index.js")

#### Step 1.4: Add express

##### Changed server&#x2F;index.js
```diff
@@ -0,0 +1,7 @@
+┊ ┊1┊import express from 'express';
+┊ ┊2┊
+┊ ┊3┊const PORT = 8080;
+┊ ┊4┊
+┊ ┊5┊const app = express();
+┊ ┊6┊
+┊ ┊7┊app.listen(PORT, () => console.log(`Server is now running on http://localhost:${PORT}`));
```

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
```diff
@@ -0,0 +1,10 @@
+┊  ┊ 1┊export const Schema = [
+┊  ┊ 2┊  `type Query {
+┊  ┊ 3┊    testString: String
+┊  ┊ 4┊  }
+┊  ┊ 5┊  schema {
+┊  ┊ 6┊    query: Query
+┊  ┊ 7┊  }`,
+┊  ┊ 8┊];
+┊  ┊ 9┊
+┊  ┊10┊export default Schema;
```

[}]: #

Apollo requires a list of strings written in GraphQL’s language to establish a Schema. This Schema will just be a basic placeholder for now. We will add more advanced and meaningful Schemas in the next tutorial.

We also need our Schema to work with data. A great way to get Schemas up and running is by mocking data. Mocking data also happens to be useful for testing, so it’s good practice to start using mocks with Schemas before attaching real data like a database or 3rd party API.

We’ll add the file `/server/data/mocks.js`:

[{]: <helper> (diffStep 1.6)

#### Step 1.6: Create basic mocks

##### Added server&#x2F;data&#x2F;mocks.js
```diff
@@ -0,0 +1,5 @@
+┊ ┊1┊export const Mocks = {
+┊ ┊2┊  String: () => 'It works!',
+┊ ┊3┊};
+┊ ┊4┊
+┊ ┊5┊export default Mocks;
```

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
```diff
@@ -1,7 +1,35 @@
 ┊ 1┊ 1┊import express from 'express';
+┊  ┊ 2┊import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
+┊  ┊ 3┊import { makeExecutableSchema, addMockFunctionsToSchema } from 'graphql-tools';
+┊  ┊ 4┊import bodyParser from 'body-parser';
+┊  ┊ 5┊import { createServer } from 'http';
 ┊ 2┊ 6┊
-┊ 3┊  ┊const PORT = 8080;
+┊  ┊ 7┊import { Schema } from './data/schema';
+┊  ┊ 8┊import { Mocks } from './data/mocks';
 ┊ 4┊ 9┊
+┊  ┊10┊const GRAPHQL_PORT = 8080;
 ┊ 5┊11┊const app = express();
 ┊ 6┊12┊
-┊ 7┊  ┊app.listen(PORT, () => console.log(`Server is now running on http://localhost:${PORT}`));
+┊  ┊13┊const executableSchema = makeExecutableSchema({
+┊  ┊14┊  typeDefs: Schema,
+┊  ┊15┊});
+┊  ┊16┊
+┊  ┊17┊addMockFunctionsToSchema({
+┊  ┊18┊  schema: executableSchema,
+┊  ┊19┊  mocks: Mocks,
+┊  ┊20┊  preserveResolvers: true,
+┊  ┊21┊});
+┊  ┊22┊
+┊  ┊23┊// `context` must be an object and can't be undefined when using connectors
+┊  ┊24┊app.use('/graphql', bodyParser.json(), graphqlExpress({
+┊  ┊25┊  schema: executableSchema,
+┊  ┊26┊  context: {}, // at least(!) an empty object
+┊  ┊27┊}));
+┊  ┊28┊
+┊  ┊29┊app.use('/graphiql', graphiqlExpress({
+┊  ┊30┊  endpointURL: '/graphql',
+┊  ┊31┊}));
+┊  ┊32┊
+┊  ┊33┊const graphQLServer = createServer(app);
+┊  ┊34┊
+┊  ┊35┊graphQLServer.listen(GRAPHQL_PORT, () => console.log(`GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}/graphql`));
```

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
```diff
@@ -4,50 +4,10 @@
 ┊ 4┊ 4┊ * @flow
 ┊ 5┊ 5┊ */
 ┊ 6┊ 6┊
-┊ 7┊  ┊import React, { Component } from 'react';
 ┊ 8┊ 7┊import {
 ┊ 9┊ 8┊  AppRegistry,
-┊10┊  ┊  StyleSheet,
-┊11┊  ┊  Text,
-┊12┊  ┊  View
 ┊13┊ 9┊} from 'react-native';
 ┊14┊10┊
-┊15┊  ┊export default class chatty extends Component {
-┊16┊  ┊  render() {
-┊17┊  ┊    return (
-┊18┊  ┊      <View style={styles.container}>
-┊19┊  ┊        <Text style={styles.welcome}>
-┊20┊  ┊          Welcome to React Native!
-┊21┊  ┊        </Text>
-┊22┊  ┊        <Text style={styles.instructions}>
-┊23┊  ┊          To get started, edit index.ios.js
-┊24┊  ┊        </Text>
-┊25┊  ┊        <Text style={styles.instructions}>
-┊26┊  ┊          Press Cmd+R to reload,{'\n'}
-┊27┊  ┊          Cmd+D or shake for dev menu
-┊28┊  ┊        </Text>
-┊29┊  ┊      </View>
-┊30┊  ┊    );
-┊31┊  ┊  }
-┊32┊  ┊}
+┊  ┊11┊import App from './src/app';
 ┊33┊12┊
-┊34┊  ┊const styles = StyleSheet.create({
-┊35┊  ┊  container: {
-┊36┊  ┊    flex: 1,
-┊37┊  ┊    justifyContent: 'center',
-┊38┊  ┊    alignItems: 'center',
-┊39┊  ┊    backgroundColor: '#F5FCFF',
-┊40┊  ┊  },
-┊41┊  ┊  welcome: {
-┊42┊  ┊    fontSize: 20,
-┊43┊  ┊    textAlign: 'center',
-┊44┊  ┊    margin: 10,
-┊45┊  ┊  },
-┊46┊  ┊  instructions: {
-┊47┊  ┊    textAlign: 'center',
-┊48┊  ┊    color: '#333333',
-┊49┊  ┊    marginBottom: 5,
-┊50┊  ┊  },
-┊51┊  ┊});
-┊52┊  ┊
-┊53┊  ┊AppRegistry.registerComponent('chatty', () => chatty);
+┊  ┊13┊AppRegistry.registerComponent('chatty', () => App);
```

##### Added client&#x2F;src&#x2F;app.js
```diff
@@ -0,0 +1,44 @@
+┊  ┊ 1┊import React, { Component } from 'react';
+┊  ┊ 2┊import {
+┊  ┊ 3┊  StyleSheet,
+┊  ┊ 4┊  Text,
+┊  ┊ 5┊  View,
+┊  ┊ 6┊} from 'react-native';
+┊  ┊ 7┊
+┊  ┊ 8┊const styles = StyleSheet.create({
+┊  ┊ 9┊  container: {
+┊  ┊10┊    flex: 1,
+┊  ┊11┊    justifyContent: 'center',
+┊  ┊12┊    alignItems: 'center',
+┊  ┊13┊    backgroundColor: '#F5FCFF',
+┊  ┊14┊  },
+┊  ┊15┊  welcome: {
+┊  ┊16┊    fontSize: 20,
+┊  ┊17┊    textAlign: 'center',
+┊  ┊18┊    margin: 10,
+┊  ┊19┊  },
+┊  ┊20┊  instructions: {
+┊  ┊21┊    textAlign: 'center',
+┊  ┊22┊    color: '#333333',
+┊  ┊23┊    marginBottom: 5,
+┊  ┊24┊  },
+┊  ┊25┊});
+┊  ┊26┊
+┊  ┊27┊export default class App extends Component {
+┊  ┊28┊  render() {
+┊  ┊29┊    return (
+┊  ┊30┊      <View style={styles.container}>
+┊  ┊31┊        <Text style={styles.welcome}>
+┊  ┊32┊          Welcome to React Native!
+┊  ┊33┊        </Text>
+┊  ┊34┊        <Text style={styles.instructions}>
+┊  ┊35┊          To get started, edit index.ios.js
+┊  ┊36┊        </Text>
+┊  ┊37┊        <Text style={styles.instructions}>
+┊  ┊38┊          Press Cmd+R to reload,{'\n'}
+┊  ┊39┊          Cmd+D or shake for dev menu
+┊  ┊40┊        </Text>
+┊  ┊41┊      </View>
+┊  ┊42┊    );
+┊  ┊43┊  }
+┊  ┊44┊}
```

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
```diff
@@ -5,6 +5,26 @@
 ┊ 5┊ 5┊  View,
 ┊ 6┊ 6┊} from 'react-native';
 ┊ 7┊ 7┊
+┊  ┊ 8┊import { ApolloProvider } from 'react-apollo';
+┊  ┊ 9┊import { createStore, combineReducers, applyMiddleware } from 'redux';
+┊  ┊10┊import { composeWithDevTools } from 'redux-devtools-extension';
+┊  ┊11┊import ApolloClient, { createNetworkInterface } from 'apollo-client';
+┊  ┊12┊
+┊  ┊13┊const networkInterface = createNetworkInterface({ uri: 'http://localhost:8080/graphql' });
+┊  ┊14┊const client = new ApolloClient({
+┊  ┊15┊  networkInterface,
+┊  ┊16┊});
+┊  ┊17┊
+┊  ┊18┊const store = createStore(
+┊  ┊19┊  combineReducers({
+┊  ┊20┊    apollo: client.reducer(),
+┊  ┊21┊  }),
+┊  ┊22┊  {}, // initial state
+┊  ┊23┊  composeWithDevTools(
+┊  ┊24┊    applyMiddleware(client.middleware()),
+┊  ┊25┊  ),
+┊  ┊26┊);
+┊  ┊27┊
 ┊ 8┊28┊const styles = StyleSheet.create({
 ┊ 9┊29┊  container: {
 ┊10┊30┊    flex: 1,
```

[}]: #

Finally, we wrap our `App` component in the `ApolloProvider` component from `react-apollo`. `ApolloProvider` connects our app to Redux and Apollo at the same time.

[{]: <helper> (diffStep 1.11)

#### Step 1.11: Add ApolloProvider to App

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -47,18 +47,20 @@
 ┊47┊47┊export default class App extends Component {
 ┊48┊48┊  render() {
 ┊49┊49┊    return (
-┊50┊  ┊      <View style={styles.container}>
-┊51┊  ┊        <Text style={styles.welcome}>
-┊52┊  ┊          Welcome to React Native!
-┊53┊  ┊        </Text>
-┊54┊  ┊        <Text style={styles.instructions}>
-┊55┊  ┊          To get started, edit index.ios.js
-┊56┊  ┊        </Text>
-┊57┊  ┊        <Text style={styles.instructions}>
-┊58┊  ┊          Press Cmd+R to reload,{'\n'}
-┊59┊  ┊          Cmd+D or shake for dev menu
-┊60┊  ┊        </Text>
-┊61┊  ┊      </View>
+┊  ┊50┊      <ApolloProvider store={store} client={client}>
+┊  ┊51┊        <View style={styles.container}>
+┊  ┊52┊          <Text style={styles.welcome}>
+┊  ┊53┊            Welcome to React Native!
+┊  ┊54┊          </Text>
+┊  ┊55┊          <Text style={styles.instructions}>
+┊  ┊56┊            To get started, edit index.ios.js
+┊  ┊57┊          </Text>
+┊  ┊58┊          <Text style={styles.instructions}>
+┊  ┊59┊            Press Cmd+R to reload,{'\n'}
+┊  ┊60┊            Cmd+D or shake for dev menu
+┊  ┊61┊          </Text>
+┊  ┊62┊        </View>
+┊  ┊63┊      </ApolloProvider>
 ┊62┊64┊    );
 ┊63┊65┊  }
 ┊64┊66┊}
```

[}]: #

If we reload the app `(CMD + R)`, there hopefully should be no errors in the simulator. We can check if everything is hooked up properly by opening Redux Native Debugger and confirming the Redux store includes `apollo`: ![Redux Devtools Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step1-11.png)

[{]: <helper> (navStep)

| [< Intro](../../../README.md) | [Next Step >](step2.md) |
|:--------------------------------|--------------------------------:|

[}]: #

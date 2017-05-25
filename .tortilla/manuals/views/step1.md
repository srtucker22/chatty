# Step 1: Setup

[//]: # (head-end)


This is the first blog in a multipart series where we will be building Chatty, a WhatsApp clone, using [React Native](https://facebook.github.io/react-native/) and [Apollo](http://dev.apollodata.com/).

# Overview
Each part of this series will be focused on teaching a core concept of Apollo or React Native. We’ll start from scratch, and by the end of the series, we’ll have a kick-ass group messaging application with real-time updates. Future posts beyond the core series will cover more complex features like push notifications, file uploads, and query optimizations.

Since we are using shiny new tech, this series will be a living document. I will update each post as the tools we use continue to advance. My goal is to use this series as a best practices model for building a complex application using some of the best software available.

With that in mind, if you have any suggestions for making this series better, please leave your feedback!

# The Stack
Chatty will use the following stack:
* Server: [Apollo Server](https://www.apollographql.com/docs/apollo-server/)
* Client: [React Native](https://facebook.github.io/react-native/)
* Middleware: Apollo (GraphQL)
* Database: SQL (sqlite to start)

This is a pretty awesome stack for building complex real-time native applications.

For those of you who are new to Apollo, I just want to point out some of the coolest built-in features for [Apollo with React](http://dev.apollodata.com/react/):
* Smart query caching (client side state gets updated and cached with each query/mutation)
* Subscriptions (realtime updates pushed by server)
* Optimistic UI (UI that predicts how the server will respond to requests)
* SSR support
* Prefetching

That’s a ton of buzzwords! In the end, what that all really adds up to is our app will be data driven, really fast for users, and get real-time updates as they happen.

# Part 1 Goals
Here’s what we are going to accomplish in this first tutorial:
1. Set up our dev environment
2. Start an Apollo Server
3. Create our first GraphQL Schema
4. Start a basic React Native client
5. Connect our Apollo Server and RN client!

# Getting started
For this tutorial series, we’re going to start from absolute scratch. My style is to keep everything really simple and refactor as we add complexity.
Let’s start with this basic directory structure:
```
/chatty
  /node_modules
  package.json
  /server
    ... server files
  /client
    /node_modules
    package.json
    ... RN files
```
We will keep our React Native code separate from our server code. This will also keep server dependencies separate from React Native dependencies, which means **we will have 2 `package.json` files**. That may sound weird/bad, but trying to get everything set up with one packager is a huge hassle. It will also save us from a few other issues down the line.

Here’s the terminal code to get us started:
```sh
# make our directory
mkdir chatty
cd chatty

# start npm package managing
npm init

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

```sh
# from root dir..

# add dev dependencies
npm i -g eslint-cli # eslint is an excellent linter

# i -D is short for install --save-dev ;)
npm i -D babel-cli babel-preset-es2015 babel-preset-stage-2 nodemon eslint babel-eslint
eslint --init  # choose airbnb preset or your preferred setup
```

My `eslintrc.js` file looks like this:

[{]: <helper> (diffStep 1.2 files=".eslintrc.js")

#### [Step 1.2: Add eslint, babel, and nodemon](https://github.com/srtucker22/chatty/commit/fb44526)

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

#### [Step 1.3: Create start script](https://github.com/srtucker22/chatty/commit/ac8c3db)

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
 ┊12┊15┊    "babel-eslint": "^8.2.1",
```

[}]: #

## Starting the Express server
Let’s import `apollo-server` in `index.js` using ES6 syntax.
1. `npm i apollo-server graphql` (`apollo-server` requires `graphql`)
2. Add the following to `index.js`:

[{]: <helper> (diffStep 1.4)

#### [Step 1.4: Add ApolloServer](https://github.com/srtucker22/chatty/commit/6ba9c1f)

##### Changed package.json
```diff
@@ -21,5 +21,9 @@
 ┊21┊21┊    "eslint-plugin-jsx-a11y": "^6.0.3",
 ┊22┊22┊    "eslint-plugin-react": "^7.5.1",
 ┊23┊23┊    "nodemon": "^1.11.0"
+┊  ┊24┊  },
+┊  ┊25┊  "dependencies": {
+┊  ┊26┊    "apollo-server": "^2.0.0",
+┊  ┊27┊    "graphql": "^0.13.2"
 ┊24┊28┊  }
 ┊25┊29┊}
```

##### Changed server&#x2F;index.js
```diff
@@ -0,0 +1,14 @@
+┊  ┊ 1┊import { ApolloServer, gql } from 'apollo-server';
+┊  ┊ 2┊
+┊  ┊ 3┊const PORT = 8080;
+┊  ┊ 4┊
+┊  ┊ 5┊// basic schema
+┊  ┊ 6┊const typeDefs = gql`
+┊  ┊ 7┊  type Query {
+┊  ┊ 8┊    testString: String
+┊  ┊ 9┊  }
+┊  ┊10┊`;
+┊  ┊11┊
+┊  ┊12┊const server = new ApolloServer({ typeDefs, mocks: true });
+┊  ┊13┊
+┊  ┊14┊server.listen({ port: PORT }).then(({ url }) => console.log(`🚀 Server ready at ${url}`));
```

[}]: #

Quickly verify our setup works by running `npm start`:
`🚀 Server ready at http://localhost:8080/`

We have a great starting point. Our start script will transpile ES6 code, spin up our Apollo Server, and refresh as we make changes to server code. Nice!

But wait, there's more! Apollo Server comes with some amazing features out of the gate, including [GraphQL Playground](https://github.com/prismagraphql/graphql-playground). Head on over to `http://localhost:8080/` and you should see a slick playground for us to test GraphQL queries against our server!

Type in `{testString}` and you should get back a response:
![Playground Image](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step1-4.png)

Great! So now we have a server that runs the most basic GraphQL. We could build up our GraphQL backend a bit more, but I’d prefer to connect our server and React Native client before we make our Schema any more complex.

# Starting the React Native client
First we’ll download the dependencies and initialize our React Native app. For the sake of brevity, I’m going to focus on iOS, but all our code should also work with Android.

```sh
# you'll need to also install XCode for iOS development
# double check these setup instructions at https://facebook.github.io/react-native/docs/getting-started.html#installing-dependencies
brew install node
brew install watchman

# from root dir...
npm i -g react-native-cli

# initialize RN with name chatty
react-native init chatty

# --- from here on out we'll be doing our own thing ---

# change name of RN folder to client
mv chatty client

# run the app in simulator
cd client
react-native run-ios # and grab a snack or something cause this might take a while the first run...
```
Running the initialization will create an `index.js` file. In this file is boilerplate code that creates a React component and registers it with `AppRegistry`, which renders the component.

Let’s pull out the `Chatty` component from `index.js` and stick it in its own file. I prefer to organize my files by type rather than feature, but you’re welcome to organize differently if you feel strongly about it.

So I’m going to place the `Chatty` component code into `client/src/app.js` and rename the component `App`.

[{]: <helper> (diffStep 1.6)

#### [Step 1.6: Move app code to /src](https://github.com/srtucker22/chatty/commit/b44c18d)

##### Changed client&#x2F;index.js
```diff
@@ -1,7 +1,7 @@
 ┊1┊1┊/** @format */
 ┊2┊2┊
 ┊3┊3┊import {AppRegistry} from 'react-native';
-┊4┊ ┊import App from './App';
+┊ ┊4┊import App from './src/app';
 ┊5┊5┊import {name as appName} from './app.json';
 ┊6┊6┊
 ┊7┊7┊AppRegistry.registerComponent(appName, () => App);
```

##### Changed client&#x2F;App.js
```diff
@@ -16,8 +16,7 @@
 ┊16┊16┊    'Shake or press menu button for dev menu',
 ┊17┊17┊});
 ┊18┊18┊
-┊19┊  ┊type Props = {};
-┊20┊  ┊export default class App extends Component<Props> {
+┊  ┊19┊export default class App extends Component {
 ┊21┊20┊  render() {
 ┊22┊21┊    return (
 ┊23┊22┊      <View style={styles.container}>
```

[}]: #

## Adding Apollo to React Native

We’re going to modify `app.js` to use [React-Apollo](http://dev.apollodata.com/react/) and [Redux](http://redux.js.org/). While Apollo can be used sans Redux, the developer experience for React Native is much sweeter with Redux for monitoring our app's state, as you'll soon see.

We need to add a bunch of Apollo packages and a couple Redux ones:

```sh
# **make sure we're adding all react native and client related packages to package.json in the client folder!!!**
cd client

npm i apollo-cache-redux apollo-client apollo-link apollo-link-error apollo-link-http apollo-link-redux graphql graphql-tag react-apollo react-redux redux redux-devtools-extension
```

We need to do the following:
1. Create a Redux store
2. Create an Apollo client
3. Connect our Apollo client to our GraphQL endpoint via `apollo-link-http`
4. Catch and log any GraphQL errors via `apollo-link-error`
5. Connect Redux to our Apollo workflow via `apollo-link-redux`. This will let us track Apollo events as Redux actions!
6. Set our Apollo client's data store (cache) to Redux via `apollo-cache-redux`

We can also swap out `compose` for `composeWithDevTools`, which will let us observe our Redux state remotely via [React Native Debugger](https://github.com/jhen0409/react-native-debugger).

[{]: <helper> (diffStep "1.7")

#### [Step 1.7: Add ApolloClient](https://github.com/srtucker22/chatty/commit/9d2e1c9)

##### Changed client&#x2F;package.json
```diff
@@ -1,22 +1,34 @@
 ┊ 1┊ 1┊{
-┊ 2┊  ┊  "name": "chatty",
-┊ 3┊  ┊  "version": "0.0.1",
-┊ 4┊  ┊  "private": true,
-┊ 5┊  ┊  "scripts": {
-┊ 6┊  ┊    "start": "node node_modules/react-native/local-cli/cli.js start",
-┊ 7┊  ┊    "test": "jest"
-┊ 8┊  ┊  },
-┊ 9┊  ┊  "dependencies": {
-┊10┊  ┊    "react": "16.4.1",
-┊11┊  ┊    "react-native": "0.56.0"
-┊12┊  ┊  },
-┊13┊  ┊  "devDependencies": {
-┊14┊  ┊    "babel-jest": "23.4.0",
-┊15┊  ┊    "babel-preset-react-native": "^5",
-┊16┊  ┊    "jest": "23.4.1",
-┊17┊  ┊    "react-test-renderer": "16.4.1"
-┊18┊  ┊  },
-┊19┊  ┊  "jest": {
-┊20┊  ┊    "preset": "react-native"
-┊21┊  ┊  }
-┊22┊  ┊}🚫↵
+┊  ┊ 2┊	"name": "chatty",
+┊  ┊ 3┊	"version": "0.0.1",
+┊  ┊ 4┊	"private": true,
+┊  ┊ 5┊	"scripts": {
+┊  ┊ 6┊		"start": "node node_modules/react-native/local-cli/cli.js start",
+┊  ┊ 7┊		"test": "jest"
+┊  ┊ 8┊	},
+┊  ┊ 9┊	"dependencies": {
+┊  ┊10┊		"apollo-cache-redux": "^0.1.0-alpha.7",
+┊  ┊11┊		"apollo-client": "^2.2.5",
+┊  ┊12┊		"apollo-link": "^1.1.0",
+┊  ┊13┊		"apollo-link-error": "^1.0.7",
+┊  ┊14┊		"apollo-link-http": "^1.3.3",
+┊  ┊15┊		"apollo-link-redux": "^0.2.1",
+┊  ┊16┊		"graphql": "^0.12.3",
+┊  ┊17┊		"graphql-tag": "^2.4.2",
+┊  ┊18┊		"react": "16.4.1",
+┊  ┊19┊		"react-apollo": "^2.0.4",
+┊  ┊20┊		"react-native": "0.56.0",
+┊  ┊21┊		"react-redux": "^5.0.5",
+┊  ┊22┊		"redux": "^3.7.2",
+┊  ┊23┊		"redux-devtools-extension": "^2.13.2"
+┊  ┊24┊	},
+┊  ┊25┊	"devDependencies": {
+┊  ┊26┊		"babel-jest": "23.4.0",
+┊  ┊27┊		"babel-preset-react-native": "^5",
+┊  ┊28┊		"jest": "23.4.1",
+┊  ┊29┊		"react-test-renderer": "16.4.1"
+┊  ┊30┊	},
+┊  ┊31┊	"jest": {
+┊  ┊32┊		"preset": "react-native"
+┊  ┊33┊	}
+┊  ┊34┊}
```

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -1,13 +1,52 @@
-┊ 1┊  ┊/**
-┊ 2┊  ┊ * Sample React Native App
-┊ 3┊  ┊ * https://github.com/facebook/react-native
-┊ 4┊  ┊ *
-┊ 5┊  ┊ * @format
-┊ 6┊  ┊ * @flow
-┊ 7┊  ┊ */
-┊ 8┊  ┊
-┊ 9┊  ┊import React, {Component} from 'react';
-┊10┊  ┊import {Platform, StyleSheet, Text, View} from 'react-native';
+┊  ┊ 1┊import React, { Component } from 'react';
+┊  ┊ 2┊import {
+┊  ┊ 3┊  Platform,
+┊  ┊ 4┊  StyleSheet,
+┊  ┊ 5┊  Text,
+┊  ┊ 6┊  View,
+┊  ┊ 7┊} from 'react-native';
+┊  ┊ 8┊
+┊  ┊ 9┊import { ApolloClient } from 'apollo-client';
+┊  ┊10┊import { ApolloLink } from 'apollo-link';
+┊  ┊11┊import { ApolloProvider } from 'react-apollo';
+┊  ┊12┊import { composeWithDevTools } from 'redux-devtools-extension';
+┊  ┊13┊import { createHttpLink } from 'apollo-link-http';
+┊  ┊14┊import { createStore, combineReducers } from 'redux';
+┊  ┊15┊import { Provider } from 'react-redux';
+┊  ┊16┊import { ReduxCache, apolloReducer } from 'apollo-cache-redux';
+┊  ┊17┊import ReduxLink from 'apollo-link-redux';
+┊  ┊18┊import { onError } from 'apollo-link-error';
+┊  ┊19┊
+┊  ┊20┊const URL = 'localhost:8080'; // set your comp's url here
+┊  ┊21┊
+┊  ┊22┊const store = createStore(
+┊  ┊23┊  combineReducers({
+┊  ┊24┊    apollo: apolloReducer,
+┊  ┊25┊  }),
+┊  ┊26┊  {}, // initial state
+┊  ┊27┊  composeWithDevTools(),
+┊  ┊28┊);
+┊  ┊29┊
+┊  ┊30┊const cache = new ReduxCache({ store });
+┊  ┊31┊
+┊  ┊32┊const reduxLink = new ReduxLink(store);
+┊  ┊33┊
+┊  ┊34┊const errorLink = onError((errors) => {
+┊  ┊35┊  console.log(errors);
+┊  ┊36┊});
+┊  ┊37┊
+┊  ┊38┊const httpLink = createHttpLink({ uri: `http://${URL}` });
+┊  ┊39┊
+┊  ┊40┊const link = ApolloLink.from([
+┊  ┊41┊  reduxLink,
+┊  ┊42┊  errorLink,
+┊  ┊43┊  httpLink,
+┊  ┊44┊]);
+┊  ┊45┊
+┊  ┊46┊export const client = new ApolloClient({
+┊  ┊47┊  link,
+┊  ┊48┊  cache,
+┊  ┊49┊});
 ┊11┊50┊
 ┊12┊51┊const instructions = Platform.select({
 ┊13┊52┊  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
```

[}]: #

Finally, we need to connect our app to Apollo and Redux. We'll wrap our `App` component in the `ApolloProvider` component from `react-apollo` and the `Provider` component from `redux`.

[{]: <helper> (diffStep 1.8)

#### [Step 1.8: Add ApolloProvider to App](https://github.com/srtucker22/chatty/commit/66fff67)

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -58,11 +58,15 @@
 ┊58┊58┊export default class App extends Component {
 ┊59┊59┊  render() {
 ┊60┊60┊    return (
-┊61┊  ┊      <View style={styles.container}>
-┊62┊  ┊        <Text style={styles.welcome}>Welcome to React Native!</Text>
-┊63┊  ┊        <Text style={styles.instructions}>To get started, edit App.js</Text>
-┊64┊  ┊        <Text style={styles.instructions}>{instructions}</Text>
-┊65┊  ┊      </View>
+┊  ┊61┊      <ApolloProvider client={client}>
+┊  ┊62┊        <Provider store={store}>
+┊  ┊63┊          <View style={styles.container}>
+┊  ┊64┊            <Text style={styles.welcome}>Welcome to React Native!</Text>
+┊  ┊65┊            <Text style={styles.instructions}>To get started, edit App.js</Text>
+┊  ┊66┊            <Text style={styles.instructions}>{instructions}</Text>
+┊  ┊67┊          </View>
+┊  ┊68┊        </Provider>
+┊  ┊69┊      </ApolloProvider>
 ┊66┊70┊    );
 ┊67┊71┊  }
 ┊68┊72┊}
```

[}]: #

If we reload the app `(CMD + R)`, there hopefully should be no errors in the simulator. We can check if everything is hooked up properly by opening Redux Native Debugger and confirming the Redux store includes `apollo`: ![Redux Devtools Image](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step1-8.png)


[//]: # (foot-start)

[{]: <helper> (navStep)

| [< Intro](https://github.com/srtucker22/chatty/tree/master@3.0.0/README.md) | [Next Step >](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/step2.md) |
|:--------------------------------|--------------------------------:|

[}]: #

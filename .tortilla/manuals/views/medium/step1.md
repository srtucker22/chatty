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

#### [Step 1.2: Add eslint, babel, and nodemon](https://github.com/srtucker22/chatty/commit/267eb48)

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

#### [Step 1.3: Create start script](https://github.com/srtucker22/chatty/commit/cf1023c)

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
Let’s import `apollo-server` in `index.js` using ES6 syntax.
1. `npm i apollo-server graphql` (`apollo-server` requires `graphql`)
2. Add the following to `index.js`:

[{]: <helper> (diffStep 1.4)

#### [Step 1.4: Add ApolloServer](https://github.com/srtucker22/chatty/commit/1d5f54e)

##### Changed package.json
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊21┊21┊    &quot;eslint-plugin-jsx-a11y&quot;: &quot;^6.0.3&quot;,
 ┊22┊22┊    &quot;eslint-plugin-react&quot;: &quot;^7.5.1&quot;,
 ┊23┊23┊    &quot;nodemon&quot;: &quot;^1.11.0&quot;
<b>+┊  ┊24┊  },</b>
<b>+┊  ┊25┊  &quot;dependencies&quot;: {</b>
<b>+┊  ┊26┊    &quot;apollo-server&quot;: &quot;^2.0.0&quot;,</b>
<b>+┊  ┊27┊    &quot;graphql&quot;: &quot;^0.13.2&quot;</b>
 ┊24┊28┊  }
 ┊25┊29┊}
</pre>

##### Changed server&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import { ApolloServer, gql } from &#x27;apollo-server&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊const PORT &#x3D; 8080;</b>
<b>+┊  ┊ 4┊</b>
<b>+┊  ┊ 5┊// basic schema</b>
<b>+┊  ┊ 6┊const typeDefs &#x3D; gql&#x60;</b>
<b>+┊  ┊ 7┊  type Query {</b>
<b>+┊  ┊ 8┊    testString: String</b>
<b>+┊  ┊ 9┊  }</b>
<b>+┊  ┊10┊&#x60;;</b>
<b>+┊  ┊11┊</b>
<b>+┊  ┊12┊const server &#x3D; new ApolloServer({ typeDefs, mocks: true });</b>
<b>+┊  ┊13┊</b>
<b>+┊  ┊14┊server.listen({ port: PORT }).then(({ url }) &#x3D;&gt; console.log(&#x60;🚀 Server ready at ${url}&#x60;));</b>
</pre>

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

#### [Step 1.6: Move app code to /src](https://github.com/srtucker22/chatty/commit/da837a9)

##### Changed client&#x2F;index.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊1┊1┊/** @format */
 ┊2┊2┊
 ┊3┊3┊import {AppRegistry} from &#x27;react-native&#x27;;
<b>+┊ ┊4┊import App from &#x27;./src/app&#x27;;</b>
 ┊5┊5┊import {name as appName} from &#x27;./app.json&#x27;;
 ┊6┊6┊
 ┊7┊7┊AppRegistry.registerComponent(appName, () &#x3D;&gt; App);
</pre>

##### Changed client&#x2F;App.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊16┊16┊    &#x27;Shake or press menu button for dev menu&#x27;,
 ┊17┊17┊});
 ┊18┊18┊
<b>+┊  ┊19┊export default class App extends Component {</b>
 ┊21┊20┊  render() {
 ┊22┊21┊    return (
 ┊23┊22┊      &lt;View style&#x3D;{styles.container}&gt;
</pre>

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

#### [Step 1.7: Add ApolloClient](https://github.com/srtucker22/chatty/commit/c59efdd)

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
<b>+┊  ┊13┊		&quot;apollo-link-error&quot;: &quot;^1.0.7&quot;,</b>
<b>+┊  ┊14┊		&quot;apollo-link-http&quot;: &quot;^1.3.3&quot;,</b>
<b>+┊  ┊15┊		&quot;apollo-link-redux&quot;: &quot;^0.2.1&quot;,</b>
<b>+┊  ┊16┊		&quot;graphql&quot;: &quot;^0.12.3&quot;,</b>
<b>+┊  ┊17┊		&quot;graphql-tag&quot;: &quot;^2.4.2&quot;,</b>
<b>+┊  ┊18┊		&quot;react&quot;: &quot;16.4.1&quot;,</b>
<b>+┊  ┊19┊		&quot;react-apollo&quot;: &quot;^2.0.4&quot;,</b>
<b>+┊  ┊20┊		&quot;react-native&quot;: &quot;0.56.0&quot;,</b>
<b>+┊  ┊21┊		&quot;react-redux&quot;: &quot;^5.0.5&quot;,</b>
<b>+┊  ┊22┊		&quot;redux&quot;: &quot;^3.7.2&quot;,</b>
<b>+┊  ┊23┊		&quot;redux-devtools-extension&quot;: &quot;^2.13.2&quot;</b>
<b>+┊  ┊24┊	},</b>
<b>+┊  ┊25┊	&quot;devDependencies&quot;: {</b>
<b>+┊  ┊26┊		&quot;babel-jest&quot;: &quot;23.4.0&quot;,</b>
<b>+┊  ┊27┊		&quot;babel-preset-react-native&quot;: &quot;^5&quot;,</b>
<b>+┊  ┊28┊		&quot;jest&quot;: &quot;23.4.1&quot;,</b>
<b>+┊  ┊29┊		&quot;react-test-renderer&quot;: &quot;16.4.1&quot;</b>
<b>+┊  ┊30┊	},</b>
<b>+┊  ┊31┊	&quot;jest&quot;: {</b>
<b>+┊  ┊32┊		&quot;preset&quot;: &quot;react-native&quot;</b>
<b>+┊  ┊33┊	}</b>
<b>+┊  ┊34┊}</b>
</pre>

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import React, { Component } from &#x27;react&#x27;;</b>
<b>+┊  ┊ 2┊import {</b>
<b>+┊  ┊ 3┊  Platform,</b>
<b>+┊  ┊ 4┊  StyleSheet,</b>
<b>+┊  ┊ 5┊  Text,</b>
<b>+┊  ┊ 6┊  View,</b>
<b>+┊  ┊ 7┊} from &#x27;react-native&#x27;;</b>
<b>+┊  ┊ 8┊</b>
<b>+┊  ┊ 9┊import { ApolloClient } from &#x27;apollo-client&#x27;;</b>
<b>+┊  ┊10┊import { ApolloLink } from &#x27;apollo-link&#x27;;</b>
<b>+┊  ┊11┊import { ApolloProvider } from &#x27;react-apollo&#x27;;</b>
<b>+┊  ┊12┊import { composeWithDevTools } from &#x27;redux-devtools-extension&#x27;;</b>
<b>+┊  ┊13┊import { createHttpLink } from &#x27;apollo-link-http&#x27;;</b>
<b>+┊  ┊14┊import { createStore, combineReducers } from &#x27;redux&#x27;;</b>
<b>+┊  ┊15┊import { Provider } from &#x27;react-redux&#x27;;</b>
<b>+┊  ┊16┊import { ReduxCache, apolloReducer } from &#x27;apollo-cache-redux&#x27;;</b>
<b>+┊  ┊17┊import ReduxLink from &#x27;apollo-link-redux&#x27;;</b>
<b>+┊  ┊18┊import { onError } from &#x27;apollo-link-error&#x27;;</b>
<b>+┊  ┊19┊</b>
<b>+┊  ┊20┊const URL &#x3D; &#x27;localhost:8080&#x27;; // set your comp&#x27;s url here</b>
<b>+┊  ┊21┊</b>
<b>+┊  ┊22┊const store &#x3D; createStore(</b>
<b>+┊  ┊23┊  combineReducers({</b>
<b>+┊  ┊24┊    apollo: apolloReducer,</b>
<b>+┊  ┊25┊  }),</b>
<b>+┊  ┊26┊  {}, // initial state</b>
<b>+┊  ┊27┊  composeWithDevTools(),</b>
<b>+┊  ┊28┊);</b>
<b>+┊  ┊29┊</b>
<b>+┊  ┊30┊const cache &#x3D; new ReduxCache({ store });</b>
<b>+┊  ┊31┊</b>
<b>+┊  ┊32┊const reduxLink &#x3D; new ReduxLink(store);</b>
<b>+┊  ┊33┊</b>
<b>+┊  ┊34┊const errorLink &#x3D; onError((errors) &#x3D;&gt; {</b>
<b>+┊  ┊35┊  console.log(errors);</b>
<b>+┊  ┊36┊});</b>
<b>+┊  ┊37┊</b>
<b>+┊  ┊38┊const httpLink &#x3D; createHttpLink({ uri: &#x60;http://${URL}&#x60; });</b>
<b>+┊  ┊39┊</b>
<b>+┊  ┊40┊const link &#x3D; ApolloLink.from([</b>
<b>+┊  ┊41┊  reduxLink,</b>
<b>+┊  ┊42┊  errorLink,</b>
<b>+┊  ┊43┊  httpLink,</b>
<b>+┊  ┊44┊]);</b>
<b>+┊  ┊45┊</b>
<b>+┊  ┊46┊export const client &#x3D; new ApolloClient({</b>
<b>+┊  ┊47┊  link,</b>
<b>+┊  ┊48┊  cache,</b>
<b>+┊  ┊49┊});</b>
 ┊11┊50┊
 ┊12┊51┊const instructions &#x3D; Platform.select({
 ┊13┊52┊  ios: &#x27;Press Cmd+R to reload,\n&#x27; + &#x27;Cmd+D or shake for dev menu&#x27;,
</pre>

[}]: #

Finally, we need to connect our app to Apollo and Redux. We'll wrap our `App` component in the `ApolloProvider` component from `react-apollo` and the `Provider` component from `redux`.

[{]: <helper> (diffStep 1.8)

#### [Step 1.8: Add ApolloProvider to App](https://github.com/srtucker22/chatty/commit/1ec64cf)

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊58┊58┊export default class App extends Component {
 ┊59┊59┊  render() {
 ┊60┊60┊    return (
<b>+┊  ┊61┊      &lt;ApolloProvider client&#x3D;{client}&gt;</b>
<b>+┊  ┊62┊        &lt;Provider store&#x3D;{store}&gt;</b>
<b>+┊  ┊63┊          &lt;View style&#x3D;{styles.container}&gt;</b>
<b>+┊  ┊64┊            &lt;Text style&#x3D;{styles.welcome}&gt;Welcome to React Native!&lt;/Text&gt;</b>
<b>+┊  ┊65┊            &lt;Text style&#x3D;{styles.instructions}&gt;To get started, edit App.js&lt;/Text&gt;</b>
<b>+┊  ┊66┊            &lt;Text style&#x3D;{styles.instructions}&gt;{instructions}&lt;/Text&gt;</b>
<b>+┊  ┊67┊          &lt;/View&gt;</b>
<b>+┊  ┊68┊        &lt;/Provider&gt;</b>
<b>+┊  ┊69┊      &lt;/ApolloProvider&gt;</b>
 ┊66┊70┊    );
 ┊67┊71┊  }
 ┊68┊72┊}
</pre>

[}]: #

If we reload the app `(CMD + R)`, there hopefully should be no errors in the simulator. We can check if everything is hooked up properly by opening Redux Native Debugger and confirming the Redux store includes `apollo`: ![Redux Devtools Image](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step1-8.png)


[//]: # (foot-start)

[{]: <helper> (navStep)

⟸ <a href="https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/README.md">INTRO</a> <b>║</b> <a href="https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/medium/step2.md">NEXT STEP</a> ⟹

[}]: #

# Step 3: GraphQL Queries with React Apollo

[//]: # (head-end)


This is the third blog in a multipart series where we will be building Chatty, a WhatsApp clone, using [React Native](https://facebook.github.io/react-native/) and [Apollo](http://dev.apollodata.com/).

Here’s what we will accomplish in this tutorial:
1. Create the basic layout for our React Native application
2. Build GraphQL Queries using `react-apollo`

First we’re going to need a few packages:

```sh
# make sure to add these packages to client folder!!!
cd client
npm i lodash moment graphql-tag prop-types randomcolor react-navigation
```

* [`lodash`](http://lodash.com/docs) is a top notch utility library for dealing with data in JS
* [`moment`](http://momentjs.com/) is the goto package for dealing with Dates in JS
* [`graphql-tag`](https://www.npmjs.com/package/graphql-tag) lets us parse GraphQL Queries from strings
* [`prop-types`](https://www.npmjs.com/package/prop-types) is a runtime type checker for React props and similar objects
* [`randomcolor`](https://www.npmjs.com/package/randomcolor) will let us generate random colors
* [`react-navigation`](https://reactnavigation.org) is a collaboration between people from Facebook, Exponent and the React community to create the best navigation solution for the React ecosystem

# Creating the Layout

I’m a visual guy, so I like to first establish the general look and feel of the app before adding data.

Using [`react-navigation`](https://reactnavigation.org), we can design routing for our application based on **Screens**. A Screen is essentially a full screen or collection of sub-screens within our application. It’s easiest to understand with a basic example.

Let’s create a new file `client/src/navigation.js` where we will declare the navigation for our application:

[{]: <helper> (diffStep 3.1)

#### [Step 3.1: Create AppWithNavigationState](https://github.com/srtucker22/chatty/commit/231d2d8)

##### Changed client&#x2F;package.json
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊15┊15┊		&quot;apollo-link-redux&quot;: &quot;^0.2.1&quot;,
 ┊16┊16┊		&quot;graphql&quot;: &quot;^0.12.3&quot;,
 ┊17┊17┊		&quot;graphql-tag&quot;: &quot;^2.4.2&quot;,
<b>+┊  ┊18┊		&quot;lodash&quot;: &quot;^4.17.5&quot;,</b>
<b>+┊  ┊19┊		&quot;moment&quot;: &quot;^2.20.1&quot;,</b>
<b>+┊  ┊20┊		&quot;prop-types&quot;: &quot;^15.6.0&quot;,</b>
<b>+┊  ┊21┊		&quot;randomcolor&quot;: &quot;^0.5.3&quot;,</b>
 ┊18┊22┊		&quot;react&quot;: &quot;16.4.1&quot;,
 ┊19┊23┊		&quot;react-apollo&quot;: &quot;^2.0.4&quot;,
 ┊20┊24┊		&quot;react-native&quot;: &quot;0.56.0&quot;,
<b>+┊  ┊25┊		&quot;react-navigation&quot;: &quot;^1.0.3&quot;,</b>
<b>+┊  ┊26┊		&quot;react-navigation-redux-helpers&quot;: &quot;^1.1.2&quot;,</b>
 ┊21┊27┊		&quot;react-redux&quot;: &quot;^5.0.5&quot;,
 ┊22┊28┊		&quot;redux&quot;: &quot;^3.7.2&quot;,
 ┊23┊29┊		&quot;redux-devtools-extension&quot;: &quot;^2.13.2&quot;
</pre>

##### Added client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import PropTypes from &#x27;prop-types&#x27;;</b>
<b>+┊  ┊ 2┊import React, { Component } from &#x27;react&#x27;;</b>
<b>+┊  ┊ 3┊import { NavigationActions, addNavigationHelpers, StackNavigator, TabNavigator } from &#x27;react-navigation&#x27;;</b>
<b>+┊  ┊ 4┊import {</b>
<b>+┊  ┊ 5┊  createReduxBoundAddListener,</b>
<b>+┊  ┊ 6┊  createReactNavigationReduxMiddleware,</b>
<b>+┊  ┊ 7┊} from &#x27;react-navigation-redux-helpers&#x27;;</b>
<b>+┊  ┊ 8┊import { Text, View, StyleSheet } from &#x27;react-native&#x27;;</b>
<b>+┊  ┊ 9┊import { connect } from &#x27;react-redux&#x27;;</b>
<b>+┊  ┊10┊</b>
<b>+┊  ┊11┊const styles &#x3D; StyleSheet.create({</b>
<b>+┊  ┊12┊  container: {</b>
<b>+┊  ┊13┊    flex: 1,</b>
<b>+┊  ┊14┊    justifyContent: &#x27;center&#x27;,</b>
<b>+┊  ┊15┊    alignItems: &#x27;center&#x27;,</b>
<b>+┊  ┊16┊    backgroundColor: &#x27;white&#x27;,</b>
<b>+┊  ┊17┊  },</b>
<b>+┊  ┊18┊  tabText: {</b>
<b>+┊  ┊19┊    color: &#x27;#777&#x27;,</b>
<b>+┊  ┊20┊    fontSize: 10,</b>
<b>+┊  ┊21┊    justifyContent: &#x27;center&#x27;,</b>
<b>+┊  ┊22┊  },</b>
<b>+┊  ┊23┊  selected: {</b>
<b>+┊  ┊24┊    color: &#x27;blue&#x27;,</b>
<b>+┊  ┊25┊  },</b>
<b>+┊  ┊26┊});</b>
<b>+┊  ┊27┊</b>
<b>+┊  ┊28┊const TestScreen &#x3D; title &#x3D;&gt; () &#x3D;&gt; (</b>
<b>+┊  ┊29┊  &lt;View style&#x3D;{styles.container}&gt;</b>
<b>+┊  ┊30┊    &lt;Text&gt;</b>
<b>+┊  ┊31┊      {title}</b>
<b>+┊  ┊32┊    &lt;/Text&gt;</b>
<b>+┊  ┊33┊  &lt;/View&gt;</b>
<b>+┊  ┊34┊);</b>
<b>+┊  ┊35┊</b>
<b>+┊  ┊36┊// tabs in main screen</b>
<b>+┊  ┊37┊const MainScreenNavigator &#x3D; TabNavigator({</b>
<b>+┊  ┊38┊  Chats: { screen: TestScreen(&#x27;Chats&#x27;) },</b>
<b>+┊  ┊39┊  Settings: { screen: TestScreen(&#x27;Settings&#x27;) },</b>
<b>+┊  ┊40┊}, {</b>
<b>+┊  ┊41┊  initialRouteName: &#x27;Chats&#x27;,</b>
<b>+┊  ┊42┊});</b>
<b>+┊  ┊43┊</b>
<b>+┊  ┊44┊const AppNavigator &#x3D; StackNavigator({</b>
<b>+┊  ┊45┊  Main: { screen: MainScreenNavigator },</b>
<b>+┊  ┊46┊});</b>
<b>+┊  ┊47┊</b>
<b>+┊  ┊48┊// reducer initialization code</b>
<b>+┊  ┊49┊const initialState&#x3D;AppNavigator.router.getStateForAction(NavigationActions.reset({</b>
<b>+┊  ┊50┊	index: 0,</b>
<b>+┊  ┊51┊	actions: [</b>
<b>+┊  ┊52┊	  NavigationActions.navigate({</b>
<b>+┊  ┊53┊		  routeName: &#x27;Main&#x27;,</b>
<b>+┊  ┊54┊	  }),</b>
<b>+┊  ┊55┊	],</b>
<b>+┊  ┊56┊}));</b>
<b>+┊  ┊57┊</b>
<b>+┊  ┊58┊export const navigationReducer &#x3D; (state &#x3D; initialState, action) &#x3D;&gt; {</b>
<b>+┊  ┊59┊  const nextState &#x3D; AppNavigator.router.getStateForAction(action, state);</b>
<b>+┊  ┊60┊</b>
<b>+┊  ┊61┊  // Simply return the original &#x60;state&#x60; if &#x60;nextState&#x60; is null or undefined.</b>
<b>+┊  ┊62┊  return nextState || state;</b>
<b>+┊  ┊63┊};</b>
<b>+┊  ┊64┊</b>
<b>+┊  ┊65┊// Note: createReactNavigationReduxMiddleware must be run before createReduxBoundAddListener</b>
<b>+┊  ┊66┊export const navigationMiddleware &#x3D; createReactNavigationReduxMiddleware(</b>
<b>+┊  ┊67┊  &quot;root&quot;,</b>
<b>+┊  ┊68┊  state &#x3D;&gt; state.nav,</b>
<b>+┊  ┊69┊);</b>
<b>+┊  ┊70┊const addListener &#x3D; createReduxBoundAddListener(&quot;root&quot;);</b>
<b>+┊  ┊71┊</b>
<b>+┊  ┊72┊class AppWithNavigationState extends Component {</b>
<b>+┊  ┊73┊  render() {</b>
<b>+┊  ┊74┊    return (</b>
<b>+┊  ┊75┊      &lt;AppNavigator navigation&#x3D;{addNavigationHelpers({</b>
<b>+┊  ┊76┊        dispatch: this.props.dispatch,</b>
<b>+┊  ┊77┊        state: this.props.nav,</b>
<b>+┊  ┊78┊        addListener,</b>
<b>+┊  ┊79┊      })} /&gt;</b>
<b>+┊  ┊80┊    );</b>
<b>+┊  ┊81┊  }</b>
<b>+┊  ┊82┊}</b>
<b>+┊  ┊83┊</b>
<b>+┊  ┊84┊const mapStateToProps &#x3D; state &#x3D;&gt; ({</b>
<b>+┊  ┊85┊  nav: state.nav,</b>
<b>+┊  ┊86┊});</b>
<b>+┊  ┊87┊</b>
<b>+┊  ┊88┊export default connect(mapStateToProps)(AppWithNavigationState);</b>
</pre>

[}]: #

This setup will create a `StackNavigator` named `AppNavigator` that will hold all our Screens. A `StackNavigator` stacks Screens on top of each other like pancakes when we navigate to them.

Within `AppNavigator`, we can add different Screens and other Navigators that can be pushed onto the stack.

`MainScreenNavigator` is a `TabNavigator`, which means it organizes Screens in tabs. The Screens within MainScreenNavigator are just placeholders which display the title of the Screen for now. `MainScreenNavigator` will be our default view, so we've added it as the first Screen in `AppNavigator`.

We also have created a basic reducer for our navigator (`navigatorReducer`) to track navigation actions in Redux. We use `connect` from `react-redux` to connect our AppNavigator to Redux.

We can update `app.js` to use our new Redux connected `AppWithNavigationState` component and combine `navigationReducer` with our `apollo` reducer:

[{]: <helper> (diffStep 3.2)

#### [Step 3.2: Connect Navitgation to App](https://github.com/srtucker22/chatty/commit/4d9f4bd)

##### Changed client&#x2F;src&#x2F;app.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 1┊ 1┊import React, { Component } from &#x27;react&#x27;;
 ┊ 8┊ 2┊
 ┊ 9┊ 3┊import { ApolloClient } from &#x27;apollo-client&#x27;;
 ┊10┊ 4┊import { ApolloLink } from &#x27;apollo-link&#x27;;
 ┊11┊ 5┊import { ApolloProvider } from &#x27;react-apollo&#x27;;
 ┊12┊ 6┊import { composeWithDevTools } from &#x27;redux-devtools-extension&#x27;;
 ┊13┊ 7┊import { createHttpLink } from &#x27;apollo-link-http&#x27;;
<b>+┊  ┊ 8┊import { createStore, combineReducers, applyMiddleware } from &#x27;redux&#x27;;</b>
 ┊15┊ 9┊import { Provider } from &#x27;react-redux&#x27;;
 ┊16┊10┊import { ReduxCache, apolloReducer } from &#x27;apollo-cache-redux&#x27;;
 ┊17┊11┊import ReduxLink from &#x27;apollo-link-redux&#x27;;
 ┊18┊12┊import { onError } from &#x27;apollo-link-error&#x27;;
 ┊19┊13┊
<b>+┊  ┊14┊import AppWithNavigationState, {</b>
<b>+┊  ┊15┊  navigationReducer,</b>
<b>+┊  ┊16┊  navigationMiddleware,</b>
<b>+┊  ┊17┊} from &#x27;./navigation&#x27;;</b>
<b>+┊  ┊18┊</b>
 ┊20┊19┊const URL &#x3D; &#x27;localhost:8080&#x27;; // set your comp&#x27;s url here
 ┊21┊20┊
 ┊22┊21┊const store &#x3D; createStore(
 ┊23┊22┊  combineReducers({
 ┊24┊23┊    apollo: apolloReducer,
<b>+┊  ┊24┊    nav: navigationReducer,</b>
 ┊25┊25┊  }),
 ┊26┊26┊  {}, // initial state
<b>+┊  ┊27┊  composeWithDevTools(</b>
<b>+┊  ┊28┊    applyMiddleware(navigationMiddleware),</b>
<b>+┊  ┊29┊  ),</b>
 ┊28┊30┊);
 ┊29┊31┊
 ┊30┊32┊const cache &#x3D; new ReduxCache({ store });
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊48┊50┊  cache,
 ┊49┊51┊});
 ┊50┊52┊
 ┊58┊53┊export default class App extends Component {
 ┊59┊54┊  render() {
 ┊60┊55┊    return (
 ┊61┊56┊      &lt;ApolloProvider client&#x3D;{client}&gt;
 ┊62┊57┊        &lt;Provider store&#x3D;{store}&gt;
<b>+┊  ┊58┊          &lt;AppWithNavigationState /&gt;</b>
 ┊68┊59┊        &lt;/Provider&gt;
 ┊69┊60┊      &lt;/ApolloProvider&gt;
 ┊70┊61┊    );
 ┊71┊62┊  }
 ┊72┊63┊}
</pre>

[}]: #

Refresh the app to see some simple tabs: ![Tabs Image](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step3-2.gif)

On the `Chats` tab, we want to show a list of the user’s groups. We’ll create a `Groups` screen component in a new file `client/src/screens/groups.screen.js`:

[{]: <helper> (diffStep 3.3 files="client/src/screens/groups.screen.js")

#### [Step 3.3: Create Groups Screen](https://github.com/srtucker22/chatty/commit/ca09ed8)

##### Added client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import { _ } from &#x27;lodash&#x27;;</b>
<b>+┊  ┊ 2┊import PropTypes from &#x27;prop-types&#x27;;</b>
<b>+┊  ┊ 3┊import React, { Component } from &#x27;react&#x27;;</b>
<b>+┊  ┊ 4┊import {</b>
<b>+┊  ┊ 5┊  FlatList,</b>
<b>+┊  ┊ 6┊  StyleSheet,</b>
<b>+┊  ┊ 7┊  Text,</b>
<b>+┊  ┊ 8┊  TouchableHighlight,</b>
<b>+┊  ┊ 9┊  View,</b>
<b>+┊  ┊10┊} from &#x27;react-native&#x27;;</b>
<b>+┊  ┊11┊</b>
<b>+┊  ┊12┊const styles &#x3D; StyleSheet.create({</b>
<b>+┊  ┊13┊  container: {</b>
<b>+┊  ┊14┊    backgroundColor: &#x27;white&#x27;,</b>
<b>+┊  ┊15┊    flex: 1,</b>
<b>+┊  ┊16┊  },</b>
<b>+┊  ┊17┊  groupContainer: {</b>
<b>+┊  ┊18┊    flex: 1,</b>
<b>+┊  ┊19┊    flexDirection: &#x27;row&#x27;,</b>
<b>+┊  ┊20┊    alignItems: &#x27;center&#x27;,</b>
<b>+┊  ┊21┊    backgroundColor: &#x27;white&#x27;,</b>
<b>+┊  ┊22┊    borderBottomColor: &#x27;#eee&#x27;,</b>
<b>+┊  ┊23┊    borderBottomWidth: 1,</b>
<b>+┊  ┊24┊    paddingHorizontal: 12,</b>
<b>+┊  ┊25┊    paddingVertical: 8,</b>
<b>+┊  ┊26┊  },</b>
<b>+┊  ┊27┊  groupName: {</b>
<b>+┊  ┊28┊    fontWeight: &#x27;bold&#x27;,</b>
<b>+┊  ┊29┊    flex: 0.7,</b>
<b>+┊  ┊30┊  },</b>
<b>+┊  ┊31┊});</b>
<b>+┊  ┊32┊</b>
<b>+┊  ┊33┊// create fake data to populate our ListView</b>
<b>+┊  ┊34┊const fakeData &#x3D; () &#x3D;&gt; _.times(100, i &#x3D;&gt; ({</b>
<b>+┊  ┊35┊  id: i,</b>
<b>+┊  ┊36┊  name: &#x60;Group ${i}&#x60;,</b>
<b>+┊  ┊37┊}));</b>
<b>+┊  ┊38┊</b>
<b>+┊  ┊39┊class Group extends Component {</b>
<b>+┊  ┊40┊  render() {</b>
<b>+┊  ┊41┊    const { id, name } &#x3D; this.props.group;</b>
<b>+┊  ┊42┊    return (</b>
<b>+┊  ┊43┊      &lt;TouchableHighlight</b>
<b>+┊  ┊44┊        key&#x3D;{id}</b>
<b>+┊  ┊45┊      &gt;</b>
<b>+┊  ┊46┊        &lt;View style&#x3D;{styles.groupContainer}&gt;</b>
<b>+┊  ┊47┊          &lt;Text style&#x3D;{styles.groupName}&gt;{&#x60;${name}&#x60;}&lt;/Text&gt;</b>
<b>+┊  ┊48┊        &lt;/View&gt;</b>
<b>+┊  ┊49┊      &lt;/TouchableHighlight&gt;</b>
<b>+┊  ┊50┊    );</b>
<b>+┊  ┊51┊  }</b>
<b>+┊  ┊52┊}</b>
<b>+┊  ┊53┊</b>
<b>+┊  ┊54┊Group.propTypes &#x3D; {</b>
<b>+┊  ┊55┊  group: PropTypes.shape({</b>
<b>+┊  ┊56┊    id: PropTypes.number,</b>
<b>+┊  ┊57┊    name: PropTypes.string,</b>
<b>+┊  ┊58┊  }),</b>
<b>+┊  ┊59┊};</b>
<b>+┊  ┊60┊</b>
<b>+┊  ┊61┊class Groups extends Component {</b>
<b>+┊  ┊62┊  static navigationOptions &#x3D; {</b>
<b>+┊  ┊63┊    title: &#x27;Chats&#x27;,</b>
<b>+┊  ┊64┊  };</b>
<b>+┊  ┊65┊</b>
<b>+┊  ┊66┊  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();</b>
<b>+┊  ┊67┊</b>
<b>+┊  ┊68┊  renderItem &#x3D; ({ item }) &#x3D;&gt; &lt;Group group&#x3D;{item} /&gt;;</b>
<b>+┊  ┊69┊</b>
<b>+┊  ┊70┊  render() {</b>
<b>+┊  ┊71┊    // render list of groups for user</b>
<b>+┊  ┊72┊    return (</b>
<b>+┊  ┊73┊      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>+┊  ┊74┊        &lt;FlatList</b>
<b>+┊  ┊75┊          data&#x3D;{fakeData()}</b>
<b>+┊  ┊76┊          keyExtractor&#x3D;{this.keyExtractor}</b>
<b>+┊  ┊77┊          renderItem&#x3D;{this.renderItem}</b>
<b>+┊  ┊78┊        /&gt;</b>
<b>+┊  ┊79┊      &lt;/View&gt;</b>
<b>+┊  ┊80┊    );</b>
<b>+┊  ┊81┊  }</b>
<b>+┊  ┊82┊}</b>
<b>+┊  ┊83┊</b>
<b>+┊  ┊84┊export default Groups;</b>
</pre>

[}]: #

And insert `Groups` into our `AppNavigator`:

[{]: <helper> (diffStep 3.3 files="client/src/navigation.js")

#### [Step 3.3: Create Groups Screen](https://github.com/srtucker22/chatty/commit/ca09ed8)

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 8┊ 8┊import { Text, View, StyleSheet } from &#x27;react-native&#x27;;
 ┊ 9┊ 9┊import { connect } from &#x27;react-redux&#x27;;
 ┊10┊10┊
<b>+┊  ┊11┊import Groups from &#x27;./screens/groups.screen&#x27;;</b>
<b>+┊  ┊12┊</b>
 ┊11┊13┊const styles &#x3D; StyleSheet.create({
 ┊12┊14┊  container: {
 ┊13┊15┊    flex: 1,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊35┊37┊
 ┊36┊38┊// tabs in main screen
 ┊37┊39┊const MainScreenNavigator &#x3D; TabNavigator({
<b>+┊  ┊40┊  Chats: { screen: Groups },</b>
 ┊39┊41┊  Settings: { screen: TestScreen(&#x27;Settings&#x27;) },
 ┊40┊42┊}, {
 ┊41┊43┊  initialRouteName: &#x27;Chats&#x27;,
</pre>

[}]: #

When the user presses one of the rows in our `FlatList`, we want to push a new Screen with the message thread for the selected group. For this Screen, we’ll create a new `Messages` component which will hold a list of `Message` components:

[{]: <helper> (diffStep 3.4)

#### [Step 3.4: Create Messages Screen](https://github.com/srtucker22/chatty/commit/bad15f7)

##### Added client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import { _ } from &#x27;lodash&#x27;;</b>
<b>+┊  ┊ 2┊import {</b>
<b>+┊  ┊ 3┊  FlatList,</b>
<b>+┊  ┊ 4┊  StyleSheet,</b>
<b>+┊  ┊ 5┊  View,</b>
<b>+┊  ┊ 6┊} from &#x27;react-native&#x27;;</b>
<b>+┊  ┊ 7┊import PropTypes from &#x27;prop-types&#x27;;</b>
<b>+┊  ┊ 8┊import React, { Component } from &#x27;react&#x27;;</b>
<b>+┊  ┊ 9┊import randomColor from &#x27;randomcolor&#x27;;</b>
<b>+┊  ┊10┊</b>
<b>+┊  ┊11┊import Message from &#x27;../components/message.component&#x27;;</b>
<b>+┊  ┊12┊</b>
<b>+┊  ┊13┊const styles &#x3D; StyleSheet.create({</b>
<b>+┊  ┊14┊  container: {</b>
<b>+┊  ┊15┊    alignItems: &#x27;stretch&#x27;,</b>
<b>+┊  ┊16┊    backgroundColor: &#x27;#e5ddd5&#x27;,</b>
<b>+┊  ┊17┊    flex: 1,</b>
<b>+┊  ┊18┊    flexDirection: &#x27;column&#x27;,</b>
<b>+┊  ┊19┊  },</b>
<b>+┊  ┊20┊});</b>
<b>+┊  ┊21┊</b>
<b>+┊  ┊22┊const fakeData &#x3D; () &#x3D;&gt; _.times(100, i &#x3D;&gt; ({</b>
<b>+┊  ┊23┊  // every message will have a different color</b>
<b>+┊  ┊24┊  color: randomColor(),</b>
<b>+┊  ┊25┊  // every 5th message will look like it&#x27;s from the current user</b>
<b>+┊  ┊26┊  isCurrentUser: i % 5 &#x3D;&#x3D;&#x3D; 0,</b>
<b>+┊  ┊27┊  message: {</b>
<b>+┊  ┊28┊    id: i,</b>
<b>+┊  ┊29┊    createdAt: new Date().toISOString(),</b>
<b>+┊  ┊30┊    from: {</b>
<b>+┊  ┊31┊      username: &#x60;Username ${i}&#x60;,</b>
<b>+┊  ┊32┊    },</b>
<b>+┊  ┊33┊    text: &#x60;Message ${i}&#x60;,</b>
<b>+┊  ┊34┊  },</b>
<b>+┊  ┊35┊}));</b>
<b>+┊  ┊36┊</b>
<b>+┊  ┊37┊class Messages extends Component {</b>
<b>+┊  ┊38┊  static navigationOptions &#x3D; ({ navigation }) &#x3D;&gt; {</b>
<b>+┊  ┊39┊    const { state } &#x3D; navigation;</b>
<b>+┊  ┊40┊    return {</b>
<b>+┊  ┊41┊      title: state.params.title,</b>
<b>+┊  ┊42┊    };</b>
<b>+┊  ┊43┊  };</b>
<b>+┊  ┊44┊</b>
<b>+┊  ┊45┊  keyExtractor &#x3D; item &#x3D;&gt; item.message.id.toString();</b>
<b>+┊  ┊46┊</b>
<b>+┊  ┊47┊  renderItem &#x3D; ({ item: { isCurrentUser, message, color } }) &#x3D;&gt; (</b>
<b>+┊  ┊48┊    &lt;Message</b>
<b>+┊  ┊49┊      color&#x3D;{color}</b>
<b>+┊  ┊50┊      isCurrentUser&#x3D;{isCurrentUser}</b>
<b>+┊  ┊51┊      message&#x3D;{message}</b>
<b>+┊  ┊52┊    /&gt;</b>
<b>+┊  ┊53┊  )</b>
<b>+┊  ┊54┊</b>
<b>+┊  ┊55┊  render() {</b>
<b>+┊  ┊56┊    // render list of messages for group</b>
<b>+┊  ┊57┊    return (</b>
<b>+┊  ┊58┊      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>+┊  ┊59┊        &lt;FlatList</b>
<b>+┊  ┊60┊          data&#x3D;{fakeData()}</b>
<b>+┊  ┊61┊          keyExtractor&#x3D;{this.keyExtractor}</b>
<b>+┊  ┊62┊          renderItem&#x3D;{this.renderItem}</b>
<b>+┊  ┊63┊          ListEmptyComponent&#x3D;{&lt;View /&gt;}</b>
<b>+┊  ┊64┊        /&gt;</b>
<b>+┊  ┊65┊      &lt;/View&gt;</b>
<b>+┊  ┊66┊    );</b>
<b>+┊  ┊67┊  }</b>
<b>+┊  ┊68┊}</b>
<b>+┊  ┊69┊</b>
<b>+┊  ┊70┊export default Messages;</b>
</pre>

[}]: #

We’ll also write the code for the individual `Message` components that populate the `FlatList` in `Messages`:

[{]: <helper> (diffStep 3.5)

#### [Step 3.5: Create Message Component](https://github.com/srtucker22/chatty/commit/fe0e18d)

##### Added client&#x2F;src&#x2F;components&#x2F;message.component.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import moment from &#x27;moment&#x27;;</b>
<b>+┊  ┊ 2┊import React, { PureComponent } from &#x27;react&#x27;;</b>
<b>+┊  ┊ 3┊import PropTypes from &#x27;prop-types&#x27;;</b>
<b>+┊  ┊ 4┊import {</b>
<b>+┊  ┊ 5┊  StyleSheet,</b>
<b>+┊  ┊ 6┊  Text,</b>
<b>+┊  ┊ 7┊  View,</b>
<b>+┊  ┊ 8┊} from &#x27;react-native&#x27;;</b>
<b>+┊  ┊ 9┊</b>
<b>+┊  ┊10┊const styles &#x3D; StyleSheet.create({</b>
<b>+┊  ┊11┊  container: {</b>
<b>+┊  ┊12┊    flex: 1,</b>
<b>+┊  ┊13┊    flexDirection: &#x27;row&#x27;,</b>
<b>+┊  ┊14┊  },</b>
<b>+┊  ┊15┊  message: {</b>
<b>+┊  ┊16┊    flex: 0.8,</b>
<b>+┊  ┊17┊    backgroundColor: &#x27;white&#x27;,</b>
<b>+┊  ┊18┊    borderRadius: 6,</b>
<b>+┊  ┊19┊    marginHorizontal: 16,</b>
<b>+┊  ┊20┊    marginVertical: 2,</b>
<b>+┊  ┊21┊    paddingHorizontal: 8,</b>
<b>+┊  ┊22┊    paddingVertical: 6,</b>
<b>+┊  ┊23┊    shadowColor: &#x27;black&#x27;,</b>
<b>+┊  ┊24┊    shadowOpacity: 0.5,</b>
<b>+┊  ┊25┊    shadowRadius: 1,</b>
<b>+┊  ┊26┊    shadowOffset: {</b>
<b>+┊  ┊27┊      height: 1,</b>
<b>+┊  ┊28┊    },</b>
<b>+┊  ┊29┊  },</b>
<b>+┊  ┊30┊  myMessage: {</b>
<b>+┊  ┊31┊    backgroundColor: &#x27;#dcf8c6&#x27;,</b>
<b>+┊  ┊32┊  },</b>
<b>+┊  ┊33┊  messageUsername: {</b>
<b>+┊  ┊34┊    color: &#x27;red&#x27;,</b>
<b>+┊  ┊35┊    fontWeight: &#x27;bold&#x27;,</b>
<b>+┊  ┊36┊    paddingBottom: 12,</b>
<b>+┊  ┊37┊  },</b>
<b>+┊  ┊38┊  messageTime: {</b>
<b>+┊  ┊39┊    color: &#x27;#8c8c8c&#x27;,</b>
<b>+┊  ┊40┊    fontSize: 11,</b>
<b>+┊  ┊41┊    textAlign: &#x27;right&#x27;,</b>
<b>+┊  ┊42┊  },</b>
<b>+┊  ┊43┊  messageSpacer: {</b>
<b>+┊  ┊44┊    flex: 0.2,</b>
<b>+┊  ┊45┊  },</b>
<b>+┊  ┊46┊});</b>
<b>+┊  ┊47┊</b>
<b>+┊  ┊48┊class Message extends PureComponent {</b>
<b>+┊  ┊49┊  render() {</b>
<b>+┊  ┊50┊    const { color, message, isCurrentUser } &#x3D; this.props;</b>
<b>+┊  ┊51┊</b>
<b>+┊  ┊52┊    return (</b>
<b>+┊  ┊53┊      &lt;View key&#x3D;{message.id} style&#x3D;{styles.container}&gt;</b>
<b>+┊  ┊54┊        {isCurrentUser ? &lt;View style&#x3D;{styles.messageSpacer} /&gt; : undefined }</b>
<b>+┊  ┊55┊        &lt;View</b>
<b>+┊  ┊56┊          style&#x3D;{[styles.message, isCurrentUser &amp;&amp; styles.myMessage]}</b>
<b>+┊  ┊57┊        &gt;</b>
<b>+┊  ┊58┊          &lt;Text</b>
<b>+┊  ┊59┊            style&#x3D;{[</b>
<b>+┊  ┊60┊              styles.messageUsername,</b>
<b>+┊  ┊61┊              { color },</b>
<b>+┊  ┊62┊            ]}</b>
<b>+┊  ┊63┊          &gt;{message.from.username}&lt;/Text&gt;</b>
<b>+┊  ┊64┊          &lt;Text&gt;{message.text}&lt;/Text&gt;</b>
<b>+┊  ┊65┊          &lt;Text style&#x3D;{styles.messageTime}&gt;{moment(message.createdAt).format(&#x27;h:mm A&#x27;)}&lt;/Text&gt;</b>
<b>+┊  ┊66┊        &lt;/View&gt;</b>
<b>+┊  ┊67┊        {!isCurrentUser ? &lt;View style&#x3D;{styles.messageSpacer} /&gt; : undefined }</b>
<b>+┊  ┊68┊      &lt;/View&gt;</b>
<b>+┊  ┊69┊    );</b>
<b>+┊  ┊70┊  }</b>
<b>+┊  ┊71┊}</b>
<b>+┊  ┊72┊</b>
<b>+┊  ┊73┊Message.propTypes &#x3D; {</b>
<b>+┊  ┊74┊  color: PropTypes.string.isRequired,</b>
<b>+┊  ┊75┊  message: PropTypes.shape({</b>
<b>+┊  ┊76┊    createdAt: PropTypes.string.isRequired,</b>
<b>+┊  ┊77┊    from: PropTypes.shape({</b>
<b>+┊  ┊78┊      username: PropTypes.string.isRequired,</b>
<b>+┊  ┊79┊    }),</b>
<b>+┊  ┊80┊    text: PropTypes.string.isRequired,</b>
<b>+┊  ┊81┊  }).isRequired,</b>
<b>+┊  ┊82┊  isCurrentUser: PropTypes.bool.isRequired,</b>
<b>+┊  ┊83┊};</b>
<b>+┊  ┊84┊</b>
<b>+┊  ┊85┊export default Message;</b>
</pre>

[}]: #

We add `Messages` to `AppNavigator` so it will stack on top of our `Main` screen when we navigate to it:

[{]: <helper> (diffStep 3.6 files="client/src/navigation.js")

#### [Step 3.6: Add Messages to Navigation](https://github.com/srtucker22/chatty/commit/fcb267e)

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 9┊ 9┊import { connect } from &#x27;react-redux&#x27;;
 ┊10┊10┊
 ┊11┊11┊import Groups from &#x27;./screens/groups.screen&#x27;;
<b>+┊  ┊12┊import Messages from &#x27;./screens/messages.screen&#x27;;</b>
 ┊12┊13┊
 ┊13┊14┊const styles &#x3D; StyleSheet.create({
 ┊14┊15┊  container: {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊45┊46┊
 ┊46┊47┊const AppNavigator &#x3D; StackNavigator({
 ┊47┊48┊  Main: { screen: MainScreenNavigator },
<b>+┊  ┊49┊  Messages: { screen: Messages },</b>
<b>+┊  ┊50┊}, {</b>
<b>+┊  ┊51┊  mode: &#x27;modal&#x27;,</b>
 ┊48┊52┊});
 ┊49┊53┊
 ┊50┊54┊// reducer initialization code
</pre>

[}]: #

Finally, modify `Groups` to handle pressing a `Group`. We can use `props.navigation.navigate`, which is passed to our `Groups` component via React Navigation, to push the `Messages` Screen:

[{]: <helper> (diffStep 3.6 files="client/src/screens/groups.screen.js")

#### [Step 3.6: Add Messages to Navigation](https://github.com/srtucker22/chatty/commit/fcb267e)

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊37┊37┊}));
 ┊38┊38┊
 ┊39┊39┊class Group extends Component {
<b>+┊  ┊40┊  constructor(props) {</b>
<b>+┊  ┊41┊    super(props);</b>
<b>+┊  ┊42┊</b>
<b>+┊  ┊43┊    this.goToMessages &#x3D; this.props.goToMessages.bind(this, this.props.group);</b>
<b>+┊  ┊44┊  }</b>
<b>+┊  ┊45┊</b>
 ┊40┊46┊  render() {
 ┊41┊47┊    const { id, name } &#x3D; this.props.group;
 ┊42┊48┊    return (
 ┊43┊49┊      &lt;TouchableHighlight
 ┊44┊50┊        key&#x3D;{id}
<b>+┊  ┊51┊        onPress&#x3D;{this.goToMessages}</b>
 ┊45┊52┊      &gt;
 ┊46┊53┊        &lt;View style&#x3D;{styles.groupContainer}&gt;
 ┊47┊54┊          &lt;Text style&#x3D;{styles.groupName}&gt;{&#x60;${name}&#x60;}&lt;/Text&gt;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊52┊59┊}
 ┊53┊60┊
 ┊54┊61┊Group.propTypes &#x3D; {
<b>+┊  ┊62┊  goToMessages: PropTypes.func.isRequired,</b>
 ┊55┊63┊  group: PropTypes.shape({
 ┊56┊64┊    id: PropTypes.number,
 ┊57┊65┊    name: PropTypes.string,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊63┊71┊    title: &#x27;Chats&#x27;,
 ┊64┊72┊  };
 ┊65┊73┊
<b>+┊  ┊74┊  constructor(props) {</b>
<b>+┊  ┊75┊    super(props);</b>
<b>+┊  ┊76┊    this.goToMessages &#x3D; this.goToMessages.bind(this);</b>
<b>+┊  ┊77┊  }</b>
<b>+┊  ┊78┊</b>
 ┊66┊79┊  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();
 ┊67┊80┊
<b>+┊  ┊81┊  goToMessages(group) {</b>
<b>+┊  ┊82┊    const { navigate } &#x3D; this.props.navigation;</b>
<b>+┊  ┊83┊    navigate(&#x27;Messages&#x27;, { groupId: group.id, title: group.name });</b>
<b>+┊  ┊84┊  }</b>
<b>+┊  ┊85┊</b>
<b>+┊  ┊86┊  renderItem &#x3D; ({ item }) &#x3D;&gt; &lt;Group group&#x3D;{item} goToMessages&#x3D;{this.goToMessages} /&gt;;</b>
 ┊69┊87┊
 ┊70┊88┊  render() {
 ┊71┊89┊    // render list of groups for user
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 80┊ 98┊    );
 ┊ 81┊ 99┊  }
 ┊ 82┊100┊}
<b>+┊   ┊101┊Groups.propTypes &#x3D; {</b>
<b>+┊   ┊102┊  navigation: PropTypes.shape({</b>
<b>+┊   ┊103┊    navigate: PropTypes.func,</b>
<b>+┊   ┊104┊  }),</b>
<b>+┊   ┊105┊};</b>
 ┊ 83┊106┊
 ┊ 84┊107┊export default Groups;
</pre>

[}]: #

Our app should now have simple layouts and routing for showing groups and pressing into a group to show that group’s message thread:

![Messages Gif](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step3-6.gif)

# GraphQL Queries with React-Apollo
Time to connect our data!

On our server, we created a `user` query which will give our client access to plenty of data for a given User. Let’s use this query in our `Groups` component to get the user’s list of groups. It’s good form to keep queries separate of components because queries can often be reused by multiple components. We will create a new folder `client/src/graphql` to house all our queries, and create `user.query.js` inside this folder:

[{]: <helper> (diffStep 3.7)

#### [Step 3.7: Create USER_QUERY](https://github.com/srtucker22/chatty/commit/d0eeee9)

##### Added client&#x2F;src&#x2F;graphql&#x2F;user.query.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import gql from &#x27;graphql-tag&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊// get the user and all user&#x27;s groups</b>
<b>+┊  ┊ 4┊export const USER_QUERY &#x3D; gql&#x60;</b>
<b>+┊  ┊ 5┊  query user($id: Int) {</b>
<b>+┊  ┊ 6┊    user(id: $id) {</b>
<b>+┊  ┊ 7┊      id</b>
<b>+┊  ┊ 8┊      email</b>
<b>+┊  ┊ 9┊      username</b>
<b>+┊  ┊10┊      groups {</b>
<b>+┊  ┊11┊        id</b>
<b>+┊  ┊12┊        name</b>
<b>+┊  ┊13┊      }</b>
<b>+┊  ┊14┊    }</b>
<b>+┊  ┊15┊  }</b>
<b>+┊  ┊16┊&#x60;;</b>
<b>+┊  ┊17┊</b>
<b>+┊  ┊18┊export default USER_QUERY;</b>
</pre>

[}]: #

This query should look just like something we would insert into GraphQL Playground. We just use `graphql-tag` to parse the query so that our client will make the proper GraphQL request to the server.

Inside `groups.screen.js`, we will import `USER_QUERY` and connect it to the `Groups` component via `react-apollo`. `react-apollo` exposes a `graphql` module which requires a query, and can be passed an Object with optional configuration parameters as its second argument. Using this second argument, we can declare variables that will be passed to the query:

```js
import { graphql, compose } from 'react-apollo';
import { USER_QUERY } from '../graphql/user.query';

// graphql() returns a func that can be applied to a React component
// set the id variable for USER_QUERY using the component's existing props
const userQuery = graphql(USER_QUERY, {
  options: (ownProps) => ({ variables: { id: ownProps.id }}),
});

// Groups props will now have a 'data' paramater with the results from graphql (e.g. this.props.data.user)
export default userQuery(Groups);
```

When we apply `userQuery` to the `Groups` component, Groups’ props will now also contain a `data` property with a loading parameter and the name of our Query (`user`):

```js
Groups.propTypes = {
  ...
  data: {
    loading: PropTypes.bool,
    user: PropTypes.shape({
      id: PropTypes.number.isRequired,
      email: PropTypes.string.isRequired,
      groups: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number.isRequired,
          name: PropTypes.string.isRequired,
        }),
      ),
    }),
  }
};
```

When the Query is loading, `props.data.loading` will be true and `props.data.user` will be `undefined`. When data is returned, `props.data.loading` will be `false` and `props.data.user` will be populated. There is also a neat trick we can do using the `props` parameter of options we pass to `graphql`:

```js
const userQuery = graphql(USER_QUERY, {
  options: (ownProps) => ({ variables: { id: ownProps.id } }),
  props: ({ data: { loading, user } }) => ({
    loading, user,
  }),
});
```

By using the `props` parameter in the `graphql` options, we can shape how we want the data to look on our component’s props. Here, we eliminate the `data` piece from `Groups.props` and directly place `loading` and `user` onto `Groups.props`.

Finally, we’ll modify our Groups component to render a loading screen while we are loading, and a list of Groups once we receive the data:

[{]: <helper> (diffStep 3.8)

#### [Step 3.8: Apply USER_QUERY to Groups](https://github.com/srtucker22/chatty/commit/a2841ee)

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 2┊ 1┊import PropTypes from &#x27;prop-types&#x27;;
 ┊ 3┊ 2┊import React, { Component } from &#x27;react&#x27;;
 ┊ 4┊ 3┊import {
 ┊ 5┊ 4┊  FlatList,
<b>+┊  ┊ 5┊  ActivityIndicator,</b>
 ┊ 6┊ 6┊  StyleSheet,
 ┊ 7┊ 7┊  Text,
 ┊ 8┊ 8┊  TouchableHighlight,
 ┊ 9┊ 9┊  View,
 ┊10┊10┊} from &#x27;react-native&#x27;;
<b>+┊  ┊11┊import { graphql } from &#x27;react-apollo&#x27;;</b>
<b>+┊  ┊12┊</b>
<b>+┊  ┊13┊import { USER_QUERY } from &#x27;../graphql/user.query&#x27;;</b>
 ┊11┊14┊
 ┊12┊15┊const styles &#x3D; StyleSheet.create({
 ┊13┊16┊  container: {
 ┊14┊17┊    backgroundColor: &#x27;white&#x27;,
 ┊15┊18┊    flex: 1,
 ┊16┊19┊  },
<b>+┊  ┊20┊  loading: {</b>
<b>+┊  ┊21┊    justifyContent: &#x27;center&#x27;,</b>
<b>+┊  ┊22┊    flex: 1,</b>
<b>+┊  ┊23┊  },</b>
 ┊17┊24┊  groupContainer: {
 ┊18┊25┊    flex: 1,
 ┊19┊26┊    flexDirection: &#x27;row&#x27;,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊30┊37┊  },
 ┊31┊38┊});
 ┊32┊39┊
 ┊39┊40┊class Group extends Component {
 ┊40┊41┊  constructor(props) {
 ┊41┊42┊    super(props);
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 86┊ 87┊  renderItem &#x3D; ({ item }) &#x3D;&gt; &lt;Group group&#x3D;{item} goToMessages&#x3D;{this.goToMessages} /&gt;;
 ┊ 87┊ 88┊
 ┊ 88┊ 89┊  render() {
<b>+┊   ┊ 90┊    const { loading, user } &#x3D; this.props;</b>
<b>+┊   ┊ 91┊</b>
<b>+┊   ┊ 92┊    // render loading placeholder while we fetch messages</b>
<b>+┊   ┊ 93┊    if (loading || !user) {</b>
<b>+┊   ┊ 94┊      return (</b>
<b>+┊   ┊ 95┊        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;</b>
<b>+┊   ┊ 96┊          &lt;ActivityIndicator /&gt;</b>
<b>+┊   ┊ 97┊        &lt;/View&gt;</b>
<b>+┊   ┊ 98┊      );</b>
<b>+┊   ┊ 99┊    }</b>
<b>+┊   ┊100┊</b>
 ┊ 89┊101┊    // render list of groups for user
 ┊ 90┊102┊    return (
 ┊ 91┊103┊      &lt;View style&#x3D;{styles.container}&gt;
 ┊ 92┊104┊        &lt;FlatList
<b>+┊   ┊105┊          data&#x3D;{user.groups}</b>
 ┊ 94┊106┊          keyExtractor&#x3D;{this.keyExtractor}
 ┊ 95┊107┊          renderItem&#x3D;{this.renderItem}
 ┊ 96┊108┊        /&gt;
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊102┊114┊  navigation: PropTypes.shape({
 ┊103┊115┊    navigate: PropTypes.func,
 ┊104┊116┊  }),
<b>+┊   ┊117┊  loading: PropTypes.bool,</b>
<b>+┊   ┊118┊  user: PropTypes.shape({</b>
<b>+┊   ┊119┊    id: PropTypes.number.isRequired,</b>
<b>+┊   ┊120┊    email: PropTypes.string.isRequired,</b>
<b>+┊   ┊121┊    groups: PropTypes.arrayOf(</b>
<b>+┊   ┊122┊      PropTypes.shape({</b>
<b>+┊   ┊123┊        id: PropTypes.number.isRequired,</b>
<b>+┊   ┊124┊        name: PropTypes.string.isRequired,</b>
<b>+┊   ┊125┊      }),</b>
<b>+┊   ┊126┊    ),</b>
<b>+┊   ┊127┊  }),</b>
 ┊105┊128┊};
 ┊106┊129┊
<b>+┊   ┊130┊const userQuery &#x3D; graphql(USER_QUERY, {</b>
<b>+┊   ┊131┊  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now</b>
<b>+┊   ┊132┊  props: ({ data: { loading, user } }) &#x3D;&gt; ({</b>
<b>+┊   ┊133┊    loading, user,</b>
<b>+┊   ┊134┊  }),</b>
<b>+┊   ┊135┊});</b>
<b>+┊   ┊136┊</b>
<b>+┊   ┊137┊export default userQuery(Groups);</b>
</pre>

[}]: #

By passing in `{id: 1}` for our variables, we are pretending to be logged in as the User with id = 1. In Part 7 of these tutorials, we will add authentication to our application so we don’t have to fake it anymore.

With our server running, if we refresh the application, we should see the groups displayed for User id = 1: ![User Groups Img](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step3-8.png)

## A Few Different Ways to Connect GraphQL and React
`react-apollo` actually gives us [multiple ways to connect data from a GraphQL Query to a React component](http://dev.apollodata.com/react/higher-order-components.html).

1. The most straightforward way is to use the `graphql` module from `react-apollo`:

```js
import { graphql } from 'react-apollo';

...

// graqphql(QUERY, queryConfig)(Component)
const componentWithData = graphql(USER_QUERY, {
  options: () => ({ variables: { id: 1 } }),
  props: ({ data: { loading, user } }) => ({
    loading, user,
  }),
})(Groups);

export default componentWithData;
```

2. `withApollo` gives direct access to your `ApolloClient` instance as a prop to your wrapped component. If you’re trying to do something fancy with custom logic like a one-off query, this module let’s you take charge of how your component gets its data:

```js
import { withApollo } from 'react-apollo';
import ApolloClient from 'apollo-client';

Groups.propTypes = {
  client: React.PropTypes.instanceOf(ApolloClient),
}

// GroupsWithApollo now has props.client with ApolloClient
const GroupsWithApollo = withApollo(Groups);
```

3. My personal favorite method is the `react-apollo` `compose` module, which makes it easy to elegantly attach multiple queries, mutations, subscriptions, and your Redux store to the component in a single assignment:

```js
import { graphql, compose } from 'react-apollo';
import { connect } from 'react-redux';

...

const userQuery = graphql(USER_QUERY, {
  options: () => ({ variables: { id: 1 } }),
  props: ({ data: { loading, user } }) => ({
    loading, user,
  }),
});
const otherQuery = graphql(OTHER_QUERY, otherConfig);

// this is fire!
const componentWithData = compose(
  userQuery,                                    // first query
  otherQuery,                                   // second query
  connect(mapStateToProps, mapDispatchToProps), // redux
)(Groups);

export default componentWithData;
```

# Getting Messages
I think this might be a good moment to reflect on the coolness of GraphQL.

In the olden days, to get data for the Screen for our Messages, we might start by consuming a REST API that gets Messages. But later down the line, we might also need to show details about the Group. In order to accomplish this, we would either have to make calls to different endpoints for Group details and Messages associated with the Group, or stuff the Messages into our Group endpoint. Womp.

With GraphQL, we can run a single call for exactly what we need in whatever shape we want. We can think about getting data starting with a node and going down the graph. In this case, we can query for a Group, and within that Group, request the associated Messages in the amount we want, and modify that amount when we need.

This time, let’s try using `compose`. Our process will be similar to the one we used before:

1. Create a GraphQL Query for getting the Group
2. Add configuration params for our Query (like a variable to identify which Group we need)
3. Use the react-apollo graphql module to wrap the Messages component, passing in the Query and configuration params. We’ll also use compose just to get a feel for it.
Let’s start by creating our query in `client/src/graphql/group.query.js`:

[{]: <helper> (diffStep 3.9)

#### [Step 3.9: Create GROUP_QUERY](https://github.com/srtucker22/chatty/commit/13f62e4)

##### Added client&#x2F;src&#x2F;graphql&#x2F;group.query.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
<b>+┊  ┊ 1┊import gql from &#x27;graphql-tag&#x27;;</b>
<b>+┊  ┊ 2┊</b>
<b>+┊  ┊ 3┊const GROUP_QUERY &#x3D; gql&#x60;</b>
<b>+┊  ┊ 4┊  query group($groupId: Int!) {</b>
<b>+┊  ┊ 5┊    group(id: $groupId) {</b>
<b>+┊  ┊ 6┊      id</b>
<b>+┊  ┊ 7┊      name</b>
<b>+┊  ┊ 8┊      users {</b>
<b>+┊  ┊ 9┊        id</b>
<b>+┊  ┊10┊        username</b>
<b>+┊  ┊11┊      }</b>
<b>+┊  ┊12┊      messages {</b>
<b>+┊  ┊13┊        id</b>
<b>+┊  ┊14┊        from {</b>
<b>+┊  ┊15┊          id</b>
<b>+┊  ┊16┊          username</b>
<b>+┊  ┊17┊        }</b>
<b>+┊  ┊18┊        createdAt</b>
<b>+┊  ┊19┊        text</b>
<b>+┊  ┊20┊      }</b>
<b>+┊  ┊21┊    }</b>
<b>+┊  ┊22┊  }</b>
<b>+┊  ┊23┊&#x60;;</b>
<b>+┊  ┊24┊</b>
<b>+┊  ┊25┊export default GROUP_QUERY;</b>
</pre>

[}]: #

So this Query is pretty cool. Given a `groupId`, we can get whatever features of the `Group` we need including the `Messages`. For now, we are asking for all the `Messages` in this `Group`. That’s a good starting point, but later we’ll modify this query to return a limited number of `Messages` at a time, and append more `Messages` as the user scrolls.

Finally, let’s attach our `GROUP_QUERY` to the `Messages` component:

[{]: <helper> (diffStep "3.10")

#### [Step 3.10: Apply GROUP_QUERY to Messages](https://github.com/srtucker22/chatty/commit/6cd6eaa)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊2┊1┊import {
<b>+┊ ┊2┊  ActivityIndicator,</b>
 ┊3┊3┊  FlatList,
 ┊4┊4┊  StyleSheet,
 ┊5┊5┊  View,
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 7┊ 7┊import PropTypes from &#x27;prop-types&#x27;;
 ┊ 8┊ 8┊import React, { Component } from &#x27;react&#x27;;
 ┊ 9┊ 9┊import randomColor from &#x27;randomcolor&#x27;;
<b>+┊  ┊10┊import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
 ┊10┊11┊
 ┊11┊12┊import Message from &#x27;../components/message.component&#x27;;
<b>+┊  ┊13┊import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;</b>
 ┊12┊14┊
 ┊13┊15┊const styles &#x3D; StyleSheet.create({
 ┊14┊16┊  container: {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊17┊19┊    flex: 1,
 ┊18┊20┊    flexDirection: &#x27;column&#x27;,
 ┊19┊21┊  },
<b>+┊  ┊22┊  loading: {</b>
<b>+┊  ┊23┊    justifyContent: &#x27;center&#x27;,</b>
 ┊34┊24┊  },
<b>+┊  ┊25┊});</b>
 ┊36┊26┊
 ┊37┊27┊class Messages extends Component {
 ┊38┊28┊  static navigationOptions &#x3D; ({ navigation }) &#x3D;&gt; {
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊42┊32┊    };
 ┊43┊33┊  };
 ┊44┊34┊
<b>+┊  ┊35┊  constructor(props) {</b>
<b>+┊  ┊36┊    super(props);</b>
<b>+┊  ┊37┊    const usernameColors &#x3D; {};</b>
<b>+┊  ┊38┊    if (props.group &amp;&amp; props.group.users) {</b>
<b>+┊  ┊39┊      props.group.users.forEach((user) &#x3D;&gt; {</b>
<b>+┊  ┊40┊        usernameColors[user.username] &#x3D; randomColor();</b>
<b>+┊  ┊41┊      });</b>
<b>+┊  ┊42┊    }</b>
<b>+┊  ┊43┊</b>
<b>+┊  ┊44┊    this.state &#x3D; {</b>
<b>+┊  ┊45┊      usernameColors,</b>
<b>+┊  ┊46┊    };</b>
<b>+┊  ┊47┊</b>
<b>+┊  ┊48┊    this.renderItem &#x3D; this.renderItem.bind(this);</b>
<b>+┊  ┊49┊  }</b>
<b>+┊  ┊50┊</b>
<b>+┊  ┊51┊  componentWillReceiveProps(nextProps) {</b>
<b>+┊  ┊52┊    const usernameColors &#x3D; {};</b>
<b>+┊  ┊53┊    // check for new messages</b>
<b>+┊  ┊54┊    if (nextProps.group) {</b>
<b>+┊  ┊55┊      if (nextProps.group.users) {</b>
<b>+┊  ┊56┊        // apply a color to each user</b>
<b>+┊  ┊57┊        nextProps.group.users.forEach((user) &#x3D;&gt; {</b>
<b>+┊  ┊58┊          usernameColors[user.username] &#x3D; this.state.usernameColors[user.username] || randomColor();</b>
<b>+┊  ┊59┊        });</b>
<b>+┊  ┊60┊      }</b>
 ┊46┊61┊
<b>+┊  ┊62┊      this.setState({</b>
<b>+┊  ┊63┊        usernameColors,</b>
<b>+┊  ┊64┊      });</b>
<b>+┊  ┊65┊    }</b>
<b>+┊  ┊66┊  }</b>
<b>+┊  ┊67┊</b>
<b>+┊  ┊68┊  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();</b>
<b>+┊  ┊69┊</b>
<b>+┊  ┊70┊  renderItem &#x3D; ({ item: message }) &#x3D;&gt; (</b>
 ┊48┊71┊    &lt;Message
<b>+┊  ┊72┊      color&#x3D;{this.state.usernameColors[message.from.username]}</b>
<b>+┊  ┊73┊      isCurrentUser&#x3D;{message.from.id &#x3D;&#x3D;&#x3D; 1} // for now until we implement auth</b>
 ┊51┊74┊      message&#x3D;{message}
 ┊52┊75┊    /&gt;
 ┊53┊76┊  )
 ┊54┊77┊
 ┊55┊78┊  render() {
<b>+┊  ┊79┊    const { loading, group } &#x3D; this.props;</b>
<b>+┊  ┊80┊</b>
<b>+┊  ┊81┊    // render loading placeholder while we fetch messages</b>
<b>+┊  ┊82┊    if (loading &amp;&amp; !group) {</b>
<b>+┊  ┊83┊      return (</b>
<b>+┊  ┊84┊        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;</b>
<b>+┊  ┊85┊          &lt;ActivityIndicator /&gt;</b>
<b>+┊  ┊86┊        &lt;/View&gt;</b>
<b>+┊  ┊87┊      );</b>
<b>+┊  ┊88┊    }</b>
<b>+┊  ┊89┊</b>
 ┊56┊90┊    // render list of messages for group
 ┊57┊91┊    return (
 ┊58┊92┊      &lt;View style&#x3D;{styles.container}&gt;
 ┊59┊93┊        &lt;FlatList
<b>+┊  ┊94┊          data&#x3D;{group.messages.slice().reverse()}</b>
 ┊61┊95┊          keyExtractor&#x3D;{this.keyExtractor}
 ┊62┊96┊          renderItem&#x3D;{this.renderItem}
 ┊63┊97┊          ListEmptyComponent&#x3D;{&lt;View /&gt;}
</pre>
<pre>
<i>╔══════╗</i>
<i>║ diff ║</i>
<i>╚══════╝</i>
 ┊ 67┊101┊  }
 ┊ 68┊102┊}
 ┊ 69┊103┊
<b>+┊   ┊104┊Messages.propTypes &#x3D; {</b>
<b>+┊   ┊105┊  group: PropTypes.shape({</b>
<b>+┊   ┊106┊    messages: PropTypes.array,</b>
<b>+┊   ┊107┊    users: PropTypes.array,</b>
<b>+┊   ┊108┊  }),</b>
<b>+┊   ┊109┊  loading: PropTypes.bool,</b>
<b>+┊   ┊110┊};</b>
<b>+┊   ┊111┊</b>
<b>+┊   ┊112┊const groupQuery &#x3D; graphql(GROUP_QUERY, {</b>
<b>+┊   ┊113┊  options: ownProps &#x3D;&gt; ({</b>
<b>+┊   ┊114┊    variables: {</b>
<b>+┊   ┊115┊      groupId: ownProps.navigation.state.params.groupId,</b>
<b>+┊   ┊116┊    },</b>
<b>+┊   ┊117┊  }),</b>
<b>+┊   ┊118┊  props: ({ data: { loading, group } }) &#x3D;&gt; ({</b>
<b>+┊   ┊119┊    loading, group,</b>
<b>+┊   ┊120┊  }),</b>
<b>+┊   ┊121┊});</b>
<b>+┊   ┊122┊</b>
<b>+┊   ┊123┊export default compose(</b>
<b>+┊   ┊124┊  groupQuery,</b>
<b>+┊   ┊125┊)(Messages);</b>
</pre>

[}]: #

If we fire up the app, we should see our messages: ![Result Img](https://github.com/srtucker22/chatty/blob/master/.tortilla/media/step3-10.gif)


[//]: # (foot-start)

[{]: <helper> (navStep)

⟸ <a href="https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/medium/step2.md">PREVIOUS STEP</a> <b>║</b> <a href="https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/medium/step4.md">NEXT STEP</a> ⟹

[}]: #

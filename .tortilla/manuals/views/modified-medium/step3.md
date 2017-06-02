# Step 3: GraphQL Queries with React Apollo

This is the third blog in a multipart series where we will be building Chatty, a WhatsApp clone, using [React Native](https://facebook.github.io/react-native/) and [Apollo](http://dev.apollodata.com/).

Here’s what we will accomplish in this tutorial:
1. Create the basic layout for our React Native application
2. Build GraphQL Queries using `react-apollo`

First we’re going to need a few packages:

```
# make sure to add these packages to client folder!!!
cd client
yarn add lodash moment graphql-tag prop-types randomcolor react-navigation
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

[{]: <helper> (diffStep 3.1 files="client/src/navigation.js")

#### Step 3.1: Create AppWithNavigationState

##### Added client&#x2F;src&#x2F;navigation.js
<pre>

...

<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import React from &#x27;react&#x27;;</b>
<b>import { addNavigationHelpers, StackNavigator, TabNavigator } from &#x27;react-navigation&#x27;;</b>
<b>import { Text, View, StyleSheet } from &#x27;react-native&#x27;;</b>
<b>import { connect } from &#x27;react-redux&#x27;;</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    flex: 1,</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>    backgroundColor: &#x27;white&#x27;,</b>
<b>  },</b>
<b>  tabText: {</b>
<b>    color: &#x27;#777&#x27;,</b>
<b>    fontSize: 10,</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>  },</b>
<b>  selected: {</b>
<b>    color: &#x27;blue&#x27;,</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>const TestScreen &#x3D; title &#x3D;&gt; () &#x3D;&gt; (</b>
<b>  &lt;View style&#x3D;{styles.container}&gt;</b>
<b>    &lt;Text&gt;</b>
<b>      {title}</b>
<b>    &lt;/Text&gt;</b>
<b>  &lt;/View&gt;</b>
<b>);</b>
<b></b>
<b>// tabs in main screen</b>
<b>const MainScreenNavigator &#x3D; TabNavigator({</b>
<b>  Chats: { screen: TestScreen(&#x27;Chats&#x27;) },</b>
<b>  Settings: { screen: TestScreen(&#x27;Settings&#x27;) },</b>
<b>});</b>
<b></b>
<b>const AppNavigator &#x3D; StackNavigator({</b>
<b>  Main: { screen: MainScreenNavigator },</b>
<b>});</b>
<b></b>
<b>// reducer initialization code</b>
<b>const firstAction &#x3D; AppNavigator.router.getActionForPathAndParams(&#x27;Main&#x27;);</b>
<b>const tempNavState &#x3D; AppNavigator.router.getStateForAction(firstAction);</b>
<b>const initialNavState &#x3D; AppNavigator.router.getStateForAction(</b>
<b>  tempNavState,</b>
<b>);</b>
<b></b>
<b>// reducer code</b>
<b>export const navigationReducer &#x3D; (state &#x3D; initialNavState, action) &#x3D;&gt; {</b>
<b>  let nextState;</b>
<b>  switch (action.type) {</b>
<b>    default:</b>
<b>      nextState &#x3D; AppNavigator.router.getStateForAction(action, state);</b>
<b>      break;</b>
<b>  }</b>
<b></b>
<b>  // Simply return the original &#x60;state&#x60; if &#x60;nextState&#x60; is null or undefined.</b>
<b>  return nextState || state;</b>
<b>};</b>
<b></b>
<b>const AppWithNavigationState &#x3D; ({ dispatch, nav }) &#x3D;&gt; (</b>
<b>  &lt;AppNavigator navigation&#x3D;{addNavigationHelpers({ dispatch, state: nav })} /&gt;</b>
<b>);</b>
<b></b>
<b>AppWithNavigationState.propTypes &#x3D; {</b>
<b>  dispatch: PropTypes.func.isRequired,</b>
<b>  nav: PropTypes.object.isRequired,</b>
<b>};</b>
<b></b>
<b>const mapStateToProps &#x3D; state &#x3D;&gt; ({</b>
<b>  nav: state.nav,</b>
<b>});</b>
<b></b>
<b>export default connect(mapStateToProps)(AppWithNavigationState);</b>
</pre>

[}]: #

This setup will create a `StackNavigator` named `AppNavigator` that will hold all our Screens. A `StackNavigator` stacks Screens on top of each other like pancakes when we navigate to them. 

Within `AppNavigator`, we can add different Screens and other Navigators that can be pushed onto the stack. 

`MainScreenNavigator` is a `TabNavigator`, which means it organizes Screens in tabs. The Screens within MainScreenNavigator are just placeholders which display the title of the Screen for now. `MainScreenNavigator` will be our default view, so we've added it as the first Screen in `AppNavigator`. 

We also have created a basic reducer for our navigator (`navigatorReducer`) to track navigation actions in Redux. We use `connect` from `react-redux` to connect our AppNavigator to Redux.

We can update `app.js` to use our new Redux connected `AppWithNavigationState` component and combine `navigationReducer` with our `apollo` reducer:

[{]: <helper> (diffStep 3.2)

#### Step 3.2: Connect Navitgation to App

##### Changed client&#x2F;src&#x2F;app.js
<pre>

...

import React, { Component } from &#x27;react&#x27;;

import { ApolloProvider } from &#x27;react-apollo&#x27;;
import { createStore, combineReducers, applyMiddleware } from &#x27;redux&#x27;;
import { composeWithDevTools } from &#x27;redux-devtools-extension&#x27;;
import ApolloClient, { createNetworkInterface } from &#x27;apollo-client&#x27;;

<b>import AppWithNavigationState, { navigationReducer } from &#x27;./navigation&#x27;;</b>
<b></b>
const networkInterface &#x3D; createNetworkInterface({ uri: &#x27;http://localhost:8080/graphql&#x27; });
const client &#x3D; new ApolloClient({
  networkInterface,
</pre>
<pre>

...

const store &#x3D; createStore(
  combineReducers({
    apollo: client.reducer(),
<b>    nav: navigationReducer,</b>
  }),
  {}, // initial state
  composeWithDevTools(
</pre>
<pre>

...

  ),
);

export default class App extends Component {
  render() {
    return (
      &lt;ApolloProvider store&#x3D;{store} client&#x3D;{client}&gt;
<b>        &lt;AppWithNavigationState /&gt;</b>
      &lt;/ApolloProvider&gt;
    );
  }
</pre>

[}]: #

Refresh the app to see some simple tabs: ![Tabs Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step3-2.gif)

On the `Chats` tab, we want to show a list of the user’s groups. We’ll create a `Groups` screen component in a new file `client/src/screens/groups.screen.js`:

[{]: <helper> (diffStep 3.3 files="client/src/screens/groups.screen.js")

#### Step 3.3: Create Groups Screen

##### Added client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>

...

<b>import { _ } from &#x27;lodash&#x27;;</b>
<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import React, { Component } from &#x27;react&#x27;;</b>
<b>import {</b>
<b>  FlatList,</b>
<b>  StyleSheet,</b>
<b>  Text,</b>
<b>  TouchableHighlight,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    backgroundColor: &#x27;white&#x27;,</b>
<b>    flex: 1,</b>
<b>  },</b>
<b>  groupContainer: {</b>
<b>    flex: 1,</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>    backgroundColor: &#x27;white&#x27;,</b>
<b>    borderBottomColor: &#x27;#eee&#x27;,</b>
<b>    borderBottomWidth: 1,</b>
<b>    paddingHorizontal: 12,</b>
<b>    paddingVertical: 8,</b>
<b>  },</b>
<b>  groupName: {</b>
<b>    fontWeight: &#x27;bold&#x27;,</b>
<b>    flex: 0.7,</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>// create fake data to populate our ListView</b>
<b>const fakeData &#x3D; () &#x3D;&gt; _.times(100, i &#x3D;&gt; ({</b>
<b>  id: i,</b>
<b>  name: &#x60;Group ${i}&#x60;,</b>
<b>}));</b>
<b></b>
<b>class Group extends Component {</b>
<b>  render() {</b>
<b>    const { id, name } &#x3D; this.props.group;</b>
<b>    return (</b>
<b>      &lt;TouchableHighlight</b>
<b>        key&#x3D;{id}</b>
<b>      &gt;</b>
<b>        &lt;View style&#x3D;{styles.groupContainer}&gt;</b>
<b>          &lt;Text style&#x3D;{styles.groupName}&gt;{&#x60;${name}&#x60;}&lt;/Text&gt;</b>
<b>        &lt;/View&gt;</b>
<b>      &lt;/TouchableHighlight&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b></b>
<b>Group.propTypes &#x3D; {</b>
<b>  group: PropTypes.shape({</b>
<b>    id: PropTypes.number,</b>
<b>    name: PropTypes.string,</b>
<b>  }),</b>
<b>};</b>
<b></b>
<b>class Groups extends Component {</b>
<b>  static navigationOptions &#x3D; {</b>
<b>    title: &#x27;Chats&#x27;,</b>
<b>  };</b>
<b></b>
<b>  keyExtractor &#x3D; item &#x3D;&gt; item.id;</b>
<b></b>
<b>  renderItem &#x3D; ({ item }) &#x3D;&gt; &lt;Group group&#x3D;{item} /&gt;;</b>
<b></b>
<b>  render() {</b>
<b>    // render list of groups for user</b>
<b>    return (</b>
<b>      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>        &lt;FlatList</b>
<b>          data&#x3D;{fakeData()}</b>
<b>          keyExtractor&#x3D;{this.keyExtractor}</b>
<b>          renderItem&#x3D;{this.renderItem}</b>
<b>        /&gt;</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b></b>
<b>export default Groups;</b>
</pre>

[}]: #

And insert `Groups` into our `AppNavigator`:

[{]: <helper> (diffStep 3.3 files="client/src/navigation.js")

#### Step 3.3: Create Groups Screen

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>

...

import { Text, View, StyleSheet } from &#x27;react-native&#x27;;
import { connect } from &#x27;react-redux&#x27;;

<b>import Groups from &#x27;./screens/groups.screen&#x27;;</b>
<b></b>
const styles &#x3D; StyleSheet.create({
  container: {
    flex: 1,
</pre>
<pre>

...


// tabs in main screen
const MainScreenNavigator &#x3D; TabNavigator({
<b>  Chats: { screen: Groups },</b>
  Settings: { screen: TestScreen(&#x27;Settings&#x27;) },
});

</pre>

[}]: #

When the user presses one of the rows in our `FlatList`, we want to push a new Screen with the message thread for the selected group. For this Screen, we’ll create a new `Messages` component which will hold a list of `Message` components:

[{]: <helper> (diffStep 3.4)

#### Step 3.4: Create Messages Screen

##### Added client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

<b>import { _ } from &#x27;lodash&#x27;;</b>
<b>import {</b>
<b>  FlatList,</b>
<b>  StyleSheet,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import React, { Component } from &#x27;react&#x27;;</b>
<b>import randomColor from &#x27;randomcolor&#x27;;</b>
<b></b>
<b>import Message from &#x27;../components/message.component&#x27;;</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    alignItems: &#x27;stretch&#x27;,</b>
<b>    backgroundColor: &#x27;#e5ddd5&#x27;,</b>
<b>    flex: 1,</b>
<b>    flexDirection: &#x27;column&#x27;,</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>const fakeData &#x3D; () &#x3D;&gt; _.times(100, i &#x3D;&gt; ({</b>
<b>  // every message will have a different color</b>
<b>  color: randomColor(),</b>
<b>  // every 5th message will look like it&#x27;s from the current user</b>
<b>  isCurrentUser: i % 5 &#x3D;&#x3D;&#x3D; 0,</b>
<b>  message: {</b>
<b>    id: i,</b>
<b>    createdAt: new Date().toISOString(),</b>
<b>    from: {</b>
<b>      username: &#x60;Username ${i}&#x60;,</b>
<b>    },</b>
<b>    text: &#x60;Message ${i}&#x60;,</b>
<b>  },</b>
<b>}));</b>
<b></b>
<b>class Messages extends Component {</b>
<b>  static navigationOptions &#x3D; ({ navigation }) &#x3D;&gt; {</b>
<b>    const { state } &#x3D; navigation;</b>
<b>    return {</b>
<b>      title: state.params.title,</b>
<b>    };</b>
<b>  };</b>
<b></b>
<b>  keyExtractor &#x3D; item &#x3D;&gt; item.message.id;</b>
<b></b>
<b>  renderItem &#x3D; ({ item: { isCurrentUser, message, color } }) &#x3D;&gt; (</b>
<b>    &lt;Message</b>
<b>      color&#x3D;{color}</b>
<b>      isCurrentUser&#x3D;{isCurrentUser}</b>
<b>      message&#x3D;{message}</b>
<b>    /&gt;</b>
<b>  )</b>
<b></b>
<b>  render() {</b>
<b>    // render list of messages for group</b>
<b>    return (</b>
<b>      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>        &lt;FlatList</b>
<b>          data&#x3D;{fakeData()}</b>
<b>          keyExtractor&#x3D;{this.keyExtractor}</b>
<b>          renderItem&#x3D;{this.renderItem}</b>
<b>          ListEmptyComponent&#x3D;{&lt;View /&gt;}</b>
<b>        /&gt;</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b></b>
<b>export default Messages;</b>
</pre>

[}]: #

We’ll also write the code for the individual `Message` components that populate the `FlatList` in `Messages`:

[{]: <helper> (diffStep 3.5)

#### Step 3.5: Create Message Component

##### Added client&#x2F;src&#x2F;components&#x2F;message.component.js
<pre>

...

<b>import moment from &#x27;moment&#x27;;</b>
<b>import React, { PureComponent } from &#x27;react&#x27;;</b>
<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import {</b>
<b>  StyleSheet,</b>
<b>  Text,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    flex: 1,</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>  },</b>
<b>  message: {</b>
<b>    flex: 0.8,</b>
<b>    backgroundColor: &#x27;white&#x27;,</b>
<b>    borderRadius: 6,</b>
<b>    marginHorizontal: 16,</b>
<b>    marginVertical: 2,</b>
<b>    paddingHorizontal: 8,</b>
<b>    paddingVertical: 6,</b>
<b>    shadowColor: &#x27;black&#x27;,</b>
<b>    shadowOpacity: 0.5,</b>
<b>    shadowRadius: 1,</b>
<b>    shadowOffset: {</b>
<b>      height: 1,</b>
<b>    },</b>
<b>  },</b>
<b>  myMessage: {</b>
<b>    backgroundColor: &#x27;#dcf8c6&#x27;,</b>
<b>  },</b>
<b>  messageUsername: {</b>
<b>    color: &#x27;red&#x27;,</b>
<b>    fontWeight: &#x27;bold&#x27;,</b>
<b>    paddingBottom: 12,</b>
<b>  },</b>
<b>  messageTime: {</b>
<b>    color: &#x27;#8c8c8c&#x27;,</b>
<b>    fontSize: 11,</b>
<b>    textAlign: &#x27;right&#x27;,</b>
<b>  },</b>
<b>  messageSpacer: {</b>
<b>    flex: 0.2,</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>class Message extends PureComponent {</b>
<b>  render() {</b>
<b>    const { color, message, isCurrentUser } &#x3D; this.props;</b>
<b></b>
<b>    return (</b>
<b>      &lt;View key&#x3D;{message.id} style&#x3D;{styles.container}&gt;</b>
<b>        {isCurrentUser ? &lt;View style&#x3D;{styles.messageSpacer} /&gt; : undefined }</b>
<b>        &lt;View</b>
<b>          style&#x3D;{[styles.message, isCurrentUser &amp;&amp; styles.myMessage]}</b>
<b>        &gt;</b>
<b>          &lt;Text</b>
<b>            style&#x3D;{[</b>
<b>              styles.messageUsername,</b>
<b>              { color },</b>
<b>            ]}</b>
<b>          &gt;{message.from.username}&lt;/Text&gt;</b>
<b>          &lt;Text&gt;{message.text}&lt;/Text&gt;</b>
<b>          &lt;Text style&#x3D;{styles.messageTime}&gt;{moment(message.createdAt).format(&#x27;h:mm A&#x27;)}&lt;/Text&gt;</b>
<b>        &lt;/View&gt;</b>
<b>        {!isCurrentUser ? &lt;View style&#x3D;{styles.messageSpacer} /&gt; : undefined }</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b></b>
<b>Message.propTypes &#x3D; {</b>
<b>  color: PropTypes.string.isRequired,</b>
<b>  message: PropTypes.shape({</b>
<b>    createdAt: PropTypes.string.isRequired,</b>
<b>    from: PropTypes.shape({</b>
<b>      username: PropTypes.string.isRequired,</b>
<b>    }),</b>
<b>    text: PropTypes.string.isRequired,</b>
<b>  }).isRequired,</b>
<b>  isCurrentUser: PropTypes.bool.isRequired,</b>
<b>};</b>
<b></b>
<b>export default Message;</b>
</pre>

[}]: #

We add `Messages` to `AppNavigator` so it will stack on top of our `Main` screen when we navigate to it:

[{]: <helper> (diffStep 3.6 files="client/src/navigation.js")

#### Step 3.6: Add Messages to Navigation

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>

...

import { connect } from &#x27;react-redux&#x27;;

import Groups from &#x27;./screens/groups.screen&#x27;;
<b>import Messages from &#x27;./screens/messages.screen&#x27;;</b>

const styles &#x3D; StyleSheet.create({
  container: {
</pre>
<pre>

...


const AppNavigator &#x3D; StackNavigator({
  Main: { screen: MainScreenNavigator },
<b>  Messages: { screen: Messages },</b>
<b>}, {</b>
<b>  mode: &#x27;modal&#x27;,</b>
});

// reducer initialization code
</pre>

[}]: #

Finally, modify `Groups` to handle pressing a `Group`. We can use `props.navigation.navigate`, which is passed to our `Groups` component via React Navigation, to push the `Messages` Screen:

[{]: <helper> (diffStep 3.6 files="client/src/screens/groups.screen.js")

#### Step 3.6: Add Messages to Navigation

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>

...

}));

class Group extends Component {
<b>  constructor(props) {</b>
<b>    super(props);</b>
<b></b>
<b>    this.goToMessages &#x3D; this.props.goToMessages.bind(this, this.props.group);</b>
<b>  }</b>
<b></b>
  render() {
    const { id, name } &#x3D; this.props.group;
    return (
      &lt;TouchableHighlight
        key&#x3D;{id}
<b>        onPress&#x3D;{this.goToMessages}</b>
      &gt;
        &lt;View style&#x3D;{styles.groupContainer}&gt;
          &lt;Text style&#x3D;{styles.groupName}&gt;{&#x60;${name}&#x60;}&lt;/Text&gt;
</pre>
<pre>

...

}

Group.propTypes &#x3D; {
<b>  goToMessages: PropTypes.func.isRequired,</b>
  group: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
</pre>
<pre>

...

    title: &#x27;Chats&#x27;,
  };

<b>  constructor(props) {</b>
<b>    super(props);</b>
<b>    this.goToMessages &#x3D; this.goToMessages.bind(this);</b>
<b>  }</b>
<b></b>
  keyExtractor &#x3D; item &#x3D;&gt; item.id;

<b>  goToMessages(group) {</b>
<b>    const { navigate } &#x3D; this.props.navigation;</b>
<b>    navigate(&#x27;Messages&#x27;, { groupId: group.id, title: group.name });</b>
<b>  }</b>
<b></b>
<b>  renderItem &#x3D; ({ item }) &#x3D;&gt; &lt;Group group&#x3D;{item} goToMessages&#x3D;{this.goToMessages} /&gt;;</b>

  render() {
    // render list of groups for user
</pre>
<pre>

...

    );
  }
}
<b>Groups.propTypes &#x3D; {</b>
<b>  navigation: PropTypes.shape({</b>
<b>    navigate: PropTypes.func,</b>
<b>  }),</b>
<b>};</b>

export default Groups;
</pre>

[}]: #

Our app should now have simple layouts and routing for showing groups and pressing into a group to show that group’s message thread:

![Messages Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step3-6.gif)

# GraphQL Queries with React-Apollo
Time to connect our data!

On our server, we created a `user` query which will give our client access to plenty of data for a given User. Let’s use this query in our `Groups` component to get the user’s list of groups. It’s good form to keep queries separate of components because queries can often be reused by multiple components. We will create a new folder `client/src/graphql` to house all our queries, and create `user.query.js` inside this folder:

[{]: <helper> (diffStep 3.7)

#### Step 3.7: Create USER_QUERY

##### Added client&#x2F;src&#x2F;graphql&#x2F;user.query.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>// get the user and all user&#x27;s groups</b>
<b>export const USER_QUERY &#x3D; gql&#x60;</b>
<b>  query user($id: Int) {</b>
<b>    user(id: $id) {</b>
<b>      id</b>
<b>      email</b>
<b>      username</b>
<b>      groups {</b>
<b>        id</b>
<b>        name</b>
<b>      }</b>
<b>    }</b>
<b>  }</b>
<b>&#x60;;</b>
<b></b>
<b>export default USER_QUERY;</b>
</pre>

[}]: #

This query should look just like something we would insert into GraphIQL. We just use `graphql-tag` to parse the query so that our client will make the proper GraphQL request to the server.

Inside `groups.screen.js`, we will import `USER_QUERY` and connect it to the `Groups` component via `react-apollo`. `react-apollo` exposes a `graphql` module which requires a query, and can be passed an Object with optional configuration parameters as its second argument. Using this second argument, we can declare variables that will be passed to the query:

```
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

```
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

```
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

#### Step 3.8: Apply USER_QUERY to Groups

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>

...

import PropTypes from &#x27;prop-types&#x27;;
import React, { Component } from &#x27;react&#x27;;
import {
  FlatList,
<b>  ActivityIndicator,</b>
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from &#x27;react-native&#x27;;
<b>import { graphql } from &#x27;react-apollo&#x27;;</b>
<b></b>
<b>import { USER_QUERY } from &#x27;../graphql/user.query&#x27;;</b>

const styles &#x3D; StyleSheet.create({
  container: {
    backgroundColor: &#x27;white&#x27;,
    flex: 1,
  },
<b>  loading: {</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>    flex: 1,</b>
<b>  },</b>
  groupContainer: {
    flex: 1,
    flexDirection: &#x27;row&#x27;,
</pre>
<pre>

...

  },
});

class Group extends Component {
  constructor(props) {
    super(props);
</pre>
<pre>

...

  renderItem &#x3D; ({ item }) &#x3D;&gt; &lt;Group group&#x3D;{item} goToMessages&#x3D;{this.goToMessages} /&gt;;

  render() {
<b>    const { loading, user } &#x3D; this.props;</b>
<b></b>
<b>    // render loading placeholder while we fetch messages</b>
<b>    if (loading) {</b>
<b>      return (</b>
<b>        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;</b>
<b>          &lt;ActivityIndicator /&gt;</b>
<b>        &lt;/View&gt;</b>
<b>      );</b>
<b>    }</b>
<b></b>
    // render list of groups for user
    return (
      &lt;View style&#x3D;{styles.container}&gt;
        &lt;FlatList
<b>          data&#x3D;{user.groups}</b>
          keyExtractor&#x3D;{this.keyExtractor}
          renderItem&#x3D;{this.renderItem}
        /&gt;
</pre>
<pre>

...

  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
<b>  loading: PropTypes.bool,</b>
<b>  user: PropTypes.shape({</b>
<b>    id: PropTypes.number.isRequired,</b>
<b>    email: PropTypes.string.isRequired,</b>
<b>    groups: PropTypes.arrayOf(</b>
<b>      PropTypes.shape({</b>
<b>        id: PropTypes.number.isRequired,</b>
<b>        name: PropTypes.string.isRequired,</b>
<b>      }),</b>
<b>    ),</b>
<b>  }),</b>
};

<b>const userQuery &#x3D; graphql(USER_QUERY, {</b>
<b>  options: () &#x3D;&gt; ({ variables: { id: 1 } }), // fake the user for now</b>
<b>  props: ({ data: { loading, user } }) &#x3D;&gt; ({</b>
<b>    loading, user,</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>export default userQuery(Groups);</b>
</pre>

[}]: #

By passing in `{id: 1}` for our variables, we are pretending to be logged in as the User with id = 1. In Part 7 of these tutorials, we will add authentication to our application so we don’t have to fake it anymore.

With our server running, if we refresh the application, we should see the groups displayed for User id = 1: ![User Groups Img](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step3-8.png)

## A Few Different Ways to Connect GraphQL and React
`react-apollo` actually gives us [multiple ways to connect data from a GraphQL Query to a React component](http://dev.apollodata.com/react/higher-order-components.html).

1. The most straightforward way is to use the `graphql` module from `react-apollo`:

```
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

```
import { withApollo } from 'react-apollo';
import ApolloClient from 'apollo-client';

Groups.propTypes = {
  client: React.PropTypes.instanceOf(ApolloClient),
}

// GroupsWithApollo now has props.client with ApolloClient
const GroupsWithApollo = withApollo(Groups);
```

3. My personal favorite method is the `react-apollo` `compose` module, which makes it easy to elegantly attach multiple queries, mutations, subscriptions, and your Redux store to the component in a single assignment:

```
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

#### Step 3.9: Create GROUP_QUERY

##### Added client&#x2F;src&#x2F;graphql&#x2F;group.query.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>const GROUP_QUERY &#x3D; gql&#x60;</b>
<b>  query group($groupId: Int!) {</b>
<b>    group(id: $groupId) {</b>
<b>      id</b>
<b>      name</b>
<b>      users {</b>
<b>        id</b>
<b>        username</b>
<b>      }</b>
<b>      messages {</b>
<b>        id</b>
<b>        from {</b>
<b>          id</b>
<b>          username</b>
<b>        }</b>
<b>        createdAt</b>
<b>        text</b>
<b>      }</b>
<b>    }</b>
<b>  }</b>
<b>&#x60;;</b>
<b></b>
<b>export default GROUP_QUERY;</b>
</pre>

[}]: #

So this Query is pretty cool. Given a `groupId`, we can get whatever features of the `Group` we need including the `Messages`. For now, we are asking for all the `Messages` in this `Group`. That’s a good starting point, but later we’ll modify this query to return a limited number of `Messages` at a time, and append more `Messages` as the user scrolls.

Finally, let’s attach our `GROUP_QUERY` to the `Messages` component:

[{]: <helper> (diffStep "3.10")

#### Step 3.10: Apply GROUP_QUERY to Messages

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

import {
<b>  ActivityIndicator,</b>
  FlatList,
  StyleSheet,
  View,
</pre>
<pre>

...

import PropTypes from &#x27;prop-types&#x27;;
import React, { Component } from &#x27;react&#x27;;
import randomColor from &#x27;randomcolor&#x27;;
<b>import { graphql, compose } from &#x27;react-apollo&#x27;;</b>

import Message from &#x27;../components/message.component&#x27;;
<b>import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;</b>

const styles &#x3D; StyleSheet.create({
  container: {
</pre>
<pre>

...

    flex: 1,
    flexDirection: &#x27;column&#x27;,
  },
<b>  loading: {</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
  },
<b>});</b>

class Messages extends Component {
  static navigationOptions &#x3D; ({ navigation }) &#x3D;&gt; {
</pre>
<pre>

...

    };
  };

<b>  constructor(props) {</b>
<b>    super(props);</b>
<b>    const usernameColors &#x3D; {};</b>
<b>    if (props.group &amp;&amp; props.group.users) {</b>
<b>      props.group.users.forEach((user) &#x3D;&gt; {</b>
<b>        usernameColors[user.username] &#x3D; randomColor();</b>
<b>      });</b>
<b>    }</b>
<b></b>
<b>    this.state &#x3D; {</b>
<b>      usernameColors,</b>
<b>    };</b>
<b></b>
<b>    this.renderItem &#x3D; this.renderItem.bind(this);</b>
<b>  }</b>
<b></b>
<b>  componentWillReceiveProps(nextProps) {</b>
<b>    const usernameColors &#x3D; {};</b>
<b>    // check for new messages</b>
<b>    if (nextProps.group) {</b>
<b>      if (nextProps.group.users) {</b>
<b>        // apply a color to each user</b>
<b>        nextProps.group.users.forEach((user) &#x3D;&gt; {</b>
<b>          usernameColors[user.username] &#x3D; this.state.usernameColors[user.username] || randomColor();</b>
<b>        });</b>
<b>      }</b>

<b>      this.setState({</b>
<b>        usernameColors,</b>
<b>      });</b>
<b>    }</b>
<b>  }</b>
<b></b>
<b>  keyExtractor &#x3D; item &#x3D;&gt; item.id;</b>
<b></b>
<b>  renderItem &#x3D; ({ item: message }) &#x3D;&gt; (</b>
    &lt;Message
<b>      color&#x3D;{this.state.usernameColors[message.from.username]}</b>
<b>      isCurrentUser&#x3D;{message.from.id &#x3D;&#x3D;&#x3D; 1} // for now until we implement auth</b>
      message&#x3D;{message}
    /&gt;
  )

  render() {
<b>    const { loading, group } &#x3D; this.props;</b>
<b></b>
<b>    // render loading placeholder while we fetch messages</b>
<b>    if (loading &amp;&amp; !group) {</b>
<b>      return (</b>
<b>        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;</b>
<b>          &lt;ActivityIndicator /&gt;</b>
<b>        &lt;/View&gt;</b>
<b>      );</b>
<b>    }</b>
<b></b>
    // render list of messages for group
    return (
      &lt;View style&#x3D;{styles.container}&gt;
        &lt;FlatList
<b>          data&#x3D;{group.messages.slice().reverse()}</b>
          keyExtractor&#x3D;{this.keyExtractor}
          renderItem&#x3D;{this.renderItem}
          ListEmptyComponent&#x3D;{&lt;View /&gt;}
</pre>
<pre>

...

  }
}

<b>Messages.propTypes &#x3D; {</b>
<b>  group: PropTypes.shape({</b>
<b>    messages: PropTypes.array,</b>
<b>    users: PropTypes.array,</b>
<b>  }),</b>
<b>  loading: PropTypes.bool,</b>
<b>};</b>
<b></b>
<b>const groupQuery &#x3D; graphql(GROUP_QUERY, {</b>
<b>  options: ownProps &#x3D;&gt; ({</b>
<b>    variables: {</b>
<b>      groupId: ownProps.navigation.state.params.groupId,</b>
<b>    },</b>
<b>  }),</b>
<b>  props: ({ data: { loading, group } }) &#x3D;&gt; ({</b>
<b>    loading, group,</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>export default compose(</b>
<b>  groupQuery,</b>
<b>)(Messages);</b>
</pre>

[}]: #

If we fire up the app, we should see our messages: ![Result Img](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step3-10.gif)
[{]: <helper> (navStep)

| [< Previous Step](step6.md) |
|:----------------------|

[}]: #

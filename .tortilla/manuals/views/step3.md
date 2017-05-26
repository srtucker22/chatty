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
```diff
@@ -0,0 +1,75 @@
+┊  ┊ 1┊import PropTypes from 'prop-types';
+┊  ┊ 2┊import React from 'react';
+┊  ┊ 3┊import { addNavigationHelpers, StackNavigator, TabNavigator } from 'react-navigation';
+┊  ┊ 4┊import { Text, View, StyleSheet } from 'react-native';
+┊  ┊ 5┊import { connect } from 'react-redux';
+┊  ┊ 6┊
+┊  ┊ 7┊const styles = StyleSheet.create({
+┊  ┊ 8┊  container: {
+┊  ┊ 9┊    flex: 1,
+┊  ┊10┊    justifyContent: 'center',
+┊  ┊11┊    alignItems: 'center',
+┊  ┊12┊    backgroundColor: 'white',
+┊  ┊13┊  },
+┊  ┊14┊  tabText: {
+┊  ┊15┊    color: '#777',
+┊  ┊16┊    fontSize: 10,
+┊  ┊17┊    justifyContent: 'center',
+┊  ┊18┊  },
+┊  ┊19┊  selected: {
+┊  ┊20┊    color: 'blue',
+┊  ┊21┊  },
+┊  ┊22┊});
+┊  ┊23┊
+┊  ┊24┊const TestScreen = title => () => (
+┊  ┊25┊  <View style={styles.container}>
+┊  ┊26┊    <Text>
+┊  ┊27┊      {title}
+┊  ┊28┊    </Text>
+┊  ┊29┊  </View>
+┊  ┊30┊);
+┊  ┊31┊
+┊  ┊32┊// tabs in main screen
+┊  ┊33┊const MainScreenNavigator = TabNavigator({
+┊  ┊34┊  Chats: { screen: TestScreen('Chats') },
+┊  ┊35┊  Settings: { screen: TestScreen('Settings') },
+┊  ┊36┊});
+┊  ┊37┊
+┊  ┊38┊const AppNavigator = StackNavigator({
+┊  ┊39┊  Main: { screen: MainScreenNavigator },
+┊  ┊40┊});
+┊  ┊41┊
+┊  ┊42┊// reducer initialization code
+┊  ┊43┊const firstAction = AppNavigator.router.getActionForPathAndParams('Main');
+┊  ┊44┊const tempNavState = AppNavigator.router.getStateForAction(firstAction);
+┊  ┊45┊const initialNavState = AppNavigator.router.getStateForAction(
+┊  ┊46┊  tempNavState,
+┊  ┊47┊);
+┊  ┊48┊
+┊  ┊49┊// reducer code
+┊  ┊50┊export const navigationReducer = (state = initialNavState, action) => {
+┊  ┊51┊  let nextState;
+┊  ┊52┊  switch (action.type) {
+┊  ┊53┊    default:
+┊  ┊54┊      nextState = AppNavigator.router.getStateForAction(action, state);
+┊  ┊55┊      break;
+┊  ┊56┊  }
+┊  ┊57┊
+┊  ┊58┊  // Simply return the original `state` if `nextState` is null or undefined.
+┊  ┊59┊  return nextState || state;
+┊  ┊60┊};
+┊  ┊61┊
+┊  ┊62┊const AppWithNavigationState = ({ dispatch, nav }) => (
+┊  ┊63┊  <AppNavigator navigation={addNavigationHelpers({ dispatch, state: nav })} />
+┊  ┊64┊);
+┊  ┊65┊
+┊  ┊66┊AppWithNavigationState.propTypes = {
+┊  ┊67┊  dispatch: PropTypes.func.isRequired,
+┊  ┊68┊  nav: PropTypes.object.isRequired,
+┊  ┊69┊};
+┊  ┊70┊
+┊  ┊71┊const mapStateToProps = state => ({
+┊  ┊72┊  nav: state.nav,
+┊  ┊73┊});
+┊  ┊74┊
+┊  ┊75┊export default connect(mapStateToProps)(AppWithNavigationState);
```

[}]: #

This setup will create a `StackNavigator` named `AppNavigator` that will hold all our Screens. A `StackNavigator` stacks Screens on top of each other like pancakes when we navigate to them. 

Within `AppNavigator`, we can add different Screens and other Navigators that can be pushed onto the stack. 

`MainScreenNavigator` is a `TabNavigator`, which means it organizes Screens in tabs. The Screens within MainScreenNavigator are just placeholders which display the title of the Screen for now. `MainScreenNavigator` will be our default view, so we've added it as the first Screen in `AppNavigator`. 

We also have created a basic reducer for our navigator (`navigatorReducer`) to track navigation actions in Redux. We use `connect` from `react-redux` to connect our AppNavigator to Redux.

We can update `app.js` to use our new Redux connected `AppWithNavigationState` component and combine `navigationReducer` with our `apollo` reducer:

[{]: <helper> (diffStep 3.2)

#### Step 3.2: Connect Navitgation to App

##### Changed client&#x2F;src&#x2F;app.js
```diff
@@ -1,15 +1,12 @@
 ┊ 1┊ 1┊import React, { Component } from 'react';
-┊ 2┊  ┊import {
-┊ 3┊  ┊  StyleSheet,
-┊ 4┊  ┊  Text,
-┊ 5┊  ┊  View,
-┊ 6┊  ┊} from 'react-native';
 ┊ 7┊ 2┊
 ┊ 8┊ 3┊import { ApolloProvider } from 'react-apollo';
 ┊ 9┊ 4┊import { createStore, combineReducers, applyMiddleware } from 'redux';
 ┊10┊ 5┊import { composeWithDevTools } from 'redux-devtools-extension';
 ┊11┊ 6┊import ApolloClient, { createNetworkInterface } from 'apollo-client';
 ┊12┊ 7┊
+┊  ┊ 8┊import AppWithNavigationState, { navigationReducer } from './navigation';
+┊  ┊ 9┊
 ┊13┊10┊const networkInterface = createNetworkInterface({ uri: 'http://localhost:8080/graphql' });
 ┊14┊11┊const client = new ApolloClient({
 ┊15┊12┊  networkInterface,
```
```diff
@@ -18,6 +15,7 @@
 ┊18┊15┊const store = createStore(
 ┊19┊16┊  combineReducers({
 ┊20┊17┊    apollo: client.reducer(),
+┊  ┊18┊    nav: navigationReducer,
 ┊21┊19┊  }),
 ┊22┊20┊  {}, // initial state
 ┊23┊21┊  composeWithDevTools(
```
```diff
@@ -25,41 +23,11 @@
 ┊25┊23┊  ),
 ┊26┊24┊);
 ┊27┊25┊
-┊28┊  ┊const styles = StyleSheet.create({
-┊29┊  ┊  container: {
-┊30┊  ┊    flex: 1,
-┊31┊  ┊    justifyContent: 'center',
-┊32┊  ┊    alignItems: 'center',
-┊33┊  ┊    backgroundColor: '#F5FCFF',
-┊34┊  ┊  },
-┊35┊  ┊  welcome: {
-┊36┊  ┊    fontSize: 20,
-┊37┊  ┊    textAlign: 'center',
-┊38┊  ┊    margin: 10,
-┊39┊  ┊  },
-┊40┊  ┊  instructions: {
-┊41┊  ┊    textAlign: 'center',
-┊42┊  ┊    color: '#333333',
-┊43┊  ┊    marginBottom: 5,
-┊44┊  ┊  },
-┊45┊  ┊});
-┊46┊  ┊
 ┊47┊26┊export default class App extends Component {
 ┊48┊27┊  render() {
 ┊49┊28┊    return (
 ┊50┊29┊      <ApolloProvider store={store} client={client}>
-┊51┊  ┊        <View style={styles.container}>
-┊52┊  ┊          <Text style={styles.welcome}>
-┊53┊  ┊            Welcome to React Native!
-┊54┊  ┊          </Text>
-┊55┊  ┊          <Text style={styles.instructions}>
-┊56┊  ┊            To get started, edit index.ios.js
-┊57┊  ┊          </Text>
-┊58┊  ┊          <Text style={styles.instructions}>
-┊59┊  ┊            Press Cmd+R to reload,{'\n'}
-┊60┊  ┊            Cmd+D or shake for dev menu
-┊61┊  ┊          </Text>
-┊62┊  ┊        </View>
+┊  ┊30┊        <AppWithNavigationState />
 ┊63┊31┊      </ApolloProvider>
 ┊64┊32┊    );
 ┊65┊33┊  }
```

[}]: #

Refresh the app to see some simple tabs: ![Tabs Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step3-2.gif)

On the `Chats` tab, we want to show a list of the user’s groups. We’ll create a `Groups` screen component in a new file `client/src/screens/groups.screen.js`:

[{]: <helper> (diffStep 3.3 files="client/src/screens/groups.screen.js")

#### Step 3.3: Create Groups Screen

##### Added client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
```diff
@@ -0,0 +1,84 @@
+┊  ┊ 1┊import { _ } from 'lodash';
+┊  ┊ 2┊import PropTypes from 'prop-types';
+┊  ┊ 3┊import React, { Component } from 'react';
+┊  ┊ 4┊import {
+┊  ┊ 5┊  FlatList,
+┊  ┊ 6┊  StyleSheet,
+┊  ┊ 7┊  Text,
+┊  ┊ 8┊  TouchableHighlight,
+┊  ┊ 9┊  View,
+┊  ┊10┊} from 'react-native';
+┊  ┊11┊
+┊  ┊12┊const styles = StyleSheet.create({
+┊  ┊13┊  container: {
+┊  ┊14┊    backgroundColor: 'white',
+┊  ┊15┊    flex: 1,
+┊  ┊16┊  },
+┊  ┊17┊  groupContainer: {
+┊  ┊18┊    flex: 1,
+┊  ┊19┊    flexDirection: 'row',
+┊  ┊20┊    alignItems: 'center',
+┊  ┊21┊    backgroundColor: 'white',
+┊  ┊22┊    borderBottomColor: '#eee',
+┊  ┊23┊    borderBottomWidth: 1,
+┊  ┊24┊    paddingHorizontal: 12,
+┊  ┊25┊    paddingVertical: 8,
+┊  ┊26┊  },
+┊  ┊27┊  groupName: {
+┊  ┊28┊    fontWeight: 'bold',
+┊  ┊29┊    flex: 0.7,
+┊  ┊30┊  },
+┊  ┊31┊});
+┊  ┊32┊
+┊  ┊33┊// create fake data to populate our ListView
+┊  ┊34┊const fakeData = () => _.times(100, i => ({
+┊  ┊35┊  id: i,
+┊  ┊36┊  name: `Group ${i}`,
+┊  ┊37┊}));
+┊  ┊38┊
+┊  ┊39┊class Group extends Component {
+┊  ┊40┊  render() {
+┊  ┊41┊    const { id, name } = this.props.group;
+┊  ┊42┊    return (
+┊  ┊43┊      <TouchableHighlight
+┊  ┊44┊        key={id}
+┊  ┊45┊      >
+┊  ┊46┊        <View style={styles.groupContainer}>
+┊  ┊47┊          <Text style={styles.groupName}>{`${name}`}</Text>
+┊  ┊48┊        </View>
+┊  ┊49┊      </TouchableHighlight>
+┊  ┊50┊    );
+┊  ┊51┊  }
+┊  ┊52┊}
+┊  ┊53┊
+┊  ┊54┊Group.propTypes = {
+┊  ┊55┊  group: PropTypes.shape({
+┊  ┊56┊    id: PropTypes.number,
+┊  ┊57┊    name: PropTypes.string,
+┊  ┊58┊  }),
+┊  ┊59┊};
+┊  ┊60┊
+┊  ┊61┊class Groups extends Component {
+┊  ┊62┊  static navigationOptions = {
+┊  ┊63┊    title: 'Chats',
+┊  ┊64┊  };
+┊  ┊65┊
+┊  ┊66┊  keyExtractor = item => item.id;
+┊  ┊67┊
+┊  ┊68┊  renderItem = ({ item }) => <Group group={item} />;
+┊  ┊69┊
+┊  ┊70┊  render() {
+┊  ┊71┊    // render list of groups for user
+┊  ┊72┊    return (
+┊  ┊73┊      <View style={styles.container}>
+┊  ┊74┊        <FlatList
+┊  ┊75┊          data={fakeData()}
+┊  ┊76┊          keyExtractor={this.keyExtractor}
+┊  ┊77┊          renderItem={this.renderItem}
+┊  ┊78┊        />
+┊  ┊79┊      </View>
+┊  ┊80┊    );
+┊  ┊81┊  }
+┊  ┊82┊}
+┊  ┊83┊
+┊  ┊84┊export default Groups;
```

[}]: #

And insert `Groups` into our `AppNavigator`:

[{]: <helper> (diffStep 3.3 files="client/src/navigation.js")

#### Step 3.3: Create Groups Screen

##### Changed client&#x2F;src&#x2F;navigation.js
```diff
@@ -4,6 +4,8 @@
 ┊ 4┊ 4┊import { Text, View, StyleSheet } from 'react-native';
 ┊ 5┊ 5┊import { connect } from 'react-redux';
 ┊ 6┊ 6┊
+┊  ┊ 7┊import Groups from './screens/groups.screen';
+┊  ┊ 8┊
 ┊ 7┊ 9┊const styles = StyleSheet.create({
 ┊ 8┊10┊  container: {
 ┊ 9┊11┊    flex: 1,
```
```diff
@@ -31,7 +33,7 @@
 ┊31┊33┊
 ┊32┊34┊// tabs in main screen
 ┊33┊35┊const MainScreenNavigator = TabNavigator({
-┊34┊  ┊  Chats: { screen: TestScreen('Chats') },
+┊  ┊36┊  Chats: { screen: Groups },
 ┊35┊37┊  Settings: { screen: TestScreen('Settings') },
 ┊36┊38┊});
 ┊37┊39┊
```

[}]: #

When the user presses one of the rows in our `FlatList`, we want to push a new Screen with the message thread for the selected group. For this Screen, we’ll create a new `Messages` component which will hold a list of `Message` components:

[{]: <helper> (diffStep 3.4)

#### Step 3.4: Create Messages Screen

##### Added client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -0,0 +1,70 @@
+┊  ┊ 1┊import { _ } from 'lodash';
+┊  ┊ 2┊import {
+┊  ┊ 3┊  FlatList,
+┊  ┊ 4┊  StyleSheet,
+┊  ┊ 5┊  View,
+┊  ┊ 6┊} from 'react-native';
+┊  ┊ 7┊import PropTypes from 'prop-types';
+┊  ┊ 8┊import React, { Component } from 'react';
+┊  ┊ 9┊import randomColor from 'randomcolor';
+┊  ┊10┊
+┊  ┊11┊import Message from '../components/message.component';
+┊  ┊12┊
+┊  ┊13┊const styles = StyleSheet.create({
+┊  ┊14┊  container: {
+┊  ┊15┊    alignItems: 'stretch',
+┊  ┊16┊    backgroundColor: '#e5ddd5',
+┊  ┊17┊    flex: 1,
+┊  ┊18┊    flexDirection: 'column',
+┊  ┊19┊  },
+┊  ┊20┊});
+┊  ┊21┊
+┊  ┊22┊const fakeData = () => _.times(100, i => ({
+┊  ┊23┊  // every message will have a different color
+┊  ┊24┊  color: randomColor(),
+┊  ┊25┊  // every 5th message will look like it's from the current user
+┊  ┊26┊  isCurrentUser: i % 5 === 0,
+┊  ┊27┊  message: {
+┊  ┊28┊    id: i,
+┊  ┊29┊    createdAt: new Date().toISOString(),
+┊  ┊30┊    from: {
+┊  ┊31┊      username: `Username ${i}`,
+┊  ┊32┊    },
+┊  ┊33┊    text: `Message ${i}`,
+┊  ┊34┊  },
+┊  ┊35┊}));
+┊  ┊36┊
+┊  ┊37┊class Messages extends Component {
+┊  ┊38┊  static navigationOptions = ({ navigation }) => {
+┊  ┊39┊    const { state } = navigation;
+┊  ┊40┊    return {
+┊  ┊41┊      title: state.params.title,
+┊  ┊42┊    };
+┊  ┊43┊  };
+┊  ┊44┊
+┊  ┊45┊  keyExtractor = item => item.message.id;
+┊  ┊46┊
+┊  ┊47┊  renderItem = ({ item: { isCurrentUser, message, color } }) => (
+┊  ┊48┊    <Message
+┊  ┊49┊      color={color}
+┊  ┊50┊      isCurrentUser={isCurrentUser}
+┊  ┊51┊      message={message}
+┊  ┊52┊    />
+┊  ┊53┊  )
+┊  ┊54┊
+┊  ┊55┊  render() {
+┊  ┊56┊    // render list of messages for group
+┊  ┊57┊    return (
+┊  ┊58┊      <View style={styles.container}>
+┊  ┊59┊        <FlatList
+┊  ┊60┊          data={fakeData()}
+┊  ┊61┊          keyExtractor={this.keyExtractor}
+┊  ┊62┊          renderItem={this.renderItem}
+┊  ┊63┊          ListEmptyComponent={<View />}
+┊  ┊64┊        />
+┊  ┊65┊      </View>
+┊  ┊66┊    );
+┊  ┊67┊  }
+┊  ┊68┊}
+┊  ┊69┊
+┊  ┊70┊export default Messages;
```

[}]: #

We’ll also write the code for the individual `Message` components that populate the `FlatList` in `Messages`:

[{]: <helper> (diffStep 3.5)

#### Step 3.5: Create Message Component

##### Added client&#x2F;src&#x2F;components&#x2F;message.component.js
```diff
@@ -0,0 +1,85 @@
+┊  ┊ 1┊import moment from 'moment';
+┊  ┊ 2┊import React, { PureComponent } from 'react';
+┊  ┊ 3┊import PropTypes from 'prop-types';
+┊  ┊ 4┊import {
+┊  ┊ 5┊  StyleSheet,
+┊  ┊ 6┊  Text,
+┊  ┊ 7┊  View,
+┊  ┊ 8┊} from 'react-native';
+┊  ┊ 9┊
+┊  ┊10┊const styles = StyleSheet.create({
+┊  ┊11┊  container: {
+┊  ┊12┊    flex: 1,
+┊  ┊13┊    flexDirection: 'row',
+┊  ┊14┊  },
+┊  ┊15┊  message: {
+┊  ┊16┊    flex: 0.8,
+┊  ┊17┊    backgroundColor: 'white',
+┊  ┊18┊    borderRadius: 6,
+┊  ┊19┊    marginHorizontal: 16,
+┊  ┊20┊    marginVertical: 2,
+┊  ┊21┊    paddingHorizontal: 8,
+┊  ┊22┊    paddingVertical: 6,
+┊  ┊23┊    shadowColor: 'black',
+┊  ┊24┊    shadowOpacity: 0.5,
+┊  ┊25┊    shadowRadius: 1,
+┊  ┊26┊    shadowOffset: {
+┊  ┊27┊      height: 1,
+┊  ┊28┊    },
+┊  ┊29┊  },
+┊  ┊30┊  myMessage: {
+┊  ┊31┊    backgroundColor: '#dcf8c6',
+┊  ┊32┊  },
+┊  ┊33┊  messageUsername: {
+┊  ┊34┊    color: 'red',
+┊  ┊35┊    fontWeight: 'bold',
+┊  ┊36┊    paddingBottom: 12,
+┊  ┊37┊  },
+┊  ┊38┊  messageTime: {
+┊  ┊39┊    color: '#8c8c8c',
+┊  ┊40┊    fontSize: 11,
+┊  ┊41┊    textAlign: 'right',
+┊  ┊42┊  },
+┊  ┊43┊  messageSpacer: {
+┊  ┊44┊    flex: 0.2,
+┊  ┊45┊  },
+┊  ┊46┊});
+┊  ┊47┊
+┊  ┊48┊class Message extends PureComponent {
+┊  ┊49┊  render() {
+┊  ┊50┊    const { color, message, isCurrentUser } = this.props;
+┊  ┊51┊
+┊  ┊52┊    return (
+┊  ┊53┊      <View key={message.id} style={styles.container}>
+┊  ┊54┊        {isCurrentUser ? <View style={styles.messageSpacer} /> : undefined }
+┊  ┊55┊        <View
+┊  ┊56┊          style={[styles.message, isCurrentUser && styles.myMessage]}
+┊  ┊57┊        >
+┊  ┊58┊          <Text
+┊  ┊59┊            style={[
+┊  ┊60┊              styles.messageUsername,
+┊  ┊61┊              { color },
+┊  ┊62┊            ]}
+┊  ┊63┊          >{message.from.username}</Text>
+┊  ┊64┊          <Text>{message.text}</Text>
+┊  ┊65┊          <Text style={styles.messageTime}>{moment(message.createdAt).format('h:mm A')}</Text>
+┊  ┊66┊        </View>
+┊  ┊67┊        {!isCurrentUser ? <View style={styles.messageSpacer} /> : undefined }
+┊  ┊68┊      </View>
+┊  ┊69┊    );
+┊  ┊70┊  }
+┊  ┊71┊}
+┊  ┊72┊
+┊  ┊73┊Message.propTypes = {
+┊  ┊74┊  color: PropTypes.string.isRequired,
+┊  ┊75┊  message: PropTypes.shape({
+┊  ┊76┊    createdAt: PropTypes.string.isRequired,
+┊  ┊77┊    from: PropTypes.shape({
+┊  ┊78┊      username: PropTypes.string.isRequired,
+┊  ┊79┊    }),
+┊  ┊80┊    text: PropTypes.string.isRequired,
+┊  ┊81┊  }).isRequired,
+┊  ┊82┊  isCurrentUser: PropTypes.bool.isRequired,
+┊  ┊83┊};
+┊  ┊84┊
+┊  ┊85┊export default Message;
```

[}]: #

We add `Messages` to `AppNavigator` so it will stack on top of our `Main` screen when we navigate to it:

[{]: <helper> (diffStep 3.6 files="client/src/navigation.js")

#### Step 3.6: Add Messages to Navigation

##### Changed client&#x2F;src&#x2F;navigation.js
```diff
@@ -5,6 +5,7 @@
 ┊ 5┊ 5┊import { connect } from 'react-redux';
 ┊ 6┊ 6┊
 ┊ 7┊ 7┊import Groups from './screens/groups.screen';
+┊  ┊ 8┊import Messages from './screens/messages.screen';
 ┊ 8┊ 9┊
 ┊ 9┊10┊const styles = StyleSheet.create({
 ┊10┊11┊  container: {
```
```diff
@@ -39,6 +40,9 @@
 ┊39┊40┊
 ┊40┊41┊const AppNavigator = StackNavigator({
 ┊41┊42┊  Main: { screen: MainScreenNavigator },
+┊  ┊43┊  Messages: { screen: Messages },
+┊  ┊44┊}, {
+┊  ┊45┊  mode: 'modal',
 ┊42┊46┊});
 ┊43┊47┊
 ┊44┊48┊// reducer initialization code
```

[}]: #

Finally, modify `Groups` to handle pressing a `Group`. We can use `props.navigation.navigate`, which is passed to our `Groups` component via React Navigation, to push the `Messages` Screen:

[{]: <helper> (diffStep 3.6 files="client/src/screens/groups.screen.js")

#### Step 3.6: Add Messages to Navigation

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
```diff
@@ -37,11 +37,18 @@
 ┊37┊37┊}));
 ┊38┊38┊
 ┊39┊39┊class Group extends Component {
+┊  ┊40┊  constructor(props) {
+┊  ┊41┊    super(props);
+┊  ┊42┊
+┊  ┊43┊    this.goToMessages = this.props.goToMessages.bind(this, this.props.group);
+┊  ┊44┊  }
+┊  ┊45┊
 ┊40┊46┊  render() {
 ┊41┊47┊    const { id, name } = this.props.group;
 ┊42┊48┊    return (
 ┊43┊49┊      <TouchableHighlight
 ┊44┊50┊        key={id}
+┊  ┊51┊        onPress={this.goToMessages}
 ┊45┊52┊      >
 ┊46┊53┊        <View style={styles.groupContainer}>
 ┊47┊54┊          <Text style={styles.groupName}>{`${name}`}</Text>
```
```diff
@@ -52,6 +59,7 @@
 ┊52┊59┊}
 ┊53┊60┊
 ┊54┊61┊Group.propTypes = {
+┊  ┊62┊  goToMessages: PropTypes.func.isRequired,
 ┊55┊63┊  group: PropTypes.shape({
 ┊56┊64┊    id: PropTypes.number,
 ┊57┊65┊    name: PropTypes.string,
```
```diff
@@ -63,9 +71,19 @@
 ┊63┊71┊    title: 'Chats',
 ┊64┊72┊  };
 ┊65┊73┊
+┊  ┊74┊  constructor(props) {
+┊  ┊75┊    super(props);
+┊  ┊76┊    this.goToMessages = this.goToMessages.bind(this);
+┊  ┊77┊  }
+┊  ┊78┊
 ┊66┊79┊  keyExtractor = item => item.id;
 ┊67┊80┊
-┊68┊  ┊  renderItem = ({ item }) => <Group group={item} />;
+┊  ┊81┊  goToMessages(group) {
+┊  ┊82┊    const { navigate } = this.props.navigation;
+┊  ┊83┊    navigate('Messages', { groupId: group.id, title: group.name });
+┊  ┊84┊  }
+┊  ┊85┊
+┊  ┊86┊  renderItem = ({ item }) => <Group group={item} goToMessages={this.goToMessages} />;
 ┊69┊87┊
 ┊70┊88┊  render() {
 ┊71┊89┊    // render list of groups for user
```
```diff
@@ -80,5 +98,10 @@
 ┊ 80┊ 98┊    );
 ┊ 81┊ 99┊  }
 ┊ 82┊100┊}
+┊   ┊101┊Groups.propTypes = {
+┊   ┊102┊  navigation: PropTypes.shape({
+┊   ┊103┊    navigate: PropTypes.func,
+┊   ┊104┊  }),
+┊   ┊105┊};
 ┊ 83┊106┊
 ┊ 84┊107┊export default Groups;
```

[}]: #

Our app should now have simple layouts and routing for showing groups and pressing into a group to show that group’s message thread:

![Messages Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step3-6.gif)

# GraphQL Queries with React-Apollo
Time to connect our data!

On our server, we created a `user` query which will give our client access to plenty of data for a given User. Let’s use this query in our `Groups` component to get the user’s list of groups. It’s good form to keep queries separate of components because queries can often be reused by multiple components. We will create a new folder `client/src/graphql` to house all our queries, and create `user.query.js` inside this folder:

[{]: <helper> (diffStep 3.7)

#### Step 3.7: Create USER_QUERY

##### Added client&#x2F;src&#x2F;graphql&#x2F;user.query.js
```diff
@@ -0,0 +1,18 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊// get the user and all user's groups
+┊  ┊ 4┊export const USER_QUERY = gql`
+┊  ┊ 5┊  query user($id: Int) {
+┊  ┊ 6┊    user(id: $id) {
+┊  ┊ 7┊      id
+┊  ┊ 8┊      email
+┊  ┊ 9┊      username
+┊  ┊10┊      groups {
+┊  ┊11┊        id
+┊  ┊12┊        name
+┊  ┊13┊      }
+┊  ┊14┊    }
+┊  ┊15┊  }
+┊  ┊16┊`;
+┊  ┊17┊
+┊  ┊18┊export default USER_QUERY;
```

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
```diff
@@ -1,19 +1,26 @@
-┊ 1┊  ┊import { _ } from 'lodash';
 ┊ 2┊ 1┊import PropTypes from 'prop-types';
 ┊ 3┊ 2┊import React, { Component } from 'react';
 ┊ 4┊ 3┊import {
 ┊ 5┊ 4┊  FlatList,
+┊  ┊ 5┊  ActivityIndicator,
 ┊ 6┊ 6┊  StyleSheet,
 ┊ 7┊ 7┊  Text,
 ┊ 8┊ 8┊  TouchableHighlight,
 ┊ 9┊ 9┊  View,
 ┊10┊10┊} from 'react-native';
+┊  ┊11┊import { graphql } from 'react-apollo';
+┊  ┊12┊
+┊  ┊13┊import { USER_QUERY } from '../graphql/user.query';
 ┊11┊14┊
 ┊12┊15┊const styles = StyleSheet.create({
 ┊13┊16┊  container: {
 ┊14┊17┊    backgroundColor: 'white',
 ┊15┊18┊    flex: 1,
 ┊16┊19┊  },
+┊  ┊20┊  loading: {
+┊  ┊21┊    justifyContent: 'center',
+┊  ┊22┊    flex: 1,
+┊  ┊23┊  },
 ┊17┊24┊  groupContainer: {
 ┊18┊25┊    flex: 1,
 ┊19┊26┊    flexDirection: 'row',
```
```diff
@@ -30,12 +37,6 @@
 ┊30┊37┊  },
 ┊31┊38┊});
 ┊32┊39┊
-┊33┊  ┊// create fake data to populate our ListView
-┊34┊  ┊const fakeData = () => _.times(100, i => ({
-┊35┊  ┊  id: i,
-┊36┊  ┊  name: `Group ${i}`,
-┊37┊  ┊}));
-┊38┊  ┊
 ┊39┊40┊class Group extends Component {
 ┊40┊41┊  constructor(props) {
 ┊41┊42┊    super(props);
```
```diff
@@ -86,11 +87,22 @@
 ┊ 86┊ 87┊  renderItem = ({ item }) => <Group group={item} goToMessages={this.goToMessages} />;
 ┊ 87┊ 88┊
 ┊ 88┊ 89┊  render() {
+┊   ┊ 90┊    const { loading, user } = this.props;
+┊   ┊ 91┊
+┊   ┊ 92┊    // render loading placeholder while we fetch messages
+┊   ┊ 93┊    if (loading) {
+┊   ┊ 94┊      return (
+┊   ┊ 95┊        <View style={[styles.loading, styles.container]}>
+┊   ┊ 96┊          <ActivityIndicator />
+┊   ┊ 97┊        </View>
+┊   ┊ 98┊      );
+┊   ┊ 99┊    }
+┊   ┊100┊
 ┊ 89┊101┊    // render list of groups for user
 ┊ 90┊102┊    return (
 ┊ 91┊103┊      <View style={styles.container}>
 ┊ 92┊104┊        <FlatList
-┊ 93┊   ┊          data={fakeData()}
+┊   ┊105┊          data={user.groups}
 ┊ 94┊106┊          keyExtractor={this.keyExtractor}
 ┊ 95┊107┊          renderItem={this.renderItem}
 ┊ 96┊108┊        />
```
```diff
@@ -102,6 +114,24 @@
 ┊102┊114┊  navigation: PropTypes.shape({
 ┊103┊115┊    navigate: PropTypes.func,
 ┊104┊116┊  }),
+┊   ┊117┊  loading: PropTypes.bool,
+┊   ┊118┊  user: PropTypes.shape({
+┊   ┊119┊    id: PropTypes.number.isRequired,
+┊   ┊120┊    email: PropTypes.string.isRequired,
+┊   ┊121┊    groups: PropTypes.arrayOf(
+┊   ┊122┊      PropTypes.shape({
+┊   ┊123┊        id: PropTypes.number.isRequired,
+┊   ┊124┊        name: PropTypes.string.isRequired,
+┊   ┊125┊      }),
+┊   ┊126┊    ),
+┊   ┊127┊  }),
 ┊105┊128┊};
 ┊106┊129┊
-┊107┊   ┊export default Groups;
+┊   ┊130┊const userQuery = graphql(USER_QUERY, {
+┊   ┊131┊  options: () => ({ variables: { id: 1 } }), // fake the user for now
+┊   ┊132┊  props: ({ data: { loading, user } }) => ({
+┊   ┊133┊    loading, user,
+┊   ┊134┊  }),
+┊   ┊135┊});
+┊   ┊136┊
+┊   ┊137┊export default userQuery(Groups);
```

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
```diff
@@ -0,0 +1,25 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊const GROUP_QUERY = gql`
+┊  ┊ 4┊  query group($groupId: Int!) {
+┊  ┊ 5┊    group(id: $groupId) {
+┊  ┊ 6┊      id
+┊  ┊ 7┊      name
+┊  ┊ 8┊      users {
+┊  ┊ 9┊        id
+┊  ┊10┊        username
+┊  ┊11┊      }
+┊  ┊12┊      messages {
+┊  ┊13┊        id
+┊  ┊14┊        from {
+┊  ┊15┊          id
+┊  ┊16┊          username
+┊  ┊17┊        }
+┊  ┊18┊        createdAt
+┊  ┊19┊        text
+┊  ┊20┊      }
+┊  ┊21┊    }
+┊  ┊22┊  }
+┊  ┊23┊`;
+┊  ┊24┊
+┊  ┊25┊export default GROUP_QUERY;
```

[}]: #

So this Query is pretty cool. Given a `groupId`, we can get whatever features of the `Group` we need including the `Messages`. For now, we are asking for all the `Messages` in this `Group`. That’s a good starting point, but later we’ll modify this query to return a limited number of `Messages` at a time, and append more `Messages` as the user scrolls.

Finally, let’s attach our `GROUP_QUERY` to the `Messages` component:

[{]: <helper> (diffStep "3.10")

#### Step 3.10: Apply GROUP_QUERY to Messages

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -1,5 +1,5 @@
-┊1┊ ┊import { _ } from 'lodash';
 ┊2┊1┊import {
+┊ ┊2┊  ActivityIndicator,
 ┊3┊3┊  FlatList,
 ┊4┊4┊  StyleSheet,
 ┊5┊5┊  View,
```
```diff
@@ -7,8 +7,10 @@
 ┊ 7┊ 7┊import PropTypes from 'prop-types';
 ┊ 8┊ 8┊import React, { Component } from 'react';
 ┊ 9┊ 9┊import randomColor from 'randomcolor';
+┊  ┊10┊import { graphql, compose } from 'react-apollo';
 ┊10┊11┊
 ┊11┊12┊import Message from '../components/message.component';
+┊  ┊13┊import GROUP_QUERY from '../graphql/group.query';
 ┊12┊14┊
 ┊13┊15┊const styles = StyleSheet.create({
 ┊14┊16┊  container: {
```
```diff
@@ -17,22 +19,10 @@
 ┊17┊19┊    flex: 1,
 ┊18┊20┊    flexDirection: 'column',
 ┊19┊21┊  },
-┊20┊  ┊});
-┊21┊  ┊
-┊22┊  ┊const fakeData = () => _.times(100, i => ({
-┊23┊  ┊  // every message will have a different color
-┊24┊  ┊  color: randomColor(),
-┊25┊  ┊  // every 5th message will look like it's from the current user
-┊26┊  ┊  isCurrentUser: i % 5 === 0,
-┊27┊  ┊  message: {
-┊28┊  ┊    id: i,
-┊29┊  ┊    createdAt: new Date().toISOString(),
-┊30┊  ┊    from: {
-┊31┊  ┊      username: `Username ${i}`,
-┊32┊  ┊    },
-┊33┊  ┊    text: `Message ${i}`,
+┊  ┊22┊  loading: {
+┊  ┊23┊    justifyContent: 'center',
 ┊34┊24┊  },
-┊35┊  ┊}));
+┊  ┊25┊});
 ┊36┊26┊
 ┊37┊27┊class Messages extends Component {
 ┊38┊28┊  static navigationOptions = ({ navigation }) => {
```
```diff
@@ -42,22 +32,66 @@
 ┊42┊32┊    };
 ┊43┊33┊  };
 ┊44┊34┊
-┊45┊  ┊  keyExtractor = item => item.message.id;
+┊  ┊35┊  constructor(props) {
+┊  ┊36┊    super(props);
+┊  ┊37┊    const usernameColors = {};
+┊  ┊38┊    if (props.group && props.group.users) {
+┊  ┊39┊      props.group.users.forEach((user) => {
+┊  ┊40┊        usernameColors[user.username] = randomColor();
+┊  ┊41┊      });
+┊  ┊42┊    }
+┊  ┊43┊
+┊  ┊44┊    this.state = {
+┊  ┊45┊      usernameColors,
+┊  ┊46┊    };
+┊  ┊47┊
+┊  ┊48┊    this.renderItem = this.renderItem.bind(this);
+┊  ┊49┊  }
+┊  ┊50┊
+┊  ┊51┊  componentWillReceiveProps(nextProps) {
+┊  ┊52┊    const usernameColors = {};
+┊  ┊53┊    // check for new messages
+┊  ┊54┊    if (nextProps.group) {
+┊  ┊55┊      if (nextProps.group.users) {
+┊  ┊56┊        // apply a color to each user
+┊  ┊57┊        nextProps.group.users.forEach((user) => {
+┊  ┊58┊          usernameColors[user.username] = this.state.usernameColors[user.username] || randomColor();
+┊  ┊59┊        });
+┊  ┊60┊      }
 ┊46┊61┊
-┊47┊  ┊  renderItem = ({ item: { isCurrentUser, message, color } }) => (
+┊  ┊62┊      this.setState({
+┊  ┊63┊        usernameColors,
+┊  ┊64┊      });
+┊  ┊65┊    }
+┊  ┊66┊  }
+┊  ┊67┊
+┊  ┊68┊  keyExtractor = item => item.id;
+┊  ┊69┊
+┊  ┊70┊  renderItem = ({ item: message }) => (
 ┊48┊71┊    <Message
-┊49┊  ┊      color={color}
-┊50┊  ┊      isCurrentUser={isCurrentUser}
+┊  ┊72┊      color={this.state.usernameColors[message.from.username]}
+┊  ┊73┊      isCurrentUser={message.from.id === 1} // for now until we implement auth
 ┊51┊74┊      message={message}
 ┊52┊75┊    />
 ┊53┊76┊  )
 ┊54┊77┊
 ┊55┊78┊  render() {
+┊  ┊79┊    const { loading, group } = this.props;
+┊  ┊80┊
+┊  ┊81┊    // render loading placeholder while we fetch messages
+┊  ┊82┊    if (loading && !group) {
+┊  ┊83┊      return (
+┊  ┊84┊        <View style={[styles.loading, styles.container]}>
+┊  ┊85┊          <ActivityIndicator />
+┊  ┊86┊        </View>
+┊  ┊87┊      );
+┊  ┊88┊    }
+┊  ┊89┊
 ┊56┊90┊    // render list of messages for group
 ┊57┊91┊    return (
 ┊58┊92┊      <View style={styles.container}>
 ┊59┊93┊        <FlatList
-┊60┊  ┊          data={fakeData()}
+┊  ┊94┊          data={group.messages.slice().reverse()}
 ┊61┊95┊          keyExtractor={this.keyExtractor}
 ┊62┊96┊          renderItem={this.renderItem}
 ┊63┊97┊          ListEmptyComponent={<View />}
```
```diff
@@ -67,4 +101,25 @@
 ┊ 67┊101┊  }
 ┊ 68┊102┊}
 ┊ 69┊103┊
-┊ 70┊   ┊export default Messages;
+┊   ┊104┊Messages.propTypes = {
+┊   ┊105┊  group: PropTypes.shape({
+┊   ┊106┊    messages: PropTypes.array,
+┊   ┊107┊    users: PropTypes.array,
+┊   ┊108┊  }),
+┊   ┊109┊  loading: PropTypes.bool,
+┊   ┊110┊};
+┊   ┊111┊
+┊   ┊112┊const groupQuery = graphql(GROUP_QUERY, {
+┊   ┊113┊  options: ownProps => ({
+┊   ┊114┊    variables: {
+┊   ┊115┊      groupId: ownProps.navigation.state.params.groupId,
+┊   ┊116┊    },
+┊   ┊117┊  }),
+┊   ┊118┊  props: ({ data: { loading, group } }) => ({
+┊   ┊119┊    loading, group,
+┊   ┊120┊  }),
+┊   ┊121┊});
+┊   ┊122┊
+┊   ┊123┊export default compose(
+┊   ┊124┊  groupQuery,
+┊   ┊125┊)(Messages);
```

[}]: #

If we fire up the app, we should see our messages: ![Result Img](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step3-10.gif)
[{]: <helper> (navStep)

| [< Previous Step](step2.md) | [Next Step >](step4.md) |
|:--------------------------------|--------------------------------:|

[}]: #

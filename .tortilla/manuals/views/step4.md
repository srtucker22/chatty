# Step 4: GraphQL Mutations

This is the fourth blog in a multipart series where we will be building Chatty, a WhatsApp clone, using [React Native](https://facebook.github.io/react-native/) and [Apollo](http://dev.apollodata.com/).

Here’s what we will accomplish in this tutorial:
1. Design **GraphQL Mutations** and add them to the GraphQL Schemas on our server
2. Modify the layout on our React Native client to let users send Messages
3. Build GraphQL Mutations on our RN client and connect them to components using `react-apollo`
4. Add **Optimistic UI** to our GraphQL Mutations so our RN client updates as soon as the Message is sent — even before the server sends a response!

***YOUR CHALLENGE***
1. Add GraphQL Mutations on our server for creating, modifying, and deleting Groups
2. Add new Screens to our React Native app for creating, modifying, and deleting Groups
3. Build GraphQL Queries and Mutations for our new Screens and connect them using `react-apollo`

# Adding GraphQL Mutations on the Server
While GraphQL Queries let us fetch data from our server, GraphQL Mutations allow us to modify our server held data.

To add a mutation to our GraphQL endpoint, we start by defining the mutation in our GraphQL Schema much like we did with queries. We’ll define a `createMessage` mutation that will enable users to send a new message to a Group:
```
type Mutation {
  # create a new message 
  # text is the message text
  # userId is the id of the user sending the message
  # groupId is the id of the group receiving the message
  createMessage(text: String!, userId: Int!, groupId: Int!): Message
}
```
GraphQL Mutations are written nearly identically like GraphQL Queries. For now, we will require a `userId` parameter to identify who is creating the `Message`, but we won’t need this field once we implement authentication in a future tutorial.

Let’s update our Schema in `server/data/schema.js` to include the mutation:

[{]: <helper> (diffStep 4.1)

#### Step 4.1: Add Mutations to Schema

##### Changed server&#x2F;data&#x2F;schema.js
```diff
@@ -42,8 +42,16 @@
 ┊42┊42┊    group(id: Int!): Group
 ┊43┊43┊  }
 ┊44┊44┊
+┊  ┊45┊  type Mutation {
+┊  ┊46┊    # send a message to a group
+┊  ┊47┊    createMessage(
+┊  ┊48┊      text: String!, userId: Int!, groupId: Int!
+┊  ┊49┊    ): Message
+┊  ┊50┊  }
+┊  ┊51┊  
 ┊45┊52┊  schema {
 ┊46┊53┊    query: Query
+┊  ┊54┊    mutation: Mutation
 ┊47┊55┊  }
 ┊48┊56┊`];
```

[}]: #

We also need to modify our resolvers to handle our new mutation. We’ll modify `server/data/resolvers.js` as follows:

[{]: <helper> (diffStep 4.2)

#### Step 4.2: Add Mutations to Resolvers

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -18,6 +18,15 @@
 ┊18┊18┊      return User.findOne({ where: args });
 ┊19┊19┊    },
 ┊20┊20┊  },
+┊  ┊21┊  Mutation: {
+┊  ┊22┊    createMessage(_, { text, userId, groupId }) {
+┊  ┊23┊      return Message.create({
+┊  ┊24┊        userId,
+┊  ┊25┊        text,
+┊  ┊26┊        groupId,
+┊  ┊27┊      });
+┊  ┊28┊    },
+┊  ┊29┊  },
 ┊21┊30┊  Group: {
 ┊22┊31┊    users(group) {
 ┊23┊32┊      return group.getUsers();
```

[}]: #

That’s it! When a client uses `createMessage`, the resolver will use the `Message` model passed by our connector and call `Message.create` with arguments from the mutation. The `Message.create` function returns a Promise that will resolve with the newly created `Message`.

We can easily test our newly minted `createMessage` mutation in GraphIQL to make sure everything works: ![Create Message Img](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step4-2.png)

# Designing the Input
Wow, that was way faster than when we added queries! All the heavy lifting we did in the first 3 parts of this series is starting to pay off….

Now that our server allows clients to create messages, we can build that functionality into our React Native client. First, we’ll start by creating a new component `MessageInput` where our users will be able to input their messages.

For this component, let's use **cool icons**. [`react-native-vector-icons`](https://github.com/oblador/react-native-vector-icons) is the goto package for adding icons to React Native. Please follow the instructions in the [`react-native-vector-icons` README](https://github.com/oblador/react-native-vector-icons) before moving onto the next step.

```
# make sure you're adding this package in the client folder!!!
cd client

yarn add react-native-vector-icons
react-native link
# this is not enough to install icons!!! PLEASE FOLLOW THE INSTRUCTIONS IN THE README TO PROPERLY INSTALL ICONS!
```
After completing the steps in the README to install icons, we can start putting together the `MessageInput` component in a new file `client/src/components/message-input.component.js`:

[{]: <helper> (diffStep 4.3 files="client/src/components/message-input.component.js")

#### Step 4.3: Create MessageInput

##### Added client&#x2F;src&#x2F;components&#x2F;message-input.component.js
```diff
@@ -0,0 +1,95 @@
+┊  ┊ 1┊import React, { Component } from 'react';
+┊  ┊ 2┊import PropTypes from 'prop-types';
+┊  ┊ 3┊import {
+┊  ┊ 4┊  StyleSheet,
+┊  ┊ 5┊  TextInput,
+┊  ┊ 6┊  View,
+┊  ┊ 7┊} from 'react-native';
+┊  ┊ 8┊
+┊  ┊ 9┊import Icon from 'react-native-vector-icons/FontAwesome';
+┊  ┊10┊
+┊  ┊11┊const styles = StyleSheet.create({
+┊  ┊12┊  container: {
+┊  ┊13┊    alignSelf: 'flex-end',
+┊  ┊14┊    backgroundColor: '#f5f1ee',
+┊  ┊15┊    borderColor: '#dbdbdb',
+┊  ┊16┊    borderTopWidth: 1,
+┊  ┊17┊    flexDirection: 'row',
+┊  ┊18┊  },
+┊  ┊19┊  inputContainer: {
+┊  ┊20┊    flex: 1,
+┊  ┊21┊    paddingHorizontal: 12,
+┊  ┊22┊    paddingVertical: 6,
+┊  ┊23┊  },
+┊  ┊24┊  input: {
+┊  ┊25┊    backgroundColor: 'white',
+┊  ┊26┊    borderColor: '#dbdbdb',
+┊  ┊27┊    borderRadius: 15,
+┊  ┊28┊    borderWidth: 1,
+┊  ┊29┊    color: 'black',
+┊  ┊30┊    height: 32,
+┊  ┊31┊    paddingHorizontal: 8,
+┊  ┊32┊  },
+┊  ┊33┊  sendButtonContainer: {
+┊  ┊34┊    paddingRight: 12,
+┊  ┊35┊    paddingVertical: 6,
+┊  ┊36┊  },
+┊  ┊37┊  sendButton: {
+┊  ┊38┊    height: 32,
+┊  ┊39┊    width: 32,
+┊  ┊40┊  },
+┊  ┊41┊  iconStyle: {
+┊  ┊42┊    marginRight: 0, // default is 12
+┊  ┊43┊  },
+┊  ┊44┊});
+┊  ┊45┊
+┊  ┊46┊const sendButton = send => (
+┊  ┊47┊  <Icon.Button
+┊  ┊48┊    backgroundColor={'blue'}
+┊  ┊49┊    borderRadius={16}
+┊  ┊50┊    color={'white'}
+┊  ┊51┊    iconStyle={styles.iconStyle}
+┊  ┊52┊    name="send"
+┊  ┊53┊    onPress={send}
+┊  ┊54┊    size={16}
+┊  ┊55┊    style={styles.sendButton}
+┊  ┊56┊  />
+┊  ┊57┊);
+┊  ┊58┊
+┊  ┊59┊class MessageInput extends Component {
+┊  ┊60┊  constructor(props) {
+┊  ┊61┊    super(props);
+┊  ┊62┊    this.state = {};
+┊  ┊63┊    this.send = this.send.bind(this);
+┊  ┊64┊  }
+┊  ┊65┊
+┊  ┊66┊  send() {
+┊  ┊67┊    this.props.send(this.state.text);
+┊  ┊68┊    this.textInput.clear();
+┊  ┊69┊    this.textInput.blur();
+┊  ┊70┊  }
+┊  ┊71┊
+┊  ┊72┊  render() {
+┊  ┊73┊    return (
+┊  ┊74┊      <View style={styles.container}>
+┊  ┊75┊        <View style={styles.inputContainer}>
+┊  ┊76┊          <TextInput
+┊  ┊77┊            ref={(ref) => { this.textInput = ref; }}
+┊  ┊78┊            onChangeText={text => this.setState({ text })}
+┊  ┊79┊            style={styles.input}
+┊  ┊80┊            placeholder="Type your message here!"
+┊  ┊81┊          />
+┊  ┊82┊        </View>
+┊  ┊83┊        <View style={styles.sendButtonContainer}>
+┊  ┊84┊          {sendButton(this.send)}
+┊  ┊85┊        </View>
+┊  ┊86┊      </View>
+┊  ┊87┊    );
+┊  ┊88┊  }
+┊  ┊89┊}
+┊  ┊90┊
+┊  ┊91┊MessageInput.propTypes = {
+┊  ┊92┊  send: PropTypes.func.isRequired,
+┊  ┊93┊};
+┊  ┊94┊
+┊  ┊95┊export default MessageInput;
```

[}]: #

Our `MessageInput` component is a `View` that wraps a controlled `TextInput` and an [`Icon.Button`](https://github.com/oblador/react-native-vector-icons#iconbutton-component). When the button is pressed, `props.send` will be called with the current state of the `TextInput` text and then the `TextInput` will clear. We’ve also added some styling to keep everything looking snazzy.

Let’s add `MessageInput` to the bottom of the `Messages` screen and create a placeholder `send` function:

[{]: <helper> (diffStep 4.4)

#### Step 4.4: Add MessageInput to Messages

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -10,6 +10,7 @@
 ┊10┊10┊import { graphql, compose } from 'react-apollo';
 ┊11┊11┊
 ┊12┊12┊import Message from '../components/message.component';
+┊  ┊13┊import MessageInput from '../components/message-input.component';
 ┊13┊14┊import GROUP_QUERY from '../graphql/group.query';
 ┊14┊15┊
 ┊15┊16┊const styles = StyleSheet.create({
```
```diff
@@ -46,6 +47,7 @@
 ┊46┊47┊    };
 ┊47┊48┊
 ┊48┊49┊    this.renderItem = this.renderItem.bind(this);
+┊  ┊50┊    this.send = this.send.bind(this);
 ┊49┊51┊  }
 ┊50┊52┊
 ┊51┊53┊  componentWillReceiveProps(nextProps) {
```
```diff
@@ -65,6 +67,11 @@
 ┊65┊67┊    }
 ┊66┊68┊  }
 ┊67┊69┊
+┊  ┊70┊  send(text) {
+┊  ┊71┊    // TODO: send the message
+┊  ┊72┊    console.log(`sending message: ${text}`);
+┊  ┊73┊  }
+┊  ┊74┊
 ┊68┊75┊  keyExtractor = item => item.id;
 ┊69┊76┊
 ┊70┊77┊  renderItem = ({ item: message }) => (
```
```diff
@@ -96,6 +103,7 @@
 ┊ 96┊103┊          renderItem={this.renderItem}
 ┊ 97┊104┊          ListEmptyComponent={<View />}
 ┊ 98┊105┊        />
+┊   ┊106┊        <MessageInput send={this.send} />
 ┊ 99┊107┊      </View>
 ┊100┊108┊    );
 ┊101┊109┊  }
```

[}]: #

It should look like this: ![Message Input Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step4-4.png)

But **don’t be fooled by your simulator!** This UI will break on a phone because of the keyboard: ![Broken Input Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step4-4-2.png)

You are not the first person to groan over this issue. For you and the many groaners out there, the wonderful devs at Facebook have your back. [`KeyboardAvoidingView`](https://facebook.github.io/react-native/docs/keyboardavoidingview.html) to the rescue!

[{]: <helper> (diffStep 4.5)

#### Step 4.5: Add KeyboardAvoidingView

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -1,6 +1,7 @@
 ┊1┊1┊import {
 ┊2┊2┊  ActivityIndicator,
 ┊3┊3┊  FlatList,
+┊ ┊4┊  KeyboardAvoidingView,
 ┊4┊5┊  StyleSheet,
 ┊5┊6┊  View,
 ┊6┊7┊} from 'react-native';
```
```diff
@@ -96,7 +97,12 @@
 ┊ 96┊ 97┊
 ┊ 97┊ 98┊    // render list of messages for group
 ┊ 98┊ 99┊    return (
-┊ 99┊   ┊      <View style={styles.container}>
+┊   ┊100┊      <KeyboardAvoidingView
+┊   ┊101┊        behavior={'position'}
+┊   ┊102┊        contentContainerStyle={styles.container}
+┊   ┊103┊        keyboardVerticalOffset={64}
+┊   ┊104┊        style={styles.container}
+┊   ┊105┊      >
 ┊100┊106┊        <FlatList
 ┊101┊107┊          data={group.messages.slice().reverse()}
 ┊102┊108┊          keyExtractor={this.keyExtractor}
```
```diff
@@ -104,7 +110,7 @@
 ┊104┊110┊          ListEmptyComponent={<View />}
 ┊105┊111┊        />
 ┊106┊112┊        <MessageInput send={this.send} />
-┊107┊   ┊      </View>
+┊   ┊113┊      </KeyboardAvoidingView>
 ┊108┊114┊    );
 ┊109┊115┊  }
 ┊110┊116┊}
```

[}]: #

![Fixed Input Image](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step4-5.png)

Our layout looks ready. Now let’s make it work!

# Adding GraphQL Mutations on the Client
Let’s start by defining our GraphQL Mutation like we would using GraphIQL:
```
mutation createMessage($text: String!, $userId: Int!, $groupId: Int!) {
  createMessage(text: $text, userId: $userId, groupId: $groupId) {
    id
    from {
      id
      username
    }
    createdAt
    text
  }
}
```
That looks fine, but notice the `Message` fields we want to see returned look exactly like the `Message` fields we are using for `GROUP_QUERY`:
```
query group($groupId: Int!) {
  group(id: $groupId) {
    id
    name
    users {
      id
      username
    }
    messages {
      id
      from {
        id
        username
      }
      createdAt
      text
    }
  }
}
```
GraphQL allows us to reuse pieces of queries and mutations with [**Fragments**](http://graphql.org/learn/queries/#fragments). We can factor out this common set of fields into a `MessageFragment` that looks like this:

[{]: <helper> (diffStep 4.6)

#### Step 4.6: Create MessageFragment

##### Added client&#x2F;src&#x2F;graphql&#x2F;message.fragment.js
```diff
@@ -0,0 +1,18 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊const MESSAGE_FRAGMENT = gql`
+┊  ┊ 4┊  fragment MessageFragment on Message {
+┊  ┊ 5┊    id
+┊  ┊ 6┊    to {
+┊  ┊ 7┊      id
+┊  ┊ 8┊    }
+┊  ┊ 9┊    from {
+┊  ┊10┊      id
+┊  ┊11┊      username
+┊  ┊12┊    }
+┊  ┊13┊    createdAt
+┊  ┊14┊    text
+┊  ┊15┊  }
+┊  ┊16┊`;
+┊  ┊17┊
+┊  ┊18┊export default MESSAGE_FRAGMENT;
```

[}]: #

Now we can apply `MESSAGE_FRAGMENT` to `GROUP_QUERY` by changing our code as follows:

[{]: <helper> (diffStep 4.7)

#### Step 4.7: Add MessageFragment to Group Query

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.query.js
```diff
@@ -1,5 +1,7 @@
 ┊1┊1┊import gql from 'graphql-tag';
 ┊2┊2┊
+┊ ┊3┊import MESSAGE_FRAGMENT from './message.fragment';
+┊ ┊4┊
 ┊3┊5┊const GROUP_QUERY = gql`
 ┊4┊6┊  query group($groupId: Int!) {
 ┊5┊7┊    group(id: $groupId) {
```
```diff
@@ -10,16 +12,11 @@
 ┊10┊12┊        username
 ┊11┊13┊      }
 ┊12┊14┊      messages {
-┊13┊  ┊        id
-┊14┊  ┊        from {
-┊15┊  ┊          id
-┊16┊  ┊          username
-┊17┊  ┊        }
-┊18┊  ┊        createdAt
-┊19┊  ┊        text
+┊  ┊15┊        ... MessageFragment
 ┊20┊16┊      }
 ┊21┊17┊    }
 ┊22┊18┊  }
+┊  ┊19┊  ${MESSAGE_FRAGMENT}
 ┊23┊20┊`;
 ┊24┊21┊
 ┊25┊22┊export default GROUP_QUERY;
```

[}]: #

Let’s also write our `createMessage` mutation using `messageFragment` in a new file `client/src/graphql/create-message.mutation.js`:

[{]: <helper> (diffStep 4.8)

#### Step 4.8: Create CREATE_MESSAGE_MUTATION

##### Added client&#x2F;src&#x2F;graphql&#x2F;create-message.mutation.js
```diff
@@ -0,0 +1,14 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊import MESSAGE_FRAGMENT from './message.fragment';
+┊  ┊ 4┊
+┊  ┊ 5┊const CREATE_MESSAGE_MUTATION = gql`
+┊  ┊ 6┊  mutation createMessage($text: String!, $userId: Int!, $groupId: Int!) {
+┊  ┊ 7┊    createMessage(text: $text, userId: $userId, groupId: $groupId) {
+┊  ┊ 8┊      ... MessageFragment
+┊  ┊ 9┊    }
+┊  ┊10┊  }
+┊  ┊11┊  ${MESSAGE_FRAGMENT}
+┊  ┊12┊`;
+┊  ┊13┊
+┊  ┊14┊export default CREATE_MESSAGE_MUTATION;
```

[}]: #

Now all we have to do is plug our mutation into our `Messages` component using the `graphql` module from `react-apollo`. Before we connect everything, let’s see what a mutation call with the `graphql` module looks like:
```
const createMessage = graphql(CREATE_MESSAGE_MUTATION, {
  props: ({ ownProps, mutate }) => ({
    createMessage: ({ text, userId, groupId }) =>
      mutate({
        variables: { text, userId, groupId },
      }),
  }),
});
```
Just like with a GraphQL Query, we first pass our mutation to `graphql`, followed by an Object with configuration params. The `props` param accepts a function with named arguments including `ownProps` (the components current props) and `mutate`. This function should return an Object with the name of the function that we plan to call inside our component, which executes `mutate` with the variables we wish to pass. If that sounds complicated, it’s because it is. Kudos to the Meteor team for putting it together though, because it’s actually some very clever code.

At the end of the day, once you write your first mutation, it’s really mostly a matter of copy/paste and changing the names of the variables.

Okay, so let’s put it all together in `messages.screen.js`:

[{]: <helper> (diffStep 4.9)

#### Step 4.9: Add CREATE_MESSAGE_MUTATION to Messages

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -13,6 +13,7 @@
 ┊13┊13┊import Message from '../components/message.component';
 ┊14┊14┊import MessageInput from '../components/message-input.component';
 ┊15┊15┊import GROUP_QUERY from '../graphql/group.query';
+┊  ┊16┊import CREATE_MESSAGE_MUTATION from '../graphql/create-message.mutation';
 ┊16┊17┊
 ┊17┊18┊const styles = StyleSheet.create({
 ┊18┊19┊  container: {
```
```diff
@@ -69,8 +70,11 @@
 ┊69┊70┊  }
 ┊70┊71┊
 ┊71┊72┊  send(text) {
-┊72┊  ┊    // TODO: send the message
-┊73┊  ┊    console.log(`sending message: ${text}`);
+┊  ┊73┊    this.props.createMessage({
+┊  ┊74┊      groupId: this.props.navigation.state.params.groupId,
+┊  ┊75┊      userId: 1, // faking the user for now
+┊  ┊76┊      text,
+┊  ┊77┊    });
 ┊74┊78┊  }
 ┊75┊79┊
 ┊76┊80┊  keyExtractor = item => item.id;
```
```diff
@@ -116,6 +120,14 @@
 ┊116┊120┊}
 ┊117┊121┊
 ┊118┊122┊Messages.propTypes = {
+┊   ┊123┊  createMessage: PropTypes.func,
+┊   ┊124┊  navigation: PropTypes.shape({
+┊   ┊125┊    state: PropTypes.shape({
+┊   ┊126┊      params: PropTypes.shape({
+┊   ┊127┊        groupId: PropTypes.number,
+┊   ┊128┊      }),
+┊   ┊129┊    }),
+┊   ┊130┊  }),
 ┊119┊131┊  group: PropTypes.shape({
 ┊120┊132┊    messages: PropTypes.array,
 ┊121┊133┊    users: PropTypes.array,
```
```diff
@@ -134,6 +146,16 @@
 ┊134┊146┊  }),
 ┊135┊147┊});
 ┊136┊148┊
+┊   ┊149┊const createMessageMutation = graphql(CREATE_MESSAGE_MUTATION, {
+┊   ┊150┊  props: ({ mutate }) => ({
+┊   ┊151┊    createMessage: ({ text, userId, groupId }) =>
+┊   ┊152┊      mutate({
+┊   ┊153┊        variables: { text, userId, groupId },
+┊   ┊154┊      }),
+┊   ┊155┊  }),
+┊   ┊156┊});
+┊   ┊157┊
 ┊137┊158┊export default compose(
 ┊138┊159┊  groupQuery,
+┊   ┊160┊  createMessageMutation,
 ┊139┊161┊)(Messages);
```

[}]: #

By attaching `createMessage` with `compose`, we attach a `createMessage` function to the component’s `props`. We call `props.createMessage` in `send` with the required variables (we’ll keep faking the user for now). When the user presses the send button, this method will get called and the mutation should execute.

Let’s run the app and see what happens: ![Send Fail Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step4-9.gif)

What went wrong? Well technically nothing went wrong. Our mutation successfully executed, but we’re not seeing our message pop up. Why? **Running a mutation doesn’t automatically update our queries with new data!** If we were to refresh the page, we’d actually see our message. This issue only arrises when we are adding or removing data with our mutation.

To overcome this challenge, `react-apollo` lets us declare a property `update` within the argument we pass to mutate. In `update`, we specify which queries should update after the mutation executes and how the data will transform.

Our modified `createMessage` should look like this:

[{]: <helper> (diffStep "4.10")

#### Step 4.10: Add update to mutation

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -151,7 +151,29 @@
 ┊151┊151┊    createMessage: ({ text, userId, groupId }) =>
 ┊152┊152┊      mutate({
 ┊153┊153┊        variables: { text, userId, groupId },
+┊   ┊154┊        update: (store, { data: { createMessage } }) => {
+┊   ┊155┊          // Read the data from our cache for this query.
+┊   ┊156┊          const groupData = store.readQuery({
+┊   ┊157┊            query: GROUP_QUERY,
+┊   ┊158┊            variables: {
+┊   ┊159┊              groupId,
+┊   ┊160┊            },
+┊   ┊161┊          });
+┊   ┊162┊
+┊   ┊163┊          // Add our message from the mutation to the end.
+┊   ┊164┊          groupData.group.messages.unshift(createMessage);
+┊   ┊165┊
+┊   ┊166┊          // Write our data back to the cache.
+┊   ┊167┊          store.writeQuery({
+┊   ┊168┊            query: GROUP_QUERY,
+┊   ┊169┊            variables: {
+┊   ┊170┊              groupId,
+┊   ┊171┊            },
+┊   ┊172┊            data: groupData,
+┊   ┊173┊          });
+┊   ┊174┊        },
 ┊154┊175┊      }),
+┊   ┊176┊
 ┊155┊177┊  }),
 ┊156┊178┊});
```

[}]: #

In `update`, we first retrieve the existing data for the query we want to update (`GROUP_QUERY`) along with the specific variables we passed to that query. This data comes to us from our Redux store of Apollo data. We check to see if the new `Message` returned from `createMessage` already exists (in case of race conditions down the line), and then update the previous query result by sticking the new message in front. We then use this modified data object and rewrite the results to the Apollo store with `store.writeQuery`, being sure to pass all the variables associated with our query. This will force `props` to change reference and the component to rerender. ![Fixed Send Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step4-10.gif)

# Optimistic UI
### But wait! There’s more!
`update` will currently only update the query after the mutation succeeds and a response is sent back on the server. But we don’t want to wait till the server returns data  —  we crave instant gratification! If a user with shoddy internet tried to send a message and it didn’t show up right away, they’d probably try and send the message again and again and end up sending the message multiple times… and then they’d yell at customer support!

**Optimistic UI** is our weapon for protecting customer support. We know the shape of the data we expect to receive from the server, so why not fake it until we get a response? `react-apollo` lets us accomplish this by adding an `optimisticResponse` parameter to mutate. In our case it looks like this:

[{]: <helper> (diffStep 4.11)

#### Step 4.11: Add optimisticResponse to mutation

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -151,6 +151,24 @@
 ┊151┊151┊    createMessage: ({ text, userId, groupId }) =>
 ┊152┊152┊      mutate({
 ┊153┊153┊        variables: { text, userId, groupId },
+┊   ┊154┊        optimisticResponse: {
+┊   ┊155┊          __typename: 'Mutation',
+┊   ┊156┊          createMessage: {
+┊   ┊157┊            __typename: 'Message',
+┊   ┊158┊            id: -1, // don't know id yet, but it doesn't matter
+┊   ┊159┊            text, // we know what the text will be
+┊   ┊160┊            createdAt: new Date().toISOString(), // the time is now!
+┊   ┊161┊            from: {
+┊   ┊162┊              __typename: 'User',
+┊   ┊163┊              id: 1, // still faking the user
+┊   ┊164┊              username: 'Justyn.Kautzer', // still faking the user
+┊   ┊165┊            },
+┊   ┊166┊            to: {
+┊   ┊167┊              __typename: 'Group',
+┊   ┊168┊              id: groupId,
+┊   ┊169┊            },
+┊   ┊170┊          },
+┊   ┊171┊        },
 ┊154┊172┊        update: (store, { data: { createMessage } }) => {
 ┊155┊173┊          // Read the data from our cache for this query.
 ┊156┊174┊          const groupData = store.readQuery({
```

[}]: #

The Object returned from `optimisticResponse` is what the data should look like from our server when the mutation succeeds. We need to specify the `__typename` for all  values in our optimistic response just like our server would. Even though we don’t know all values for all fields, we know enough to populate the ones that will show up in the UI, like the text, user, and message creation time. This will essentially be a placeholder until the server responds.

Let’s also modify our UI a bit so that our `FlatList` scrolls to the bottom when we send a message as soon as we receive new data:

[{]: <helper> (diffStep 4.12)

#### Step 4.12: Add scrollToEnd to Messages after send

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -74,6 +74,8 @@
 ┊74┊74┊      groupId: this.props.navigation.state.params.groupId,
 ┊75┊75┊      userId: 1, // faking the user for now
 ┊76┊76┊      text,
+┊  ┊77┊    }).then(() => {
+┊  ┊78┊      this.flatList.scrollToEnd({ animated: true });
 ┊77┊79┊    });
 ┊78┊80┊  }
 ┊79┊81┊
```
```diff
@@ -108,6 +110,7 @@
 ┊108┊110┊        style={styles.container}
 ┊109┊111┊      >
 ┊110┊112┊        <FlatList
+┊   ┊113┊          ref={(ref) => { this.flatList = ref; }}
 ┊111┊114┊          data={group.messages.slice().reverse()}
 ┊112┊115┊          keyExtractor={this.keyExtractor}
 ┊113┊116┊          renderItem={this.renderItem}
```

[}]: #

![Scroll to Bottom Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step4-12.gif)

### 🔥🔥🔥!!!

# **YOUR CHALLENGE**
First, let’s take a break. We’ve definitely earned it.

Now that we’re comfortable using GraphQL Queries and Mutations and some tricky stuff in React Native, we can do most of the things we need to do for most basic applications. In fact, there are a number of Chatty features that we can already implement without knowing much else. This post is already plenty long, but there are features left to be built. So with that said, I like to suggest that you try to complete the following features on your own before we move on:

1. Add GraphQL Mutations on our server for creating, modifying, and deleting `Groups`
2. Add new Screens to our React Native app for creating, modifying, and deleting `Groups`
3. Build GraphQL Queries and Mutations for our new Screens and connect them using `react-apollo`
4. Include `update` for these new mutations where necessary

If you want to see some UI or you want a hint or you don’t wanna write any code, that’s cool too! Below is some code with these features added. ![Groups Gif](https://s3-us-west-1.amazonaws.com/tortilla/chatty/step4-13.gif)

[{]: <helper> (diffStep 4.13)

#### Step 4.13: Add Group Mutations and Screens

##### Changed client&#x2F;package.json
```diff
@@ -9,6 +9,7 @@
 ┊ 9┊ 9┊	"dependencies": {
 ┊10┊10┊		"apollo-client": "^1.9.0",
 ┊11┊11┊		"graphql-tag": "^2.4.2",
+┊  ┊12┊		"immutability-helper": "^2.3.0",
 ┊12┊13┊		"lodash": "^4.17.4",
 ┊13┊14┊		"moment": "^2.18.1",
 ┊14┊15┊		"prop-types": "^15.5.10",
```
```diff
@@ -16,6 +17,7 @@
 ┊16┊17┊		"react": "16.0.0-alpha.12",
 ┊17┊18┊		"react-apollo": "^1.4.10",
 ┊18┊19┊		"react-native": "0.47.1",
+┊  ┊20┊		"react-native-alphabetlistview": "^0.2.0",
 ┊19┊21┊		"react-native-vector-icons": "^4.3.0",
 ┊20┊22┊		"react-navigation": "^1.0.0-beta.11",
 ┊21┊23┊		"react-redux": "^5.0.5",
```

##### Added client&#x2F;src&#x2F;components&#x2F;selected-user-list.component.js
```diff
@@ -0,0 +1,118 @@
+┊   ┊  1┊import React, { Component } from 'react';
+┊   ┊  2┊import PropTypes from 'prop-types';
+┊   ┊  3┊import {
+┊   ┊  4┊  FlatList,
+┊   ┊  5┊  Image,
+┊   ┊  6┊  StyleSheet,
+┊   ┊  7┊  Text,
+┊   ┊  8┊  TouchableOpacity,
+┊   ┊  9┊  View,
+┊   ┊ 10┊} from 'react-native';
+┊   ┊ 11┊import Icon from 'react-native-vector-icons/FontAwesome';
+┊   ┊ 12┊
+┊   ┊ 13┊const styles = StyleSheet.create({
+┊   ┊ 14┊  list: {
+┊   ┊ 15┊    paddingVertical: 8,
+┊   ┊ 16┊  },
+┊   ┊ 17┊  itemContainer: {
+┊   ┊ 18┊    alignItems: 'center',
+┊   ┊ 19┊    paddingHorizontal: 12,
+┊   ┊ 20┊  },
+┊   ┊ 21┊  itemIcon: {
+┊   ┊ 22┊    alignItems: 'center',
+┊   ┊ 23┊    backgroundColor: '#dbdbdb',
+┊   ┊ 24┊    borderColor: 'white',
+┊   ┊ 25┊    borderRadius: 10,
+┊   ┊ 26┊    borderWidth: 2,
+┊   ┊ 27┊    flexDirection: 'row',
+┊   ┊ 28┊    height: 20,
+┊   ┊ 29┊    justifyContent: 'center',
+┊   ┊ 30┊    position: 'absolute',
+┊   ┊ 31┊    right: -3,
+┊   ┊ 32┊    top: -3,
+┊   ┊ 33┊    width: 20,
+┊   ┊ 34┊  },
+┊   ┊ 35┊  itemImage: {
+┊   ┊ 36┊    borderRadius: 27,
+┊   ┊ 37┊    height: 54,
+┊   ┊ 38┊    width: 54,
+┊   ┊ 39┊  },
+┊   ┊ 40┊});
+┊   ┊ 41┊
+┊   ┊ 42┊export class SelectedUserListItem extends Component {
+┊   ┊ 43┊  constructor(props) {
+┊   ┊ 44┊    super(props);
+┊   ┊ 45┊
+┊   ┊ 46┊    this.remove = this.remove.bind(this);
+┊   ┊ 47┊  }
+┊   ┊ 48┊
+┊   ┊ 49┊  remove() {
+┊   ┊ 50┊    this.props.remove(this.props.user);
+┊   ┊ 51┊  }
+┊   ┊ 52┊
+┊   ┊ 53┊  render() {
+┊   ┊ 54┊    const { username } = this.props.user;
+┊   ┊ 55┊
+┊   ┊ 56┊    return (
+┊   ┊ 57┊      <View
+┊   ┊ 58┊        style={styles.itemContainer}
+┊   ┊ 59┊      >
+┊   ┊ 60┊        <View>
+┊   ┊ 61┊          <Image
+┊   ┊ 62┊            style={styles.itemImage}
+┊   ┊ 63┊            source={{ uri: 'https://facebook.github.io/react/img/logo_og.png' }}
+┊   ┊ 64┊          />
+┊   ┊ 65┊          <TouchableOpacity onPress={this.remove} style={styles.itemIcon}>
+┊   ┊ 66┊            <Icon
+┊   ┊ 67┊              color={'white'}
+┊   ┊ 68┊              name={'times'}
+┊   ┊ 69┊              size={12}
+┊   ┊ 70┊            />
+┊   ┊ 71┊          </TouchableOpacity>
+┊   ┊ 72┊        </View>
+┊   ┊ 73┊        <Text>{username}</Text>
+┊   ┊ 74┊      </View>
+┊   ┊ 75┊    );
+┊   ┊ 76┊  }
+┊   ┊ 77┊}
+┊   ┊ 78┊SelectedUserListItem.propTypes = {
+┊   ┊ 79┊  user: PropTypes.shape({
+┊   ┊ 80┊    id: PropTypes.number,
+┊   ┊ 81┊    username: PropTypes.string,
+┊   ┊ 82┊  }),
+┊   ┊ 83┊  remove: PropTypes.func,
+┊   ┊ 84┊};
+┊   ┊ 85┊
+┊   ┊ 86┊class SelectedUserList extends Component {
+┊   ┊ 87┊  constructor(props) {
+┊   ┊ 88┊    super(props);
+┊   ┊ 89┊
+┊   ┊ 90┊    this.renderItem = this.renderItem.bind(this);
+┊   ┊ 91┊  }
+┊   ┊ 92┊
+┊   ┊ 93┊  keyExtractor = item => item.id;
+┊   ┊ 94┊
+┊   ┊ 95┊  renderItem({ item: user }) {
+┊   ┊ 96┊    return (
+┊   ┊ 97┊      <SelectedUserListItem user={user} remove={this.props.remove} />
+┊   ┊ 98┊    );
+┊   ┊ 99┊  }
+┊   ┊100┊
+┊   ┊101┊  render() {
+┊   ┊102┊    return (
+┊   ┊103┊      <FlatList
+┊   ┊104┊        data={this.props.data}
+┊   ┊105┊        keyExtractor={this.keyExtractor}
+┊   ┊106┊        renderItem={this.renderItem}
+┊   ┊107┊        horizontal
+┊   ┊108┊        style={styles.list}
+┊   ┊109┊      />
+┊   ┊110┊    );
+┊   ┊111┊  }
+┊   ┊112┊}
+┊   ┊113┊SelectedUserList.propTypes = {
+┊   ┊114┊  data: PropTypes.arrayOf(PropTypes.object),
+┊   ┊115┊  remove: PropTypes.func,
+┊   ┊116┊};
+┊   ┊117┊
+┊   ┊118┊export default SelectedUserList;
```

##### Added client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
```diff
@@ -0,0 +1,15 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊const CREATE_GROUP_MUTATION = gql`
+┊  ┊ 4┊  mutation createGroup($name: String!, $userIds: [Int!], $userId: Int!) {
+┊  ┊ 5┊    createGroup(name: $name, userIds: $userIds, userId: $userId) {
+┊  ┊ 6┊      id
+┊  ┊ 7┊      name
+┊  ┊ 8┊      users {
+┊  ┊ 9┊        id
+┊  ┊10┊      }
+┊  ┊11┊    }
+┊  ┊12┊  }
+┊  ┊13┊`;
+┊  ┊14┊
+┊  ┊15┊export default CREATE_GROUP_MUTATION;
```

##### Added client&#x2F;src&#x2F;graphql&#x2F;delete-group.mutation.js
```diff
@@ -0,0 +1,11 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊const DELETE_GROUP_MUTATION = gql`
+┊  ┊ 4┊  mutation deleteGroup($id: Int!) {
+┊  ┊ 5┊    deleteGroup(id: $id) {
+┊  ┊ 6┊      id
+┊  ┊ 7┊    }
+┊  ┊ 8┊  }
+┊  ┊ 9┊`;
+┊  ┊10┊
+┊  ┊11┊export default DELETE_GROUP_MUTATION;
```

##### Added client&#x2F;src&#x2F;graphql&#x2F;leave-group.mutation.js
```diff
@@ -0,0 +1,11 @@
+┊  ┊ 1┊import gql from 'graphql-tag';
+┊  ┊ 2┊
+┊  ┊ 3┊const LEAVE_GROUP_MUTATION = gql`
+┊  ┊ 4┊  mutation leaveGroup($id: Int!, $userId: Int!) {
+┊  ┊ 5┊    leaveGroup(id: $id, userId: $userId) {
+┊  ┊ 6┊      id
+┊  ┊ 7┊    }
+┊  ┊ 8┊  }
+┊  ┊ 9┊`;
+┊  ┊10┊
+┊  ┊11┊export default LEAVE_GROUP_MUTATION;
```

##### Changed client&#x2F;src&#x2F;graphql&#x2F;user.query.js
```diff
@@ -11,6 +11,10 @@
 ┊11┊11┊        id
 ┊12┊12┊        name
 ┊13┊13┊      }
+┊  ┊14┊      friends {
+┊  ┊15┊        id
+┊  ┊16┊        username
+┊  ┊17┊      }
 ┊14┊18┊    }
 ┊15┊19┊  }
 ┊16┊20┊`;
```

##### Changed client&#x2F;src&#x2F;navigation.js
```diff
@@ -6,6 +6,9 @@
 ┊ 6┊ 6┊
 ┊ 7┊ 7┊import Groups from './screens/groups.screen';
 ┊ 8┊ 8┊import Messages from './screens/messages.screen';
+┊  ┊ 9┊import FinalizeGroup from './screens/finalize-group.screen';
+┊  ┊10┊import GroupDetails from './screens/group-details.screen';
+┊  ┊11┊import NewGroup from './screens/new-group.screen';
 ┊ 9┊12┊
 ┊10┊13┊const styles = StyleSheet.create({
 ┊11┊14┊  container: {
```
```diff
@@ -41,6 +44,9 @@
 ┊41┊44┊const AppNavigator = StackNavigator({
 ┊42┊45┊  Main: { screen: MainScreenNavigator },
 ┊43┊46┊  Messages: { screen: Messages },
+┊  ┊47┊  GroupDetails: { screen: GroupDetails },
+┊  ┊48┊  NewGroup: { screen: NewGroup },
+┊  ┊49┊  FinalizeGroup: { screen: FinalizeGroup },
 ┊44┊50┊}, {
 ┊45┊51┊  mode: 'modal',
 ┊46┊52┊});
```

##### Added client&#x2F;src&#x2F;screens&#x2F;finalize-group.screen.js
```diff
@@ -0,0 +1,261 @@
+┊   ┊  1┊import { _ } from 'lodash';
+┊   ┊  2┊import React, { Component } from 'react';
+┊   ┊  3┊import PropTypes from 'prop-types';
+┊   ┊  4┊import {
+┊   ┊  5┊  Alert,
+┊   ┊  6┊  Button,
+┊   ┊  7┊  Image,
+┊   ┊  8┊  StyleSheet,
+┊   ┊  9┊  Text,
+┊   ┊ 10┊  TextInput,
+┊   ┊ 11┊  TouchableOpacity,
+┊   ┊ 12┊  View,
+┊   ┊ 13┊} from 'react-native';
+┊   ┊ 14┊import { graphql, compose } from 'react-apollo';
+┊   ┊ 15┊import { NavigationActions } from 'react-navigation';
+┊   ┊ 16┊import update from 'immutability-helper';
+┊   ┊ 17┊
+┊   ┊ 18┊import { USER_QUERY } from '../graphql/user.query';
+┊   ┊ 19┊import CREATE_GROUP_MUTATION from '../graphql/create-group.mutation';
+┊   ┊ 20┊import SelectedUserList from '../components/selected-user-list.component';
+┊   ┊ 21┊
+┊   ┊ 22┊const goToNewGroup = group => NavigationActions.reset({
+┊   ┊ 23┊  index: 1,
+┊   ┊ 24┊  actions: [
+┊   ┊ 25┊    NavigationActions.navigate({ routeName: 'Main' }),
+┊   ┊ 26┊    NavigationActions.navigate({ routeName: 'Messages', params: { groupId: group.id, title: group.name } }),
+┊   ┊ 27┊  ],
+┊   ┊ 28┊});
+┊   ┊ 29┊
+┊   ┊ 30┊const styles = StyleSheet.create({
+┊   ┊ 31┊  container: {
+┊   ┊ 32┊    flex: 1,
+┊   ┊ 33┊    backgroundColor: 'white',
+┊   ┊ 34┊  },
+┊   ┊ 35┊  detailsContainer: {
+┊   ┊ 36┊    padding: 20,
+┊   ┊ 37┊    flexDirection: 'row',
+┊   ┊ 38┊  },
+┊   ┊ 39┊  imageContainer: {
+┊   ┊ 40┊    paddingRight: 20,
+┊   ┊ 41┊    alignItems: 'center',
+┊   ┊ 42┊  },
+┊   ┊ 43┊  inputContainer: {
+┊   ┊ 44┊    flexDirection: 'column',
+┊   ┊ 45┊    flex: 1,
+┊   ┊ 46┊  },
+┊   ┊ 47┊  input: {
+┊   ┊ 48┊    color: 'black',
+┊   ┊ 49┊    height: 32,
+┊   ┊ 50┊  },
+┊   ┊ 51┊  inputBorder: {
+┊   ┊ 52┊    borderColor: '#dbdbdb',
+┊   ┊ 53┊    borderBottomWidth: 1,
+┊   ┊ 54┊    borderTopWidth: 1,
+┊   ┊ 55┊    paddingVertical: 8,
+┊   ┊ 56┊  },
+┊   ┊ 57┊  inputInstructions: {
+┊   ┊ 58┊    paddingTop: 6,
+┊   ┊ 59┊    color: '#777',
+┊   ┊ 60┊    fontSize: 12,
+┊   ┊ 61┊  },
+┊   ┊ 62┊  groupImage: {
+┊   ┊ 63┊    width: 54,
+┊   ┊ 64┊    height: 54,
+┊   ┊ 65┊    borderRadius: 27,
+┊   ┊ 66┊  },
+┊   ┊ 67┊  selected: {
+┊   ┊ 68┊    flexDirection: 'row',
+┊   ┊ 69┊  },
+┊   ┊ 70┊  loading: {
+┊   ┊ 71┊    justifyContent: 'center',
+┊   ┊ 72┊    flex: 1,
+┊   ┊ 73┊  },
+┊   ┊ 74┊  navIcon: {
+┊   ┊ 75┊    color: 'blue',
+┊   ┊ 76┊    fontSize: 18,
+┊   ┊ 77┊    paddingTop: 2,
+┊   ┊ 78┊  },
+┊   ┊ 79┊  participants: {
+┊   ┊ 80┊    paddingHorizontal: 20,
+┊   ┊ 81┊    paddingVertical: 6,
+┊   ┊ 82┊    backgroundColor: '#dbdbdb',
+┊   ┊ 83┊    color: '#777',
+┊   ┊ 84┊  },
+┊   ┊ 85┊});
+┊   ┊ 86┊
+┊   ┊ 87┊class FinalizeGroup extends Component {
+┊   ┊ 88┊  static navigationOptions = ({ navigation }) => {
+┊   ┊ 89┊    const { state } = navigation;
+┊   ┊ 90┊    const isReady = state.params && state.params.mode === 'ready';
+┊   ┊ 91┊    return {
+┊   ┊ 92┊      title: 'New Group',
+┊   ┊ 93┊      headerRight: (
+┊   ┊ 94┊        isReady ? <Button
+┊   ┊ 95┊          title="Create"
+┊   ┊ 96┊          onPress={state.params.create}
+┊   ┊ 97┊        /> : undefined
+┊   ┊ 98┊      ),
+┊   ┊ 99┊    };
+┊   ┊100┊  };
+┊   ┊101┊
+┊   ┊102┊  constructor(props) {
+┊   ┊103┊    super(props);
+┊   ┊104┊
+┊   ┊105┊    const { selected } = props.navigation.state.params;
+┊   ┊106┊
+┊   ┊107┊    this.state = {
+┊   ┊108┊      selected,
+┊   ┊109┊    };
+┊   ┊110┊
+┊   ┊111┊    this.create = this.create.bind(this);
+┊   ┊112┊    this.pop = this.pop.bind(this);
+┊   ┊113┊    this.remove = this.remove.bind(this);
+┊   ┊114┊  }
+┊   ┊115┊
+┊   ┊116┊  componentDidMount() {
+┊   ┊117┊    this.refreshNavigation(this.state.selected.length && this.state.name);
+┊   ┊118┊  }
+┊   ┊119┊
+┊   ┊120┊  componentWillUpdate(nextProps, nextState) {
+┊   ┊121┊    if ((nextState.selected.length && nextState.name) !==
+┊   ┊122┊      (this.state.selected.length && this.state.name)) {
+┊   ┊123┊      this.refreshNavigation(nextState.selected.length && nextState.name);
+┊   ┊124┊    }
+┊   ┊125┊  }
+┊   ┊126┊
+┊   ┊127┊  pop() {
+┊   ┊128┊    this.props.navigation.goBack();
+┊   ┊129┊  }
+┊   ┊130┊
+┊   ┊131┊  remove(user) {
+┊   ┊132┊    const index = this.state.selected.indexOf(user);
+┊   ┊133┊    if (~index) {
+┊   ┊134┊      const selected = update(this.state.selected, { $splice: [[index, 1]] });
+┊   ┊135┊      this.setState({
+┊   ┊136┊        selected,
+┊   ┊137┊      });
+┊   ┊138┊    }
+┊   ┊139┊  }
+┊   ┊140┊
+┊   ┊141┊  create() {
+┊   ┊142┊    const { createGroup } = this.props;
+┊   ┊143┊
+┊   ┊144┊    createGroup({
+┊   ┊145┊      name: this.state.name,
+┊   ┊146┊      userId: 1, // fake user for now
+┊   ┊147┊      userIds: _.map(this.state.selected, 'id'),
+┊   ┊148┊    }).then((res) => {
+┊   ┊149┊      this.props.navigation.dispatch(goToNewGroup(res.data.createGroup));
+┊   ┊150┊    }).catch((error) => {
+┊   ┊151┊      Alert.alert(
+┊   ┊152┊        'Error Creating New Group',
+┊   ┊153┊        error.message,
+┊   ┊154┊        [
+┊   ┊155┊          { text: 'OK', onPress: () => {} },
+┊   ┊156┊        ],
+┊   ┊157┊      );
+┊   ┊158┊    });
+┊   ┊159┊  }
+┊   ┊160┊
+┊   ┊161┊  refreshNavigation(ready) {
+┊   ┊162┊    const { navigation } = this.props;
+┊   ┊163┊    navigation.setParams({
+┊   ┊164┊      mode: ready ? 'ready' : undefined,
+┊   ┊165┊      create: this.create,
+┊   ┊166┊    });
+┊   ┊167┊  }
+┊   ┊168┊
+┊   ┊169┊  render() {
+┊   ┊170┊    const { friendCount } = this.props.navigation.state.params;
+┊   ┊171┊
+┊   ┊172┊    return (
+┊   ┊173┊      <View style={styles.container}>
+┊   ┊174┊        <View style={styles.detailsContainer}>
+┊   ┊175┊          <TouchableOpacity style={styles.imageContainer}>
+┊   ┊176┊            <Image
+┊   ┊177┊              style={styles.groupImage}
+┊   ┊178┊              source={{ uri: 'https://facebook.github.io/react/img/logo_og.png' }}
+┊   ┊179┊            />
+┊   ┊180┊            <Text>edit</Text>
+┊   ┊181┊          </TouchableOpacity>
+┊   ┊182┊          <View style={styles.inputContainer}>
+┊   ┊183┊            <View style={styles.inputBorder}>
+┊   ┊184┊              <TextInput
+┊   ┊185┊                autoFocus
+┊   ┊186┊                onChangeText={name => this.setState({ name })}
+┊   ┊187┊                placeholder="Group Subject"
+┊   ┊188┊                style={styles.input}
+┊   ┊189┊              />
+┊   ┊190┊            </View>
+┊   ┊191┊            <Text style={styles.inputInstructions}>
+┊   ┊192┊              {'Please provide a group subject and optional group icon'}
+┊   ┊193┊            </Text>
+┊   ┊194┊          </View>
+┊   ┊195┊        </View>
+┊   ┊196┊        <Text style={styles.participants}>
+┊   ┊197┊          {`participants: ${this.state.selected.length} of ${friendCount}`.toUpperCase()}
+┊   ┊198┊        </Text>
+┊   ┊199┊        <View style={styles.selected}>
+┊   ┊200┊          {this.state.selected.length ?
+┊   ┊201┊            <SelectedUserList
+┊   ┊202┊              data={this.state.selected}
+┊   ┊203┊              remove={this.remove}
+┊   ┊204┊            /> : undefined}
+┊   ┊205┊        </View>
+┊   ┊206┊      </View>
+┊   ┊207┊    );
+┊   ┊208┊  }
+┊   ┊209┊}
+┊   ┊210┊
+┊   ┊211┊FinalizeGroup.propTypes = {
+┊   ┊212┊  createGroup: PropTypes.func.isRequired,
+┊   ┊213┊  navigation: PropTypes.shape({
+┊   ┊214┊    dispatch: PropTypes.func,
+┊   ┊215┊    goBack: PropTypes.func,
+┊   ┊216┊    state: PropTypes.shape({
+┊   ┊217┊      params: PropTypes.shape({
+┊   ┊218┊        friendCount: PropTypes.number.isRequired,
+┊   ┊219┊      }),
+┊   ┊220┊    }),
+┊   ┊221┊  }),
+┊   ┊222┊};
+┊   ┊223┊
+┊   ┊224┊const createGroupMutation = graphql(CREATE_GROUP_MUTATION, {
+┊   ┊225┊  props: ({ mutate }) => ({
+┊   ┊226┊    createGroup: ({ name, userIds, userId }) =>
+┊   ┊227┊      mutate({
+┊   ┊228┊        variables: { name, userIds, userId },
+┊   ┊229┊        update: (store, { data: { createGroup } }) => {
+┊   ┊230┊          // Read the data from our cache for this query.
+┊   ┊231┊          const data = store.readQuery({ query: USER_QUERY, variables: { id: userId } });
+┊   ┊232┊
+┊   ┊233┊          // Add our message from the mutation to the end.
+┊   ┊234┊          data.user.groups.push(createGroup);
+┊   ┊235┊
+┊   ┊236┊          // Write our data back to the cache.
+┊   ┊237┊          store.writeQuery({
+┊   ┊238┊            query: USER_QUERY,
+┊   ┊239┊            variables: { id: userId },
+┊   ┊240┊            data,
+┊   ┊241┊          });
+┊   ┊242┊        },
+┊   ┊243┊      }),
+┊   ┊244┊  }),
+┊   ┊245┊});
+┊   ┊246┊
+┊   ┊247┊const userQuery = graphql(USER_QUERY, {
+┊   ┊248┊  options: ownProps => ({
+┊   ┊249┊    variables: {
+┊   ┊250┊      id: ownProps.navigation.state.params.userId,
+┊   ┊251┊    },
+┊   ┊252┊  }),
+┊   ┊253┊  props: ({ data: { loading, user } }) => ({
+┊   ┊254┊    loading, user,
+┊   ┊255┊  }),
+┊   ┊256┊});
+┊   ┊257┊
+┊   ┊258┊export default compose(
+┊   ┊259┊  userQuery,
+┊   ┊260┊  createGroupMutation,
+┊   ┊261┊)(FinalizeGroup);
```

##### Added client&#x2F;src&#x2F;screens&#x2F;group-details.screen.js
```diff
@@ -0,0 +1,265 @@
+┊   ┊  1┊// TODO: update group functionality
+┊   ┊  2┊import React, { Component } from 'react';
+┊   ┊  3┊import PropTypes from 'prop-types';
+┊   ┊  4┊import {
+┊   ┊  5┊  ActivityIndicator,
+┊   ┊  6┊  Button,
+┊   ┊  7┊  Image,
+┊   ┊  8┊  FlatList,
+┊   ┊  9┊  StyleSheet,
+┊   ┊ 10┊  Text,
+┊   ┊ 11┊  TouchableOpacity,
+┊   ┊ 12┊  View,
+┊   ┊ 13┊} from 'react-native';
+┊   ┊ 14┊import { graphql, compose } from 'react-apollo';
+┊   ┊ 15┊import { NavigationActions } from 'react-navigation';
+┊   ┊ 16┊
+┊   ┊ 17┊import GROUP_QUERY from '../graphql/group.query';
+┊   ┊ 18┊import USER_QUERY from '../graphql/user.query';
+┊   ┊ 19┊import DELETE_GROUP_MUTATION from '../graphql/delete-group.mutation';
+┊   ┊ 20┊import LEAVE_GROUP_MUTATION from '../graphql/leave-group.mutation';
+┊   ┊ 21┊
+┊   ┊ 22┊const resetAction = NavigationActions.reset({
+┊   ┊ 23┊  index: 0,
+┊   ┊ 24┊  actions: [
+┊   ┊ 25┊    NavigationActions.navigate({ routeName: 'Main' }),
+┊   ┊ 26┊  ],
+┊   ┊ 27┊});
+┊   ┊ 28┊
+┊   ┊ 29┊const styles = StyleSheet.create({
+┊   ┊ 30┊  container: {
+┊   ┊ 31┊    flex: 1,
+┊   ┊ 32┊  },
+┊   ┊ 33┊  avatar: {
+┊   ┊ 34┊    width: 32,
+┊   ┊ 35┊    height: 32,
+┊   ┊ 36┊    borderRadius: 16,
+┊   ┊ 37┊  },
+┊   ┊ 38┊  detailsContainer: {
+┊   ┊ 39┊    flexDirection: 'row',
+┊   ┊ 40┊    alignItems: 'center',
+┊   ┊ 41┊  },
+┊   ┊ 42┊  groupImageContainer: {
+┊   ┊ 43┊    paddingTop: 20,
+┊   ┊ 44┊    paddingHorizontal: 20,
+┊   ┊ 45┊    paddingBottom: 6,
+┊   ┊ 46┊    alignItems: 'center',
+┊   ┊ 47┊  },
+┊   ┊ 48┊  groupName: {
+┊   ┊ 49┊    color: 'black',
+┊   ┊ 50┊  },
+┊   ┊ 51┊  groupNameBorder: {
+┊   ┊ 52┊    borderBottomWidth: 1,
+┊   ┊ 53┊    borderColor: '#dbdbdb',
+┊   ┊ 54┊    borderTopWidth: 1,
+┊   ┊ 55┊    flex: 1,
+┊   ┊ 56┊    paddingVertical: 8,
+┊   ┊ 57┊  },
+┊   ┊ 58┊  groupImage: {
+┊   ┊ 59┊    width: 54,
+┊   ┊ 60┊    height: 54,
+┊   ┊ 61┊    borderRadius: 27,
+┊   ┊ 62┊  },
+┊   ┊ 63┊  participants: {
+┊   ┊ 64┊    borderBottomWidth: 1,
+┊   ┊ 65┊    borderColor: '#dbdbdb',
+┊   ┊ 66┊    borderTopWidth: 1,
+┊   ┊ 67┊    paddingHorizontal: 20,
+┊   ┊ 68┊    paddingVertical: 6,
+┊   ┊ 69┊    backgroundColor: '#dbdbdb',
+┊   ┊ 70┊    color: '#777',
+┊   ┊ 71┊  },
+┊   ┊ 72┊  user: {
+┊   ┊ 73┊    alignItems: 'center',
+┊   ┊ 74┊    borderBottomWidth: 1,
+┊   ┊ 75┊    borderColor: '#dbdbdb',
+┊   ┊ 76┊    flexDirection: 'row',
+┊   ┊ 77┊    padding: 10,
+┊   ┊ 78┊  },
+┊   ┊ 79┊  username: {
+┊   ┊ 80┊    flex: 1,
+┊   ┊ 81┊    fontSize: 16,
+┊   ┊ 82┊    paddingHorizontal: 12,
+┊   ┊ 83┊    paddingVertical: 8,
+┊   ┊ 84┊  },
+┊   ┊ 85┊});
+┊   ┊ 86┊
+┊   ┊ 87┊class GroupDetails extends Component {
+┊   ┊ 88┊  static navigationOptions = ({ navigation }) => ({
+┊   ┊ 89┊    title: `${navigation.state.params.title}`,
+┊   ┊ 90┊  });
+┊   ┊ 91┊
+┊   ┊ 92┊  constructor(props) {
+┊   ┊ 93┊    super(props);
+┊   ┊ 94┊
+┊   ┊ 95┊    this.deleteGroup = this.deleteGroup.bind(this);
+┊   ┊ 96┊    this.leaveGroup = this.leaveGroup.bind(this);
+┊   ┊ 97┊    this.renderItem = this.renderItem.bind(this);
+┊   ┊ 98┊  }
+┊   ┊ 99┊
+┊   ┊100┊  deleteGroup() {
+┊   ┊101┊    this.props.deleteGroup(this.props.navigation.state.params.id)
+┊   ┊102┊      .then(() => {
+┊   ┊103┊        this.props.navigation.dispatch(resetAction);
+┊   ┊104┊      })
+┊   ┊105┊      .catch((e) => {
+┊   ┊106┊        console.log(e);   // eslint-disable-line no-console
+┊   ┊107┊      });
+┊   ┊108┊  }
+┊   ┊109┊
+┊   ┊110┊  leaveGroup() {
+┊   ┊111┊    this.props.leaveGroup({
+┊   ┊112┊      id: this.props.navigation.state.params.id,
+┊   ┊113┊      userId: 1,
+┊   ┊114┊    }) // fake user for now
+┊   ┊115┊      .then(() => {
+┊   ┊116┊        this.props.navigation.dispatch(resetAction);
+┊   ┊117┊      })
+┊   ┊118┊      .catch((e) => {
+┊   ┊119┊        console.log(e);   // eslint-disable-line no-console
+┊   ┊120┊      });
+┊   ┊121┊  }
+┊   ┊122┊
+┊   ┊123┊  keyExtractor = item => item.id;
+┊   ┊124┊
+┊   ┊125┊  renderItem = ({ item: user }) => (
+┊   ┊126┊    <View style={styles.user}>
+┊   ┊127┊      <Image
+┊   ┊128┊        style={styles.avatar}
+┊   ┊129┊        source={{ uri: 'https://facebook.github.io/react/img/logo_og.png' }}
+┊   ┊130┊      />
+┊   ┊131┊      <Text style={styles.username}>{user.username}</Text>
+┊   ┊132┊    </View>
+┊   ┊133┊  )
+┊   ┊134┊
+┊   ┊135┊  render() {
+┊   ┊136┊    const { group, loading } = this.props;
+┊   ┊137┊
+┊   ┊138┊    // render loading placeholder while we fetch messages
+┊   ┊139┊    if (!group || loading) {
+┊   ┊140┊      return (
+┊   ┊141┊        <View style={[styles.loading, styles.container]}>
+┊   ┊142┊          <ActivityIndicator />
+┊   ┊143┊        </View>
+┊   ┊144┊      );
+┊   ┊145┊    }
+┊   ┊146┊
+┊   ┊147┊    return (
+┊   ┊148┊      <View style={styles.container}>
+┊   ┊149┊        <FlatList
+┊   ┊150┊          data={group.users}
+┊   ┊151┊          keyExtractor={this.keyExtractor}
+┊   ┊152┊          renderItem={this.renderItem}
+┊   ┊153┊          ListHeaderComponent={() => (
+┊   ┊154┊            <View>
+┊   ┊155┊              <View style={styles.detailsContainer}>
+┊   ┊156┊                <TouchableOpacity style={styles.groupImageContainer} onPress={this.pickGroupImage}>
+┊   ┊157┊                  <Image
+┊   ┊158┊                    style={styles.groupImage}
+┊   ┊159┊                    source={{ uri: 'https://facebook.github.io/react/img/logo_og.png' }}
+┊   ┊160┊                  />
+┊   ┊161┊                  <Text>edit</Text>
+┊   ┊162┊                </TouchableOpacity>
+┊   ┊163┊                <View style={styles.groupNameBorder}>
+┊   ┊164┊                  <Text style={styles.groupName}>{group.name}</Text>
+┊   ┊165┊                </View>
+┊   ┊166┊              </View>
+┊   ┊167┊              <Text style={styles.participants}>
+┊   ┊168┊                {`participants: ${group.users.length}`.toUpperCase()}
+┊   ┊169┊              </Text>
+┊   ┊170┊            </View>
+┊   ┊171┊          )}
+┊   ┊172┊          ListFooterComponent={() => (
+┊   ┊173┊            <View>
+┊   ┊174┊              <Button title={'Leave Group'} onPress={this.leaveGroup} />
+┊   ┊175┊              <Button title={'Delete Group'} onPress={this.deleteGroup} />
+┊   ┊176┊            </View>
+┊   ┊177┊          )}
+┊   ┊178┊        />
+┊   ┊179┊      </View>
+┊   ┊180┊    );
+┊   ┊181┊  }
+┊   ┊182┊}
+┊   ┊183┊
+┊   ┊184┊GroupDetails.propTypes = {
+┊   ┊185┊  loading: PropTypes.bool,
+┊   ┊186┊  group: PropTypes.shape({
+┊   ┊187┊    id: PropTypes.number,
+┊   ┊188┊    name: PropTypes.string,
+┊   ┊189┊    users: PropTypes.arrayOf(PropTypes.shape({
+┊   ┊190┊      id: PropTypes.number,
+┊   ┊191┊      username: PropTypes.string,
+┊   ┊192┊    })),
+┊   ┊193┊  }),
+┊   ┊194┊  navigation: PropTypes.shape({
+┊   ┊195┊    dispatch: PropTypes.func,
+┊   ┊196┊    state: PropTypes.shape({
+┊   ┊197┊      params: PropTypes.shape({
+┊   ┊198┊        title: PropTypes.string,
+┊   ┊199┊        id: PropTypes.number,
+┊   ┊200┊      }),
+┊   ┊201┊    }),
+┊   ┊202┊  }),
+┊   ┊203┊  deleteGroup: PropTypes.func.isRequired,
+┊   ┊204┊  leaveGroup: PropTypes.func.isRequired,
+┊   ┊205┊};
+┊   ┊206┊
+┊   ┊207┊const groupQuery = graphql(GROUP_QUERY, {
+┊   ┊208┊  options: ownProps => ({ variables: { groupId: ownProps.navigation.state.params.id } }),
+┊   ┊209┊  props: ({ data: { loading, group } }) => ({
+┊   ┊210┊    loading,
+┊   ┊211┊    group,
+┊   ┊212┊  }),
+┊   ┊213┊});
+┊   ┊214┊
+┊   ┊215┊const deleteGroupMutation = graphql(DELETE_GROUP_MUTATION, {
+┊   ┊216┊  props: ({ ownProps, mutate }) => ({
+┊   ┊217┊    deleteGroup: id =>
+┊   ┊218┊      mutate({
+┊   ┊219┊        variables: { id },
+┊   ┊220┊        update: (store, { data: { deleteGroup } }) => {
+┊   ┊221┊          // Read the data from our cache for this query.
+┊   ┊222┊          const data = store.readQuery({ query: USER_QUERY, variables: { id: 1 } }); // fake for now
+┊   ┊223┊
+┊   ┊224┊          // Add our message from the mutation to the end.
+┊   ┊225┊          data.user.groups = data.user.groups.filter(g => deleteGroup.id !== g.id);
+┊   ┊226┊
+┊   ┊227┊          // Write our data back to the cache.
+┊   ┊228┊          store.writeQuery({
+┊   ┊229┊            query: USER_QUERY,
+┊   ┊230┊            variables: { id: 1 }, // fake for now
+┊   ┊231┊            data,
+┊   ┊232┊          });
+┊   ┊233┊        },
+┊   ┊234┊      }),
+┊   ┊235┊  }),
+┊   ┊236┊});
+┊   ┊237┊
+┊   ┊238┊const leaveGroupMutation = graphql(LEAVE_GROUP_MUTATION, {
+┊   ┊239┊  props: ({ ownProps, mutate }) => ({
+┊   ┊240┊    leaveGroup: ({ id, userId }) =>
+┊   ┊241┊      mutate({
+┊   ┊242┊        variables: { id, userId },
+┊   ┊243┊        update: (store, { data: { leaveGroup } }) => {
+┊   ┊244┊          // Read the data from our cache for this query.
+┊   ┊245┊          const data = store.readQuery({ query: USER_QUERY, variables: { id: 1 } }); // fake for now
+┊   ┊246┊
+┊   ┊247┊          // Add our message from the mutation to the end.
+┊   ┊248┊          data.user.groups = data.user.groups.filter(g => leaveGroup.id !== g.id);
+┊   ┊249┊
+┊   ┊250┊          // Write our data back to the cache.
+┊   ┊251┊          store.writeQuery({
+┊   ┊252┊            query: USER_QUERY,
+┊   ┊253┊            variables: { id: 1 }, // fake for now
+┊   ┊254┊            data,
+┊   ┊255┊          });
+┊   ┊256┊        },
+┊   ┊257┊      }),
+┊   ┊258┊  }),
+┊   ┊259┊});
+┊   ┊260┊
+┊   ┊261┊export default compose(
+┊   ┊262┊  groupQuery,
+┊   ┊263┊  deleteGroupMutation,
+┊   ┊264┊  leaveGroupMutation,
+┊   ┊265┊)(GroupDetails);
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
```diff
@@ -3,6 +3,7 @@
 ┊3┊3┊import {
 ┊4┊4┊  FlatList,
 ┊5┊5┊  ActivityIndicator,
+┊ ┊6┊  Button,
 ┊6┊7┊  StyleSheet,
 ┊7┊8┊  Text,
 ┊8┊9┊  TouchableHighlight,
```
```diff
@@ -35,8 +36,27 @@
 ┊35┊36┊    fontWeight: 'bold',
 ┊36┊37┊    flex: 0.7,
 ┊37┊38┊  },
+┊  ┊39┊  header: {
+┊  ┊40┊    alignItems: 'flex-end',
+┊  ┊41┊    padding: 6,
+┊  ┊42┊    borderColor: '#eee',
+┊  ┊43┊    borderBottomWidth: 1,
+┊  ┊44┊  },
+┊  ┊45┊  warning: {
+┊  ┊46┊    textAlign: 'center',
+┊  ┊47┊    padding: 12,
+┊  ┊48┊  },
 ┊38┊49┊});
 ┊39┊50┊
+┊  ┊51┊const Header = ({ onPress }) => (
+┊  ┊52┊  <View style={styles.header}>
+┊  ┊53┊    <Button title={'New Group'} onPress={onPress} />
+┊  ┊54┊  </View>
+┊  ┊55┊);
+┊  ┊56┊Header.propTypes = {
+┊  ┊57┊  onPress: PropTypes.func.isRequired,
+┊  ┊58┊};
+┊  ┊59┊
 ┊40┊60┊class Group extends Component {
 ┊41┊61┊  constructor(props) {
 ┊42┊62┊    super(props);
```
```diff
@@ -75,6 +95,7 @@
 ┊ 75┊ 95┊  constructor(props) {
 ┊ 76┊ 96┊    super(props);
 ┊ 77┊ 97┊    this.goToMessages = this.goToMessages.bind(this);
+┊   ┊ 98┊    this.goToNewGroup = this.goToNewGroup.bind(this);
 ┊ 78┊ 99┊  }
 ┊ 79┊100┊
 ┊ 80┊101┊  keyExtractor = item => item.id;
```
```diff
@@ -84,6 +105,11 @@
 ┊ 84┊105┊    navigate('Messages', { groupId: group.id, title: group.name });
 ┊ 85┊106┊  }
 ┊ 86┊107┊
+┊   ┊108┊  goToNewGroup() {
+┊   ┊109┊    const { navigate } = this.props.navigation;
+┊   ┊110┊    navigate('NewGroup');
+┊   ┊111┊  }
+┊   ┊112┊
 ┊ 87┊113┊  renderItem = ({ item }) => <Group group={item} goToMessages={this.goToMessages} />;
 ┊ 88┊114┊
 ┊ 89┊115┊  render() {
```
```diff
@@ -98,6 +124,15 @@
 ┊ 98┊124┊      );
 ┊ 99┊125┊    }
 ┊100┊126┊
+┊   ┊127┊    if (user && !user.groups.length) {
+┊   ┊128┊      return (
+┊   ┊129┊        <View style={styles.container}>
+┊   ┊130┊          <Header onPress={this.goToNewGroup} />
+┊   ┊131┊          <Text style={styles.warning}>{'You do not have any groups.'}</Text>
+┊   ┊132┊        </View>
+┊   ┊133┊      );
+┊   ┊134┊    }
+┊   ┊135┊
 ┊101┊136┊    // render list of groups for user
 ┊102┊137┊    return (
 ┊103┊138┊      <View style={styles.container}>
```
```diff
@@ -105,6 +140,7 @@
 ┊105┊140┊          data={user.groups}
 ┊106┊141┊          keyExtractor={this.keyExtractor}
 ┊107┊142┊          renderItem={this.renderItem}
+┊   ┊143┊          ListHeaderComponent={() => <Header onPress={this.goToNewGroup} />}
 ┊108┊144┊        />
 ┊109┊145┊      </View>
 ┊110┊146┊    );
```

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
```diff
@@ -1,8 +1,11 @@
 ┊ 1┊ 1┊import {
 ┊ 2┊ 2┊  ActivityIndicator,
 ┊ 3┊ 3┊  FlatList,
+┊  ┊ 4┊  Image,
 ┊ 4┊ 5┊  KeyboardAvoidingView,
 ┊ 5┊ 6┊  StyleSheet,
+┊  ┊ 7┊  Text,
+┊  ┊ 8┊  TouchableOpacity,
 ┊ 6┊ 9┊  View,
 ┊ 7┊10┊} from 'react-native';
 ┊ 8┊11┊import PropTypes from 'prop-types';
```
```diff
@@ -25,13 +28,48 @@
 ┊25┊28┊  loading: {
 ┊26┊29┊    justifyContent: 'center',
 ┊27┊30┊  },
+┊  ┊31┊  titleWrapper: {
+┊  ┊32┊    alignItems: 'center',
+┊  ┊33┊    position: 'absolute',
+┊  ┊34┊    left: 0,
+┊  ┊35┊    right: 0,
+┊  ┊36┊  },
+┊  ┊37┊  title: {
+┊  ┊38┊    flexDirection: 'row',
+┊  ┊39┊    alignItems: 'center',
+┊  ┊40┊  },
+┊  ┊41┊  titleImage: {
+┊  ┊42┊    marginRight: 6,
+┊  ┊43┊    width: 32,
+┊  ┊44┊    height: 32,
+┊  ┊45┊    borderRadius: 16,
+┊  ┊46┊  },
 ┊28┊47┊});
 ┊29┊48┊
 ┊30┊49┊class Messages extends Component {
 ┊31┊50┊  static navigationOptions = ({ navigation }) => {
-┊32┊  ┊    const { state } = navigation;
-┊33┊  ┊    return {
+┊  ┊51┊    const { state, navigate } = navigation;
+┊  ┊52┊
+┊  ┊53┊    const goToGroupDetails = navigate.bind(this, 'GroupDetails', {
+┊  ┊54┊      id: state.params.groupId,
 ┊34┊55┊      title: state.params.title,
+┊  ┊56┊    });
+┊  ┊57┊
+┊  ┊58┊    return {
+┊  ┊59┊      headerTitle: (
+┊  ┊60┊        <TouchableOpacity
+┊  ┊61┊          style={styles.titleWrapper}
+┊  ┊62┊          onPress={goToGroupDetails}
+┊  ┊63┊        >
+┊  ┊64┊          <View style={styles.title}>
+┊  ┊65┊            <Image
+┊  ┊66┊              style={styles.titleImage}
+┊  ┊67┊              source={{ uri: 'https://facebook.github.io/react/img/logo_og.png' }}
+┊  ┊68┊            />
+┊  ┊69┊            <Text>{state.params.title}</Text>
+┊  ┊70┊          </View>
+┊  ┊71┊        </TouchableOpacity>
+┊  ┊72┊      ),
 ┊35┊73┊    };
 ┊36┊74┊  };
 ┊37┊75┊
```
```diff
@@ -125,6 +163,7 @@
 ┊125┊163┊Messages.propTypes = {
 ┊126┊164┊  createMessage: PropTypes.func,
 ┊127┊165┊  navigation: PropTypes.shape({
+┊   ┊166┊    navigate: PropTypes.func,
 ┊128┊167┊    state: PropTypes.shape({
 ┊129┊168┊      params: PropTypes.shape({
 ┊130┊169┊        groupId: PropTypes.number,
```

##### Added client&#x2F;src&#x2F;screens&#x2F;new-group.screen.js
```diff
@@ -0,0 +1,320 @@
+┊   ┊  1┊import { _ } from 'lodash';
+┊   ┊  2┊import React, { Component } from 'react';
+┊   ┊  3┊import PropTypes from 'prop-types';
+┊   ┊  4┊import {
+┊   ┊  5┊  ActivityIndicator,
+┊   ┊  6┊  Button,
+┊   ┊  7┊  Image,
+┊   ┊  8┊  StyleSheet,
+┊   ┊  9┊  Text,
+┊   ┊ 10┊  View,
+┊   ┊ 11┊} from 'react-native';
+┊   ┊ 12┊import { graphql, compose } from 'react-apollo';
+┊   ┊ 13┊import AlphabetListView from 'react-native-alphabetlistview';
+┊   ┊ 14┊import update from 'immutability-helper';
+┊   ┊ 15┊import Icon from 'react-native-vector-icons/FontAwesome';
+┊   ┊ 16┊
+┊   ┊ 17┊import SelectedUserList from '../components/selected-user-list.component';
+┊   ┊ 18┊import USER_QUERY from '../graphql/user.query';
+┊   ┊ 19┊
+┊   ┊ 20┊// eslint-disable-next-line
+┊   ┊ 21┊const sortObject = o => Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
+┊   ┊ 22┊
+┊   ┊ 23┊const styles = StyleSheet.create({
+┊   ┊ 24┊  container: {
+┊   ┊ 25┊    flex: 1,
+┊   ┊ 26┊    backgroundColor: 'white',
+┊   ┊ 27┊  },
+┊   ┊ 28┊  cellContainer: {
+┊   ┊ 29┊    alignItems: 'center',
+┊   ┊ 30┊    flex: 1,
+┊   ┊ 31┊    flexDirection: 'row',
+┊   ┊ 32┊    flexWrap: 'wrap',
+┊   ┊ 33┊    paddingHorizontal: 12,
+┊   ┊ 34┊    paddingVertical: 6,
+┊   ┊ 35┊  },
+┊   ┊ 36┊  cellImage: {
+┊   ┊ 37┊    width: 32,
+┊   ┊ 38┊    height: 32,
+┊   ┊ 39┊    borderRadius: 16,
+┊   ┊ 40┊  },
+┊   ┊ 41┊  cellLabel: {
+┊   ┊ 42┊    flex: 1,
+┊   ┊ 43┊    fontSize: 16,
+┊   ┊ 44┊    paddingHorizontal: 12,
+┊   ┊ 45┊    paddingVertical: 8,
+┊   ┊ 46┊  },
+┊   ┊ 47┊  selected: {
+┊   ┊ 48┊    flexDirection: 'row',
+┊   ┊ 49┊  },
+┊   ┊ 50┊  loading: {
+┊   ┊ 51┊    justifyContent: 'center',
+┊   ┊ 52┊    flex: 1,
+┊   ┊ 53┊  },
+┊   ┊ 54┊  navIcon: {
+┊   ┊ 55┊    color: 'blue',
+┊   ┊ 56┊    fontSize: 18,
+┊   ┊ 57┊    paddingTop: 2,
+┊   ┊ 58┊  },
+┊   ┊ 59┊  checkButtonContainer: {
+┊   ┊ 60┊    paddingRight: 12,
+┊   ┊ 61┊    paddingVertical: 6,
+┊   ┊ 62┊  },
+┊   ┊ 63┊  checkButton: {
+┊   ┊ 64┊    borderWidth: 1,
+┊   ┊ 65┊    borderColor: '#dbdbdb',
+┊   ┊ 66┊    padding: 4,
+┊   ┊ 67┊    height: 24,
+┊   ┊ 68┊    width: 24,
+┊   ┊ 69┊  },
+┊   ┊ 70┊  checkButtonIcon: {
+┊   ┊ 71┊    marginRight: -4, // default is 12
+┊   ┊ 72┊  },
+┊   ┊ 73┊});
+┊   ┊ 74┊
+┊   ┊ 75┊const SectionHeader = ({ title }) => {
+┊   ┊ 76┊  // inline styles used for brevity, use a stylesheet when possible
+┊   ┊ 77┊  const textStyle = {
+┊   ┊ 78┊    textAlign: 'center',
+┊   ┊ 79┊    color: '#fff',
+┊   ┊ 80┊    fontWeight: '700',
+┊   ┊ 81┊    fontSize: 16,
+┊   ┊ 82┊  };
+┊   ┊ 83┊
+┊   ┊ 84┊  const viewStyle = {
+┊   ┊ 85┊    backgroundColor: '#ccc',
+┊   ┊ 86┊  };
+┊   ┊ 87┊  return (
+┊   ┊ 88┊    <View style={viewStyle}>
+┊   ┊ 89┊      <Text style={textStyle}>{title}</Text>
+┊   ┊ 90┊    </View>
+┊   ┊ 91┊  );
+┊   ┊ 92┊};
+┊   ┊ 93┊SectionHeader.propTypes = {
+┊   ┊ 94┊  title: PropTypes.string,
+┊   ┊ 95┊};
+┊   ┊ 96┊
+┊   ┊ 97┊const SectionItem = ({ title }) => (
+┊   ┊ 98┊  <Text style={{ color: 'blue' }}>{title}</Text>
+┊   ┊ 99┊);
+┊   ┊100┊SectionItem.propTypes = {
+┊   ┊101┊  title: PropTypes.string,
+┊   ┊102┊};
+┊   ┊103┊
+┊   ┊104┊class Cell extends Component {
+┊   ┊105┊  constructor(props) {
+┊   ┊106┊    super(props);
+┊   ┊107┊    this.toggle = this.toggle.bind(this);
+┊   ┊108┊    this.state = {
+┊   ┊109┊      isSelected: props.isSelected(props.item),
+┊   ┊110┊    };
+┊   ┊111┊  }
+┊   ┊112┊
+┊   ┊113┊  componentWillReceiveProps(nextProps) {
+┊   ┊114┊    this.setState({
+┊   ┊115┊      isSelected: nextProps.isSelected(nextProps.item),
+┊   ┊116┊    });
+┊   ┊117┊  }
+┊   ┊118┊
+┊   ┊119┊  toggle() {
+┊   ┊120┊    this.props.toggle(this.props.item);
+┊   ┊121┊  }
+┊   ┊122┊
+┊   ┊123┊  render() {
+┊   ┊124┊    return (
+┊   ┊125┊      <View style={styles.cellContainer}>
+┊   ┊126┊        <Image
+┊   ┊127┊          style={styles.cellImage}
+┊   ┊128┊          source={{ uri: 'https://facebook.github.io/react/img/logo_og.png' }}
+┊   ┊129┊        />
+┊   ┊130┊        <Text style={styles.cellLabel}>{this.props.item.username}</Text>
+┊   ┊131┊        <View style={styles.checkButtonContainer}>
+┊   ┊132┊          <Icon.Button
+┊   ┊133┊            backgroundColor={this.state.isSelected ? 'blue' : 'white'}
+┊   ┊134┊            borderRadius={12}
+┊   ┊135┊            color={'white'}
+┊   ┊136┊            iconStyle={styles.checkButtonIcon}
+┊   ┊137┊            name={'check'}
+┊   ┊138┊            onPress={this.toggle}
+┊   ┊139┊            size={16}
+┊   ┊140┊            style={styles.checkButton}
+┊   ┊141┊          />
+┊   ┊142┊        </View>
+┊   ┊143┊      </View>
+┊   ┊144┊    );
+┊   ┊145┊  }
+┊   ┊146┊}
+┊   ┊147┊Cell.propTypes = {
+┊   ┊148┊  isSelected: PropTypes.func,
+┊   ┊149┊  item: PropTypes.shape({
+┊   ┊150┊    username: PropTypes.string.isRequired,
+┊   ┊151┊  }).isRequired,
+┊   ┊152┊  toggle: PropTypes.func.isRequired,
+┊   ┊153┊};
+┊   ┊154┊
+┊   ┊155┊class NewGroup extends Component {
+┊   ┊156┊  static navigationOptions = ({ navigation }) => {
+┊   ┊157┊    const { state } = navigation;
+┊   ┊158┊    const isReady = state.params && state.params.mode === 'ready';
+┊   ┊159┊    return {
+┊   ┊160┊      title: 'New Group',
+┊   ┊161┊      headerRight: (
+┊   ┊162┊        isReady ? <Button
+┊   ┊163┊          title="Next"
+┊   ┊164┊          onPress={state.params.finalizeGroup}
+┊   ┊165┊        /> : undefined
+┊   ┊166┊      ),
+┊   ┊167┊    };
+┊   ┊168┊  };
+┊   ┊169┊
+┊   ┊170┊  constructor(props) {
+┊   ┊171┊    super(props);
+┊   ┊172┊
+┊   ┊173┊    let selected = [];
+┊   ┊174┊    if (this.props.navigation.state.params) {
+┊   ┊175┊      selected = this.props.navigation.state.params.selected;
+┊   ┊176┊    }
+┊   ┊177┊
+┊   ┊178┊    this.state = {
+┊   ┊179┊      selected: selected || [],
+┊   ┊180┊      friends: props.user ?
+┊   ┊181┊        _.groupBy(props.user.friends, friend => friend.username.charAt(0).toUpperCase()) : [],
+┊   ┊182┊    };
+┊   ┊183┊
+┊   ┊184┊    this.finalizeGroup = this.finalizeGroup.bind(this);
+┊   ┊185┊    this.isSelected = this.isSelected.bind(this);
+┊   ┊186┊    this.toggle = this.toggle.bind(this);
+┊   ┊187┊  }
+┊   ┊188┊
+┊   ┊189┊  componentDidMount() {
+┊   ┊190┊    this.refreshNavigation(this.state.selected);
+┊   ┊191┊  }
+┊   ┊192┊
+┊   ┊193┊  componentWillReceiveProps(nextProps) {
+┊   ┊194┊    const state = {};
+┊   ┊195┊    if (nextProps.user && nextProps.user.friends && nextProps.user !== this.props.user) {
+┊   ┊196┊      state.friends = sortObject(
+┊   ┊197┊        _.groupBy(nextProps.user.friends, friend => friend.username.charAt(0).toUpperCase()),
+┊   ┊198┊      );
+┊   ┊199┊    }
+┊   ┊200┊
+┊   ┊201┊    if (nextProps.selected) {
+┊   ┊202┊      Object.assign(state, {
+┊   ┊203┊        selected: nextProps.selected,
+┊   ┊204┊      });
+┊   ┊205┊    }
+┊   ┊206┊
+┊   ┊207┊    this.setState(state);
+┊   ┊208┊  }
+┊   ┊209┊
+┊   ┊210┊  componentWillUpdate(nextProps, nextState) {
+┊   ┊211┊    if (!!this.state.selected.length !== !!nextState.selected.length) {
+┊   ┊212┊      this.refreshNavigation(nextState.selected);
+┊   ┊213┊    }
+┊   ┊214┊  }
+┊   ┊215┊
+┊   ┊216┊  refreshNavigation(selected) {
+┊   ┊217┊    const { navigation } = this.props;
+┊   ┊218┊    navigation.setParams({
+┊   ┊219┊      mode: selected && selected.length ? 'ready' : undefined,
+┊   ┊220┊      finalizeGroup: this.finalizeGroup,
+┊   ┊221┊    });
+┊   ┊222┊  }
+┊   ┊223┊
+┊   ┊224┊  finalizeGroup() {
+┊   ┊225┊    const { navigate } = this.props.navigation;
+┊   ┊226┊    navigate('FinalizeGroup', {
+┊   ┊227┊      selected: this.state.selected,
+┊   ┊228┊      friendCount: this.props.user.friends.length,
+┊   ┊229┊      userId: this.props.user.id,
+┊   ┊230┊    });
+┊   ┊231┊  }
+┊   ┊232┊
+┊   ┊233┊  isSelected(user) {
+┊   ┊234┊    return ~this.state.selected.indexOf(user);
+┊   ┊235┊  }
+┊   ┊236┊
+┊   ┊237┊  toggle(user) {
+┊   ┊238┊    const index = this.state.selected.indexOf(user);
+┊   ┊239┊    if (~index) {
+┊   ┊240┊      const selected = update(this.state.selected, { $splice: [[index, 1]] });
+┊   ┊241┊
+┊   ┊242┊      return this.setState({
+┊   ┊243┊        selected,
+┊   ┊244┊      });
+┊   ┊245┊    }
+┊   ┊246┊
+┊   ┊247┊    const selected = [...this.state.selected, user];
+┊   ┊248┊
+┊   ┊249┊    return this.setState({
+┊   ┊250┊      selected,
+┊   ┊251┊    });
+┊   ┊252┊  }
+┊   ┊253┊
+┊   ┊254┊  render() {
+┊   ┊255┊    const { user, loading } = this.props;
+┊   ┊256┊
+┊   ┊257┊    // render loading placeholder while we fetch messages
+┊   ┊258┊    if (loading || !user) {
+┊   ┊259┊      return (
+┊   ┊260┊        <View style={[styles.loading, styles.container]}>
+┊   ┊261┊          <ActivityIndicator />
+┊   ┊262┊        </View>
+┊   ┊263┊      );
+┊   ┊264┊    }
+┊   ┊265┊
+┊   ┊266┊    return (
+┊   ┊267┊      <View style={styles.container}>
+┊   ┊268┊        {this.state.selected.length ? <View style={styles.selected}>
+┊   ┊269┊          <SelectedUserList
+┊   ┊270┊            data={this.state.selected}
+┊   ┊271┊            remove={this.toggle}
+┊   ┊272┊          />
+┊   ┊273┊        </View> : undefined}
+┊   ┊274┊        {_.keys(this.state.friends).length ? <AlphabetListView
+┊   ┊275┊          style={{ flex: 1 }}
+┊   ┊276┊          data={this.state.friends}
+┊   ┊277┊          cell={Cell}
+┊   ┊278┊          cellHeight={30}
+┊   ┊279┊          cellProps={{
+┊   ┊280┊            isSelected: this.isSelected,
+┊   ┊281┊            toggle: this.toggle,
+┊   ┊282┊          }}
+┊   ┊283┊          sectionListItem={SectionItem}
+┊   ┊284┊          sectionHeader={SectionHeader}
+┊   ┊285┊          sectionHeaderHeight={22.5}
+┊   ┊286┊        /> : undefined}
+┊   ┊287┊      </View>
+┊   ┊288┊    );
+┊   ┊289┊  }
+┊   ┊290┊}
+┊   ┊291┊
+┊   ┊292┊NewGroup.propTypes = {
+┊   ┊293┊  loading: PropTypes.bool.isRequired,
+┊   ┊294┊  navigation: PropTypes.shape({
+┊   ┊295┊    navigate: PropTypes.func,
+┊   ┊296┊    setParams: PropTypes.func,
+┊   ┊297┊    state: PropTypes.shape({
+┊   ┊298┊      params: PropTypes.object,
+┊   ┊299┊    }),
+┊   ┊300┊  }),
+┊   ┊301┊  user: PropTypes.shape({
+┊   ┊302┊    id: PropTypes.number,
+┊   ┊303┊    friends: PropTypes.arrayOf(PropTypes.shape({
+┊   ┊304┊      id: PropTypes.number,
+┊   ┊305┊      username: PropTypes.string,
+┊   ┊306┊    })),
+┊   ┊307┊  }),
+┊   ┊308┊  selected: PropTypes.arrayOf(PropTypes.object),
+┊   ┊309┊};
+┊   ┊310┊
+┊   ┊311┊const userQuery = graphql(USER_QUERY, {
+┊   ┊312┊  options: (ownProps) => ({ variables: { id: 1 } }), // fake for now
+┊   ┊313┊  props: ({ data: { loading, user } }) => ({
+┊   ┊314┊    loading, user,
+┊   ┊315┊  }),
+┊   ┊316┊});
+┊   ┊317┊
+┊   ┊318┊export default compose(
+┊   ┊319┊  userQuery,
+┊   ┊320┊)(NewGroup);
```

##### Changed server&#x2F;data&#x2F;resolvers.js
```diff
@@ -26,6 +26,44 @@
 ┊26┊26┊        groupId,
 ┊27┊27┊      });
 ┊28┊28┊    },
+┊  ┊29┊    createGroup(_, { name, userIds, userId }) {
+┊  ┊30┊      return User.findOne({ where: { id: userId } })
+┊  ┊31┊        .then(user => user.getFriends({ where: { id: { $in: userIds } } })
+┊  ┊32┊          .then(friends => Group.create({
+┊  ┊33┊            name,
+┊  ┊34┊            users: [user, ...friends],
+┊  ┊35┊          })
+┊  ┊36┊            .then(group => group.addUsers([user, ...friends])
+┊  ┊37┊              .then(() => group),
+┊  ┊38┊            ),
+┊  ┊39┊          ),
+┊  ┊40┊        );
+┊  ┊41┊    },
+┊  ┊42┊    deleteGroup(_, { id }) {
+┊  ┊43┊      return Group.find({ where: id })
+┊  ┊44┊        .then(group => group.getUsers()
+┊  ┊45┊          .then(users => group.removeUsers(users))
+┊  ┊46┊          .then(() => Message.destroy({ where: { groupId: group.id } }))
+┊  ┊47┊          .then(() => group.destroy()),
+┊  ┊48┊        );
+┊  ┊49┊    },
+┊  ┊50┊    leaveGroup(_, { id, userId }) {
+┊  ┊51┊      return Group.findOne({ where: { id } })
+┊  ┊52┊        .then(group => group.removeUser(userId)
+┊  ┊53┊          .then(() => group.getUsers())
+┊  ┊54┊          .then((users) => {
+┊  ┊55┊            // if the last user is leaving, remove the group
+┊  ┊56┊            if (!users.length) {
+┊  ┊57┊              group.destroy();
+┊  ┊58┊            }
+┊  ┊59┊            return { id };
+┊  ┊60┊          }),
+┊  ┊61┊        );
+┊  ┊62┊    },
+┊  ┊63┊    updateGroup(_, { id, name }) {
+┊  ┊64┊      return Group.findOne({ where: { id } })
+┊  ┊65┊        .then(group => group.update({ name }));
+┊  ┊66┊    },
 ┊29┊67┊  },
 ┊30┊68┊  Group: {
 ┊31┊69┊    users(group) {
```

##### Changed server&#x2F;data&#x2F;schema.js
```diff
@@ -47,6 +47,10 @@
 ┊47┊47┊    createMessage(
 ┊48┊48┊      text: String!, userId: Int!, groupId: Int!
 ┊49┊49┊    ): Message
+┊  ┊50┊    createGroup(name: String!, userIds: [Int], userId: Int!): Group
+┊  ┊51┊    deleteGroup(id: Int!): Group
+┊  ┊52┊    leaveGroup(id: Int!, userId: Int!): Group # let user leave group
+┊  ┊53┊    updateGroup(id: Int!, name: String): Group
 ┊50┊54┊  }
 ┊51┊55┊  
 ┊52┊56┊  schema {
```

[}]: #
[{]: <helper> (navStep)

| [< Previous Step](step3.md) | [Next Step >](step5.md) |
|:--------------------------------|--------------------------------:|

[}]: #

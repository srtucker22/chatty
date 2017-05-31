# Step 4: GraphQL Mutations

[//]: # (head-end)


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

```graphql
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

#### [Step 4.1: Add Mutations to Schema](https://github.com/srtucker22/chatty/commit/e709e8a)

##### Changed server&#x2F;data&#x2F;schema.js
<pre>

...

    group(id: Int!): Group
  }

<b>  type Mutation {</b>
<b>    # send a message to a group</b>
<b>    createMessage(</b>
<b>      text: String!, userId: Int!, groupId: Int!</b>
<b>    ): Message</b>
<b>  }</b>
<b>  </b>
  schema {
    query: Query
<b>    mutation: Mutation</b>
  }
&#x60;;
</pre>

[}]: #

We also need to modify our resolvers to handle our new mutation. We’ll modify `server/data/resolvers.js` as follows:

[{]: <helper> (diffStep 4.2)

#### [Step 4.2: Add Mutations to Resolvers](https://github.com/srtucker22/chatty/commit/19dfa84)

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

      return User.findOne({ where: args });
    },
  },
<b>  Mutation: {</b>
<b>    createMessage(_, { text, userId, groupId }) {</b>
<b>      return Message.create({</b>
<b>        userId,</b>
<b>        text,</b>
<b>        groupId,</b>
<b>      });</b>
<b>    },</b>
<b>  },</b>
  Group: {
    users(group) {
      return group.getUsers();
</pre>

[}]: #

That’s it! When a client uses `createMessage`, the resolver will use the `Message` model passed by our connector and call `Message.create` with arguments from the mutation. The `Message.create` function returns a Promise that will resolve with the newly created `Message`.

We can easily test our newly minted `createMessage` mutation in GraphQL Playground to make sure everything works: ![Create Message Img](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step4-2.png)

# Designing the Input
Wow, that was way faster than when we added queries! All the heavy lifting we did in the first 3 parts of this series is starting to pay off….

Now that our server allows clients to create messages, we can build that functionality into our React Native client. First, we’ll start by creating a new component `MessageInput` where our users will be able to input their messages.

For this component, let's use **cool icons**. [`react-native-vector-icons`](https://github.com/oblador/react-native-vector-icons) is the goto package for adding icons to React Native. Please follow the instructions in the [`react-native-vector-icons` README](https://github.com/oblador/react-native-vector-icons) before moving onto the next step.

```sh
# make sure you're adding this package in the client folder!!!
cd client

npm i react-native-vector-icons
react-native link
# this is not enough to install icons!!! PLEASE FOLLOW THE INSTRUCTIONS IN THE README TO PROPERLY INSTALL ICONS!
```

After completing the steps in the README to install icons, we can start putting together the `MessageInput` component in a new file `client/src/components/message-input.component.js`:

[{]: <helper> (diffStep 4.3 files="client/src/components/message-input.component.js")

#### [Step 4.3: Create MessageInput](https://github.com/srtucker22/chatty/commit/5607d39)

##### Added client&#x2F;src&#x2F;components&#x2F;message-input.component.js
<pre>

...

<b>import React, { Component } from &#x27;react&#x27;;</b>
<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import {</b>
<b>  StyleSheet,</b>
<b>  TextInput,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b></b>
<b>import Icon from &#x27;react-native-vector-icons/FontAwesome&#x27;;</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    alignSelf: &#x27;flex-end&#x27;,</b>
<b>    backgroundColor: &#x27;#f5f1ee&#x27;,</b>
<b>    borderColor: &#x27;#dbdbdb&#x27;,</b>
<b>    borderTopWidth: 1,</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>  },</b>
<b>  inputContainer: {</b>
<b>    flex: 1,</b>
<b>    paddingHorizontal: 12,</b>
<b>    paddingVertical: 6,</b>
<b>  },</b>
<b>  input: {</b>
<b>    backgroundColor: &#x27;white&#x27;,</b>
<b>    borderColor: &#x27;#dbdbdb&#x27;,</b>
<b>    borderRadius: 15,</b>
<b>    borderWidth: 1,</b>
<b>    color: &#x27;black&#x27;,</b>
<b>    height: 32,</b>
<b>    paddingHorizontal: 8,</b>
<b>  },</b>
<b>  sendButtonContainer: {</b>
<b>    paddingRight: 12,</b>
<b>    paddingVertical: 6,</b>
<b>  },</b>
<b>  sendButton: {</b>
<b>    height: 32,</b>
<b>    width: 32,</b>
<b>  },</b>
<b>  iconStyle: {</b>
<b>    marginRight: 0, // default is 12</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>const sendButton &#x3D; send &#x3D;&gt; (</b>
<b>  &lt;Icon.Button</b>
<b>    backgroundColor&#x3D;{&#x27;blue&#x27;}</b>
<b>    borderRadius&#x3D;{16}</b>
<b>    color&#x3D;{&#x27;white&#x27;}</b>
<b>    iconStyle&#x3D;{styles.iconStyle}</b>
<b>    name&#x3D;&quot;send&quot;</b>
<b>    onPress&#x3D;{send}</b>
<b>    size&#x3D;{16}</b>
<b>    style&#x3D;{styles.sendButton}</b>
<b>  /&gt;</b>
<b>);</b>
<b></b>
<b>class MessageInput extends Component {</b>
<b>  constructor(props) {</b>
<b>    super(props);</b>
<b>    this.state &#x3D; {};</b>
<b>    this.send &#x3D; this.send.bind(this);</b>
<b>  }</b>
<b></b>
<b>  send() {</b>
<b>    this.props.send(this.state.text);</b>
<b>    this.textInput.clear();</b>
<b>    this.textInput.blur();</b>
<b>  }</b>
<b></b>
<b>  render() {</b>
<b>    return (</b>
<b>      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>        &lt;View style&#x3D;{styles.inputContainer}&gt;</b>
<b>          &lt;TextInput</b>
<b>            ref&#x3D;{(ref) &#x3D;&gt; { this.textInput &#x3D; ref; }}</b>
<b>            onChangeText&#x3D;{text &#x3D;&gt; this.setState({ text })}</b>
<b>            style&#x3D;{styles.input}</b>
<b>            placeholder&#x3D;&quot;Type your message here!&quot;</b>
<b>          /&gt;</b>
<b>        &lt;/View&gt;</b>
<b>        &lt;View style&#x3D;{styles.sendButtonContainer}&gt;</b>
<b>          {sendButton(this.send)}</b>
<b>        &lt;/View&gt;</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b></b>
<b>MessageInput.propTypes &#x3D; {</b>
<b>  send: PropTypes.func.isRequired,</b>
<b>};</b>
<b></b>
<b>export default MessageInput;</b>
</pre>

[}]: #

Our `MessageInput` component is a `View` that wraps a controlled `TextInput` and an [`Icon.Button`](https://github.com/oblador/react-native-vector-icons#iconbutton-component). When the button is pressed, `props.send` will be called with the current state of the `TextInput` text and then the `TextInput` will clear. We’ve also added some styling to keep everything looking snazzy.

Let’s add `MessageInput` to the bottom of the `Messages` screen and create a placeholder `send` function:

[{]: <helper> (diffStep 4.4)

#### [Step 4.4: Add MessageInput to Messages](https://github.com/srtucker22/chatty/commit/f3fc095)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

import { graphql, compose } from &#x27;react-apollo&#x27;;

import Message from &#x27;../components/message.component&#x27;;
<b>import MessageInput from &#x27;../components/message-input.component&#x27;;</b>
import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;

const styles &#x3D; StyleSheet.create({
</pre>
<pre>

...

    };

    this.renderItem &#x3D; this.renderItem.bind(this);
<b>    this.send &#x3D; this.send.bind(this);</b>
  }

  componentWillReceiveProps(nextProps) {
</pre>
<pre>

...

    }
  }

<b>  send(text) {</b>
<b>    // TODO: send the message</b>
<b>    console.log(&#x60;sending message: ${text}&#x60;);</b>
<b>  }</b>
<b></b>
  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();

  renderItem &#x3D; ({ item: message }) &#x3D;&gt; (
</pre>
<pre>

...

          renderItem&#x3D;{this.renderItem}
          ListEmptyComponent&#x3D;{&lt;View /&gt;}
        /&gt;
<b>        &lt;MessageInput send&#x3D;{this.send} /&gt;</b>
      &lt;/View&gt;
    );
  }
</pre>

[}]: #

It should look like this: ![Message Input Image](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step4-4.png)

But **don’t be fooled by your simulator!** This UI will break on a phone because of the keyboard: ![Broken Input Image](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step4-4-2.png)

You are not the first person to groan over this issue. For you and the many groaners out there, the wonderful devs at Facebook have your back. [`KeyboardAvoidingView`](https://facebook.github.io/react-native/docs/keyboardavoidingview.html) to the rescue!

[{]: <helper> (diffStep 4.5)

#### [Step 4.5: Add KeyboardAvoidingView](https://github.com/srtucker22/chatty/commit/a3ba308)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

import {
  ActivityIndicator,
  FlatList,
<b>  KeyboardAvoidingView,</b>
  StyleSheet,
  View,
} from &#x27;react-native&#x27;;
</pre>
<pre>

...


    // render list of messages for group
    return (
<b>      &lt;KeyboardAvoidingView</b>
<b>        behavior&#x3D;{&#x27;position&#x27;}</b>
<b>        contentContainerStyle&#x3D;{styles.container}</b>
<b>        keyboardVerticalOffset&#x3D;{64}</b>
<b>        style&#x3D;{styles.container}</b>
<b>      &gt;</b>
        &lt;FlatList
          data&#x3D;{group.messages.slice().reverse()}
          keyExtractor&#x3D;{this.keyExtractor}
</pre>
<pre>

...

          ListEmptyComponent&#x3D;{&lt;View /&gt;}
        /&gt;
        &lt;MessageInput send&#x3D;{this.send} /&gt;
<b>      &lt;/KeyboardAvoidingView&gt;</b>
    );
  }
}
</pre>

[}]: #

![Fixed Input Image](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step4-5.png)

Our layout looks ready. Now let’s make it work!

# Adding GraphQL Mutations on the Client
Let’s start by defining our GraphQL Mutation like we would using GraphQL Playground:

```graphql
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

```graphql
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

#### [Step 4.6: Create MessageFragment](https://github.com/srtucker22/chatty/commit/4b0db4c)

##### Added client&#x2F;src&#x2F;graphql&#x2F;message.fragment.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>const MESSAGE_FRAGMENT &#x3D; gql&#x60;</b>
<b>  fragment MessageFragment on Message {</b>
<b>    id</b>
<b>    to {</b>
<b>      id</b>
<b>    }</b>
<b>    from {</b>
<b>      id</b>
<b>      username</b>
<b>    }</b>
<b>    createdAt</b>
<b>    text</b>
<b>  }</b>
<b>&#x60;;</b>
<b></b>
<b>export default MESSAGE_FRAGMENT;</b>
</pre>

[}]: #

Now we can apply `MESSAGE_FRAGMENT` to `GROUP_QUERY` by changing our code as follows:

[{]: <helper> (diffStep 4.7)

#### [Step 4.7: Add MessageFragment to Group Query](https://github.com/srtucker22/chatty/commit/bc0abef)

##### Changed client&#x2F;src&#x2F;graphql&#x2F;group.query.js
<pre>

...

import gql from &#x27;graphql-tag&#x27;;

<b>import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b></b>
const GROUP_QUERY &#x3D; gql&#x60;
  query group($groupId: Int!) {
    group(id: $groupId) {
</pre>
<pre>

...

        username
      }
      messages {
<b>        ... MessageFragment</b>
      }
    }
  }
<b>  ${MESSAGE_FRAGMENT}</b>
&#x60;;

export default GROUP_QUERY;
</pre>

[}]: #

Let’s also write our `createMessage` mutation using `messageFragment` in a new file `client/src/graphql/create-message.mutation.js`:

[{]: <helper> (diffStep 4.8)

#### [Step 4.8: Create CREATE_MESSAGE_MUTATION](https://github.com/srtucker22/chatty/commit/4bebf01)

##### Added client&#x2F;src&#x2F;graphql&#x2F;create-message.mutation.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>import MESSAGE_FRAGMENT from &#x27;./message.fragment&#x27;;</b>
<b></b>
<b>const CREATE_MESSAGE_MUTATION &#x3D; gql&#x60;</b>
<b>  mutation createMessage($text: String!, $userId: Int!, $groupId: Int!) {</b>
<b>    createMessage(text: $text, userId: $userId, groupId: $groupId) {</b>
<b>      ... MessageFragment</b>
<b>    }</b>
<b>  }</b>
<b>  ${MESSAGE_FRAGMENT}</b>
<b>&#x60;;</b>
<b></b>
<b>export default CREATE_MESSAGE_MUTATION;</b>
</pre>

[}]: #

Now all we have to do is plug our mutation into our `Messages` component using the `graphql` module from `react-apollo`. Before we connect everything, let’s see what a mutation call with the `graphql` module looks like:

```js
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

#### [Step 4.9: Add CREATE_MESSAGE_MUTATION to Messages](https://github.com/srtucker22/chatty/commit/6e834ba)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

import Message from &#x27;../components/message.component&#x27;;
import MessageInput from &#x27;../components/message-input.component&#x27;;
import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;
<b>import CREATE_MESSAGE_MUTATION from &#x27;../graphql/create-message.mutation&#x27;;</b>

const styles &#x3D; StyleSheet.create({
  container: {
</pre>
<pre>

...

  }

  send(text) {
<b>    this.props.createMessage({</b>
<b>      groupId: this.props.navigation.state.params.groupId,</b>
<b>      userId: 1, // faking the user for now</b>
<b>      text,</b>
<b>    });</b>
  }

  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();
</pre>
<pre>

...

}

Messages.propTypes &#x3D; {
<b>  createMessage: PropTypes.func,</b>
<b>  navigation: PropTypes.shape({</b>
<b>    state: PropTypes.shape({</b>
<b>      params: PropTypes.shape({</b>
<b>        groupId: PropTypes.number,</b>
<b>      }),</b>
<b>    }),</b>
<b>  }),</b>
  group: PropTypes.shape({
    messages: PropTypes.array,
    users: PropTypes.array,
</pre>
<pre>

...

  }),
});

<b>const createMessageMutation &#x3D; graphql(CREATE_MESSAGE_MUTATION, {</b>
<b>  props: ({ mutate }) &#x3D;&gt; ({</b>
<b>    createMessage: ({ text, userId, groupId }) &#x3D;&gt;</b>
<b>      mutate({</b>
<b>        variables: { text, userId, groupId },</b>
<b>      }),</b>
<b>  }),</b>
<b>});</b>
<b></b>
export default compose(
  groupQuery,
<b>  createMessageMutation,</b>
)(Messages);
</pre>

[}]: #

By attaching `createMessage` with `compose`, we attach a `createMessage` function to the component’s `props`. We call `props.createMessage` in `send` with the required variables (we’ll keep faking the user for now). When the user presses the send button, this method will get called and the mutation should execute.

Let’s run the app and see what happens: ![Send Fail Gif](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step4-9.gif)

What went wrong? Well technically nothing went wrong. Our mutation successfully executed, but we’re not seeing our message pop up. Why? **Running a mutation doesn’t automatically update our queries with new data!** If we were to refresh the page, we’d actually see our message. This issue only arrises when we are adding or removing data with our mutation.

To overcome this challenge, `react-apollo` lets us declare a property `update` within the argument we pass to mutate. In `update`, we specify which queries should update after the mutation executes and how the data will transform.

Our modified `createMessage` should look like this:

[{]: <helper> (diffStep "4.10")

#### [Step 4.10: Add update to mutation](https://github.com/srtucker22/chatty/commit/535b5bf)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

    createMessage: ({ text, userId, groupId }) &#x3D;&gt;
      mutate({
        variables: { text, userId, groupId },
<b>        update: (store, { data: { createMessage } }) &#x3D;&gt; {</b>
<b>          // Read the data from our cache for this query.</b>
<b>          const groupData &#x3D; store.readQuery({</b>
<b>            query: GROUP_QUERY,</b>
<b>            variables: {</b>
<b>              groupId,</b>
<b>            },</b>
<b>          });</b>
<b></b>
<b>          // Add our message from the mutation to the end.</b>
<b>          groupData.group.messages.unshift(createMessage);</b>
<b></b>
<b>          // Write our data back to the cache.</b>
<b>          store.writeQuery({</b>
<b>            query: GROUP_QUERY,</b>
<b>            variables: {</b>
<b>              groupId,</b>
<b>            },</b>
<b>            data: groupData,</b>
<b>          });</b>
<b>        },</b>
      }),
<b></b>
  }),
});
</pre>

[}]: #

In `update`, we first retrieve the existing data for the query we want to update (`GROUP_QUERY`) along with the specific variables we passed to that query. This data comes to us from our Redux store of Apollo data. We check to see if the new `Message` returned from `createMessage` already exists (in case of race conditions down the line), and then update the previous query result by sticking the new message in front. We then use this modified data object and rewrite the results to the Apollo store with `store.writeQuery`, being sure to pass all the variables associated with our query. This will force `props` to change reference and the component to rerender. ![Fixed Send Gif](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step4-10.gif)

# Optimistic UI
### But wait! There’s more!
`update` will currently only update the query after the mutation succeeds and a response is sent back on the server. But we don’t want to wait till the server returns data  —  we crave instant gratification! If a user with shoddy internet tried to send a message and it didn’t show up right away, they’d probably try and send the message again and again and end up sending the message multiple times… and then they’d yell at customer support!

**Optimistic UI** is our weapon for protecting customer support. We know the shape of the data we expect to receive from the server, so why not fake it until we get a response? `react-apollo` lets us accomplish this by adding an `optimisticResponse` parameter to mutate. In our case it looks like this:

[{]: <helper> (diffStep 4.11)

#### [Step 4.11: Add optimisticResponse to mutation](https://github.com/srtucker22/chatty/commit/76aebed)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

    createMessage: ({ text, userId, groupId }) &#x3D;&gt;
      mutate({
        variables: { text, userId, groupId },
<b>        optimisticResponse: {</b>
<b>          __typename: &#x27;Mutation&#x27;,</b>
<b>          createMessage: {</b>
<b>            __typename: &#x27;Message&#x27;,</b>
<b>            id: -1, // don&#x27;t know id yet, but it doesn&#x27;t matter</b>
<b>            text, // we know what the text will be</b>
<b>            createdAt: new Date().toISOString(), // the time is now!</b>
<b>            from: {</b>
<b>              __typename: &#x27;User&#x27;,</b>
<b>              id: 1, // still faking the user</b>
<b>              username: &#x27;Justyn.Kautzer&#x27;, // still faking the user</b>
<b>            },</b>
<b>            to: {</b>
<b>              __typename: &#x27;Group&#x27;,</b>
<b>              id: groupId,</b>
<b>            },</b>
<b>          },</b>
<b>        },</b>
        update: (store, { data: { createMessage } }) &#x3D;&gt; {
          // Read the data from our cache for this query.
          const groupData &#x3D; store.readQuery({
</pre>

[}]: #

The Object returned from `optimisticResponse` is what the data should look like from our server when the mutation succeeds. We need to specify the `__typename` for all  values in our optimistic response just like our server would. Even though we don’t know all values for all fields, we know enough to populate the ones that will show up in the UI, like the text, user, and message creation time. This will essentially be a placeholder until the server responds.

Let’s also modify our UI a bit so that our `FlatList` scrolls to the bottom when we send a message as soon as we receive new data:

[{]: <helper> (diffStep 4.12)

#### [Step 4.12: Add scrollToEnd to Messages after send](https://github.com/srtucker22/chatty/commit/0c74690)

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

      groupId: this.props.navigation.state.params.groupId,
      userId: 1, // faking the user for now
      text,
<b>    }).then(() &#x3D;&gt; {</b>
<b>      this.flatList.scrollToEnd({ animated: true });</b>
    });
  }

</pre>
<pre>

...

        style&#x3D;{styles.container}
      &gt;
        &lt;FlatList
<b>          ref&#x3D;{(ref) &#x3D;&gt; { this.flatList &#x3D; ref; }}</b>
          data&#x3D;{group.messages.slice().reverse()}
          keyExtractor&#x3D;{this.keyExtractor}
          renderItem&#x3D;{this.renderItem}
</pre>

[}]: #

![Scroll to Bottom Gif](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step4-12.gif)

### 🔥🔥🔥!!!

# **YOUR CHALLENGE**
First, let’s take a break. We’ve definitely earned it.

Now that we’re comfortable using GraphQL Queries and Mutations and some tricky stuff in React Native, we can do most of the things we need to do for most basic applications. In fact, there are a number of Chatty features that we can already implement without knowing much else. This post is already plenty long, but there are features left to be built. So with that said, I like to suggest that you try to complete the following features on your own before we move on:

1. Add GraphQL Mutations on our server for creating, modifying, and deleting `Groups`
2. Add new Screens to our React Native app for creating, modifying, and deleting `Groups`
3. Build GraphQL Queries and Mutations for our new Screens and connect them using `react-apollo`
4. Include `update` for these new mutations where necessary

If you want to see some UI or you want a hint or you don’t wanna write any code, that’s cool too! Below is some code with these features added. ![Groups Gif](https://raw.githubusercontent.com/srtucker22/chatty/master/.tortilla/media/step4-13.gif)

[{]: <helper> (diffStep 4.13)

#### [Step 4.13: Add Group Mutations and Screens](https://github.com/srtucker22/chatty/commit/fdf5660)

##### Changed client&#x2F;package.json
<pre>

...

		&quot;apollo-link-redux&quot;: &quot;^0.2.1&quot;,
		&quot;graphql&quot;: &quot;^0.12.3&quot;,
		&quot;graphql-tag&quot;: &quot;^2.4.2&quot;,
<b>		&quot;immutability-helper&quot;: &quot;^2.6.4&quot;,</b>
		&quot;lodash&quot;: &quot;^4.17.5&quot;,
		&quot;moment&quot;: &quot;^2.20.1&quot;,
		&quot;prop-types&quot;: &quot;^15.6.0&quot;,
</pre>
<pre>

...

		&quot;react&quot;: &quot;16.4.1&quot;,
		&quot;react-apollo&quot;: &quot;^2.0.4&quot;,
		&quot;react-native&quot;: &quot;0.56.0&quot;,
<b>		&quot;react-native-alpha-listview&quot;: &quot;^0.2.1&quot;,</b>
		&quot;react-native-vector-icons&quot;: &quot;^4.6.0&quot;,
		&quot;react-navigation&quot;: &quot;^1.0.3&quot;,
		&quot;react-navigation-redux-helpers&quot;: &quot;^1.1.2&quot;,
</pre>

##### Added client&#x2F;src&#x2F;components&#x2F;selected-user-list.component.js
<pre>

...

<b>import React, { Component } from &#x27;react&#x27;;</b>
<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import {</b>
<b>  FlatList,</b>
<b>  Image,</b>
<b>  StyleSheet,</b>
<b>  Text,</b>
<b>  TouchableOpacity,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b>import Icon from &#x27;react-native-vector-icons/FontAwesome&#x27;;</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  list: {</b>
<b>    paddingVertical: 8,</b>
<b>  },</b>
<b>  itemContainer: {</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>    paddingHorizontal: 12,</b>
<b>  },</b>
<b>  itemIcon: {</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>    backgroundColor: &#x27;#dbdbdb&#x27;,</b>
<b>    borderColor: &#x27;white&#x27;,</b>
<b>    borderRadius: 10,</b>
<b>    borderWidth: 2,</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>    height: 20,</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>    position: &#x27;absolute&#x27;,</b>
<b>    right: -3,</b>
<b>    top: -3,</b>
<b>    width: 20,</b>
<b>  },</b>
<b>  itemImage: {</b>
<b>    borderRadius: 27,</b>
<b>    height: 54,</b>
<b>    width: 54,</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>export class SelectedUserListItem extends Component {</b>
<b>  constructor(props) {</b>
<b>    super(props);</b>
<b></b>
<b>    this.remove &#x3D; this.remove.bind(this);</b>
<b>  }</b>
<b></b>
<b>  remove() {</b>
<b>    this.props.remove(this.props.user);</b>
<b>  }</b>
<b></b>
<b>  render() {</b>
<b>    const { username } &#x3D; this.props.user;</b>
<b></b>
<b>    return (</b>
<b>      &lt;View</b>
<b>        style&#x3D;{styles.itemContainer}</b>
<b>      &gt;</b>
<b>        &lt;View&gt;</b>
<b>          &lt;Image</b>
<b>            style&#x3D;{styles.itemImage}</b>
<b>            source&#x3D;{{ uri: &#x27;https://reactjs.org/logo-og.png&#x27; }}</b>
<b>          /&gt;</b>
<b>          &lt;TouchableOpacity onPress&#x3D;{this.remove} style&#x3D;{styles.itemIcon}&gt;</b>
<b>            &lt;Icon</b>
<b>              color&#x3D;&quot;white&quot;</b>
<b>              name&#x3D;&quot;times&quot;</b>
<b>              size&#x3D;{12}</b>
<b>            /&gt;</b>
<b>          &lt;/TouchableOpacity&gt;</b>
<b>        &lt;/View&gt;</b>
<b>        &lt;Text&gt;{username}&lt;/Text&gt;</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b>SelectedUserListItem.propTypes &#x3D; {</b>
<b>  user: PropTypes.shape({</b>
<b>    id: PropTypes.number,</b>
<b>    username: PropTypes.string,</b>
<b>  }),</b>
<b>  remove: PropTypes.func,</b>
<b>};</b>
<b></b>
<b>class SelectedUserList extends Component {</b>
<b>  constructor(props) {</b>
<b>    super(props);</b>
<b></b>
<b>    this.renderItem &#x3D; this.renderItem.bind(this);</b>
<b>  }</b>
<b></b>
<b>  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();</b>
<b></b>
<b>  renderItem({ item: user }) {</b>
<b>    return (</b>
<b>      &lt;SelectedUserListItem user&#x3D;{user} remove&#x3D;{this.props.remove} /&gt;</b>
<b>    );</b>
<b>  }</b>
<b></b>
<b>  render() {</b>
<b>    return (</b>
<b>      &lt;FlatList</b>
<b>        data&#x3D;{this.props.data}</b>
<b>        keyExtractor&#x3D;{this.keyExtractor}</b>
<b>        renderItem&#x3D;{this.renderItem}</b>
<b>        horizontal</b>
<b>        style&#x3D;{styles.list}</b>
<b>      /&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b>SelectedUserList.propTypes &#x3D; {</b>
<b>  data: PropTypes.arrayOf(PropTypes.object),</b>
<b>  remove: PropTypes.func,</b>
<b>};</b>
<b></b>
<b>export default SelectedUserList;</b>
</pre>

##### Added client&#x2F;src&#x2F;graphql&#x2F;create-group.mutation.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>const CREATE_GROUP_MUTATION &#x3D; gql&#x60;</b>
<b>  mutation createGroup($name: String!, $userIds: [Int!], $userId: Int!) {</b>
<b>    createGroup(name: $name, userIds: $userIds, userId: $userId) {</b>
<b>      id</b>
<b>      name</b>
<b>      users {</b>
<b>        id</b>
<b>      }</b>
<b>    }</b>
<b>  }</b>
<b>&#x60;;</b>
<b></b>
<b>export default CREATE_GROUP_MUTATION;</b>
</pre>

##### Added client&#x2F;src&#x2F;graphql&#x2F;delete-group.mutation.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>const DELETE_GROUP_MUTATION &#x3D; gql&#x60;</b>
<b>  mutation deleteGroup($id: Int!) {</b>
<b>    deleteGroup(id: $id) {</b>
<b>      id</b>
<b>    }</b>
<b>  }</b>
<b>&#x60;;</b>
<b></b>
<b>export default DELETE_GROUP_MUTATION;</b>
</pre>

##### Added client&#x2F;src&#x2F;graphql&#x2F;leave-group.mutation.js
<pre>

...

<b>import gql from &#x27;graphql-tag&#x27;;</b>
<b></b>
<b>const LEAVE_GROUP_MUTATION &#x3D; gql&#x60;</b>
<b>  mutation leaveGroup($id: Int!, $userId: Int!) {</b>
<b>    leaveGroup(id: $id, userId: $userId) {</b>
<b>      id</b>
<b>    }</b>
<b>  }</b>
<b>&#x60;;</b>
<b></b>
<b>export default LEAVE_GROUP_MUTATION;</b>
</pre>

##### Changed client&#x2F;src&#x2F;graphql&#x2F;user.query.js
<pre>

...

        id
        name
      }
<b>      friends {</b>
<b>        id</b>
<b>        username</b>
<b>      }</b>
    }
  }
&#x60;;
</pre>

##### Changed client&#x2F;src&#x2F;navigation.js
<pre>

...


import Groups from &#x27;./screens/groups.screen&#x27;;
import Messages from &#x27;./screens/messages.screen&#x27;;
<b>import FinalizeGroup from &#x27;./screens/finalize-group.screen&#x27;;</b>
<b>import GroupDetails from &#x27;./screens/group-details.screen&#x27;;</b>
<b>import NewGroup from &#x27;./screens/new-group.screen&#x27;;</b>

const styles &#x3D; StyleSheet.create({
  container: {
</pre>
<pre>

...

const AppNavigator &#x3D; StackNavigator({
  Main: { screen: MainScreenNavigator },
  Messages: { screen: Messages },
<b>  GroupDetails: { screen: GroupDetails },</b>
<b>  NewGroup: { screen: NewGroup },</b>
<b>  FinalizeGroup: { screen: FinalizeGroup },</b>
}, {
  mode: &#x27;modal&#x27;,
});
</pre>

##### Added client&#x2F;src&#x2F;screens&#x2F;finalize-group.screen.js
<pre>

...

<b>import { _ } from &#x27;lodash&#x27;;</b>
<b>import React, { Component } from &#x27;react&#x27;;</b>
<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import {</b>
<b>  Alert,</b>
<b>  Button,</b>
<b>  Image,</b>
<b>  StyleSheet,</b>
<b>  Text,</b>
<b>  TextInput,</b>
<b>  TouchableOpacity,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b>import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b>import { NavigationActions } from &#x27;react-navigation&#x27;;</b>
<b>import update from &#x27;immutability-helper&#x27;;</b>
<b></b>
<b>import { USER_QUERY } from &#x27;../graphql/user.query&#x27;;</b>
<b>import CREATE_GROUP_MUTATION from &#x27;../graphql/create-group.mutation&#x27;;</b>
<b>import SelectedUserList from &#x27;../components/selected-user-list.component&#x27;;</b>
<b></b>
<b>const goToNewGroup &#x3D; group &#x3D;&gt; NavigationActions.reset({</b>
<b>  index: 1,</b>
<b>  actions: [</b>
<b>    NavigationActions.navigate({ routeName: &#x27;Main&#x27; }),</b>
<b>    NavigationActions.navigate({ routeName: &#x27;Messages&#x27;, params: { groupId: group.id, title: group.name } }),</b>
<b>  ],</b>
<b>});</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    flex: 1,</b>
<b>    backgroundColor: &#x27;white&#x27;,</b>
<b>  },</b>
<b>  detailsContainer: {</b>
<b>    padding: 20,</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>  },</b>
<b>  imageContainer: {</b>
<b>    paddingRight: 20,</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>  },</b>
<b>  inputContainer: {</b>
<b>    flexDirection: &#x27;column&#x27;,</b>
<b>    flex: 1,</b>
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
<b>  },</b>
<b>  groupImage: {</b>
<b>    width: 54,</b>
<b>    height: 54,</b>
<b>    borderRadius: 27,</b>
<b>  },</b>
<b>  selected: {</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>  },</b>
<b>  loading: {</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>    flex: 1,</b>
<b>  },</b>
<b>  navIcon: {</b>
<b>    color: &#x27;blue&#x27;,</b>
<b>    fontSize: 18,</b>
<b>    paddingTop: 2,</b>
<b>  },</b>
<b>  participants: {</b>
<b>    paddingHorizontal: 20,</b>
<b>    paddingVertical: 6,</b>
<b>    backgroundColor: &#x27;#dbdbdb&#x27;,</b>
<b>    color: &#x27;#777&#x27;,</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>class FinalizeGroup extends Component {</b>
<b>  static navigationOptions &#x3D; ({ navigation }) &#x3D;&gt; {</b>
<b>    const { state } &#x3D; navigation;</b>
<b>    const isReady &#x3D; state.params &amp;&amp; state.params.mode &#x3D;&#x3D;&#x3D; &#x27;ready&#x27;;</b>
<b>    return {</b>
<b>      title: &#x27;New Group&#x27;,</b>
<b>      headerRight: (</b>
<b>        isReady ? &lt;Button</b>
<b>          title&#x3D;&quot;Create&quot;</b>
<b>          onPress&#x3D;{state.params.create}</b>
<b>        /&gt; : undefined</b>
<b>      ),</b>
<b>    };</b>
<b>  };</b>
<b></b>
<b>  constructor(props) {</b>
<b>    super(props);</b>
<b></b>
<b>    const { selected } &#x3D; props.navigation.state.params;</b>
<b></b>
<b>    this.state &#x3D; {</b>
<b>      selected,</b>
<b>    };</b>
<b></b>
<b>    this.create &#x3D; this.create.bind(this);</b>
<b>    this.pop &#x3D; this.pop.bind(this);</b>
<b>    this.remove &#x3D; this.remove.bind(this);</b>
<b>  }</b>
<b></b>
<b>  componentDidMount() {</b>
<b>    this.refreshNavigation(this.state.selected.length &amp;&amp; this.state.name);</b>
<b>  }</b>
<b></b>
<b>  componentWillUpdate(nextProps, nextState) {</b>
<b>    if ((nextState.selected.length &amp;&amp; nextState.name) !&#x3D;&#x3D;</b>
<b>      (this.state.selected.length &amp;&amp; this.state.name)) {</b>
<b>      this.refreshNavigation(nextState.selected.length &amp;&amp; nextState.name);</b>
<b>    }</b>
<b>  }</b>
<b></b>
<b>  pop() {</b>
<b>    this.props.navigation.goBack();</b>
<b>  }</b>
<b></b>
<b>  remove(user) {</b>
<b>    const index &#x3D; this.state.selected.indexOf(user);</b>
<b>    if (~index) {</b>
<b>      const selected &#x3D; update(this.state.selected, { $splice: [[index, 1]] });</b>
<b>      this.setState({</b>
<b>        selected,</b>
<b>      });</b>
<b>    }</b>
<b>  }</b>
<b></b>
<b>  create() {</b>
<b>    const { createGroup } &#x3D; this.props;</b>
<b></b>
<b>    createGroup({</b>
<b>      name: this.state.name,</b>
<b>      userId: 1, // fake user for now</b>
<b>      userIds: _.map(this.state.selected, &#x27;id&#x27;),</b>
<b>    }).then((res) &#x3D;&gt; {</b>
<b>      this.props.navigation.dispatch(goToNewGroup(res.data.createGroup));</b>
<b>    }).catch((error) &#x3D;&gt; {</b>
<b>      Alert.alert(</b>
<b>        &#x27;Error Creating New Group&#x27;,</b>
<b>        error.message,</b>
<b>        [</b>
<b>          { text: &#x27;OK&#x27;, onPress: () &#x3D;&gt; {} },</b>
<b>        ],</b>
<b>      );</b>
<b>    });</b>
<b>  }</b>
<b></b>
<b>  refreshNavigation(ready) {</b>
<b>    const { navigation } &#x3D; this.props;</b>
<b>    navigation.setParams({</b>
<b>      mode: ready ? &#x27;ready&#x27; : undefined,</b>
<b>      create: this.create,</b>
<b>    });</b>
<b>  }</b>
<b></b>
<b>  render() {</b>
<b>    const { friendCount } &#x3D; this.props.navigation.state.params;</b>
<b></b>
<b>    return (</b>
<b>      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>        &lt;View style&#x3D;{styles.detailsContainer}&gt;</b>
<b>          &lt;TouchableOpacity style&#x3D;{styles.imageContainer}&gt;</b>
<b>            &lt;Image</b>
<b>              style&#x3D;{styles.groupImage}</b>
<b>              source&#x3D;{{ uri: &#x27;https://reactjs.org/logo-og.png&#x27; }}</b>
<b>            /&gt;</b>
<b>            &lt;Text&gt;edit&lt;/Text&gt;</b>
<b>          &lt;/TouchableOpacity&gt;</b>
<b>          &lt;View style&#x3D;{styles.inputContainer}&gt;</b>
<b>            &lt;View style&#x3D;{styles.inputBorder}&gt;</b>
<b>              &lt;TextInput</b>
<b>                autoFocus</b>
<b>                onChangeText&#x3D;{name &#x3D;&gt; this.setState({ name })}</b>
<b>                placeholder&#x3D;&quot;Group Subject&quot;</b>
<b>                style&#x3D;{styles.input}</b>
<b>              /&gt;</b>
<b>            &lt;/View&gt;</b>
<b>            &lt;Text style&#x3D;{styles.inputInstructions}&gt;</b>
<b>              {&#x27;Please provide a group subject and optional group icon&#x27;}</b>
<b>            &lt;/Text&gt;</b>
<b>          &lt;/View&gt;</b>
<b>        &lt;/View&gt;</b>
<b>        &lt;Text style&#x3D;{styles.participants}&gt;</b>
<b>          {&#x60;participants: ${this.state.selected.length} of ${friendCount}&#x60;.toUpperCase()}</b>
<b>        &lt;/Text&gt;</b>
<b>        &lt;View style&#x3D;{styles.selected}&gt;</b>
<b>          {this.state.selected.length ?</b>
<b>            &lt;SelectedUserList</b>
<b>              data&#x3D;{this.state.selected}</b>
<b>              remove&#x3D;{this.remove}</b>
<b>            /&gt; : undefined}</b>
<b>        &lt;/View&gt;</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b></b>
<b>FinalizeGroup.propTypes &#x3D; {</b>
<b>  createGroup: PropTypes.func.isRequired,</b>
<b>  navigation: PropTypes.shape({</b>
<b>    dispatch: PropTypes.func,</b>
<b>    goBack: PropTypes.func,</b>
<b>    state: PropTypes.shape({</b>
<b>      params: PropTypes.shape({</b>
<b>        friendCount: PropTypes.number.isRequired,</b>
<b>      }),</b>
<b>    }),</b>
<b>  }),</b>
<b>};</b>
<b></b>
<b>const createGroupMutation &#x3D; graphql(CREATE_GROUP_MUTATION, {</b>
<b>  props: ({ mutate }) &#x3D;&gt; ({</b>
<b>    createGroup: ({ name, userIds, userId }) &#x3D;&gt;</b>
<b>      mutate({</b>
<b>        variables: { name, userIds, userId },</b>
<b>        update: (store, { data: { createGroup } }) &#x3D;&gt; {</b>
<b>          // Read the data from our cache for this query.</b>
<b>          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: userId } });</b>
<b></b>
<b>          // Add our message from the mutation to the end.</b>
<b>          data.user.groups.push(createGroup);</b>
<b></b>
<b>          // Write our data back to the cache.</b>
<b>          store.writeQuery({</b>
<b>            query: USER_QUERY,</b>
<b>            variables: { id: userId },</b>
<b>            data,</b>
<b>          });</b>
<b>        },</b>
<b>      }),</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>const userQuery &#x3D; graphql(USER_QUERY, {</b>
<b>  options: ownProps &#x3D;&gt; ({</b>
<b>    variables: {</b>
<b>      id: ownProps.navigation.state.params.userId,</b>
<b>    },</b>
<b>  }),</b>
<b>  props: ({ data: { loading, user } }) &#x3D;&gt; ({</b>
<b>    loading, user,</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>export default compose(</b>
<b>  userQuery,</b>
<b>  createGroupMutation,</b>
<b>)(FinalizeGroup);</b>
</pre>

##### Added client&#x2F;src&#x2F;screens&#x2F;group-details.screen.js
<pre>

...

<b>// TODO: update group functionality</b>
<b>import React, { Component } from &#x27;react&#x27;;</b>
<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import {</b>
<b>  ActivityIndicator,</b>
<b>  Button,</b>
<b>  Image,</b>
<b>  FlatList,</b>
<b>  StyleSheet,</b>
<b>  Text,</b>
<b>  TouchableOpacity,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b>import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b>import { NavigationActions } from &#x27;react-navigation&#x27;;</b>
<b></b>
<b>import GROUP_QUERY from &#x27;../graphql/group.query&#x27;;</b>
<b>import USER_QUERY from &#x27;../graphql/user.query&#x27;;</b>
<b>import DELETE_GROUP_MUTATION from &#x27;../graphql/delete-group.mutation&#x27;;</b>
<b>import LEAVE_GROUP_MUTATION from &#x27;../graphql/leave-group.mutation&#x27;;</b>
<b></b>
<b>const resetAction &#x3D; NavigationActions.reset({</b>
<b>  index: 0,</b>
<b>  actions: [</b>
<b>    NavigationActions.navigate({ routeName: &#x27;Main&#x27; }),</b>
<b>  ],</b>
<b>});</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    flex: 1,</b>
<b>  },</b>
<b>  avatar: {</b>
<b>    width: 32,</b>
<b>    height: 32,</b>
<b>    borderRadius: 16,</b>
<b>  },</b>
<b>  detailsContainer: {</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>  },</b>
<b>  groupImageContainer: {</b>
<b>    paddingTop: 20,</b>
<b>    paddingHorizontal: 20,</b>
<b>    paddingBottom: 6,</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>  },</b>
<b>  groupName: {</b>
<b>    color: &#x27;black&#x27;,</b>
<b>  },</b>
<b>  groupNameBorder: {</b>
<b>    borderBottomWidth: 1,</b>
<b>    borderColor: &#x27;#dbdbdb&#x27;,</b>
<b>    borderTopWidth: 1,</b>
<b>    flex: 1,</b>
<b>    paddingVertical: 8,</b>
<b>  },</b>
<b>  groupImage: {</b>
<b>    width: 54,</b>
<b>    height: 54,</b>
<b>    borderRadius: 27,</b>
<b>  },</b>
<b>  participants: {</b>
<b>    borderBottomWidth: 1,</b>
<b>    borderColor: &#x27;#dbdbdb&#x27;,</b>
<b>    borderTopWidth: 1,</b>
<b>    paddingHorizontal: 20,</b>
<b>    paddingVertical: 6,</b>
<b>    backgroundColor: &#x27;#dbdbdb&#x27;,</b>
<b>    color: &#x27;#777&#x27;,</b>
<b>  },</b>
<b>  user: {</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>    borderBottomWidth: 1,</b>
<b>    borderColor: &#x27;#dbdbdb&#x27;,</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>    padding: 10,</b>
<b>  },</b>
<b>  username: {</b>
<b>    flex: 1,</b>
<b>    fontSize: 16,</b>
<b>    paddingHorizontal: 12,</b>
<b>    paddingVertical: 8,</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>class GroupDetails extends Component {</b>
<b>  static navigationOptions &#x3D; ({ navigation }) &#x3D;&gt; ({</b>
<b>    title: &#x60;${navigation.state.params.title}&#x60;,</b>
<b>  });</b>
<b></b>
<b>  constructor(props) {</b>
<b>    super(props);</b>
<b></b>
<b>    this.deleteGroup &#x3D; this.deleteGroup.bind(this);</b>
<b>    this.leaveGroup &#x3D; this.leaveGroup.bind(this);</b>
<b>    this.renderItem &#x3D; this.renderItem.bind(this);</b>
<b>  }</b>
<b></b>
<b>  deleteGroup() {</b>
<b>    this.props.deleteGroup(this.props.navigation.state.params.id)</b>
<b>      .then(() &#x3D;&gt; {</b>
<b>        this.props.navigation.dispatch(resetAction);</b>
<b>      })</b>
<b>      .catch((e) &#x3D;&gt; {</b>
<b>        console.log(e); // eslint-disable-line no-console</b>
<b>      });</b>
<b>  }</b>
<b></b>
<b>  leaveGroup() {</b>
<b>    this.props.leaveGroup({</b>
<b>      id: this.props.navigation.state.params.id,</b>
<b>      userId: 1,</b>
<b>    }) // fake user for now</b>
<b>      .then(() &#x3D;&gt; {</b>
<b>        this.props.navigation.dispatch(resetAction);</b>
<b>      })</b>
<b>      .catch((e) &#x3D;&gt; {</b>
<b>        console.log(e); // eslint-disable-line no-console</b>
<b>      });</b>
<b>  }</b>
<b></b>
<b>  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();</b>
<b></b>
<b>  renderItem &#x3D; ({ item: user }) &#x3D;&gt; (</b>
<b>    &lt;View style&#x3D;{styles.user}&gt;</b>
<b>      &lt;Image</b>
<b>        style&#x3D;{styles.avatar}</b>
<b>        source&#x3D;{{ uri: &#x27;https://reactjs.org/logo-og.png&#x27; }}</b>
<b>      /&gt;</b>
<b>      &lt;Text style&#x3D;{styles.username}&gt;{user.username}&lt;/Text&gt;</b>
<b>    &lt;/View&gt;</b>
<b>  )</b>
<b></b>
<b>  render() {</b>
<b>    const { group, loading } &#x3D; this.props;</b>
<b></b>
<b>    // render loading placeholder while we fetch messages</b>
<b>    if (!group || loading) {</b>
<b>      return (</b>
<b>        &lt;View style&#x3D;{[styles.loading, styles.container]}&gt;</b>
<b>          &lt;ActivityIndicator /&gt;</b>
<b>        &lt;/View&gt;</b>
<b>      );</b>
<b>    }</b>
<b></b>
<b>    return (</b>
<b>      &lt;View style&#x3D;{styles.container}&gt;</b>
<b>        &lt;FlatList</b>
<b>          data&#x3D;{group.users}</b>
<b>          keyExtractor&#x3D;{this.keyExtractor}</b>
<b>          renderItem&#x3D;{this.renderItem}</b>
<b>          ListHeaderComponent&#x3D;{() &#x3D;&gt; (</b>
<b>            &lt;View&gt;</b>
<b>              &lt;View style&#x3D;{styles.detailsContainer}&gt;</b>
<b>                &lt;TouchableOpacity style&#x3D;{styles.groupImageContainer} onPress&#x3D;{this.pickGroupImage}&gt;</b>
<b>                  &lt;Image</b>
<b>                    style&#x3D;{styles.groupImage}</b>
<b>                    source&#x3D;{{ uri: &#x27;https://reactjs.org/logo-og.png&#x27; }}</b>
<b>                  /&gt;</b>
<b>                  &lt;Text&gt;edit&lt;/Text&gt;</b>
<b>                &lt;/TouchableOpacity&gt;</b>
<b>                &lt;View style&#x3D;{styles.groupNameBorder}&gt;</b>
<b>                  &lt;Text style&#x3D;{styles.groupName}&gt;{group.name}&lt;/Text&gt;</b>
<b>                &lt;/View&gt;</b>
<b>              &lt;/View&gt;</b>
<b>              &lt;Text style&#x3D;{styles.participants}&gt;</b>
<b>                {&#x60;participants: ${group.users.length}&#x60;.toUpperCase()}</b>
<b>              &lt;/Text&gt;</b>
<b>            &lt;/View&gt;</b>
<b>          )}</b>
<b>          ListFooterComponent&#x3D;{() &#x3D;&gt; (</b>
<b>            &lt;View&gt;</b>
<b>              &lt;Button title&#x3D;&quot;Leave Group&quot; onPress&#x3D;{this.leaveGroup} /&gt;</b>
<b>              &lt;Button title&#x3D;&quot;Delete Group&quot; onPress&#x3D;{this.deleteGroup} /&gt;</b>
<b>            &lt;/View&gt;</b>
<b>          )}</b>
<b>        /&gt;</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b></b>
<b>GroupDetails.propTypes &#x3D; {</b>
<b>  loading: PropTypes.bool,</b>
<b>  group: PropTypes.shape({</b>
<b>    id: PropTypes.number,</b>
<b>    name: PropTypes.string,</b>
<b>    users: PropTypes.arrayOf(PropTypes.shape({</b>
<b>      id: PropTypes.number,</b>
<b>      username: PropTypes.string,</b>
<b>    })),</b>
<b>  }),</b>
<b>  navigation: PropTypes.shape({</b>
<b>    dispatch: PropTypes.func,</b>
<b>    state: PropTypes.shape({</b>
<b>      params: PropTypes.shape({</b>
<b>        title: PropTypes.string,</b>
<b>        id: PropTypes.number,</b>
<b>      }),</b>
<b>    }),</b>
<b>  }),</b>
<b>  deleteGroup: PropTypes.func.isRequired,</b>
<b>  leaveGroup: PropTypes.func.isRequired,</b>
<b>};</b>
<b></b>
<b>const groupQuery &#x3D; graphql(GROUP_QUERY, {</b>
<b>  options: ownProps &#x3D;&gt; ({ variables: { groupId: ownProps.navigation.state.params.id } }),</b>
<b>  props: ({ data: { loading, group } }) &#x3D;&gt; ({</b>
<b>    loading,</b>
<b>    group,</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>const deleteGroupMutation &#x3D; graphql(DELETE_GROUP_MUTATION, {</b>
<b>  props: ({ ownProps, mutate }) &#x3D;&gt; ({</b>
<b>    deleteGroup: id &#x3D;&gt;</b>
<b>      mutate({</b>
<b>        variables: { id },</b>
<b>        update: (store, { data: { deleteGroup } }) &#x3D;&gt; {</b>
<b>          // Read the data from our cache for this query.</b>
<b>          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: 1 } }); // fake for now</b>
<b></b>
<b>          // Add our message from the mutation to the end.</b>
<b>          data.user.groups &#x3D; data.user.groups.filter(g &#x3D;&gt; deleteGroup.id !&#x3D;&#x3D; g.id);</b>
<b></b>
<b>          // Write our data back to the cache.</b>
<b>          store.writeQuery({</b>
<b>            query: USER_QUERY,</b>
<b>            variables: { id: 1 }, // fake for now</b>
<b>            data,</b>
<b>          });</b>
<b>        },</b>
<b>      }),</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>const leaveGroupMutation &#x3D; graphql(LEAVE_GROUP_MUTATION, {</b>
<b>  props: ({ ownProps, mutate }) &#x3D;&gt; ({</b>
<b>    leaveGroup: ({ id, userId }) &#x3D;&gt;</b>
<b>      mutate({</b>
<b>        variables: { id, userId },</b>
<b>        update: (store, { data: { leaveGroup } }) &#x3D;&gt; {</b>
<b>          // Read the data from our cache for this query.</b>
<b>          const data &#x3D; store.readQuery({ query: USER_QUERY, variables: { id: 1 } }); // fake for now</b>
<b></b>
<b>          // Add our message from the mutation to the end.</b>
<b>          data.user.groups &#x3D; data.user.groups.filter(g &#x3D;&gt; leaveGroup.id !&#x3D;&#x3D; g.id);</b>
<b></b>
<b>          // Write our data back to the cache.</b>
<b>          store.writeQuery({</b>
<b>            query: USER_QUERY,</b>
<b>            variables: { id: 1 }, // fake for now</b>
<b>            data,</b>
<b>          });</b>
<b>        },</b>
<b>      }),</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>export default compose(</b>
<b>  groupQuery,</b>
<b>  deleteGroupMutation,</b>
<b>  leaveGroupMutation,</b>
<b>)(GroupDetails);</b>
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;groups.screen.js
<pre>

...

import {
  FlatList,
  ActivityIndicator,
<b>  Button,</b>
  StyleSheet,
  Text,
  TouchableHighlight,
</pre>
<pre>

...

    fontWeight: &#x27;bold&#x27;,
    flex: 0.7,
  },
<b>  header: {</b>
<b>    alignItems: &#x27;flex-end&#x27;,</b>
<b>    padding: 6,</b>
<b>    borderColor: &#x27;#eee&#x27;,</b>
<b>    borderBottomWidth: 1,</b>
<b>  },</b>
<b>  warning: {</b>
<b>    textAlign: &#x27;center&#x27;,</b>
<b>    padding: 12,</b>
<b>  },</b>
});

<b>const Header &#x3D; ({ onPress }) &#x3D;&gt; (</b>
<b>  &lt;View style&#x3D;{styles.header}&gt;</b>
<b>    &lt;Button title&#x3D;{&#x27;New Group&#x27;} onPress&#x3D;{onPress} /&gt;</b>
<b>  &lt;/View&gt;</b>
<b>);</b>
<b>Header.propTypes &#x3D; {</b>
<b>  onPress: PropTypes.func.isRequired,</b>
<b>};</b>
<b></b>
class Group extends Component {
  constructor(props) {
    super(props);
</pre>
<pre>

...

  constructor(props) {
    super(props);
    this.goToMessages &#x3D; this.goToMessages.bind(this);
<b>    this.goToNewGroup &#x3D; this.goToNewGroup.bind(this);</b>
  }

  keyExtractor &#x3D; item &#x3D;&gt; item.id.toString();
</pre>
<pre>

...

    navigate(&#x27;Messages&#x27;, { groupId: group.id, title: group.name });
  }

<b>  goToNewGroup() {</b>
<b>    const { navigate } &#x3D; this.props.navigation;</b>
<b>    navigate(&#x27;NewGroup&#x27;);</b>
<b>  }</b>
<b></b>
  renderItem &#x3D; ({ item }) &#x3D;&gt; &lt;Group group&#x3D;{item} goToMessages&#x3D;{this.goToMessages} /&gt;;

  render() {
</pre>
<pre>

...

      );
    }

<b>    if (user &amp;&amp; !user.groups.length) {</b>
<b>      return (</b>
<b>        &lt;View style&#x3D;{styles.container}&gt;</b>
<b>          &lt;Header onPress&#x3D;{this.goToNewGroup} /&gt;</b>
<b>          &lt;Text style&#x3D;{styles.warning}&gt;{&#x27;You do not have any groups.&#x27;}&lt;/Text&gt;</b>
<b>        &lt;/View&gt;</b>
<b>      );</b>
<b>    }</b>
<b></b>
    // render list of groups for user
    return (
      &lt;View style&#x3D;{styles.container}&gt;
</pre>
<pre>

...

          data&#x3D;{user.groups}
          keyExtractor&#x3D;{this.keyExtractor}
          renderItem&#x3D;{this.renderItem}
<b>          ListHeaderComponent&#x3D;{() &#x3D;&gt; &lt;Header onPress&#x3D;{this.goToNewGroup} /&gt;}</b>
        /&gt;
      &lt;/View&gt;
    );
</pre>

##### Changed client&#x2F;src&#x2F;screens&#x2F;messages.screen.js
<pre>

...

import {
  ActivityIndicator,
  FlatList,
<b>  Image,</b>
  KeyboardAvoidingView,
  StyleSheet,
<b>  Text,</b>
<b>  TouchableOpacity,</b>
  View,
} from &#x27;react-native&#x27;;
import PropTypes from &#x27;prop-types&#x27;;
</pre>
<pre>

...

  loading: {
    justifyContent: &#x27;center&#x27;,
  },
<b>  titleWrapper: {</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>    position: &#x27;absolute&#x27;,</b>
<b>    left: 0,</b>
<b>    right: 0,</b>
<b>  },</b>
<b>  title: {</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>  },</b>
<b>  titleImage: {</b>
<b>    marginRight: 6,</b>
<b>    width: 32,</b>
<b>    height: 32,</b>
<b>    borderRadius: 16,</b>
<b>  },</b>
});

class Messages extends Component {
  static navigationOptions &#x3D; ({ navigation }) &#x3D;&gt; {
<b>    const { state, navigate } &#x3D; navigation;</b>
<b></b>
<b>    const goToGroupDetails &#x3D; navigate.bind(this, &#x27;GroupDetails&#x27;, {</b>
<b>      id: state.params.groupId,</b>
      title: state.params.title,
<b>    });</b>
<b></b>
<b>    return {</b>
<b>      headerTitle: (</b>
<b>        &lt;TouchableOpacity</b>
<b>          style&#x3D;{styles.titleWrapper}</b>
<b>          onPress&#x3D;{goToGroupDetails}</b>
<b>        &gt;</b>
<b>          &lt;View style&#x3D;{styles.title}&gt;</b>
<b>            &lt;Image</b>
<b>              style&#x3D;{styles.titleImage}</b>
<b>              source&#x3D;{{ uri: &#x27;https://reactjs.org/logo-og.png&#x27; }}</b>
<b>            /&gt;</b>
<b>            &lt;Text&gt;{state.params.title}&lt;/Text&gt;</b>
<b>          &lt;/View&gt;</b>
<b>        &lt;/TouchableOpacity&gt;</b>
<b>      ),</b>
    };
  };

</pre>
<pre>

...

Messages.propTypes &#x3D; {
  createMessage: PropTypes.func,
  navigation: PropTypes.shape({
<b>    navigate: PropTypes.func,</b>
    state: PropTypes.shape({
      params: PropTypes.shape({
        groupId: PropTypes.number,
</pre>

##### Added client&#x2F;src&#x2F;screens&#x2F;new-group.screen.js
<pre>

...

<b>import { _ } from &#x27;lodash&#x27;;</b>
<b>import React, { Component } from &#x27;react&#x27;;</b>
<b>import PropTypes from &#x27;prop-types&#x27;;</b>
<b>import {</b>
<b>  ActivityIndicator,</b>
<b>  Button,</b>
<b>  Image,</b>
<b>  StyleSheet,</b>
<b>  Text,</b>
<b>  View,</b>
<b>} from &#x27;react-native&#x27;;</b>
<b>import { graphql, compose } from &#x27;react-apollo&#x27;;</b>
<b>import AlphabetListView from &#x27;react-native-alpha-listview&#x27;;</b>
<b>import update from &#x27;immutability-helper&#x27;;</b>
<b>import Icon from &#x27;react-native-vector-icons/FontAwesome&#x27;;</b>
<b></b>
<b>import SelectedUserList from &#x27;../components/selected-user-list.component&#x27;;</b>
<b>import USER_QUERY from &#x27;../graphql/user.query&#x27;;</b>
<b></b>
<b>// eslint-disable-next-line</b>
<b>const sortObject &#x3D; o &#x3D;&gt; Object.keys(o).sort().reduce((r, k) &#x3D;&gt; (r[k] &#x3D; o[k], r), {});</b>
<b></b>
<b>const styles &#x3D; StyleSheet.create({</b>
<b>  container: {</b>
<b>    flex: 1,</b>
<b>    backgroundColor: &#x27;white&#x27;,</b>
<b>  },</b>
<b>  cellContainer: {</b>
<b>    alignItems: &#x27;center&#x27;,</b>
<b>    flex: 1,</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>    flexWrap: &#x27;wrap&#x27;,</b>
<b>    paddingHorizontal: 12,</b>
<b>    paddingVertical: 6,</b>
<b>  },</b>
<b>  cellImage: {</b>
<b>    width: 32,</b>
<b>    height: 32,</b>
<b>    borderRadius: 16,</b>
<b>  },</b>
<b>  cellLabel: {</b>
<b>    flex: 1,</b>
<b>    fontSize: 16,</b>
<b>    paddingHorizontal: 12,</b>
<b>    paddingVertical: 8,</b>
<b>  },</b>
<b>  selected: {</b>
<b>    flexDirection: &#x27;row&#x27;,</b>
<b>  },</b>
<b>  loading: {</b>
<b>    justifyContent: &#x27;center&#x27;,</b>
<b>    flex: 1,</b>
<b>  },</b>
<b>  navIcon: {</b>
<b>    color: &#x27;blue&#x27;,</b>
<b>    fontSize: 18,</b>
<b>    paddingTop: 2,</b>
<b>  },</b>
<b>  checkButtonContainer: {</b>
<b>    paddingRight: 12,</b>
<b>    paddingVertical: 6,</b>
<b>  },</b>
<b>  checkButton: {</b>
<b>    borderWidth: 1,</b>
<b>    borderColor: &#x27;#dbdbdb&#x27;,</b>
<b>    padding: 4,</b>
<b>    height: 24,</b>
<b>    width: 24,</b>
<b>  },</b>
<b>  checkButtonIcon: {</b>
<b>    marginRight: -4, // default is 12</b>
<b>  },</b>
<b>});</b>
<b></b>
<b>const SectionHeader &#x3D; ({ title }) &#x3D;&gt; {</b>
<b>  // inline styles used for brevity, use a stylesheet when possible</b>
<b>  const textStyle &#x3D; {</b>
<b>    textAlign: &#x27;center&#x27;,</b>
<b>    color: &#x27;#fff&#x27;,</b>
<b>    fontWeight: &#x27;700&#x27;,</b>
<b>    fontSize: 16,</b>
<b>  };</b>
<b></b>
<b>  const viewStyle &#x3D; {</b>
<b>    backgroundColor: &#x27;#ccc&#x27;,</b>
<b>  };</b>
<b>  return (</b>
<b>    &lt;View style&#x3D;{viewStyle}&gt;</b>
<b>      &lt;Text style&#x3D;{textStyle}&gt;{title}&lt;/Text&gt;</b>
<b>    &lt;/View&gt;</b>
<b>  );</b>
<b>};</b>
<b>SectionHeader.propTypes &#x3D; {</b>
<b>  title: PropTypes.string,</b>
<b>};</b>
<b></b>
<b>const SectionItem &#x3D; ({ title }) &#x3D;&gt; (</b>
<b>  &lt;Text style&#x3D;{{ color: &#x27;blue&#x27; }}&gt;{title}&lt;/Text&gt;</b>
<b>);</b>
<b>SectionItem.propTypes &#x3D; {</b>
<b>  title: PropTypes.string,</b>
<b>};</b>
<b></b>
<b>class Cell extends Component {</b>
<b>  constructor(props) {</b>
<b>    super(props);</b>
<b>    this.toggle &#x3D; this.toggle.bind(this);</b>
<b>    this.state &#x3D; {</b>
<b>      isSelected: props.isSelected(props.item),</b>
<b>    };</b>
<b>  }</b>
<b></b>
<b>  componentWillReceiveProps(nextProps) {</b>
<b>    this.setState({</b>
<b>      isSelected: nextProps.isSelected(nextProps.item),</b>
<b>    });</b>
<b>  }</b>
<b></b>
<b>  toggle() {</b>
<b>    this.props.toggle(this.props.item);</b>
<b>  }</b>
<b></b>
<b>  render() {</b>
<b>    return (</b>
<b>      &lt;View style&#x3D;{styles.cellContainer}&gt;</b>
<b>        &lt;Image</b>
<b>          style&#x3D;{styles.cellImage}</b>
<b>          source&#x3D;{{ uri: &#x27;https://reactjs.org/logo-og.png&#x27; }}</b>
<b>        /&gt;</b>
<b>        &lt;Text style&#x3D;{styles.cellLabel}&gt;{this.props.item.username}&lt;/Text&gt;</b>
<b>        &lt;View style&#x3D;{styles.checkButtonContainer}&gt;</b>
<b>          &lt;Icon.Button</b>
<b>            backgroundColor&#x3D;{this.state.isSelected ? &#x27;blue&#x27; : &#x27;white&#x27;}</b>
<b>            borderRadius&#x3D;{12}</b>
<b>            color&#x3D;{&#x27;white&#x27;}</b>
<b>            iconStyle&#x3D;{styles.checkButtonIcon}</b>
<b>            name&#x3D;{&#x27;check&#x27;}</b>
<b>            onPress&#x3D;{this.toggle}</b>
<b>            size&#x3D;{16}</b>
<b>            style&#x3D;{styles.checkButton}</b>
<b>          /&gt;</b>
<b>        &lt;/View&gt;</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b>Cell.propTypes &#x3D; {</b>
<b>  isSelected: PropTypes.func,</b>
<b>  item: PropTypes.shape({</b>
<b>    username: PropTypes.string.isRequired,</b>
<b>  }).isRequired,</b>
<b>  toggle: PropTypes.func.isRequired,</b>
<b>};</b>
<b></b>
<b>class NewGroup extends Component {</b>
<b>  static navigationOptions &#x3D; ({ navigation }) &#x3D;&gt; {</b>
<b>    const { state } &#x3D; navigation;</b>
<b>    const isReady &#x3D; state.params &amp;&amp; state.params.mode &#x3D;&#x3D;&#x3D; &#x27;ready&#x27;;</b>
<b>    return {</b>
<b>      title: &#x27;New Group&#x27;,</b>
<b>      headerRight: (</b>
<b>        isReady ? &lt;Button</b>
<b>          title&#x3D;&quot;Next&quot;</b>
<b>          onPress&#x3D;{state.params.finalizeGroup}</b>
<b>        /&gt; : undefined</b>
<b>      ),</b>
<b>    };</b>
<b>  };</b>
<b></b>
<b>  constructor(props) {</b>
<b>    super(props);</b>
<b></b>
<b>    let selected &#x3D; [];</b>
<b>    if (this.props.navigation.state.params) {</b>
<b>      selected &#x3D; this.props.navigation.state.params.selected;</b>
<b>    }</b>
<b></b>
<b>    this.state &#x3D; {</b>
<b>      selected: selected || [],</b>
<b>      friends: props.user ?</b>
<b>        _.groupBy(props.user.friends, friend &#x3D;&gt; friend.username.charAt(0).toUpperCase()) : [],</b>
<b>    };</b>
<b></b>
<b>    this.finalizeGroup &#x3D; this.finalizeGroup.bind(this);</b>
<b>    this.isSelected &#x3D; this.isSelected.bind(this);</b>
<b>    this.toggle &#x3D; this.toggle.bind(this);</b>
<b>  }</b>
<b></b>
<b>  componentDidMount() {</b>
<b>    this.refreshNavigation(this.state.selected);</b>
<b>  }</b>
<b></b>
<b>  componentWillReceiveProps(nextProps) {</b>
<b>    const state &#x3D; {};</b>
<b>    if (nextProps.user &amp;&amp; nextProps.user.friends &amp;&amp; nextProps.user !&#x3D;&#x3D; this.props.user) {</b>
<b>      state.friends &#x3D; sortObject(</b>
<b>        _.groupBy(nextProps.user.friends, friend &#x3D;&gt; friend.username.charAt(0).toUpperCase()),</b>
<b>      );</b>
<b>    }</b>
<b></b>
<b>    if (nextProps.selected) {</b>
<b>      Object.assign(state, {</b>
<b>        selected: nextProps.selected,</b>
<b>      });</b>
<b>    }</b>
<b></b>
<b>    this.setState(state);</b>
<b>  }</b>
<b></b>
<b>  componentWillUpdate(nextProps, nextState) {</b>
<b>    if (!!this.state.selected.length !&#x3D;&#x3D; !!nextState.selected.length) {</b>
<b>      this.refreshNavigation(nextState.selected);</b>
<b>    }</b>
<b>  }</b>
<b></b>
<b>  refreshNavigation(selected) {</b>
<b>    const { navigation } &#x3D; this.props;</b>
<b>    navigation.setParams({</b>
<b>      mode: selected &amp;&amp; selected.length ? &#x27;ready&#x27; : undefined,</b>
<b>      finalizeGroup: this.finalizeGroup,</b>
<b>    });</b>
<b>  }</b>
<b></b>
<b>  finalizeGroup() {</b>
<b>    const { navigate } &#x3D; this.props.navigation;</b>
<b>    navigate(&#x27;FinalizeGroup&#x27;, {</b>
<b>      selected: this.state.selected,</b>
<b>      friendCount: this.props.user.friends.length,</b>
<b>      userId: this.props.user.id,</b>
<b>    });</b>
<b>  }</b>
<b></b>
<b>  isSelected(user) {</b>
<b>    return ~this.state.selected.indexOf(user);</b>
<b>  }</b>
<b></b>
<b>  toggle(user) {</b>
<b>    const index &#x3D; this.state.selected.indexOf(user);</b>
<b>    if (~index) {</b>
<b>      const selected &#x3D; update(this.state.selected, { $splice: [[index, 1]] });</b>
<b></b>
<b>      return this.setState({</b>
<b>        selected,</b>
<b>      });</b>
<b>    }</b>
<b></b>
<b>    const selected &#x3D; [...this.state.selected, user];</b>
<b></b>
<b>    return this.setState({</b>
<b>      selected,</b>
<b>    });</b>
<b>  }</b>
<b></b>
<b>  render() {</b>
<b>    const { user, loading } &#x3D; this.props;</b>
<b></b>
<b>    // render loading placeholder while we fetch messages</b>
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
<b>        {this.state.selected.length ? &lt;View style&#x3D;{styles.selected}&gt;</b>
<b>          &lt;SelectedUserList</b>
<b>            data&#x3D;{this.state.selected}</b>
<b>            remove&#x3D;{this.toggle}</b>
<b>          /&gt;</b>
<b>        &lt;/View&gt; : undefined}</b>
<b>        {_.keys(this.state.friends).length ? &lt;AlphabetListView</b>
<b>          style&#x3D;{{ flex: 1 }}</b>
<b>          data&#x3D;{this.state.friends}</b>
<b>          cell&#x3D;{Cell}</b>
<b>          cellHeight&#x3D;{30}</b>
<b>          cellProps&#x3D;{{</b>
<b>            isSelected: this.isSelected,</b>
<b>            toggle: this.toggle,</b>
<b>          }}</b>
<b>          sectionListItem&#x3D;{SectionItem}</b>
<b>          sectionHeader&#x3D;{SectionHeader}</b>
<b>          sectionHeaderHeight&#x3D;{22.5}</b>
<b>        /&gt; : undefined}</b>
<b>      &lt;/View&gt;</b>
<b>    );</b>
<b>  }</b>
<b>}</b>
<b></b>
<b>NewGroup.propTypes &#x3D; {</b>
<b>  loading: PropTypes.bool.isRequired,</b>
<b>  navigation: PropTypes.shape({</b>
<b>    navigate: PropTypes.func,</b>
<b>    setParams: PropTypes.func,</b>
<b>    state: PropTypes.shape({</b>
<b>      params: PropTypes.object,</b>
<b>    }),</b>
<b>  }),</b>
<b>  user: PropTypes.shape({</b>
<b>    id: PropTypes.number,</b>
<b>    friends: PropTypes.arrayOf(PropTypes.shape({</b>
<b>      id: PropTypes.number,</b>
<b>      username: PropTypes.string,</b>
<b>    })),</b>
<b>  }),</b>
<b>  selected: PropTypes.arrayOf(PropTypes.object),</b>
<b>};</b>
<b></b>
<b>const userQuery &#x3D; graphql(USER_QUERY, {</b>
<b>  options: (ownProps) &#x3D;&gt; ({ variables: { id: 1 } }), // fake for now</b>
<b>  props: ({ data: { loading, user } }) &#x3D;&gt; ({</b>
<b>    loading, user,</b>
<b>  }),</b>
<b>});</b>
<b></b>
<b>export default compose(</b>
<b>  userQuery,</b>
<b>)(NewGroup);</b>
</pre>

##### Changed server&#x2F;data&#x2F;resolvers.js
<pre>

...

        groupId,
      });
    },
<b>    createGroup(_, { name, userIds, userId }) {</b>
<b>      return User.findOne({ where: { id: userId } })</b>
<b>        .then(user &#x3D;&gt; user.getFriends({ where: { id: { $in: userIds } } })</b>
<b>          .then(friends &#x3D;&gt; Group.create({</b>
<b>            name,</b>
<b>            users: [user, ...friends],</b>
<b>          })</b>
<b>            .then(group &#x3D;&gt; group.addUsers([user, ...friends])</b>
<b>              .then(() &#x3D;&gt; group),</b>
<b>            ),</b>
<b>          ),</b>
<b>        );</b>
<b>    },</b>
<b>    deleteGroup(_, { id }) {</b>
<b>      return Group.find({ where: id })</b>
<b>        .then(group &#x3D;&gt; group.getUsers()</b>
<b>          .then(users &#x3D;&gt; group.removeUsers(users))</b>
<b>          .then(() &#x3D;&gt; Message.destroy({ where: { groupId: group.id } }))</b>
<b>          .then(() &#x3D;&gt; group.destroy()),</b>
<b>        );</b>
<b>    },</b>
<b>    leaveGroup(_, { id, userId }) {</b>
<b>      return Group.findOne({ where: { id } })</b>
<b>        .then(group &#x3D;&gt; group.removeUser(userId)</b>
<b>          .then(() &#x3D;&gt; group.getUsers())</b>
<b>          .then((users) &#x3D;&gt; {</b>
<b>            // if the last user is leaving, remove the group</b>
<b>            if (!users.length) {</b>
<b>              group.destroy();</b>
<b>            }</b>
<b>            return { id };</b>
<b>          }),</b>
<b>        );</b>
<b>    },</b>
<b>    updateGroup(_, { id, name }) {</b>
<b>      return Group.findOne({ where: { id } })</b>
<b>        .then(group &#x3D;&gt; group.update({ name }));</b>
<b>    },</b>
  },
  Group: {
    users(group) {
</pre>

##### Changed server&#x2F;data&#x2F;schema.js
<pre>

...

    createMessage(
      text: String!, userId: Int!, groupId: Int!
    ): Message
<b>    createGroup(name: String!, userIds: [Int], userId: Int!): Group</b>
<b>    deleteGroup(id: Int!): Group</b>
<b>    leaveGroup(id: Int!, userId: Int!): Group # let user leave group</b>
<b>    updateGroup(id: Int!, name: String): Group</b>
  }
  
  schema {
</pre>

[}]: #


[//]: # (foot-start)

[{]: <helper> (navStep)

| [< Previous Step](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/modified-medium/step3.md) | [Next Step >](https://github.com/srtucker22/chatty/tree/master@3.0.0/.tortilla/manuals/views/modified-medium/step5.md) |
|:--------------------------------|--------------------------------:|

[}]: #

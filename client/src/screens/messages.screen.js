import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import randomColor from 'randomcolor';
import { graphql, compose } from 'react-apollo';
import update from 'immutability-helper';
import { Buffer } from 'buffer';
import _ from 'lodash';
import moment from 'moment';
import { connect } from 'react-redux';

import { wsClient } from '../app';
import Message from '../components/message.component';
import MessageInput from '../components/message-input.component';
import GROUP_QUERY from '../graphql/group.query';
import CREATE_MESSAGE_MUTATION from '../graphql/create-message.mutation';
import USER_QUERY from '../graphql/user.query';
import MESSAGE_ADDED_SUBSCRIPTION from '../graphql/message-added.subscription';

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    backgroundColor: '#e5ddd5',
    flex: 1,
    flexDirection: 'column',
  },
  loading: {
    justifyContent: 'center',
  },
  titleWrapper: {
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleImage: {
    marginRight: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

class Messages extends Component {
  static navigationOptions = ({ navigation }) => {
    const { state, navigate } = navigation;

    const goToGroupDetails = navigate.bind(this, 'GroupDetails', {
      id: state.params.groupId,
      title: state.params.title,
    });

    return {
      headerTitle: (
        <TouchableOpacity
          style={styles.titleWrapper}
          onPress={goToGroupDetails}
        >
          <View style={styles.title}>
            <Image
              style={styles.titleImage}
              source={{ uri: 'https://reactjs.org/logo-og.png' }}
            />
            <Text>{state.params.title}</Text>
          </View>
        </TouchableOpacity>
      ),
    };
  };

  constructor(props) {
    super(props);
    const usernameColors = {};
    if (props.group && props.group.users) {
      props.group.users.forEach((user) => {
        usernameColors[user.username] = randomColor();
      });
    }

    this.state = {
      usernameColors,
    };

    this.renderItem = this.renderItem.bind(this);
    this.send = this.send.bind(this);
    this.onEndReached = this.onEndReached.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const usernameColors = {};
    // check for new messages
    if (nextProps.group) {
      if (nextProps.group.users) {
        // apply a color to each user
        nextProps.group.users.forEach((user) => {
          usernameColors[user.username] = this.state.usernameColors[user.username] || randomColor();
        });
      }

      // we don't resubscribe on changed props
      // because it never happens in our app
      if (!this.subscription) {
        this.subscription = nextProps.subscribeToMore({
          document: MESSAGE_ADDED_SUBSCRIPTION,
          variables: {
            groupIds: [nextProps.navigation.state.params.groupId],
          },
          updateQuery: (previousResult, { subscriptionData }) => {
            const newMessage = subscriptionData.data.messageAdded;

            return update(previousResult, {
              group: {
                messages: {
                  edges: {
                    $unshift: [{
                      __typename: 'MessageEdge',
                      node: newMessage,
                      cursor: Buffer.from(newMessage.id.toString()).toString('base64'),
                    }],
                  },
                },
              },
            });
          },
        });
      }

      if (!this.reconnected) {
        this.reconnected = wsClient.onReconnected(() => {
          this.props.refetch(); // check for any data lost during disconnect
        }, this);
      }

      this.setState({
        usernameColors,
      });
    } else if (this.reconnected) {
      // remove event subscription
      this.reconnected();
    }
  }

  onEndReached() {
    if (!this.state.loadingMoreEntries &&
      this.props.group.messages.pageInfo.hasNextPage) {
      this.setState({
        loadingMoreEntries: true,
      });
      this.props.loadMoreEntries().then(() => {
        this.setState({
          loadingMoreEntries: false,
        });
      });
    }
  }

  send(text) {
    this.props.createMessage({
      groupId: this.props.navigation.state.params.groupId,
      text,
    }).then(() => {
      this.flatList.scrollToIndex({ index: 0, animated: true });
    });
  }

  keyExtractor = item => item.node.id.toString();

  renderItem = ({ item: edge }) => {
    const message = edge.node;

    return (
      <Message
        color={this.state.usernameColors[message.from.username]}
        isCurrentUser={message.from.id === this.props.auth.id}
        message={message}
      />
    );
  }

  render() {
    const { loading, group } = this.props;

    // render loading placeholder while we fetch messages
    if (loading || !group) {
      return (
        <View style={[styles.loading, styles.container]}>
          <ActivityIndicator />
        </View>
      );
    }

    // render list of messages for group
    return (
      <KeyboardAvoidingView
        behavior={'position'}
        contentContainerStyle={styles.container}
        keyboardVerticalOffset={64}
        style={styles.container}
      >
        <FlatList
          ref={(ref) => { this.flatList = ref; }}
          inverted
          data={group.messages.edges}
          keyExtractor={this.keyExtractor}
          renderItem={this.renderItem}
          ListEmptyComponent={<View />}
          onEndReached={this.onEndReached}
        />
        <MessageInput send={this.send} />
      </KeyboardAvoidingView>
    );
  }
}

Messages.propTypes = {
  auth: PropTypes.shape({
    id: PropTypes.number,
    username: PropTypes.string,
  }),
  createMessage: PropTypes.func,
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        groupId: PropTypes.number,
      }),
    }),
  }),
  group: PropTypes.shape({
    messages: PropTypes.shape({
      edges: PropTypes.arrayOf(PropTypes.shape({
        cursor: PropTypes.string,
        node: PropTypes.object,
      })),
      pageInfo: PropTypes.shape({
        hasNextPage: PropTypes.bool,
        hasPreviousPage: PropTypes.bool,
      }),
    }),
    users: PropTypes.array,
  }),
  loading: PropTypes.bool,
  loadMoreEntries: PropTypes.func,
  refetch: PropTypes.func,
  subscribeToMore: PropTypes.func,
};

const ITEMS_PER_PAGE = 10;
const groupQuery = graphql(GROUP_QUERY, {
  options: ownProps => ({
    variables: {
      groupId: ownProps.navigation.state.params.groupId,
      messageConnection: {
        first: ITEMS_PER_PAGE,
      },
    },
  }),
  props: ({ data: { fetchMore, loading, group, refetch, subscribeToMore } }) => ({
    loading,
    group,
    refetch,
    subscribeToMore,
    loadMoreEntries() {
      return fetchMore({
        // query: ... (you can specify a different query.
        // GROUP_QUERY is used by default)
        variables: {
          // load more queries starting from the cursor of the last (oldest) message
          messageConnection: {
            first: ITEMS_PER_PAGE,
            after: group.messages.edges[group.messages.edges.length - 1].cursor,
          },
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          // we will make an extra call to check if no more entries
          if (!fetchMoreResult) { return previousResult; }
          // push results (older messages) to end of messages list
          return update(previousResult, {
            group: {
              messages: {
                edges: { $push: fetchMoreResult.group.messages.edges },
                pageInfo: { $set: fetchMoreResult.group.messages.pageInfo },
              },
            },
          });
        },
      });
    },
  }),
});

const createMessageMutation = graphql(CREATE_MESSAGE_MUTATION, {
  props: ({ ownProps, mutate }) => ({
    createMessage: message =>
      mutate({
        variables: { message },
        optimisticResponse: {
          __typename: 'Mutation',
          createMessage: {
            __typename: 'Message',
            id: -1, // don't know id yet, but it doesn't matter
            text: message.text, // we know what the text will be
            createdAt: new Date().toISOString(), // the time is now!
            from: {
              __typename: 'User',
              id: ownProps.auth.id,
              username: ownProps.auth.username,
            },
            to: {
              __typename: 'Group',
              id: message.groupId,
            },
          },
        },
        update: (store, { data: { createMessage } }) => {
          // Read the data from our cache for this query.
          const groupData = store.readQuery({
            query: GROUP_QUERY,
            variables: {
              groupId: message.groupId,
              messageConnection: { first: ITEMS_PER_PAGE },
            },
          });

          // Add our message from the mutation to the end.
          groupData.group.messages.edges.unshift({
            __typename: 'MessageEdge',
            node: createMessage,
            cursor: Buffer.from(createMessage.id.toString()).toString('base64'),
          });

          // Write our data back to the cache.
          store.writeQuery({
            query: GROUP_QUERY,
            variables: {
              groupId: message.groupId,
              messageConnection: { first: ITEMS_PER_PAGE },
            },
            data: groupData,
          });

          const userData = store.readQuery({
            query: USER_QUERY,
            variables: {
              id: ownProps.auth.id,
            },
          });

          // check whether the mutation is the latest message and update cache
          const updatedGroup = _.find(userData.user.groups, { id: message.groupId });
          if (!updatedGroup.messages.edges.length ||
            moment(updatedGroup.messages.edges[0].node.createdAt).isBefore(moment(message.createdAt))) {
            // update the latest message
            updatedGroup.messages.edges[0] = {
              __typename: 'MessageEdge',
              node: createMessage,
              cursor: Buffer.from(createMessage.id.toString()).toString('base64'),
            };

            // Write our data back to the cache.
            store.writeQuery({
              query: USER_QUERY,
              variables: {
                id: ownProps.auth.id,
              },
              data: userData,
            });
          }
        },
      }),

  }),
});

const mapStateToProps = ({ auth }) => ({
  auth,
});

export default compose(
  connect(mapStateToProps),
  groupQuery,
  createMessageMutation,
)(Messages);

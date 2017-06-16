import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { addNavigationHelpers, StackNavigator, TabNavigator, NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
import update from 'immutability-helper';
import { map } from 'lodash';
import { Buffer } from 'buffer';
import { REHYDRATE } from 'redux-persist/constants';
import { AppState } from 'react-native';
import FCM from 'react-native-fcm';

import Groups from './screens/groups.screen';
import Messages from './screens/messages.screen';
import FinalizeGroup from './screens/finalize-group.screen';
import GroupDetails from './screens/group-details.screen';
import NewGroup from './screens/new-group.screen';
import Signin from './screens/signin.screen';
import Settings from './screens/settings.screen';

import { USER_QUERY } from './graphql/user.query';
import MESSAGE_ADDED_SUBSCRIPTION from './graphql/message-added.subscription';
import GROUP_ADDED_SUBSCRIPTION from './graphql/group-added.subscription';
import UPDATE_USER_MUTATION from './graphql/update-user.mutation';

import { firebaseClient, wsClient } from './app';

// tabs in main screen
const MainScreenNavigator = TabNavigator({
  Chats: { screen: Groups },
  Settings: { screen: Settings },
});

const AppNavigator = StackNavigator({
  Main: { screen: MainScreenNavigator },
  Signin: { screen: Signin },
  Messages: { screen: Messages },
  GroupDetails: { screen: GroupDetails },
  NewGroup: { screen: NewGroup },
  FinalizeGroup: { screen: FinalizeGroup },
}, {
  mode: 'modal',
});

// reducer initialization code
const firstAction = AppNavigator.router.getActionForPathAndParams('Main');
const tempNavState = AppNavigator.router.getStateForAction(firstAction);
const initialNavState = AppNavigator.router.getStateForAction(
  tempNavState,
);

// reducer code
export const navigationReducer = (state = initialNavState, action) => {
  let nextState;
  switch (action.type) {
    case REHYDRATE:
      // convert persisted data to Immutable and confirm rehydration
      if (!action.payload.auth || !action.payload.auth.jwt) {
        const { routes, index } = state;
        if (routes[index].routeName !== 'Signin') {
          nextState = AppNavigator.router.getStateForAction(
            NavigationActions.navigate({ routeName: 'Signin' }),
            state,
          );
        }
      }
      break;
    case 'LOGOUT':
      const { routes, index } = state;
      if (routes[index].routeName !== 'Signin') {
        nextState = AppNavigator.router.getStateForAction(
          NavigationActions.navigate({ routeName: 'Signin' }),
          state,
        );
      }
      break;
    default:
      nextState = AppNavigator.router.getStateForAction(action, state);
      break;
  }

  // Simply return the original `state` if `nextState` is null or undefined.
  return nextState || state;
};

class AppWithNavigationState extends Component {
  state = {
    appState: AppState.currentState,
  }

  componentWillMount() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  componentWillReceiveProps(nextProps) {
    // when we get the user, start listening for notifications
    if (nextProps.user && !this.props.user) {
      firebaseClient.init().then((registrationId) => {
        if (registrationId !== nextProps.user.registrationId) {
          // update notification registration token on server
          nextProps.updateUser({ registrationId });
        }
      });
    }

    if (!nextProps.user) {
      // unsubscribe from all notifications
      if (firebaseClient.token) {
        firebaseClient.clear();
      }

      if (this.groupSubscription) {
        this.groupSubscription();
      }

      if (this.messagesSubscription) {
        this.messagesSubscription();
      }

      // clear the event subscription
      if (this.reconnected) {
        this.reconnected();
      }
    } else if (!this.reconnected) {
      this.reconnected = wsClient.onReconnected(() => {
        this.props.refetch(); // check for any data lost during disconnect
      }, this);
    }

    if (nextProps.user &&
      (!this.props.user || nextProps.user.groups.length !== this.props.user.groups.length)) {
      // unsubscribe from old

      if (typeof this.messagesSubscription === 'function') {
        this.messagesSubscription();
      }
      // subscribe to new
      if (nextProps.user.groups.length) {
        this.messagesSubscription = nextProps.subscribeToMessages();
      }
    }

    if (!this.groupSubscription && nextProps.user) {
      this.groupSubscription = nextProps.subscribeToGroups();
    }
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  handleAppStateChange = (nextAppState) => {
    console.log('App has changed state!', nextAppState, this.props.user.badgeCount);
    if (this.props.user && FCM.getBadgeNumber()) {
      // clear notifications from center/tray
      FCM.removeAllDeliveredNotifications();

      FCM.setBadgeNumber(0);

      // update badge count on server
      this.props.updateUser({ badgeCount: 0 });
    }
    this.setState({ appState: nextAppState });
  }

  render() {
    const { dispatch, nav } = this.props;
    return <AppNavigator navigation={addNavigationHelpers({ dispatch, state: nav })} />;
  }
}

AppWithNavigationState.propTypes = {
  dispatch: PropTypes.func.isRequired,
  nav: PropTypes.object.isRequired,
  refetch: PropTypes.func,
  subscribeToGroups: PropTypes.func,
  subscribeToMessages: PropTypes.func,
  updateUser: PropTypes.func,
  user: PropTypes.shape({
    id: PropTypes.number.isRequired,
    badgeCount: PropTypes.number,
    email: PropTypes.string.isRequired,
    registrationId: PropTypes.string,
    groups: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
      }),
    ),
  }),
};

const mapStateToProps = ({ auth, nav }) => ({
  auth,
  nav,
});

const userQuery = graphql(USER_QUERY, {
  skip: ownProps => !ownProps.auth || !ownProps.auth.jwt,
  options: ownProps => ({ variables: { id: ownProps.auth.id } }),
  props: ({ data: { loading, user, refetch, subscribeToMore }, ownProps: { nav } }) => ({
    loading,
    user,
    refetch,
    subscribeToMessages() {
      return subscribeToMore({
        document: MESSAGE_ADDED_SUBSCRIPTION,
        variables: {
          groupIds: map(user.groups, 'id'),
        },
        updateQuery: (previousResult, { subscriptionData }) => {
          const previousGroups = previousResult.user.groups;
          const newMessage = subscriptionData.data.messageAdded;

          const groupIndex = map(previousGroups, 'id').indexOf(newMessage.to.id);

          const { index, routes } = nav;
          let unreadCount = previousGroups[groupIndex].unreadCount;
          if (routes[index].routeName !== 'Messages' || routes[index].params.groupId !== groupIndex) {
            unreadCount += 1;
          }

          return update(previousResult, {
            user: {
              groups: {
                [groupIndex]: {
                  messages: {
                    edges: {
                      $set: [{
                        __typename: 'MessageEdge',
                        node: newMessage,
                        cursor: Buffer.from(newMessage.id.toString()).toString('base64'),
                      }],
                    },
                  },
                  unreadCount: { $set: unreadCount },
                },
              },
            },
          });
        },
      });
    },
    subscribeToGroups() {
      return subscribeToMore({
        document: GROUP_ADDED_SUBSCRIPTION,
        variables: { userId: user.id },
        updateQuery: (previousResult, { subscriptionData }) => {
          const newGroup = subscriptionData.data.groupAdded;

          return update(previousResult, {
            user: {
              groups: { $push: [newGroup] },
            },
          });
        },
      });
    },
  }),
});

const updateUserMutation = graphql(UPDATE_USER_MUTATION, {
  props: ({ mutate }) => ({
    updateUser: user =>
      mutate({
        variables: { user },
      }),
  }),
});

export default compose(
  connect(mapStateToProps),
  updateUserMutation,
  userQuery,
)(AppWithNavigationState);

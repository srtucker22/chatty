import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { addNavigationHelpers, StackNavigator, TabNavigator, NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';
import { graphql, compose } from 'react-apollo';
import update from 'immutability-helper';
import { map } from 'lodash';
import { Buffer } from 'buffer';
import { REHYDRATE } from 'redux-persist/constants';
import { AppState, Keyboard } from 'react-native';
import FCM from 'react-native-fcm';

import Icon from 'react-native-vector-icons/FontAwesome';
// import { FontAwesome, SimpleLineIcons, EvilIcons, Ionicons } from 'react-native-vector-icons';

import Groups from './screens/groups.screen';
import Messages from './screens/messages.screen';
import FinalizeGroup from './screens/finalize-group.screen';
import UsernameSearch from './screens/username-search.screen';
import UsernameProfile from './screens/username-profile.screen';
import UsernameProfileFollowers from './screens/username-profile-followers.screen';
import UsernameProfileFolloweds from './screens/username-profile-followeds.screen';
import GroupDetails from './screens/group-details.screen';
import NewGroup from './screens/new-group.screen';
import NewConversation from './screens/new-conversation.screen';
import Signin from './screens/signin.screen';
import Settings from './screens/settings.screen';

import ProfileScreen from './screens/profile.screen';
import FollowersFeedScreen from './screens/followers-feed.screen';
import FollowedsFeedScreen from './screens/followeds-feed.screen';
import NotificationsScreen from './screens/notifications.screen';
import NewTweetScreen from './screens/new.tweet.screen';
import NewMessageScreen from './screens/new-message.screen';

import HeaderAvatar from './components/header-avatar.component';
import ButtonHeader from './components/button-header.component';

import { USER_QUERY } from './graphql/user.query';
import MESSAGE_ADDED_SUBSCRIPTION from './graphql/message-added.subscription';
import GROUP_ADDED_SUBSCRIPTION from './graphql/group-added.subscription';
import FOLLOWED_ADDED_SUBSCRIPTION from './graphql/followed-added.subscription';
import UPDATE_USER_MUTATION from './graphql/update-user.mutation';

import { firebaseClient, wsClient } from './app';
import { colors, language } from './utils/constants';

const TAB_ICON_SIZE = 20;
// tabs in main screen
const MainScreenNavigator = TabNavigator({
  Chats: { screen: Groups },
  Settings: { screen: Settings },
});

const Tabs = TabNavigator(
  {
    Home: {
      screen: FollowedsFeedScreen,
      navigationOptions: () => ({
        headerTitle: language.FOLLOWING_FEED,
        tabBarIcon: ({ tintColor }) =>
          // <FontAwesome size={TAB_ICON_SIZE} color={tintColor} name="md-planet" />,
          <Icon size={TAB_ICON_SIZE} color={tintColor} name="user" />,
      }),
    },
    Profile: {
      screen: FollowersFeedScreen,
      navigationOptions: () => ({
        headerTitle: language.MY_FEED,
        tabBarIcon: ({ tintColor }) =>
          <Icon size={TAB_ICON_SIZE} color={tintColor} name="user" />,
      }),
    },
    Notifications: {
      screen: NotificationsScreen,
      navigationOptions: () => ({
        headerTitle: language.NOTIFICATIONS,
        tabBarIcon: ({ tintColor }) =>
          <Icon size={TAB_ICON_SIZE} color={tintColor} name="bell" />,
      }),
    },
    // Explore: {
    //   screen: ExploreScreen,
    //   navigationOptions: () => ({
    //     headerTitle: language.MESSAGE_INBOX,
    //     tabBarIcon: ({ tintColor }) =>
    //       <FontAwesome size={TAB_ICON_SIZE} color={tintColor} name="search" />,
    //   }),
    // },
    Chats: {
      screen: Groups,
      navigationOptions: () => ({
        headerTitle: language.MESSAGE_INBOX,
        tabBarIcon: ({ tintColor }) =>
          <Icon size={TAB_ICON_SIZE} color={tintColor} name="user" />,
      }),
    },
    Settings: {
      screen: Settings,
      navigationOptions: () => ({
        headerTitle: language.SETTINGS,
        tabBarIcon: ({ tintColor }) =>
          <Icon size={TAB_ICON_SIZE} color={tintColor} name="user" />,
      }),
    },
  },
  {
    lazy: true,
    tabBarPosition: 'bottom',
    swipeEnabled: false,
    tabBarOptions: {
      showIcon: true,
      showLabel: false,
      activeTintColor: colors.PRIMARY,
      inactiveTintColor: colors.LIGHT_GRAY,
      style: {
        backgroundColor: colors.WHITE,
        height: 50,
        paddingVertical: 5,
      },
    },
  },
);

const NewTweetModal = StackNavigator(
  {
    NewTweet: {
      screen: NewTweetScreen,
      navigationOptions: ({ navigation }) => ({
        headerTitle: language.COMPOSE_POST,
        headerTitleStyle: {
          color: '#000000',
        },
        headerLeft: <HeaderAvatar />,
        headerRight: (
          <ButtonHeader
            side="right"
            onPress={() => {
              Keyboard.dismiss();
              navigation.goBack(null);
            }}
          >
            <Icon color={colors.PRIMARY} size={25} name="close" />
          </ButtonHeader>
        ),
      }),
    },
  },
  {
    headerMode: 'none',
  },
);

const NewMessageModal = StackNavigator(
  {
    NewTweet: {
      screen: NewMessageScreen,
      navigationOptions: ({ navigation }) => ({
        headerTitle: language.COMPOSE_MESSAGE,
        headerTitleStyle: {
          color: '#000000',
        },
        headerLeft: <HeaderAvatar />,
        headerRight: (
          <ButtonHeader
            side="right"
            onPress={() => {
              Keyboard.dismiss();
              navigation.goBack(null);
            }}
          >
            <Icon color={colors.PRIMARY} size={25} name="close" />
          </ButtonHeader>
        ),
      }),
    },
  },
  {
    headerMode: 'none',
  },
);

const AppNavigator = StackNavigator({
  Main: {
    screen: Tabs,
    navigationOptions: ({ navigation }) => ({
      headerLeft: <HeaderAvatar />,
      headerRight: (
        <ButtonHeader
          side="right"
          onPress={() => {
            if (navigation.state.index === 0) {
              return navigation.navigate('NewTweet');
            } else if (navigation.state.index === 3) {
              return navigation.navigate('NewMessage');
            } else if (navigation.state.index === 2) {
              return navigation.navigate('UsernameSearch');
            }
            return navigation.navigate('Home');
          }
          }
        >
          <Icon color={colors.PRIMARY} size={20} name="pencil" />
        </ButtonHeader>
      ),
    }),
  },
  Signin: { screen: Signin },
  Messages: { screen: Messages },
  GroupDetails: { screen: GroupDetails },
  NewGroup: { screen: NewGroup },
  NewConversation: { screen: NewConversation },
  FinalizeGroup: { screen: FinalizeGroup },
  UsernameSearch: {
    screen: UsernameSearch,
  },
  UsernameProfile: {
    screen: UsernameProfile,
  },
  UsernameProfileFolloweds: {
    screen: UsernameProfileFolloweds,
  },
  UsernameProfileFollowers: {
    screen: UsernameProfileFollowers,
  },
  NewTweet: {
    screen: NewTweetModal,
  },
  NewMessage: {
    screen: NewMessageModal,
  },
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
    console.log('##########  AppWithNavigationState WILL_MOUNT  ##########');
  }
  componentDidMount() {
    console.log('##########  AppWithNavigationState DID_MOUNT  ##########');
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  componentWillReceiveProps(nextProps) {
    console.log('##########  AppWithNavigationState NEXTPROPS  ##########');
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
      // todo finish here
      if (this.subscribeToFolloweds) {
        this.subscribeToFolloweds();
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
    if (!this.subscribeToFolloweds && nextProps.user) {
      console.log('##########  subscribeToFolloweds()  ##########');
      this.subscribeToFolloweds = nextProps.subscribeToFolloweds();
    }
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  handleAppStateChange = (nextAppState) => {
    console.log('App has changed state!', nextAppState);
    console.log('user: ', this.props.user); // TODO figure out why undefined
    console.log('badgecount: ', this.props.user); // TODO figure out why undefined
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
    const { dispatch, nav, user } = this.props;
    if (!user) {
      console.log('##########  AppWithNavigationState RENDER NOUSER ##########');
      return <AppNavigator navigation={addNavigationHelpers({ dispatch, state: nav })} />;
    }
    console.log('##########  AppWithNavigationState RENDER USER  ##########');
    // here we are storing user data in navigation
    return <AppNavigator navigation={addNavigationHelpers({ dispatch, state: nav, user })} />;
  }
}

AppWithNavigationState.propTypes = {
  dispatch: PropTypes.func.isRequired,
  nav: PropTypes.object.isRequired,
  // tintColor: PropTypes.string.isRequired,
  refetch: PropTypes.func,
  subscribeToGroups: PropTypes.func,
  subscribeToMessages: PropTypes.func,
  subscribeToFolloweds: PropTypes.func,
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
          console.log('############### GROUP subscriptionData ###############');
          const newGroup = subscriptionData.data.groupAdded;

          return update(previousResult, {
            user: {
              groups: { $push: [newGroup] },
            },
          });
        },
      });
    },
    subscribeToFolloweds() {
      return subscribeToMore({
        document: FOLLOWED_ADDED_SUBSCRIPTION,
        variables: {
          userId: user.id,
          // followedsIds: map(user.followeds, 'id'),
        },
        updateQuery: (previousResult, { subscriptionData }) => {
          console.log('!!!!!!!!!!!!!!! FOLLOWEDS subscriptionData ###############');
          if (!subscriptionData.data) {
            return previousResult;
          }
          const newFollowed = subscriptionData.data.followedAdded;

          return update(previousResult, {
            user: {
              followeds: { $push: [newFollowed] },
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

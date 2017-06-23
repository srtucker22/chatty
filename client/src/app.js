import React, { Component } from 'react';
import {
  AsyncStorage,
} from 'react-native';

import { ApolloProvider } from 'react-apollo';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import ApolloClient from 'apollo-client';
import { SubscriptionClient, addGraphQLSubscriptions } from 'subscriptions-transport-ws';
import { persistStore, autoRehydrate } from 'redux-persist';
import thunk from 'redux-thunk';
import _ from 'lodash';
import { WillPresentNotificationResult } from 'react-native-fcm';
import { NavigationActions } from 'react-navigation';
import { createBatchingNetworkInterface } from 'apollo-upload-client';

import AppWithNavigationState, { navigationReducer } from './navigation';
import auth from './reducers/auth.reducer';
import { logout } from './actions/auth.actions';
import { FirebaseClient } from './firebase-client';

const URL = 'localhost:8080'; // set your comp's url here

const networkInterface = createBatchingNetworkInterface({
  uri: `http://${URL}/graphql`,
  batchInterval: 10,
  queryDeduplication: true,
});

// middleware for requests
networkInterface.use([{
  applyBatchMiddleware(req, next) {
    if (!req.options.headers) {
      req.options.headers = {};
    }
    // get the authentication token from local storage if it exists
    const jwt = store.getState().auth.jwt;
    if (jwt) {
      req.options.headers.authorization = `Bearer ${jwt}`;
    }
    next();
  },
}]);

// afterware for responses
networkInterface.useAfter([{
  applyBatchAfterware({ responses }, next) {
    let isUnauthorized = false;

    responses.forEach((response) => {
      if (response.errors) {
        console.log('GraphQL Error:', response.errors);
        if (_.some(response.errors, { message: 'Unauthorized' })) {
          isUnauthorized = true;
        }
      }
    });

    if (isUnauthorized) {
      store.dispatch(logout());
    }

    next();
  },
}]);

// Create WebSocket client
export const wsClient = new SubscriptionClient(`ws://${URL}/subscriptions`, {
  reconnect: true,
  connectionParams() {
    // get the authentication token from local storage if it exists
    return { jwt: store.getState().auth.jwt };
  },
  lazy: true,
});

// Extend the network interface with the WebSocket
const networkInterfaceWithSubscriptions = addGraphQLSubscriptions(
  networkInterface,
  wsClient,
);

export const client = new ApolloClient({
  networkInterface: networkInterfaceWithSubscriptions,
});

const store = createStore(
  combineReducers({
    apollo: client.reducer(),
    nav: navigationReducer,
    auth,
  }),
  {}, // initial state
  composeWithDevTools(
    applyMiddleware(client.middleware(), thunk),
    autoRehydrate(),
  ),
);

export const firebaseClient = new FirebaseClient({
  // only show message notification if not on current Messages Screen
  onWillPresentNotification(notification) { // needs to call notification.finish
    // check notification deets
    // check current route deets
    // apply rule
    const { routes, index } = store.getState().nav;
    const currentRoute = routes[index];
    if (notification.type === 'MESSAGE_ADDED' && notification.group &&
      currentRoute.routeName === 'Messages') {
      const group = JSON.parse(notification.group);
      if (currentRoute.params.groupId === parseInt(group.id, 10)) {
        return notification.finish(WillPresentNotificationResult.None);
      }
    }
    return notification.finish(WillPresentNotificationResult.All);
  },
  actions: {
    openGroup(notification) {
      const group = JSON.parse(notification.group);

      // reset navigation and redirect to group's messages screen
      const navigateAction = NavigationActions.reset({
        index: 1,
        actions: [
          NavigationActions.navigate({ routeName: 'Main' }),
          NavigationActions.navigate({
            routeName: 'Messages',
            params: {
              groupId: group.id,
              title: group.name,
              icon: group.icon,
            },
          }),
        ],
      });
      store.dispatch(navigateAction);
    },
  },
});

// persistent storage
persistStore(store, {
  storage: AsyncStorage,
  blacklist: ['apollo', 'nav'], // don't persist apollo or nav for now
});

export default class App extends Component {
  render() {
    return (
      <ApolloProvider store={store} client={client}>
        <AppWithNavigationState />
      </ApolloProvider>
    );
  }
}

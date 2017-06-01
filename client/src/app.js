import React, { Component } from 'react';

import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { ApolloProvider } from 'react-apollo';
import { composeWithDevTools } from 'redux-devtools-extension';
import { createHttpLink } from 'apollo-link-http';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { ReduxCache, apolloReducer } from 'apollo-cache-redux';
import ReduxLink from 'apollo-link-redux';
import { onError } from 'apollo-link-error';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';
import { SubscriptionClient } from 'subscriptions-transport-ws';

import AppWithNavigationState, {
  navigationReducer,
  navigationMiddleware,
} from './navigation';
import auth from './reducers/auth.reducer';

const URL = 'localhost:8080'; // set your comp's url here

const store = createStore(
  combineReducers({
    apollo: apolloReducer,
    nav: navigationReducer,
    auth,
  }),
  {}, // initial state
  composeWithDevTools(
    applyMiddleware(navigationMiddleware),
  ),
);

const cache = new ReduxCache({ store });

const reduxLink = new ReduxLink(store);

const errorLink = onError((errors) => {
  console.log(errors);
});

const httpLink = createHttpLink({ uri: `http://${URL}` });

// Create WebSocket client
export const wsClient = new SubscriptionClient(`ws://${URL}/graphql`, {
  reconnect: true,
  connectionParams: {
    // Pass any arguments you want for initialization
  },
});

const webSocketLink = new WebSocketLink(wsClient);

const requestLink = ({ queryOrMutationLink, subscriptionLink }) =>
  ApolloLink.split(
    ({ query }) => {
      const { kind, operation } = getMainDefinition(query);
      return kind === 'OperationDefinition' && operation === 'subscription';
    },
    subscriptionLink,
    queryOrMutationLink,
  );

const link = ApolloLink.from([
  reduxLink,
  errorLink,
  requestLink({
    queryOrMutationLink: httpLink,
    subscriptionLink: webSocketLink,
  }),
]);

export const client = new ApolloClient({
  link,
  cache,
});

export default class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <Provider store={store}>
          <AppWithNavigationState />
        </Provider>
      </ApolloProvider>
    );
  }
}
